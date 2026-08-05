from __future__ import annotations

from pathlib import Path
from typing import Any, TypeVar

import yaml
from pydantic import BaseModel

from dr_mate_contact_lenses.models import (
    EvidenceRef,
    ProductRecord,
    RuleSet,
    SourceManifest,
)

ModelT = TypeVar("ModelT", bound=BaseModel)


def _load_yaml(path: str | Path) -> Any:
    source_path = Path(path)
    with source_path.open("r", encoding="utf-8") as stream:
        data = yaml.safe_load(stream)
    if not isinstance(data, dict):
        raise ValueError(f"{source_path} must contain a YAML mapping at its root")
    return data


def _load_model(path: str | Path, model_type: type[ModelT]) -> ModelT:
    return model_type.model_validate(_load_yaml(path))


def load_source_manifest(path: str | Path) -> SourceManifest:
    return _load_model(path, SourceManifest)


def load_product_record(path: str | Path) -> ProductRecord:
    return _load_model(path, ProductRecord)


def load_ruleset(path: str | Path) -> RuleSet:
    return _load_model(path, RuleSet)


def _product_evidence(product: ProductRecord) -> list[EvidenceRef]:
    evidence: list[EvidenceRef] = []
    for indication in product.indications:
        evidence.extend(indication.evidence)
    for fact in product.design_facts:
        evidence.extend(fact.evidence)
    for parameter in product.parameters:
        evidence.extend(parameter.evidence)
    for material in product.materials:
        evidence.extend(material.evidence)
    if product.wear_schedule:
        evidence.extend(product.wear_schedule.evidence)
    if product.fitting_guidance:
        evidence.extend(product.fitting_guidance.initial_trial.evidence)
        for table in product.fitting_guidance.reference_tables:
            evidence.extend(table.evidence)
        for criterion in product.fitting_guidance.fit_criteria:
            evidence.extend(criterion.evidence)
    return evidence


def validate_catalog_links(
    manifest: SourceManifest,
    product: ProductRecord,
    ruleset: RuleSet | None = None,
) -> None:
    if product.manufacturer_id != manifest.manufacturer_id:
        raise ValueError("product manufacturer_id does not match source manifest")
    if ruleset is not None and ruleset.product_id != product.product_id:
        raise ValueError("ruleset product_id does not match product")

    known_sources = {source.source_revision_id for source in manifest.sources}
    referenced_sources = set(product.source_revision_ids)
    referenced_sources.update(
        evidence.source_revision_id for evidence in _product_evidence(product)
    )
    for conflict in product.parameter_conflicts:
        referenced_sources.update(
            claim.source_revision_id for claim in conflict.claims
        )
    if ruleset is not None:
        for rule in ruleset.rules:
            referenced_sources.update(rule.source_revision_ids)

    missing = referenced_sources - known_sources
    if missing:
        raise ValueError(f"unknown source revision IDs: {sorted(missing)}")
