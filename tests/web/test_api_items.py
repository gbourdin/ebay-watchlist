from ebay_watchlist.web.app import create_app


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
