#!/usr/bin/env python3
"""
One-command pipeline: index folder -> Neon DB -> rename -> copy -> archive.

Files stay on your disk. Neon stores metadata only (names, paths, ticker, etc.).

Usage:
  python pipeline.py /path/to/your/pdfs
  python pipeline.py /path/to/pdfs --dry-run
  python pipeline.py /path/to/pdfs --ticker AMZN --no-archive
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent
WORKSPACE = APP_DIR / "ui_workspace"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Index documents in Neon, then rename, copy, and archive."
    )
    parser.add_argument("input_dir", help="Folder containing PDF/DOCX/TXT files")
    parser.add_argument("--ticker", default="AMZN")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-archive", action="store_true")
    parser.add_argument("--no-db", action="store_true", help="Skip Neon indexing")
    parser.add_argument(
        "--output-dir",
        default=str(WORKSPACE),
        help="Base folder for renamed/ and archives/",
    )
    args = parser.parse_args()

    input_dir = Path(args.input_dir).resolve()
    if not input_dir.is_dir():
        print(f"Error: not a directory: {input_dir}", file=sys.stderr)
        sys.exit(1)

    out = Path(args.output_dir).resolve()
    renamed_dir = out / "renamed"
    archive_dir = out / "archives"
    manifest_path = out / "job_manifest.json"

    report: dict = {"input_dir": str(input_dir), "steps": []}

    # Step 1: Index into Neon (metadata only)
    if not args.no_db:
        try:
            from database import is_db_configured, init_schema, sync_directory

            if not is_db_configured():
                print(
                    "Warning: DATABASE_URL not set in .env — skipping DB index.\n"
                    "         Add Neon URL to .env to enable.",
                    file=sys.stderr,
                )
            else:
                init_schema()
                db_report = sync_directory(
                    input_dir,
                    recursive=True,
                    extract_metadata=True,
                    ticker=args.ticker,
                )
                report["steps"].append({"db_sync": db_report})
                print(f"[1/2] Neon: indexed {db_report['indexed']} files")
        except ImportError:
            print("Warning: pip install psycopg2-binary python-dotenv", file=sys.stderr)

    # Step 2: Rename, copy, archive
    from document_title_generator import JobConfig, run_job

    manifest = run_job(
        JobConfig(
            input_path=input_dir,
            output_file=manifest_path,
            ticker=args.ticker,
            recursive=True,
            copy_to_dir=renamed_dir,
            archive=not args.no_archive,
            archive_dir=archive_dir,
            dry_run=args.dry_run,
        )
    )
    report["steps"].append({"job": manifest.get("summary")})
    report["manifest"] = str(manifest_path)
    report["renamed_dir"] = str(renamed_dir)

    mode = "DRY RUN" if args.dry_run else "DONE"
    print(f"[2/2] Job {mode}: {manifest['summary']}")
    print(f"      Manifest: {manifest_path}")
    print(f"      Renamed:  {renamed_dir}")

    summary_path = out / "pipeline_report.json"
    summary_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"      Report:   {summary_path}")


if __name__ == "__main__":
    main()
