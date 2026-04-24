#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RUNNER_DIR="${ROOT}/notes/workspace-poc/runner"
CORE_SCRIPT="${ROOT}/scripts/ralph-roadmap.sh"

DRY_RUN=0
SEARCH_DEFAULT=1
FORWARD_ARGS=()

usage() {
  cat <<'EOF'
Usage: scripts/run-ralph-roadmap.sh [launcher-options] [-- core-script-args...]

Launches the Ralph roadmap loop in the background with:
- `nohup`
- `caffeinate -dims`
- timestamped log and launch note files
- `latest.pid` and `latest-launch.txt`

Defaults:
- launches `./scripts/ralph-roadmap.sh --search`
- runs in the background
- survives terminal close
- prevents idle sleep while the job runs

Launcher options:
  --dry-run     Print the resolved launch command and file paths without starting the job
  --no-search   Do not add the default `--search` flag
  -h, --help    Show this help

Everything after `--` is passed directly to `scripts/ralph-roadmap.sh`.

Examples:
  ./scripts/run-ralph-roadmap.sh
  ./scripts/run-ralph-roadmap.sh -- --iterations 500
  ./scripts/run-ralph-roadmap.sh --no-search -- --iterations 500
EOF
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

shell_join() {
  local out=""
  local part
  for part in "$@"; do
    out+="$(printf '%q' "$part") "
  done
  printf '%s' "${out% }"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --no-search)
      SEARCH_DEFAULT=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      FORWARD_ARGS+=("$@")
      break
      ;;
    *)
      FORWARD_ARGS+=("$1")
      shift
      ;;
  esac
done

require_cmd nohup
require_cmd caffeinate
require_cmd date
require_cmd cp

if [[ ! -x "$CORE_SCRIPT" ]]; then
  echo "Core script is missing or not executable: $CORE_SCRIPT" >&2
  exit 1
fi

mkdir -p "$RUNNER_DIR"

ts="$(date +%Y%m%d-%H%M%S)-$$"
log="${RUNNER_DIR}/${ts}-full-run.log"
launch="${RUNNER_DIR}/${ts}-launch.txt"
latest_launch="${RUNNER_DIR}/latest-launch.txt"
pidfile="${RUNNER_DIR}/latest.pid"

CORE_CMD=("$CORE_SCRIPT")
if [[ "$SEARCH_DEFAULT" -eq 1 ]]; then
  CORE_CMD+=(--search)
fi
if [[ "${#FORWARD_ARGS[@]}" -gt 0 ]]; then
  CORE_CMD+=("${FORWARD_ARGS[@]}")
fi

LAUNCH_CMD=(nohup caffeinate -dims "${CORE_CMD[@]}")
COMMAND_STR="$(shell_join "${LAUNCH_CMD[@]}")"

if [[ "$DRY_RUN" -eq 1 ]]; then
  printf 'cwd=%s\n' "$ROOT"
  printf 'log=%s\n' "$log"
  printf 'launch=%s\n' "$launch"
  printf 'pidfile=%s\n' "$pidfile"
  printf 'command=%s\n' "$COMMAND_STR"
  exit 0
fi

cd "$ROOT"
nohup caffeinate -dims "${CORE_CMD[@]}" > "$log" 2>&1 < /dev/null &
pid=$!

printf '%s\n' "$pid" > "$pidfile"
printf 'started_at=%s\npid=%s\nlog=%s\nlaunch=%s\ncwd=%s\ncommand=%s\n' \
  "$ts" "$pid" "$log" "$launch" "$ROOT" "$COMMAND_STR" > "$launch"
cp "$launch" "$latest_launch"

printf 'Started Ralph roadmap run.\n'
printf 'PID: %s\n' "$pid"
printf 'Log: %s\n' "$log"
printf 'Launch note: %s\n' "$launch"
