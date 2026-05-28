#!/usr/bin/env python3
"""
Open RoboVault .enc archives with a passphrase prompt.

Decrypts the archive, extracts PDFs/documents from the .tar.zst bundle,
and opens them in the default macOS apps (Preview, etc.).

Usage:
  python open_enc.py path/to/archive.tar.zst.enc
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

try:
    from archive_utils import extract_tar_zst_archive, is_tar_zst_archive
    from drenc_crypto import decrypt_file_with_passphrase
except ImportError as exc:
    _import_error = str(exc)
    decrypt_file_with_passphrase = None  # type: ignore[assignment,misc]
    extract_tar_zst_archive = None  # type: ignore[assignment,misc]
    is_tar_zst_archive = None  # type: ignore[assignment,misc]
else:
    _import_error = None


def _applescript_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace('"', '\\"')


def _run_osascript(script: str) -> tuple[int, str]:
    result = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True,
        text=True,
    )
    out = (result.stdout or "").strip()
    if result.stderr:
        out = f"{out}\n{result.stderr.strip()}".strip()
    return result.returncode, out


def _prompt_passphrase_osascript(title: str, prompt: str) -> str | None:
    body = _applescript_escape(f"{prompt}\n\n(Passphrase is hidden while typing.)")
    title_esc = _applescript_escape(title)
    script = (
        f'display dialog "{body}" with title "{title_esc}" '
        'default answer "" with hidden answer '
        'buttons {"Cancel", "OK"} default button "OK"'
    )
    code, out = _run_osascript(script)
    if code != 0 or "button returned:Cancel" in out:
        return None
    if "text returned:" in out:
        return out.split("text returned:", 1)[1].strip()
    return None


def _notify_osascript(title: str, message: str, *, error: bool = False) -> None:
    title_esc = _applescript_escape(title)
    msg_esc = _applescript_escape(message)
    if error:
        script = f'display alert "{title_esc}" message "{msg_esc}" as critical'
    else:
        script = f'display alert "{title_esc}" message "{msg_esc}"'
    _run_osascript(script)


def _prompt_passphrase(title: str, prompt: str) -> str | None:
    if sys.platform == "darwin":
        return _prompt_passphrase_osascript(title, prompt)
    import getpass

    return getpass.getpass(f"{title}\n{prompt}: ")


def _notify(title: str, message: str, *, error: bool = False) -> None:
    if sys.platform == "darwin":
        _notify_osascript(title, message, error=error)
        return
    stream = sys.stderr if error else sys.stdout
    print(f"{title}: {message}", file=stream)


def _collect_enc_paths(argv: list[str]) -> list[Path]:
    paths: list[Path] = []
    for arg in argv:
        if not arg or arg.startswith("-"):
            continue
        p = Path(arg).expanduser()
        if p.is_file():
            paths.append(p.resolve())
    return paths


def _reveal_path(path: Path) -> None:
    if sys.platform == "darwin":
        subprocess.run(["open", "-R", str(path)], check=False)
    elif sys.platform == "win32":
        subprocess.run(["explorer", "/select,", str(path)], check=False)
    else:
        subprocess.run(["xdg-open", str(path.parent)], check=False)


def _open_documents(documents: list[Path], folder: Path) -> None:
    pdfs = [p for p in documents if p.suffix.lower() == ".pdf"]
    to_open = pdfs if pdfs else documents

    if sys.platform == "darwin":
        for doc in to_open[:5]:
            subprocess.run(["open", str(doc)], check=False)
        subprocess.run(["open", str(folder)], check=False)
    elif sys.platform == "win32":
        import os

        for doc in to_open[:5]:
            os.startfile(doc)  # type: ignore[attr-defined]
    else:
        for doc in to_open[:5]:
            subprocess.run(["xdg-open", str(doc)], check=False)


def main() -> int:
    if _import_error or decrypt_file_with_passphrase is None:
        _notify(
            "RoboVault Opener",
            "Missing dependency.\n\n"
            "Install with:\n  pip install cryptography zstandard\n\n"
            f"Details: {_import_error or 'unknown import error'}",
            error=True,
        )
        return 1

    enc_paths = _collect_enc_paths(sys.argv[1:])
    if not enc_paths:
        _notify(
            "RoboVault Opener",
            "No .enc file was provided.\n\n"
            "Run from Terminal:\n"
            "  python open_enc.py /path/to/file.tar.zst.enc",
            error=True,
        )
        return 1

    exit_code = 0
    for enc_path in enc_paths:
        passphrase = _prompt_passphrase(
            "RoboVault - Enter passphrase",
            f"Enter the passphrase used when this archive was sealed:\n\n{enc_path.name}",
        )
        if not passphrase:
            _notify("RoboVault Opener", "Cancelled - no passphrase entered.", error=True)
            exit_code = 1
            continue

        try:
            meta = decrypt_file_with_passphrase(enc_path, passphrase)
            archive_path = Path(meta["decrypted_path"])

            if is_tar_zst_archive(archive_path) and extract_tar_zst_archive:
                folder, documents = extract_tar_zst_archive(archive_path)
                if not documents:
                    raise ValueError("Archive contained no document files.")
                _open_documents(documents, folder)
                names = ", ".join(d.name for d in documents[:3])
                extra = f" (+{len(documents) - 3} more)" if len(documents) > 3 else ""
                _notify(
                    "RoboVault Opener",
                    f"Decrypted and extracted {len(documents)} file(s) to:\n{folder}\n\n"
                    f"Opened: {names}{extra}",
                )
            else:
                _open_documents([archive_path], archive_path.parent)
                _notify(
                    "RoboVault Opener",
                    f"Decrypted successfully.\n\nOpened: {archive_path.name}",
                )
        except Exception as exc:
            _notify("RoboVault Opener", str(exc), error=True)
            exit_code = 1

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
