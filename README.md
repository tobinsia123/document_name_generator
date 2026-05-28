# RoboVault

A document metadata extraction, renaming, and secure delivery system for financial research files.

RoboVault standardizes messy analyst reports, earnings transcripts, and SEC filings into a consistent filename schema, groups them for Quickfinder-style retrieval, and optionally seals them as encrypted archives. The repo includes a **Python processing pipeline** (CLI + Flask API) and a **Next.js enterprise UI** that runs jobs locally against your filesystem.

## Overview

Source documents are analyzed without mutating raw inputs. The pipeline infers metadata from filenames, folder paths, and document text, then produces renamed copies, JSON job manifests, grouped `.tar.zst` archives, and optional **AES-256-GCM** encrypted outputs (DRENC1 envelope). The web UI shows live job progress, review decisions, export downloads, and an encryption manager for passphrase verify/decrypt workflows.

## Key Features

- **Standardized naming:** `{ticker}_{publisher}_{report_type}_{year_quarter}_{language}_{publication_date}.{ext}`
- **Supported inputs:** PDF, DOCX, TXT; analyst reports, earnings transcripts, SEC filings
- **Safe processing:** raw files preserved; renamed copies written to a workspace; rollback via manifest
- **Grouping & archives:** Quickfinder groups → compressed `.tar.zst` bundles per group
- **Encryption:** optional passphrase-sealed `.tar.zst.enc` files (PBKDF2 + AES-256-GCM, DRENC1 header)
- **Decryption & delivery:** web decrypt (ZIP of PDFs) or macOS **RoboVault Opener** for double-click `.enc` unlock + PDF extract
- **Interfaces:** CLI (`document_title_generator.py`, `pipeline.py`), Flask API (`web_app.py`), Next.js UI (`frontend/`)

## Tech Stack

| Layer | Stack |
| ----- | ----- |
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Framer Motion, Recharts |
| **Backend** | Python 3, Flask, flask-cors, pdfplumber, python-docx, zstandard, cryptography |
| **Database** | Optional Neon PostgreSQL metadata indexing (`database.py`) |
| **Deployment** | Local filesystem jobs; Vercel for frontend static/SSR; Flask must run separately for live mode |

## System Workflow

1. **Ingest** — point the pipeline at a folder of source PDFs/docs (e.g. `sec_filings/`).
2. **Rename** — infer ticker, publisher, type, period, language, date; copy renamed files to output.
3. **Group** — cluster by Quickfinder fields (ticker, doc category, year/quarter, etc.).
4. **Archive** — bundle each group into `.tar.zst` (zstd compression).
5. **Encrypt** *(optional)* — seal archives with a user passphrase; plaintext archives removed by default.
6. **Manifest** — write `job_manifest.json` with paths, checksums, and archive metadata.
7. **Review / Export** — approve or flag files in the UI; download manifests, `.enc` archives, or decrypted document ZIPs.

## Repository Structure

```text
.
├── README.md
├── frontend/                         # RoboVault Next.js UI
│   ├── app/                          # Home, Dashboard, Upload, Review, Export, Encryption, …
│   ├── components/                   # App shell, charts, shared UI
│   ├── lib/                          # API client, types, backend status (live/demo)
│   └── public/                       # Logo assets (e.g. new_logo_part2.png)
└── raw_data/AMAZON/                  # Python pipeline + sample AMZN dataset
    ├── document_title_generator.py   # Core rename, group, archive, encrypt logic
    ├── drenc_crypto.py               # DRENC1 encrypt/decrypt helpers
    ├── archive_utils.py              # Extract .tar.zst → individual PDFs
    ├── open_enc.py                   # Desktop opener (passphrase prompt + PDF extract)
    ├── web_app.py                    # Flask REST API for the Next.js UI
    ├── pipeline.py                   # CLI: DB sync + rename + copy + archive
    ├── database.py                   # Optional Neon PostgreSQL
    ├── requirements.txt
    ├── tools/
    │   ├── RoboVault-Opener.app/     # macOS .enc file handler (bundle)
    │   ├── install-macos-opener.sh  # Register opener + pin Python path
    │   └── README-OPENER.md
    ├── sec_filings/                   # Sample SEC inputs
    └── ui_workspace/                  # Renamed files, archives, manifests (runtime)
```

## Installation

### 1. Clone and install Python deps

```bash
git clone [repository-url]
cd document_name_generator/raw_data/AMAZON
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Optional Neon DB:

```bash
cp .env.example .env
# Set DATABASE_URL in raw_data/AMAZON/.env
```

### 2. Install frontend deps

```bash
cd ../../frontend
npm install
```

## Run Locally (Live Mode)

Live mode requires **both** processes. The UI pill shows **LIVE** when Flask responds at `/api/config`.

```bash
# Terminal 1 — Flask API (default port 5001)
cd raw_data/AMAZON
python web_app.py

# Terminal 2 — Next.js
cd frontend
npm run dev
# open http://localhost:3000
```

Optional frontend override (`frontend/.env.local`):

```env
NEXT_PUBLIC_AEGIS_API=http://127.0.0.1:5001
```

Flask CORS (when frontend is not on localhost):

```env
AEGIS_CORS_ORIGINS=http://localhost:3000,https://your-app.vercel.app
```

## Usage

### CLI dry run

```bash
cd raw_data/AMAZON
python document_title_generator.py ./sec_filings --recursive --dry-run --copy-to ./ui_workspace/renamed
```

### Full pipeline job (CLI)

```bash
python pipeline.py ./sec_filings --ticker AMZN --no-db
```

### Web UI job (recommended)

1. Open **Upload** → set input/output paths, ticker, toggles (recursive, archive, encrypt).
2. Enter an encryption passphrase if **Encrypt archives** is enabled.
3. **Run pipeline** — watch rename → group → copy → archive → encrypt → manifest.
4. **Review** — approve/flag files (persisted via `/api/reviews`).
5. **Export** — download manifest, `.enc` archives, or open workspace in Finder.
6. **Encryption** (`/encryption`) — verify passphrase and download decrypted PDF ZIPs.

### Encrypted archives on macOS

`.enc` files use a custom format; macOS does not open them natively.

```bash
cd raw_data/AMAZON
./tools/install-macos-opener.sh
```

Or download **RoboVault Opener** from Export/Encryption in the UI. Double-click a `.tar.zst.enc` file, enter the Upload passphrase, and PDFs are extracted and opened.

CLI alternative:

```bash
python open_enc.py /path/to/AMZN_sec_filing_2020Q1.tar.zst.enc
```

See `raw_data/AMAZON/tools/README-OPENER.md` for details.

## Frontend: Live vs Demo

| Mode | When | Behavior |
| ---- | ---- | -------- |
| **LIVE** | Flask reachable from the browser | Real manifests, jobs, downloads, encryption APIs |
| **DEMO** | Backend offline or wrong API URL | Mock/sample data on some pages; job actions disabled |

**Vercel note:** deploying only the Next.js app to Vercel shows **DEMO** unless you also host the Flask API at a public HTTPS URL and set `NEXT_PUBLIC_AEGIS_API` in Vercel environment variables (with matching `AEGIS_CORS_ORIGINS` on the server). For full pipeline access, run both apps locally.

### Pages wired to the Flask backend

| Route | API |
| ----- | --- |
| `/` (Home) | Live status rail, dashboard KPIs when backend up |
| `/upload` | `/api/config`, `/api/browse`, `/api/run-async`, `/api/jobs/:id` |
| `/dashboard` | `/api/dashboard` |
| `/review` | `/api/manifest`, `/api/reviews` |
| `/export` | `/api/manifest`, `/api/file`, `/api/rollback` |
| `/encryption` | `/api/encryption`, verify, decrypt |
| `/files`, `/analysis` | `/api/manifest`, file download/open |

Other routes (compliance, policies, billing, team, etc.) use demo data for product storytelling.

## Flask API (summary)

| Endpoint | Purpose |
| -------- | ------- |
| `GET /api/config` | Defaults, ticker, grouping fields |
| `POST /api/run-async` | Start background rename job |
| `GET /api/jobs/:id` | Job status + events |
| `GET /api/manifest` | Latest `job_manifest.json` |
| `GET /api/dashboard` | KPI summary for dashboard |
| `GET/POST /api/reviews` | Persist approve/flag per file |
| `GET /api/encryption` | Encrypted archive posture |
| `POST /api/encryption/verify` | Test passphrase |
| `POST /api/encryption/decrypt` | Decrypt → ZIP of PDFs |
| `GET /api/opener/macos` | Download RoboVault Opener.app zip |
| `GET /api/file` | Download file from allowed paths |

## Core Engineering Notes

- **Heterogeneous sources:** filename rules + folder context + PDF/DOCX text extraction.
- **Deterministic naming:** rule-based inference for predictable local runs (LLM hooks optional).
- **Traceability:** SHA-256 checksums on archives and encrypted outputs; manifest is source of truth.
- **Encryption model:** passphrase never stored server-side; key derived per file via PBKDF2 (200k iterations).

## Future Improvements

- Hosted Flask backend for Vercel/production demos
- Automated tests for metadata extraction, encryption round-trip, rollback
- Entity-level PII/PHI detection for `/analysis`
- Docker Compose for one-command local setup
- CI for Python + TypeScript + frontend build

## Contributors

- Tobin Sia
- Raymond Ruchen
- Kevin Pedregosa
- Ethan An

## License

Proprietary — add a `LICENSE` file before external distribution.
