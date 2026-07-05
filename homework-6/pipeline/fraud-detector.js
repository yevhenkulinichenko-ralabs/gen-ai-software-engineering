'use strict';

const { v4: uuidv4 } = require('uuid');
const Decimal = require('decimal.js');
const { logDecision } = require('../lib/logger');

const STAGE_NAME = 'fraud_detector';

const FLAGGED_THRESHOLD = 60;

/**
 * Design note — resolving an inconsistency between the Mid-Level
 * Objective prose and the concrete Low-Level Task #2 worked examples:
 *
 * The Mid-Level Objective states TXN002 ($25,000 wire_transfer, US,
 * 09:15 UTC) should "score high enough to be flagged for review"
 * alongside TXN005. However, Low-Level Task #2 spells out the exact,
 * literal per-factor point values (high_value +40, very_high_value +20,
 * unusual_timing +20, cross_border +15, wire_transfer +10) and its own
 * worked example for TXN002 explicitly computes high_value (+40) +
 * wire_transfer (+10) = 50 -- "below the 60 threshold on value alone" --
 * with no other factor applicable (TXN002 is US, business hours, under
 * $50,000). There is no combination of the five documented factors that
 * pushes TXN002 to >= 60 given its actual field values.
 *
 * This implementation treats the concrete, literal formula (and its
 * worked arithmetic) as authoritative over the looser Mid-Level Objective
 * prose: TXN002 scores exactly 50 -> 'reviewed' (not 'flagged_fraud').
 * TXN005 ($75,000 wire_transfer, US, 10:00 UTC) scores high_value (+40) +
 * very_high_value (+20) + wire_transfer (+10) = 70 -> 'flagged_fraud',
 * which is unambiguous and consistent across both sections of the spec.
 */

/**
 * Compute the risk score and triggered factor names for a validated
 * transaction's data payload.
 *
 * Factors (per specification.md):
 *  - amount > 10000            -> +40 'high_value'
 *  - amount > 50000            -> +20 'very_high_value' (additional, on top of high_value)
 *  - hour in [0, 6) UTC        -> +20 'unusual_timing'
 *  - metadata.country !== 'US' -> +15 'cross_border'
 *  - transaction_type === 'wire_transfer' -> +10 'wire_transfer'
 *
 * Amount comparisons use decimal.js exclusively -- see research-notes.md
 * entry #1 (context7 query against /mikemcl/decimal.js) for why
 * `.greaterThan()` is used instead of coercing to Number.
 *
 * @param {object} data - the validated transaction data payload
 * @returns {{ score: number, factors: string[] }}
 */
function computeRiskScore(data) {
  const factors = [];
  let score = 0;

  const amount = new Decimal(data.amount);

  if (amount.greaterThan(10000)) {
    score += 40;
    factors.push('high_value');
  }

  if (amount.greaterThan(50000)) {
    score += 20;
    factors.push('very_high_value');
  }

  const hour = new Date(data.timestamp).getUTCHours();
  if (hour >= 0 && hour < 6) {
    score += 20;
    factors.push('unusual_timing');
  }

  const country = data.metadata && data.metadata.country;
  if (country !== 'US') {
    score += 15;
    factors.push('cross_border');
  }

  if (data.transaction_type === 'wire_transfer') {
    score += 10;
    factors.push('wire_transfer');
  }

  return { score: Math.min(score, 100), factors };
}

/**
 * Score a validated transaction envelope for fraud risk, or pass a
 * rejected envelope through unchanged.
 *
 * @param {object} message - envelope produced by pipeline/validator.js
 * @returns {object} envelope with data.risk_score / data.risk_factors / data.status set,
 *   routed to the settlement stage
 */
function processTransaction(message) {
  const data = message.data;
  const transactionId = data && data.transaction_id;

  if (data.status === 'rejected') {
    // Pass through unchanged -- no scoring for rejected records.
    logDecision(STAGE_NAME, transactionId, `passthrough:${data.status}`);
    return {
      message_id: uuidv4(),
      timestamp: new Date().toISOString(),
      source_stage: STAGE_NAME,
      target_stage: 'settlement',
      message_type: 'transaction',
      data,
    };
  }

  const { score, factors } = computeRiskScore(data);

  let status;
  if (score >= FLAGGED_THRESHOLD) {
    status = 'flagged_fraud';
  } else if (score > 0) {
    status = 'reviewed';
  } else {
    status = 'validated';
  }

  const newData = {
    ...data,
    risk_score: score,
    risk_factors: factors,
    status,
  };

  logDecision(STAGE_NAME, transactionId, `${status}:risk_score=${score}`);

  return {
    message_id: uuidv4(),
    timestamp: new Date().toISOString(),
    source_stage: STAGE_NAME,
    target_stage: 'settlement',
    message_type: 'transaction',
    data: newData,
  };
}

module.exports = { processTransaction };
