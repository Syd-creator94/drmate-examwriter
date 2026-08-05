from pathlib import Path

import pytest

from dr_mate_contact_lenses import (
    CATALOG_DISCLAIMER,
    CatalogQuery,
    ContactLensCatalog,
)
from dr_mate_contact_lenses.models import LifecycleStatus

ROOT = Path(__file__).resolve().parents[2]
KNOWLEDGE = ROOT / "knowledge" / "contact_lenses"


@pytest.fixture
def catalog():
    return ContactLensCatalog.from_directory(KNOWLEDGE)


def _ids(result):
    return [item.product.product_id for item in result.items]


def test_catalog_loads_all_products_in_deterministic_order(catalog):
    products = catalog.list_products()

    assert catalog.catalog_version == "0.2.0"
    assert len(products) == 16
    assert [item.product.product_id for item in products] == [
        item.product.product_id
        for item in catalog.list_products()
    ]
    assert products == sorted(
        products,
        key=lambda item: (
            item.product.brand.casefold(),
            item.product.model.casefold(),
            item.product.product_id,
        ),
    )


def test_product_view_preserves_provenance_rules_and_safety_boundary(catalog):
    prs = catalog.get_product("xcel.flexlens.prs")

    assert prs.has_active_ruleset is True
    assert prs.matching_available is True
    assert prs.ruleset_id == "xcel.flexlens.prs.prototype"
    assert {
        source.source_revision_id for source in prs.source_revisions
    } == set(prs.product.source_revision_ids)
    assert prs.disclaimer == CATALOG_DISCLAIMER
    assert "not a prescription" in prs.disclaimer


def test_default_search_keeps_drafts_visible_with_warnings(catalog):
    result = catalog.search()
    drafts = [
        item
        for item in result.items
        if item.product.status == LifecycleStatus.DRAFT
    ]

    assert result.total == 16
    assert len(drafts) == 2
    assert all("draft_product" in item.warnings for item in drafts)
    assert all(item.matching_available is False for item in drafts)


def test_text_and_category_filters_are_case_insensitive(catalog):
    text_result = catalog.search(CatalogQuery(text="KERATOCONUS"))
    assert set(_ids(text_result)) == {
        "xcel.flexlens.arc",
        "xcel.flexlens.tri-curve",
    }

    design_result = catalog.search(CatalogQuery(text="reverse-geometry"))
    assert _ids(design_result) == ["xcel.flexlens.prs"]

    brand_result = catalog.search(CatalogQuery(brands={"flexLENS"}))
    assert brand_result.total == 8
    assert {item.product.brand for item in brand_result.items} == {"Flexlens"}

    draft_result = catalog.search(
        CatalogQuery(statuses={LifecycleStatus.DRAFT})
    )
    assert set(_ids(draft_result)) == {
        "xcel.ideal-optics.idealsoft-spherical",
        "xcel.westcon.horizon-toric",
    }


def test_filters_use_or_inside_category_and_and_between_categories(catalog):
    presbyopic_horizon = catalog.search(
        CatalogQuery(
            brands={"Horizon"},
            indication_codes={"presbyopia"},
        )
    )
    assert set(_ids(presbyopic_horizon)) == {
        "xcel.westcon.horizon-bi-con",
        "xcel.westcon.horizon-bi-con-toric",
        "xcel.westcon.horizon-progressive",
        "xcel.westcon.horizon-progressive-toric",
    }

    multifocal_toric = catalog.search(
        CatalogQuery(parameter_names={"add_power_d", "cylinder_d"})
    )
    assert set(_ids(multifocal_toric)) == {
        "xcel.westcon.horizon-bi-con-toric",
        "xcel.westcon.horizon-progressive-toric",
    }

    two_indications = catalog.search(
        CatalogQuery(indication_codes={"aphakia", "astigmatism"})
    )
    assert "xcel.flexlens.aphakic" in _ids(two_indications)
    assert "xcel.xrp.toric" in _ids(two_indications)


def test_material_and_lens_type_filters(catalog):
    xrp = catalog.search(
        CatalogQuery(
            lens_types={"SOFT_TORIC_EXTENDED_RANGE"},
            material_ids={"XCEL.HIOXIFILCON-A-59"},
        )
    )

    assert _ids(xrp) == ["xcel.xrp.toric"]


def test_comparison_aligns_parameters_and_keeps_conflicts_visible(catalog):
    comparison = catalog.compare(
        [
            "xcel.flexlens.arc",
            "xcel.flexlens.tri-curve",
            "xcel.westcon.horizon-toric",
        ]
    )
    rows = {row.parameter: row for row in comparison.parameter_rows}

    assert comparison.product_ids == [
        "xcel.flexlens.arc",
        "xcel.flexlens.tri-curve",
        "xcel.westcon.horizon-toric",
    ]
    assert rows["base_curve_mm"].values["xcel.flexlens.arc"] is not None
    assert (
        rows["base_curve_mm"].values["xcel.westcon.horizon-toric"] is None
    )
    assert len(
        rows["base_curve_mm"].conflicts["xcel.flexlens.tri-curve"]
    ) == 1

    tri_curve = comparison.products[1]
    assert tri_curve.unresolved_parameter_conflicts == [
        "base_curve_mm",
        "diameter_mm",
        "power_d",
    ]
    assert "unresolved_parameter_conflicts" in tri_curve.warnings

    draft = comparison.products[2]
    assert "draft_product" in draft.warnings
    assert comparison.disclaimer == CATALOG_DISCLAIMER
    assert comparison.model_dump(mode="json")["parameter_rows"]


def test_unknown_and_invalid_comparisons_fail_explicitly(catalog):
    with pytest.raises(KeyError, match="unknown contact-lens product"):
        catalog.get_product("xcel.unknown")

    with pytest.raises(ValueError, match="at least two products"):
        catalog.compare(["xcel.flexlens.arc"])

    with pytest.raises(ValueError, match="must be unique"):
        catalog.compare(["xcel.flexlens.arc", "xcel.flexlens.arc"])

    with pytest.raises(KeyError, match="xcel.unknown"):
        catalog.compare(["xcel.flexlens.arc", "xcel.unknown"])


def test_blank_filter_values_are_rejected():
    with pytest.raises(ValueError, match="cannot be blank"):
        CatalogQuery(brands={" "})
