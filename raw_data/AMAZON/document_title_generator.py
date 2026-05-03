#!/usr/bin/env python3
"""
Document Renamer

Automatically renames documents using a standardized format:
{ticker}_{publisher}_{report_type}_{year_quarter}_{language}_{publication_date}.{ext}

Handles three document types:
- Analyst Reports (CFRA, Evercore, Morningstar, Zacks, etc.)
- Earnings Call Transcripts
- SEC Filings (10-K, 10-Q, 8-K, Annual Reports, etc.)

Supported file types: .txt, .pdf, .docx

Author: Ethan An
"""

import os
import re
import json
import shutil
import argparse
import logging
from pathlib import Path
from typing import Optional, Dict, Tuple, List
from dataclasses import dataclass, asdict

# Document processing libraries
import pdfplumber
from docx import Document

# Note: torch and transformers are no longer required
# The renamer uses pattern matching, not ML models

# =============================================================================
# CONFIGURATION
# =============================================================================

# Model configuration
DEFAULT_MODEL_NAME = "google/flan-t5-base"
MAX_INPUT_TOKENS = 512
MAX_PDF_PAGES = 3  # Extract more pages for better metadata detection

# Text extraction configuration
MAX_TEXT_CHARS = 8000

# Supported file extensions
SUPPORTED_EXTENSIONS = {".txt", ".pdf", ".docx"}

# Default values
DEFAULT_TICKER = "AMZN"
DEFAULT_LANGUAGE = "EN"

# =============================================================================
# PUBLISHER MAPPINGS
# =============================================================================

# Map variations of publisher names to standardized codes
PUBLISHER_MAPPINGS = {
    # Analyst report publishers
    "cfra": "CFRA",
    "cfraequityresearch": "CFRA",
    "evercore": "EVERCORE",
    "evercoreisi": "EVERCORE",
    "morningstar": "MORNINGSTAR",
    "morningstarinc": "MORNINGSTAR",
    "zacks": "ZACKS",
    "zacksinvestmentresearch": "ZACKS",
    "zacksinvestmentresearchinc": "ZACKS",
    "jefferson": "JEFFERSON",
    "jeffersonresearch": "JEFFERSON",
    "jeffersonresearchmanagement": "JEFFERSON",
    "jeffersonfinancial": "JEFFERSON",
    # SEC filings
    "sec": "SEC",
    "securities": "SEC",
    # Company (for earnings calls)
    "amazon": "AMAZON",
    "amazoncom": "AMAZON",
    "amazoncominc": "AMAZON",
}

# =============================================================================
# REPORT TYPE MAPPINGS
# =============================================================================

# SEC Filing types
SEC_REPORT_TYPES = {
    "10-k": "10-K",
    "10k": "10-K",
    "form10-k": "10-K",
    "form 10-k": "10-K",
    "10-q": "10-Q",
    "10q": "10-Q",
    "form10-q": "10-Q",
    "form 10-q": "10-Q",
    "8-k": "8-K",
    "8k": "8-K",
    "form8-k": "8-K",
    "form 8-k": "8-K",
    "annual report": "ANNUAL_REPORT",
    "annualreport": "ANNUAL_REPORT",
    "earnings release": "EARNINGS_RELEASE",
    "earningsrelease": "EARNINGS_RELEASE",
    "earnings presentation": "EARNINGS_PRESENTATION",
    "webslides": "EARNINGS_PRESENTATION",
    "proxy": "PROXY",
    "proxy statement": "PROXY",
}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# =============================================================================
# METADATA DATA CLASS
# =============================================================================

@dataclass
class DocumentMetadata:
    """Structured metadata for document renaming."""
    ticker: str = DEFAULT_TICKER
    publisher: str = "UNKNOWN"
    report_type: str = "DOCUMENT"
    year_quarter: str = "NA"
    language: str = DEFAULT_LANGUAGE
    publication_date: str = "NA"
    doc_category: str = "unknown"  # analyst_report, earnings_call, sec_filing
    
    def to_filename(self, extension: str) -> str:
        """Generate standardized filename from metadata."""
        parts = [
            self.ticker,
            self.publisher,
            self.report_type,
            self.year_quarter,
            self.language,
            self.publication_date
        ]
        return "_".join(parts) + extension


# =============================================================================
# TEXT EXTRACTION FUNCTIONS
# =============================================================================

def extract_text_from_txt(file_path: Path) -> Optional[str]:
    """
    Extract text content from a plain text file.
    
    Args:
        file_path: Path to the .txt file
        
    Returns:
        Extracted text content or None if extraction fails
    """
    try:
        # Try common encodings
        encodings = ["utf-8", "latin-1", "cp1252"]
        
        for encoding in encodings:
            try:
                with open(file_path, "r", encoding=encoding) as f:
                    text = f.read()
                logger.debug(f"Successfully read {file_path} with {encoding} encoding")
                return text
            except UnicodeDecodeError:
                continue
        
        logger.warning(f"Could not decode {file_path} with any supported encoding")
        return None
        
    except Exception as e:
        logger.error(f"Error extracting text from {file_path}: {e}")
        return None


def extract_text_from_pdf(file_path: Path, max_pages: int = MAX_PDF_PAGES) -> Optional[str]:
    """
    Extract text content from a PDF file using pdfplumber.
    
    Args:
        file_path: Path to the .pdf file
        max_pages: Maximum number of pages to extract (default: 2)
        
    Returns:
        Extracted text content or None if extraction fails
    """
    try:
        text_parts = []
        
        with pdfplumber.open(file_path) as pdf:
            # Limit to first N pages for efficiency
            pages_to_extract = min(len(pdf.pages), max_pages)
            
            for i in range(pages_to_extract):
                page = pdf.pages[i]
                page_text = page.extract_text()
                
                if page_text:
                    text_parts.append(page_text)
        
        if not text_parts:
            logger.warning(f"No text extracted from PDF: {file_path}")
            return None
            
        return "\n".join(text_parts)
        
    except Exception as e:
        logger.error(f"Error extracting text from PDF {file_path}: {e}")
        return None


def extract_text_from_docx(file_path: Path) -> Optional[str]:
    """
    Extract text content from a Word document (.docx).
    
    Args:
        file_path: Path to the .docx file
        
    Returns:
        Extracted text content or None if extraction fails
    """
    try:
        doc = Document(file_path)
        
        # Extract text from all paragraphs
        text_parts = []
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text_parts.append(paragraph.text)
        
        if not text_parts:
            logger.warning(f"No text extracted from DOCX: {file_path}")
            return None
            
        return "\n".join(text_parts)
        
    except Exception as e:
        logger.error(f"Error extracting text from DOCX {file_path}: {e}")
        return None


def extract_text(file_path: Path) -> Optional[str]:
    """
    Extract text from a document file based on its extension.
    
    Dispatches to the appropriate extraction function based on file type.
    
    Args:
        file_path: Path to the document file
        
    Returns:
        Extracted text content or None if extraction fails
    """
    extension = file_path.suffix.lower()
    
    if extension == ".txt":
        return extract_text_from_txt(file_path)
    elif extension == ".pdf":
        return extract_text_from_pdf(file_path)
    elif extension == ".docx":
        return extract_text_from_docx(file_path)
    else:
        logger.warning(f"Unsupported file type: {extension}")
        return None


# =============================================================================
# TEXT PREPROCESSING FUNCTIONS
# =============================================================================

def clean_text(text: str) -> str:
    """
    Clean and normalize extracted text.
    
    Removes excessive whitespace, special characters, and normalizes formatting.
    
    Args:
        text: Raw extracted text
        
    Returns:
        Cleaned text
    """
    # Replace multiple newlines with single newline
    text = re.sub(r"\n{3,}", "\n\n", text)
    
    # Replace multiple spaces with single space
    text = re.sub(r" {2,}", " ", text)
    
    # Remove non-printable characters (except newlines and tabs)
    text = re.sub(r"[^\x20-\x7E\n\t]", " ", text)
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    return text


def skip_boilerplate(text: str) -> str:
    """
    Skip common legal/SEC boilerplate text at the start of documents.
    
    SEC filings often start with standardized headers that don't describe
    the actual content. This function tries to find where the real content begins.
    
    Args:
        text: Cleaned text from document
        
    Returns:
        Text with boilerplate header skipped
    """
    # Common boilerplate patterns to skip past
    skip_markers = [
        "UNITED STATES SECURITIES AND EXCHANGE COMMISSION",
        "SECURITIES AND EXCHANGE COMMISSION",
        "FORM 10-K",
        "FORM 10-Q", 
        "FORM 8-K",
        "ANNUAL REPORT PURSUANT TO SECTION",
        "QUARTERLY REPORT PURSUANT TO SECTION",
        "CURRENT REPORT PURSUANT TO SECTION",
        "For the transition period from",
        "Commission File Number",
        "Washington, D.C. 20549",
    ]
    
    # Find the last occurrence of any boilerplate marker
    last_boilerplate_pos = 0
    text_upper = text.upper()
    
    for marker in skip_markers:
        pos = text_upper.find(marker.upper())
        if pos != -1:
            # Find end of line after marker
            end_of_line = text.find("\n", pos + len(marker))
            if end_of_line != -1 and end_of_line > last_boilerplate_pos:
                last_boilerplate_pos = end_of_line
    
    # Skip past boilerplate if found, but keep at least 70% of text
    if last_boilerplate_pos > 0 and last_boilerplate_pos < len(text) * 0.3:
        return text[last_boilerplate_pos:].strip()
    
    return text


def truncate_text(text: str, max_chars: int = MAX_TEXT_CHARS) -> str:
    """
    Truncate text to a maximum character length.
    
    Attempts to truncate at sentence boundaries to maintain coherence.
    
    Args:
        text: Input text
        max_chars: Maximum number of characters
        
    Returns:
        Truncated text
    """
    if len(text) <= max_chars:
        return text
    
    # Truncate to max_chars
    truncated = text[:max_chars]
    
    # Try to end at a sentence boundary
    sentence_endings = [". ", "! ", "? ", ".\n", "!\n", "?\n"]
    last_boundary = -1
    
    for ending in sentence_endings:
        pos = truncated.rfind(ending)
        if pos > last_boundary:
            last_boundary = pos + 1  # Include the punctuation
    
    # If we found a sentence boundary in the last 30% of text, use it
    if last_boundary > max_chars * 0.7:
        truncated = truncated[:last_boundary]
    
    return truncated.strip()


def preprocess_text(text: str) -> str:
    """
    Full preprocessing pipeline for extracted text.
    
    Combines cleaning, boilerplate removal, and truncation to prepare text 
    for title generation.
    
    Args:
        text: Raw extracted text
        
    Returns:
        Preprocessed text ready for model input
    """
    # Step 1: Clean the text
    cleaned = clean_text(text)
    
    # Step 2: Skip legal boilerplate (SEC filings, etc.)
    content = skip_boilerplate(cleaned)
    
    # Step 3: Truncate to appropriate length
    truncated = truncate_text(content)
    
    return truncated


# =============================================================================
# METADATA EXTRACTION FUNCTIONS
# =============================================================================

def detect_document_category(filename: str, folder_path: str) -> str:
    """
    Detect the category of document based on filename and folder.
    
    Categories: analyst_report, earnings_call, sec_filing
    
    Args:
        filename: Original filename
        folder_path: Path to the folder containing the file
        
    Returns:
        Document category string
    """
    filename_lower = filename.lower()
    folder_lower = folder_path.lower()
    
    # Check folder name first
    if "analyst" in folder_lower or "report" in folder_lower:
        return "analyst_report"
    if "earnings" in folder_lower and "call" in folder_lower:
        return "earnings_call"
    if "transcript" in folder_lower:
        return "earnings_call"
    if "sec" in folder_lower or "filing" in folder_lower:
        return "sec_filing"
    
    # Check filename patterns
    analyst_keywords = ["cfra", "evercore", "morningstar", "zacks", "jefferson"]
    if any(kw in filename_lower for kw in analyst_keywords):
        return "analyst_report"
    
    if "earnings" in filename_lower and "call" in filename_lower:
        return "earnings_call"
    if "transcript" in filename_lower:
        return "earnings_call"
    
    # SEC filing patterns
    sec_patterns = ["10-k", "10-q", "8-k", "10k", "10q", "8k", 
                    "annual-report", "annual_report", "annualreport",
                    "webslides", "earnings-release", "earnings_release"]
    if any(p in filename_lower for p in sec_patterns):
        return "sec_filing"
    
    # UUID-like filenames are typically SEC filings
    if re.match(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$", filename_lower):
        return "sec_filing"
    
    return "unknown"


def extract_publisher_from_filename(filename: str) -> Optional[str]:
    """
    Extract publisher name from filename.
    
    Args:
        filename: Original filename
        
    Returns:
        Standardized publisher code or None
    """
    filename_lower = filename.lower().replace("_", "").replace("-", "").replace(" ", "")
    
    # Check against known publisher mappings
    for pattern, code in PUBLISHER_MAPPINGS.items():
        if pattern in filename_lower:
            return code
    
    # Try to extract from filename structure (e.g., "Publisher_Title_Date.pdf")
    parts = re.split(r"[_\-]", filename)
    if parts:
        first_part = parts[0].lower().replace(" ", "")
        if first_part in PUBLISHER_MAPPINGS:
            return PUBLISHER_MAPPINGS[first_part]
    
    return None


def extract_publisher_from_content(text: str) -> Optional[str]:
    """
    Extract publisher from document content.
    
    Args:
        text: Document text
        
    Returns:
        Standardized publisher code or None
    """
    text_lower = text.lower()
    
    # Check for publisher names in content
    publisher_patterns = [
        (r"cfra\s*equity\s*research", "CFRA"),
        (r"evercore\s*isi", "EVERCORE"),
        (r"morningstar[,\s]*inc", "MORNINGSTAR"),
        (r"zacks\s*investment\s*research", "ZACKS"),
        (r"jefferson\s*(research|financial)", "JEFFERSON"),
        (r"securities\s*and\s*exchange\s*commission", "SEC"),
        (r"amazon\.?com,?\s*inc", "AMAZON"),
    ]
    
    for pattern, code in publisher_patterns:
        if re.search(pattern, text_lower):
            return code
    
    return None


def extract_date_from_filename(filename: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract year_quarter and publication_date from filename.
    
    Args:
        filename: Original filename
        
    Returns:
        Tuple of (year_quarter in YYYYQ# format, publication_date in YYYY-MM-DD format)
    """
    year_quarter = None
    pub_date = None
    
    # Month name to number mapping
    month_map = {
        "jan": "01", "january": "01",
        "feb": "02", "february": "02",
        "mar": "03", "march": "03",
        "apr": "04", "april": "04",
        "may": "05",
        "jun": "06", "june": "06",
        "jul": "07", "july": "07",
        "aug": "08", "august": "08",
        "sep": "09", "sept": "09", "september": "09",
        "oct": "10", "october": "10",
        "nov": "11", "november": "11",
        "dec": "12", "december": "12",
    }
    
    # Month to quarter mapping (fiscal quarter ending)
    month_to_quarter = {
        "01": "Q4", "02": "Q4", "03": "Q1",
        "04": "Q1", "05": "Q2", "06": "Q2",
        "07": "Q2", "08": "Q3", "09": "Q3",
        "10": "Q3", "11": "Q4", "12": "Q4",
    }
    
    filename_lower = filename.lower()
    
    # Pattern 1: "Q# YYYY" or "Q#_YYYY" or "YYYYQ#"
    q_match = re.search(r"q([1-4])[_\s,-]*(\d{4})", filename_lower)
    if q_match:
        quarter = q_match.group(1)
        year = q_match.group(2)
        year_quarter = f"{year}Q{quarter}"
    
    # Pattern 2: "YYYY-Q#" or "YYYY_Q#"
    if not year_quarter:
        q_match = re.search(r"(\d{4})[_\s,-]*q([1-4])", filename_lower)
        if q_match:
            year = q_match.group(1)
            quarter = q_match.group(2)
            year_quarter = f"{year}Q{quarter}"
    
    # Pattern 3: "Mon_DD_YYYY" or "Mon DD, YYYY" (e.g., "Jun_04_2022")
    date_match = re.search(
        r"([a-z]{3,9})[_\s,]+(\d{1,2})[_\s,]+(\d{4})",
        filename_lower
    )
    if date_match:
        month_str = date_match.group(1)
        day = date_match.group(2).zfill(2)
        year = date_match.group(3)
        
        if month_str in month_map:
            month = month_map[month_str]
            pub_date = f"{year}-{month}-{day}"
            
            # Derive quarter from month if not already found
            if not year_quarter:
                quarter = month_to_quarter.get(month, "Q1")
                year_quarter = f"{year}{quarter}"
    
    # Pattern 4: "YYYY-MM-DD" or "YYYYMMDD"
    if not pub_date:
        iso_match = re.search(r"(\d{4})-(\d{2})-(\d{2})", filename)
        if iso_match:
            pub_date = f"{iso_match.group(1)}-{iso_match.group(2)}-{iso_match.group(3)}"
            if not year_quarter:
                month = iso_match.group(2)
                year = iso_match.group(1)
                quarter = month_to_quarter.get(month, "Q1")
                year_quarter = f"{year}{quarter}"
    
    # Pattern 5: Just a year (e.g., "2022")
    if not year_quarter:
        year_match = re.search(r"(20\d{2})", filename)
        if year_match:
            year = year_match.group(1)
            year_quarter = f"{year}Q0"  # Q0 indicates year-only, no specific quarter
    
    return year_quarter, pub_date


def extract_date_from_content(text: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract year_quarter and publication_date from document content.
    
    Args:
        text: Document text
        
    Returns:
        Tuple of (year_quarter, publication_date)
    """
    year_quarter = None
    pub_date = None
    
    text_upper = text.upper()
    
    # Month to quarter mapping (fiscal quarter ending)
    month_to_quarter = {
        "JANUARY": ("Q4", "01"), "FEBRUARY": ("Q4", "02"), "MARCH": ("Q1", "03"),
        "APRIL": ("Q1", "04"), "MAY": ("Q2", "05"), "JUNE": ("Q2", "06"),
        "JULY": ("Q2", "07"), "AUGUST": ("Q3", "08"), "SEPTEMBER": ("Q3", "09"),
        "OCTOBER": ("Q3", "10"), "NOVEMBER": ("Q4", "11"), "DECEMBER": ("Q4", "12"),
    }
    
    # Pattern 1: "Q# YYYY" patterns
    q_match = re.search(r"Q([1-4])\s*[,\s]*(\d{4})", text_upper)
    if q_match:
        quarter = q_match.group(1)
        year = q_match.group(2)
        year_quarter = f"{year}Q{quarter}"
    
    # Pattern 2: "FIRST/SECOND/THIRD/FOURTH QUARTER ... YYYY"
    if not year_quarter:
        quarter_words = {"FIRST": "1", "SECOND": "2", "THIRD": "3", "FOURTH": "4"}
        for word, num in quarter_words.items():
            match = re.search(rf"{word}\s+QUARTER[^\d]*(\d{{4}})", text_upper)
            if match:
                year_quarter = f"{match.group(1)}Q{num}"
                break
    
    # Pattern 3: "FOR THE QUARTER ENDED MONTH DD, YYYY" or "PERIOD ENDED MONTH DD, YYYY"
    period_match = re.search(
        r"(?:QUARTER|PERIOD)\s+ENDED\s+([A-Z]+)\s+(\d{1,2}),?\s+(\d{4})",
        text_upper
    )
    if period_match:
        month_name = period_match.group(1)
        day = period_match.group(2).zfill(2)
        year = period_match.group(3)
        
        if month_name in month_to_quarter:
            quarter, month_num = month_to_quarter[month_name]
            if not year_quarter:
                year_quarter = f"{year}{quarter}"
            pub_date = f"{year}-{month_num}-{day}"
    
    # Pattern 4: Earnings call date pattern "Month DD, YYYY"
    if not pub_date:
        date_match = re.search(
            r"([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})",
            text[:2000]  # Look in first part of document
        )
        if date_match:
            month_name = date_match.group(1).upper()
            day = date_match.group(2).zfill(2)
            year = date_match.group(3)
            
            if month_name in month_to_quarter:
                quarter, month_num = month_to_quarter[month_name]
                pub_date = f"{year}-{month_num}-{day}"
                if not year_quarter:
                    year_quarter = f"{year}{quarter}"
    
    # Pattern 5: Just extract year if nothing else found
    if not year_quarter:
        year_match = re.search(r"\b(20\d{2})\b", text)
        if year_match:
            year_quarter = f"{year_match.group(1)}Q0"
    
    return year_quarter, pub_date


def extract_report_type_from_filename(filename: str, category: str) -> str:
    """
    Extract report type from filename.
    
    Args:
        filename: Original filename
        category: Document category (analyst_report, earnings_call, sec_filing)
        
    Returns:
        Standardized report type code
    """
    filename_lower = filename.lower().replace(" ", "").replace("-", "").replace("_", "")
    
    # For SEC filings
    if category == "sec_filing":
        for pattern, report_type in SEC_REPORT_TYPES.items():
            if pattern.replace(" ", "").replace("-", "") in filename_lower:
                return report_type
        
        # Check for annual report
        if "annual" in filename_lower and "report" in filename_lower:
            return "ANNUAL_REPORT"
        
        # Check for earnings release
        if "earnings" in filename_lower and "release" in filename_lower:
            return "EARNINGS_RELEASE"
        
        # Check for webslides/presentation
        if "webslides" in filename_lower or "presentation" in filename_lower:
            return "EARNINGS_PRESENTATION"
    
    # For earnings calls
    if category == "earnings_call":
        return "EARNINGS_CALL"
    
    # For analyst reports
    if category == "analyst_report":
        return "ANALYSTREPORT"
    
    return "DOCUMENT"


def extract_report_type_from_content(text: str, category: str) -> str:
    """
    Extract report type from document content.
    
    Args:
        text: Document text
        category: Document category
        
    Returns:
        Standardized report type code
    """
    text_upper = text.upper()
    
    # SEC filing patterns in content
    if "FORM 10-K" in text_upper or "FORM10-K" in text_upper:
        return "10-K"
    if "FORM 10-Q" in text_upper or "FORM10-Q" in text_upper:
        return "10-Q"
    if "FORM 8-K" in text_upper or "FORM8-K" in text_upper:
        return "8-K"
    if "ANNUAL REPORT" in text_upper:
        return "ANNUAL_REPORT"
    if "EARNINGS RELEASE" in text_upper:
        return "EARNINGS_RELEASE"
    if "EARNINGS CALL" in text_upper or "CONFERENCE CALL" in text_upper:
        return "EARNINGS_CALL"
    
    # Category-based defaults
    if category == "earnings_call":
        return "EARNINGS_CALL"
    if category == "analyst_report":
        return "ANALYSTREPORT"
    if category == "sec_filing":
        return "SEC_FILING"
    
    return "DOCUMENT"


def extract_metadata(
    filename: str,
    folder_path: str,
    text: Optional[str] = None,
    ticker: str = DEFAULT_TICKER
) -> DocumentMetadata:
    """
    Extract all metadata needed for standardized filename.
    
    Combines information from filename, folder path, and document content.
    
    Args:
        filename: Original filename
        folder_path: Path to folder containing the file
        text: Extracted document text (optional, for content-based extraction)
        ticker: Stock ticker symbol (default: AMZN)
        
    Returns:
        DocumentMetadata object with all extracted fields
    """
    metadata = DocumentMetadata(ticker=ticker)
    
    # Step 1: Detect document category
    metadata.doc_category = detect_document_category(filename, folder_path)
    logger.debug(f"Detected category: {metadata.doc_category}")
    
    # Step 2: Extract publisher from filename
    publisher = extract_publisher_from_filename(filename)
    if publisher:
        metadata.publisher = publisher
    elif text:
        # Fall back to content-based extraction
        publisher = extract_publisher_from_content(text)
        if publisher:
            metadata.publisher = publisher
    
    # Set default publisher based on category
    if metadata.publisher == "UNKNOWN" or metadata.publisher == "AMAZON":
        if metadata.doc_category == "sec_filing":
            metadata.publisher = "SEC"
        elif metadata.doc_category == "earnings_call":
            metadata.publisher = "AMAZON"
        elif metadata.publisher == "UNKNOWN":
            metadata.publisher = "UNKNOWN"
    
    logger.debug(f"Publisher: {metadata.publisher}")
    
    # Step 3: Extract report type
    report_type = extract_report_type_from_filename(filename, metadata.doc_category)
    if report_type == "DOCUMENT" and text:
        report_type = extract_report_type_from_content(text, metadata.doc_category)
    metadata.report_type = report_type
    logger.debug(f"Report type: {metadata.report_type}")
    
    # Step 4: Extract dates from filename first
    year_quarter, pub_date = extract_date_from_filename(filename)
    
    # Fall back to content if needed
    if (not year_quarter or not pub_date) and text:
        content_yq, content_date = extract_date_from_content(text)
        if not year_quarter:
            year_quarter = content_yq
        if not pub_date:
            pub_date = content_date
    
    if year_quarter:
        metadata.year_quarter = year_quarter
    if pub_date:
        metadata.publication_date = pub_date
    
    logger.debug(f"Year/Quarter: {metadata.year_quarter}, Date: {metadata.publication_date}")
    
    return metadata


class DocumentRenamer:
    """
    Renames documents using standardized filename format.
    
    Uses pattern extraction from filenames, folder structure, and document content
    to generate metadata for standardized filenames.
    
    No LLM required - uses deterministic pattern matching.
    """
    
    def __init__(self, ticker: str = DEFAULT_TICKER):
        """
        Initialize the document renamer.
        
        Args:
            ticker: Stock ticker symbol (default: AMZN)
        """
        self.ticker = ticker
        logger.info(f"Document Renamer initialized for ticker: {ticker}")
    
    def process_document(
        self,
        file_path: Path,
        extract_content: bool = True
    ) -> DocumentMetadata:
        """
        Process a document and extract metadata for renaming.
        
        Args:
            file_path: Path to the document
            extract_content: Whether to extract text from the document
            
        Returns:
            DocumentMetadata with extracted information
        """
        filename = file_path.name
        folder_path = str(file_path.parent)
        
        # Extract text from document if requested
        text = None
        if extract_content:
            text = extract_text(file_path)
            if text:
                text = preprocess_text(text)
        
        # Extract metadata using all available sources
        metadata = extract_metadata(
            filename=filename,
            folder_path=folder_path,
            text=text,
            ticker=self.ticker
        )
        
        return metadata
    
    def generate_new_filename(
        self,
        file_path: Path,
        extract_content: bool = True
    ) -> Tuple[DocumentMetadata, str]:
        """
        Generate new standardized filename for a document.
        
        Args:
            file_path: Path to the document
            extract_content: Whether to extract text from the document
            
        Returns:
            Tuple of (metadata, new_filename)
        """
        metadata = self.process_document(file_path, extract_content)
        extension = file_path.suffix.lower()
        new_filename = metadata.to_filename(extension)
        
        return metadata, new_filename


# =============================================================================
# FILE COPYING FUNCTIONS
# =============================================================================

def copy_files_with_new_names(
    results: Dict[str, dict],
    source_dir: Path,
    dest_dir: Path
) -> Dict[str, dict]:
    """
    Copy all successfully processed files to destination with standardized names.
    
    Args:
        results: Dictionary of processing results from process_directory
        source_dir: Source directory containing original files
        dest_dir: Destination directory for renamed copies
        
    Returns:
        Updated results dictionary with copy status
    """
    logger.info(f"Copying files to: {dest_dir}")
    
    # Create destination directory
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    copy_count = 0
    
    for filename, data in results.items():
        # Only copy files that have new filenames
        if not data.get("new_filename"):
            data["copy_status"] = "Skipped - no filename generated"
            data["new_path"] = None
            continue
        
        # Determine source path
        source_path = source_dir / filename
        if not source_path.exists():
            # Try with full relative path (for recursive processing)
            source_path = source_dir / Path(filename)
        
        if not source_path.exists():
            data["copy_status"] = "Source file not found"
            data["new_path"] = None
            continue
        
        # Construct destination path
        new_filename = data["new_filename"]
        dest_path = dest_dir / new_filename
        
        # Handle filename conflicts by appending a counter
        counter = 1
        base_name = dest_path.stem
        extension = dest_path.suffix
        while dest_path.exists():
            dest_path = dest_dir / f"{base_name}_{counter}{extension}"
            counter += 1
            if counter > 1000:
                data["copy_status"] = "Too many filename conflicts"
                data["new_path"] = None
                continue
        
        try:
            # Copy the file
            shutil.copy2(source_path, dest_path)
            data["copy_status"] = "Success"
            data["new_path"] = str(dest_path)
            copy_count += 1
            logger.info(f"Copied: {filename} -> {dest_path.name}")
        except Exception as e:
            data["copy_status"] = f"Copy failed: {str(e)}"
            data["new_path"] = None
    
    logger.info(f"Successfully copied {copy_count} files to {dest_dir}")
    return results


# =============================================================================
# MAIN PROCESSING FUNCTIONS
# =============================================================================

def find_documents(directory: Path) -> list:
    """
    Find all supported documents in the given directory.
    
    Args:
        directory: Path to the directory to scan
        
    Returns:
        List of Path objects for supported documents
    """
    documents = []
    
    for file_path in directory.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_EXTENSIONS:
            documents.append(file_path)
    
    logger.info(f"Found {len(documents)} supported documents in {directory}")
    return sorted(documents)


def process_document_for_rename(
    file_path: Path,
    renamer: DocumentRenamer
) -> Tuple[str, Optional[str], str, Optional[DocumentMetadata]]:
    """
    Process a single document to generate its standardized filename.
    
    Args:
        file_path: Path to the document
        renamer: DocumentRenamer instance
        
    Returns:
        Tuple of (original_filename, new_filename, status_message, metadata)
    """
    filename = file_path.name
    logger.info(f"Processing: {filename}")
    
    try:
        metadata, new_filename = renamer.generate_new_filename(file_path)
        logger.info(f"  -> {new_filename}")
        return filename, new_filename, "Success", metadata
    except Exception as e:
        logger.error(f"Error processing {filename}: {e}")
        return filename, None, f"Error: {str(e)}", None


def process_directory(
    input_dir: Path,
    output_file: Optional[Path] = None,
    ticker: str = DEFAULT_TICKER,
    recursive: bool = False
) -> Dict[str, dict]:
    """
    Process all documents in a directory and generate standardized filenames.
    
    Args:
        input_dir: Path to input directory
        output_file: Optional path to output JSON file
        ticker: Stock ticker symbol
        recursive: Whether to process subdirectories
        
    Returns:
        Dictionary mapping filenames to results
    """
    # Validate input directory
    if not input_dir.exists():
        raise FileNotFoundError(f"Input directory not found: {input_dir}")
    
    if not input_dir.is_dir():
        raise NotADirectoryError(f"Path is not a directory: {input_dir}")
    
    # Initialize the document renamer
    renamer = DocumentRenamer(ticker=ticker)
    
    # Collect all documents
    if recursive:
        documents = []
        for ext in SUPPORTED_EXTENSIONS:
            documents.extend(input_dir.rglob(f"*{ext}"))
    else:
        documents = find_documents(input_dir)
    
    if not documents:
        logger.warning(f"No supported documents found in {input_dir}")
        return {}
    
    # Process each document
    results = {}
    success_count = 0
    
    for doc_path in documents:
        # Get relative path if recursive, otherwise just filename
        if recursive:
            key = str(doc_path.relative_to(input_dir))
        else:
            key = doc_path.name
        
        original, new_filename, status, metadata = process_document_for_rename(doc_path, renamer)
        
        results[key] = {
            "original_filename": original,
            "new_filename": new_filename,
            "status": status,
            "metadata": asdict(metadata) if metadata else None
        }
        
        if new_filename:
            success_count += 1
    
    # Summary logging
    logger.info(f"\nProcessing complete!")
    logger.info(f"Total documents: {len(documents)}")
    logger.info(f"Successfully renamed: {success_count}")
    logger.info(f"Failed: {len(documents) - success_count}")
    
    # Save results to JSON file if output path provided
    if output_file:
        save_results(results, output_file)
    
    return results


def save_results(results: Dict[str, dict], output_file: Optional[Path]):
    """
    Save the results to a JSON file.
    
    Creates a mapping of original filenames to new standardized filenames,
    along with detailed metadata information.
    
    Args:
        results: Dictionary of processing results
        output_file: Path to output JSON file (if None, skip saving)
    """
    if output_file is None:
        return
    
    # Create output directory if needed
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    output_data = {
        "summary": {
            "total_processed": len(results),
            "successful": sum(1 for r in results.values() if r.get("new_filename")),
            "failed": sum(1 for r in results.values() if not r.get("new_filename"))
        },
        "filename_mapping": {
            k: v["new_filename"] 
            for k, v in results.items() 
            if v.get("new_filename")
        },
        "detailed_results": results
    }
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Results saved to: {output_file}")


# =============================================================================
# COMMAND LINE INTERFACE
# =============================================================================

def process_single_file(
    file_path: Path,
    output_file: Optional[Path] = None,
    ticker: str = DEFAULT_TICKER
) -> Dict[str, dict]:
    """
    Process a single file and generate its standardized filename.
    
    Args:
        file_path: Path to the document file
        output_file: Optional path to output JSON file
        ticker: Stock ticker symbol
        
    Returns:
        Dictionary with the result
    """
    # Validate file
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    if not file_path.is_file():
        raise ValueError(f"Path is not a file: {file_path}")
    
    if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {file_path.suffix}")
    
    # Initialize the document renamer
    renamer = DocumentRenamer(ticker=ticker)
    
    # Process the document
    original, new_filename, status, metadata = process_document_for_rename(file_path, renamer)
    
    results = {
        original: {
            "original_filename": original,
            "new_filename": new_filename,
            "status": status,
            "metadata": asdict(metadata) if metadata else None
        }
    }
    
    # Save results if output file specified
    if output_file:
        save_results(results, output_file)
    
    return results


def parse_arguments():
    """
    Parse command line arguments.
    
    Returns:
        Parsed arguments namespace
    """
    parser = argparse.ArgumentParser(
        description="Rename documents using standardized format: {ticker}_{publisher}_{report_type}_{year_quarter}_{language}_{date}.{ext}",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s ./documents                              # Process all files in directory
  %(prog)s ./document.pdf                           # Process a single file
  %(prog)s ./documents -o results.json              # Custom output file
  %(prog)s ./document.pdf --copy-to ./renamed       # Copy with new filename
  %(prog)s ./documents --copy-to ./renamed --recursive  # Process and copy all
  %(prog)s ./documents --ticker AMD                 # Use different ticker

Output filename format:
  {ticker}_{publisher}_{report_type}_{year_quarter}_{language}_{publication_date}.{ext}
  
  Example: AMZN_EVERCORE_ANALYSTREPORT_2022Q2_EN_2022-06-02.pdf
        """
    )
    
    parser.add_argument(
        "input_path",
        type=str,
        help="Path to a document file OR directory containing documents"
    )
    
    parser.add_argument(
        "-o", "--output",
        type=str,
        default="rename_results.json",
        help="Output JSON file path (default: rename_results.json)"
    )
    
    parser.add_argument(
        "--ticker",
        type=str,
        default=DEFAULT_TICKER,
        help=f"Stock ticker symbol (default: {DEFAULT_TICKER})"
    )
    
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="Process subdirectories recursively"
    )
    
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose (debug) logging"
    )
    
    parser.add_argument(
        "--copy-to",
        type=str,
        default=None,
        help="Copy files with standardized names to this directory"
    )
    
    return parser.parse_args()


def main():
    """
    Main entry point for the document renamer.
    """
    # Parse command line arguments
    args = parse_arguments()
    
    # Set logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Convert paths to Path objects
    input_path = Path(args.input_path).resolve()
    output_file = Path(args.output).resolve()
    copy_to_dir = Path(args.copy_to).resolve() if args.copy_to else None
    
    # Determine if input is a file or directory
    is_single_file = input_path.is_file()
    
    logger.info("=" * 70)
    logger.info("Document Renamer")
    logger.info("=" * 70)
    logger.info(f"Input {'file' if is_single_file else 'directory'}: {input_path}")
    logger.info(f"Output file: {output_file}")
    logger.info(f"Ticker: {args.ticker}")
    if not is_single_file:
        logger.info(f"Recursive: {args.recursive}")
    if copy_to_dir:
        logger.info(f"Copy to: {copy_to_dir}")
    logger.info("=" * 70)
    
    try:
        if is_single_file:
            # Process single file
            results = process_single_file(
                file_path=input_path,
                output_file=None,
                ticker=args.ticker
            )
            source_dir = input_path.parent
        else:
            # Process directory
            results = process_directory(
                input_dir=input_path,
                output_file=None,
                ticker=args.ticker,
                recursive=args.recursive
            )
            source_dir = input_path
        
        # Copy files if --copy-to was specified
        if copy_to_dir:
            results = copy_files_with_new_names(
                results=results,
                source_dir=source_dir,
                dest_dir=copy_to_dir
            )
        
        # Now save results
        save_results(results, output_file)
        
        # Print summary to console
        print("\n" + "=" * 70)
        print("Renamed Files:")
        print("=" * 70)
        
        for filename, data in results.items():
            if data.get("new_filename"):
                print(f"\n{filename}")
                print(f"  -> {data['new_filename']}")
                if copy_to_dir and data.get("new_path"):
                    print(f"     Copied to: {data['new_path']}")
            else:
                print(f"\n{filename}")
                print(f"  -> [FAILED: {data['status']}]")
        
        print("\n" + "=" * 70)
        print(f"Results saved to: {output_file}")
        if copy_to_dir:
            print(f"Files copied to: {copy_to_dir}")
        print("=" * 70)
        
    except FileNotFoundError as e:
        logger.error(f"Path not found: {e}")
        exit(1)
    except ValueError as e:
        logger.error(f"Invalid input: {e}")
        exit(1)
    except Exception as e:
        logger.error(f"An error occurred: {e}")
        raise


if __name__ == "__main__":
    main()
