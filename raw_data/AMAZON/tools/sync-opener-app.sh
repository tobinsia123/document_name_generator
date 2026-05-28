#!/bin/bash
# Copy latest opener scripts into the macOS .app bundle Resources folder.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RES="${ROOT}/tools/RoboVault-Opener.app/Contents/Resources"
MACOS="${ROOT}/tools/RoboVault-Opener.app/Contents/MacOS"

mkdir -p "${RES}" "${MACOS}"
cp "${ROOT}/open_enc.py" "${ROOT}/drenc_crypto.py" "${ROOT}/archive_utils.py" "${ROOT}/tools/opener_pick_python.sh" "${RES}/"
chmod +x "${MACOS}/robovault-opener" "${RES}/opener_pick_python.sh" "${ROOT}/open_enc.py"

# Pin the Python used by whoever is syncing (usually the active conda/venv).
export OPENER_PYTHON_PATH_FILE="${RES}/python_path.txt"
if PY="$("${ROOT}/tools/opener_pick_python.sh")"; then
  printf '%s\n' "${PY}" >"${RES}/python_path.txt"
  printf '%s\n' "${PY}" >"${ROOT}/.opener_python_path"
  echo "Pinned opener Python: ${PY}"
else
  echo "Warning: no Python with cryptography found during sync; run install-macos-opener.sh from your conda env." >&2
fi

echo "Synced opener into ${RES}"
