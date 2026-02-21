from datetime import datetime, timedelta

from ebay_watchlist.db.config import database
from ebay_watchlist.db.models import Item, ItemNote, ItemState
from ebay_watchlist.db.utils import ensure_schema_compatibility


def test_ensure_schema_compatibility_adds_state_tables_without_data_loss(temp_db):
    now = datetime(2026, 2, 11, 10, 0, 0)
    Item.create(
        item_id="legacy-1",
        title="Legacy Item",
        scraped_category_id=619,
        category_id=619,
        category_name="Electric Guitars",
        image_url="https://img.example/item.jpg",
        seller_name="legacy_seller",
        condition="Used",
        shipping_options=[],
        buying_options=["AUCTION"],
        price=50,
        price_currency="GBP",
        current_bid_price=51,
        current_bid_price_currency="GBP",
        bid_count=1,
        web_url="https://www.ebay.com/itm/legacy-1",
        origin_date=now,
        creation_date=now,
        end_date=now + timedelta(days=2),
    )

    database.drop_tables([ItemNote, ItemState], safe=True)
    assert "itemstate" not in set(database.get_tables())
    assert "itemnote" not in set(database.get_tables())
    assert Item.select().count() == 1

    ensure_schema_compatibility()

    assert "itemstate" in set(database.get_tables())
    assert "itemnote" in set(database.get_tables())
    assert Item.select().count() == 1


def test_ensure_schema_compatibility_creates_item_filter_indexes(temp_db):
    database.execute_sql("DROP INDEX IF EXISTS idx_item_seller_name")
    database.execute_sql("DROP INDEX IF EXISTS idx_item_category_name")
    database.execute_sql("DROP INDEX IF EXISTS idx_item_scraped_category_id")
    database.execute_sql("DROP INDEX IF EXISTS idx_item_creation_date")

    ensure_schema_compatibility()

    index_names = {
        str(row[1]) for row in database.execute_sql("PRAGMA index_list('item')").fetchall()
    }
    assert {
        "idx_item_seller_name",
        "idx_item_category_name",
        "idx_item_scraped_category_id",
        "idx_item_creation_date",
    }.issubset(index_names)
