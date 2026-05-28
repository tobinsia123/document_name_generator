#!/bin/bash
# Install RoboVault Opener and register it as the default app for .enc files.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_SRC="${ROOT}/tools/RoboVault-Opener.app"
APP_DEST="${HOME}/Applications/RoboVault Opener.app"
BUNDLE_ID="com.robovault.opener"
mkdir -p "${HOME}/.robovault"

export OPENER_PYTHON_PATH_FILE="${ROOT}/tools/RoboVault-Opener.app/Contents/Resources/python_path.txt"
# shellcheck source=/dev/null
source "${ROOT}/tools/opener_pick_python.sh"

PY="$(pick_python_with_crypto)" || {
  echo "No Python with cryptography found." >&2
  echo "Activate the environment you use for RoboVault, then run:" >&2
  echo "  pip install cryptography" >&2
  echo "  ./tools/install-macos-opener.sh" >&2
  exit 1
}

echo "Using Python: ${PY}"

"${ROOT}/tools/sync-opener-app.sh"

if [[ ! -d "${APP_SRC}" ]]; then
  echo "Missing ${APP_SRC}" >&2
  exit 1
fi

printf '%s\n' "${PY}" >"${HOME}/.robovault/python_path"

rm -rf "${APP_DEST}"
cp -R "${APP_SRC}" "${APP_DEST}"
chmod +x "${APP_DEST}/Contents/MacOS/robovault-opener"
printf '%s\n' "${PY}" >"${APP_DEST}/Contents/Resources/python_path.txt"

LSREGISTER="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"
if [[ -x "${LSREGISTER}" ]]; then
  "${LSREGISTER}" -f "${APP_DEST}"
fi

if command -v duti >/dev/null 2>&1; then
  duti -s "${BUNDLE_ID}" enc all
  echo "Registered ${BUNDLE_ID} as default handler for .enc"
else
  echo "Tip: install duti (brew install duti) to set .enc as default automatically."
  echo "Or: right-click a .enc file -> Open With -> RoboVault Opener -> Always Open With."
fi

echo "Installed to ${APP_DEST}"
echo "Pinned Python: ${PY}"
echo "Double-click any .tar.zst.enc file to enter your RoboVault passphrase."
