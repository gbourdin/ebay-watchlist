from flask import Blueprint, jsonify

from ebay_watchlist.web.db import connect_db

bp = Blueprint("api_v1", __name__, url_prefix="/api/v1")


@bp.route("/items")
def items():
    _ = connect_db()
    return jsonify(
        {
            "items": [],
            "page": 1,
            "page_size": 100,
            "total": 0,
            "total_pages": 1,
            "has_next": False,
            "has_prev": False,
            "sort": "newest",
        }
    )
