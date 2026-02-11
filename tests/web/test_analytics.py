from datetime import datetime, timedelta

from ebay_watchlist.db.models import Item
from ebay_watchlist.db.repositories import ItemRepository
from ebay_watchlist.web.app import create_app


def insert_item(
    item_id: str,
    title: str,
    seller_name: str,
    category_name: str,
    creation_date: datetime,
    end_date: datetime,
) -> None:
    Item.create(
        item_id=item_id,
        title=title,
        scraped_category_id=619,
        category_id=619,
        category_name=category_name,
        image_url="https://img.example/item.jpg",
        seller_name=seller_name,
        condition="Used",
        shipping_options=[],
        buying_options=["AUCTION"],
        price=10,
        price_currency="GBP",
        current_bid_price=11,
        current_bid_price_currency="GBP",
        bid_count=1,
        web_url=f"https://www.ebay.com/itm/{item_id}",
        origin_date=creation_date,
        creation_date=creation_date,
        end_date=end_date,
    )


def test_analytics_page_renders_empty_state(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.get("/analytics")

    assert response.status_code == 200
    assert b'id="metric-total-items">0<' in response.data
    assert b'id="metric-active-items">0<' in response.data
    assert b'id="metric-ending-soon-items">0<' in response.data


def test_analytics_page_shows_metrics_and_rankings(temp_db):
    now = datetime.now().replace(microsecond=0)
    insert_item(
        item_id="a1",
        title="Guitar A",
        seller_name="alice",
        category_name="Electric Guitars",
        creation_date=now - timedelta(days=1),
        end_date=now + timedelta(hours=2),
    )
    insert_item(
        item_id="a2",
        title="Keys A",
        seller_name="alice",
        category_name="Keyboards",
        creation_date=now - timedelta(days=10),
        end_date=now + timedelta(days=2),
    )
    insert_item(
        item_id="b1",
        title="Laptop B",
        seller_name="bob",
        category_name="Laptops",
        creation_date=now - timedelta(days=2),
        end_date=now - timedelta(hours=2),
    )
    insert_item(
        item_id="c1",
        title="Guitar C",
        seller_name="carol",
        category_name="Electric Guitars",
        creation_date=now - timedelta(hours=6),
        end_date=now + timedelta(hours=20),
    )

    ItemRepository.update_item_state("a1", favorite=True)
    ItemRepository.update_item_state("b1", hidden=True)
    ItemRepository.update_item_state("c1", notified=True)

    app = create_app()
    client = app.test_client()
    response = client.get("/analytics")

    assert response.status_code == 200
    assert b'id="metric-total-items">4<' in response.data
    assert b'id="metric-active-items">3<' in response.data
    assert b'id="metric-ending-soon-items">2<' in response.data
    assert b'id="metric-new-last-7-days">3<' in response.data
    assert b'id="metric-hidden-items">1<' in response.data
    assert b'id="metric-favorite-items">1<' in response.data
    assert b'id="metric-notified-items">1<' in response.data

    assert b"alice" in response.data
    assert b"carol" in response.data
    assert b"Electric Guitars" in response.data
