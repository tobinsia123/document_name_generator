# Research Engineering Design Exercise
**Designing a Document Renaming System for Financial Research Data**

---

## Overview

You are helping design a system that organizes financial research documents by renaming them using a **consistent, structured filename format**.

This is a **design and reasoning exercise**, not a coding assignment. You are **not required to build or implement the system**, but you should explain clearly **how it would work**, step by step.

You should assume the system may later be implemented by another engineer, so clarity and practicality matter.

**Timebox:** 60–120 minutes. It's okay if you don't finish everything.

**Focus:** system design, reasoning, and communication

---

## Document Types

The system must handle **three types of documents**, each with different characteristics:

### 1. Analyst Reports
- Written by financial research firms (e.g., CFRA, Evercore, Morningstar)
- Titles are often long, descriptive, and inconsistent
- In some instances all of the necessary information appears in the filename; it is possible that for select documents key information must be inferred either from the file tree or the document content itself.

### 2. Earnings Call Transcripts
- Records of quarterly earnings calls
- Usually include the year, quarter, and call date clearly
- More structured than analyst reports

### 3. SEC Filings
- Official regulatory documents (10-K, 10-Q, 8-K, Annual Reports, Earnings Releases)
- Filenames may be opaque or meaningless (e.g., random IDs)
- Key information often appears **inside the document**, not the filename

---

## Target Filename Format

All files should be renamed to follow this format:

```
{ticker}_{publisher}_{report_type}_{year_quarter}_{language}_{publication_date}.{ext}
```

### Example

```
AMZN_EVERCORE_ANALYSTREPORT_2022Q2_EN_2022-06-02.pdf
```

---

## Data Dictionary

### ticker
- Stock ticker symbol (uppercase), e.g. `AMZN`, `AMD`
- Assume this is known from the folder name

### publisher
- The organization that produced the document
- Use a standardized uppercase code (e.g., `CFRA`, `EVERCORE`, `MORNINGSTAR`, `ZACKS`, `SEC`)

### report_type

**Analyst Reports**
`ANALYSTREPORT`,

- Optionally you may include a subtype from the following list:
    - `INIT`, `UPDATE`, `RESEARCH`, `PREVIEW`, `REVIEW`, `ROADSHOW`, `INVESTORDAY`, `CMD`, `BUYBACK`, `ESG`, `SECTOR`, `COMPANYBRIEF`, `RISK`

**Earnings Calls**
`EARNINGS_CALL`

**SEC Filings**
`10-K`, `10-Q`, `8-K`, `ANNUAL_REPORT`, `EARNINGS_RELEASE`, `EARNINGS_PRESENTATION`, `CONFERENCE_CALL_SLIDES`

### year_quarter
- Format: `YYYYQ#` (e.g., `2022Q2`)

### language
- Two-letter language code
- Default: `EN`

### report_date
- Format: `YYYY-MM-DD`
- If unknown, use `NA`

### ext
- Preserve original file extension

---

## Your Task

Design a **system or process** that could rename all documents correctly using the format above.

You may use **any technical tools** to which you have access (or tools that it would be reasonable for a research team to have access), but you must clearly explain:
- What each step/component does
- Why it is needed
- What challenges or issues might be encountered
- How the system addresses those challenges

You have been given a dataset of about **150 documents** spanning the three types above that were drawn from a recently completed data collection process.

---

## What Your Design Should Include

### 1. High-Level System Flow
Explain the overall pipeline from raw files to renamed files.

### 2. Metadata Extraction
Describe how information (meta data) used to rename the document is derived from:
- Filenames
- Folder structure
- Document contents (when needed)

### 3. Common Challenges & Mitigations
Identify at least **three challenges** (e.g., missing dates, ambiguous report types, duplicates) and how your system handles them.

### 4. Validation & Safety
Explain safeguards such as:
- Preserving original filenames
- Preventing overwrites
- Manual review steps

### 5. Worked Examples
Provide **three examples**:
- One analyst report
- One earnings call
- One SEC filing

Show original filename → renamed filename, with brief explanation.

---

## Evaluation Criteria

We are looking for:
- Clear reasoning
- Practical system design
- Awareness of real-world data issues
- Strong communication

---

## Deliverable

A short design document. Diagrams are welcome.

---

If you have any questions or concerns, please reach out to the hiring team for clarification. Good luck!
