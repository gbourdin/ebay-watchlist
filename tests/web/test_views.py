from ebay_watchlist.web.app import create_app


def test_status_returns_valid_json(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.get("/status")

    assert response.status_code == 200
    assert response.get_json() == {"status": "OK"}


def test_category_route_rejects_non_numeric_ids(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.get("/categories/not-a-number")

    assert response.status_code == 404


def test_main_category_route_rejects_non_numeric_ids(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.get("/main_category/not-a-number")

    assert response.status_code == 404
