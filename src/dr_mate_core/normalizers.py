from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from dr_mate_core.models import Eye

EyeCode = Eye

_EYE_MAP: dict[str, Eye] = {
    "R": "OD",
    "RT": "OD",
    "RIGHT": "OD",
    "OD": "OD",
    "L": "OS",
    "LT": "OS",
    "LEFT": "OS",
    "OS": "OS",
    "B": "OU",
    "BI": "OU",
    "BILATERAL": "OU",
    "BOTH": "OU",
    "OU": "OU",
}

_SNELLEN_MAP = {
    "20/15": "1.3",
    "20/20": "1.0",
    "20/25": "0.8",
    "20/30": "0.67",
    "20/40": "0.5",
    "20/50": "0.4",
    "20/60": "0.33",
    "20/70": "0.29",
    "20/80": "0.25",
    "20/100": "0.2",
    "20/200": "0.1",
}

_RELATIONS = {
    "sister": "у сестры",
    "brother": "у брата",
    "mother": "у матери",
    "father": "у отца",
    "parent": "у родителя",
    "parents": "у родителей",
    "grandmother": "у бабушки",
    "grandfather": "у дедушки",
    "family": "в семье",
}

_CONDITIONS = {
    "myopia": "Миопия",
    "astigmatism": "Астигматизм",
    "glaucoma": "Глаукома",
    "cataract": "Катаракта",
    "diabetes": "Сахарный диабет",
    "retinal detachment": "Отслойка сетчатки",
}

_PHRASES = {
    "blurred vision": "нечеткое зрение",
    "blurry vision": "нечеткое зрение",
    "blurred vision at distance": "нечеткое зрение вдаль",
    "blurry vision at distance": "нечеткое зрение вдаль",
    "at distance": "вдаль",
    "routine eye exam": "профилактический осмотр",
    "eye exam": "офтальмологический осмотр",
    "glasses prescription": "подбор очковой коррекции",
    "artificial tears": "увлажняющие капли",
    "dry eye": "синдром сухого глаза",
    "mild dry eye": "легкие проявления синдрома сухого глаза",
    "myopia": "миопия",
    "compound myopic astigmatism": "сложный миопический астигматизм",
}

_DIAGNOSIS_TERMS = {
    "myopia": "миопия",
    "compound myopic astigmatism": "сложный миопический астигматизм",
    "myopic astigmatism": "миопический астигматизм",
    "dry eye syndrome": "синдром сухого глаза",
    "dry eye": "синдром сухого глаза",
}


def normalize_eye_code(value: str | None) -> Eye | None:
    if not value:
        return None
    token = re.sub(r"[^A-Za-z]", "", value).upper()
    return _EYE_MAP.get(token)


def eye_display_ru(eye: Eye | None) -> str | None:
    return {
        "OD": "правый",
        "OS": "левый",
        "OU": "оба глаза",
    }.get(eye or "")


def normalize_date(value: str | None) -> str | None:
    if not value:
        return None
    text = value.strip()
    match = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{2,4})", text)
    if not match:
        return text
    month, day, year = match.groups()
    if len(year) == 2:
        year = f"20{year}" if int(year) < 50 else f"19{year}"
    return f"{int(day):02d}.{int(month):02d}.{year}"


def snellen_to_decimal(value: str | None) -> str | None:
    if not value:
        return None
    text = value.strip()
    if text in _SNELLEN_MAP:
        return _SNELLEN_MAP[text]
    match = re.fullmatch(r"20/(\d{2,3})", text)
    if not match:
        return text
    denominator = Decimal(match.group(1))
    decimal_value = (Decimal(20) / denominator).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return _trim_decimal(decimal_value)


def normalize_visual_acuity_text(value: str) -> str:
    return re.sub(r"\b20/\d{2,3}\b", lambda m: snellen_to_decimal(m.group(0)) or m.group(0), value)


def normalize_reading_distance(value: str) -> str:
    def replace_inches(match: re.Match[str]) -> str:
        inches = Decimal(match.group("inches"))
        centimeters = inches * Decimal("2.54")
        rounded = int((centimeters / Decimal(5)).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * 5)
        return f"{rounded} см"

    return re.sub(r"(?P<inches>\d+(?:\.\d+)?)\s*(?:\"|in\b|inch(?:es)?)", replace_inches, value, flags=re.I)


def format_axis(value: int | str | None) -> str | None:
    if value is None or value == "":
        return None
    axis = int(value)
    return f"{axis:03d}"


def decimal_or_none(value: str | int | float | Decimal | None) -> Decimal | None:
    if value is None or value == "":
        return None
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError):
        return None


def format_diopter(value: str | int | float | Decimal | None) -> str | None:
    number = decimal_or_none(value)
    if number is None:
        return None
    return f"{number:+.2f}"


def format_refraction(sphere: Decimal, cylinder: Decimal | None, axis: int | None) -> str:
    parts = [format_diopter(sphere) or ""]
    if cylinder is not None:
        parts.append(format_diopter(cylinder) or "")
    if axis is not None:
        parts.append(f"x {format_axis(axis)}")
    return " ".join(part for part in parts if part).strip()


def format_keratometry(power: Decimal, axis: int) -> str:
    return f"{power:.2f} @ {format_axis(axis)}"


def normalize_dominant_eye(value: str) -> tuple[Eye | None, str | None]:
    match = re.search(r"dominant\s+eye\s*[:\-]?\s*(RT|LT|OD|OS|OU|RIGHT|LEFT)", value, flags=re.I)
    if not match:
        return None, None
    eye = normalize_eye_code(match.group(1))
    label = eye_display_ru(eye)
    return eye, f"Доминантный глаз: {label}" if label else None


def translate_phrase(value: str) -> str:
    text = " ".join(value.strip().split())
    lower = text.lower()
    if lower in _PHRASES:
        return _PHRASES[lower]
    for source, translated in sorted(_PHRASES.items(), key=lambda item: len(item[0]), reverse=True):
        lower = re.sub(rf"\b{re.escape(source)}\b", translated, lower, flags=re.I)
    return lower if lower != text.lower() else text


def normalize_family_history(value: str) -> tuple[str, str | None, str]:
    lower = value.lower()
    condition = None
    relation = None
    for source, translated in sorted(_CONDITIONS.items(), key=lambda item: len(item[0]), reverse=True):
        if re.search(rf"\b{re.escape(source)}\b", lower):
            condition = translated
            break
    for source, translated in _RELATIONS.items():
        if re.search(rf"\b{re.escape(source)}\b", lower):
            relation = translated
            break
    condition = condition or value.strip().capitalize()
    display = f"{condition}: {relation}" if relation else condition
    return condition, relation, display


def translate_diagnosis_term(value: str) -> str:
    normalized = " ".join(value.strip(" .;,-").lower().split())
    return _DIAGNOSIS_TERMS.get(normalized, normalized)


def group_diagnoses_by_eye(
    diagnoses: dict[Eye, list[str]],
) -> list[tuple[Eye, list[str]]]:
    od = diagnoses.get("OD")
    os = diagnoses.get("OS")
    other = [(eye, terms) for eye, terms in diagnoses.items() if eye not in {"OD", "OS"}]
    if od and os and od == os:
        return [("OU", od), *other]
    result: list[tuple[Eye, list[str]]] = []
    if od:
        result.append(("OD", od))
    if os:
        result.append(("OS", os))
    result.extend(other)
    return result


def diagnosis_display(eye: Eye, terms: list[str]) -> str:
    return f"{eye}: {', '.join(terms)}"


def _trim_decimal(value: Decimal) -> str:
    text = f"{value:.2f}"
    if text.endswith("00"):
        return text[:-3] + ".0"
    return text.rstrip("0").rstrip(".")
