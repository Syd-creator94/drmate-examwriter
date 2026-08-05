from decimal import Decimal
from pathlib import Path

import pytest

from dr_mate_contact_lenses import (
    MatchContext,
    MatchStatus,
    RulePhase,
    load_product_record,
    load_ruleset,
    load_source_manifest,
    match_product,
    validate_catalog_links,
)

ROOT = Path(__file__).resolve().parents[2]
KNOWLEDGE = ROOT / "knowledge" / "contact_lenses"
PRODUCTS = KNOWLEDGE / "products" / "xcel"
RULES = KNOWLEDGE / "rules" / "xcel"


def _products():
    return [
        load_product_record(path)
        for path in sorted(PRODUCTS.glob("*.yaml"))
    ]


def _finding_codes(result):
    return {finding.code for finding in result.findings}


def test_full_current_xcel_custom_soft_filter_is_represented():
    products = _products()

    assert len(products) == 16
    assert len({product.product_id for product in products}) == 16
    assert {product.catalog_version for product in products} == {"0.2.0"}
    assert sum(product.status.value == "source_verified" for product in products) == 14
    assert {
        product.product_id
        for product in products
        if product.status.value == "draft"
    } == {
        "xcel.westcon.horizon-toric",
        "xcel.ideal-optics.idealsoft-spherical",
    }


def test_all_product_source_links_validate_and_only_arc_and_prs_have_rules():
    manifest = load_source_manifest(KNOWLEDGE / "sources" / "xcel.yaml")
    rules_by_product = {}
    for path in sorted(RULES.glob("*.yaml")):
        ruleset = load_ruleset(path)
        rules_by_product[ruleset.product_id] = ruleset

    assert set(rules_by_product) == {
        "xcel.flexlens.arc",
        "xcel.flexlens.prs",
    }

    for product in _products():
        validate_catalog_links(
            manifest,
            product,
            rules_by_product.get(product.product_id),
        )


def test_discrete_xrp_parameters_are_not_misrepresented_as_ranges():
    product = load_product_record(PRODUCTS / "xrp-toric.yaml")
    constraints = {
        parameter.parameter: parameter for parameter in product.parameters
    }

    assert constraints["base_curve_mm"].availability is None
    assert constraints["base_curve_mm"].allowed_values.values == ["8.4", "8.8"]
    assert constraints["diameter_mm"].allowed_values.values == ["14.4", "15.0"]
    assert constraints["axis_deg"].availability.step == Decimal("5")


def test_tri_curve_conflicts_remain_unresolved_and_block_hard_matching():
    product = load_product_record(PRODUCTS / "flexlens-tri-curve.yaml")
    conflicts = {
        conflict.parameter: conflict for conflict in product.parameter_conflicts
    }

    assert set(conflicts) == {"base_curve_mm", "diameter_mm", "power_d"}
    assert all(
        conflict.resolution_status == "unresolved"
        and conflict.matching_policy == "manual_review"
        and conflict.active_source_revision_id is None
        for conflict in conflicts.values()
    )
    power_claims = {
        claim.source_revision_id: claim.availability
        for claim in conflicts["power_d"].claims
    }
    assert power_claims[
        "xcel.flexlens.parameter-guide.rev-04152022"
    ].maximum == Decimal("30.00")
    assert power_claims[
        "xcel.flexlens-tri-curve.product-guide.undated"
    ].maximum == Decimal("50.00")
    assert not (RULES / "flexlens-tri-curve.yaml").exists()


def test_aphakic_newer_product_sheet_is_selected_without_losing_old_claim():
    product = load_product_record(PRODUCTS / "flexlens-aphakic.yaml")
    conflict = product.parameter_conflicts[0]
    power = next(
        parameter
        for parameter in product.parameters
        if parameter.parameter == "power_d"
    )

    assert power.availability.maximum == Decimal("50.00")
    assert conflict.resolution_status == "resolved_by_source_precedence"
    assert conflict.matching_policy == "use_active_claim"
    assert (
        conflict.active_source_revision_id
        == "xcel.flexlens-aphakic.rev-2024-04-22"
    )
    assert {
        claim.availability.maximum for claim in conflict.claims
    } == {Decimal("30.00"), Decimal("50.00")}


def test_draft_product_cannot_participate_in_matching():
    draft = load_product_record(PRODUCTS / "horizon-toric.yaml")
    arc_rules = load_ruleset(RULES / "flexlens-arc.yaml")

    with pytest.raises(
        ValueError,
        match="draft product records cannot participate in matching",
    ):
        match_product(draft, arc_rules, MatchContext())


def test_arc_initial_trial_is_explainable_and_preserves_k_gap():
    product = load_product_record(PRODUCTS / "flexlens-arc.yaml")
    ruleset = load_ruleset(RULES / "flexlens-arc.yaml")

    conventional = match_product(
        product,
        ruleset,
        MatchContext(
            clinical_tags={"keratoconus"},
            requested_parameters={"cylinder_d": Decimal("-1.50")},
            measurements={"flat_k_d": Decimal("48.00")},
        ),
    )
    assert conventional.overall_status == MatchStatus.SUPPORTED_CANDIDATE
    assert {
        "published_indication_match",
        "initial_base_curve_8_3",
        "initial_center_thickness_0_30",
    } <= _finding_codes(conventional)

    steep = match_product(
        product,
        ruleset,
        MatchContext(
            clinical_tags={"irregular_cornea"},
            requested_parameters={"cylinder_d": Decimal("-3.00")},
            measurements={"flat_k_d": Decimal("52.00")},
        ),
    )
    assert {
        "initial_base_curve_7_7",
        "initial_center_thickness_0_50",
    } <= _finding_codes(steep)

    gap = match_product(
        product,
        ruleset,
        MatchContext(
            clinical_tags={"keratoconus"},
            requested_parameters={"cylinder_d": Decimal("-1.00")},
            measurements={"flat_k_d": Decimal("49.06")},
        ),
    )
    assert gap.overall_status == MatchStatus.MANUAL_REVIEW
    assert "flat_k_between_published_thresholds" in _finding_codes(gap)


def test_arc_fit_and_troubleshooting_rules_follow_published_actions():
    product = load_product_record(PRODUCTS / "flexlens-arc.yaml")
    ruleset = load_ruleset(RULES / "flexlens-arc.yaml")

    fit = match_product(
        product,
        ruleset,
        MatchContext(
            observations={
                "centered": True,
                "movement_mm": Decimal("1.0"),
                "rotation_deg": Decimal("12"),
                "central_air_bubble": False,
                "lens_fold": False,
                "central_touch": "slight",
                "over_refraction_va_at_least_best_achievable": True,
            }
        ),
        phases={RulePhase.FIT_EVALUATION},
    )
    assert fit.overall_status == MatchStatus.MANUAL_REVIEW
    assert "rotation_over_10_steepen" in _finding_codes(fit)

    acceptable = match_product(
        product,
        ruleset,
        MatchContext(
            observations={
                "centered": True,
                "movement_mm": Decimal("1.0"),
                "rotation_deg": Decimal("5"),
                "central_air_bubble": False,
                "lens_fold": False,
                "central_touch": "slight",
                "over_refraction_va_at_least_best_achievable": True,
            }
        ),
        phases={RulePhase.FIT_EVALUATION},
    )
    assert acceptable.overall_status == MatchStatus.INFORMATION

    troubleshooting = match_product(
        product,
        ruleset,
        MatchContext(
            observations={
                "central_air_bubble": True,
                "excessive_rotation": True,
            }
        ),
        phases={RulePhase.TROUBLESHOOTING},
    )
    assert _finding_codes(troubleshooting) == {
        "central_air_bubble_adjustments",
        "excessive_rotation_adjustments",
    }
