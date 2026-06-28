#!/usr/bin/env bash
# Runs the full bug-research-and-fix pipeline sequentially, then fires the
# security-verifier and unit-tests-generator in parallel as a final phase.
set -euo pipefail

# ── setup ──────────────────────────────────────────────────────────────────────
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$DIR/.pipeline-logs"
mkdir -p "$LOG_DIR"

PIPELINE_START=$(date +%s)

# ── helpers ────────────────────────────────────────────────────────────────────
log()     { printf '\033[1;36m[%s]\033[0m %s\n'      "$(date '+%H:%M:%S')" "$*"; }
ok()      { printf '\033[1;32m[%s] ✓ %s\033[0m\n'   "$(date '+%H:%M:%S')" "$*"; }
err()     { printf '\033[1;31mERROR: %s\033[0m\n'   "$*" >&2; }
elapsed() { echo $(( $(date +%s) - PIPELINE_START ))s; }

run_agent() {
  local agent="$1"
  local prompt="$2"
  local logfile="$LOG_DIR/${agent}.log"
  local start; start=$(date +%s)

  log "Phase: $agent"
  if ! claude --agent "$agent" --dangerously-skip-permissions -p "$prompt" \
        >"$logfile" 2>&1; then
    err "$agent failed after $(( $(date +%s) - start ))s — see $logfile"
    exit 1
  fi
  ok "$agent completed in $(( $(date +%s) - start ))s"
}

# ── sequential phases ──────────────────────────────────────────────────────────
run_agent "bug-researcher" \
  "Analyse the entire codebase and produce individual bug research reports in research/bugs/ and a summary index at research/codebase-research.md."

run_agent "bug-research-verifier" \
  "Read every bug report listed in research/codebase-research.md, evaluate quality, and write the consolidated verdict file at research/verified-research.md."

run_agent "bug-planner" \
  "Read research/verified-research.md and create a developer-ready fix plan in research/fixes/ for every verified bug."

run_agent "bug-fixer" \
  "Implement all fix plans found in research/fixes/ and write implementation reports to research/outputs/."

# ── parallel phase ─────────────────────────────────────────────────────────────
log "Phase: security-verifier & unit-tests-generator (parallel)"

SEC_LOG="$LOG_DIR/security-verifier.log"
TEST_LOG="$LOG_DIR/unit-tests-generator.log"

claude --agent "security-verifier" --dangerously-skip-permissions -p \
  "Review all uncommitted changes and research/outputs/ files for security vulnerabilities and write research/security-report.md." \
  >"$SEC_LOG" 2>&1 &
PID_SEC=$!

claude --agent "unit-tests-generator" --dangerously-skip-permissions -p \
  "Generate unit tests for all uncommitted changes and features described in research/outputs/, place them in tests/, run the suite, and write research/test-report.md." \
  >"$TEST_LOG" 2>&1 &
PID_TEST=$!

SEC_RC=0;  wait "$PID_SEC"  || SEC_RC=$?
TEST_RC=0; wait "$PID_TEST" || TEST_RC=$?

FAILED=0
if [[ $SEC_RC -ne 0 ]]; then
  err "security-verifier failed (exit $SEC_RC) — see $SEC_LOG"
  FAILED=1
else
  ok "security-verifier completed"
fi

if [[ $TEST_RC -ne 0 ]]; then
  err "unit-tests-generator failed (exit $TEST_RC) — see $TEST_LOG"
  FAILED=1
else
  ok "unit-tests-generator completed"
fi

# ── summary ────────────────────────────────────────────────────────────────────
echo
if [[ $FAILED -eq 0 ]]; then
  printf '\033[1;32mPipeline complete in %s. Logs → %s/\033[0m\n' "$(elapsed)" "$LOG_DIR"
else
  printf '\033[1;31mPipeline finished with errors in %s. Check logs in %s/\033[0m\n' \
    "$(elapsed)" "$LOG_DIR"
  exit 1
fi
