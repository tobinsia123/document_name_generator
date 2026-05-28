# Project Z

A document metadata extraction and renaming system for financial research files.

## Overview

Project Z standardizes messy financial research documents into a consistent filename schema. It extracts metadata from filenames, folder paths, and document contents, then produces renamed copies, manifests, grouped archives, and optional database records. The project is designed for research, finance, compliance, and data operations teams that need traceable document organization across analyst reports, earnings call transcripts, and SEC filings. It matters because inconsistent document names make downstream search, audit, ingestion, and retrieval workflows harder to trust.

## Key Features

- Renames files into a structured format: `{ticker}_{publisher}_{report_type}_{year_quarter}_{language}_{publication_date}.{ext}`.
- Supports analyst reports, earnings call transcripts, SEC filings, PDFs, DOCX files, and plain text files.
- Extracts metadata from filenames first, then falls back to document text when needed.
- Generates JSON job manifests with original filenames, inferred metadata, output paths, and job summaries.
- Copies renamed files without mutating the raw source dataset.
- Groups files by configurable Quickfinder metadata fields.
- Creates `.tar.zst` archives and optional AES-256-GCM encrypted archive outputs.
- Provides CLI, Flask web UI, optional Neon PostgreSQL indexing, and a Next.js frontend prototype.

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts
- **Backend:** Python, Flask, argparse-based CLI
- **Database:** Neon PostgreSQL, optional metadata-only indexing
- **AI/ML:** Rule-based metadata extraction today, with extension points for model-assisted inference
- **Infrastructure/Deployment:** Local filesystem processing, Vercel-compatible frontend, optional Neon cloud database
- **Tooling:** npm, pip, ESLint, TypeScript, pdfplumber, python-docx, zstandard, cryptography

## System Architecture / Workflow

1. Collect raw financial documents from source folders such as `analyst_reports`, `earnings_call_transcripts`, and `sec_filings`.
2. Extract text from supported files and infer metadata from filenames, folder context, and document content.
3. Generate standardized filenames while preserving original files and writing a JSON manifest.
4. Copy renamed files into an output workspace and group them by configurable metadata fields.
5. Optionally create compressed archives, encrypt archive outputs, and sync metadata to Neon PostgreSQL.

## Repository Structure

```text
.
├── README.md                         # Project overview and setup guide
├── frontend/                         # Next.js dashboard and enterprise UI prototype
│   ├── app/                          # App Router pages and layouts
│   ├── components/                   # UI, layout, chart, and shared components
│   ├── lib/                          # Domain types, navigation, mock data, utilities
│   └── package.json                  # Frontend dependencies and scripts
└── raw_data/AMAZON/                  # Python pipeline and sample AMZN document dataset
    ├── document_title_generator.py   # Core metadata extraction, renaming, archive logic
    ├── pipeline.py                   # One-command DB sync, rename, copy, archive flow
    ├── database.py                   # Optional Neon PostgreSQL schema and persistence
    ├── web_app.py                    # Local Flask UI for running rename jobs
    ├── requirements.txt              # Python dependencies
    ├── analyst_reports/              # Raw analyst report PDFs
    ├── earnings_call_transcripts/    # Raw earnings transcript PDFs
    ├── sec_filings/                  # Raw SEC filing PDFs
    ├── name*/                        # Example renamed outputs
    └── templates/, static/           # Flask UI assets
```

## Installation & Setup

1. Clone the repository.

```bash
git clone [repository-url]
cd document_name_generator
```

2. Install Python dependencies.

```bash
cd raw_data/AMAZON
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. Configure environment variables if using Neon PostgreSQL.

```bash
cp .env.example .env
# Set DATABASE_URL in raw_data/AMAZON/.env
```

4. Install frontend dependencies.

```bash
cd ../../frontend
npm install
```

5. Run locally.

```bash
# Python pipeline
cd ../raw_data/AMAZON
python pipeline.py ./analyst_reports --ticker AMZN --dry-run --no-db

# Frontend prototype
cd ../../frontend
npm run dev
```

## Usage

1. Place source documents in a folder or use the included AMZN sample folders.
2. Run a dry run to review inferred names before writing outputs.

```bash
python document_title_generator.py ./analyst_reports --recursive --dry-run --copy-to ./ui_workspace/renamed
```

3. Run the full pipeline when the preview looks correct.

```bash
python pipeline.py ./analyst_reports --ticker AMZN --no-db
```

4. Launch the Flask job runner for a local browser workflow.

```bash
python web_app.py
```

5. Open the Next.js frontend at `http://localhost:3000` after running `npm run dev`.

## Core Technical Challenges / Engineering Decisions

- **Heterogeneous source quality:** Analyst reports often include useful metadata in filenames, while SEC filings may use opaque IDs. The pipeline combines filename parsing, folder context, and content extraction instead of depending on a single source.
- **Safety-first file handling:** Raw documents are preserved, renamed files are copied to a workspace, and each job writes a manifest for review and rollback workflows.
- **Deterministic extraction over model dependency:** The current implementation uses rule-based inference for predictable local execution. Model-assisted extraction can be added later for ambiguous documents without changing the filename contract.
- **Operational traceability:** Job manifests, SHA-256 checksums, optional database records, and archive metadata make the pipeline easier to audit and debug.
- **Prototype-to-product UI path:** The Flask UI supports local job execution, while the Next.js app demonstrates how the workflow could be presented in an enterprise governance product.

## Future Improvements

- Add automated tests for metadata extraction, archive creation, rollback, and edge-case filenames.
- Add a review queue for low-confidence metadata before files are copied.
- Support additional tickers, publishers, languages, and document categories through configuration files.
- Add confidence scores and provenance fields for each inferred metadata value.
- Replace mock frontend data with API-backed pipeline and database state.
- Add Docker or Docker Compose for reproducible local setup.
- Add CI checks for Python linting, TypeScript type checks, and frontend builds.
- Add hosted demo deployment and sanitized sample outputs.

## Contributors

Project Z was created by:

- Tobin Sia
- Raymond Ruchen
- Kevin Pedregosa
- Ethan An

## License

This project is currently unlicensed; add a `LICENSE` file before external distribution.
