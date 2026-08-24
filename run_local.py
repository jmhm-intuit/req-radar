#!/usr/bin/env python3
"""Run Questline locally with Python's standard library."""
from __future__ import annotations
import contextlib
import http.server
import os
import socket
import socketserver
import sys
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
START_PORT = 8765
END_PORT = 8776

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt: str, *args: object) -> None:
        print(fmt % args)


def local_ip() -> str:
    with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_DGRAM)) as sock:
        try:
            sock.connect(("8.8.8.8", 80))
            return str(sock.getsockname()[0])
        except OSError:
            return "127.0.0.1"


def main() -> int:
    os.chdir(ROOT)
    server = None
    port = None
    for candidate in range(START_PORT, END_PORT + 1):
        try:
            server = socketserver.ThreadingTCPServer(("0.0.0.0", candidate), Handler)
            server.allow_reuse_address = True
            port = candidate
            break
        except OSError:
            continue
    if server is None or port is None:
        print(f"No available port between {START_PORT} and {END_PORT}.", file=sys.stderr)
        return 1

    desktop = f"http://localhost:{port}/index.html"
    phone = f"http://{local_ip()}:{port}/index.html"
    print("Questline 4.2 is running locally.")
    print(f"Desktop: {desktop}")
    print(f"Phone on the same Wi-Fi: {phone}")
    print("Press Ctrl+C to stop.")
    threading.Timer(0.7, lambda: webbrowser.open(desktop)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Questline.")
    finally:
        server.server_close()
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
