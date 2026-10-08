"""Loopback-only, dependency-free preview server."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse
import mimetypes

mimetypes.add_type('text/javascript', '.mjs')
parser=argparse.ArgumentParser()
parser.add_argument('--port',type=int,default=8788)
parser.add_argument('--directory',default=str(Path(__file__).resolve().parent.parent))
args=parser.parse_args()
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=args.directory,**kw)
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        super().end_headers()
    def log_message(self,fmt,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
print(f'Clinic stage: http://127.0.0.1:{args.port}/',flush=True)
try:server.serve_forever()
except KeyboardInterrupt:server.server_close()
