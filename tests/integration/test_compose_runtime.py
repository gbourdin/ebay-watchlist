from pathlib import Path


def test_compose_has_api_and_web_services():
    text = Path("docker-compose.yml").read_text()
    assert "api:" in text
    assert "web:" in text
    assert "build:" in text
