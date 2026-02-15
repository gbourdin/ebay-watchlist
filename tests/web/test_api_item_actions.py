from datetime import datetime, timedelta
import logging

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


def test_refresh_item_updates_market_data(temp_db, monkeypatch):
    insert_item("6")
    app = create_app()
    client = app.test_client()

    class FakeEbayAPI:
        def __init__(self, client_id: str, client_secret: str, marketplace_id: str = "EBAY_GB"):
            _ = client_id, client_secret, marketplace_id

        def get_item_snapshot(self, item_id: str):
            assert item_id == "6"
            return {
                "price": {"value": "15.00", "currency": "GBP"},
                "currentBidPrice": {"value": "18.50", "currency": "GBP"},
                "bidCount": 3,
                "itemEndDate": "2025-01-03T14:30:00Z",
                "itemCreationDate": "2025-01-01T12:00:00Z",
                "itemWebUrl": "https://www.ebay.com/itm/6?foo=bar",
            }

    monkeypatch.setenv("EBAY_CLIENT_ID", "client-id")
    monkeypatch.setenv("EBAY_CLIENT_SECRET", "client-secret")
    monkeypatch.setattr("ebay_watchlist.web.api_v1.EbayAPI", FakeEbayAPI)

    response = client.post("/api/v1/items/6/refresh")

    assert response.status_code == 200
    payload = response.get_json()
    assert set(payload) == {"item"}
    assert payload["item"]["item_id"] == "6"
    assert payload["item"]["price"] == 18.5
    assert payload["item"]["currency"] == "GBP"
    assert payload["item"]["bids"] == 3
    assert payload["item"]["ends_at"].startswith("2025-01-03T14:30:00")
    assert payload["item"]["web_url"] == "https://www.ebay.com/itm/6"


def test_refresh_item_requires_ebay_credentials(temp_db, monkeypatch):
    insert_item("7")
    app = create_app()
    client = app.test_client()

    monkeypatch.delenv("EBAY_CLIENT_ID", raising=False)
    monkeypatch.delenv("EBAY_CLIENT_SECRET", raising=False)

    response = client.post("/api/v1/items/7/refresh")

    assert response.status_code == 503
    assert response.get_json() == {
        "error": "refresh unavailable: missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET"
    }


def test_refresh_item_returns_404_when_item_not_found_on_ebay(temp_db, monkeypatch):
    insert_item("8")
    app = create_app()
    client = app.test_client()

    class FakeEbayAPI:
        def __init__(self, client_id: str, client_secret: str, marketplace_id: str = "EBAY_GB"):
            _ = client_id, client_secret, marketplace_id

        def get_item_snapshot(self, item_id: str):
            assert item_id == "8"
            return None

    monkeypatch.setenv("EBAY_CLIENT_ID", "client-id")
    monkeypatch.setenv("EBAY_CLIENT_SECRET", "client-secret")
    monkeypatch.setattr("ebay_watchlist.web.api_v1.EbayAPI", FakeEbayAPI)

    response = client.post("/api/v1/items/8/refresh")

    assert response.status_code == 404
    assert response.get_json() == {"error": "item not found on ebay"}


def test_refresh_item_logs_failure_details(temp_db, monkeypatch, caplog):
    insert_item("9")
    app = create_app()
    client = app.test_client()

    class FakeEbayAPI:
        def __init__(self, client_id: str, client_secret: str, marketplace_id: str = "EBAY_GB"):
            _ = client_id, client_secret, marketplace_id

        def get_item_snapshot(self, item_id: str):
            assert item_id == "9"
            raise RuntimeError("upstream boom")

    monkeypatch.setenv("EBAY_CLIENT_ID", "client-id")
    monkeypatch.setenv("EBAY_CLIENT_SECRET", "client-secret")
    monkeypatch.setattr("ebay_watchlist.web.api_v1.EbayAPI", FakeEbayAPI)
    caplog.set_level(logging.ERROR, logger="ebay_watchlist.web.api_v1")

    response = client.post("/api/v1/items/9/refresh")

    assert response.status_code == 502
    assert response.get_json() == {"error": "refresh failed: could not fetch item from ebay"}
    assert any("Manual refresh failed for item_id=9" in message for message in caplog.messages)
