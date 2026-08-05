from __future__ import annotations

import re
from pathlib import Path

from dr_mate_adapters.examwriter.rtf import read_examwriter_source, rtf_to_text
from dr_mate_core.models import (
    ClinicalSection,
    Diagnosis,
    Eye,
    FamilyHistoryItem,
    Keratometry,
    MedicalRecord,
    Patient,
    Prescription,
    Procedure,
    Refraction,
    VisualAcuity,
)
from dr_mate_core.normalizers import (
    decimal_or_none,
    diagnosis_display,
    format_keratometry,
    format_refraction,
    group_diagnoses_by_eye,
    normalize_date,
    normalize_dominant_eye,
    normalize_eye_code,
    normalize_family_history,
    normalize_reading_distance,
    normalize_visual_acuity_text,
    snellen_to_decimal,
    translate_diagnosis_term,
    translate_phrase,
)

_HEADING_ALIASES = {
    "patient": "patient",
    "name": "patient",
    "dob": "birth_date",
    "date of birth": "birth_date",
    "birth date": "birth_date",
    "dos": "exam_date",
    "date of service": "exam_date",
    "exam date": "exam_date",
    "reason for visit": "reason",
    "chief complaint": "complaints",
    "complaints": "complaints",
    "history": "history",
    "hpi": "history",
    "family history": "family_history",
    "current status": "current_status",
    "present glasses": "present_glasses",
    "current glasses": "present_glasses",
    "visual acuity": "visual_acuity",
    "va": "visual_acuity",
    "manifest refraction": "refraction",
    "refraction": "refraction",
    "keratometry": "keratometry",
    "k readings": "keratometry",
    "observations": "observations",
    "slit lamp": "exam",
    "fundus": "exam",
    "diagnosis": "diagnoses",
    "diagnoses": "diagnoses",
    "assessment": "diagnoses",
    "plan": "plan",
    "rx": "prescriptions",
    "medications": "prescriptions",
    "prescriptions": "prescriptions",
    "procedures": "procedures",
    "procedure": "procedures",
    "signature": "signature",
}

_SECTION_TITLES = {
    "exam": "Осмотр",
    "observations": "(заметки)",
}


class ExamWriterAdapter:
    def parse_file(self, path: str | Path) -> MedicalRecord:
        file_path = Path(path)
        text = read_examwriter_source(file_path)
        return parse_examwriter_text(text, source_file=str(file_path))


def parse_examwriter_text(text: str, source_file: str | None = None) -> MedicalRecord:
    if text.lstrip().startswith(r"{\rtf"):
        text = rtf_to_text(text)

    lines = _clean_lines(text)
    immediate: dict[str, str] = {}
    sections: dict[str, list[str]] = {}
    current_section: str | None = None

    for line in lines:
        dominant_eye, dominant_display = normalize_dominant_eye(line)
        if dominant_eye:
            immediate["dominant_eye"] = dominant_eye
            immediate["dominant_eye_display"] = dominant_display or ""
            continue

        heading, value = _split_heading(line)
        if heading:
            canonical = _HEADING_ALIASES.get(heading)
            if canonical in {"patient", "birth_date", "exam_date", "signature", "reason"}:
                immediate[canonical] = value
                current_section = None
            elif canonical:
                current_section = canonical
                if value:
                    sections.setdefault(canonical, []).append(value)
            else:
                current_section = None
            continue

        if current_section:
            sections.setdefault(current_section, []).append(line)

    patient = Patient(
        full_name=immediate.get("patient") or None,
        birth_date=normalize_date(immediate.get("birth_date")),
        exam_date=normalize_date(immediate.get("exam_date")),
    )

    family_history = [_family_history_item(line) for line in sections.get("family_history", [])]
    visual_acuity = _parse_visual_acuity(sections.get("visual_acuity", []))
    refractions = [
        *_parse_refractions(sections.get("present_glasses", []), "Текущие очки"),
        *_parse_refractions(sections.get("refraction", []), "Рефракция"),
    ]
    keratometry = _parse_keratometry(sections.get("keratometry", []))
    diagnoses = _parse_diagnoses(sections.get("diagnoses", []))

    clinical_sections = []
    if sections.get("exam"):
        clinical_sections.append(_clinical_section("exam", sections["exam"]))
    if sections.get("observations"):
        clinical_sections.append(_clinical_section("observations", sections["observations"]))

    return MedicalRecord(
        source_file=source_file,
        patient=patient,
        reason_for_visit=_optional_translate(immediate.get("reason")),
        complaints=_translate_list(sections.get("complaints", [])),
        history=_translate_list(sections.get("history", [])),
        family_history=family_history,
        current_status=_translate_list(sections.get("current_status", [])),
        dominant_eye=normalize_eye_code(immediate.get("dominant_eye")),
        dominant_eye_display=immediate.get("dominant_eye_display") or None,
        visual_acuity=visual_acuity,
        refractions=refractions,
        keratometry=keratometry,
        clinical_sections=clinical_sections,
        diagnoses=diagnoses,
        plan=_translate_list(sections.get("plan", [])),
        prescriptions=_parse_prescriptions(sections.get("prescriptions", [])),
        procedures=_parse_procedures(sections.get("procedures", [])),
        signature=immediate.get("signature") or None,
        raw_text_preview="\n".join(lines[:20]) or None,
    )


def _clean_lines(text: str) -> list[str]:
    lines = []
    for raw_line in text.replace("\r", "\n").split("\n"):
        line = re.sub(r"\s+", " ", raw_line).strip()
        if line:
            lines.append(line)
    return lines


def _split_heading(line: str) -> tuple[str | None, str]:
    match = re.match(r"^([A-Za-zА-Яа-я /]+?)\s*:\s*(.*)$", line)
    if not match:
        upper = line.strip().lower()
        canonical = _HEADING_ALIASES.get(upper)
        return (upper, "") if canonical else (None, line)
    heading = " ".join(match.group(1).lower().split())
    value = match.group(2).strip()
    return heading, value


def _family_history_item(line: str) -> FamilyHistoryItem:
    condition, relation, display = normalize_family_history(line)
    return FamilyHistoryItem(condition=condition, relation=relation, display=display)


def _parse_visual_acuity(lines: list[str]) -> list[VisualAcuity]:
    result: list[VisualAcuity] = []
    for line in lines:
        eye_match = re.match(r"^(RT|LT|OD|OS|OU|BI|Bilateral|Right|Left)\b", line, flags=re.I)
        if not eye_match:
            continue
        eye = normalize_eye_code(eye_match.group(1))
        if eye is None:
            continue
        uncorrected = _value_after_label(line, "sc")
        corrected = _value_after_label(line, "cc")
        near_match = re.search(r"\bNear\s+(20/\d{2,3}|[\d.]+)(?:\s*@\s*([^,;]+))?", line, flags=re.I)
        near = snellen_to_decimal(near_match.group(1)) if near_match else None
        distance_note = normalize_reading_distance(near_match.group(2)) if near_match and near_match.group(2) else None
        parsed_any_value = bool(uncorrected or corrected or near)
        result.append(
            VisualAcuity(
                eye=eye,
                distance_uncorrected=snellen_to_decimal(uncorrected),
                distance_corrected=snellen_to_decimal(corrected),
                near=near,
                distance_note=distance_note,
                notes=None if parsed_any_value else normalize_visual_acuity_text(line),
            )
        )
    return result


def _value_after_label(line: str, label: str) -> str | None:
    match = re.search(rf"\b{re.escape(label)}\s+(20/\d{{2,3}}|[\d.]+)", line, flags=re.I)
    return match.group(1) if match else None


def _parse_refractions(lines: list[str], kind: str) -> list[Refraction]:
    result: list[Refraction] = []
    pattern = re.compile(
        r"^(?P<eye>RT|LT|OD|OS|OU|BI|Bilateral|Right|Left)\s+"
        r"(?P<sphere>[+-]?\d+(?:\.\d+)?)\s+"
        r"(?P<cylinder>[+-]\d+(?:\.\d+)?)\s*"
        r"(?:x|X|axis)?\s*(?P<axis>\d{1,3})"
        r"(?:.*?\bVA\s*(?P<va>20/\d{2,3}|[\d.]+))?",
        flags=re.I,
    )
    for line in lines:
        match = pattern.search(line)
        if not match:
            continue
        eye = normalize_eye_code(match.group("eye"))
        sphere = decimal_or_none(match.group("sphere"))
        cylinder = decimal_or_none(match.group("cylinder"))
        axis = int(match.group("axis"))
        if eye is None or sphere is None:
            continue
        result.append(
            Refraction(
                eye=eye,
                kind=kind,
                sphere=sphere,
                cylinder=cylinder,
                axis=axis,
                visual_acuity=snellen_to_decimal(match.group("va")),
                formatted=format_refraction(sphere, cylinder, axis),
            )
        )
    return result


def _parse_keratometry(lines: list[str]) -> list[Keratometry]:
    result: list[Keratometry] = []
    pattern = re.compile(
        r"^(?P<eye>RT|LT|OD|OS|OU|BI|Bilateral|Right|Left)\s+"
        r"(?P<k1>\d{2}\.\d{1,2})\s*@\s*(?P<a1>\d{1,3})\s*/\s*"
        r"(?P<k2>\d{2}\.\d{1,2})\s*@\s*(?P<a2>\d{1,3})",
        flags=re.I,
    )
    for line in lines:
        match = pattern.search(line)
        if not match:
            continue
        eye = normalize_eye_code(match.group("eye"))
        k1 = decimal_or_none(match.group("k1"))
        k2 = decimal_or_none(match.group("k2"))
        a1 = int(match.group("a1"))
        a2 = int(match.group("a2"))
        if eye is None or k1 is None or k2 is None:
            continue
        result.append(
            Keratometry(
                eye=eye,
                k1_power=k1,
                k1_axis=a1,
                k2_power=k2,
                k2_axis=a2,
                formatted=f"{format_keratometry(k1, a1)} / {format_keratometry(k2, a2)}",
            )
        )
    return result


def _parse_diagnoses(lines: list[str]) -> list[Diagnosis]:
    by_eye: dict[Eye, list[str]] = {}
    for line in lines:
        match = re.match(r"^(RT|LT|OD|OS|OU|BI|Bilateral|Right|Left)\b[:\s-]*(.+)$", line, flags=re.I)
        if not match:
            continue
        eye = normalize_eye_code(match.group(1))
        if eye is None:
            continue
        terms = [translate_diagnosis_term(part) for part in re.split(r"[;,]", match.group(2)) if part.strip()]
        by_eye[eye] = _unique(terms)

    return [
        Diagnosis(eye=eye, terms=terms, display=diagnosis_display(eye, terms))
        for eye, terms in group_diagnoses_by_eye(by_eye)
    ]


def _parse_prescriptions(lines: list[str]) -> list[Prescription]:
    return [Prescription(title=translate_phrase(line)) for line in lines]


def _parse_procedures(lines: list[str]) -> list[Procedure]:
    return [Procedure(title=translate_phrase(line)) for line in lines]


def _clinical_section(kind: str, lines: list[str]) -> ClinicalSection:
    return ClinicalSection(title=_SECTION_TITLES[kind], items=_translate_list(lines))


def _translate_list(lines: list[str]) -> list[str]:
    return [translate_phrase(normalize_reading_distance(line)) for line in lines if line.strip()]


def _optional_translate(value: str | None) -> str | None:
    return translate_phrase(value) if value else None


def _unique(values: list[str]) -> list[str]:
    result: list[str] = []
    for value in values:
        if value and value not in result:
            result.append(value)
    return result
