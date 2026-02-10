from ebay_watchlist.db.repositories import ItemRepository
from ebay_watchlist.ebay.dtos import EbayItem


def make_item(
    item_id: str,
    main_category: int | None,
    categories: list[dict],
) -> EbayItem:
    return EbayItem(
        item_id=item_id,
        title="Vintage Synth",
        main_category=main_category,
        categories=categories,
        image="https://img.example/synth.jpg",
        seller={
            "username": "seller1",
            "feedbackPercentage": 99.2,
            "feedbackScore": 123,
        },
        condition="Used",
        shipping_options=[],
        buying_options=["AUCTION"],
        price={"value": "10.00", "currency": "GBP"},
        current_bid_price={"value": "10.00", "currency": "GBP"},
        bid_count=1,
        web_url="https://www.ebay.com/itm/123?foo=bar",
        origin_date="2025-01-01T00:00:00Z",
        creation_date="2025-01-01T00:00:00Z",
        end_date="2025-01-02T00:00:00Z",
    )


def test_create_or_update_handles_missing_category_name_gracefully(temp_db):
    item = make_item(
        item_id="item-1",
        main_category=123,
        categories=[{"categoryName": "Other", "categoryId": 999}],
    )

    db_item = ItemRepository.create_or_update_item_from_ebay_item_dto(
        item, scraped_category_id=619
    )

    assert db_item.category_id == 123
    assert db_item.category_name == "Unknown"


def test_create_or_update_falls_back_when_main_category_missing(temp_db):
    item = make_item(
        item_id="item-2",
        main_category=None,
        categories=[{"categoryName": "Keyboards", "categoryId": 777}],
    )

    db_item = ItemRepository.create_or_update_item_from_ebay_item_dto(
        item, scraped_category_id=619
    )

    assert db_item.category_id == 777
    assert db_item.category_name == "Keyboards"
