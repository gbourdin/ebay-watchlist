from typer.testing import CliRunner

from ebay_watchlist.cli.main import app


runner = CliRunner()


def test_cli_help_displays_commands():
    result = runner.invoke(app, ["--help"])

    assert result.exit_code == 0
    assert "fetch-updates" in result.stdout


def test_cli_config_help_displays_commands():
    result = runner.invoke(app, ["config", "--help"])

    assert result.exit_code == 0
    assert "init-database" in result.stdout
