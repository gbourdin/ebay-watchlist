from datetime import datetime, timedelta

from ebay_watchlist.db.models import Item
from ebay_watchlist.web.app import create_app


def insert_item(item_id: str):
    now = datetime(2025, 1, 1, 12, 0, 0)
    Item.create(
        item_id=item_id,
        title="Item",
        scraped_category_id=619,
        category_id=619,
        category_name="Electric Guitars",
        image_url="https://img.example/item.jpg",
        seller_name="alice",
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


def test_toggle_favorite_updates_state(temp_db):
    insert_item("1")
    app = create_app()
    client = app.test_client()

    response = client.post("/api/v1/items/1/favorite", json={"value": True})

    assert response.status_code == 200
    assert response.get_json() == {"item_id": "1", "favorite": True}


def test_toggle_hidden_updates_state(temp_db):
    insert_item("2")
    app = create_app()
    client = app.test_client()

    response = client.post("/api/v1/items/2/hide", json={"value": True})

    assert response.status_code == 200
    assert response.get_json() == {"item_id": "2", "hidden": True}


def test_toggle_endpoints_reject_non_boolean_payloads(temp_db):
    insert_item("3")
    app = create_app()
    client = app.test_client()

    response = client.post("/api/v1/items/3/favorite", json={"value": "yes"})

    assert response.status_code == 400
    assert response.get_json() == {"error": "value must be a boolean"}
