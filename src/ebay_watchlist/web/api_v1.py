import os
import logging
import ssl
from math import ceil
from datetime import datetime
from urllib.parse import urljoin, urlparse

from flask import Blueprint, jsonify, request

from ebay_watchlist.db.models import Item, ItemNote
from ebay_watchlist.db.repositories import (
    CategoryRepository,
    ItemRepository,
    SellerRepository,
)
from ebay_watchlist.ebay.api import EbayAPI
from ebay_watchlist.web.db import connect_db
from ebay_watchlist.web.view_helpers import (
    get_main_category_name_by_id,
    normalize_multi,
    resolve_category_input_to_id,
)

bp = Blueprint("api_v1", __name__, url_prefix="/api/v1")
logger = logging.getLogger(__name__)
DEFAULT_PAGE_SIZE = 100
MAX_PAGE_SIZE = 200
SUPPORTED_SORTS = {
    "newest",
    "ending_soon_active",
    "price_low",
    "price_high",
    "bids_desc",
}
QUICK_CATEGORY_FILTERS: list[tuple[int, str]] = [
    (619, "Musical Instruments"),
    (58058, "Computers"),
    (1249, "Videogames"),
]


def _to_float(value: object | None, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        return float(str(value))
    except (TypeError, ValueError):
        return default


def _to_int(value: object | None, default: int = 0) -> int:
    if value is None:
        return default
    try:
        return int(str(value))
    except (TypeError, ValueError):
        return default


def _to_iso8601(value: object) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _to_naive_datetime(value: object | None) -> datetime | None:
    if not isinstance(value, str):
        return None

    normalized = value.strip()
    if not normalized:
        return None

    if normalized.endswith("Z"):
        normalized = f"{normalized[:-1]}+00:00"

    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None

    if parsed.tzinfo is not None:
        return parsed.replace(tzinfo=None)

    return parsed


def _normalize_web_url(web_url: str) -> str:
    return urljoin(web_url, urlparse(web_url).path)


def _extract_price(price_payload: object) -> tuple[str | None, str | None]:
    if not isinstance(price_payload, dict):
        return None, None

    price_payload_dict = {
        str(key): value for key, value in price_payload.items()
    }
    value = price_payload_dict.get("value")
    currency = price_payload_dict.get("currency")
    if value is None or currency is None:
        return None, None

    normalized_value = str(value).strip()
    normalized_currency = str(currency).strip()
    if not normalized_value or not normalized_currency:
        return None, None

    return normalized_value, normalized_currency


def _apply_item_snapshot_update(item: Item, snapshot: dict) -> None:
    price_value, price_currency = _extract_price(snapshot.get("price"))
    if price_value is not None and price_currency is not None:
        item.price = price_value
        item.price_currency = price_currency

    current_bid_value, current_bid_currency = _extract_price(snapshot.get("currentBidPrice"))
    if current_bid_value is not None and current_bid_currency is not None:
        item.current_bid_price = current_bid_value
        item.current_bid_price_currency = current_bid_currency
    else:
        item.current_bid_price = None
        item.current_bid_price_currency = None

    bid_count = snapshot.get("bidCount")
    if bid_count is not None:
        try:
            item.bid_count = int(str(bid_count))
        except (TypeError, ValueError):
            pass

    item_end_date = _to_naive_datetime(snapshot.get("itemEndDate"))
    if item_end_date is not None:
        item.end_date = item_end_date

    item_creation_date = _to_naive_datetime(snapshot.get("itemCreationDate"))
    if item_creation_date is not None:
        item.creation_date = item_creation_date

    item_web_url = snapshot.get("itemWebUrl")
    if isinstance(item_web_url, str) and item_web_url.strip():
        item.web_url = _normalize_web_url(item_web_url.strip())

    item.db_update_date = datetime.now()
    item.save()


def _normalize_sort(sort_value: str) -> str:
    return sort_value if sort_value in SUPPORTED_SORTS else "newest"


def _parse_page_size(raw_value: str | None) -> int:
    if raw_value is None:
        return DEFAULT_PAGE_SIZE
    if not raw_value.isdigit():
        return DEFAULT_PAGE_SIZE
    parsed = int(raw_value)
    if parsed < 1:
        return DEFAULT_PAGE_SIZE
    return min(parsed, MAX_PAGE_SIZE)


def _parse_page(raw_value: str | None) -> int:
    if raw_value is None or not raw_value.isdigit():
        return 1
    return max(1, int(raw_value))


def _resolve_main_category_ids(selected_main_categories: list[str]) -> list[int]:
    main_category_name_by_id = _get_main_category_name_by_id()
    main_category_id_by_name = {
        category_name: category_id
        for category_id, category_name in main_category_name_by_id.items()
    }
    return [
        main_category_id_by_name[name]
        for name in selected_main_categories
        if name in main_category_id_by_name
    ]


def _serialize_item(
    item: Item,
    note: ItemNote | None = None,
) -> dict[str, str | float | int | bool | None]:
    current_price = item.current_bid_price if item.current_bid_price is not None else item.price
    current_currency = (
        item.current_bid_price_currency
        if item.current_bid_price_currency is not None
        else item.price_currency
    )
    return {
        "item_id": str(item.item_id),
        "title": str(item.title),
        "image_url": str(item.image_url or ""),
        "price": _to_float(current_price),
        "currency": str(current_currency or ""),
        "bids": _to_int(item.bid_count),
        "seller": str(item.seller_name),
        "category": str(item.category_name),
        "posted_at": _to_iso8601(item.creation_date),
        "ends_at": _to_iso8601(item.end_date),
        "web_url": str(item.web_url),
        "hidden": bool(getattr(item, "hidden", False)),
        "favorite": bool(getattr(item, "favorite", False)),
        "note_text": str(note.note_text) if note is not None else None,
        "note_created_at": _to_iso8601(note.created_at) if note is not None else None,
        "note_last_modified": _to_iso8601(note.last_modified) if note is not None else None,
    }


def _parse_boolean_value() -> tuple[bool | None, tuple[dict[str, str], int] | None]:
    payload = request.get_json(silent=True) or {}
    value = payload.get("value")
    if not isinstance(value, bool):
        return None, ({"error": "value must be a boolean"}, 400)
    return value, None


def _get_main_category_name_by_id() -> dict[int, str]:
    return get_main_category_name_by_id(
        quick_category_filters=QUICK_CATEGORY_FILTERS,
        scraped_category_suggestions=ItemRepository.get_scraped_category_suggestions(),
    )


def _search_watchlist_category_suggestions(
    query: str,
    marketplace_id: str | None = None,
) -> list[dict[str, str]]:
    normalized_query = query.strip()
    if len(normalized_query) < 2:
        return []

    fallback = [
        {"id": str(category_id), "name": category_name, "path": category_name}
        for category_id, category_name in ItemRepository.get_scraped_category_suggestions()
        if normalized_query.lower() in category_name.lower()
    ][:15]

    client_id = os.getenv("EBAY_CLIENT_ID")
    client_secret = os.getenv("EBAY_CLIENT_SECRET")
    if not client_id or not client_secret:
        return fallback

    resolved_marketplace_id = marketplace_id or os.getenv("EBAY_MARKETPLACE_ID", "EBAY_GB")
    api = EbayAPI(
        client_id=client_id,
        client_secret=client_secret,
        marketplace_id=resolved_marketplace_id,
    )
    try:
        return api.get_category_suggestions(
            query=normalized_query,
            marketplace_id=resolved_marketplace_id,
            limit=15,
        )
    except Exception:
        return fallback


def _snapshot_metric(
    snapshot: dict[str, int | list[tuple[str, int]]],
    key: str,
) -> int:
    value = snapshot.get(key)
    return value if isinstance(value, int) else 0


def _snapshot_ranking(
    snapshot: dict[str, int | list[tuple[str, int]]],
    key: str,
) -> list[tuple[str, int]]:
    value = snapshot.get(key)
    if not isinstance(value, list):
        return []

    rows: list[tuple[str, int]] = []
    for row in value:
        if not isinstance(row, tuple) or len(row) != 2:
            continue

        name, count = row
        rows.append((str(name), int(count)))

    return rows


@bp.route("/items")
def items():
    _ = connect_db()

    selected_sellers = normalize_multi(request.args.getlist("seller"))
    selected_categories = normalize_multi(request.args.getlist("category"))
    selected_main_categories = normalize_multi(request.args.getlist("main_category"))
    search_query = (request.args.get("q") or "").strip()
    include_hidden = request.args.get("show_hidden") == "1"
    include_favorites_only = request.args.get("favorite") == "1"
    sort = _normalize_sort(request.args.get("sort", "newest"))

    selected_main_category_ids = _resolve_main_category_ids(selected_main_categories)

    page_size = _parse_page_size(request.args.get("page_size"))
    requested_page = _parse_page(request.args.get("page"))
    total_count = ItemRepository.count_filtered_items(
        seller_names=selected_sellers or None,
        category_names=selected_categories or None,
        scraped_category_ids=selected_main_category_ids or None,
        search_query=search_query or None,
        sort=sort,
        include_hidden=include_hidden,
        include_favorites_only=include_favorites_only,
    )
    total_pages = max(1, ceil(total_count / page_size))
    page = min(requested_page, total_pages)
    offset = (page - 1) * page_size

    items = ItemRepository.get_filtered_items(
        seller_names=selected_sellers or None,
        category_names=selected_categories or None,
        scraped_category_ids=selected_main_category_ids or None,
        search_query=search_query or None,
        sort=sort,
        include_hidden=include_hidden,
        include_favorites_only=include_favorites_only,
        limit=page_size,
        offset=offset,
    )
    item_ids = [str(item.item_id) for item in items]
    state_by_item_id = ItemRepository.get_item_states(item_ids)
    note_by_item_id = ItemRepository.get_item_notes(item_ids)
    for item in items:
        state = state_by_item_id.get(str(item.item_id))
        item.hidden = bool(state.hidden) if state is not None else False
        item.favorite = bool(state.favorite) if state is not None else False

    return jsonify(
        {
            "items": [
                _serialize_item(item, note=note_by_item_id.get(str(item.item_id)))
                for item in items
            ],
            "page": page,
            "page_size": page_size,
            "total": total_count,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
            "sort": sort,
        }
    )


@bp.route("/items/<item_id>/favorite", methods=["POST"])
def update_favorite(item_id: str):
    _ = connect_db()
    if Item.get_or_none(item_id=item_id) is None:
        return jsonify({"error": "item not found"}), 404

    value, error = _parse_boolean_value()
    if error is not None:
        body, status = error
        return jsonify(body), status

    state = ItemRepository.update_item_state(item_id=item_id, favorite=value)
    return jsonify({"item_id": item_id, "favorite": bool(state.favorite)})


@bp.route("/items/<item_id>/hide", methods=["POST"])
def update_hidden(item_id: str):
    _ = connect_db()
    if Item.get_or_none(item_id=item_id) is None:
        return jsonify({"error": "item not found"}), 404

    value, error = _parse_boolean_value()
    if error is not None:
        body, status = error
        return jsonify(body), status

    state = ItemRepository.update_item_state(item_id=item_id, hidden=value)
    return jsonify({"item_id": item_id, "hidden": bool(state.hidden)})


@bp.route("/items/<item_id>/note", methods=["POST"])
def upsert_note(item_id: str):
    _ = connect_db()
    if Item.get_or_none(item_id=item_id) is None:
        return jsonify({"error": "item not found"}), 404

    payload = request.get_json(silent=True) or {}
    note_text = payload.get("note_text")
    if not isinstance(note_text, str):
        return jsonify({"error": "note_text must be a string"}), 400

    note = ItemRepository.upsert_item_note(item_id=item_id, note_text=note_text)
    if note is None:
        return jsonify(
            {
                "item_id": item_id,
                "note_text": None,
                "note_created_at": None,
                "note_last_modified": None,
            }
        )

    return jsonify(
        {
            "item_id": item_id,
            "note_text": str(note.note_text),
            "note_created_at": _to_iso8601(note.created_at),
            "note_last_modified": _to_iso8601(note.last_modified),
        }
    )


@bp.route("/items/<item_id>/refresh", methods=["POST"])
def refresh_item(item_id: str):
    _ = connect_db()
    item = Item.get_or_none(item_id=item_id)
    if item is None:
        logger.warning("Manual refresh requested for missing local item item_id=%s", item_id)
        return jsonify({"error": "item not found"}), 404

    client_id = os.getenv("EBAY_CLIENT_ID")
    client_secret = os.getenv("EBAY_CLIENT_SECRET")
    if not client_id or not client_secret:
        logger.warning(
            "Manual refresh unavailable for item_id=%s: missing eBay credentials",
            item_id,
        )
        return (
            jsonify(
                {"error": "refresh unavailable: missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET"}
            ),
            503,
        )

    marketplace_id = os.getenv("EBAY_MARKETPLACE_ID", "EBAY_GB")
    api = EbayAPI(
        client_id=client_id,
        client_secret=client_secret,
        marketplace_id=marketplace_id,
    )

    try:
        snapshot = api.get_item_snapshot(item_id=item_id)
    except Exception:
        logger.exception(
            "Manual refresh failed for item_id=%s | openssl=%s OPENSSL_CONF=%r "
            "OPENSSL_MODULES=%r SSL_CERT_FILE=%r SSL_CERT_DIR=%r",
            item_id,
            ssl.OPENSSL_VERSION,
            os.getenv("OPENSSL_CONF"),
            os.getenv("OPENSSL_MODULES"),
            os.getenv("SSL_CERT_FILE"),
            os.getenv("SSL_CERT_DIR"),
        )
        return jsonify({"error": "refresh failed: could not fetch item from ebay"}), 502

    if snapshot is None:
        logger.warning("Manual refresh eBay item not found for item_id=%s", item_id)
        return jsonify({"error": "item not found on ebay"}), 404

    _apply_item_snapshot_update(item, snapshot)

    state = ItemRepository.get_item_states([item_id]).get(item_id)
    note = ItemRepository.get_item_notes([item_id]).get(item_id)
    item.hidden = bool(state.hidden) if state is not None else False
    item.favorite = bool(state.favorite) if state is not None else False

    return jsonify({"item": _serialize_item(item, note=note)})


@bp.route("/suggestions/sellers")
def seller_suggestions():
    _ = connect_db()
    query = (request.args.get("q") or "").strip()
    suggestions = ItemRepository.get_seller_suggestions(query=query)
    return jsonify(
        {
            "items": [{"value": suggestion, "label": suggestion} for suggestion in suggestions]
        }
    )


@bp.route("/suggestions/categories")
def category_suggestions():
    _ = connect_db()
    query = (request.args.get("q") or "").strip()
    selected_main_categories = normalize_multi(request.args.getlist("main_category"))
    main_category_ids = _resolve_main_category_ids(selected_main_categories)

    suggestions = ItemRepository.get_category_suggestions(
        query=query,
        scraped_category_ids=main_category_ids or None,
    )
    return jsonify(
        {
            "items": [{"value": suggestion, "label": suggestion} for suggestion in suggestions]
        }
    )


@bp.route("/watchlist")
def watchlist():
    _ = connect_db()
    category_name_by_id = _get_main_category_name_by_id()
    watched_sellers = sorted(SellerRepository.get_enabled_sellers())
    watched_category_ids = CategoryRepository.get_enabled_categories()
    watched_categories = [
        {
            "id": int(category_id),
            "name": category_name_by_id.get(category_id, f"Category {category_id}"),
        }
        for category_id in watched_category_ids
    ]
    watched_categories.sort(key=lambda row: str(row["name"]).lower())

    return jsonify(
        {
            "sellers": watched_sellers,
            "categories": watched_categories,
            "main_category_options": sorted(category_name_by_id.values()),
        }
    )


@bp.route("/watchlist/sellers", methods=["POST"])
def add_watchlist_seller():
    _ = connect_db()
    payload = request.get_json(silent=True) or {}
    seller_name = (payload.get("seller_name") or "").strip()
    if not seller_name:
        return jsonify({"error": "seller_name is required"}), 400

    SellerRepository.add_seller(seller_name)
    return jsonify({"seller_name": seller_name}), 201


@bp.route("/watchlist/sellers/<seller_name>", methods=["DELETE"])
def remove_watchlist_seller(seller_name: str):
    _ = connect_db()
    cleaned = seller_name.strip()
    if not cleaned:
        return jsonify({"error": "seller_name is required"}), 400

    SellerRepository.remove_seller(cleaned)
    return jsonify({"seller_name": cleaned})


@bp.route("/watchlist/categories", methods=["POST"])
def add_watchlist_category():
    _ = connect_db()
    payload = request.get_json(silent=True) or {}
    category_name_by_id = _get_main_category_name_by_id()

    category_id_raw = str(payload.get("category_id") or "").strip()
    category_name = str(payload.get("category_name") or "").strip()

    category_id: int | None
    if category_id_raw.isdigit():
        category_id = int(category_id_raw)
    else:
        category_id = resolve_category_input_to_id(
            category_input=category_name,
            category_name_by_id=category_name_by_id,
        )

    if category_id is None:
        return (
            jsonify(
                {
                    "error": "Unknown category. Provide a valid category_id or known category_name."
                }
            ),
            400,
        )

    CategoryRepository.add_category(category_id)
    return jsonify(
        {
            "category_id": category_id,
            "category_name": category_name_by_id.get(category_id, f"Category {category_id}"),
        }
    ), 201


@bp.route("/watchlist/categories/<int:category_id>", methods=["DELETE"])
def remove_watchlist_category(category_id: int):
    _ = connect_db()
    CategoryRepository.disable_category(category_id)
    return jsonify({"category_id": category_id})


@bp.route("/watchlist/category-suggestions")
def watchlist_category_suggestions():
    _ = connect_db()
    query = request.args.get("q", "")
    marketplace_id = request.args.get("marketplace_id")
    suggestions = _search_watchlist_category_suggestions(
        query=query,
        marketplace_id=marketplace_id,
    )
    return jsonify({"suggestions": suggestions})


@bp.route("/analytics")
def analytics_snapshot():
    _ = connect_db()
    snapshot = ItemRepository.get_analytics_snapshot()
    top_sellers = _snapshot_ranking(snapshot, "top_sellers")
    top_categories = _snapshot_ranking(snapshot, "top_categories")
    return jsonify(
        {
            "metrics": {
                "total_items": _snapshot_metric(snapshot, "total_items"),
                "active_items": _snapshot_metric(snapshot, "active_items"),
                "ending_soon_items": _snapshot_metric(snapshot, "ending_soon_items"),
                "new_last_7_days": _snapshot_metric(snapshot, "new_last_7_days"),
                "hidden_items": _snapshot_metric(snapshot, "hidden_items"),
                "favorite_items": _snapshot_metric(snapshot, "favorite_items"),
            },
            "top_sellers": [
                {"name": str(name), "count": int(count)}
                for name, count in top_sellers
            ],
            "top_categories": [
                {"name": str(name), "count": int(count)}
                for name, count in top_categories
            ],
            "distributions": {
                "posted_by_month": [
                    {"label": str(label), "count": int(count)}
                    for label, count in _snapshot_ranking(snapshot, "posted_by_month")
                ],
                "posted_by_weekday": [
                    {"label": str(label), "count": int(count)}
                    for label, count in _snapshot_ranking(snapshot, "posted_by_weekday")
                ],
                "posted_by_hour": [
                    {"label": str(label), "count": int(count)}
                    for label, count in _snapshot_ranking(snapshot, "posted_by_hour")
                ],
            },
        }
    )
