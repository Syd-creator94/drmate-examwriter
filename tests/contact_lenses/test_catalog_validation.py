from decimal import Decimal
from pathlib import Path

from dr_mate_contact_lenses import (
    load_product_record,
    load_ruleset,
    load_source_manifest,
    validate_catalog_links,
)

ROOT = Path(__file__).resolve().parents[2]
KNOWLEDGE = ROOT / "knowledge" / "contact_lenses"


def load_pilot():
    manifest = load_source_manifest(KNOWLEDGE / "sources" / "xcel.yaml")
    product = load_product_record(
        KNOWLEDGE / "products" / "xcel" / "flexlens-prs.yaml"
    )
    ruleset = load_ruleset(KNOWLEDGE / "rules" / "xcel" / "flexlens-prs.yaml")
    return manifest, product, ruleset


def test_xcel_prs_catalog_and_links_validate():
    manifest, product, ruleset = load_pilot()

    validate_catalog_links(manifest, product, ruleset)

    assert product.product_id == "xcel.flexlens.prs"
    assert ruleset.product_id == product.product_id
    assert len(manifest.sources) == 9
    assert len(product.materials) == 6


def test_prs_published_parameter_ranges_are_structured():
    _, product, _ = load_pilot()
    constraints = {
        parameter.parameter: parameter.availability
        for parameter in product.parameters
    }

    assert constraints["base_curve_mm"].minimum == Decimal("6.0")
    assert constraints["base_curve_mm"].maximum == Decimal("11.0")
    assert constraints["base_curve_mm"].step == Decimal("0.1")
    assert constraints["diameter_mm"].minimum == Decimal("10.0")
    assert constraints["diameter_mm"].maximum == Decimal("16.0")
    assert constraints["power_d"].minimum == Decimal("-30.00")
    assert constraints["power_d"].maximum == Decimal("30.00")
    assert constraints["power_d"].step == Decimal("0.25")


def test_prs_initial_trial_is_separate_from_k_reference_tables():
    _, product, ruleset = load_pilot()
    fitting = product.fitting_guidance
    assert fitting is not None

    assert fitting.initial_trial.parameters == {
        "base_curve_mm": Decimal("8.7"),
        "diameter_mm": Decimal("15.0"),
    }
    assert {table.purpose for table in fitting.reference_tables} == {
        "reference_mapping"
    }
    assert all(
        "not an algorithm for selecting the first diagnostic lens"
        in table.interpretation
        for table in fitting.reference_tables
    )

    initial_rule = next(
        rule
        for rule in ruleset.rules
        if rule.rule_id == "prs.initial-trial.average-lens"
    )
    assert initial_rule.conditions == []
    assert all(
        "k_to" not in rule.rule_id and "keratometry" not in rule.rule_id
        for rule in ruleset.rules
    )
