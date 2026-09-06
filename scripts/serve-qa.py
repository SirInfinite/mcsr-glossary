"""Static QA server with GitHub Pages' gzip and 10-minute cache behavior.

Run from this repository: python scripts/serve-qa.py
Then open http://127.0.0.1:8001/mcsr-glossary/ .
This is an optional audit tool, not a production server or build step.
"""
import gzip
import io
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class PagesLikeHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = Path(self.translate_path(self.path))
        if path.is_dir():
            path = path / "index.html"
        if path.is_file() and path.suffix in {".html", ".css", ".js", ".json", ".svg", ".md"} and "gzip" in self.headers.get("Accept-Encoding", ""):
            body = gzip.compress(path.read_bytes())
            self.send_response(200)
            self.send_header("Content-Type", self.guess_type(str(path)))
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.copyfile(io.BytesIO(body), self.wfile)
        else:
            super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "max-age=600")
        self.send_header("Vary", "Accept-Encoding")
        super().end_headers()


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    server = ThreadingHTTPServer(("127.0.0.1", 8001), partial(PagesLikeHandler, directory=str(root)))
    print("QA server: http://127.0.0.1:8001/mcsr-glossary/", flush=True)
    server.serve_forever()
