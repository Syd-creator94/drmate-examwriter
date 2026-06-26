from __future__ import annotations

from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from dr_mate_core.models import MedicalRecord


class HtmlRenderer:
    def __init__(self, template_dir: str | Path | None = None) -> None:
        root = Path(template_dir) if template_dir else Path(__file__).resolve().parents[2] / "templates"
        self.environment = Environment(
            loader=FileSystemLoader(root),
            autoescape=select_autoescape(["html", "xml", "j2"]),
            trim_blocks=True,
            lstrip_blocks=True,
        )

    def render(self, record: MedicalRecord, template_name: str = "medical_record.html.j2") -> str:
        template = self.environment.get_template(template_name)
        return template.render(record=record)

    def render_to_file(self, record: MedicalRecord, output_path: str | Path) -> Path:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(self.render(record), encoding="utf-8")
        return path
