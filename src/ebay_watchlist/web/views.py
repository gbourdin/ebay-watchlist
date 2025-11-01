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


@bp.route("/status")
def status():
    """
    Simple healthcheck endpoint for docker to ping
    """

    return Response("{'status': 'OK'}", status=200, mimetype="application/json")
