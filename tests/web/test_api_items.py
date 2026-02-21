from datetime import datetime, timedelta

from freezegun import freeze_time

from ebay_watchlist.db.models import Item
from ebay_watchlist.db.repositories import ItemRepository
from ebay_watchlist.web.app import create_app


def insert_item(
    item_id: str,
    title: str,
    seller_name: str,
    category_name: str,
    scraped_category_id: int,
    creation_date: datetime,
    end_date: datetime,
    bid_count: int = 0,
    current_bid_price: float | None = None,
    price: float = 10,
):
    Item.create(
        item_id=item_id,
        title=title,
        scraped_category_id=scraped_category_id,
        category_id=scraped_category_id,
        category_name=category_name,
        image_url="https://img.example/item.jpg",
        seller_name=seller_name,
        condition="Used",
        shipping_options=[],
        buying_options=["AUCTION"],
        price=price,
        price_currency="GBP",
        current_bid_price=current_bid_price,
        current_bid_price_currency="GBP" if current_bid_price is not None else None,
        bid_count=bid_count,
        web_url=f"https://www.ebay.com/itm/{item_id}",
        origin_date=creation_date,
        creation_date=creation_date,
        end_date=end_date,
    )


def test_items_api_returns_paginated_payload_shape(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.get("/api/v1/items")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload == {
        "items": [],
        "page": 1,
        "page_size": 100,
        "total": 0,
        "total_pages": 1,
        "has_next": False,
        "has_prev": False,
        "sort": "newest",
    }


@freeze_time("2025-01-01 12:00:00")
def test_items_api_serializes_row_fields(temp_db):
    base = datetime(2025, 1, 1, 12, 0, 0)
    insert_item(
        item_id="1",
        title="Test Guitar",
        seller_name="alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
        creation_date=base,
        end_date=base + timedelta(days=1),
        bid_count=3,
        current_bid_price=42.5,
    )

    ItemRepository.update_item_state(item_id="1", hidden=True, favorite=True)
    ItemRepository.upsert_item_note(item_id="1", note_text="Max 120 GBP")

    app = create_app()
    client = app.test_client()

    payload = client.get("/api/v1/items?show_hidden=1").get_json()
    row = payload["items"][0]

    assert set(row) >= {
        "item_id",
        "title",
        "image_url",
        "price",
        "currency",
        "bids",
        "seller",
        "category",
        "posted_at",
        "ends_at",
        "web_url",
        "hidden",
        "favorite",
        "note_text",
        "note_created_at",
        "note_last_modified",
    }
    assert row["item_id"] == "1"
    assert row["title"] == "Test Guitar"
    assert row["seller"] == "alice"
    assert row["category"] == "Electric Guitars"
    assert row["price"] == 42.5
    assert row["currency"] == "GBP"
    assert row["bids"] == 3
    assert row["hidden"] is True
    assert row["favorite"] is True
    assert row["web_url"] == "https://www.ebay.com/itm/1"
    assert row["note_text"] == "Max 120 GBP"
    assert row["note_created_at"] is not None
    assert row["note_last_modified"] is not None


@freeze_time("2025-01-01 12:00:00")
def test_items_api_applies_filters_sort_and_pagination(temp_db):
    base = datetime(2025, 1, 1, 12, 0, 0)
    insert_item(
        item_id="1",
        title="Lead Guitar",
        seller_name="alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
        creation_date=base + timedelta(minutes=3),
        end_date=base + timedelta(days=3),
    )
    insert_item(
        item_id="2",
        title="Laptop Pro",
        seller_name="bob",
        category_name="Laptops",
        scraped_category_id=58058,
        creation_date=base + timedelta(minutes=2),
        end_date=base + timedelta(days=2),
    )
    insert_item(
        item_id="3",
        title="Bass Guitar",
        seller_name="alice",
        category_name="Acoustic Guitars",
        scraped_category_id=619,
        creation_date=base + timedelta(minutes=1),
        end_date=base + timedelta(days=1),
    )

    app = create_app()
    client = app.test_client()

    response = client.get(
        "/api/v1/items"
        "?seller=alice"
        "&main_category=Musical+Instruments"
        "&q=Guitar"
        "&page_size=1"
        "&page=2"
        "&sort=newest"
    )

    assert response.status_code == 200
    payload = response.get_json()

    assert payload["total"] == 2
    assert payload["page"] == 2
    assert payload["page_size"] == 1
    assert payload["total_pages"] == 2
    assert payload["has_prev"] is True
    assert payload["has_next"] is False
    assert payload["sort"] == "newest"
    assert [row["item_id"] for row in payload["items"]] == ["3"]


@freeze_time("2026-02-16 12:00:00")
def test_items_api_ending_soon_active_excludes_ended_items(temp_db):
    now = datetime(2026, 2, 16, 12, 0, 0)
    insert_item(
        item_id="ended",
        title="Ended Auction",
        seller_name="alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
        creation_date=now - timedelta(days=2),
        end_date=now - timedelta(hours=1),
    )
    insert_item(
        item_id="active-late",
        title="Ends Later",
        seller_name="alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
        creation_date=now - timedelta(days=1),
        end_date=now + timedelta(hours=3),
    )
    insert_item(
        item_id="active-soon",
        title="Ends Soon",
        seller_name="alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
        creation_date=now - timedelta(days=1),
        end_date=now + timedelta(hours=1),
    )

    app = create_app()
    client = app.test_client()

    response = client.get("/api/v1/items?sort=ending_soon_active")

    assert response.status_code == 200
    payload = response.get_json()
    assert [row["item_id"] for row in payload["items"]] == [
        "active-soon",
        "active-late",
    ]


@freeze_time("2026-02-16 12:00:00")
def test_items_api_ending_soon_active_respects_show_ended_flag(temp_db):
    now = datetime(2026, 2, 16, 12, 0, 0)
    insert_item(
        item_id="ended",
        title="Ended Auction",
        seller_name="alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
        creation_date=now - timedelta(days=2),
        end_date=now - timedelta(hours=1),
    )
    insert_item(
        item_id="active-late",
        title="Ends Later",
        seller_name="alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
        creation_date=now - timedelta(days=1),
        end_date=now + timedelta(hours=3),
    )
    insert_item(
        item_id="active-soon",
        title="Ends Soon",
        seller_name="alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
        creation_date=now - timedelta(days=1),
        end_date=now + timedelta(hours=1),
    )

    app = create_app()
    client = app.test_client()

    response = client.get("/api/v1/items?sort=ending_soon_active&show_ended=1")

    assert response.status_code == 200
    payload = response.get_json()
    assert [row["item_id"] for row in payload["items"]] == [
        "ended",
        "active-soon",
        "active-late",
    ]


@freeze_time("2026-02-16 12:00:00")
def test_items_api_excludes_ended_by_default_and_can_include_with_flag(temp_db):
    now = datetime(2026, 2, 16, 12, 0, 0)
    insert_item(
        item_id="ended",
        title="Ended Auction",
        seller_name="alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
        creation_date=now - timedelta(days=3),
        end_date=now - timedelta(hours=1),
    )
    insert_item(
        item_id="active",
        title="Active Auction",
        seller_name="alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
        creation_date=now - timedelta(days=2),
        end_date=now + timedelta(hours=1),
    )

    app = create_app()
    client = app.test_client()

    default_response = client.get("/api/v1/items?sort=newest")
    assert default_response.status_code == 200
    assert [row["item_id"] for row in default_response.get_json()["items"]] == ["active"]

    include_ended_response = client.get("/api/v1/items?sort=newest&show_ended=1")
    assert include_ended_response.status_code == 200
    assert [row["item_id"] for row in include_ended_response.get_json()["items"]] == [
        "active",
        "ended",
    ]


@freeze_time("2026-02-16 12:00:00")
def test_items_api_last_24h_filter_can_be_combined_with_show_ended(temp_db):
    now = datetime(2026, 2, 16, 12, 0, 0)
    insert_item(
        item_id="old-active",
        title="Old active",
        seller_name="alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
        creation_date=now - timedelta(days=3),
        end_date=now + timedelta(days=2),
    )
    insert_item(
        item_id="recent-active",
        title="Recent active",
        seller_name="alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
        creation_date=now - timedelta(hours=1),
        end_date=now + timedelta(days=2),
    )
    insert_item(
        item_id="recent-ended",
        title="Recent ended",
        seller_name="alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
        creation_date=now - timedelta(hours=2),
        end_date=now - timedelta(minutes=30),
    )

    app = create_app()
    client = app.test_client()

    default_response = client.get("/api/v1/items?sort=newest")
    assert default_response.status_code == 200
    assert [row["item_id"] for row in default_response.get_json()["items"]] == [
        "recent-active",
        "old-active",
    ]

    last_24h_response = client.get("/api/v1/items?sort=newest&last_24h=1")
    assert last_24h_response.status_code == 200
    assert [row["item_id"] for row in last_24h_response.get_json()["items"]] == [
        "recent-active",
    ]

    last_24h_with_ended_response = client.get(
        "/api/v1/items?sort=newest&last_24h=1&show_ended=1"
    )
    assert last_24h_with_ended_response.status_code == 200
    assert [row["item_id"] for row in last_24h_with_ended_response.get_json()["items"]] == [
        "recent-active",
        "recent-ended",
    ]


@freeze_time("2026-02-16 12:00:00")
def test_items_api_price_sort_uses_current_bid_or_price_fallback(temp_db):
    base = datetime(2026, 2, 16, 12, 0, 0)
    insert_item(
        item_id="no-bid",
        title="No bid yet",
        seller_name="alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
        creation_date=base,
        end_date=base + timedelta(days=1),
        current_bid_price=None,
        price=90,
    )
    insert_item(
        item_id="low-bid",
        title="Low bid",
        seller_name="alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
        creation_date=base,
        end_date=base + timedelta(days=1),
        current_bid_price=10,
        price=500,
    )
    insert_item(
        item_id="high-bid",
        title="High bid",
        seller_name="alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
        creation_date=base,
        end_date=base + timedelta(days=1),
        current_bid_price=120,
        price=20,
    )

    app = create_app()
    client = app.test_client()

    low_response = client.get("/api/v1/items?sort=price_low")
    assert low_response.status_code == 200
    assert [row["item_id"] for row in low_response.get_json()["items"]] == [
        "low-bid",
        "no-bid",
        "high-bid",
    ]

    high_response = client.get("/api/v1/items?sort=price_high")
    assert high_response.status_code == 200
    assert [row["item_id"] for row in high_response.get_json()["items"]] == [
        "high-bid",
        "no-bid",
        "low-bid",
    ]


@freeze_time("2026-02-16 12:00:00")
def test_items_api_price_sort_excludes_ended_by_default(temp_db):
    now = datetime(2026, 2, 16, 12, 0, 0)
    insert_item(
        item_id="ended-lowest",
        title="Ended cheapest",
        seller_name="alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
        creation_date=now - timedelta(days=2),
        end_date=now - timedelta(hours=2),
        current_bid_price=1,
        price=1,
    )
    insert_item(
        item_id="active-expensive",
        title="Active expensive",
        seller_name="alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
        creation_date=now - timedelta(days=1),
        end_date=now + timedelta(hours=2),
        current_bid_price=100,
        price=100,
    )

    app = create_app()
    client = app.test_client()

    default_response = client.get("/api/v1/items?sort=price_low")
    assert default_response.status_code == 200
    assert [row["item_id"] for row in default_response.get_json()["items"]] == [
        "active-expensive",
    ]

    include_ended_response = client.get("/api/v1/items?sort=price_low&show_ended=1")
    assert include_ended_response.status_code == 200
    assert [row["item_id"] for row in include_ended_response.get_json()["items"]] == [
        "ended-lowest",
        "active-expensive",
    ]
