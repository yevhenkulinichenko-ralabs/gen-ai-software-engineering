'use strict';

const { processTransaction } = require('../pipeline/settlement');

function makeMessage(status, overrides = {}) {
  return {
    message_id: 'msg-1',
    timestamp: new Date().toISOString(),
    source_stage: 'fraud_detector',
    target_stage: 'settlement',
    message_type: 'transaction',
    data: {
      transaction_id: 'ST-001',
      source_account: 'ACC-1',
      destination_account: 'ACC-2',
      amount: '100.00',
      currency: 'USD',
      transaction_type: 'transfer',
      timestamp: '2026-01-10T14:00:00Z',
      status,
      ...overrides,
    },
  };
}

describe('settlement.processTransaction', () => {
  test('rejected input stays rejected, reason passed through', () => {
    const message = makeMessage('rejected', { reason: 'invalid_currency' });

    const envelope = processTransaction(message);

    expect(envelope.data.final_status).toBe('rejected');
    expect(envelope.data.reason).toBe('invalid_currency');
    expect(envelope.data.settled_at).toBeUndefined();
    expect(envelope.source_stage).toBe('settlement');
    expect(envelope.target_stage).toBe('results');
  });

  test('flagged_fraud input becomes held_for_review', () => {
    const message = makeMessage('flagged_fraud', {
      risk_score: 70,
      risk_factors: ['high_value', 'very_high_value', 'wire_transfer'],
    });

    const envelope = processTransaction(message);

    expect(envelope.data.final_status).toBe('held_for_review');
    expect(envelope.data.settled_at).toBeUndefined();
  });

  test('validated (clean) input becomes settled with a settled_at timestamp', () => {
    const message = makeMessage('validated');

    const beforeMs = Date.now();
    const envelope = processTransaction(message);
    const afterMs = Date.now();

    expect(envelope.data.final_status).toBe('settled');
    expect(typeof envelope.data.settled_at).toBe('string');

    const settledAtMs = new Date(envelope.data.settled_at).getTime();
    expect(settledAtMs).toBeGreaterThanOrEqual(beforeMs);
    expect(settledAtMs).toBeLessThanOrEqual(afterMs);
  });

  test('reviewed input also becomes settled with a settled_at timestamp', () => {
    const message = makeMessage('reviewed', {
      risk_score: 15,
      risk_factors: ['cross_border'],
    });

    const envelope = processTransaction(message);

    expect(envelope.data.final_status).toBe('settled');
    expect(typeof envelope.data.settled_at).toBe('string');
  });
});
