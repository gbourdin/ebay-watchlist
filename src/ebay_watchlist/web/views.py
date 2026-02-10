from math import ceil

from flask import Blueprint, jsonify, redirect, render_template, request, url_for

from ebay_watchlist.db.repositories import ItemRepository
from ebay_watchlist.web.db import connect_db
from ebay_watchlist.web.view_helpers import (
    build_filter_pairs,
    build_home_url,
    build_page_sequence,
    get_main_category_name_by_id,
    normalize_multi,
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
        limit=PAGE_SIZE,
        offset=offset,
    )

    filter_pairs = build_filter_pairs(
        selected_sellers=selected_sellers,
        selected_categories=selected_categories,
        selected_main_categories=selected_main_categories,
        search_query=search_query,
    )
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
        reset_url=url_for("main.home"),
    )


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
