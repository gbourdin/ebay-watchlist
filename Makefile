lint:
	UV_CACHE_DIR=/tmp/uv-cache uv run ruff check src

typecheck:
	UV_CACHE_DIR=/tmp/uv-cache uv run ty check src

test:
	UV_CACHE_DIR=/tmp/uv-cache uv run pytest -q

ci:
	UV_CACHE_DIR=/tmp/uv-cache uv run ruff check src && UV_CACHE_DIR=/tmp/uv-cache uv run ty check src && UV_CACHE_DIR=/tmp/uv-cache uv run pytest -q
