# Repository Guidelines

## Project Structure & Module Organization
- `src/ebay_watchlist/` is the main package.
- `cli/` contains Typer commands (`main.py`, `management.py`) used for fetch jobs, web startup, and configuration.
- `ebay/` holds eBay API integration and DTOs.
- `db/` defines Peewee models, repositories, and database configuration.
- `web/` contains the Flask app, routes, filters, and Jinja templates (`web/templates/items.html`).
- `notifications/` contains outbound notification logic.
- `data/` stores runtime artifacts and `notebooks/` contains experiments.

## Build, Test, and Development Commands
- `uv sync --dev`: install runtime and dev dependencies from `uv.lock`.
- `uv run ebay-watchlist config init-database`: create DB tables.
- `uv run ebay-watchlist config load-defaults`: seed default sellers/categories.
- `uv run ebay-watchlist fetch-updates --limit 100`: fetch and persist latest listings.
- `uv run ebay-watchlist cleanup-expired-items --retention-days 180`: delete items ended before retention window.
- `uv run ebay-watchlist run-loop --cleanup-retention-days 180 --cleanup-interval-minutes 1440`: daemon fetch + periodic retention cleanup.
- `uv run ebay-watchlist run-flask --host 127.0.0.1 --port 8000 --debug`: run the local web UI.
- `make lint`: run Ruff on `src/`.
- `make typecheck`: run `ty` on `src/`.
- `make test`: run the unit test suite (`pytest`).
- `make ci`: run lint + typecheck + tests together.

## Coding Style & Naming Conventions
- Target Python `>=3.14`, 4-space indentation, and PEP 8-compatible style.
- Use explicit type hints (for example, `int | None`, `list[str]`) for new code.
- Naming: modules/functions/variables in `snake_case`, classes in `PascalCase`.
- Keep persistence logic in repository classes under `src/ebay_watchlist/db/`; keep route and CLI handlers thin.
- For web UI changes, preserve core UX: large item thumbnails, name-based filters, and immediate filter application.

## Testing Guidelines
- Use `pytest`; tests live under `tests/` with `test_<module>.py` naming.
- Add or update tests for behavior changes (filters, sorting, pagination, repositories, CLI flows).
- Prefer focused test runs while developing (example: `uv run pytest tests/web/test_ui_filters.py -q`) and run `make ci` before opening a PR.
- CI in `.github/workflows/ci.yml` enforces Ruff, `ty`, and tests with coverage on pushes to `main` and PRs targeting `main`.
- Release and Docker publish automation lives in `.github/workflows/release.yml` (branch push for `latest`, tag push for versioned images + release notes).

## Commit & Pull Request Guidelines
- Follow the existing history style: short imperative subjects like `Add ...`, `Fix ...`, `Remove ...`.
- Keep commit subjects concise (preferably <= 72 chars) and focused on one concern.
- PRs should include: purpose, behavior changes, commands run, config/env updates, and screenshots for UI/template edits.
- If touching filters/pagination, describe query params and expected behavior explicitly.

## Security & Configuration Tips
- Copy `.env.example` to `.env` and never commit secrets (`EBAY_CLIENT_SECRET`, `NTFY_TOPIC_ID`).
- Keep `DATABASE_URL` pointing to a writable local SQLite file.
- Do not commit generated DB files or other local data artifacts.
- Treat `docker-compose.yml` edits as local-only development reference changes; do not stage or commit them.
