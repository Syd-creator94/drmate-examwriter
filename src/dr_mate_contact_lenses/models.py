from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

SEMVER_PATTERN = r"^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$"
SHA256_PATTERN = r"^[0-9a-f]{64}$"


class CatalogModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class LifecycleStatus(StrEnum):
    DRAFT = "draft"
    SOURCE_VERIFIED = "source_verified"
    CLINICIAN_REVIEWED = "clinician_reviewed"
    ACTIVE = "active"
    DEPRECATED = "deprecated"


class SourceAuthority(StrEnum):
    MANUFACTURER = "manufacturer"
    REGULATORY = "regulatory"
    CLINICIAN = "clinician"


class SourceType(StrEnum):
    MANUFACTURER_WEBPAGE = "manufacturer_webpage"
    MANUFACTURER_BROCHURE = "manufacturer_brochure"
    MANUFACTURER_PARAMETER_GUIDE = "manufacturer_parameter_guide"
    MANUFACTURER_FITTING_GUIDE = "manufacturer_fitting_guide"
    PACKAGE_INSERT = "package_insert"
    CLINICIAN_INTERPRETATION = "clinician_interpretation"


class EvidenceRef(CatalogModel):
    source_revision_id: str
    locator: str = Field(min_length=1)
    note: str | None = None


class SourceRevision(CatalogModel):
    source_revision_id: str
    authority: SourceAuthority
    source_type: SourceType
    title: str
    url: str
    retrieved_at: datetime
    document_revision: str | None = None
    document_date: date | None = None
    pdf_metadata_created_at: datetime | None = None
    content_sha256: str | None = Field(default=None, pattern=SHA256_PATTERN)
    cache_policy: Literal["local_untracked", "metadata_only"] = "local_untracked"
    status: LifecycleStatus
    notes: list[str] = Field(default_factory=list)


class SourceManifest(CatalogModel):
    schema_version: str = Field(pattern=SEMVER_PATTERN)
    manifest_id: str
    manifest_version: str = Field(pattern=SEMVER_PATTERN)
    manufacturer_id: str
    sources: list[SourceRevision]

    @model_validator(mode="after")
    def source_ids_are_unique(self) -> SourceManifest:
        ids = [source.source_revision_id for source in self.sources]
        if len(ids) != len(set(ids)):
            raise ValueError("source_revision_id values must be unique")
        return self


class NumericRange(CatalogModel):
    minimum: Decimal | None = None
    maximum: Decimal | None = None
    step: Decimal | None = Field(default=None, gt=0)
    unit: str

    @model_validator(mode="after")
    def ordered_bounds(self) -> NumericRange:
        if self.minimum is None and self.maximum is None:
            raise ValueError("at least one range bound is required")
        if (
            self.minimum is not None
            and self.maximum is not None
            and self.minimum > self.maximum
        ):
            raise ValueError("minimum cannot exceed maximum")
        return self


class DiscreteValueSet(CatalogModel):
    values: list[str] = Field(min_length=1)
    unit: str

    @field_validator("values")
    @classmethod
    def values_are_unique(cls, value: list[str]) -> list[str]:
        if len(value) != len(set(value)):
            raise ValueError("discrete parameter values must be unique")
        return value


class ParameterConstraint(CatalogModel):
    parameter: str
    availability: NumericRange | None = None
    allowed_values: DiscreteValueSet | None = None
    evidence: list[EvidenceRef] = Field(min_length=1)

    @model_validator(mode="after")
    def exactly_one_availability_shape(self) -> ParameterConstraint:
        if (self.availability is None) == (self.allowed_values is None):
            raise ValueError(
                "exactly one of availability or allowed_values must be provided"
            )
        return self


class ParameterSourceClaim(CatalogModel):
    source_revision_id: str
    availability: NumericRange
    locator: str = Field(min_length=1)
    note: str | None = None


class ParameterConflict(CatalogModel):
    parameter: str
    resolution_status: Literal["unresolved", "resolved_by_source_precedence"]
    matching_policy: Literal["manual_review", "use_active_claim"]
    claims: list[ParameterSourceClaim] = Field(min_length=2)
    active_source_revision_id: str | None = None
    resolution_note: str

    @model_validator(mode="after")
    def resolution_is_consistent(self) -> ParameterConflict:
        claim_source_ids = [claim.source_revision_id for claim in self.claims]
        if len(claim_source_ids) != len(set(claim_source_ids)):
            raise ValueError("parameter conflict claim source IDs must be unique")

        if self.resolution_status == "unresolved":
            if self.matching_policy != "manual_review":
                raise ValueError("unresolved conflicts require manual_review")
            if self.active_source_revision_id is not None:
                raise ValueError("unresolved conflicts cannot select an active claim")
        else:
            if self.matching_policy != "use_active_claim":
                raise ValueError(
                    "resolved source-precedence conflicts require use_active_claim"
                )
            if self.active_source_revision_id not in claim_source_ids:
                raise ValueError(
                    "active_source_revision_id must identify one of the claims"
                )
        return self


class MaterialOption(CatalogModel):
    material_id: str
    display_name: str
    material_family: str | None = None
    water_content_percent: Decimal | None = Field(default=None, ge=0, le=100)
    trade_name: str | None = None
    evidence: list[EvidenceRef] = Field(min_length=1)


class IndicationClaim(CatalogModel):
    code: str
    label: str
    evidence: list[EvidenceRef] = Field(min_length=1)


class DesignFact(CatalogModel):
    fact_id: str
    text: str
    evidence: list[EvidenceRef] = Field(min_length=1)


class WearSchedule(CatalogModel):
    wear_indication: str
    replacement_intervals: list[str] = Field(default_factory=list)
    evidence: list[EvidenceRef] = Field(min_length=1)


class InitialTrialGuidance(CatalogModel):
    parameters: dict[str, Decimal]
    rationale: str
    instructions: list[str] = Field(default_factory=list)
    evidence: list[EvidenceRef] = Field(min_length=1)


class ReferenceRangeRow(CatalogModel):
    label: str
    measurement_minimum: Decimal | None = None
    measurement_maximum: Decimal | None = None
    lens_parameters: dict[str, Decimal]

    @model_validator(mode="after")
    def ordered_measurement_bounds(self) -> ReferenceRangeRow:
        if (
            self.measurement_minimum is not None
            and self.measurement_maximum is not None
            and self.measurement_minimum > self.measurement_maximum
        ):
            raise ValueError("measurement_minimum cannot exceed measurement_maximum")
        return self


class ReferenceTable(CatalogModel):
    table_id: str
    measurement: str
    measurement_unit: str
    purpose: Literal["reference_mapping"]
    interpretation: str
    rows: list[ReferenceRangeRow] = Field(min_length=1)
    evidence: list[EvidenceRef] = Field(min_length=1)


class FitCriterion(CatalogModel):
    criterion_id: str
    field: str
    accepted_range: NumericRange | None = None
    accepted_value: str | bool | None = None
    description: str
    evidence: list[EvidenceRef] = Field(min_length=1)

    @model_validator(mode="after")
    def exactly_one_expected_value(self) -> FitCriterion:
        if (self.accepted_range is None) == (self.accepted_value is None):
            raise ValueError(
                "exactly one of accepted_range or accepted_value must be provided"
            )
        return self


class FittingGuidance(CatalogModel):
    initial_trial: InitialTrialGuidance
    reference_tables: list[ReferenceTable] = Field(default_factory=list)
    fit_criteria: list[FitCriterion] = Field(default_factory=list)


class ProductRecord(CatalogModel):
    schema_version: str = Field(pattern=SEMVER_PATTERN)
    catalog_version: str = Field(pattern=SEMVER_PATTERN)
    product_id: str
    record_version: int = Field(ge=1)
    status: LifecycleStatus
    usage_scope: Literal["research_prototype", "clinical_reference"]
    manufacturer_id: str
    brand: str
    model: str
    lens_type: str
    source_revision_ids: list[str] = Field(min_length=1)
    indications: list[IndicationClaim] = Field(default_factory=list)
    design_facts: list[DesignFact] = Field(default_factory=list)
    parameters: list[ParameterConstraint] = Field(default_factory=list)
    parameter_conflicts: list[ParameterConflict] = Field(default_factory=list)
    materials: list[MaterialOption] = Field(default_factory=list)
    wear_schedule: WearSchedule | None = None
    fitting_guidance: FittingGuidance | None = None
    clinical_review_notes: list[str] = Field(default_factory=list)

    @field_validator("source_revision_ids")
    @classmethod
    def product_source_ids_are_unique(cls, value: list[str]) -> list[str]:
        if len(value) != len(set(value)):
            raise ValueError("product source_revision_ids must be unique")
        return value

    @model_validator(mode="after")
    def parameter_names_are_unique(self) -> ProductRecord:
        parameter_names = [parameter.parameter for parameter in self.parameters]
        if len(parameter_names) != len(set(parameter_names)):
            raise ValueError("product parameter names must be unique")
        conflict_names = [
            conflict.parameter for conflict in self.parameter_conflicts
        ]
        if len(conflict_names) != len(set(conflict_names)):
            raise ValueError("product parameter conflict names must be unique")
        if not set(conflict_names) <= set(parameter_names):
            raise ValueError("parameter conflicts must refer to product parameters")
        return self


class RuleStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    DEPRECATED = "deprecated"


class RulePhase(StrEnum):
    CANDIDATE_RELEVANCE = "candidate_relevance"
    PARAMETER_COMPATIBILITY = "parameter_compatibility"
    INITIAL_TRIAL = "initial_trial"
    FIT_EVALUATION = "fit_evaluation"
    TROUBLESHOOTING = "troubleshooting"


class ConditionOperator(StrEnum):
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    CONTAINS_ANY = "contains_any"
    CONTAINS_ALL = "contains_all"
    BETWEEN_INCLUSIVE = "between_inclusive"
    LESS_THAN = "less_than"
    LESS_THAN_OR_EQUAL = "less_than_or_equal"
    GREATER_THAN = "greater_than"
    GREATER_THAN_OR_EQUAL = "greater_than_or_equal"
    PRESENT = "present"
    ABSENT = "absent"


ConditionScalar = str | Decimal | bool
ConditionValue = ConditionScalar | list[ConditionScalar] | None


class RuleCondition(CatalogModel):
    field: str
    operator: ConditionOperator
    value: ConditionValue = None

    @field_validator("field")
    @classmethod
    def field_uses_allowed_root(cls, value: str) -> str:
        root = value.split(".", 1)[0]
        allowed = {
            "clinical_tags",
            "requested_parameters",
            "measurements",
            "observations",
            "selected_material_id",
        }
        if root not in allowed:
            raise ValueError(f"unsupported condition field root: {root}")
        return value

    @model_validator(mode="after")
    def value_matches_operator(self) -> RuleCondition:
        if self.operator in {ConditionOperator.PRESENT, ConditionOperator.ABSENT}:
            if self.value is not None:
                raise ValueError(f"{self.operator} does not accept a value")
        elif self.value is None:
            raise ValueError(f"{self.operator} requires a value")
        if self.operator == ConditionOperator.BETWEEN_INCLUSIVE:
            if not isinstance(self.value, list) or len(self.value) != 2:
                raise ValueError("between_inclusive requires a two-item list")
        return self


class MatchStatus(StrEnum):
    SUPPORTED_CANDIDATE = "supported_candidate"
    INSUFFICIENT_DATA = "insufficient_data"
    MANUAL_REVIEW = "manual_review"
    OUTSIDE_PUBLISHED_SPEC = "outside_published_spec"
    CONTRAINDICATED = "contraindicated"
    INFORMATION = "information"


OutcomeDetailValue = ConditionScalar | list[ConditionScalar]


class RuleOutcome(CatalogModel):
    status: MatchStatus
    code: str
    message: str
    details: dict[str, OutcomeDetailValue] = Field(default_factory=dict)


class MatchingRule(CatalogModel):
    rule_id: str
    rule_version: str = Field(pattern=SEMVER_PATTERN)
    status: RuleStatus
    phase: RulePhase
    authority: SourceAuthority
    description: str
    source_revision_ids: list[str] = Field(min_length=1)
    match_mode: Literal["all", "any"] = "all"
    conditions: list[RuleCondition]
    on_true: RuleOutcome | None = None
    on_false: RuleOutcome | None = None
    on_unknown: RuleOutcome | None = None

    @model_validator(mode="after")
    def has_an_outcome(self) -> MatchingRule:
        if self.on_true is None and self.on_false is None and self.on_unknown is None:
            raise ValueError("a rule must define at least one outcome")
        return self


class RuleSet(CatalogModel):
    schema_version: str = Field(pattern=SEMVER_PATTERN)
    ruleset_id: str
    ruleset_version: str = Field(pattern=SEMVER_PATTERN)
    status: RuleStatus
    product_id: str
    rules: list[MatchingRule]

    @model_validator(mode="after")
    def rule_ids_are_unique(self) -> RuleSet:
        ids = [rule.rule_id for rule in self.rules]
        if len(ids) != len(set(ids)):
            raise ValueError("rule_id values must be unique within a ruleset")
        return self


ContextScalar = str | Decimal | bool


class MatchContext(CatalogModel):
    clinical_tags: set[str] | None = None
    requested_parameters: dict[str, Decimal] = Field(default_factory=dict)
    measurements: dict[str, ContextScalar] = Field(default_factory=dict)
    observations: dict[str, ContextScalar] = Field(default_factory=dict)
    selected_material_id: str | None = None


class MatchFinding(CatalogModel):
    rule_id: str
    phase: RulePhase
    status: MatchStatus
    code: str
    message: str
    details: dict[str, OutcomeDetailValue] = Field(default_factory=dict)
    source_revision_ids: list[str]


class MatchResult(CatalogModel):
    product_id: str
    product_record_version: int
    catalog_version: str
    ruleset_id: str
    ruleset_version: str
    overall_status: MatchStatus
    findings: list[MatchFinding]
    evaluated_rule_ids: list[str]
    skipped_rule_ids: list[str]
    source_revision_ids: list[str]
