from __future__ import annotations

from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

from dr_mate_core.models import MedicalRecord


def render_record_pdf_reportlab(record: MedicalRecord, pdf_path: str | Path) -> Path:
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except ModuleNotFoundError as exc:
        raise RuntimeError("ReportLab fallback is not installed. Run: python -m pip install -e .[reportlab-pdf]") from exc

    regular_font, bold_font = _register_fonts(pdfmetrics, TTFont)
    output_file = Path(pdf_path).resolve()
    output_file.parent.mkdir(parents=True, exist_ok=True)

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="DrTitle",
            parent=styles["Title"],
            fontName=bold_font,
            fontSize=20,
            leading=22,
            textColor=colors.HexColor("#172126"),
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="DrSubtitle",
            parent=styles["Normal"],
            fontName=regular_font,
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#66737a"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="DrHeading",
            parent=styles["Heading2"],
            fontName=bold_font,
            fontSize=9.5,
            leading=12,
            textColor=colors.HexColor("#0f766e"),
            spaceBefore=8,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="DrBody",
            parent=styles["Normal"],
            fontName=regular_font,
            fontSize=8.8,
            leading=11.5,
            textColor=colors.HexColor("#172126"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="DrSmall",
            parent=styles["Normal"],
            fontName=regular_font,
            fontSize=7.8,
            leading=9.8,
            textColor=colors.HexColor("#66737a"),
        )
    )

    doc = SimpleDocTemplate(
        str(output_file),
        pagesize=A4,
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=12 * mm,
        bottomMargin=14 * mm,
        title="Заключение офтальмолога",
    )

    story = []
    width = doc.width

    title_block = [
        Paragraph("Заключение офтальмолога", styles["DrTitle"]),
        Paragraph("Структурированная медицинская карта на основе данных ExamWriter", styles["DrSubtitle"]),
    ]
    meta = _kv_table(
        [
            ("Дата", record.patient.exam_date or "не указана"),
            ("Источник", record.source_system),
        ],
        styles,
        colors,
        regular_font,
        bold_font,
        [22 * mm, 32 * mm],
    )
    story.append(Table([[title_block, meta]], colWidths=[width - 58 * mm, 58 * mm]))
    story.append(Spacer(1, 4 * mm))

    patient_rows = [
        ("Пациент", record.patient.full_name or "не указан"),
        ("Дата рождения", record.patient.birth_date or "не указана"),
    ]
    if record.reason_for_visit:
        patient_rows.append(("Повод", record.reason_for_visit))
    if record.dominant_eye_display:
        patient_rows.append(("Статус", record.dominant_eye_display))
    story.append(
        _boxed_table(
            _two_column_kv(patient_rows, styles),
            colors,
            col_widths=[width / 2, width / 2],
            background="#f4f7f6",
        )
    )

    _add_list_section(story, "Жалобы и анамнез", [*record.complaints, *record.history, *[item.display for item in record.family_history]], styles)
    status_items = record.current_status or ([record.dominant_eye_display] if record.dominant_eye_display else [])
    _add_list_section(story, "Текущий статус", [item for item in status_items if item], styles)

    if record.visual_acuity:
        rows = [["Глаз", "Без коррекции", "С коррекцией", "Вблизи", "Примечание"]]
        rows.extend(
            [
                item.eye,
                item.distance_uncorrected or "-",
                item.distance_corrected or "-",
                item.near or "-",
                item.distance_note or item.notes or "-",
            ]
            for item in record.visual_acuity
        )
        _add_table_section(story, "Зрительные функции", rows, styles, colors, bold_font)

    if record.refractions:
        rows = [["Глаз", "Тип", "Коррекция", "Острота"]]
        rows.extend([item.eye, item.kind, item.formatted, item.visual_acuity or "-"] for item in record.refractions)
        _add_table_section(story, "Рефракция и коррекция", rows, styles, colors, bold_font)

    if record.keratometry:
        rows = [["Глаз", "Показатели"]]
        rows.extend([item.eye, item.formatted] for item in record.keratometry)
        _add_table_section(story, "Кератометрия", rows, styles, colors, bold_font)

    for section in record.clinical_sections:
        _add_list_section(story, section.title, section.items, styles)

    if record.diagnoses:
        _add_list_section(story, "Диагноз", [item.display for item in record.diagnoses], styles)

    _add_list_section(story, "План", record.plan, styles)
    _add_list_section(
        story,
        "Назначения и процедуры",
        [item.title for item in record.prescriptions] + [item.title for item in record.procedures],
        styles,
    )

    story.append(Spacer(1, 8 * mm))
    story.append(
        Table(
            [[Paragraph("Документ сформирован из структурированной модели.", styles["DrSmall"]), Paragraph(record.signature or "Врач-офтальмолог", styles["DrBody"])]],
            colWidths=[width - 58 * mm, 58 * mm],
            style=TableStyle(
                [
                    ("LINEABOVE", (1, 0), (1, 0), 0.8, colors.HexColor("#172126")),
                    ("ALIGN", (1, 0), (1, 0), "CENTER"),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                ]
            ),
        )
    )

    doc.build(story)
    return output_file


def _register_fonts(pdfmetrics, TTFont) -> tuple[str, str]:
    candidates = [
        (
            Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
            Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
        ),
        (
            Path("/Library/Fonts/Arial Unicode.ttf"),
            Path("/Library/Fonts/Arial Unicode.ttf"),
        ),
    ]
    for regular, bold in candidates:
        if regular.exists():
            pdfmetrics.registerFont(TTFont("DrMateRegular", str(regular)))
            if bold.exists():
                pdfmetrics.registerFont(TTFont("DrMateBold", str(bold)))
            else:
                pdfmetrics.registerFont(TTFont("DrMateBold", str(regular)))
            return "DrMateRegular", "DrMateBold"
    return "Helvetica", "Helvetica-Bold"


def _p(value: str, styles, style_name: str = "DrBody"):
    from reportlab.platypus import Paragraph

    return Paragraph(escape(str(value)), styles[style_name])


def _kv_table(rows, styles, colors, regular_font, bold_font, col_widths):
    from reportlab.platypus import Table, TableStyle

    table = Table([[_p(label, styles, "DrSmall"), _p(value, styles)] for label, value in rows], colWidths=col_widths)
    table.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                ("LINEBEFORE", (0, 0), (0, -1), 1.5, colors.HexColor("#0f766e")),
                ("LEFTPADDING", (0, 0), (0, -1), 5),
            ]
        )
    )
    return table


def _two_column_kv(rows, styles):
    cells: list[list[Any]] = []
    row: list[Any] = []
    for label, value in rows:
        row.append([_p(label, styles, "DrSmall"), _p(value, styles)])
        if len(row) == 2:
            cells.append(row)
            row = []
    if row:
        row.append("")
        cells.append(row)
    return cells


def _boxed_table(data, colors, col_widths, background: str):
    from reportlab.platypus import Table, TableStyle

    table = Table(data, colWidths=col_widths)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(background)),
                ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#d8e0e3")),
                ("INNERGRID", (0, 0), (-1, -1), 0.2, colors.HexColor("#e5ecef")),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def _add_list_section(story, title: str, items: list[str], styles) -> None:
    from reportlab.platypus import Paragraph

    story.append(Paragraph(escape(title.upper()), styles["DrHeading"]))
    if not items:
        story.append(Paragraph("Данные не указаны", styles["DrSmall"]))
        return
    for item in items:
        story.append(Paragraph(f"- {escape(item)}", styles["DrBody"]))


def _add_table_section(story, title: str, rows, styles, colors, bold_font: str) -> None:
    from reportlab.platypus import Paragraph, Table, TableStyle

    story.append(Paragraph(escape(title.upper()), styles["DrHeading"]))
    table_rows = [[_p(cell, styles, "DrSmall" if index == 0 else "DrBody") for cell in row] for index, row in enumerate(rows)]
    table = Table(table_rows, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f4f7f6")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#66737a")),
                ("FONTNAME", (0, 0), (-1, 0), bold_font),
                ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#d8e0e3")),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(table)
