import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

import pytest


def _find_free_port() -> int:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.bind(("127.0.0.1", 0))
            return int(sock.getsockname()[1])
    except PermissionError:
        pytest.skip("Socket bind is not permitted in this environment")


def _wait_for_http_ok(url: str, timeout_seconds: float = 15.0):
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with urlopen(url, timeout=1.0) as response:
                if response.status == 200:
                    return
        except URLError:
            pass
        time.sleep(0.2)

    raise AssertionError(f"Timed out waiting for {url}")


def test_compose_has_api_and_daemon_services():
    text = Path("docker-compose.yml").read_text()
    assert "api:" in text
    assert "daemon:" in text
    assert "build:" in text
    assert "run-gunicorn" in text
    assert "run-flask" not in text


def test_run_gunicorn_serves_status_and_items(tmp_path):
    port = _find_free_port()
    env = os.environ.copy()
    env["DATABASE_URL"] = str(tmp_path / "integration-gunicorn.sqlite3")
    command = [
        sys.executable,
        "-m",
        "ebay_watchlist.cli.main",
        "run-gunicorn",
        "--host",
        "127.0.0.1",
        "--port",
        str(port),
        "--workers",
        "1",
    ]

    process = subprocess.Popen(
        command,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        _wait_for_http_ok(f"http://127.0.0.1:{port}/status")

        with urlopen(f"http://127.0.0.1:{port}/status", timeout=2.0) as response:
            payload = json.loads(response.read().decode("utf-8"))
        assert payload == {"status": "OK"}

        with urlopen(f"http://127.0.0.1:{port}/api/v1/items", timeout=2.0) as response:
            payload = json.loads(response.read().decode("utf-8"))
        assert payload["items"] == []
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
