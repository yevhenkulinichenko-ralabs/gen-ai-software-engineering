'use strict';

const fs = require('fs');
const path = require('path');

const validator = require('./pipeline/validator');
const fraudDetector = require('./pipeline/fraud-detector');
const settlement = require('./pipeline/settlement');

const ROOT_DIR = __dirname;
const DEFAULT_SHARED_DIR = path.join(ROOT_DIR, 'shared');
const DEFAULT_SAMPLE_FILE = path.join(ROOT_DIR, 'sample-transactions.json');

/**
 * Resolve the directory paths used for the input/processing/output/results
 * hand-off, based on a base directory. Defaults to the repo's real
 * shared/ directory so existing callers (CLI, frontend/server.js,
 * mcp/server.js) that call runPipeline() with no arguments keep working
 * unchanged.
 *
 * @param {string} baseDir
 * @returns {{ INPUT_DIR: string, PROCESSING_DIR: string, OUTPUT_DIR: string, RESULTS_DIR: string }}
 */
function resolveDirs(baseDir) {
  return {
    INPUT_DIR: path.join(baseDir, 'input'),
    PROCESSING_DIR: path.join(baseDir, 'processing'),
    OUTPUT_DIR: path.join(baseDir, 'output'),
    RESULTS_DIR: path.join(baseDir, 'results'),
  };
}

function ensureDirectories(dirs) {
  for (const dir of [dirs.INPUT_DIR, dirs.PROCESSING_DIR, dirs.OUTPUT_DIR, dirs.RESULTS_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Run one raw record through validator -> fraud_detector -> settlement,
 * writing the file-based hand-off artifacts at each step.
 *
 * @param {object} record - raw transaction record
 * @param {object} dirs - resolved directory paths (see resolveDirs)
 * @returns {object} the final settlement envelope
 */
function processRecord(record, dirs) {
  const transactionId = record.transaction_id;

  // Drop the initial record into shared/input/.
  const inputPath = path.join(dirs.INPUT_DIR, `${transactionId}.json`);
  writeJson(inputPath, record);

  // Mark as being worked on: copy into shared/processing/ for the
  // validator stage's hand-off point.
  const processingPath = path.join(dirs.PROCESSING_DIR, `${transactionId}.json`);
  writeJson(processingPath, readJson(inputPath));

  // Stage 1: validator.
  const validated = validator.processTransaction(readJson(processingPath));
  const afterValidatorPath = path.join(dirs.OUTPUT_DIR, `${transactionId}.json`);
  writeJson(afterValidatorPath, validated);

  // Stage 2: fraud_detector (reads validator's output as its input).
  const scored = fraudDetector.processTransaction(readJson(afterValidatorPath));
  writeJson(afterValidatorPath, scored);

  // Stage 3: settlement (reads fraud_detector's output as its input).
  const settled = settlement.processTransaction(readJson(afterValidatorPath));
  writeJson(afterValidatorPath, settled);

  // Final result.
  const resultPath = path.join(dirs.RESULTS_DIR, `${transactionId}.json`);
  writeJson(resultPath, settled);

  return settled;
}

/**
 * Run the full pipeline over every record in sample-transactions.json.
 *
 * @param {object} [options]
 * @param {string} [options.baseDir] - base directory containing/receiving
 *   input/processing/output/results subdirectories. Defaults to the repo's
 *   real shared/ directory, preserving existing CLI/frontend/mcp behavior.
 * @param {string} [options.sampleFile] - path to the JSON file of raw
 *   transaction records to process. Defaults to the repo's
 *   sample-transactions.json.
 * @returns {object} summary object: { total, settled, rejected, held_for_review, transactions }
 */
function runPipeline(options = {}) {
  const baseDir = options.baseDir || DEFAULT_SHARED_DIR;
  const sampleFile = options.sampleFile || DEFAULT_SAMPLE_FILE;
  const dirs = resolveDirs(baseDir);

  ensureDirectories(dirs);

  const records = readJson(sampleFile);

  const transactions = [];
  let settledCount = 0;
  let rejectedCount = 0;
  let heldForReviewCount = 0;

  for (const record of records) {
    const finalEnvelope = processRecord(record, dirs);
    const data = finalEnvelope.data;
    const finalStatus = data.final_status;

    if (finalStatus === 'settled') settledCount += 1;
    else if (finalStatus === 'rejected') rejectedCount += 1;
    else if (finalStatus === 'held_for_review') heldForReviewCount += 1;

    const entry = {
      transaction_id: data.transaction_id,
      final_status: finalStatus,
    };
    if (data.reason) entry.reason = data.reason;

    transactions.push(entry);
  }

  const summary = {
    total: records.length,
    settled: settledCount,
    rejected: rejectedCount,
    held_for_review: heldForReviewCount,
    transactions,
  };

  const summaryPath = path.join(dirs.RESULTS_DIR, 'summary.json');
  writeJson(summaryPath, summary);

  return summary;
}

function printSummary(summary) {
  console.log('\nTransaction Pipeline Summary');
  console.log('=============================');
  console.log(`Total:            ${summary.total}`);
  console.log(`Settled:          ${summary.settled}`);
  console.log(`Rejected:         ${summary.rejected}`);
  console.log(`Held for review:  ${summary.held_for_review}`);
  console.log('');

  const notable = summary.transactions.filter(
    (t) => t.final_status === 'rejected' || t.final_status === 'held_for_review'
  );

  if (notable.length > 0) {
    console.log('Notable transactions:');
    for (const t of notable) {
      const reasonText = t.reason ? ` (${t.reason})` : '';
      console.log(`  ${t.transaction_id}: ${t.final_status}${reasonText}`);
    }
    console.log('');
  }
}

if (require.main === module) {
  try {
    const summary = runPipeline();
    printSummary(summary);
    process.exit(0);
  } catch (err) {
    console.error('Unhandled error running pipeline:', err);
    process.exit(1);
  }
}

module.exports = { runPipeline, printSummary };
