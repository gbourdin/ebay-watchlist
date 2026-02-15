import base64
import logging
import os
from urllib.parse import quote

import requests
from pydantic import ValidationError

from ebay_watchlist.ebay.dtos import EbayItem

SEARCH_API_ENDPOINT = "https://api.ebay.com/buy/browse/v1/item_summary/search"
ITEM_API_ENDPOINT = "https://api.ebay.com/buy/browse/v1/item/{item_id}"
OAUTH_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token"
TAXONOMY_DEFAULT_TREE_ENDPOINT = (
    "https://api.ebay.com/commerce/taxonomy/v1/get_default_category_tree_id"
)
TAXONOMY_CATEGORY_SUGGESTIONS_ENDPOINT = (
    "https://api.ebay.com/commerce/taxonomy/v1/category_tree/{category_tree_id}/get_category_suggestions"
)
HTTP_TIMEOUT_SECONDS = 20
logger = logging.getLogger(__name__)


class EbayAPI:
    def __init__(
        self, client_id: str, client_secret: str, marketplace_id: str = "EBAY_GB"
    ):
        self.authenticated = False
        self.client_id = client_id
        self.client_secret = client_secret

        headers = {
            "X-EBAY-C-MARKETPLACE-ID": marketplace_id,
        }
        self.session = requests.session()
        self.session.headers.update(headers)

    def _authenticate(self):
        """
        Logs in using client id and secret and stores the OAUTH APP Token.

        For long-lived sessions this will need to be called multiple times as
        the oauth tokens expire every 2 hours.

        Raises :class:`HTTPError` if there's an issue calling the API.
        """
        basic_auth = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()

        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": f"Basic {basic_auth}",
        }

        data = {
            "grant_type": "client_credentials",
            "scope": "https://api.ebay.com/oauth/api_scope",
        }

        try:
            auth_data = self.session.post(
                OAUTH_TOKEN_URL, headers=headers, data=data, timeout=HTTP_TIMEOUT_SECONDS
            )
        except requests.exceptions.SSLError:
            logger.exception(
                "TLS error while requesting eBay OAuth token. "
                "Retrying once with minimal OpenSSL env."
            )
            os.environ["OPENSSL_CONF"] = "/dev/null"
            os.environ.pop("OPENSSL_MODULES", None)
            auth_data = self.session.post(
                OAUTH_TOKEN_URL, headers=headers, data=data, timeout=HTTP_TIMEOUT_SECONDS
            )
        auth_data.raise_for_status()
        token_info = auth_data.json()

        oauth_app_token = token_info["access_token"]
        session_headers = {
            "Authorization": f"Bearer {oauth_app_token}",
        }

        self.authenticated = True
        self.session.headers.update(session_headers)

    def get_latest_items_for_sellers(
        self, seller_names: list[str], category_id: int, limit: int = 5
    ) -> list[EbayItem]:
        """
        Get the most recent listed auction items by the selected sellers in the specified category.

        If the seller list is empty it will return all the auctions for that category in the site.

        May raise :class:`HTTPError` if there's a problem calling the API.
        """
        if not self.authenticated:
            self._authenticate()

        params = {
            "category_ids": category_id,
            "sort": "newlyListed",
            "filter": self.build_filters(
                buying_options=["AUCTION"], sellers=seller_names
            ),
            "limit": limit,
        }

        request = self._get_with_reauth(SEARCH_API_ENDPOINT, params=params)

        results = request.json()
        items = results.get("itemSummaries", [])
        ebay_items = self.parse_items(items)

        return ebay_items

    def get_item_snapshot(self, item_id: str) -> dict | None:
        """
        Fetch a single eBay item payload by item id.

        Returns None when eBay responds with 404.
        """
        if not self.authenticated:
            self._authenticate()

        encoded_item_id = quote(item_id, safe="")
        endpoint = ITEM_API_ENDPOINT.format(item_id=encoded_item_id)
        params = {"fieldgroups": "COMPACT"}
        request = self._get_with_reauth(
            endpoint,
            params=params,
            allow_statuses={404},
        )

        if request.status_code == 404:
            return None

        payload = request.json()
        if not isinstance(payload, dict):
            raise requests.HTTPError("Unexpected item payload type")
        return payload

    def get_default_category_tree_id(self, marketplace_id: str = "EBAY_GB") -> str:
        if not self.authenticated:
            self._authenticate()

        request = self._get_with_reauth(
            TAXONOMY_DEFAULT_TREE_ENDPOINT,
            params={"marketplace_id": marketplace_id},
        )
        response_json = request.json()
        return str(response_json["categoryTreeId"])

    def get_category_suggestions(
        self,
        query: str,
        marketplace_id: str = "EBAY_GB",
        limit: int = 10,
    ) -> list[dict[str, str]]:
        normalized_query = query.strip()
        if not normalized_query:
            return []

        category_tree_id = self.get_default_category_tree_id(
            marketplace_id=marketplace_id
        )
        endpoint = TAXONOMY_CATEGORY_SUGGESTIONS_ENDPOINT.format(
            category_tree_id=category_tree_id
        )
        request = self._get_with_reauth(endpoint, params={"q": normalized_query})
        results = request.json()

        suggestions: list[dict[str, str]] = []
        for raw in results.get("categorySuggestions", []):
            category = raw.get("category", {})
            category_id = str(category.get("categoryId", "")).strip()
            category_name = str(category.get("categoryName", "")).strip()
            if not category_id or not category_name:
                continue

            ancestor_names = [
                str(node.get("categoryName", "")).strip()
                for node in raw.get("categoryTreeNodeAncestors", [])
                if str(node.get("categoryName", "")).strip()
            ]
            # Ancestors may come parent->root; display as root->leaf for readability.
            path_parts = list(reversed(ancestor_names))
            if not path_parts or path_parts[-1] != category_name:
                path_parts.append(category_name)

            suggestions.append(
                {
                    "id": category_id,
                    "name": category_name,
                    "path": " > ".join(path_parts),
                }
            )

            if len(suggestions) >= limit:
                break

        return suggestions

    def _get_with_reauth(
        self,
        url: str,
        params: dict | None = None,
        allow_statuses: set[int] | None = None,
    ):
        allowed = allow_statuses or set()
        request = self.session.get(url, params=params, timeout=HTTP_TIMEOUT_SECONDS)

        if request.status_code == 401:
            self.authenticated = False
            self._authenticate()
            request = self.session.get(url, params=params, timeout=HTTP_TIMEOUT_SECONDS)
            if request.status_code == 401:
                raise requests.HTTPError("Unauthorized after re-authentication")

        if request.status_code in allowed:
            return request

        # Intentionally unhandled, so failures for something other than authentication are loud
        request.raise_for_status()
        return request

    @staticmethod
    def build_filters(buying_options: list[str], sellers: list[str]) -> str:
        buying_options_filter = "buyingOptions:{" + ",".join(buying_options) + "}"

        if not sellers:  # Allow empty seller list
            return f"{buying_options_filter}"

        sellers_filter = "sellers:{" + "|".join(sellers) + "}"
        return f"{buying_options_filter},{sellers_filter}"

    @staticmethod
    def parse_items(json_items: list[dict] | None) -> list[EbayItem]:
        if not json_items:
            return []

        ebay_items = []

        for item in json_items:
            if not isinstance(item, dict):
                logger.warning("Skipping non-dict item payload: %r", item)
                continue

            leaf_category_ids = item.get("leafCategoryIds")
            main_category = None
            if isinstance(leaf_category_ids, list) and leaf_category_ids:
                main_category = leaf_category_ids[0]

            image_info = item.get("image")
            image_url = None
            if isinstance(image_info, dict):
                image_url = image_info.get("imageUrl")

            try:
                ebay_item = EbayItem.model_validate(
                    {
                        "item_id": item.get("itemId"),
                        "title": item.get("title"),
                        "main_category": main_category,
                        "categories": item.get("categories", []),
                        "image": image_url,
                        "seller": item.get("seller"),
                        "condition": item.get("condition"),
                        "shipping_options": item.get("shippingOptions"),
                        "buying_options": item.get("buyingOptions", []),
                        "price": item.get("price", None),
                        "current_bid_price": item.get("currentBidPrice", None),
                        "bid_count": item.get("bidCount", 0),
                        "web_url": item.get("itemWebUrl"),
                        "origin_date": item.get("itemOriginDate"),
                        "creation_date": item.get("itemCreationDate"),
                        "end_date": item.get("itemEndDate"),
                    }
                )
            except ValidationError:
                logger.warning("Skipping invalid item payload: %r", item, exc_info=True)
                continue

            ebay_items.append(ebay_item)

        return ebay_items
