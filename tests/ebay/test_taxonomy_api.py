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
        self.headers = {}

    def get(self, url, params=None, timeout=None):
        return self.responses.pop(0)


def test_get_category_suggestions_uses_default_tree_and_formats_path():
    api = EbayAPI("id", "secret")
    api.session = FakeSession(
        [
            FakeResponse(200, {"categoryTreeId": "3", "categoryTreeVersion": "1"}),
            FakeResponse(
                200,
                {
                    "categorySuggestions": [
                        {
                            "category": {
                                "categoryId": "619",
                                "categoryName": "Electric Guitars",
                            },
                            "categoryTreeNodeAncestors": [
                                {
                                    "categoryId": "3858",
                                    "categoryName": "Guitars",
                                },
                                {
                                    "categoryId": "619",
                                    "categoryName": "Musical Instruments",
                                },
                            ],
                        }
                    ]
                },
            ),
        ]
    )
    api.authenticated = True

    suggestions = api.get_category_suggestions("telecaster", marketplace_id="EBAY_GB")

    assert suggestions == [
        {
            "id": "619",
            "name": "Electric Guitars",
            "path": "Musical Instruments > Guitars > Electric Guitars",
        }
    ]


def test_get_category_suggestions_handles_empty_response():
    api = EbayAPI("id", "secret")
    api.session = FakeSession(
        [
            FakeResponse(200, {"categoryTreeId": "3", "categoryTreeVersion": "1"}),
            FakeResponse(200, {}),
        ]
    )
    api.authenticated = True

    suggestions = api.get_category_suggestions("telecaster", marketplace_id="EBAY_GB")

    assert suggestions == []
