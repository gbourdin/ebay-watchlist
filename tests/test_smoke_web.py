from ebay_watchlist.web.app import create_app


def test_status_endpoint_returns_valid_json(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.get("/status")

    assert response.status_code == 200
    assert response.is_json
    assert response.get_json() == {"status": "OK"}


def test_home_page_renders(temp_db):
    app = create_app()
    client = app.test_client()

    response = client.get("/")

    assert response.status_code == 200
    assert b"Watched Listings" in response.data
