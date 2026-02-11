from pathlib import Path


def test_readme_mentions_new_frontend_commands():
    readme = Path("README.md").read_text()
    assert "npm --prefix frontend run dev" in readme
    assert "docker compose up api web" in readme
