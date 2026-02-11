from ebay_watchlist.db.repositories import CategoryRepository, SellerRepository
from ebay_watchlist.web.app import create_app


def test_manage_page_lists_enabled_sellers_and_categories(temp_db):
    SellerRepository.add_seller("alice_shop")
    CategoryRepository.add_category(619)

    app = create_app()
    client = app.test_client()

    response = client.get("/manage")

    assert response.status_code == 200
    assert b"alice_shop" in response.data
    assert b"Musical Instruments" in response.data


def test_manage_page_can_add_seller(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.post(
        "/manage",
        data={"action": "add_seller", "seller_name": "new_seller"},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Seller added" in response.data
    assert b"new_seller" in response.data


def test_manage_page_can_remove_seller(temp_db):
    SellerRepository.add_seller("old_seller")
    app = create_app()
    client = app.test_client()

    response = client.post(
        "/manage",
        data={"action": "remove_seller", "seller_name": "old_seller"},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Seller removed" in response.data
    assert b"old_seller" not in response.data


def test_manage_page_can_add_category_by_name(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.post(
        "/manage",
        data={"action": "add_category", "category": "Musical Instruments"},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Category added" in response.data
    assert b"Musical Instruments" in response.data


def test_manage_page_can_add_category_by_explicit_id(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.post(
        "/manage",
        data={"action": "add_category", "category_id": "58058"},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Category added" in response.data
    assert b"ID: 58058" in response.data


def test_manage_page_can_remove_category(temp_db):
    CategoryRepository.add_category(619)
    app = create_app()
    client = app.test_client()

    response = client.post(
        "/manage",
        data={"action": "remove_category", "category_id": "619"},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Category removed" in response.data
    assert b"ID: 619" not in response.data


def test_manage_page_rejects_unknown_category_name(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.post(
        "/manage",
        data={"action": "add_category", "category": "Unknown Cat"},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Unknown category" in response.data


def test_manage_category_suggestions_returns_json(temp_db, monkeypatch):
    from ebay_watchlist.web import views

    monkeypatch.setattr(
        views,
        "search_category_suggestions",
        lambda query, marketplace_id=None: [
            {
                "id": "619",
                "name": "Musical Instruments",
                "path": "Musical Instruments",
            }
        ],
    )

    app = create_app()
    client = app.test_client()
    response = client.get("/manage/category-suggestions?q=music")

    assert response.status_code == 200
    assert response.get_json() == {
        "suggestions": [
            {
                "id": "619",
                "name": "Musical Instruments",
                "path": "Musical Instruments",
            }
        ]
    }
