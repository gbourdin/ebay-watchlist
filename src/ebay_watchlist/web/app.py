from flask import Flask

from ebay_watchlist.web.api_v1 import bp as api_v1_bp
from ebay_watchlist.web.db import init_app as init_db
from ebay_watchlist.web.filters import humanize_datetime
from ebay_watchlist.web.views import bp as main_bp


def create_app() -> Flask:
    app = Flask(__name__)

    # set up db (connection management, teardown, etc.)
    init_db(app)

    # register blueprints (routes)
    app.register_blueprint(main_bp)
    app.register_blueprint(api_v1_bp)
    app.add_template_filter(humanize_datetime, name="humanize_datetime")
    return app
