from __future__ import annotations

import threading
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from importlib.resources import files

from dr_mate_clinic_prototype.__main__ import ASSETS, PrototypeHandler


def test_assets_are_present_and_served_without_write_endpoints() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 0), PrototypeHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        connection = HTTPConnection("127.0.0.1", server.server_port, timeout=3)
        for route, (name, mime) in ASSETS.items():
            connection.request("GET", route)
            response = connection.getresponse()
            assert response.status == 200
            assert response.getheader("Content-Type") == mime
            assert response.getheader("Cache-Control") == "no-store"
            assert "connect-src 'none'" in response.getheader(
                "Content-Security-Policy", ""
            )
            assert response.read() == files("dr_mate_clinic_prototype").joinpath(
                "static", name
            ).read_bytes()
        for path in ["/../pyproject.toml", "/%2e%2e/README.md", "/api/patients"]:
            connection.request("GET", path)
            response = connection.getresponse()
            assert response.status == 404
            response.read()
        connection.request("POST", "/", body=b"synthetic")
        response = connection.getresponse()
        assert response.status == 501
        response.read()
        connection.request("HEAD", "/")
        response = connection.getresponse()
        assert response.status == 200
        assert response.read() == b""
        connection.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
