from math import ceil

import humanize
from flask import Blueprint, jsonify, request

from ebay_watchlist.db.models import Item, ItemNote
from ebay_watchlist.db.repositories import ItemRepository
from ebay_watchlist.web.db import connect_db
from ebay_watchlist.web.view_helpers import (
    get_main_category_name_by_id,
    normalize_multi,
)

bp = Blueprint("api_v1", __name__, url_prefix="/api/v1")
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
    main_category_name_by_id = get_main_category_name_by_id(
        quick_category_filters=QUICK_CATEGORY_FILTERS,
        scraped_category_suggestions=ItemRepository.get_scraped_category_suggestions(),
    )
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
        "price": float(current_price) if current_price is not None else 0.0,
        "currency": str(current_currency or ""),
        "bids": int(item.bid_count),
        "seller": str(item.seller_name),
        "category": str(item.category_name),
        "posted_at": item.creation_date.isoformat(),
        "ends_at": item.end_date.isoformat(),
        "ends_in": humanize.naturaltime(item.end_date),
        "web_url": str(item.web_url),
        "hidden": bool(getattr(item, "hidden", False)),
        "favorite": bool(getattr(item, "favorite", False)),
        "note_text": str(note.note_text) if note is not None else None,
        "note_created_at": note.created_at.isoformat() if note is not None else None,
        "note_last_modified": note.last_modified.isoformat() if note is not None else None,
    }


def _parse_boolean_value() -> tuple[bool | None, tuple[dict[str, str], int] | None]:
    payload = request.get_json(silent=True) or {}
    value = payload.get("value")
    if not isinstance(value, bool):
        return None, ({"error": "value must be a boolean"}, 400)
    return value, None


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
            "note_created_at": note.created_at.isoformat(),
            "note_last_modified": note.last_modified.isoformat(),
        }
    )


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
