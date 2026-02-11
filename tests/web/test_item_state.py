from datetime import datetime, timedelta

from ebay_watchlist.db.models import Item
from ebay_watchlist.db.repositories import ItemRepository
from ebay_watchlist.web.app import create_app


def insert_item(item_id: str, title: str) -> None:
    now = datetime(2026, 1, 1, 12, 0, 0)
    Item.create(
        item_id=item_id,
        title=title,
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
        current_bid_price=11,
        current_bid_price_currency="GBP",
        bid_count=2,
        web_url=f"https://www.ebay.com/itm/{item_id}",
        origin_date=now,
        creation_date=now,
        end_date=now + timedelta(days=2),
    )


def test_home_hides_items_marked_hidden(temp_db):
    insert_item("s1", "Hidden Item")
    ItemRepository.update_item_state("s1", hidden=True)

    app = create_app()
    client = app.test_client()

    response = client.get("/")

    assert response.status_code == 200
    assert b"Hidden Item" not in response.data


def test_state_endpoint_can_toggle_favorite_and_notified(temp_db):
    insert_item("s2", "Stateful Item")

    app = create_app()
    client = app.test_client()

    response_favorite = client.post(
        "/items/s2/state",
        data={"field": "favorite", "value": "1", "next": "/"},
        follow_redirects=True,
    )
    response_notified = client.post(
        "/items/s2/state",
        data={"field": "notified", "value": "1", "next": "/"},
        follow_redirects=True,
    )

    assert response_favorite.status_code == 200
    assert response_notified.status_code == 200
    assert b"Favorite" in response_notified.data
    assert b"Notified" in response_notified.data


def test_state_endpoint_can_hide_then_unhide_item(temp_db):
    insert_item("s3", "Toggle Hidden Item")

    app = create_app()
    client = app.test_client()

    hidden_response = client.post(
        "/items/s3/state",
        data={"field": "hidden", "value": "1", "next": "/"},
        follow_redirects=True,
    )

    assert hidden_response.status_code == 200
    assert b"Toggle Hidden Item" not in hidden_response.data

    unhidden_response = client.post(
        "/items/s3/state",
        data={"field": "hidden", "value": "0", "next": "/"},
        follow_redirects=True,
    )

    assert unhidden_response.status_code == 200
    assert b"Toggle Hidden Item" in unhidden_response.data
