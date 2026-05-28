#!/bin/bash
# Find a Python 3 interpreter that can `import cryptography`.
# Prints the absolute path to stdout, or nothing on failure.
pick_python_with_crypto() {
  local candidates=() cmd seen="" deduped=() d base

  if [[ -n "${ROBOVAULT_PYTHON:-}" ]]; then
    candidates+=("${ROBOVAULT_PYTHON}")
  fi

  if [[ -n "${OPENER_PYTHON_PATH_FILE:-}" && -f "${OPENER_PYTHON_PATH_FILE}" ]]; then
    candidates+=("$(tr -d '\r\n' < "${OPENER_PYTHON_PATH_FILE}")")
  fi

  if [[ -f "${HOME}/.robovault/python_path" ]]; then
    candidates+=("$(tr -d '\r\n' < "${HOME}/.robovault/python_path")")
  fi

  # Same interpreter that runs the Flask backend (when install/download ran from repo).
  local repo_root
  repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd)" || repo_root=""
  if [[ -n "${repo_root}" ]]; then
    candidates+=("${repo_root}/.venv/bin/python3")
    if [[ -f "${repo_root}/.opener_python_path" ]]; then
      candidates+=("$(tr -d '\r\n' < "${repo_root}/.opener_python_path")")
    fi
  fi

  candidates+=("${HOME}/miniconda3/bin/python3")
  candidates+=("${HOME}/anaconda3/bin/python3")
  candidates+=("${HOME}/mambaforge/bin/python3")
  candidates+=("${HOME}/micromamba/bin/python3")
  candidates+=("${HOME}/opt/miniconda3/bin/python3")
  candidates+=("${HOME}/opt/anaconda3/bin/python3")

  if [[ -n "${CONDA_PREFIX:-}" ]]; then
    candidates+=("${CONDA_PREFIX}/bin/python3")
  fi

  candidates+=("/opt/homebrew/bin/python3")
  candidates+=("/usr/local/bin/python3")
  candidates+=("/usr/bin/python3")

  # Finder-launched apps often have a minimal PATH; probe common bin dirs.
  for d in \
    "${HOME}/miniconda3/bin" \
    "${HOME}/anaconda3/bin" \
    "${HOME}/mambaforge/bin" \
    "/opt/homebrew/bin" \
    "/usr/local/bin" \
    "/usr/bin"; do
    [[ -d "${d}" ]] || continue
    for cmd in "${d}/python3" "${d}/python3.12" "${d}/python3.11" "${d}/python3.10"; do
      candidates+=("${cmd}")
    done
  done

  if command -v python3 >/dev/null 2>&1; then
    candidates+=("$(command -v python3)")
  fi

  for cmd in "${candidates[@]}"; do
    [[ -n "${cmd}" && -x "${cmd}" ]] || continue
    case ":${seen}:" in *":${cmd}:"*) continue ;; esac
    seen="${seen}:${cmd}"
    deduped+=("${cmd}")
  done

  for cmd in "${deduped[@]}"; do
    if "${cmd}" -c "import cryptography" >/dev/null 2>&1; then
      printf '%s\n' "${cmd}"
      return 0
    fi
  done
  return 1
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  pick_python_with_crypto
fi
