'use strict';

const { v4: uuidv4 } = require('uuid');
const { logDecision } = require('../lib/logger');

const STAGE_NAME = 'settlement';

/**
 * Apply settlement decision rules to a fraud-scored transaction envelope.
 *
 *  - status === 'rejected'      -> final_status = 'rejected' (reason passed through)
 *  - status === 'flagged_fraud' -> final_status = 'held_for_review' (not settled)
 *  - otherwise ('validated' | 'reviewed') -> final_status = 'settled', settled_at stamped
 *
 * @param {object} message - envelope produced by pipeline/fraud-detector.js
 * @returns {object} final envelope, ready to persist as shared/results/<transaction_id>.json
 */
function processTransaction(message) {
  const data = message.data;
  const transactionId = data && data.transaction_id;

  let finalStatus;
  let extra = {};

  if (data.status === 'rejected') {
    finalStatus = 'rejected';
    // reason already present on data; pass through unchanged.
  } else if (data.status === 'flagged_fraud') {
    finalStatus = 'held_for_review';
  } else {
    // 'validated' or 'reviewed'
    finalStatus = 'settled';
    extra = { settled_at: new Date().toISOString() };
  }

  const newData = {
    ...data,
    ...extra,
    final_status: finalStatus,
  };

  logDecision(STAGE_NAME, transactionId, finalStatus);

  return {
    message_id: uuidv4(),
    timestamp: new Date().toISOString(),
    source_stage: STAGE_NAME,
    target_stage: 'results',
    message_type: 'transaction_result',
    data: newData,
  };
}

module.exports = { processTransaction };
