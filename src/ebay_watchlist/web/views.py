import os
from math import ceil

from flask import Blueprint, jsonify, redirect, render_template, request, url_for

from ebay_watchlist.db.repositories import (
    CategoryRepository,
    ItemRepository,
    SellerRepository,
)
from ebay_watchlist.ebay.api import EbayAPI
from ebay_watchlist.web.db import connect_db
from ebay_watchlist.web.view_helpers import (
    build_filter_pairs,
    build_home_url,
    build_page_sequence,
    get_main_category_name_by_id,
    normalize_multi,
    resolve_category_input_to_id,
)

bp = Blueprint("main", __name__)
PAGE_SIZE = 100
SORT_CHOICES: list[tuple[str, str]] = [
    ("newest", "Newest"),
    ("ending_soon", "Ending Soon"),
    ("price_low", "Price: Low to High"),
    ("price_high", "Price: High to Low"),
]
SUPPORTED_SORTS = {value for value, _ in SORT_CHOICES}
SUPPORTED_VIEWS = {"table", "cards"}
QUICK_CATEGORY_FILTERS: list[tuple[int, str]] = [
    (619, "Musical Instruments"),
    (58058, "Computers"),
    (1249, "Videogames"),
]


def search_category_suggestions(
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


@bp.route("/manage/category-suggestions")
def manage_category_suggestions():
    _ = connect_db()
    query = request.args.get("q", "")
    marketplace_id = request.args.get("marketplace_id")
    return jsonify(
        {
            "suggestions": search_category_suggestions(
                query=query,
                marketplace_id=marketplace_id,
            )
        }
    )


@bp.route("/manage", methods=["GET", "POST"])
def manage_watchlist():
    """
    Manage watched sellers and categories through the web UI.
    """
    _ = connect_db()

    main_category_name_by_id = get_main_category_name_by_id(
        quick_category_filters=QUICK_CATEGORY_FILTERS,
        scraped_category_suggestions=ItemRepository.get_scraped_category_suggestions(),
    )

    if request.method == "POST":
        action = (request.form.get("action") or "").strip()
        message = "Action completed."
        message_level = "success"

        if action == "add_seller":
            seller_name = (request.form.get("seller_name") or "").strip()
            if not seller_name:
                message = "Seller name is required."
                message_level = "danger"
            else:
                SellerRepository.add_seller(seller_name)
                message = "Seller added."
        elif action == "remove_seller":
            seller_name = (request.form.get("seller_name") or "").strip()
            if not seller_name:
                message = "Seller name is required."
                message_level = "danger"
            else:
                SellerRepository.remove_seller(seller_name)
                message = "Seller removed."
        elif action == "add_category":
            category_id_raw = (request.form.get("category_id") or "").strip()
            category_input = (request.form.get("category") or "").strip()
            if category_id_raw.isdigit():
                category_id = int(category_id_raw)
            else:
                category_id = resolve_category_input_to_id(
                    category_input=category_input,
                    category_name_by_id=main_category_name_by_id,
                )
            if category_id is None:
                message = "Unknown category. Pick a known category name or numeric id."
                message_level = "danger"
            else:
                CategoryRepository.add_category(category_id)
                message = "Category added."
        elif action == "remove_category":
            category_id_raw = (request.form.get("category_id") or "").strip()
            if not category_id_raw.isdigit():
                message = "Invalid category id."
                message_level = "danger"
            else:
                CategoryRepository.disable_category(int(category_id_raw))
                message = "Category removed."
        else:
            message = "Unknown action."
            message_level = "danger"

        return redirect(
            url_for(
                "main.manage_watchlist",
                message=message,
                message_level=message_level,
            )
        )

    watched_sellers = SellerRepository.get_enabled_sellers()
    watched_category_ids = CategoryRepository.get_enabled_categories()
    watched_categories = [
        {
            "id": category_id,
            "name": main_category_name_by_id.get(category_id, f"Category {category_id}"),
        }
        for category_id in watched_category_ids
    ]

    return render_template(
        "manage.html",
        watched_sellers=watched_sellers,
        watched_categories=watched_categories,
        category_options=sorted(main_category_name_by_id.values()),
        message=request.args.get("message"),
        message_level=request.args.get("message_level", "info"),
        reset_url=url_for("main.home"),
    )

@bp.route("/")
def home():
    """
    Show items we've seen (newest first).
    """
    _ = connect_db()

    selected_sellers = normalize_multi(request.args.getlist("seller"))
    selected_categories = normalize_multi(request.args.getlist("category"))
    selected_main_categories = normalize_multi(request.args.getlist("main_category"))
    search_query = (request.args.get("q") or "").strip()
    show_hidden = request.args.get("show_hidden") == "1"
    show_favorites = request.args.get("favorite") == "1"
    sort = request.args.get("sort", "newest")
    view_mode = request.args.get("view", "table")
    requested_page = max(request.args.get("page", type=int, default=1), 1)

    if sort not in SUPPORTED_SORTS:
        sort = "newest"

    if view_mode not in SUPPORTED_VIEWS:
        view_mode = "table"

    main_category_name_by_id = get_main_category_name_by_id(
        quick_category_filters=QUICK_CATEGORY_FILTERS,
        scraped_category_suggestions=ItemRepository.get_scraped_category_suggestions(),
    )
    main_category_id_by_name = {
        category_name: category_id
        for category_id, category_name in main_category_name_by_id.items()
    }
    selected_main_category_ids = [
        main_category_id_by_name[category_name]
        for category_name in selected_main_categories
        if category_name in main_category_id_by_name
    ]
    if selected_main_category_ids:
        category_options = ItemRepository.get_distinct_category_names(
            scraped_category_ids=selected_main_category_ids
        )
    else:
        category_options = ItemRepository.get_distinct_category_names()

    total_count = ItemRepository.count_filtered_items(
        seller_names=selected_sellers or None,
        category_names=selected_categories or None,
        scraped_category_ids=selected_main_category_ids or None,
        search_query=search_query or None,
        sort=sort,
        include_hidden=show_hidden,
        include_favorites_only=show_favorites,
    )
    total_pages = max(1, ceil(total_count / PAGE_SIZE))
    page = min(requested_page, total_pages)

    offset = (page - 1) * PAGE_SIZE
    items = ItemRepository.get_filtered_items(
        seller_names=selected_sellers or None,
        category_names=selected_categories or None,
        scraped_category_ids=selected_main_category_ids or None,
        search_query=search_query or None,
        sort=sort,
        include_hidden=show_hidden,
        include_favorites_only=show_favorites,
        limit=PAGE_SIZE,
        offset=offset,
    )
    state_by_item_id = ItemRepository.get_item_states([str(item.item_id) for item in items])
    for item in items:
        state = state_by_item_id.get(str(item.item_id))
        item.hidden = bool(state.hidden) if state is not None else False
        item.favorite = bool(state.favorite) if state is not None else False

    base_filter_pairs = build_filter_pairs(
        selected_sellers=selected_sellers,
        selected_categories=selected_categories,
        selected_main_categories=selected_main_categories,
        search_query=search_query,
        show_hidden=show_hidden,
        show_favorites=show_favorites,
    )
    filter_pairs = list(base_filter_pairs)
    home_url = url_for("main.home")

    has_prev = page > 1
    has_next = page < total_pages
    prev_url = (
        build_home_url(
            filter_pairs,
            sort=sort,
            view_mode=view_mode,
            base_url=home_url,
            page=page - 1,
        )
        if has_prev
        else None
    )
    next_url = (
        build_home_url(
            filter_pairs,
            sort=sort,
            view_mode=view_mode,
            base_url=home_url,
            page=page + 1,
        )
        if has_next
        else None
    )
    first_url = (
        build_home_url(
            filter_pairs,
            sort=sort,
            view_mode=view_mode,
            base_url=home_url,
            page=1,
        )
        if total_pages > 1
        else None
    )
    last_url = (
        build_home_url(
            filter_pairs,
            sort=sort,
            view_mode=view_mode,
            base_url=home_url,
            page=total_pages,
        )
        if total_pages > 1
        else None
    )
    page_sequence = build_page_sequence(page=page, total_pages=total_pages)
    page_urls = {
        page_number: build_home_url(
            filter_pairs,
            sort=sort,
            view_mode=view_mode,
            base_url=home_url,
            page=page_number,
        )
        for page_number in page_sequence
        if page_number is not None
    }

    sort_urls = {
        option: build_home_url(
            filter_pairs,
            sort=option,
            view_mode=view_mode,
            base_url=home_url,
            page=1,
        )
        for option, _ in SORT_CHOICES
    }
    view_urls = {
        option: build_home_url(
            filter_pairs,
            sort=sort,
            view_mode=option,
            base_url=home_url,
            page=1,
        )
        for option in SUPPORTED_VIEWS
    }
    favorites_filter_pairs = build_filter_pairs(
        selected_sellers=selected_sellers,
        selected_categories=selected_categories,
        selected_main_categories=selected_main_categories,
        search_query=search_query,
        show_hidden=show_hidden,
        show_favorites=True,
    )
    favorites_url = build_home_url(
        favorites_filter_pairs,
        sort=sort,
        view_mode=view_mode,
        base_url=home_url,
        page=1,
    )
    all_items_url = build_home_url(
        build_filter_pairs(
            selected_sellers=selected_sellers,
            selected_categories=selected_categories,
            selected_main_categories=selected_main_categories,
            search_query=search_query,
            show_hidden=show_hidden,
            show_favorites=False,
        ),
        sort=sort,
        view_mode=view_mode,
        base_url=home_url,
        page=1,
    )

    return render_template(
        "items.html",
        items=items,
        quick_category_filters=QUICK_CATEGORY_FILTERS,
        selected_sellers=selected_sellers,
        selected_categories=selected_categories,
        selected_main_categories=selected_main_categories,
        seller_options=ItemRepository.get_distinct_seller_names(),
        category_options=category_options,
        main_category_options=sorted(main_category_name_by_id.values()),
        q=search_query,
        sort=sort,
        view_mode=view_mode,
        sort_choices=SORT_CHOICES,
        sort_urls=sort_urls,
        view_urls=view_urls,
        page=page,
        total_pages=total_pages,
        total_count=total_count,
        page_sequence=page_sequence,
        page_urls=page_urls,
        has_prev=has_prev,
        has_next=has_next,
        prev_url=prev_url,
        next_url=next_url,
        first_url=first_url,
        last_url=last_url,
        show_hidden=show_hidden,
        show_favorites=show_favorites,
        favorites_url=favorites_url,
        all_items_url=all_items_url,
        current_path=request.full_path,
        reset_url=url_for("main.home"),
    )


@bp.route("/items/<item_id>/state", methods=["POST"])
def update_item_state(item_id: str):
    _ = connect_db()

    field = (request.form.get("field") or "").strip()
    value_raw = (request.form.get("value") or "").strip().lower()
    next_url = (request.form.get("next") or url_for("main.home")).strip()

    value_map = {"1": True, "0": False, "true": True, "false": False}
    value = value_map.get(value_raw)
    if value is not None:
        if field == "hidden":
            ItemRepository.update_item_state(item_id=item_id, hidden=value)
        elif field == "favorite":
            ItemRepository.update_item_state(item_id=item_id, favorite=value)

    return redirect(next_url)


@bp.route("/sellers/<seller_name>")
def items_by_seller(seller_name: str):
    """
    Show the items we've seen just for a selected seller.
    """
    return redirect(url_for("main.home", seller=seller_name))


@bp.route("/categories/<int:category_id>")
def items_by_leaf_category(category_id: int):
    category_name = ItemRepository.get_category_name_by_id(category_id)
    if category_name is None:
        return redirect(url_for("main.home"))

    return redirect(url_for("main.home", category=category_name))


@bp.route("/main_category/<int:category_id>")
def items_by_parent_category(category_id: int):
    main_category_name_by_id = get_main_category_name_by_id(
        quick_category_filters=QUICK_CATEGORY_FILTERS,
        scraped_category_suggestions=ItemRepository.get_scraped_category_suggestions(),
    )
    category_name = main_category_name_by_id.get(category_id)
    if category_name is None:
        return redirect(url_for("main.home"))

    return redirect(url_for("main.home", main_category=category_name))


@bp.route("/status")
def status():
    """
    Simple healthcheck endpoint for docker to ping
    """
    return jsonify({"status": "OK"})


@bp.route("/analytics")
def analytics():
    _ = connect_db()
    snapshot = ItemRepository.get_analytics_snapshot()
    return render_template(
        "analytics.html",
        reset_url=url_for("main.home"),
        **snapshot,
    )
