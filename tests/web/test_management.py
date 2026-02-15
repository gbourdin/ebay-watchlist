from ebay_watchlist.db.repositories import CategoryRepository, SellerRepository
from ebay_watchlist.web.app import create_app


def test_manage_route_serves_spa_entry(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.get("/manage")

    assert response.status_code == 200
    assert b"id='root'" in response.data


def test_watchlist_api_lists_enabled_sellers_and_categories(temp_db):
    SellerRepository.add_seller("alice_shop")
    CategoryRepository.add_category(619)

    app = create_app()
    client = app.test_client()

    response = client.get("/api/v1/watchlist")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["sellers"] == ["alice_shop"]
    assert payload["categories"] == [{"id": 619, "name": "Musical Instruments"}]


def test_watchlist_api_can_add_and_remove_seller(temp_db):
    app = create_app()
    client = app.test_client()

    create_response = client.post("/api/v1/watchlist/sellers", json={"seller_name": "new_seller"})
    assert create_response.status_code == 201
    assert create_response.get_json() == {"seller_name": "new_seller"}

    delete_response = client.delete("/api/v1/watchlist/sellers/new_seller")
    assert delete_response.status_code == 200
    assert delete_response.get_json() == {"seller_name": "new_seller"}


def test_watchlist_api_rejects_blank_seller(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.post("/api/v1/watchlist/sellers", json={"seller_name": "  "})

    assert response.status_code == 400
    assert response.get_json() == {"error": "seller_name is required"}


def test_watchlist_api_can_add_category_by_name_and_remove(temp_db):
    app = create_app()
    client = app.test_client()

    create_response = client.post(
        "/api/v1/watchlist/categories", json={"category_name": "Musical Instruments"}
    )
    assert create_response.status_code == 201
    assert create_response.get_json() == {
        "category_id": 619,
        "category_name": "Musical Instruments",
    }

    delete_response = client.delete("/api/v1/watchlist/categories/619")
    assert delete_response.status_code == 200
    assert delete_response.get_json() == {"category_id": 619}


def test_watchlist_api_can_add_category_by_explicit_id(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.post("/api/v1/watchlist/categories", json={"category_id": 58058})

    assert response.status_code == 201
    assert response.get_json() == {
        "category_id": 58058,
        "category_name": "Computers",
    }


def test_watchlist_api_rejects_unknown_category_name(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.post("/api/v1/watchlist/categories", json={"category_name": "Unknown"})

    assert response.status_code == 400
    assert "Unknown category" in response.get_json()["error"]


def test_watchlist_category_suggestions_returns_json(temp_db, monkeypatch):
    from ebay_watchlist.web import api_v1

    monkeypatch.setattr(
        api_v1,
        "_search_watchlist_category_suggestions",
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
    response = client.get("/api/v1/watchlist/category-suggestions?q=music")

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
