#!/usr/bin/env python3
"""
Local web UI for the Document Renamer.

Run: python web_app.py
Open: http://127.0.0.1:5001  (or set PORT=...)
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from flask import Flask, jsonify, render_template, request, send_file

try:
    from flask_cors import CORS  # type: ignore
except ImportError:  # pragma: no cover - optional dep, keeps backward compat
    CORS = None  # type: ignore

from document_title_generator import (
    AESGCM,
    DEFAULT_GROUP_BY,
    DEFAULT_TICKER,
    GROUP_BY_FIELDS,
    JobConfig,
    decrypt_file_with_passphrase,
    rollback_from_manifest,
    run_job,
)

APP_DIR = Path(__file__).resolve().parent
WORKSPACE = APP_DIR / "ui_workspace"
SAFE_BROWSE_ROOTS = [APP_DIR.resolve(), WORKSPACE.resolve(), Path.home().resolve()]
REVIEWS_PATH = WORKSPACE / "reviews.json"  # persisted approve/flag/edit state, keyed by renamed filename
JOB_STORE: dict = {}
JOB_LOCK = threading.Lock()
REVIEWS_LOCK = threading.Lock()

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


def _remap_to_workspace(basename: str) -> Path | None:
    """Look for `basename` in WORKSPACE (renamed/, archives/, recursive)."""
    if not basename:
        return None
    workspace_resolved = WORKSPACE.resolve()
    if not workspace_resolved.exists():
        return None
    for sub in ("renamed", "archives"):
        candidate = (workspace_resolved / sub / basename).resolve()
        try:
            candidate.relative_to(workspace_resolved)
        except ValueError:
            continue
        if candidate.exists() and candidate.is_file():
            return candidate
    for child in workspace_resolved.rglob(basename):
        if child.is_file():
            return child
    return None


def _resolve_or_remap(path_text: str) -> Path:
    """Resolve a path, with a basename-based fallback into the local workspace.

    Useful when a manifest was generated on a different machine: the absolute
    path won't exist locally, but the same filename may be present under
    `WORKSPACE/renamed/` or `WORKSPACE/archives/`. We try the basename
    fallback both when the path is outside safe roots and when it resolves
    inside roots but does not exist.
    """
    basename = Path(path_text).name
    try:
        primary = _safe_resolve(path_text)
    except ValueError:
        remapped = _remap_to_workspace(basename)
        if remapped is not None:
            return remapped
        raise
    if primary.exists():
        return primary
    remapped = _remap_to_workspace(basename)
    if remapped is not None:
        return remapped
    return primary  # caller will surface "not found"


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


@app.get("/api/file")
def api_file_download():
    """Stream a file from disk, restricted to SAFE_BROWSE_ROOTS."""
    path_text = (request.args.get("path") or "").strip()
    if not path_text:
        return jsonify({"ok": False, "error": "path is required"}), 400
    try:
        target = _resolve_or_remap(path_text)
    except ValueError:
        # Outside safe roots and no remap match -> treat as not found
        return jsonify({"ok": False, "error": "File not found"}), 404
    if not target.exists() or not target.is_file():
        return jsonify({"ok": False, "error": "File not found", "tried": str(target)}), 404
    as_attachment = (request.args.get("download") or "").lower() not in {"0", "false", ""}
    return send_file(
        target,
        as_attachment=as_attachment,
        download_name=target.name,
    )


@app.post("/api/open")
def api_open_in_os():
    """Open a path in the host OS file manager (best-effort, local-only)."""
    data = request.get_json(force=True) or {}
    path_text = (data.get("path") or "").strip()
    if not path_text:
        return jsonify({"ok": False, "error": "path is required"}), 400
    try:
        target = _resolve_or_remap(path_text)
    except ValueError:
        return jsonify({"ok": False, "error": "Path not found"}), 404
    if not target.exists():
        return jsonify({"ok": False, "error": "Path does not exist", "tried": str(target)}), 404

    try:
        if sys.platform == "darwin":
            subprocess.Popen(["open", "-R" if target.is_file() else "-a", "Finder", str(target)])
        elif sys.platform.startswith("win"):
            if target.is_file():
                subprocess.Popen(["explorer", "/select,", str(target)])
            else:
                os.startfile(str(target))  # type: ignore[attr-defined]
        else:
            subprocess.Popen(["xdg-open", str(target.parent if target.is_file() else target)])
    except Exception as e:  # pragma: no cover
        return jsonify({"ok": False, "error": str(e)}), 500
    return jsonify({"ok": True, "opened": str(target)})


@app.get("/api/dashboard")
def api_dashboard():
    """KPI summary derived from the default workspace manifest + in-memory jobs."""
    manifest_path = WORKSPACE / "job_manifest.json"
    manifest: dict | None = None
    if manifest_path.exists():
        try:
            with manifest_path.open("r", encoding="utf-8") as fh:
                manifest = json.load(fh)
        except (json.JSONDecodeError, OSError):
            manifest = None

    files_count = 0
    archives_count = 0
    encrypted_count = 0
    groups_count = 0
    needs_review_count = 0
    total_bytes = 0
    doc_type_counts: dict[str, int] = {}
    if manifest:
        qf = manifest.get("quickfinder_groups") or {}
        groups_count = len(qf)
        for group_key, group in qf.items():
            grp_files = group.get("files") or []
            files_count += len(grp_files)
            arch = group.get("archive") or {}
            if arch.get("archive_path") or arch.get("encrypted_archive_path"):
                archives_count += 1
            if arch.get("encrypted_archive_path"):
                encrypted_count += 1
            # Best-effort: file size from disk if we can find it
            for f in grp_files:
                p = Path(f.get("new_path") or "")
                if p.exists() and p.is_file():
                    try:
                        total_bytes += p.stat().st_size
                    except OSError:
                        pass
                # Derive doc type from group key like AMZN_earnings_call_2024Q3
                parts = group_key.split("_")
                if len(parts) >= 3:
                    doc_type = "_".join(parts[1:-1]).upper() if parts[-1][:4].isdigit() else "_".join(parts[1:]).upper()
                    doc_type_counts[doc_type] = doc_type_counts.get(doc_type, 0) + 1

        # "Needs review" = files with no archive or whose archive failed/missing
        for group_key, group in qf.items():
            arch = group.get("archive") or {}
            status = (arch.get("status") or "").lower()
            if status and status != "success":
                needs_review_count += len(group.get("files") or [])

    # Load persisted reviews (overlay onto review counts)
    reviews = _load_reviews()
    flagged_count = sum(1 for r in reviews.values() if r.get("status") == "flagged")
    approved_count = sum(1 for r in reviews.values() if r.get("status") == "approved")

    with JOB_LOCK:
        all_jobs = list(JOB_STORE.values())
    all_jobs.sort(key=lambda j: j.get("created_at") or "", reverse=True)
    recent_jobs = [
        {
            "job_id": j["job_id"],
            "status": j["status"],
            "created_at": j["created_at"],
            "completed_at": j["completed_at"],
            "current_stage": j.get("current_stage"),
            "summary": j.get("summary"),
            "ticker": (j.get("manifest") or {}).get("ticker") if j.get("manifest") else None,
        }
        for j in all_jobs[:10]
    ]

    return jsonify(
        {
            "ok": True,
            "manifest_path": str(manifest_path) if manifest_path.exists() else None,
            "manifest_created_at": manifest.get("created_at") if manifest else None,
            "ticker": manifest.get("ticker") if manifest else None,
            "input_path": manifest.get("input_path") if manifest else None,
            "kpis": {
                "files_processed": files_count,
                "archives_created": archives_count,
                "encrypted_archives": encrypted_count,
                "groups": groups_count,
                "needs_review": needs_review_count + flagged_count,
                "approved": approved_count,
                "flagged": flagged_count,
                "total_bytes": total_bytes,
            },
            "doc_type_counts": doc_type_counts,
            "recent_jobs": recent_jobs,
            "active_jobs": sum(1 for j in all_jobs if j["status"] in {"queued", "running"}),
        }
    )


# ---------- Review state persistence ----------

def _load_reviews() -> dict:
    with REVIEWS_LOCK:
        if not REVIEWS_PATH.exists():
            return {}
        try:
            with REVIEWS_PATH.open("r", encoding="utf-8") as fh:
                data = json.load(fh)
            if not isinstance(data, dict):
                return {}
            return data
        except (json.JSONDecodeError, OSError):
            return {}


def _save_reviews(reviews: dict) -> None:
    with REVIEWS_LOCK:
        REVIEWS_PATH.parent.mkdir(parents=True, exist_ok=True)
        tmp = REVIEWS_PATH.with_suffix(".json.tmp")
        with tmp.open("w", encoding="utf-8") as fh:
            json.dump(reviews, fh, indent=2)
        tmp.replace(REVIEWS_PATH)


@app.get("/api/reviews")
def api_reviews_get():
    return jsonify({"ok": True, "reviews": _load_reviews()})


@app.post("/api/reviews")
def api_reviews_set():
    """Set or clear the review status for a single file (keyed by renamed filename).

    Body: { "key": "<renamed_filename>", "status": "approved"|"flagged"|null,
            "note": "..." (optional) }
    """
    data = request.get_json(force=True) or {}
    key = (data.get("key") or "").strip()
    if not key:
        return jsonify({"ok": False, "error": "key is required"}), 400
    status = data.get("status")
    if status not in ("approved", "flagged", None):
        return jsonify({"ok": False, "error": "status must be approved|flagged|null"}), 400
    note = (data.get("note") or "").strip() or None

    reviews = _load_reviews()
    if status is None:
        reviews.pop(key, None)
    else:
        reviews[key] = {
            "status": status,
            "note": note,
            "updated_at": _iso_now(),
        }
    _save_reviews(reviews)
    return jsonify({"ok": True, "reviews": reviews})


# ---------- Encryption (live archive sealing) ----------


def _load_workspace_manifest() -> dict | None:
    manifest_path = WORKSPACE / "job_manifest.json"
    if not manifest_path.exists():
        return None
    try:
        with manifest_path.open("r", encoding="utf-8") as fh:
            return json.load(fh)
    except (json.JSONDecodeError, OSError):
        return None


def _encryption_archives_from_manifest(manifest: dict | None) -> list[dict]:
    if not manifest:
        return []
    rows: list[dict] = []
    for group_key, group in (manifest.get("quickfinder_groups") or {}).items():
        arch = group.get("archive") or {}
        enc_path = arch.get("encrypted_archive_path")
        if not enc_path:
            continue
        plain_path = arch.get("archive_path")
        rows.append(
            {
                "group_key": group_key,
                "file_count": group.get("file_count") or len(group.get("files") or []),
                "encrypted_path": enc_path,
                "encrypted_checksum_sha256": arch.get("encrypted_checksum_sha256"),
                "encryption_algorithm": arch.get("encryption_algorithm") or "AES-256-GCM",
                "archive_path": plain_path,
                "has_plaintext_archive": bool(
                    plain_path and Path(plain_path).exists()
                ),
                "status": arch.get("status"),
            }
        )
    return rows


@app.get("/api/encryption")
def api_encryption_summary():
    """Encryption posture derived from the workspace manifest."""
    manifest = _load_workspace_manifest()
    archives = _encryption_archives_from_manifest(manifest)
    total_groups = len((manifest or {}).get("quickfinder_groups") or {})
    opts = (manifest or {}).get("processing_options") or {}
    encrypted_bytes = 0
    for row in archives:
        try:
            p = _resolve_or_remap(row["encrypted_path"])
            if p.exists() and p.is_file():
                encrypted_bytes += p.stat().st_size
        except ValueError:
            pass

    return jsonify(
        {
            "ok": True,
            "cryptography_available": AESGCM is not None,
            "manifest_path": str(WORKSPACE / "job_manifest.json")
            if (WORKSPACE / "job_manifest.json").exists()
            else None,
            "job_encrypt_enabled": bool(opts.get("encrypt_archives")),
            "summary": {
                "encrypted_archives": len(archives),
                "total_archives": total_groups,
                "encrypted_bytes": encrypted_bytes,
                "algorithm": "AES-256-GCM",
                "kdf": "PBKDF2-HMAC-SHA256",
                "iterations": 200_000,
            },
            "archives": archives,
        }
    )


@app.post("/api/encryption/verify")
def api_encryption_verify():
    """Verify a passphrase can decrypt an encrypted archive (no file written to disk)."""
    data = request.get_json(force=True) or {}
    path_text = (data.get("path") or "").strip()
    passphrase = (data.get("passphrase") or "").strip()
    if not path_text:
        return jsonify({"ok": False, "error": "path is required"}), 400
    if not passphrase:
        return jsonify({"ok": False, "error": "passphrase is required"}), 400
    if AESGCM is None:
        return jsonify(
            {
                "ok": False,
                "error": "cryptography package not installed on the server",
            }
        ), 500

    try:
        target = _resolve_or_remap(path_text)
    except ValueError:
        return jsonify({"ok": False, "error": "Encrypted file not found"}), 404
    if not target.exists() or not target.is_file():
        return jsonify({"ok": False, "error": "Encrypted file not found"}), 404

    # Decrypt to a temp file under WORKSPACE, then delete immediately.
    DECRYPT_DIR = WORKSPACE / ".decrypt_verify"
    DECRYPT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = DECRYPT_DIR / f"verify_{uuid4().hex}"
    try:
        meta = decrypt_file_with_passphrase(target, passphrase, out_path)
        if out_path.exists():
            out_path.unlink()
        return jsonify(
            {
                "ok": True,
                "verified": True,
                "source_name": meta.get("source_name"),
                "algorithm": meta.get("algorithm"),
                "bytes": meta.get("bytes"),
            }
        )
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e), "verified": False}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.post("/api/encryption/decrypt")
def api_encryption_decrypt():
    """Decrypt an encrypted archive and stream the plaintext file to the client."""
    data = request.get_json(force=True) or {}
    path_text = (data.get("path") or "").strip()
    passphrase = (data.get("passphrase") or "").strip()
    if not path_text:
        return jsonify({"ok": False, "error": "path is required"}), 400
    if not passphrase:
        return jsonify({"ok": False, "error": "passphrase is required"}), 400
    if AESGCM is None:
        return jsonify(
            {
                "ok": False,
                "error": "cryptography package not installed on the server",
            }
        ), 500

    try:
        target = _resolve_or_remap(path_text)
    except ValueError:
        return jsonify({"ok": False, "error": "Encrypted file not found"}), 404
    if not target.exists() or not target.is_file():
        return jsonify({"ok": False, "error": "Encrypted file not found"}), 404

    DECRYPT_DIR = WORKSPACE / "decrypted"
    DECRYPT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = DECRYPT_DIR / f"{uuid4().hex}_{target.stem}"
    if out_path.name.endswith(".enc"):
        out_path = out_path.with_name(out_path.name[:-4])

    try:
        meta = decrypt_file_with_passphrase(target, passphrase, out_path)
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

    download_name = meta.get("source_name") or out_path.name
    return send_file(
        out_path,
        as_attachment=True,
        download_name=download_name,
    )


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
