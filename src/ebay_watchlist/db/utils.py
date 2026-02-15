from ebay_watchlist.db.config import database
from ebay_watchlist.db.models import (
    Item,
    ItemNote,
    ItemState,
    WatchedCategory,
    WatchedSeller,
)


def create_tables():
    database.create_tables(
        [Item, ItemState, ItemNote, WatchedSeller, WatchedCategory],
        safe=True,
    )


def ensure_schema_compatibility():
    """
    Lightweight migration hook for older DBs.
    Creates missing tables without touching existing data.
    """
    database.create_tables(
        [Item, ItemState, ItemNote, WatchedSeller, WatchedCategory],
        safe=True,
    )


def drop_tables():
    database.drop_tables([ItemNote, ItemState, Item, WatchedSeller, WatchedCategory])
