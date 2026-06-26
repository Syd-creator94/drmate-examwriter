from pathlib import Path

from dr_mate_adapters.examwriter import ExamWriterAdapter


ROOT = Path(__file__).resolve().parents[1]


def test_sample_rtf_parses_to_normalized_record() -> None:
    record = ExamWriterAdapter().parse_file(ROOT / "examples" / "examwriter_sample.rtf")

    assert record.patient.full_name == "Иван Петров"
    assert record.patient.birth_date == "14.03.1992"
    assert record.patient.exam_date == "26.06.2026"
    assert record.dominant_eye == "OD"
    assert record.dominant_eye_display == "Доминантный глаз: правый"
    assert record.family_history[0].display == "Миопия: у сестры"
    assert record.complaints == ["нечеткое зрение вдаль"]

    assert record.visual_acuity[0].eye == "OD"
    assert record.visual_acuity[0].distance_uncorrected == "0.5"
    assert record.visual_acuity[1].distance_corrected == "1.0"
    assert record.visual_acuity[1].notes is None
    assert record.visual_acuity[2].eye == "OU"
    assert record.visual_acuity[2].distance_note == "40 см"

    assert record.refractions[0].formatted == "-4.25 -0.50 x 050"
    assert record.refractions[1].formatted == "-3.75 -0.75 x 085"
    assert record.keratometry[0].formatted == "43.25 @ 085 / 44.00 @ 175"
    assert record.diagnoses[0].display == "OU: миопия, сложный миопический астигматизм"


def test_missing_optional_blocks_are_allowed() -> None:
    record = ExamWriterAdapter().parse_file(ROOT / "examples" / "examwriter_sample.rtf")
    minimal = record.model_copy(
        update={
            "visual_acuity": [],
            "refractions": [],
            "keratometry": [],
            "prescriptions": [],
            "procedures": [],
        }
    )

    assert minimal.visual_acuity == []
    assert minimal.refractions == []
    assert minimal.keratometry == []
