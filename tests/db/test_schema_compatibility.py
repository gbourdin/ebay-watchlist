from datetime import datetime, timedelta

from ebay_watchlist.db.config import database
from ebay_watchlist.db.models import Item, ItemState
from ebay_watchlist.db.utils import ensure_schema_compatibility


def test_ensure_schema_compatibility_adds_item_state_without_data_loss(temp_db):
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

    database.drop_tables([ItemState], safe=True)
    assert "itemstate" not in set(database.get_tables())
    assert Item.select().count() == 1

    ensure_schema_compatibility()

    assert "itemstate" in set(database.get_tables())
    assert Item.select().count() == 1
