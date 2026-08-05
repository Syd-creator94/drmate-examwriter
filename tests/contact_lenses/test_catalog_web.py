import json
import threading
from http import HTTPStatus
from pathlib import Path
from urllib.request import urlopen

import pytest

from dr_mate_contact_lenses import ContactLensCatalog
from dr_mate_contact_lenses.web import (
    API_VERSION,
    INTEGRATION_EVENT,
    CatalogWebApplication,
    create_server,
)

ROOT = Path(__file__).resolve().parents[2]
KNOWLEDGE = ROOT / "knowledge" / "contact_lenses"


@pytest.fixture
def application():
    catalog = ContactLensCatalog.from_directory(KNOWLEDGE)
    return CatalogWebApplication(catalog)


def _payload(response):
    return json.loads(response.body.decode("utf-8"))


def test_static_screen_exposes_reference_and_safety_boundaries(application):
    response = application.dispatch("GET", "/")
    html = response.body.decode("utf-8")

    assert response.status == HTTPStatus.OK
    assert response.content_type == "text/html; charset=utf-8"
    assert "Dr. Mate" in html
    assert "Справочник возможностей" in html
    assert "Пациентские данные не принимаются и не сохраняются" in html
    assert '<script src="/app.js" defer></script>' in html

    script = application.dispatch("GET", "/app.js")
    assert script.status == HTTPStatus.OK
    assert INTEGRATION_EVENT not in script.body.decode("utf-8")
    assert "future_embedding.selection_event" in script.body.decode("utf-8")
    assert 'intent: "reference_comparison"' in script.body.decode("utf-8")

    stylesheet = application.dispatch("GET", "/styles.css")
    assert stylesheet.status == HTTPStatus.OK
    assert stylesheet.content_type == "text/css; charset=utf-8"
    css = stylesheet.body.decode("utf-8")
    assert ".product-grid" in css
    assert "[hidden]" in css
    assert "display: none !important" in css


def test_metadata_describes_catalog_and_future_embedding_contract(application):
    response = application.dispatch("GET", "/api/v1/meta")
    payload = _payload(response)
    data = payload["data"]

    assert response.status == HTTPStatus.OK
    assert payload["api_version"] == API_VERSION
    assert payload["mode"] == "standalone_reference"
    assert payload["patient_data_accepted"] is False
    assert payload["patient_data_persisted"] is False
    assert data["catalog_version"] == "0.2.0"
    assert data["product_count"] == 16
    assert data["verified_count"] == 14
    assert data["draft_count"] == 2
    assert data["capabilities"]["compare"] is True
    assert data["capabilities"]["clinical_matching"] is False
    assert data["capabilities"]["patient_context"] is False
    assert data["future_embedding"]["selection_event"] == INTEGRATION_EVENT
    assert data["future_embedding"]["selection_reference_fields"] == [
        "product_id",
        "catalog_version",
        "record_version",
        "ruleset_id",
        "ruleset_version",
    ]
    assert data["future_embedding"]["patient_context_contract"] == (
        "not_implemented"
    )


def test_search_endpoint_combines_filters_without_clinical_ranking(application):
    response = application.dispatch(
        "GET",
        "/api/v1/catalog/products?brand=Horizon&indication=presbyopia",
    )
    payload = _payload(response)

    assert response.status == HTTPStatus.OK
    assert payload["data"]["total"] == 4
    assert {
        item["product"]["product_id"] for item in payload["data"]["items"]
    } == {
        "xcel.westcon.horizon-bi-con",
        "xcel.westcon.horizon-bi-con-toric",
        "xcel.westcon.horizon-progressive",
        "xcel.westcon.horizon-progressive-toric",
    }
    assert "score" not in payload["data"]
    assert "recommendation" not in payload["data"]


def test_product_endpoint_preserves_provenance_and_versions(application):
    response = application.dispatch(
        "GET",
        "/api/v1/catalog/products/xcel.flexlens.prs",
    )
    payload = _payload(response)
    data = payload["data"]

    assert response.status == HTTPStatus.OK
    assert data["product"]["product_id"] == "xcel.flexlens.prs"
    assert data["product"]["record_version"] == 1
    assert data["product"]["catalog_version"] == "0.2.0"
    assert data["ruleset_id"] == "xcel.flexlens.prs.prototype"
    assert data["ruleset_version"]
    assert data["source_revisions"]
    assert data["matching_available"] is True


def test_comparison_endpoint_keeps_parameter_conflicts_visible(application):
    response = application.dispatch(
        "GET",
        "/api/v1/catalog/compare"
        "?product_id=xcel.flexlens.arc"
        "&product_id=xcel.flexlens.tri-curve",
    )
    payload = _payload(response)
    data = payload["data"]
    rows = {row["parameter"]: row for row in data["parameter_rows"]}

    assert response.status == HTTPStatus.OK
    assert data["product_ids"] == [
        "xcel.flexlens.arc",
        "xcel.flexlens.tri-curve",
    ]
    assert rows["base_curve_mm"]["values"]["xcel.flexlens.arc"]
    assert rows["base_curve_mm"]["conflicts"]["xcel.flexlens.tri-curve"]
    assert (
        data["products"][1]["unresolved_parameter_conflicts"]
        == ["base_curve_mm", "diameter_mm", "power_d"]
    )


def test_invalid_routes_and_methods_fail_explicitly(application):
    not_found = application.dispatch("GET", "/api/v1/unknown")
    unknown_product = application.dispatch(
        "GET",
        "/api/v1/catalog/products/xcel.unknown",
    )
    insufficient_comparison = application.dispatch(
        "GET",
        "/api/v1/catalog/compare?product_id=xcel.flexlens.arc",
    )
    method_not_allowed = application.dispatch("POST", "/api/v1/meta")

    assert not_found.status == HTTPStatus.NOT_FOUND
    assert _payload(not_found)["error"] == "not_found"
    assert unknown_product.status == HTTPStatus.NOT_FOUND
    assert "unknown contact-lens product" in _payload(unknown_product)["error"]
    assert insufficient_comparison.status == HTTPStatus.BAD_REQUEST
    assert "at least two products" in _payload(
        insufficient_comparison
    )["error"]
    assert method_not_allowed.status == HTTPStatus.METHOD_NOT_ALLOWED


def test_head_has_headers_without_body(application):
    response = application.dispatch("HEAD", "/api/v1/meta")

    assert response.status == HTTPStatus.OK
    assert response.content_type == "application/json; charset=utf-8"
    assert response.body == b""


def test_real_local_http_server_serves_api_with_security_headers(application):
    server = create_server(application, "127.0.0.1", 0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address[:2]

    try:
        with urlopen(f"http://{host}:{port}/api/v1/meta") as response:
            payload = json.load(response)
            assert response.status == HTTPStatus.OK
            assert response.headers["Cache-Control"] == "no-store"
            assert response.headers["X-Content-Type-Options"] == "nosniff"
            assert "default-src 'self'" in response.headers[
                "Content-Security-Policy"
            ]
            assert payload["data"]["product_count"] == 16
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
