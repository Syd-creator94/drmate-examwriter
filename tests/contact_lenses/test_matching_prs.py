from decimal import Decimal
from pathlib import Path

from dr_mate_contact_lenses import (
    MatchContext,
    MatchStatus,
    RulePhase,
    load_product_record,
    load_ruleset,
    match_product,
)

ROOT = Path(__file__).resolve().parents[2]
KNOWLEDGE = ROOT / "knowledge" / "contact_lenses"


def load_product_and_rules():
    product = load_product_record(
        KNOWLEDGE / "products" / "xcel" / "flexlens-prs.yaml"
    )
    ruleset = load_ruleset(KNOWLEDGE / "rules" / "xcel" / "flexlens-prs.yaml")
    return product, ruleset


def finding_codes(result):
    return {finding.code for finding in result.findings}


def test_published_post_lasik_case_is_supported_and_explainable():
    product, ruleset = load_product_and_rules()
    context = MatchContext(
        clinical_tags={"post_lasik_prk"},
        requested_parameters={"power_d": Decimal("-2.50")},
    )

    result = match_product(product, ruleset, context)

    assert result.overall_status == MatchStatus.SUPPORTED_CANDIDATE
    assert "published_indication_match" in finding_codes(result)
    assert "power_within_published_range" in finding_codes(result)
    assert "initial_trial_average_lens" in finding_codes(result)
    assert result.catalog_version == "0.2.0"
    assert result.ruleset_version == "0.1.0"
    assert result.product_record_version == 1
    assert set(result.source_revision_ids) == set(product.source_revision_ids)


def test_missing_indication_data_is_not_silently_inferred():
    product, ruleset = load_product_and_rules()
    context = MatchContext(
        requested_parameters={"power_d": Decimal("-2.50")},
    )

    result = match_product(product, ruleset, context)

    assert result.overall_status == MatchStatus.INSUFFICIENT_DATA
    assert "missing_indication_data" in finding_codes(result)
    assert all(
        finding.status != MatchStatus.CONTRAINDICATED
        for finding in result.findings
    )


def test_absence_of_published_indication_requires_review_not_exclusion():
    product, ruleset = load_product_and_rules()
    context = MatchContext(
        clinical_tags={"regular_myopia"},
        requested_parameters={"power_d": Decimal("-2.50")},
        measurements={"corneal_shape": "prolate"},
    )

    result = match_product(product, ruleset, context)

    assert result.overall_status == MatchStatus.MANUAL_REVIEW
    assert "no_published_indication_match" in finding_codes(result)
    assert all(
        finding.status != MatchStatus.CONTRAINDICATED
        for finding in result.findings
    )


def test_outside_power_is_not_mislabeled_as_contraindication():
    product, ruleset = load_product_and_rules()
    context = MatchContext(
        clinical_tags={"post_lasik_prk"},
        requested_parameters={"power_d": Decimal("-31.00")},
    )

    result = match_product(product, ruleset, context)

    assert result.overall_status == MatchStatus.OUTSIDE_PUBLISHED_SPEC
    assert "power_outside_published_range" in finding_codes(result)
    assert all(
        finding.status != MatchStatus.CONTRAINDICATED
        for finding in result.findings
    )


def test_definitive_74_produces_alternative_adjustments_for_manual_choice():
    product, ruleset = load_product_and_rules()
    context = MatchContext(
        clinical_tags={"post_lasik_prk"},
        requested_parameters={"power_d": Decimal("-2.50")},
        selected_material_id="xcel.efrofilcon-a-74",
    )

    result = match_product(product, ruleset, context)
    finding = next(
        finding
        for finding in result.findings
        if finding.code == "definitive_74_adjustment_options"
    )

    assert result.overall_status == MatchStatus.MANUAL_REVIEW
    assert finding.details["adjustment_options"] == [
        "steepen base curve by 0.3 mm",
        "increase diameter by 0.3 mm",
    ]


def test_fit_evaluation_supports_true_false_and_unknown_results():
    product, ruleset = load_product_and_rules()
    fit_phases = {RulePhase.FIT_EVALUATION}

    acceptable = match_product(
        product,
        ruleset,
        MatchContext(
            observations={
                "limbal_draping_mm": Decimal("1.25"),
                "movement_mm": Decimal("0.40"),
                "va_lines_from_best_corrected": Decimal("1"),
            }
        ),
        phases=fit_phases,
    )
    assert acceptable.overall_status == MatchStatus.INFORMATION
    assert finding_codes(acceptable) == {
        "limbal_draping_within_guide",
        "movement_within_guide",
        "visual_acuity_within_guide",
    }

    unacceptable = match_product(
        product,
        ruleset,
        MatchContext(
            observations={
                "limbal_draping_mm": Decimal("0.50"),
                "movement_mm": Decimal("0.75"),
                "va_lines_from_best_corrected": Decimal("3"),
            }
        ),
        phases=fit_phases,
    )
    assert unacceptable.overall_status == MatchStatus.MANUAL_REVIEW

    missing = match_product(
        product,
        ruleset,
        MatchContext(),
        phases=fit_phases,
    )
    assert missing.overall_status == MatchStatus.INSUFFICIENT_DATA
    assert finding_codes(missing) == {
        "missing_limbal_draping",
        "missing_movement",
        "missing_visual_acuity_comparison",
    }
