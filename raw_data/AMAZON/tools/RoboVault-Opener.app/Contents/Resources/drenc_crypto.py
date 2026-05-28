"""
RoboVault DRENC1 archive encryption (AES-256-GCM + PBKDF2).

Used by the pipeline, Flask API, and the desktop .enc opener.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

try:
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
except ImportError:
    PBKDF2HMAC = None  # type: ignore
    hashes = None  # type: ignore
    AESGCM = None  # type: ignore

PBKDF2_ITERATIONS = 200_000
DRENC_MAGIC = b"DRENC1"


def _file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def encrypt_file_with_passphrase(
    source_path: Path,
    passphrase: str,
    destination_path: Optional[Path] = None,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """Encrypt a file with AES-256-GCM (DRENC1 envelope)."""
    if not passphrase:
        raise ValueError("Encryption passphrase is required when encryption is enabled")
    if AESGCM is None or PBKDF2HMAC is None or hashes is None:
        raise ImportError(
            "cryptography is required for encryption. Install with: pip install cryptography"
        )

    destination = destination_path or source_path.with_suffix(source_path.suffix + ".enc")
    if dry_run:
        return {
            "encrypted_path": str(destination),
            "encrypted_checksum_sha256": None,
            "algorithm": "AES-256-GCM",
            "kdf": "PBKDF2-HMAC-SHA256",
            "iterations": PBKDF2_ITERATIONS,
            "status": "Dry run - would encrypt",
        }

    plaintext = source_path.read_bytes()
    salt = os.urandom(16)
    nonce = os.urandom(12)
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=PBKDF2_ITERATIONS,
    )
    key = kdf.derive(passphrase.encode("utf-8"))
    ciphertext = AESGCM(key).encrypt(nonce, plaintext, None)

    header = {
        "version": 1,
        "algorithm": "AES-256-GCM",
        "kdf": "PBKDF2-HMAC-SHA256",
        "iterations": PBKDF2_ITERATIONS,
        "salt_b64": base64.b64encode(salt).decode("ascii"),
        "nonce_b64": base64.b64encode(nonce).decode("ascii"),
        "source_name": source_path.name,
    }
    header_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("wb") as out_f:
        out_f.write(DRENC_MAGIC)
        out_f.write(len(header_bytes).to_bytes(4, "big"))
        out_f.write(header_bytes)
        out_f.write(ciphertext)

    return {
        "encrypted_path": str(destination),
        "encrypted_checksum_sha256": _file_sha256(destination),
        "algorithm": header["algorithm"],
        "kdf": header["kdf"],
        "iterations": header["iterations"],
        "status": "Success",
    }


def decrypt_file_with_passphrase(
    encrypted_path: Path,
    passphrase: str,
    destination_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """Decrypt a DRENC1 file produced by encrypt_file_with_passphrase."""
    if not passphrase:
        raise ValueError("Passphrase is required to decrypt")
    if AESGCM is None or PBKDF2HMAC is None or hashes is None:
        raise ImportError(
            "cryptography is required for decryption. Install with: pip install cryptography"
        )

    data = encrypted_path.read_bytes()
    if len(data) < len(DRENC_MAGIC) + 4:
        raise ValueError("File is too small to be a RoboVault encrypted archive")
    if data[: len(DRENC_MAGIC)] != DRENC_MAGIC:
        raise ValueError("Unrecognized encryption format (expected DRENC1 header)")

    header_len = int.from_bytes(data[len(DRENC_MAGIC) : len(DRENC_MAGIC) + 4], "big")
    header_start = len(DRENC_MAGIC) + 4
    header_end = header_start + header_len
    if header_end > len(data):
        raise ValueError("Corrupt encrypted file: header extends past end of file")

    header = json.loads(data[header_start:header_end].decode("utf-8"))
    ciphertext = data[header_end:]

    salt = base64.b64decode(header["salt_b64"])
    nonce = base64.b64decode(header["nonce_b64"])
    iterations = int(header.get("iterations") or PBKDF2_ITERATIONS)

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=iterations,
    )
    key = kdf.derive(passphrase.encode("utf-8"))

    try:
        plaintext = AESGCM(key).decrypt(nonce, ciphertext, None)
    except Exception as exc:
        raise ValueError("Decryption failed — wrong passphrase or corrupt file") from exc

    source_name = header.get("source_name") or encrypted_path.stem
    if destination_path is None:
        name = encrypted_path.name
        if name.endswith(".enc"):
            name = name[:-4]
        destination_path = encrypted_path.parent / name

    destination_path.parent.mkdir(parents=True, exist_ok=True)
    destination_path.write_bytes(plaintext)

    return {
        "decrypted_path": str(destination_path),
        "source_name": source_name,
        "algorithm": header.get("algorithm", "AES-256-GCM"),
        "kdf": header.get("kdf", "PBKDF2-HMAC-SHA256"),
        "iterations": iterations,
        "bytes": len(plaintext),
        "status": "Success",
    }
