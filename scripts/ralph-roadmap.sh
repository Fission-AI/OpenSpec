#!/usr/bin/env bash

# Ralph-style roadmap runner for Codex.
# Each phase runs in fresh contexts:
# 1. implementation
# 2. verification
# 3. manual testing
#
# Memory lives on disk in ROADMAP.md and per-phase artifacts under
# notes/workspace-poc/phase-*/.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROADMAP="${ROOT}/ROADMAP.md"
RUNNER_DIR="${ROOT}/notes/workspace-poc/runner"

MAX_ITERATIONS=0
MAX_PHASE_CYCLES=0
MODEL="gpt-5.4"
MODEL_REASONING_EFFORT="xhigh"
SEARCH=0
DRY_RUN=0
VALIDATE_ONLY=0

usage() {
  cat <<'EOF'
Usage: scripts/ralph-roadmap.sh [options]

Runs ROADMAP.md to completion by launching fresh `codex exec` sessions for each phase:
implementation -> verification -> manual testing -> next phase.

Defaults:
  model:              gpt-5.4
  reasoning effort:   xhigh
  max runs:           unlimited
  max phase cycles:   unlimited

Options:
  --iterations N         Max Codex runs in this invocation. `0` means unlimited. (default: 0)
  --max-phase-cycles N   Max full implement/verify/manual cycles per phase. `0` means unlimited.
                         (default: 0)
  --model MODEL          Override the default model
  --reasoning-effort L   Override the default reasoning effort
  --search               Enable Codex live web search for the run
  --validate             Optionally lint ROADMAP.md structure and numbering, then exit
  --dry-run              Print the next phase and exit without launching Codex
  -h, --help             Show this help

Phase completion contract:
  Build/Test phases:
    - <output-dir>/SUMMARY.md
    - <output-dir>/VERIFY.md
    - <output-dir>/MANUAL_TEST.md

  Research phases:
    - <output-dir>/SUMMARY.md
    - <output-dir>/DECISION.md
    - <output-dir>/VERIFY.md
    - <output-dir>/MANUAL_TEST.md
EOF
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

validate_nonnegative_int() {
  local value="$1"
  local name="$2"
  if [[ ! "$value" =~ ^[0-9]+$ ]]; then
    echo "${name} must be a non-negative integer" >&2
    exit 1
  fi
}

validate_roadmap_structure() {
  awk '
    BEGIN {
      expected = 0;
      phase_num = "";
      phase_type = "";
      phase_dir = "";
      checklist_section = "";
      item_expected = 1;
      have_type = 0;
      have_dir = 0;
      phase_count = 0;
      error_count = 0;
    }

    function fail(message) {
      print "ROADMAP validation error: " message > "/dev/stderr";
      error_count++;
    }

    function flush_phase() {
      if (phase_num == "") {
        return;
      }

      if (!have_type) {
        fail("Phase " phase_num " is missing a Type line.");
      } else if (phase_type != "Build" && phase_type != "Test" && phase_type != "Research") {
        fail("Phase " phase_num " has invalid Type: " phase_type ".");
      }

      if (!have_dir) {
        fail("Phase " phase_num " is missing an Output summary directory line.");
      } else {
        expected_prefix = "notes/workspace-poc/phase-" phase_num "-";
        if (index(phase_dir, expected_prefix) != 1) {
          fail("Phase " phase_num " output directory should start with " expected_prefix " but found " phase_dir ".");
        }
        if (phase_dir !~ /\/$/) {
          fail("Phase " phase_num " output directory should end with / but found " phase_dir ".");
        }
        if (seen_dirs[phase_dir]) {
          fail("Duplicate output directory detected: " phase_dir ".");
        }
        seen_dirs[phase_dir] = 1;
      }
    }

    /^## Phase [0-9]/ {
      if ($0 !~ /^## Phase [0-9][0-9] - /) {
        fail("Malformed phase header: " $0);
        next;
      }

      flush_phase();

      line = $0;
      sub(/^## Phase /, "", line);
      split(line, parts, " - ");
      phase_num = parts[1];
      phase_type = "";
      phase_dir = "";
      checklist_section = "";
      item_expected = 1;
      have_type = 0;
      have_dir = 0;
      phase_count++;

      expected_num = sprintf("%02d", expected);
      if (phase_num != expected_num) {
        fail("Expected phase number " expected_num " but found " phase_num ".");
        expected = phase_num + 1;
      } else {
        expected++;
      }
      next;
    }

    phase_num != "" && /^Type: / {
      phase_type = substr($0, 7);
      have_type = 1;
      next;
    }

    phase_num != "" && /^Output summary directory: `/ {
      line = $0;
      sub(/^Output summary directory: `/, "", line);
      sub(/`$/, "", line);
      phase_dir = line;
      have_dir = 1;
      next;
    }

    phase_num != "" && ($0 == "Tasks:" || $0 == "Acceptance tests:") {
      checklist_section = "items";
      next;
    }

    phase_num != "" && checklist_section == "items" {
      if ($0 == "") {
        next;
      }

      if ($0 ~ /^- \[ \] /) {
        text = substr($0, 7);
        split(text, parts, " ");
        item_id = parts[1];

        if (item_id !~ /^[0-9][0-9]\.[0-9]+$/) {
          fail("Phase " phase_num " has a task/test item without a valid numbered checkbox: " $0);
          next;
        }

        split(item_id, id_parts, ".");
        item_phase = id_parts[1];
        item_number = id_parts[2] + 0;

        if (item_phase != phase_num) {
          fail("Phase " phase_num " has a task/test item with mismatched phase prefix: " item_id);
        }

        if (item_number != item_expected) {
          fail("Phase " phase_num " expected item " phase_num "." item_expected " but found " item_id);
          item_expected = item_number + 1;
        } else {
          item_expected++;
        }
        next;
      }

      checklist_section = "";
    }

    END {
      flush_phase();

      if (phase_count == 0) {
        fail("No phases found.");
      }

      if (error_count > 0) {
        exit 1;
      }
    }
  ' "$ROADMAP"
}

display_limit() {
  local value="$1"
  if [[ "$value" -eq 0 ]]; then
    printf "inf"
  else
    printf "%s" "$value"
  fi
}

summary_path() {
  printf "%s/%s/SUMMARY.md" "$ROOT" "$1"
}

decision_path() {
  printf "%s/%s/DECISION.md" "$ROOT" "$1"
}

verify_path() {
  printf "%s/%s/VERIFY.md" "$ROOT" "$1"
}

manual_test_path() {
  printf "%s/%s/MANUAL_TEST.md" "$ROOT" "$1"
}

stage_artifact_exists() {
  local stage="$1"
  local phase_type="$2"
  local phase_dir="$3"

  case "$stage" in
    implement)
      [[ -s "$(summary_path "$phase_dir")" ]] || return 1
      if [[ "$phase_type" == "Research" && ! -s "$(decision_path "$phase_dir")" ]]; then
        return 1
      fi
      return 0
      ;;
    verify)
      [[ -s "$(verify_path "$phase_dir")" ]]
      return
      ;;
    manual)
      [[ -s "$(manual_test_path "$phase_dir")" ]]
      return
      ;;
    *)
      echo "Unknown stage: $stage" >&2
      return 1
      ;;
  esac
}

phase_is_complete() {
  local phase_type="$1"
  local phase_dir="$2"

  [[ -s "$(summary_path "$phase_dir")" ]] || return 1
  [[ -s "$(verify_path "$phase_dir")" ]] || return 1
  [[ -s "$(manual_test_path "$phase_dir")" ]] || return 1

  if [[ "$phase_type" == "Research" && ! -s "$(decision_path "$phase_dir")" ]]; then
    return 1
  fi

  return 0
}

list_phases() {
  awk '
    BEGIN {
      phase_num = "";
      phase_title = "";
      phase_type = "";
      phase_dir = "";
    }
    /^## Phase [0-9][0-9] - / {
      if (phase_num != "") {
        printf "%s\t%s\t%s\t%s\n", phase_num, phase_title, phase_type, phase_dir;
      }

      line = $0;
      sub(/^## Phase /, "", line);
      split(line, parts, " - ");
      phase_num = parts[1];
      phase_title = substr(line, length(parts[1]) + 4);
      phase_type = "";
      phase_dir = "";
      next;
    }
    phase_num != "" && /^Type: / {
      phase_type = substr($0, 7);
      next;
    }
    phase_num != "" && /^Output summary directory: `/ {
      line = $0;
      sub(/^Output summary directory: `/, "", line);
      sub(/`$/, "", line);
      phase_dir = line;
      next;
    }
    END {
      if (phase_num != "") {
        printf "%s\t%s\t%s\t%s\n", phase_num, phase_title, phase_type, phase_dir;
      }
    }
  ' "$ROADMAP"
}

phase_block() {
  local wanted="$1"
  awk -v wanted="$wanted" '
    $0 ~ "^## Phase " wanted " - " {
      printing = 1;
    }
    printing {
      if ($0 ~ "^## Phase [0-9][0-9] - " && $0 !~ "^## Phase " wanted " - ") {
        exit;
      }
      print;
    }
  ' "$ROADMAP"
}

find_phase_record() {
  local wanted="${1:-}"

  while IFS=$'\t' read -r phase_num phase_title phase_type phase_dir; do
    [[ -n "$phase_num" ]] || continue

    if [[ -n "$wanted" ]]; then
      if [[ "$phase_num" == "$wanted" ]]; then
        printf "%s\t%s\t%s\t%s\n" "$phase_num" "$phase_title" "$phase_type" "$phase_dir"
        return 0
      fi
      continue
    fi

    if ! phase_is_complete "$phase_type" "$phase_dir"; then
      printf "%s\t%s\t%s\t%s\n" "$phase_num" "$phase_title" "$phase_type" "$phase_dir"
      return 0
    fi
  done < <(list_phases)

  return 1
}

check_run_cap() {
  local run_count="$1"
  if [[ "$MAX_ITERATIONS" -gt 0 && "$run_count" -ge "$MAX_ITERATIONS" ]]; then
    echo "Reached run cap of ${MAX_ITERATIONS} Codex runs before roadmap completion." >&2
    exit 1
  fi
}

check_phase_cycle_cap() {
  local phase_num="$1"
  local cycle="$2"
  if [[ "$MAX_PHASE_CYCLES" -gt 0 && "$cycle" -gt "$MAX_PHASE_CYCLES" ]]; then
    echo "Reached phase cycle cap of ${MAX_PHASE_CYCLES} for Phase ${phase_num}." >&2
    exit 1
  fi
}

build_prompt() {
  local stage="$1"
  local phase_num="$2"
  local phase_title="$3"
  local phase_type="$4"
  local phase_dir="$5"
  local phase_cycle="$6"
  local summary_rel="${phase_dir}/SUMMARY.md"
  local decision_rel="${phase_dir}/DECISION.md"
  local verify_rel="${phase_dir}/VERIFY.md"
  local manual_rel="${phase_dir}/MANUAL_TEST.md"
  local block
  local header
  local stage_rules

  block="$(phase_block "$phase_num")"

  case "$stage" in
    implement)
      header="implementation"
      stage_rules="$(cat <<EOF
- Perform the actual implementation or research work for this phase.
- Run the relevant automated tests or research checks for this phase.
- Fix problems you find in this run instead of leaving them for later.
- Write or update ${summary_rel} with:
  1. changes made
  2. tests or research performed
  3. results
  4. blockers and next-step notes
$(if [[ "$phase_type" == "Research" ]]; then printf '%s\n' "- Also write or update ${decision_rel} with the concrete decision, rationale, and rejected alternatives."; fi)
- If this phase reveals genuinely new bounded follow-up work beyond its stated scope, append new phases to ROADMAP.md with acceptance tests and output directories.
EOF
)"
      ;;
    verify)
      header="verification"
      stage_rules="$(cat <<EOF
- Independently verify this phase in a fresh context.
- Read the phase block plus existing ${summary_rel}$(if [[ "$phase_type" == "Research" ]]; then printf ', %s' "$decision_rel"; fi).
- Validate the acceptance tests, implementation boundaries, and documentation quality for this phase.
- If you find issues, fix them yourself, rerun the relevant checks, and update the phase artifacts.
- Write or update ${verify_rel} with:
  1. checks performed
  2. issues found
  3. fixes applied
  4. residual risks or explicit confirmation that none were found
EOF
)"
      ;;
    manual)
      header="manual-test"
      stage_rules="$(cat <<EOF
- Independently run manual or smoke tests for this phase in a fresh context.
- Prefer real CLI or user-visible scenarios over mocks when feasible.
- If truly no executable manual scenario applies, document that clearly and perform the highest-fidelity artifact or workflow inspection instead.
- If you find issues, fix them yourself, rerun the relevant checks, and update the phase artifacts.
- Write or update ${manual_rel} with:
  1. scenarios run
  2. results
  3. fixes applied
  4. residual risks or explicit confirmation that none were found
EOF
)"
      ;;
    *)
      echo "Unknown stage: $stage" >&2
      exit 1
      ;;
  esac

  cat <<EOF
Execute the ${header} context for exactly one ROADMAP phase in a Ralph-style loop.

Repository root: ${ROOT}
Roadmap: ROADMAP.md
Phase: ${phase_num} - ${phase_title}
Type: ${phase_type}
Output directory: ${phase_dir}
Phase cycle: ${phase_cycle}
Stage: ${header}

Rules:
- Fresh context. Do not rely on prior chat state.
- Read the relevant phase block in ROADMAP.md and the current on-disk phase artifacts before acting.
- Execute only this phase. Do not intentionally start a later phase.
- Own failures. If something is broken or incomplete, diagnose and fix it yourself before calling it blocked.
- Keep decisions lean and practical.
- Do not silently defer fixable work.
- Update the relevant checkboxes for this phase in ROADMAP.md as tasks, acceptance tests, verification, and manual testing become complete.

Phase artifacts:
- Summary: ${summary_rel}
- Verification: ${verify_rel}
- Manual test: ${manual_rel}
$(if [[ "$phase_type" == "Research" ]]; then printf '%s\n' "- Decision: ${decision_rel}"; fi)

Stage-specific instructions:
${stage_rules}

Phase block from ROADMAP.md:

${block}
EOF
}

run_stage() {
  local run_number="$1"
  local total_runs="$2"
  local phase_num="$3"
  local phase_title="$4"
  local phase_type="$5"
  local phase_dir="$6"
  local phase_cycle="$7"
  local stage="$8"
  local phase_abs="${ROOT}/${phase_dir}"
  local timestamp
  local prompt_file
  local log_file
  local last_message_file
  local -a cmd
  local status=0

  mkdir -p "$phase_abs" "${RUNNER_DIR}/prompts" "${RUNNER_DIR}/logs" "${RUNNER_DIR}/last-messages"

  timestamp="$(date +%Y%m%d-%H%M%S)"
  prompt_file="${RUNNER_DIR}/prompts/${timestamp}-phase-${phase_num}-cycle-${phase_cycle}-${stage}.md"
  log_file="${RUNNER_DIR}/logs/${timestamp}-phase-${phase_num}-cycle-${phase_cycle}-${stage}.log"
  last_message_file="${RUNNER_DIR}/last-messages/${timestamp}-phase-${phase_num}-cycle-${phase_cycle}-${stage}.md"

  build_prompt "$stage" "$phase_num" "$phase_title" "$phase_type" "$phase_dir" "$phase_cycle" > "$prompt_file"

  echo
  echo "================================================================="
  echo "Ralph run ${run_number}/${total_runs}: Phase ${phase_num} - ${phase_title}"
  echo "Cycle: ${phase_cycle}"
  echo "Stage: ${stage}"
  echo "Model: ${MODEL} (${MODEL_REASONING_EFFORT})"
  echo "Prompt: ${prompt_file}"
  echo "Log:    ${log_file}"
  echo "================================================================="

  cmd=(codex)
  if [[ "$SEARCH" -eq 1 ]]; then
    cmd+=(--search)
  fi
  cmd+=(exec --cd "$ROOT" --sandbox workspace-write --color never --model "$MODEL")
  cmd+=(-c "model_reasoning_effort=\"${MODEL_REASONING_EFFORT}\"")
  cmd+=(-o "$last_message_file" -)

  set +e
  "${cmd[@]}" < "$prompt_file" | tee "$log_file"
  status=${PIPESTATUS[0]}
  set -e

  if stage_artifact_exists "$stage" "$phase_type" "$phase_dir"; then
    echo "Stage ${stage} for Phase ${phase_num} produced its artifact."
    return 0
  fi

  if [[ "$status" -ne 0 ]]; then
    echo "Stage ${stage} for Phase ${phase_num} exited with status ${status} and did not complete its artifact." >&2
  else
    echo "Stage ${stage} for Phase ${phase_num} did not complete its artifact." >&2
  fi

  return 1
}

run_phase_until_complete() {
  local phase_num="$1"
  local phase_title="$2"
  local phase_type="$3"
  local phase_dir="$4"
  local phase_cycle=0
  local total_runs_display

  total_runs_display="$(display_limit "$MAX_ITERATIONS")"
  : "${RUN_COUNT:=0}"

  while ! phase_is_complete "$phase_type" "$phase_dir"; do
    phase_cycle=$((phase_cycle + 1))
    check_phase_cycle_cap "$phase_num" "$phase_cycle"

    for stage in implement verify manual; do
      check_run_cap "$RUN_COUNT"
      RUN_COUNT=$((RUN_COUNT + 1))
      run_stage "$RUN_COUNT" "$total_runs_display" "$phase_num" "$phase_title" "$phase_type" "$phase_dir" "$phase_cycle" "$stage" || true
    done
  done

  echo "Phase ${phase_num} is complete."
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --iterations)
      MAX_ITERATIONS="$2"
      shift 2
      ;;
    --max-phase-cycles|--max-phase-attempts)
      MAX_PHASE_CYCLES="$2"
      shift 2
      ;;
    --model)
      MODEL="$2"
      shift 2
      ;;
    --reasoning-effort)
      MODEL_REASONING_EFFORT="$2"
      shift 2
      ;;
    --search)
      SEARCH=1
      shift
      ;;
    --validate)
      VALIDATE_ONLY=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

validate_nonnegative_int "$MAX_ITERATIONS" "--iterations"
validate_nonnegative_int "$MAX_PHASE_CYCLES" "--max-phase-cycles"

require_cmd codex
require_cmd awk
require_cmd tee

if [[ ! -f "$ROADMAP" ]]; then
  echo "ROADMAP.md not found at ${ROADMAP}" >&2
  exit 1
fi

if [[ "$VALIDATE_ONLY" -eq 1 ]]; then
  validate_roadmap_structure
  echo "ROADMAP.md validation passed."
  exit 0
fi

mkdir -p "$RUNNER_DIR"

while true; do
  if ! PHASE_RECORD="$(find_phase_record)"; then
    echo "All ROADMAP phases appear complete."
    exit 0
  fi

  IFS=$'\t' read -r phase_num phase_title phase_type phase_dir <<< "$PHASE_RECORD"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "Next phase: ${phase_num} - ${phase_title} (${phase_type})"
    echo "Output: ${phase_dir}"
    echo "Model: ${MODEL} (${MODEL_REASONING_EFFORT})"
    exit 0
  fi

  : "${RUN_COUNT:=0}"
  run_phase_until_complete "$phase_num" "$phase_title" "$phase_type" "$phase_dir"
done
