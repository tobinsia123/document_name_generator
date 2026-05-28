"""
Extract RoboVault .tar.zst group archives back into individual documents.
"""

from __future__ import annotations

import tarfile
from pathlib import Path
from typing import List

try:
    import zstandard as zstd
except ImportError:
    zstd = None  # type: ignore

DOCUMENT_SUFFIXES = {".pdf", ".docx", ".txt", ".csv", ".xlsx", ".xls"}


def is_tar_zst_archive(path: Path) -> bool:
    name = path.name.lower()
    return name.endswith(".tar.zst") or name.endswith(".tar.zst.enc")


def documents_folder_name(archive_path: Path) -> str:
    """Folder name for extracted documents next to the archive."""
    stem = archive_path.name
    if stem.lower().endswith(".tar.zst.enc"):
        stem = stem[: -len(".tar.zst.enc")]
    elif stem.lower().endswith(".tar.zst"):
        stem = stem[: -len(".tar.zst")]
    return f"{stem}_documents"


def extract_tar_zst_archive(
    archive_path: Path,
    destination_dir: Path | None = None,
) -> tuple[Path, List[Path]]:
    """
    Decompress a .tar.zst archive into individual files.

    Returns:
        (destination_dir, list of extracted document paths)
    """
    if zstd is None:
        raise ImportError(
            "zstandard is required to extract .tar.zst archives. "
            "Install with: pip install zstandard"
        )
    if not archive_path.is_file():
        raise FileNotFoundError(f"Archive not found: {archive_path}")

    dest = destination_dir or (archive_path.parent / documents_folder_name(archive_path))
    dest.mkdir(parents=True, exist_ok=True)

    extracted: List[Path] = []
    dctx = zstd.ZstdDecompressor()

    with archive_path.open("rb") as raw:
        with dctx.stream_reader(raw) as reader:
            with tarfile.open(fileobj=reader, mode="r|") as tar:
                for member in tar:
                    if not member.isfile():
                        continue
                    member_name = Path(member.name).name
                    if not member_name or member_name.startswith("."):
                        continue
                    target = dest / member_name
                    if target.exists():
                        # Avoid overwrite collisions on repeat extract
                        stem, suffix = target.stem, target.suffix
                        n = 2
                        while target.exists():
                            target = dest / f"{stem}_{n}{suffix}"
                            n += 1
                    extracted_member = tar.extractfile(member)
                    if extracted_member is None:
                        continue
                    target.write_bytes(extracted_member.read())
                    extracted.append(target)

    documents = [
        p
        for p in extracted
        if p.suffix.lower() in DOCUMENT_SUFFIXES and p.is_file()
    ]
    return dest, documents if documents else extracted
