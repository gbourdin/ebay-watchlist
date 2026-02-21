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

    # Query-path indexes used by item filters/sorts.
    database.execute_sql(
        "CREATE INDEX IF NOT EXISTS idx_item_seller_name ON item (seller_name)"
    )
    database.execute_sql(
        "CREATE INDEX IF NOT EXISTS idx_item_category_name ON item (category_name)"
    )
    database.execute_sql(
        "CREATE INDEX IF NOT EXISTS idx_item_scraped_category_id ON item (scraped_category_id)"
    )
    database.execute_sql(
        "CREATE INDEX IF NOT EXISTS idx_item_creation_date ON item (creation_date)"
    )


def drop_tables():
    database.drop_tables([ItemNote, ItemState, Item, WatchedSeller, WatchedCategory])
