from pathlib import Path


def test_ci_workflow_auto_tags_main_pushes_after_checks():
    text = Path(".github/workflows/ci.yml").read_text()
    assert "auto_tag:" in text
    assert "needs: checks" in text
    assert "github.ref == 'refs/heads/main'" in text
    assert "git tag --points-at HEAD" in text
    assert "git push origin" in text
