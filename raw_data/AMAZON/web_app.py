#!/usr/bin/env python3
"""
Local web UI for the Document Renamer.

Run: python web_app.py
Open: http://127.0.0.1:5001  (or set PORT=...)
"""

from __future__ import annotations

import os
from pathlib import Path

from flask import Flask, jsonify, render_template, request

from document_title_generator import (
    DEFAULT_GROUP_BY,
    DEFAULT_TICKER,
    GROUP_BY_FIELDS,
    JobConfig,
    rollback_from_manifest,
    run_job,
)

APP_DIR = Path(__file__).resolve().parent
WORKSPACE = APP_DIR / "ui_workspace"

app = Flask(
    __name__,
    template_folder=str(APP_DIR / "templates"),
    static_folder=str(APP_DIR / "static"),
)


def _default_paths() -> dict:
    WORKSPACE.mkdir(parents=True, exist_ok=True)
    return {
        "input_path": str((APP_DIR / "test_sample").resolve()),
        "copy_to": str((WORKSPACE / "renamed").resolve()),
        "archive_dir": str((WORKSPACE / "archives").resolve()),
        "manifest": str((WORKSPACE / "job_manifest.json").resolve()),
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.get("/api/config")
def api_config():
    defaults = _default_paths()
    return jsonify(
        {
            "defaults": defaults,
            "ticker": DEFAULT_TICKER,
            "group_by_fields": list(GROUP_BY_FIELDS),
            "default_group_by": list(DEFAULT_GROUP_BY),
        }
    )


@app.post("/api/run")
def api_run():
    data = request.get_json(force=True) or {}

    input_path = (data.get("input_path") or "").strip()
    if not input_path:
        return jsonify({"ok": False, "error": "Input path is required"}), 400

    copy_to = (data.get("copy_to") or "").strip() or None
    archive = bool(data.get("archive"))
    if archive and not copy_to:
        return jsonify(
            {"ok": False, "error": "Output folder is required when creating archives"}
        ), 400

    manifest_path = (data.get("manifest") or "").strip()
    if not manifest_path:
        manifest_path = str(WORKSPACE / "job_manifest.json")

    group_by = data.get("group_by")
    if isinstance(group_by, list):
        group_by = ",".join(group_by)

    try:
        manifest = run_job(
            JobConfig(
                input_path=Path(input_path),
                output_file=Path(manifest_path),
                ticker=(data.get("ticker") or DEFAULT_TICKER).strip().upper(),
                recursive=bool(data.get("recursive", True)),
                copy_to_dir=Path(copy_to) if copy_to else None,
                archive=archive,
                archive_dir=Path(data.get("archive_dir") or WORKSPACE / "archives"),
                dry_run=bool(data.get("dry_run")),
                group_by=group_by,
            )
        )
        return jsonify({"ok": True, "manifest": manifest})
    except (FileNotFoundError, ValueError, NotADirectoryError) as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.post("/api/rollback")
def api_rollback():
    data = request.get_json(force=True) or {}
    manifest_path = (data.get("manifest") or "").strip()
    if not manifest_path:
        return jsonify({"ok": False, "error": "Manifest path is required"}), 400

    try:
        removed = rollback_from_manifest(Path(manifest_path))
        return jsonify({"ok": True, "removed": removed})
    except (FileNotFoundError, ValueError) as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


def _pick_port(preferred: int) -> int:
    """Use preferred port, or the next free port in range preferred..preferred+20."""
    import socket

    for port in range(preferred, preferred + 21):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise OSError(f"No free port in range {preferred}-{preferred + 20}")


if __name__ == "__main__":
    preferred = int(os.environ.get("PORT", 5001))  # not 5000: macOS AirPlay
    port = _pick_port(preferred)
    if port != preferred:
        print(f"  Note: port {preferred} busy, using {port} instead.")
    print(f"\n  Document Renamer UI -> http://127.0.0.1:{port}\n")
    app.run(host="127.0.0.1", port=port, debug=True)
