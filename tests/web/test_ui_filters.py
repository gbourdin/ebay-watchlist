from datetime import datetime, timedelta

from ebay_watchlist.db.models import Item
from ebay_watchlist.web.app import create_app


def insert_item(
    item_id: str,
    title: str,
    seller_name: str,
    category_name: str = "Category",
    category_id: int = 619,
    scraped_category_id: int = 619,
):
    now = datetime(2025, 1, 1, 12, 0, 0)
    Item.create(
        item_id=item_id,
        title=title,
        scraped_category_id=scraped_category_id,
        category_id=category_id,
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


def test_home_and_favorites_routes_serve_spa_entry(temp_db):
    app = create_app()
    client = app.test_client()

    home_response = client.get("/")
    favorites_response = client.get("/favorites")

    assert home_response.status_code == 200
    assert favorites_response.status_code == 200
    assert b'id="root"' in home_response.data
    assert b'id="root"' in favorites_response.data


def test_seller_route_redirects_to_home_with_query(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.get("/sellers/alice_shop")

    assert response.status_code == 302
    assert response.location is not None
    assert response.location.endswith("/?seller=alice_shop")


def test_leaf_category_route_redirects_by_category_name(temp_db):
    insert_item("i1", "Guitar", "alice", category_name="Electric Guitars", category_id=619)
    app = create_app()
    client = app.test_client()

    response = client.get("/categories/619")

    assert response.status_code == 302
    assert response.location is not None
    assert "category=Electric+Guitars" in response.location


def test_main_category_route_redirects_by_category_name(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.get("/main_category/619")

    assert response.status_code == 302
    assert response.location is not None
    assert "main_category=Musical+Instruments" in response.location


def test_manage_category_suggestions_route_redirects_to_api(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.get("/manage/category-suggestions?q=music")

    assert response.status_code == 302
    assert response.location is not None
    assert response.location.endswith("/api/v1/watchlist/category-suggestions?q=music")
