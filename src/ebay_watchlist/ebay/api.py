import base64

import requests

from ebay_watchlist.ebay.dtos import EbayItem

SEARCH_API_ENDPOINT = "https://api.ebay.com/buy/browse/v1/item_summary/search"
OAUTH_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token"


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

        auth_data = self.session.post(OAUTH_TOKEN_URL, headers=headers, data=data)
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

        request = self.session.get(SEARCH_API_ENDPOINT, params=params)

        if request.status_code == 401:
            self.authenticated = False
            return []  # Need a way to communicate to caller or retry

        # Intentionally unhandled, so failures for something other than authentication are loud
        request.raise_for_status()

        results = request.json()
        items = results.get("itemSummaries")
        ebay_items = self.parse_items(items)

        return ebay_items

    @staticmethod
    def build_filters(buying_options: list[str], sellers: list[str]) -> str:
        buying_options_filter = "buyingOptions:{" + ",".join(buying_options) + "}"

        if not sellers:  # Allow empty seller list
            return f"{buying_options_filter}"

        sellers_filter = "sellers:{" + "|".join(sellers) + "}"
        return f"{buying_options_filter},{sellers_filter}"

    @staticmethod
    def parse_items(json_items: list[dict]) -> list[EbayItem]:
        ebay_items = []

        for item in json_items:
            ebay_item = EbayItem(
                item_id=item.get("itemId"),
                title=item.get("title"),
                main_category=item.get("leafCategoryIds", [])[0],
                categories=item.get("categories", []),
                image=item.get("image", {}).get("imageUrl", None),
                seller=item.get("seller"),
                condition=item.get("condition"),
                shipping_options=item.get("shippingOptions"),
                buying_options=item.get("buyingOptions"),
                price=item.get("price", None),
                current_bid_price=item.get("currentBidPrice", None),
                bid_count=item.get("bidCount", 0),
                web_url=item.get("itemWebUrl"),
                origin_date=item.get("itemOriginDate"),
                creation_date=item.get("itemCreationDate"),
                end_date=item.get("itemEndDate"),
            )
            ebay_items.append(ebay_item)

        return ebay_items
