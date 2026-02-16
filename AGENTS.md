# Repository Guidelines

## Project Structure & Module Organization
- `src/ebay_watchlist/` contains core backend code.
- `src/ebay_watchlist/cli/` hosts Typer commands for fetch, loop, cleanup, and web startup.
- `src/ebay_watchlist/db/` contains Peewee models and repository/query logic.
- `src/ebay_watchlist/web/` is the Flask app (legacy templates + API endpoints).
- `frontend/` is the modern React SPA (`src/app`, `src/components`, `src/features/items`).
- `tests/` contains backend/unit/integration checks; frontend tests live under `frontend/src/**` and `frontend/tests/`.

## Build, Test, and Development Commands
- `uv sync --dev`: install Python deps.
- `npm --prefix frontend install`: install SPA deps.
- `uv run ebay-watchlist config init-database`: create DB tables.
- `uv run ebay-watchlist fetch-updates --limit 100`: fetch latest listings.
- `uv run ebay-watchlist run-flask --host 127.0.0.1 --port 5001 --debug`: run API server.
- `npm --prefix frontend run dev`: run SPA on `:5173`.
- `docker compose up api web`: run split runtime with shared Docker image.

## Coding Style & Naming Conventions
- Python: 4-space indentation, type hints on new code, `snake_case` for funcs/modules, `PascalCase` for classes.
- TypeScript/React: strict typing, functional components, `PascalCase` components, `camelCase` functions/vars.
- Keep data access in repositories; keep Flask views/API handlers thin.
- Prefer explicit query-state models over ad-hoc dicts for frontend filters.

## Testing Guidelines
- Backend: `pytest` with files named `test_<feature>.py`.
- Frontend unit/component: `npm --prefix frontend run test` (Vitest + RTL).
- Frontend e2e smoke: `npm --prefix frontend run test:e2e` (Playwright).
- Full backend checks before PR: `make ci`.
- Add/update tests for filtering, sorting, pagination, and state toggles (`favorite`, `hidden`).
- Add/update tests for note editing flows (`/api/v1/items/<id>/note`, modal save/cancel UX).
- Keep relative time rendering (`Posted`, `Ends`) in frontend utilities and verify exact timestamp hover tooltips.

### Test Quality Learnings
- Assert observable behavior, not internals. Prefer user-visible/API-visible outcomes over “function X was called”.
- Do not test implementation details like “uses `humanize.naturaltime`” unless the dependency is an external boundary.
- Mock/stub only true boundaries or nondeterminism: network calls, external APIs, env vars, time/sleep, process exec, browser globals.
- Keep time-based tests deterministic: use `freezegun` in backend tests and fixed `now` inputs in frontend date utilities.
- Prefer integration-style tests across command/API/UI flows; use unit-level mocking only when unavoidable.
- If a mock is needed, still assert the final behavior/output (response body, rendered state, persisted data), not just call counts.

## Commit & Pull Request Guidelines
- Use focused commits with conventional prefixes (`feat:`, `fix:`, `chore:`) or scoped variants (`feat(api): ...`).
- Keep one logical change per commit and include tests with behavior changes.
- PRs should include: summary, user-visible behavior changes, commands run, and screenshots for UI updates.

## Security & Configuration Tips
- Copy `.env.example` to `.env`; never commit secrets.
- Keep `DATABASE_URL` writable for local SQLite usage.
- Treat local-only environment tweaks carefully (especially compose/env paths).
