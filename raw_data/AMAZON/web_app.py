#!/usr/bin/env python3
"""
Local web UI for the Document Renamer.

Run: python web_app.py
Open: http://127.0.0.1:5001  (or set PORT=...)
"""

from __future__ import annotations

import json
import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from flask import Flask, jsonify, render_template, request

try:
    from flask_cors import CORS  # type: ignore
except ImportError:  # pragma: no cover - optional dep, keeps backward compat
    CORS = None  # type: ignore

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
SAFE_BROWSE_ROOTS = [APP_DIR.resolve(), WORKSPACE.resolve(), Path.home().resolve()]
JOB_STORE: dict = {}
JOB_LOCK = threading.Lock()

app = Flask(
    __name__,
    template_folder=str(APP_DIR / "templates"),
    static_folder=str(APP_DIR / "static"),
)

# Enable CORS so the Next.js dashboard (localhost:3000) can call the API.
# Falls back gracefully if flask-cors isn't installed.
if CORS is not None:
    _allowed_origins = os.environ.get(
        "AEGIS_CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    )
    CORS(
        app,
        resources={r"/api/*": {"origins": [o.strip() for o in _allowed_origins.split(",") if o.strip()]}},
        supports_credentials=False,
    )


def _default_paths() -> dict:
    WORKSPACE.mkdir(parents=True, exist_ok=True)
    return {
        "input_path": str((APP_DIR / "test_sample").resolve()),
        "copy_to": str((WORKSPACE / "renamed").resolve()),
        "archive_dir": str((WORKSPACE / "archives").resolve()),
        "manifest": str((WORKSPACE / "job_manifest.json").resolve()),
    }


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_resolve(path_text: str) -> Path:
    candidate = Path(path_text).expanduser().resolve()
    for root in SAFE_BROWSE_ROOTS:
        try:
            candidate.relative_to(root)
            return candidate
        except ValueError:
            continue
    raise ValueError("Path is outside allowed roots")


def _build_job_config(data: dict, progress_callback=None) -> JobConfig:
    input_path = (data.get("input_path") or "").strip()
    if not input_path:
        raise ValueError("Input path is required")

    copy_to = (data.get("copy_to") or "").strip() or None
    archive = bool(data.get("archive"))
    if archive and not copy_to:
        raise ValueError("Output folder is required when creating archives")

    manifest_path = (data.get("manifest") or "").strip()
    if not manifest_path:
        manifest_path = str(WORKSPACE / "job_manifest.json")

    group_by = data.get("group_by")
    if isinstance(group_by, list):
        group_by = ",".join(group_by)

    encryption_passphrase = (data.get("encryption_passphrase") or "").strip() or None

    return JobConfig(
        input_path=Path(input_path),
        output_file=Path(manifest_path),
        ticker=(data.get("ticker") or DEFAULT_TICKER).strip().upper(),
        recursive=bool(data.get("recursive", True)),
        copy_to_dir=Path(copy_to) if copy_to else None,
        archive=archive,
        archive_dir=Path(data.get("archive_dir") or WORKSPACE / "archives"),
        dry_run=bool(data.get("dry_run")),
        group_by=group_by,
        compression_level=data.get("compression_level", "balanced"),
        encrypt_archives=bool(data.get("encrypt_archives")),
        encryption_passphrase=encryption_passphrase,
        remove_plaintext_archive=bool(data.get("remove_plaintext_archive", True)),
        progress_callback=progress_callback,
    )


def _update_job(job_id: str, **fields) -> None:
    with JOB_LOCK:
        if job_id not in JOB_STORE:
            return
        JOB_STORE[job_id].update(fields)


def _append_job_event(job_id: str, event: dict) -> None:
    with JOB_LOCK:
        job = JOB_STORE.get(job_id)
        if not job:
            return
        job["events"].append(event)
        # Keep bounded history to avoid unbounded memory growth.
        if len(job["events"]) > 200:
            job["events"] = job["events"][-200:]

        event_type = event.get("event")
        if event_type in {"stage_start", "stage_complete"}:
            job["current_stage"] = event.get("stage")
        if event_type == "file_progress":
            job["file_progress"] = {
                "stage": event.get("stage"),
                "current": event.get("current"),
                "total": event.get("total"),
                "file": event.get("file"),
                "status": event.get("status"),
            }


def _run_async_job(job_id: str, config: JobConfig) -> None:
    _update_job(job_id, status="running", started_at=_iso_now())
    try:
        manifest = run_job(config)
        _update_job(
            job_id,
            status="completed",
            completed_at=_iso_now(),
            manifest=manifest,
            summary=manifest.get("summary", {}),
        )
    except (FileNotFoundError, ValueError, NotADirectoryError) as e:
        _update_job(job_id, status="failed", completed_at=_iso_now(), error=str(e))
    except Exception as e:
        _update_job(job_id, status="failed", completed_at=_iso_now(), error=str(e))


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

    try:
        manifest = run_job(_build_job_config(data))
        return jsonify({"ok": True, "manifest": manifest})
    except (FileNotFoundError, ValueError, NotADirectoryError) as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.post("/api/run-async")
def api_run_async():
    data = request.get_json(force=True) or {}
    job_id = str(uuid4())

    def callback(event: dict) -> None:
        _append_job_event(job_id, event)

    try:
        config = _build_job_config(data, progress_callback=callback)
    except (FileNotFoundError, ValueError, NotADirectoryError) as e:
        return jsonify({"ok": False, "error": str(e)}), 400

    with JOB_LOCK:
        JOB_STORE[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "created_at": _iso_now(),
            "started_at": None,
            "completed_at": None,
            "current_stage": None,
            "file_progress": None,
            "events": [],
            "summary": None,
            "manifest": None,
            "error": None,
        }

    worker = threading.Thread(target=_run_async_job, args=(job_id, config), daemon=True)
    worker.start()
    return jsonify({"ok": True, "job_id": job_id})


@app.get("/api/jobs/<job_id>")
def api_job_status(job_id: str):
    with JOB_LOCK:
        job = JOB_STORE.get(job_id)
        if not job:
            return jsonify({"ok": False, "error": "Job not found"}), 404
        return jsonify({"ok": True, "job": job})


@app.get("/api/jobs")
def api_jobs_list():
    """Lightweight listing of in-memory jobs, newest first."""
    with JOB_LOCK:
        jobs = list(JOB_STORE.values())
    jobs.sort(key=lambda j: j.get("created_at") or "", reverse=True)
    summaries = [
        {
            "job_id": j["job_id"],
            "status": j["status"],
            "created_at": j["created_at"],
            "started_at": j["started_at"],
            "completed_at": j["completed_at"],
            "current_stage": j.get("current_stage"),
            "summary": j.get("summary"),
            "error": j.get("error"),
        }
        for j in jobs
    ]
    return jsonify({"ok": True, "jobs": summaries})


@app.get("/api/manifest")
def api_manifest():
    """Read a job manifest JSON from disk (default: WORKSPACE/job_manifest.json)."""
    path_text = (request.args.get("path") or "").strip()
    if not path_text:
        manifest_path = WORKSPACE / "job_manifest.json"
    else:
        try:
            manifest_path = _safe_resolve(path_text)
        except ValueError as e:
            return jsonify({"ok": False, "error": str(e)}), 400

    if not manifest_path.exists() or not manifest_path.is_file():
        return jsonify({"ok": False, "error": "Manifest not found", "path": str(manifest_path)}), 404

    try:
        with manifest_path.open("r", encoding="utf-8") as fh:
            manifest = json.load(fh)
    except (json.JSONDecodeError, OSError) as e:
        return jsonify({"ok": False, "error": f"Failed to read manifest: {e}"}), 500

    return jsonify({"ok": True, "manifest": manifest, "path": str(manifest_path)})


@app.get("/api/browse")
def api_browse():
    path_text = (request.args.get("path") or "").strip()
    kind = (request.args.get("kind") or "any").strip().lower()

    if not path_text:
        path = APP_DIR.resolve()
    else:
        try:
            path = _safe_resolve(path_text)
        except ValueError as e:
            return jsonify({"ok": False, "error": str(e)}), 400

    if not path.exists():
        return jsonify({"ok": False, "error": "Path does not exist"}), 400

    if path.is_file():
        parent = path.parent
    else:
        parent = path

    entries = []
    for child in sorted(
        parent.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())
    ):
        if kind == "dir" and not child.is_dir():
            continue
        if kind == "file" and not child.is_file():
            continue
        entries.append(
            {
                "name": child.name,
                "path": str(child.resolve()),
                "is_dir": child.is_dir(),
                "is_file": child.is_file(),
            }
        )

    return jsonify(
        {
            "ok": True,
            "cwd": str(parent.resolve()),
            "parent": str(parent.parent.resolve()) if parent.parent != parent else None,
            "entries": entries,
            "roots": [str(p) for p in SAFE_BROWSE_ROOTS],
        }
    )


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
    debug = os.environ.get("FLASK_DEBUG", "1") not in ("0", "false", "False", "")
    print(f"\n  Document Renamer UI -> http://127.0.0.1:{port}\n")
    app.run(host="127.0.0.1", port=port, debug=debug, use_reloader=debug)
