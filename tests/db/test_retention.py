from datetime import datetime, timedelta

from ebay_watchlist.db.models import Item
from ebay_watchlist.db.repositories import ItemRepository


def insert_item(item_id: str, end_date: datetime) -> None:
    base = datetime(2026, 1, 1, 12, 0, 0)
    Item.create(
        item_id=item_id,
        title=f"Item {item_id}",
        scraped_category_id=619,
        category_id=619,
        category_name="Electric Guitars",
        image_url=None,
        seller_name="alice",
        condition="Used",
        shipping_options=[],
        buying_options=["AUCTION"],
        price=10,
        price_currency="GBP",
        current_bid_price=11,
        current_bid_price_currency="GBP",
        bid_count=1,
        web_url=f"https://www.ebay.com/itm/{item_id}",
        origin_date=base,
        creation_date=base,
        end_date=end_date,
    )


def test_delete_items_ended_before_removes_only_stale_rows(temp_db):
    now = datetime(2026, 2, 10, 12, 0, 0)
    cutoff = now - timedelta(days=30)

    insert_item("old", end_date=now - timedelta(days=40))
    insert_item("recent", end_date=now - timedelta(days=20))
    insert_item("future", end_date=now + timedelta(days=2))

    deleted = ItemRepository.delete_items_ended_before(cutoff)

    assert deleted == 1
    remaining_ids = sorted(item.item_id for item in Item.select())
    assert remaining_ids == ["future", "recent"]


def test_delete_items_ended_before_returns_zero_when_nothing_matches(temp_db):
    now = datetime(2026, 2, 10, 12, 0, 0)
    cutoff = now - timedelta(days=30)

    insert_item("recent", end_date=now - timedelta(days=10))

    deleted = ItemRepository.delete_items_ended_before(cutoff)

    assert deleted == 0
