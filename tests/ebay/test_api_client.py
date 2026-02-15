import logging
import os

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
        self.last_url = None
        self.last_params = None

    def get(self, url, params=None, timeout=None):
        self.get_calls += 1
        self.last_url = url
        self.last_params = params
        return self.responses.pop(0)

    def post(self, url, headers=None, data=None, timeout=None):
        return self.responses.pop(0)


def test_401_triggers_reauth_and_single_retry():
    api = EbayAPI("id", "secret")
    api.session = FakeSession(
        [
            FakeResponse(401, {}),
            FakeResponse(200, {"access_token": "token-123"}),
            FakeResponse(200, {"itemSummaries": [{"itemId": "v1"}]}),
        ]
    )
    api.authenticated = True

    api.parse_items = staticmethod(lambda items: ["ok"])  # type: ignore[method-assign]

    result = api.get_latest_items_for_sellers(["seller"], category_id=123, limit=1)

    assert result == ["ok"]
    assert api.session.get_calls == 2
    assert api.session.headers["Authorization"] == "Bearer token-123"


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


def test_get_item_snapshot_reauths_once_and_returns_payload():
    api = EbayAPI("id", "secret")
    api.session = FakeSession(
        [
            FakeResponse(401, {}),
            FakeResponse(200, {"access_token": "token-123"}),
            FakeResponse(200, {"itemId": "v1", "price": {"value": "10.0", "currency": "GBP"}}),
        ]
    )
    api.authenticated = True

    payload = api.get_item_snapshot("v1|123")

    assert payload is not None
    assert payload["itemId"] == "v1"
    assert api.session.get_calls == 2
    assert api.session.headers["Authorization"] == "Bearer token-123"


def test_get_item_snapshot_returns_none_for_404():
    api = EbayAPI("id", "secret")
    api.session = FakeSession([FakeResponse(404, {})])
    api.authenticated = True

    payload = api.get_item_snapshot("v1|missing")

    assert payload is None


def test_get_item_snapshot_encodes_item_id_in_path():
    api = EbayAPI("id", "secret")
    api.session = FakeSession([FakeResponse(200, {"itemId": "v1"})])
    api.authenticated = True

    _ = api.get_item_snapshot("v1|123|0")

    assert api.session.last_url is not None
    assert "v1%7C123%7C0" in api.session.last_url
    assert api.session.last_params == {"fieldgroups": "COMPACT"}


def test_get_with_reauth_allows_configured_status_without_raising():
    api = EbayAPI("id", "secret")
    api.session = FakeSession([FakeResponse(404, {})])
    api.authenticated = True

    response = api._get_with_reauth(  # noqa: SLF001
        "https://api.example.test/resource",
        allow_statuses={404},
    )

    assert response.status_code == 404


def test_get_with_reauth_allows_status_after_single_reauth():
    api = EbayAPI("id", "secret")
    api.session = FakeSession(
        [
            FakeResponse(401, {}),
            FakeResponse(200, {"access_token": "token-123"}),
            FakeResponse(404, {}),
        ]
    )
    api.authenticated = True

    response = api._get_with_reauth(  # noqa: SLF001
        "https://api.example.test/resource",
        allow_statuses={404},
    )

    assert response.status_code == 404
    assert api.session.get_calls == 2
    assert api.session.headers["Authorization"] == "Bearer token-123"


def test_authenticate_retries_after_ssl_error_with_minimal_openssl_env(
    monkeypatch, caplog
):
    class AuthSession:
        def __init__(self):
            self.headers = {}
            self.post_calls = 0

        def post(self, url, headers=None, data=None, timeout=None):
            self.post_calls += 1
            if self.post_calls == 1:
                raise requests.exceptions.SSLError("ssl context failure")
            return FakeResponse(200, {"access_token": "token-123"})

    api = EbayAPI("id", "secret")
    api.session = AuthSession()
    monkeypatch.setenv("OPENSSL_CONF", "/broken/openssl.cnf")
    monkeypatch.setenv("OPENSSL_MODULES", "/broken/modules")
    caplog.set_level(logging.WARNING, logger="ebay_watchlist.ebay.api")

    api._authenticate()

    assert api.authenticated is True
    assert api.session.post_calls == 2
    assert api.session.headers["Authorization"] == "Bearer token-123"
    assert os.getenv("OPENSSL_CONF") == "/broken/openssl.cnf"
    assert os.getenv("OPENSSL_MODULES") == "/broken/modules"
    assert any(
        "temporary OpenSSL environment override" in message
        for message in caplog.messages
    )
