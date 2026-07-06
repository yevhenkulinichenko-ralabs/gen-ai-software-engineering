'use strict';

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Decimal = require('decimal.js');
const { logDecision } = require('../lib/logger');

const STAGE_NAME = 'validator';

// ISO 4217 allow-list. Spec requires at minimum USD, EUR, GBP, JPY.
const ALLOWED_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'JPY']);

const REQUIRED_FIELDS = [
  'transaction_id',
  'source_account',
  'destination_account',
  'amount',
  'currency',
  'transaction_type',
  'timestamp',
];

/**
 * Parse a monetary amount string into a decimal.js Decimal.
 *
 * decimal.js throws a DecimalError (rather than returning a NaN sentinel)
 * when the constructor argument cannot be parsed as a number, so a
 * non-numeric amount string must be guarded with try/catch here -- see
 * research-notes.md entry #1 (context7 query against /mikemcl/decimal.js).
 *
 * @param {string} amountStr
 * @returns {Decimal|null} the parsed Decimal, or null if unparseable
 */
function parseAmount(amountStr) {
  try {
    return new Decimal(amountStr);
  } catch (err) {
    return null;
  }
}

function buildEnvelope(record, data) {
  return {
    message_id: uuidv4(),
    timestamp: new Date().toISOString(),
    source_stage: STAGE_NAME,
    target_stage: 'fraud_detector',
    message_type: 'transaction',
    data,
  };
}

/**
 * Validate and normalize a single raw transaction record.
 *
 * Refund sign rule (documented per Implementation Notes): `refund` is the
 * only transaction_type allowed to carry a negative source amount. When a
 * refund amount is negative, the validator normalizes it to its absolute
 * value via Decimal.abs() and marks the record validated (not rejected).
 * A negative amount on any other transaction_type is a validation
 * failure (reason: 'negative_amount_not_allowed').
 *
 * @param {object} record - raw transaction record (as in sample-transactions.json)
 * @returns {object} message envelope with data.status of 'validated' | 'rejected'
 */
function processTransaction(record) {
  const transactionId = record && record.transaction_id;

  // 1. Required fields check.
  for (const field of REQUIRED_FIELDS) {
    const value = record ? record[field] : undefined;
    if (value === undefined || value === null || value === '') {
      const reason = `missing_required_field:${field}`;
      logDecision(STAGE_NAME, transactionId || 'UNKNOWN', `rejected:${reason}`);
      return buildEnvelope(record || {}, {
        ...record,
        status: 'rejected',
        reason,
      });
    }
  }

  // 2. Amount must parse as a decimal.js Decimal.
  const parsedAmount = parseAmount(record.amount);
  if (parsedAmount === null || parsedAmount.isNaN()) {
    const reason = 'invalid_amount';
    logDecision(STAGE_NAME, transactionId, `rejected:${reason}`);
    return buildEnvelope(record, {
      ...record,
      status: 'rejected',
      reason,
    });
  }

  // 3. Currency must be in the ISO 4217 allow-list.
  if (!ALLOWED_CURRENCIES.has(record.currency)) {
    const reason = 'invalid_currency';
    logDecision(STAGE_NAME, transactionId, `rejected:${reason}`);
    return buildEnvelope(record, {
      ...record,
      status: 'rejected',
      reason,
    });
  }

  // 4. Negative amount rule: only refunds may be negative; normalize.
  let normalizedAmount = parsedAmount;
  if (parsedAmount.isNegative()) {
    if (record.transaction_type !== 'refund') {
      const reason = 'negative_amount_not_allowed';
      logDecision(STAGE_NAME, transactionId, `rejected:${reason}`);
      return buildEnvelope(record, {
        ...record,
        status: 'rejected',
        reason,
      });
    }
    normalizedAmount = parsedAmount.abs();
  }

  // All checks passed. Normalize to a fixed 2-decimal-place string (e.g.
  // "100.00", not decimal.js's default trailing-zero-stripped "100") so
  // downstream stages and the persisted envelope preserve cents, matching
  // the spec's explicit TXN007 example ("-100.00" -> "100.00").
  logDecision(STAGE_NAME, transactionId, 'validated');
  return buildEnvelope(record, {
    ...record,
    amount: normalizedAmount.toFixed(2),
    status: 'validated',
  });
}

/**
 * CLI dry-run entry point: reads sample-transactions.json, runs every
 * record through processTransaction, and prints a summary table without
 * writing anything to shared/.
 */
function runDryRun() {
  const samplePath = path.join(__dirname, '..', 'sample-transactions.json');
  const raw = fs.readFileSync(samplePath, 'utf8');
  const records = JSON.parse(raw);

  const results = records.map((record) => {
    const envelope = processTransaction(record);
    return {
      transaction_id: record.transaction_id,
      status: envelope.data.status,
      reason: envelope.data.reason || '',
    };
  });

  const total = results.length;
  const validCount = results.filter((r) => r.status === 'validated').length;
  const invalidCount = total - validCount;

  console.log('\nValidation Dry-Run Summary');
  console.log('==========================');
  console.log(`Total:   ${total}`);
  console.log(`Valid:   ${validCount}`);
  console.log(`Invalid: ${invalidCount}`);
  console.log('');
  console.log('transaction_id | status     | reason');
  console.log('---------------|------------|--------------------------------');
  for (const r of results) {
    console.log(
      `${r.transaction_id.padEnd(14)} | ${r.status.padEnd(10)} | ${r.reason}`
    );
  }
  console.log('');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--dry-run')) {
    runDryRun();
  } else {
    console.log('Usage: node pipeline/validator.js --dry-run');
  }
}

module.exports = { processTransaction, runDryRun };
