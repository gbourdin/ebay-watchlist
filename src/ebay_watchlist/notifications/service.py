import os
import logging
from collections import Counter
from urllib.parse import urljoin

from python_ntfy import NtfyClient, MessageSendError, ViewAction
from ebay_watchlist.db.models import Item

NTFY_TOPIC = os.getenv("NTFY_TOPIC_ID")
WEBSERVICE_URL = os.getenv("WEBSERVICE_URL", None)
SELLER_URI_TEMPLATE = "/sellers/{seller_name}"
logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self):
        self._client: NtfyClient | None = (
            NtfyClient(topic=NTFY_TOPIC) if NTFY_TOPIC else None
        )

    def notify_new_items(self, items: list[Item]):
        if self._client is None:
            logger.warning("NTFY_TOPIC_ID is not configured; skipping notifications")
            return

        if len(items) < 3:
            for item in items:
                self.send_individual_notification(item)
        else:
            self.send_grouped_notification(items)

    def send_individual_notification(self, item: Item):
        title = f"New item from {item.seller_name}"

        price = item.current_bid_price if item.current_bid_price else item.price
        currency = (
            item.current_bid_price_currency
            if item.current_bid_price_currency
            else item.price_currency
        )

        message = f"{item.title}\nCurrent Price: {price} {currency}"

        tags = ["rotating_light"]
        actions = [ViewAction("View on ebay", str(item.web_url))]

        if WEBSERVICE_URL is not None:
            actions.append(
                ViewAction(
                    f"Items by {item.seller_name}",
                    urljoin(
                        WEBSERVICE_URL,
                        SELLER_URI_TEMPLATE.format(seller_name=item.seller_name),
                    ),
                )
            )

        try:
            if self._client is None:
                return
            self._client.send(message=message, title=title, tags=tags, actions=actions)
        except MessageSendError as e:
            logger.error(
                "Failed to send notification. title=%s content=%s",
                title,
                message,
                exc_info=e,
            )

    def send_grouped_notification(self, items: list[Item]):
        counts_by_seller = Counter([str(item.seller_name) for item in items])
        title = f"{len(items)} new items published"
        message = "\n".join(
            [
                f"{count} items from: {username}"
                for (username, count) in counts_by_seller.items()
            ]
        )

        tags = ["rotating_light"]
        actions = []

        if WEBSERVICE_URL is not None:
            actions.append(ViewAction("View all items", WEBSERVICE_URL))

        try:
            if self._client is None:
                return
            self._client.send(message=message, title=title, tags=tags, actions=actions)
        except MessageSendError as e:
            logger.error(
                "Failed to send grouped notification. title=%s content=%s",
                title,
                message,
                exc_info=e,
            )
