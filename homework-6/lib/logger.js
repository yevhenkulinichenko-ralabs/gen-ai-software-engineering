'use strict';

/**
 * Shared PII-safe audit logger utility.
 *
 * Every pipeline stage (validator, fraud-detector, settlement) calls
 * `logDecision` once per transaction to emit a structured audit line
 * containing only: an ISO 8601 timestamp, the stage name, the
 * transaction_id, and an outcome descriptor.
 *
 * Hard rule: never pass or log account numbers (source_account /
 * destination_account), names, or free-text descriptions. Callers must
 * only supply the transaction_id and a small outcome object/string —
 * never the full record.
 */

/**
 * Log a single stage decision.
 *
 * @param {string} stage - stage name, e.g. 'validator' | 'fraud_detector' | 'settlement'
 * @param {string} transactionId - the transaction_id being processed
 * @param {string|object} outcome - short outcome descriptor (e.g. 'validated',
 *   'rejected:invalid_currency', or an object like { status, risk_score })
 */
function logDecision(stage, transactionId, outcome) {
  const entry = {
    timestamp: new Date().toISOString(),
    stage,
    transaction_id: transactionId,
    outcome,
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));

  return entry;
}

module.exports = { logDecision };
