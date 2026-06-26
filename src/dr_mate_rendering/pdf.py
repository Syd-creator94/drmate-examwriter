from __future__ import annotations

from pathlib import Path


def render_pdf_from_html(html_path: str | Path, pdf_path: str | Path, engine: str = "auto") -> Path:
    if engine not in {"auto", "playwright", "weasyprint"}:
        raise ValueError(f"Unknown PDF engine: {engine}")

    if engine in {"auto", "playwright"}:
        try:
            return _render_with_playwright(html_path, pdf_path)
        except Exception as exc:
            if engine == "playwright":
                raise
            playwright_error = exc
    else:
        playwright_error = None

    try:
        return _render_with_weasyprint(html_path, pdf_path)
    except Exception as exc:
        raise RuntimeError(
            "PDF generation failed. Playwright is the primary engine; install Chromium with "
            "`python -m playwright install chromium`. For constrained environments install "
            "`python -m pip install -e .[fallback-pdf]` and use `--pdf-engine weasyprint`."
        ) from (playwright_error or exc)


def _render_with_playwright(html_path: str | Path, pdf_path: str | Path) -> Path:
    try:
        from playwright.sync_api import sync_playwright
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Playwright is not installed. Run: python -m pip install -e . && python -m playwright install chromium"
        ) from exc

    html_file = Path(html_path).resolve()
    output_file = Path(pdf_path).resolve()
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page()
        page.goto(html_file.as_uri(), wait_until="networkidle")
        page.emulate_media(media="print")
        page.pdf(
            path=str(output_file),
            format="A4",
            print_background=True,
            prefer_css_page_size=True,
        )
        browser.close()

    return output_file


def _render_with_weasyprint(html_path: str | Path, pdf_path: str | Path) -> Path:
    try:
        from weasyprint import HTML
    except ModuleNotFoundError as exc:
        raise RuntimeError("WeasyPrint fallback is not installed. Run: python -m pip install -e .[fallback-pdf]") from exc

    html_file = Path(html_path).resolve()
    output_file = Path(pdf_path).resolve()
    output_file.parent.mkdir(parents=True, exist_ok=True)
    HTML(filename=str(html_file)).write_pdf(str(output_file))
    return output_file
