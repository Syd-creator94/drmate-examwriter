from decimal import Decimal

from dr_mate_core.normalizers import (
    format_axis,
    format_diopter,
    format_refraction,
    normalize_date,
    normalize_dominant_eye,
    normalize_eye_code,
    normalize_family_history,
    normalize_reading_distance,
    snellen_to_decimal,
)


def test_eye_and_date_normalization() -> None:
    assert normalize_eye_code("RT") == "OD"
    assert normalize_eye_code("LT") == "OS"
    assert normalize_eye_code("Bilateral") == "OU"
    assert normalize_date("03/14/1992") == "14.03.1992"


def test_visual_distance_and_refraction_formatting() -> None:
    assert snellen_to_decimal("20/25") == "0.8"
    assert normalize_reading_distance('Near @ 16"') == "Near @ 40 см"
    assert format_axis(85) == "085"
    assert format_diopter("-4.25") == "-4.25"
    assert format_diopter("1") == "+1.00"
    assert format_refraction(Decimal("-4.25"), Decimal("-0.50"), 50) == "-4.25 -0.50 x 050"


def test_clinical_language_normalization() -> None:
    eye, display = normalize_dominant_eye("Dominant eye RT")
    assert eye == "OD"
    assert display == "Доминантный глаз: правый"
    condition, relation, family_display = normalize_family_history("Myopia Sister")
    assert condition == "Миопия"
    assert relation == "у сестры"
    assert family_display == "Миопия: у сестры"
