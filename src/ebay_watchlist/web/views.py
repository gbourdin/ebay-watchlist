from pathlib import Path
from urllib.parse import urlencode

from flask import Blueprint, jsonify, redirect, request, send_from_directory, url_for

from ebay_watchlist.db.repositories import ItemRepository
from ebay_watchlist.web.db import connect_db
from ebay_watchlist.web.view_helpers import get_main_category_name_by_id

bp = Blueprint("main", __name__)

QUICK_CATEGORY_FILTERS: list[tuple[int, str]] = [
    (619, "Musical Instruments"),
    (58058, "Computers"),
    (1249, "Videogames"),
]

SPA_BUILD_DIR = Path(__file__).resolve().parent / "static" / "spa"


def _render_spa_entry() -> object:
    index_file = SPA_BUILD_DIR / "index.html"
    if not index_file.exists():
        return (
            "<!doctype html>"
            "<html><head><title>Watched Listings</title></head>"
            "<body>"
            "<div id='root'></div>"
            "<p>SPA assets are not built yet. Run `npm --prefix frontend run build`.</p>"
            "</body></html>"
        )

    return send_from_directory(str(SPA_BUILD_DIR), "index.html")


def _redirect_to_home_with_params(pairs: list[tuple[str, str]]) -> object:
    query = urlencode(pairs)
    target = url_for("main.home")
    if query:
        target = f"{target}?{query}"
    return redirect(target)


@bp.route("/")
def home():
    return _render_spa_entry()


@bp.route("/favorites")
def favorites():
    return _render_spa_entry()


@bp.route("/manage")
def manage_watchlist():
    return _render_spa_entry()


@bp.route("/analytics")
def analytics():
    return _render_spa_entry()


@bp.route("/manage/category-suggestions")
def manage_category_suggestions():
    target = url_for("api_v1.watchlist_category_suggestions")
    query_string = request.query_string.decode("utf-8")
    if query_string:
        target = f"{target}?{query_string}"
    return redirect(target)


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
    return _redirect_to_home_with_params([("seller", seller_name)])


@bp.route("/categories/<int:category_id>")
def items_by_leaf_category(category_id: int):
    category_name = ItemRepository.get_category_name_by_id(category_id)
    if category_name is None:
        return redirect(url_for("main.home"))

    return _redirect_to_home_with_params([("category", category_name)])


@bp.route("/main_category/<int:category_id>")
def items_by_parent_category(category_id: int):
    main_category_name_by_id = get_main_category_name_by_id(
        quick_category_filters=QUICK_CATEGORY_FILTERS,
        scraped_category_suggestions=ItemRepository.get_scraped_category_suggestions(),
    )
    category_name = main_category_name_by_id.get(category_id)
    if category_name is None:
        return redirect(url_for("main.home"))

    return _redirect_to_home_with_params([("main_category", category_name)])


@bp.route("/status")
def status():
    return jsonify({"status": "OK"})
