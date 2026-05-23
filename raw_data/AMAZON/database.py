"""
Neon PostgreSQL storage for documents, jobs, and archives.

Set DATABASE_URL in .env (Neon console -> Connection string).
Example:
  DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
"""

from __future__ import annotations

import json
import logging
import os
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    source_key TEXT NOT NULL UNIQUE,
    source_path TEXT,
    original_filename TEXT NOT NULL,
    new_filename TEXT,
    new_path TEXT,
    file_extension TEXT,
    file_size BIGINT,
    sha256 TEXT,
    ticker TEXT,
    publisher TEXT,
    report_type TEXT,
    year_quarter TEXT,
    language TEXT,
    publication_date TEXT,
    doc_category TEXT,
    quickfinder_group TEXT,
    process_status TEXT NOT NULL DEFAULT 'indexed',
    on_disk BOOLEAN NOT NULL DEFAULT FALSE,
    source_root TEXT,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
    id BIGSERIAL PRIMARY KEY,
    job_uuid UUID NOT NULL UNIQUE,
    input_path TEXT,
    ticker TEXT,
    dry_run BOOLEAN NOT NULL DEFAULT FALSE,
    manifest_path TEXT,
    copy_to_dir TEXT,
    archive_dir TEXT,
    group_by TEXT[],
    summary JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_documents (
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    result_key TEXT,
    copy_status TEXT,
    PRIMARY KEY (job_id, document_id)
);

CREATE TABLE IF NOT EXISTS archives (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    group_id TEXT NOT NULL,
    archive_path TEXT,
    checksum_sha256 TEXT,
    file_count INT,
    status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_ticker ON documents(ticker);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(doc_category);
CREATE INDEX IF NOT EXISTS idx_documents_year_quarter ON documents(year_quarter);
CREATE INDEX IF NOT EXISTS idx_documents_on_disk ON documents(on_disk);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
"""


def get_database_url() -> Optional[str]:
    return os.environ.get("DATABASE_URL") or os.environ.get("NEON_DATABASE_URL")


def is_db_configured() -> bool:
    return bool(get_database_url())


@contextmanager
def get_connection():
    url = get_database_url()
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Add your Neon connection string to .env"
        )
    import psycopg2
    from psycopg2.extras import RealDictCursor

    conn = psycopg2.connect(url, cursor_factory=RealDictCursor)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_schema() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(SCHEMA_SQL)
    logger.info("Database schema initialized")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _file_sha256(path: Path) -> Optional[str]:
    import hashlib

    if not path.is_file():
        return None
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _source_key(source_path: Optional[str], original_filename: str) -> str:
    if source_path:
        return str(Path(source_path).resolve())
    return original_filename


def upsert_document(
    cur,
    *,
    source_key: str,
    original_filename: str,
    source_path: Optional[str] = None,
    new_filename: Optional[str] = None,
    new_path: Optional[str] = None,
    file_extension: Optional[str] = None,
    file_size: Optional[int] = None,
    sha256: Optional[str] = None,
    metadata: Optional[dict] = None,
    quickfinder_group: Optional[str] = None,
    process_status: str = "indexed",
    on_disk: bool = False,
    source_root: Optional[str] = None,
) -> int:
    meta = metadata or {}
    cur.execute(
        """
        INSERT INTO documents (
            source_key, source_path, original_filename, new_filename, new_path,
            file_extension, file_size, sha256, ticker, publisher, report_type,
            year_quarter, language, publication_date, doc_category,
            quickfinder_group, process_status, on_disk, source_root, updated_at
        ) VALUES (
            %(source_key)s, %(source_path)s, %(original_filename)s, %(new_filename)s,
            %(new_path)s, %(file_extension)s, %(file_size)s, %(sha256)s,
            %(ticker)s, %(publisher)s, %(report_type)s, %(year_quarter)s,
            %(language)s, %(publication_date)s, %(doc_category)s,
            %(quickfinder_group)s, %(process_status)s, %(on_disk)s,
            %(source_root)s, %(updated_at)s
        )
        ON CONFLICT (source_key) DO UPDATE SET
            source_path = COALESCE(EXCLUDED.source_path, documents.source_path),
            original_filename = EXCLUDED.original_filename,
            new_filename = COALESCE(EXCLUDED.new_filename, documents.new_filename),
            new_path = COALESCE(EXCLUDED.new_path, documents.new_path),
            file_extension = COALESCE(EXCLUDED.file_extension, documents.file_extension),
            file_size = COALESCE(EXCLUDED.file_size, documents.file_size),
            sha256 = COALESCE(EXCLUDED.sha256, documents.sha256),
            ticker = COALESCE(EXCLUDED.ticker, documents.ticker),
            publisher = COALESCE(EXCLUDED.publisher, documents.publisher),
            report_type = COALESCE(EXCLUDED.report_type, documents.report_type),
            year_quarter = COALESCE(EXCLUDED.year_quarter, documents.year_quarter),
            language = COALESCE(EXCLUDED.language, documents.language),
            publication_date = COALESCE(EXCLUDED.publication_date, documents.publication_date),
            doc_category = COALESCE(EXCLUDED.doc_category, documents.doc_category),
            quickfinder_group = COALESCE(EXCLUDED.quickfinder_group, documents.quickfinder_group),
            process_status = EXCLUDED.process_status,
            on_disk = EXCLUDED.on_disk OR documents.on_disk,
            source_root = COALESCE(EXCLUDED.source_root, documents.source_root),
            updated_at = EXCLUDED.updated_at
        RETURNING id
        """,
        {
            "source_key": source_key,
            "source_path": source_path,
            "original_filename": original_filename,
            "new_filename": new_filename,
            "new_path": new_path,
            "file_extension": file_extension,
            "file_size": file_size,
            "sha256": sha256,
            "ticker": meta.get("ticker"),
            "publisher": meta.get("publisher"),
            "report_type": meta.get("report_type"),
            "year_quarter": meta.get("year_quarter"),
            "language": meta.get("language"),
            "publication_date": meta.get("publication_date"),
            "doc_category": meta.get("doc_category"),
            "quickfinder_group": quickfinder_group,
            "process_status": process_status,
            "on_disk": on_disk,
            "source_root": source_root,
            "updated_at": _utc_now(),
        },
    )
    row = cur.fetchone()
    return int(row["id"])


def persist_job_manifest(manifest: dict) -> Optional[int]:
    """Save a completed job manifest to Neon. Returns jobs.id or None if DB off."""
    if not is_db_configured():
        return None

    from psycopg2.extras import Json

    from document_title_generator import quickfinder_group_key

    group_by = tuple(manifest.get("group_by") or ())
    results = manifest.get("detailed_results") or {}
    quickfinder = manifest.get("quickfinder_groups") or {}

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO jobs (
                    job_uuid, input_path, ticker, dry_run, manifest_path,
                    copy_to_dir, archive_dir, group_by, summary
                ) VALUES (
                    %(job_uuid)s::uuid, %(input_path)s, %(ticker)s, %(dry_run)s,
                    %(manifest_path)s, %(copy_to_dir)s, %(archive_dir)s,
                    %(group_by)s, %(summary)s
                )
                RETURNING id
                """,
                {
                    "job_uuid": manifest["job_id"],
                    "input_path": manifest.get("input_path"),
                    "ticker": manifest.get("ticker"),
                    "dry_run": manifest.get("dry_run", False),
                    "manifest_path": manifest.get("manifest_path"),
                    "copy_to_dir": manifest.get("copy_to_dir"),
                    "archive_dir": manifest.get("archive_dir"),
                    "group_by": group_by or None,
                    "summary": Json(manifest.get("summary") or {}),
                },
            )
            job_id = int(cur.fetchone()["id"])

            for result_key, data in results.items():
                meta = data.get("metadata") or {}
                gid = quickfinder_group_key(meta, group_by) if group_by else None
                original = data.get("original_filename") or Path(result_key).name
                new_path = data.get("new_path")
                source_path = str(Path(manifest["input_path"]) / result_key) if manifest.get("input_path") else result_key
                sk = _source_key(source_path if Path(source_path).exists() else None, original)

                status = "renamed" if data.get("new_filename") else "failed"
                if manifest.get("dry_run"):
                    status = "dry_run"

                doc_id = upsert_document(
                    cur,
                    source_key=sk,
                    source_path=source_path,
                    original_filename=original,
                    new_filename=data.get("new_filename"),
                    new_path=new_path,
                    file_extension=Path(original).suffix.lower() or None,
                    sha256=_file_sha256(Path(new_path)) if new_path and Path(new_path).exists() else None,
                    metadata=meta,
                    quickfinder_group=gid,
                    process_status=status,
                    on_disk=Path(source_path).exists() if source_path else False,
                    source_root=manifest.get("input_path"),
                )
                cur.execute(
                    """
                    INSERT INTO job_documents (job_id, document_id, result_key, copy_status)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (job_id, document_id) DO UPDATE SET
                        result_key = EXCLUDED.result_key,
                        copy_status = EXCLUDED.copy_status
                    """,
                    (job_id, doc_id, result_key, data.get("copy_status")),
                )

            for gid, info in quickfinder.items():
                arch = info.get("archive") or {}
                if not arch.get("archive_path"):
                    continue
                cur.execute(
                    """
                    INSERT INTO archives (job_id, group_id, archive_path, checksum_sha256, file_count, status)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        job_id,
                        gid,
                        arch.get("archive_path"),
                        arch.get("checksum_sha256"),
                        arch.get("file_count"),
                        arch.get("status"),
                    ),
                )

    logger.info("Job %s persisted to database (id=%s)", manifest["job_id"], job_id)
    return job_id


def sync_directory(
    root: Path,
    *,
    recursive: bool = True,
    extract_metadata: bool = False,
    ticker: str = "AMZN",
) -> dict:
    """
    Index all supported files under root into the database.
    """
    from document_title_generator import (
        DEFAULT_TICKER,
        DocumentRenamer,
        SUPPORTED_EXTENSIONS,
        quickfinder_group_key,
        DEFAULT_GROUP_BY,
    )

    root = root.resolve()
    if not root.exists():
        raise FileNotFoundError(f"Directory not found: {root}")

    if extract_metadata:
        renamer = DocumentRenamer(ticker=ticker or DEFAULT_TICKER)
    else:
        renamer = None

    files: List[Path] = []
    if root.is_file():
        files = [root]
    elif recursive:
        for ext in SUPPORTED_EXTENSIONS:
            files.extend(root.rglob(f"*{ext}"))
    else:
        for ext in SUPPORTED_EXTENSIONS:
            files.extend(root.glob(f"*{ext}"))

    indexed = 0
    with_metadata = 0

    with get_connection() as conn:
        with conn.cursor() as cur:
            for fp in sorted(files):
                if not fp.is_file():
                    continue
                try:
                    rel = str(fp.relative_to(root))
                except ValueError:
                    rel = fp.name
                meta = None
                new_filename = None
                status = "indexed"

                if renamer:
                    try:
                        m, new_filename = renamer.generate_new_filename(fp)
                        meta = {
                            "ticker": m.ticker,
                            "publisher": m.publisher,
                            "report_type": m.report_type,
                            "year_quarter": m.year_quarter,
                            "language": m.language,
                            "publication_date": m.publication_date,
                            "doc_category": m.doc_category,
                        }
                        status = "renamed"
                        with_metadata += 1
                    except Exception as e:
                        logger.warning("Metadata skip %s: %s", fp, e)

                gid = quickfinder_group_key(meta, DEFAULT_GROUP_BY) if meta else None
                upsert_document(
                    cur,
                    source_key=str(fp.resolve()),
                    source_path=str(fp.resolve()),
                    original_filename=fp.name,
                    new_filename=new_filename,
                    file_extension=fp.suffix.lower(),
                    file_size=fp.stat().st_size,
                    sha256=_file_sha256(fp),
                    metadata=meta,
                    quickfinder_group=gid,
                    process_status=status,
                    on_disk=True,
                    source_root=str(root),
                )
                indexed += 1

    return {"indexed": indexed, "with_metadata": with_metadata, "root": str(root)}


def import_manifest_json(path: Path, *, source_root: Optional[Path] = None) -> dict:
    """Import rename_results.json or job_manifest.json into the database."""
    path = path.resolve()
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    results = data.get("detailed_results") or {}
    if not results and data.get("filename_mapping"):
        for k, v in data["filename_mapping"].items():
            results[k] = {
                "original_filename": Path(k).name,
                "new_filename": v,
                "status": "Success",
                "metadata": {},
            }

    imported = 0
    root = source_root.resolve() if source_root else None

    with get_connection() as conn:
        with conn.cursor() as cur:
            for key, row in results.items():
                original = row.get("original_filename") or Path(key).name
                meta = row.get("metadata") or {}
                new_path = row.get("new_path")
                source_path = None
                on_disk = False
                if root:
                    candidate = root / key
                    if candidate.exists():
                        source_path = str(candidate.resolve())
                        on_disk = True
                    else:
                        candidate = root / original
                        if candidate.exists():
                            source_path = str(candidate.resolve())
                            on_disk = True
                if new_path and Path(new_path).exists():
                    on_disk = True

                sk = _source_key(source_path, original)
                upsert_document(
                    cur,
                    source_key=sk,
                    source_path=source_path,
                    original_filename=original,
                    new_filename=row.get("new_filename"),
                    new_path=new_path,
                    file_extension=Path(original).suffix.lower() or None,
                    sha256=_file_sha256(Path(source_path)) if source_path else None,
                    metadata=meta,
                    process_status="legacy_import" if not on_disk else "renamed",
                    on_disk=on_disk,
                    source_root=str(root) if root else None,
                )
                imported += 1

    if data.get("job_id"):
        persist_job_manifest(data)

    return {"imported": imported, "file": str(path)}


def get_stats() -> dict:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    COUNT(*) AS total_documents,
                    COUNT(*) FILTER (WHERE on_disk) AS on_disk,
                    COUNT(*) FILTER (WHERE new_filename IS NOT NULL) AS renamed,
                    COUNT(DISTINCT ticker) AS tickers
                FROM documents
                """
            )
            doc_stats = dict(cur.fetchone())
            cur.execute("SELECT COUNT(*) AS total_jobs FROM jobs")
            job_stats = dict(cur.fetchone())
    return {**doc_stats, **job_stats}


def list_documents(
    *,
    limit: int = 100,
    offset: int = 0,
    ticker: Optional[str] = None,
    doc_category: Optional[str] = None,
    on_disk: Optional[bool] = None,
    search: Optional[str] = None,
) -> List[dict]:
    clauses = ["1=1"]
    params: dict = {"limit": limit, "offset": offset}

    if ticker:
        clauses.append("ticker = %(ticker)s")
        params["ticker"] = ticker
    if doc_category:
        clauses.append("doc_category = %(doc_category)s")
        params["doc_category"] = doc_category
    if on_disk is not None:
        clauses.append("on_disk = %(on_disk)s")
        params["on_disk"] = on_disk
    if search:
        clauses.append(
            "(original_filename ILIKE %(search)s OR new_filename ILIKE %(search)s)"
        )
        params["search"] = f"%{search}%"

    where = " AND ".join(clauses)
    sql = f"""
        SELECT id, source_key, original_filename, new_filename, new_path,
               ticker, publisher, report_type, year_quarter, doc_category,
               quickfinder_group, process_status, on_disk, updated_at
        FROM documents
        WHERE {where}
        ORDER BY updated_at DESC
        LIMIT %(limit)s OFFSET %(offset)s
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    out = []
    for r in rows:
        d = dict(r)
        if d.get("updated_at"):
            d["updated_at"] = d["updated_at"].isoformat()
        out.append(d)
    return out


def bootstrap_from_project(app_dir: Path) -> dict:
    """
    One-shot: init schema + import legacy JSON + sync known folders.
    """
    app_dir = app_dir.resolve()
    init_schema()
    report: dict = {"schema": "ok", "imports": [], "syncs": []}

    legacy = app_dir / "rename_results.json"
    if legacy.exists():
        report["imports"].append(
            import_manifest_json(legacy, source_root=app_dir)
        )

    for name in ("test_sample", "ui_workspace/renamed"):
        folder = app_dir / name
        if folder.exists():
            report["syncs"].append(sync_directory(folder, extract_metadata=True))

    return report
