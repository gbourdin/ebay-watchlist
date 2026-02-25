import pytest

from ebay_watchlist.settings import Settings, load_settings


def _clear_settings_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in (
        "DATABASE_URL",
        "EBAY_CLIENT_ID",
        "EBAY_CLIENT_SECRET",
        "EBAY_MARKETPLACE_ID",
        "ENABLE_NOTIFICATIONS",
        "NTFY_TOPIC_ID",
        "WEBSERVICE_URL",
    ):
        monkeypatch.delenv(key, raising=False)


def test_load_settings_uses_defaults_when_env_is_missing(monkeypatch: pytest.MonkeyPatch):
    _clear_settings_env(monkeypatch)

    settings = load_settings()

    assert settings.database_url == ":memory:"
    assert settings.ebay_client_id is None
    assert settings.ebay_client_secret is None
    assert settings.ebay_marketplace_id == "EBAY_GB"
    assert settings.enable_notifications is False
    assert settings.ntfy_topic_id is None
    assert settings.webservice_url is None


def test_load_settings_reads_and_normalizes_env(monkeypatch: pytest.MonkeyPatch):
    _clear_settings_env(monkeypatch)
    monkeypatch.setenv("DATABASE_URL", "  /tmp/watchlist.sqlite3  ")
    monkeypatch.setenv("EBAY_CLIENT_ID", " client-id ")
    monkeypatch.setenv("EBAY_CLIENT_SECRET", " client-secret ")
    monkeypatch.setenv("EBAY_MARKETPLACE_ID", " EBAY_US ")
    monkeypatch.setenv("ENABLE_NOTIFICATIONS", "TrUe")
    monkeypatch.setenv("NTFY_TOPIC_ID", " my-topic ")
    monkeypatch.setenv("WEBSERVICE_URL", " https://watch.local ")

    settings = load_settings()

    assert settings.database_url == "/tmp/watchlist.sqlite3"
    assert settings.ebay_client_id == "client-id"
    assert settings.ebay_client_secret == "client-secret"
    assert settings.ebay_marketplace_id == "EBAY_US"
    assert settings.enable_notifications is True
    assert settings.ntfy_topic_id == "my-topic"
    assert settings.webservice_url == "https://watch.local"


def test_load_settings_rejects_invalid_enable_notifications_value(
    monkeypatch: pytest.MonkeyPatch,
):
    _clear_settings_env(monkeypatch)
    monkeypatch.setenv("ENABLE_NOTIFICATIONS", "sometimes")

    with pytest.raises(ValueError, match="ENABLE_NOTIFICATIONS"):
        load_settings()


def test_settings_require_ebay_credentials_raises_when_missing():
    settings = Settings(
        database_url=":memory:",
        ebay_client_id=None,
        ebay_client_secret=None,
        ebay_marketplace_id="EBAY_GB",
        enable_notifications=False,
        ntfy_topic_id=None,
        webservice_url=None,
    )

    with pytest.raises(ValueError, match="EBAY_CLIENT_ID and EBAY_CLIENT_SECRET"):
        settings.require_ebay_credentials()
