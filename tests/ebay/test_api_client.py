import requests

from ebay_watchlist.ebay.api import EbayAPI


class FakeResponse:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload

    def raise_for_status(self):
        if self.status_code >= 400 and self.status_code != 401:
            raise requests.HTTPError(f"status={self.status_code}")

    def json(self):
        return self._payload


class FakeSession:
    def __init__(self, responses: list[FakeResponse]):
        self.responses = responses
        self.get_calls = 0
        self.headers = {}

    def get(self, url, params=None, timeout=None):
        self.get_calls += 1
        return self.responses.pop(0)


def test_401_triggers_reauth_and_single_retry():
    api = EbayAPI("id", "secret")
    api.session = FakeSession(
        [
            FakeResponse(401, {}),
            FakeResponse(200, {"itemSummaries": [{"itemId": "v1"}]}),
        ]
    )
    api.authenticated = True

    auth_calls = {"count": 0}

    def fake_authenticate():
        auth_calls["count"] += 1
        api.authenticated = True

    api._authenticate = fake_authenticate
    api.parse_items = staticmethod(lambda items: ["ok"])  # type: ignore[method-assign]

    result = api.get_latest_items_for_sellers(["seller"], category_id=123, limit=1)

    assert result == ["ok"]
    assert auth_calls["count"] == 1
    assert api.session.get_calls == 2


def test_get_latest_items_handles_missing_item_summaries():
    api = EbayAPI("id", "secret")
    api.session = FakeSession([FakeResponse(200, {})])
    api.authenticated = True

    result = api.get_latest_items_for_sellers(["seller"], category_id=123, limit=1)

    assert result == []


def test_parse_items_handles_missing_leaf_category_ids():
    item_payload = {
        "itemId": "v1",
        "title": "Synth",
        "categories": [{"categoryName": "Keys", "categoryId": 777}],
        "image": {"imageUrl": "https://img.example/item.jpg"},
        "seller": {
            "username": "seller1",
            "feedbackPercentage": 99.0,
            "feedbackScore": 100,
        },
        "condition": "Used",
        "shippingOptions": [],
        "buyingOptions": ["AUCTION"],
        "price": {"value": "10.00", "currency": "GBP"},
        "currentBidPrice": {"value": "10.00", "currency": "GBP"},
        "bidCount": 2,
        "itemWebUrl": "https://www.ebay.com/itm/123?foo=bar",
        "itemOriginDate": "2025-01-01T00:00:00Z",
        "itemCreationDate": "2025-01-01T00:00:00Z",
        "itemEndDate": "2025-01-02T00:00:00Z",
    }

    items = EbayAPI.parse_items([item_payload])

    assert len(items) == 1
    assert items[0].main_category is None
