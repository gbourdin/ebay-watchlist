from datetime import datetime, timedelta

from ebay_watchlist.db.models import Item
from ebay_watchlist.web.app import create_app


def insert_item(
    item_id: str,
    seller_name: str,
    category_name: str,
    scraped_category_id: int,
):
    now = datetime(2025, 1, 1, 12, 0, 0)
    Item.create(
        item_id=item_id,
        title=f"{category_name} Item",
        scraped_category_id=scraped_category_id,
        category_id=scraped_category_id,
        category_name=category_name,
        image_url="https://img.example/item.jpg",
        seller_name=seller_name,
        condition="Used",
        shipping_options=[],
        buying_options=["AUCTION"],
        price=10,
        price_currency="GBP",
        current_bid_price=10,
        current_bid_price_currency="GBP",
        bid_count=1,
        web_url=f"https://www.ebay.com/itm/{item_id}",
        origin_date=now,
        creation_date=now,
        end_date=now + timedelta(days=1),
    )


def test_seller_suggestions_returns_matches(temp_db):
    insert_item("1", "alice_music", "Electric Guitars", 619)
    insert_item("2", "bob_tech", "Laptops", 58058)

    app = create_app()
    client = app.test_client()

    response = client.get("/api/v1/suggestions/sellers?q=alice")

    assert response.status_code == 200
    assert response.get_json() == {
        "items": [{"value": "alice_music", "label": "alice_music"}]
    }


def test_category_suggestions_can_be_scoped_by_main_category(temp_db):
    insert_item("1", "alice", "Electric Guitars", 619)
    insert_item("2", "bob", "Laptops", 58058)

    app = create_app()
    client = app.test_client()

    response = client.get(
        "/api/v1/suggestions/categories"
        "?q=a"
        "&main_category=Musical+Instruments"
    )

    assert response.status_code == 200
    assert response.get_json() == {
        "items": [{"value": "Electric Guitars", "label": "Electric Guitars"}]
    }
