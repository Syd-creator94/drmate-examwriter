from pathlib import Path

from dr_mate_adapters.examwriter import ExamWriterAdapter
from dr_mate_rendering import HtmlRenderer


ROOT = Path(__file__).resolve().parents[1]


def test_html_contains_russian_sections_and_normalized_values(tmp_path: Path) -> None:
    record = ExamWriterAdapter().parse_file(ROOT / "examples" / "examwriter_sample.rtf")
    html_path = tmp_path / "record.html"

    HtmlRenderer(ROOT / "templates").render_to_file(record, html_path)
    html = html_path.read_text(encoding="utf-8")

    assert "Заключение офтальмолога" in html
    assert "Иван Петров" in html
    assert "-4.25 -0.50 x 050" in html
    assert "43.25 @ 085 / 44.00 @ 175" in html
    assert "OU: миопия, сложный миопический астигматизм" in html
