from flask import g
from peewee import OperationalError

from ebay_watchlist.db.config import configure_database, database
from ebay_watchlist.settings import Settings
from ebay_watchlist.db.utils import ensure_schema_compatibility


def connect_db(settings: Settings | None = None):
    """
    create a db connection for this request
    :return:
    """
    if "db" not in g:
        configure_database(settings=settings)
        try:
            database.connect()
        except OperationalError:  # Connection already open
            pass
        g.db = database
    return g.db


def close_db(e=None):
    """
    Close the connection at the end of the request.
    Flask will call this automatically.
    """
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_app(app):
    """
    Register teardown + (optional) ensure schema exists on startup.
    """
    app.teardown_appcontext(close_db)

    # Connect DB at startup
    with app.app_context():
        _ = connect_db()
        ensure_schema_compatibility()
