from __future__ import annotations

import argparse
import json
import sys
import webbrowser
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from importlib.resources import files
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, unquote, urlsplit

from dr_mate_contact_lenses.catalog import (
    CATALOG_DISCLAIMER,
    CatalogQuery,
    ContactLensCatalog,
)
from dr_mate_contact_lenses.models import LifecycleStatus

API_VERSION = "1.0.0"
INTEGRATION_EVENT = "drmate:contact-lens-selection"
STATIC_FILES = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/styles.css": ("styles.css", "text/css; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/mechanicus-cog-emblem.png": (
        "mechanicus-cog-emblem.png",
        "image/png",
    ),
}


@dataclass(frozen=True)
class WebResponse:
    status: int
    content_type: str
    body: bytes


def _json_response(
    status: int,
    data: Any,
    *,
    error: str | None = None,
) -> WebResponse:
    payload = {
        "api_version": API_VERSION,
        "mode": "standalone_reference",
        "patient_data_accepted": False,
        "patient_data_persisted": False,
        "disclaimer": CATALOG_DISCLAIMER,
        "data": data,
        "error": error,
    }
    return WebResponse(
        status=status,
        content_type="application/json; charset=utf-8",
        body=json.dumps(
            payload,
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode("utf-8"),
    )


class CatalogWebApplication:
    def __init__(self, catalog: ContactLensCatalog) -> None:
        self.catalog = catalog

    def dispatch(self, method: str, target: str) -> WebResponse:
        if method not in {"GET", "HEAD"}:
            return _json_response(
                HTTPStatus.METHOD_NOT_ALLOWED,
                None,
                error="method_not_allowed",
            )

        parsed = urlsplit(target)
        path = parsed.path
        query = parse_qs(parsed.query, keep_blank_values=False)

        try:
            if path in STATIC_FILES:
                response = self._static_response(path)
            elif path == "/api/v1/meta":
                response = _json_response(HTTPStatus.OK, self._metadata())
            elif path == "/api/v1/catalog/products":
                response = self._search_response(query)
            elif path.startswith("/api/v1/catalog/products/"):
                product_id = unquote(
                    path.removeprefix("/api/v1/catalog/products/")
                )
                response = self._product_response(product_id)
            elif path == "/api/v1/catalog/compare":
                response = self._comparison_response(query)
            else:
                response = _json_response(
                    HTTPStatus.NOT_FOUND,
                    None,
                    error="not_found",
                )
        except KeyError as exc:
            response = _json_response(
                HTTPStatus.NOT_FOUND,
                None,
                error=str(exc),
            )
        except ValueError as exc:
            response = _json_response(
                HTTPStatus.BAD_REQUEST,
                None,
                error=str(exc),
            )

        if method == "HEAD":
            return WebResponse(
                status=response.status,
                content_type=response.content_type,
                body=b"",
            )
        return response

    def _static_response(self, path: str) -> WebResponse:
        filename, content_type = STATIC_FILES[path]
        asset = (
            files("dr_mate_contact_lenses")
            .joinpath("web_static")
            .joinpath(filename)
        )
        return WebResponse(
            status=HTTPStatus.OK,
            content_type=content_type,
            body=asset.read_bytes(),
        )

    def _metadata(self) -> dict[str, Any]:
        products = self.catalog.list_products()
        indication_labels: dict[str, str] = {}
        material_labels: dict[str, str] = {}
        for item in products:
            for indication in item.product.indications:
                indication_labels.setdefault(indication.code, indication.label)
            for material in item.product.materials:
                material_labels.setdefault(
                    material.material_id,
                    material.display_name,
                )

        return {
            "catalog_version": self.catalog.catalog_version,
            "product_count": len(products),
            "verified_count": sum(
                item.product.status == LifecycleStatus.SOURCE_VERIFIED
                for item in products
            ),
            "draft_count": sum(
                item.product.status == LifecycleStatus.DRAFT
                for item in products
            ),
            "filters": {
                "brands": sorted(
                    {item.product.brand for item in products},
                    key=str.casefold,
                ),
                "statuses": sorted(
                    {item.product.status.value for item in products}
                ),
                "lens_types": sorted(
                    {item.product.lens_type for item in products}
                ),
                "indications": [
                    {"code": code, "label": label}
                    for code, label in sorted(
                        indication_labels.items(),
                        key=lambda item: item[1].casefold(),
                    )
                ],
                "materials": [
                    {"id": material_id, "label": label}
                    for material_id, label in sorted(
                        material_labels.items(),
                        key=lambda item: item[1].casefold(),
                    )
                ],
                "parameters": sorted(
                    {
                        parameter.parameter
                        for item in products
                        for parameter in item.product.parameters
                    }
                ),
            },
            "capabilities": {
                "search": True,
                "filter": True,
                "product_detail": True,
                "compare": True,
                "clinical_matching": False,
                "patient_context": False,
                "persistence": False,
            },
            "future_embedding": {
                "selection_event": INTEGRATION_EVENT,
                "selection_reference_fields": [
                    "product_id",
                    "catalog_version",
                    "record_version",
                    "ruleset_id",
                    "ruleset_version",
                ],
                "patient_context_contract": "not_implemented",
            },
        }

    def _search_response(
        self,
        query: dict[str, list[str]],
    ) -> WebResponse:
        statuses = {
            LifecycleStatus(value) for value in query.get("status", [])
        }
        catalog_query = CatalogQuery(
            text=self._first(query, "q"),
            brands=set(query.get("brand", [])),
            statuses=statuses,
            lens_types=set(query.get("lens_type", [])),
            indication_codes=set(query.get("indication", [])),
            material_ids=set(query.get("material", [])),
            parameter_names=set(query.get("parameter", [])),
        )
        result = self.catalog.search(catalog_query)
        return _json_response(
            HTTPStatus.OK,
            result.model_dump(mode="json"),
        )

    def _product_response(self, product_id: str) -> WebResponse:
        if not product_id:
            raise ValueError("product_id is required")
        result = self.catalog.get_product(product_id)
        return _json_response(
            HTTPStatus.OK,
            result.model_dump(mode="json"),
        )

    def _comparison_response(
        self,
        query: dict[str, list[str]],
    ) -> WebResponse:
        product_ids = query.get("product_id", [])
        result = self.catalog.compare(product_ids)
        return _json_response(
            HTTPStatus.OK,
            result.model_dump(mode="json"),
        )

    @staticmethod
    def _first(
        query: dict[str, list[str]],
        key: str,
    ) -> str | None:
        values = query.get(key)
        return values[0] if values else None


def create_http_handler(
    application: CatalogWebApplication,
) -> type[BaseHTTPRequestHandler]:
    class CatalogRequestHandler(BaseHTTPRequestHandler):
        server_version = "DrMateCatalog/1.0"

        def do_GET(self) -> None:
            self._send(application.dispatch("GET", self.path))

        def do_HEAD(self) -> None:
            self._send(application.dispatch("HEAD", self.path))

        def do_POST(self) -> None:
            self._send(application.dispatch("POST", self.path))

        def log_message(self, format: str, *args: object) -> None:
            return

        def _send(self, response: WebResponse) -> None:
            self.send_response(response.status)
            self.send_header("Content-Type", response.content_type)
            self.send_header("Content-Length", str(len(response.body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header(
                "Content-Security-Policy",
                "default-src 'self'; "
                "style-src 'self'; "
                "script-src 'self'; "
                "connect-src 'self'; "
                "img-src 'self' data:; "
                "object-src 'none'; "
                "base-uri 'none'; "
                "frame-ancestors 'self'",
            )
            self.end_headers()
            if response.body:
                self.wfile.write(response.body)

    return CatalogRequestHandler


def create_server(
    application: CatalogWebApplication,
    host: str,
    port: int,
) -> ThreadingHTTPServer:
    return ThreadingHTTPServer(
        (host, port),
        create_http_handler(application),
    )


def _default_knowledge_directory() -> Path:
    candidates = [
        Path.cwd() / "knowledge" / "contact_lenses",
        Path(__file__).resolve().parents[2]
        / "knowledge"
        / "contact_lenses",
        Path(sys.prefix)
        / "share"
        / "drmate"
        / "knowledge"
        / "contact_lenses",
    ]
    for candidate in candidates:
        if candidate.is_dir():
            return candidate
    return candidates[0]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Open the local Dr. Mate contact-lens reference catalog."
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument(
        "--knowledge-dir",
        type=Path,
        default=_default_knowledge_directory(),
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Start the server without opening the default browser.",
    )
    args = parser.parse_args(argv)

    catalog = ContactLensCatalog.from_directory(args.knowledge_dir)
    application = CatalogWebApplication(catalog)
    server = create_server(application, args.host, args.port)
    url = f"http://{args.host}:{server.server_port}/"
    print(f"Dr. Mate contact-lens catalog: {url}")
    print("Press Ctrl+C to stop.")

    if not args.no_browser:
        webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
