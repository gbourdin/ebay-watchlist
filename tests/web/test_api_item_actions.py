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


def test_note_endpoint_upserts_and_clears_note(temp_db):
    insert_item("4")
    app = create_app()
    client = app.test_client()

    create_response = client.post("/api/v1/items/4/note", json={"note_text": "Bid up to 150 GBP"})
    assert create_response.status_code == 200
    created = create_response.get_json()
    assert created["item_id"] == "4"
    assert created["note_text"] == "Bid up to 150 GBP"
    assert created["note_created_at"] is not None
    assert created["note_last_modified"] is not None

    clear_response = client.post("/api/v1/items/4/note", json={"note_text": ""})
    assert clear_response.status_code == 200
    assert clear_response.get_json() == {
        "item_id": "4",
        "note_text": None,
        "note_created_at": None,
        "note_last_modified": None,
    }


def test_note_endpoint_rejects_non_string_payload(temp_db):
    insert_item("5")
    app = create_app()
    client = app.test_client()

    response = client.post("/api/v1/items/5/note", json={"note_text": True})

    assert response.status_code == 400
    assert response.get_json() == {"error": "note_text must be a string"}
