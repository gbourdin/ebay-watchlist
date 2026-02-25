import os
from dataclasses import dataclass
from collections.abc import Mapping

from dotenv import load_dotenv

load_dotenv()

_TRUTHY = {"1", "true", "t", "yes", "y", "on"}
_FALSY = {"0", "false", "f", "no", "n", "off", ""}


def _normalize_optional(value: str | None) -> str | None:
    if value is None:
        return None

    cleaned = value.strip()
    if not cleaned:
        return None

    return cleaned


def _parse_bool_env(
    env_name: str,
    raw_value: str | None,
    default: bool,
) -> bool:
    normalized = _normalize_optional(raw_value)
    if normalized is None:
        return default

    lowered = normalized.lower()
    if lowered in _TRUTHY:
        return True
    if lowered in _FALSY:
        return False

    raise ValueError(
        f"{env_name} must be a boolean value "
        f"(accepted: {sorted(_TRUTHY | _FALSY)}); got {normalized!r}"
    )


@dataclass(frozen=True)
class Settings:
    database_url: str
    ebay_client_id: str | None
    ebay_client_secret: str | None
    ebay_marketplace_id: str
    enable_notifications: bool
    ntfy_topic_id: str | None
    webservice_url: str | None

    def require_ebay_credentials(self) -> tuple[str, str]:
        if not self.ebay_client_id or not self.ebay_client_secret:
            raise ValueError("EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set")

        return self.ebay_client_id, self.ebay_client_secret


def load_settings(env: Mapping[str, str] | None = None) -> Settings:
    source = env if env is not None else os.environ

    database_url = _normalize_optional(source.get("DATABASE_URL")) or ":memory:"
    marketplace_id = _normalize_optional(source.get("EBAY_MARKETPLACE_ID")) or "EBAY_GB"

    return Settings(
        database_url=database_url,
        ebay_client_id=_normalize_optional(source.get("EBAY_CLIENT_ID")),
        ebay_client_secret=_normalize_optional(source.get("EBAY_CLIENT_SECRET")),
        ebay_marketplace_id=marketplace_id,
        enable_notifications=_parse_bool_env(
            env_name="ENABLE_NOTIFICATIONS",
            raw_value=source.get("ENABLE_NOTIFICATIONS"),
            default=False,
        ),
        ntfy_topic_id=_normalize_optional(source.get("NTFY_TOPIC_ID")),
        webservice_url=_normalize_optional(source.get("WEBSERVICE_URL")),
    )
