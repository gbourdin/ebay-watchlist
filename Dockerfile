FROM node:25-slim AS node_runtime

FROM python:3.14-slim

# Add runtime libs and curl for health checks.
RUN apt update && apt install -y curl libatomic1 && rm -rf /var/lib/apt/lists/*

# Copy Node runtime so the image can build the SPA during docker build.
COPY --from=node_runtime /usr/local/ /usr/local/

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

ADD . /app
WORKDIR /app

RUN uv sync --locked --no-dev
RUN if [ -f frontend/package.json ]; then npm --prefix frontend install && npm --prefix frontend run build; fi

ENV PATH="/app/.venv/bin:$PATH"
