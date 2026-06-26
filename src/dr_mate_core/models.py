from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Eye = Literal["OD", "OS", "OU"]


class BaseRecordModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class Patient(BaseRecordModel):
    full_name: str | None = None
    birth_date: str | None = None
    age: str | None = None
    sex: str | None = None
    exam_date: str | None = None
    chart_id: str | None = None


class FamilyHistoryItem(BaseRecordModel):
    condition: str
    relation: str | None = None
    display: str


class VisualAcuity(BaseRecordModel):
    eye: Eye
    distance_uncorrected: str | None = None
    distance_corrected: str | None = None
    near: str | None = None
    distance_note: str | None = None
    notes: str | None = None


class Refraction(BaseRecordModel):
    eye: Eye
    kind: str
    sphere: Decimal
    cylinder: Decimal | None = None
    axis: int | None = Field(default=None, ge=0, le=180)
    add: Decimal | None = None
    visual_acuity: str | None = None
    formatted: str


class Keratometry(BaseRecordModel):
    eye: Eye
    k1_power: Decimal
    k1_axis: int
    k2_power: Decimal
    k2_axis: int
    formatted: str


class ClinicalSection(BaseRecordModel):
    title: str
    items: list[str] = Field(default_factory=list)


class Diagnosis(BaseRecordModel):
    eye: Eye
    terms: list[str]
    display: str


class Prescription(BaseRecordModel):
    title: str
    details: str | None = None


class Procedure(BaseRecordModel):
    title: str
    details: str | None = None


class MedicalRecord(BaseRecordModel):
    schema_version: str = "0.1.0"
    source_system: str = "ExamWriter"
    source_file: str | None = None
    locale: str = "ru-KZ"
    patient: Patient = Field(default_factory=Patient)
    reason_for_visit: str | None = None
    complaints: list[str] = Field(default_factory=list)
    history: list[str] = Field(default_factory=list)
    family_history: list[FamilyHistoryItem] = Field(default_factory=list)
    current_status: list[str] = Field(default_factory=list)
    dominant_eye: Eye | None = None
    dominant_eye_display: str | None = None
    visual_acuity: list[VisualAcuity] = Field(default_factory=list)
    refractions: list[Refraction] = Field(default_factory=list)
    keratometry: list[Keratometry] = Field(default_factory=list)
    clinical_sections: list[ClinicalSection] = Field(default_factory=list)
    diagnoses: list[Diagnosis] = Field(default_factory=list)
    plan: list[str] = Field(default_factory=list)
    prescriptions: list[Prescription] = Field(default_factory=list)
    procedures: list[Procedure] = Field(default_factory=list)
    signature: str | None = None
    raw_text_preview: str | None = None
