#!/usr/bin/env node
'use strict';

/**
 * Coverage gate for `git push`.
 *
 * This script is wired up as a Claude Code PreToolUse hook (see
 * .claude/settings.json) matching the Bash tool. Claude Code hooks receive
 * a JSON payload on stdin describing the tool call that is about to run.
 * For Bash tool calls that payload includes `tool_input.command`.
 *
 * We only want to run the (relatively expensive) Jest coverage check when
 * the command being gated is actually `git push` — every other Bash call
 * should be a no-op so the hook doesn't slow down or interfere with normal
 * development commands.
 *
 * If this script is invoked standalone (e.g. `node scripts/check-coverage.js`
 * for manual testing) there is no hook payload on stdin, so JSON parsing
 * will fail/produce nothing useful — in that case we fall back to just
 * running the coverage check directly.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COVERAGE_THRESHOLD = 80;
const COVERAGE_SUMMARY_PATH = path.join(process.cwd(), 'coverage', 'coverage-summary.json');

function readStdinSync() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (err) {
    return '';
  }
}

function shouldRunCoverageCheck() {
  const raw = readStdinSync();

  if (!raw || !raw.trim()) {
    // No stdin payload at all (e.g. manual run) — fall back to running the check.
    return true;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    // Not valid JSON — assume standalone/manual invocation and run the check.
    return true;
  }

  const command = payload && payload.tool_input && payload.tool_input.command;
  if (typeof command !== 'string') {
    // No command to inspect — nothing to gate, no-op.
    return false;
  }

  return command.includes('git push');
}

function runCoverageCheck() {
  const jestResult = spawnSync(
    'npx',
    ['jest', '--coverage', '--coverageReporters=json-summary', '--coverageReporters=text-summary'],
    { stdio: 'inherit', shell: true }
  );

  if (jestResult.status !== 0) {
    // Jest itself failed (test failures, crash, etc.) — its own output was
    // already surfaced via stdio: 'inherit'. Exit code 2 is what Claude
    // Code's PreToolUse hook contract treats as "block this tool call"
    // (stderr becomes the feedback Claude sees); exit 1 is just a
    // non-blocking error and would let `git push` proceed anyway.
    console.error('BLOCKED: jest failed, coverage gate cannot pass');
    process.exit(2);
  }

  let pct = 0;
  if (fs.existsSync(COVERAGE_SUMMARY_PATH)) {
    try {
      const summary = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY_PATH, 'utf8'));
      // Using `lines.pct` rather than `statements.pct` because lines
      // coverage is the metric TASKS.md's 80% gate refers to.
      pct = (summary && summary.total && summary.total.lines && summary.total.lines.pct) || 0;
    } catch (err) {
      console.log(`Could not parse ${COVERAGE_SUMMARY_PATH}: ${err.message}`);
      pct = 0;
    }
  } else {
    console.log(`No coverage data found at ${COVERAGE_SUMMARY_PATH} (no tests yet?) — treating coverage as 0%.`);
  }

  if (pct < COVERAGE_THRESHOLD) {
    console.log(`Line coverage: ${pct}%`);
    // Exit code 2 is required to block a PreToolUse hook in Claude Code;
    // stderr is what's surfaced back to Claude as the block reason.
    console.error(`BLOCKED: coverage below ${COVERAGE_THRESHOLD}% threshold`);
    process.exit(2);
  }

  console.log(`Line coverage: ${pct}%`);
  console.log('coverage gate passed');
  process.exit(0);
}

if (require.main === module) {
  if (shouldRunCoverageCheck()) {
    runCoverageCheck();
  } else {
    process.exit(0);
  }
}
