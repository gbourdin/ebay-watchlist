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
    creation_date: datetime | None = None,
    end_date: datetime | None = None,
    current_bid_price: float | None = None,
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
        current_bid_price=current_bid_price,
        current_bid_price_currency="GBP" if current_bid_price is not None else None,
        bid_count=1,
        web_url=f"https://www.ebay.com/itm/{item_id}",
        origin_date=now,
        creation_date=creation_date or now,
        end_date=end_date or (now + timedelta(days=1)),
    )


def test_home_filters_by_seller_and_search_query(temp_db):
    insert_item("1", "Yamaha Synth", "alice")
    insert_item("2", "Guitar Pedal", "bob")

    app = create_app()
    client = app.test_client()

    response = client.get("/?seller=alice&q=Synth")

    assert response.status_code == 200
    assert b"Yamaha Synth" in response.data
    assert b"Guitar Pedal" not in response.data


def test_home_supports_sorting_by_ending_soon(temp_db):
    base = datetime.now().replace(microsecond=0)
    insert_item(
        "1",
        "Late Ending",
        "alice",
        end_date=base + timedelta(days=3),
        creation_date=base,
    )
    insert_item(
        "2",
        "Soon Ending",
        "alice",
        end_date=base + timedelta(hours=2),
        creation_date=base + timedelta(minutes=1),
    )

    app = create_app()
    client = app.test_client()

    response = client.get("/?sort=ending_soon")

    assert response.status_code == 200
    assert response.data.index(b"Soon Ending") < response.data.index(b"Late Ending")


def test_home_supports_pagination(temp_db):
    base = datetime(2025, 1, 1, 12, 0, 0)
    for idx in range(1, 156):
        insert_item(
            str(idx),
            f"Item {idx}",
            "alice",
            creation_date=base + timedelta(minutes=idx),
        )

    app = create_app()
    client = app.test_client()

    response_page_1 = client.get("/")
    response_page_2 = client.get("/?page=2")

    assert response_page_1.status_code == 200
    assert b"Item 155" in response_page_1.data
    assert b"Item 55" not in response_page_1.data
    assert b"Showing 100 items on page 1" in response_page_1.data
    assert b"Page 1 of 2" in response_page_1.data
    assert b"?sort=newest&amp;view=table&amp;page=2" in response_page_1.data

    assert response_page_2.status_code == 200
    assert b"Item 55" in response_page_2.data
    assert b"Item 155" not in response_page_2.data
    assert b"Showing 55 items on page 2" in response_page_2.data
    assert b"Page 2 of 2" in response_page_2.data
    assert b"?sort=newest&amp;view=table" in response_page_2.data


def test_home_shows_named_quick_category_filters(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.get("/")

    assert response.status_code == 200
    assert b"Musical Instruments" in response.data
    assert b"Computers" in response.data
    assert b"Videogames" in response.data
    assert b"Category 619" not in response.data


def test_home_filters_by_main_category_name(temp_db):
    insert_item("m1", "Synth One", "alice", scraped_category_id=619)
    insert_item("m2", "Laptop One", "bob", scraped_category_id=58058)

    app = create_app()
    client = app.test_client()

    response = client.get("/?main_category=Musical+Instruments")

    assert response.status_code == 200
    assert b"Synth One" in response.data
    assert b"Laptop One" not in response.data


def test_home_filters_by_multiple_sellers(temp_db):
    insert_item("s1", "Item A", "alice")
    insert_item("s2", "Item B", "bob")
    insert_item("s3", "Item C", "charlie")

    app = create_app()
    client = app.test_client()

    response = client.get("/?seller=alice&seller=bob")

    assert response.status_code == 200
    assert b"Item A" in response.data
    assert b"Item B" in response.data
    assert b"Item C" not in response.data


def test_home_shows_main_categories_before_categories_filter(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.get("/")

    assert response.status_code == 200
    assert response.data.index(b"Main Categories") < response.data.index(b"Categories")


def test_home_category_options_follow_selected_main_categories(temp_db):
    insert_item(
        "c1",
        "Guitar Item",
        "alice",
        category_name="Electric Guitars",
        scraped_category_id=619,
    )
    insert_item(
        "c2",
        "Laptop Item",
        "alice",
        category_name="Laptops",
        scraped_category_id=58058,
    )

    app = create_app()
    client = app.test_client()

    response = client.get("/?main_category=Musical+Instruments")

    assert response.status_code == 200
    assert b'<option value="Electric Guitars"></option>' in response.data
    assert b'<option value="Laptops"></option>' not in response.data


def test_home_sort_ending_soon_excludes_ended_items(temp_db):
    base = datetime.now().replace(microsecond=0)
    insert_item(
        "e1",
        "Already Ended",
        "alice",
        end_date=base - timedelta(hours=1),
        creation_date=base,
    )
    insert_item(
        "e2",
        "Still Running",
        "alice",
        end_date=base + timedelta(hours=4),
        creation_date=base + timedelta(minutes=1),
    )

    app = create_app()
    client = app.test_client()

    response = client.get("/?sort=ending_soon")

    assert response.status_code == 200
    assert b"Still Running" in response.data
    assert b"Already Ended" not in response.data


def test_home_filter_bar_does_not_show_apply_or_reset_buttons(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.get("/")

    assert response.status_code == 200
    assert b"Apply Filters" not in response.data
    assert b"Reset" not in response.data


def test_home_search_submits_only_on_enter(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.get("/")

    assert response.status_code == 200
    assert b'searchInput.addEventListener("keydown"' in response.data
    assert b'searchInput.addEventListener("input"' not in response.data
    assert b"submitFilters(350)" not in response.data


def test_home_filter_panel_starts_collapsed(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.get("/")

    assert response.status_code == 200
    assert b'id="filters-panel" class="filters-panel collapsed' in response.data
    assert b"Show Filters" in response.data


def test_home_filter_panel_persists_state_in_localstorage(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.get("/")

    assert response.status_code == 200
    assert b"localStorage" in response.data
    assert b"ebay-watchlist.filters.open" in response.data
    assert b'toggle-filters-btn' in response.data


def test_home_pagination_includes_last_page_link(temp_db):
    base = datetime(2025, 1, 1, 12, 0, 0)
    for idx in range(1, 306):
        insert_item(
            f"pg-{idx}",
            f"Paged Item {idx}",
            "alice",
            creation_date=base + timedelta(minutes=idx),
        )

    app = create_app()
    client = app.test_client()

    response = client.get("/")

    assert response.status_code == 200
    assert b"Page 1 of 4" in response.data
    assert b"?sort=newest&amp;view=table&amp;page=2" in response.data
    assert b"?sort=newest&amp;view=table&amp;page=3" in response.data
    assert b"?sort=newest&amp;view=table&amp;page=4" in response.data

    response_page_3 = client.get("/?page=3")

    assert response_page_3.status_code == 200
    assert b"Page 3 of 4" in response_page_3.data
    assert b'href="/?sort=newest&amp;view=table"' in response_page_3.data
    assert b"?sort=newest&amp;view=table&amp;page=2" in response_page_3.data
    assert b"?sort=newest&amp;view=table&amp;page=4" in response_page_3.data
