FROM python:3.14-slim

# Add curl for healt-checks
RUN apt update && apt install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

ADD . /app
WORKDIR /app

RUN uv sync --locked --no-dev

ENV PATH="/app/.venv/bin:$PATH"
