from __future__ import annotations

from pathlib import Path
from typing import Iterable

from pydantic import Field, field_validator

from dr_mate_contact_lenses.loader import (
    load_product_record,
    load_ruleset,
    load_source_manifest,
    validate_catalog_links,
)
from dr_mate_contact_lenses.models import (
    CatalogModel,
    LifecycleStatus,
    ParameterConflict,
    ParameterConstraint,
    ProductRecord,
    RuleSet,
    RuleStatus,
    SourceManifest,
    SourceRevision,
)

CATALOG_DISCLAIMER = (
    "Reference catalog data only. A search or comparison result is not a "
    "prescription and does not confirm clinical suitability."
)


class CatalogQuery(CatalogModel):
    text: str | None = None
    brands: set[str] = Field(default_factory=set)
    statuses: set[LifecycleStatus] = Field(default_factory=set)
    lens_types: set[str] = Field(default_factory=set)
    indication_codes: set[str] = Field(default_factory=set)
    material_ids: set[str] = Field(default_factory=set)
    parameter_names: set[str] = Field(default_factory=set)

    @field_validator(
        "brands",
        "lens_types",
        "indication_codes",
        "material_ids",
        "parameter_names",
    )
    @classmethod
    def string_filters_are_not_blank(cls, value: set[str]) -> set[str]:
        stripped = {item.strip() for item in value}
        if "" in stripped:
            raise ValueError("catalog filter values cannot be blank")
        return stripped

    @field_validator("text")
    @classmethod
    def normalize_empty_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class CatalogProductView(CatalogModel):
    product: ProductRecord
    source_revisions: list[SourceRevision]
    ruleset_id: str | None = None
    ruleset_version: str | None = None
    has_active_ruleset: bool
    matching_available: bool
    unresolved_parameter_conflicts: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    disclaimer: str = CATALOG_DISCLAIMER


class CatalogSearchResult(CatalogModel):
    query: CatalogQuery
    total: int = Field(ge=0)
    items: list[CatalogProductView]
    disclaimer: str = CATALOG_DISCLAIMER


class ParameterComparisonRow(CatalogModel):
    parameter: str
    values: dict[str, ParameterConstraint | None]
    conflicts: dict[str, list[ParameterConflict]]


class CatalogComparison(CatalogModel):
    product_ids: list[str] = Field(min_length=2)
    products: list[CatalogProductView]
    parameter_rows: list[ParameterComparisonRow]
    indication_codes: dict[str, list[str]]
    material_ids: dict[str, list[str]]
    disclaimer: str = CATALOG_DISCLAIMER


class ContactLensCatalog:
    def __init__(
        self,
        manifest: SourceManifest,
        products: Iterable[ProductRecord],
        rulesets: Iterable[RuleSet] = (),
    ) -> None:
        product_list = list(products)
        ruleset_list = list(rulesets)

        product_ids = [product.product_id for product in product_list]
        if len(product_ids) != len(set(product_ids)):
            raise ValueError("catalog product IDs must be unique")
        if not product_list:
            raise ValueError("catalog must contain at least one product")

        catalog_versions = {product.catalog_version for product in product_list}
        if len(catalog_versions) != 1:
            raise ValueError("all products must belong to one catalog version")

        rulesets_by_product: dict[str, RuleSet] = {}
        for ruleset in ruleset_list:
            if ruleset.product_id in rulesets_by_product:
                raise ValueError(
                    f"multiple rulesets for product: {ruleset.product_id}"
                )
            if ruleset.product_id not in product_ids:
                raise ValueError(
                    f"ruleset references unknown product: {ruleset.product_id}"
                )
            rulesets_by_product[ruleset.product_id] = ruleset

        for product in product_list:
            validate_catalog_links(
                manifest,
                product,
                rulesets_by_product.get(product.product_id),
            )

        self.manifest = manifest
        self.catalog_version = next(iter(catalog_versions))
        self._products_by_id = {
            product.product_id: product for product in product_list
        }
        self._rulesets_by_product = rulesets_by_product
        self._sources_by_id = {
            source.source_revision_id: source for source in manifest.sources
        }

    @classmethod
    def from_directory(
        cls,
        knowledge_directory: str | Path,
        manufacturer_slug: str = "xcel",
    ) -> ContactLensCatalog:
        root = Path(knowledge_directory)
        manifest = load_source_manifest(
            root / "sources" / f"{manufacturer_slug}.yaml"
        )
        products = [
            load_product_record(path)
            for path in sorted(
                (root / "products" / manufacturer_slug).glob("*.yaml")
            )
        ]
        rulesets = [
            load_ruleset(path)
            for path in sorted(
                (root / "rules" / manufacturer_slug).glob("*.yaml")
            )
        ]
        return cls(manifest, products, rulesets)

    def list_products(self) -> list[CatalogProductView]:
        return [
            self._view(product)
            for product in sorted(
                self._products_by_id.values(),
                key=self._product_sort_key,
            )
        ]

    def get_product(self, product_id: str) -> CatalogProductView:
        try:
            product = self._products_by_id[product_id]
        except KeyError as exc:
            raise KeyError(f"unknown contact-lens product: {product_id}") from exc
        return self._view(product)

    def search(self, query: CatalogQuery | None = None) -> CatalogSearchResult:
        active_query = query or CatalogQuery()
        products = [
            product
            for product in self._products_by_id.values()
            if self._matches_query(product, active_query)
        ]
        products.sort(key=self._product_sort_key)
        items = [self._view(product) for product in products]
        return CatalogSearchResult(
            query=active_query,
            total=len(items),
            items=items,
        )

    def compare(self, product_ids: Iterable[str]) -> CatalogComparison:
        selected_ids = list(product_ids)
        if len(selected_ids) < 2:
            raise ValueError("comparison requires at least two products")
        if len(selected_ids) != len(set(selected_ids)):
            raise ValueError("comparison product IDs must be unique")

        unknown_ids = [
            product_id
            for product_id in selected_ids
            if product_id not in self._products_by_id
        ]
        if unknown_ids:
            raise KeyError(
                f"unknown contact-lens products: {sorted(unknown_ids)}"
            )

        selected = [
            self._products_by_id[product_id] for product_id in selected_ids
        ]
        parameter_names = sorted(
            {
                parameter.parameter
                for product in selected
                for parameter in product.parameters
            }
        )
        parameter_rows = [
            ParameterComparisonRow(
                parameter=parameter_name,
                values={
                    product.product_id: self._parameter_for(
                        product, parameter_name
                    )
                    for product in selected
                },
                conflicts={
                    product.product_id: [
                        conflict
                        for conflict in product.parameter_conflicts
                        if conflict.parameter == parameter_name
                    ]
                    for product in selected
                },
            )
            for parameter_name in parameter_names
        ]

        return CatalogComparison(
            product_ids=selected_ids,
            products=[self._view(product) for product in selected],
            parameter_rows=parameter_rows,
            indication_codes={
                product.product_id: sorted(
                    indication.code for indication in product.indications
                )
                for product in selected
            },
            material_ids={
                product.product_id: sorted(
                    material.material_id for material in product.materials
                )
                for product in selected
            },
        )

    def _view(self, product: ProductRecord) -> CatalogProductView:
        ruleset = self._rulesets_by_product.get(product.product_id)
        has_active_ruleset = (
            ruleset is not None and ruleset.status == RuleStatus.ACTIVE
        )
        unresolved_conflicts = sorted(
            conflict.parameter
            for conflict in product.parameter_conflicts
            if conflict.resolution_status == "unresolved"
        )

        warnings: list[str] = []
        if product.status == LifecycleStatus.DRAFT:
            warnings.append("draft_product")
        if unresolved_conflicts:
            warnings.append("unresolved_parameter_conflicts")
        if not has_active_ruleset:
            warnings.append("no_active_ruleset")

        source_ids = set(product.source_revision_ids)
        if ruleset is not None:
            for rule in ruleset.rules:
                source_ids.update(rule.source_revision_ids)
        source_revisions = [
            source
            for source in self.manifest.sources
            if source.source_revision_id in source_ids
        ]

        matching_available = (
            product.status != LifecycleStatus.DRAFT
            and has_active_ruleset
            and not unresolved_conflicts
        )
        return CatalogProductView(
            product=product,
            source_revisions=source_revisions,
            ruleset_id=ruleset.ruleset_id if ruleset is not None else None,
            ruleset_version=(
                ruleset.ruleset_version if ruleset is not None else None
            ),
            has_active_ruleset=has_active_ruleset,
            matching_available=matching_available,
            unresolved_parameter_conflicts=unresolved_conflicts,
            warnings=warnings,
        )

    @staticmethod
    def _parameter_for(
        product: ProductRecord,
        parameter_name: str,
    ) -> ParameterConstraint | None:
        return next(
            (
                parameter
                for parameter in product.parameters
                if parameter.parameter == parameter_name
            ),
            None,
        )

    @staticmethod
    def _product_sort_key(product: ProductRecord) -> tuple[str, str, str]:
        return (
            product.brand.casefold(),
            product.model.casefold(),
            product.product_id,
        )

    @staticmethod
    def _normalized(values: Iterable[str]) -> set[str]:
        return {value.casefold() for value in values}

    def _matches_query(
        self,
        product: ProductRecord,
        query: CatalogQuery,
    ) -> bool:
        if query.text is not None:
            searchable = " ".join(
                [
                    product.product_id,
                    product.brand,
                    product.model,
                    product.lens_type,
                    *(
                        indication.code
                        for indication in product.indications
                    ),
                    *(
                        indication.label
                        for indication in product.indications
                    ),
                    *(
                        material.material_id
                        for material in product.materials
                    ),
                    *(
                        material.display_name
                        for material in product.materials
                    ),
                    *(
                        parameter.parameter
                        for parameter in product.parameters
                    ),
                    *(fact.text for fact in product.design_facts),
                    *product.clinical_review_notes,
                    *(
                        self._sources_by_id[source_id].title
                        for source_id in product.source_revision_ids
                    ),
                ]
            ).casefold()
            if query.text.casefold() not in searchable:
                return False

        if query.brands and product.brand.casefold() not in self._normalized(
            query.brands
        ):
            return False
        if query.statuses and product.status not in query.statuses:
            return False
        if (
            query.lens_types
            and product.lens_type.casefold()
            not in self._normalized(query.lens_types)
        ):
            return False

        product_indications = {
            indication.code.casefold() for indication in product.indications
        }
        if (
            query.indication_codes
            and not product_indications
            & self._normalized(query.indication_codes)
        ):
            return False

        product_materials = {
            material.material_id.casefold() for material in product.materials
        }
        if (
            query.material_ids
            and not product_materials & self._normalized(query.material_ids)
        ):
            return False

        product_parameters = {
            parameter.parameter.casefold() for parameter in product.parameters
        }
        if query.parameter_names and not self._normalized(
            query.parameter_names
        ) <= product_parameters:
            return False

        return True
