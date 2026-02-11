from ebay_watchlist.db.config import database
from ebay_watchlist.db.models import Item, ItemState, WatchedCategory, WatchedSeller


def create_tables():
    database.create_tables(
        [Item, ItemState, WatchedSeller, WatchedCategory],
        safe=True,
    )


def ensure_schema_compatibility():
    """
    Lightweight migration hook for older DBs.
    Creates missing tables without touching existing data.
    """
    database.create_tables(
        [Item, ItemState, WatchedSeller, WatchedCategory],
        safe=True,
    )


def drop_tables():
    database.drop_tables([ItemState, Item, WatchedSeller, WatchedCategory])
