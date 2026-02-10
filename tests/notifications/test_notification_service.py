from types import SimpleNamespace

from python_ntfy import MessageSendError

from ebay_watchlist.notifications.service import NotificationService


class FailingClient:
    def send(self, **kwargs):
        raise MessageSendError("boom")


def test_send_individual_notification_handles_send_error():
    service = NotificationService.__new__(NotificationService)
    service._client = FailingClient()

    item = SimpleNamespace(
        seller_name="alice",
        current_bid_price=None,
        current_bid_price_currency=None,
        price=12.34,
        price_currency="GBP",
        title="Vintage synth",
        web_url="https://example.com/item",
    )

    service.send_individual_notification(item)
