from __future__ import annotations

import argparse
import json
from pathlib import Path

from dr_mate_adapters.examwriter import ExamWriterAdapter
from dr_mate_rendering import HtmlRenderer, render_pdf_from_html, render_record_pdf_reportlab


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate a Russian ophthalmology record from ExamWriter RTF/TXT.")
    parser.add_argument("input", help="Path to ExamWriter .rtf or text export.")
    parser.add_argument("--outdir", default="outputs", help="Directory for JSON, HTML and PDF outputs.")
    parser.add_argument("--stem", default=None, help="Output filename stem. Defaults to input filename.")
    parser.add_argument("--no-pdf", action="store_true", help="Generate JSON and HTML only.")
    parser.add_argument(
        "--pdf-engine",
        choices=["auto", "playwright", "weasyprint", "reportlab"],
        default="auto",
        help="PDF engine. Playwright is primary; WeasyPrint and ReportLab are optional fallbacks.",
    )
    args = parser.parse_args(argv)

    input_path = Path(args.input)
    output_dir = Path(args.outdir)
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = args.stem or input_path.stem

    record = ExamWriterAdapter().parse_file(input_path)
    renderer = HtmlRenderer()

    json_path = output_dir / f"{stem}.json"
    html_path = output_dir / f"{stem}.html"
    pdf_path = output_dir / f"{stem}.pdf"

    json_path.write_text(
        json.dumps(record.model_dump(mode="json"), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    renderer.render_to_file(record, html_path)

    if not args.no_pdf:
        if args.pdf_engine == "reportlab":
            render_record_pdf_reportlab(record, pdf_path)
        else:
            render_pdf_from_html(html_path, pdf_path, engine=args.pdf_engine)
        print(f"Generated: {json_path}, {html_path}, {pdf_path}")
    else:
        print(f"Generated: {json_path}, {html_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
