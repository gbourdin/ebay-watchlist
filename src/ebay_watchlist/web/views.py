from flask import Blueprint, render_template, Response

from ebay_watchlist.db.repositories import ItemRepository
from ebay_watchlist.web.db import connect_db

bp = Blueprint("main", __name__)


@bp.route("/")
def home():
    """
    Show items we've seen (newest first).
    """
    _ = connect_db()
    items = ItemRepository.get_latest_items(limit=500)

    return render_template("items.html", items=items)


@bp.route("/sellers/<seller_name>")
def items_by_seller(seller_name: str):
    """
    Show the items we've seen just for a selected seller
    """

    _ = connect_db()
    items = ItemRepository.get_latest_items_for_seller(
        seller_name=seller_name, limit=500
    )

    return render_template("items.html", items=items)


@bp.route("/categories/<category_id>")
def items_by_leaf_category(category_id: int):
    category_id = int(category_id)

    _ = connect_db()
    items = ItemRepository.get_latest_items_for_category(
        category_id=category_id, limit=500
    )

    return render_template("items.html", items=items)


@bp.route("/main_category/<category_id>")
def items_by_parent_category(category_id: int):
    category_id = int(category_id)

    _ = connect_db()
    items = ItemRepository.get_latest_items_for_scraped_category(
        category_id=category_id, limit=500
    )

    return render_template("items.html", items=items)


@bp.route("/status")
def status():
    """
    Simple healthcheck endpoint for docker to ping
    """

    return Response("{'status': 'OK'}", status=200, mimetype="application/json")
