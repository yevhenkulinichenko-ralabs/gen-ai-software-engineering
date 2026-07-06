'use strict';

const Decimal = require('decimal.js');
const { processTransaction } = require('../pipeline/fraud-detector');

function makeValidatedMessage(overrides = {}) {
  return {
    message_id: 'msg-1',
    timestamp: new Date().toISOString(),
    source_stage: 'validator',
    target_stage: 'fraud_detector',
    message_type: 'transaction',
    data: {
      transaction_id: 'FD-001',
      source_account: 'ACC-1',
      destination_account: 'ACC-2',
      amount: '100.00',
      currency: 'USD',
      transaction_type: 'transfer',
      timestamp: '2026-01-10T14:00:00Z', // daytime UTC
      status: 'validated',
      metadata: { channel: 'online', country: 'US' },
      ...overrides,
    },
  };
}

describe('fraud-detector.processTransaction', () => {
  test('rejected input passes through unscored', () => {
    const message = makeValidatedMessage({
      status: 'rejected',
      reason: 'invalid_currency',
    });

    const envelope = processTransaction(message);

    expect(envelope.data.status).toBe('rejected');
    expect(envelope.data.risk_score).toBeUndefined();
    expect(envelope.data.risk_factors).toBeUndefined();
    expect(envelope.data.reason).toBe('invalid_currency');
    expect(envelope.source_stage).toBe('fraud_detector');
    expect(envelope.target_stage).toBe('settlement');
  });

  test('amount > 10000 adds high_value risk factor', () => {
    const message = makeValidatedMessage({ amount: '15000.00' });

    const envelope = processTransaction(message);

    expect(envelope.data.risk_factors).toContain('high_value');
    expect(envelope.data.risk_factors).not.toContain('very_high_value');
    expect(envelope.data.risk_score).toBe(40);
    expect(envelope.data.status).toBe('reviewed');
  });

  test('amount > 50000 additionally adds very_high_value factor', () => {
    const message = makeValidatedMessage({ amount: '60000.00' });

    const envelope = processTransaction(message);

    expect(envelope.data.risk_factors).toEqual(
      expect.arrayContaining(['high_value', 'very_high_value'])
    );
    expect(envelope.data.risk_score).toBe(60);
    expect(envelope.data.status).toBe('flagged_fraud');
  });

  test('cross-border (country !== "US") adds cross_border factor', () => {
    const message = makeValidatedMessage({
      amount: '100.00',
      metadata: { channel: 'api', country: 'DE' },
    });

    const envelope = processTransaction(message);

    expect(envelope.data.risk_factors).toContain('cross_border');
    expect(envelope.data.risk_score).toBe(15);
    expect(envelope.data.status).toBe('reviewed');
  });

  test('timestamp between 00:00-06:00 UTC adds unusual_timing factor', () => {
    const message = makeValidatedMessage({
      amount: '100.00',
      timestamp: '2026-01-10T03:30:00Z',
    });

    const envelope = processTransaction(message);

    expect(envelope.data.risk_factors).toContain('unusual_timing');
    expect(envelope.data.risk_score).toBe(20);
    expect(envelope.data.status).toBe('reviewed');
  });

  test('wire_transfer type alone adds a small factor that stays below flagged threshold', () => {
    const message = makeValidatedMessage({
      amount: '100.00',
      transaction_type: 'wire_transfer',
    });

    const envelope = processTransaction(message);

    expect(envelope.data.risk_factors).toEqual(['wire_transfer']);
    expect(envelope.data.risk_score).toBe(10);
    expect(envelope.data.risk_score).toBeLessThan(60);
    expect(envelope.data.status).toBe('reviewed');
  });

  test('no risk factors triggered leaves status as validated with score 0', () => {
    const message = makeValidatedMessage();

    const envelope = processTransaction(message);

    expect(envelope.data.risk_factors).toEqual([]);
    expect(envelope.data.risk_score).toBe(0);
    expect(envelope.data.status).toBe('validated');
  });

  test('combined factors push a transaction to flagged_fraud at the >= 60 threshold', () => {
    // high_value (40) + very_high_value (20) + wire_transfer (10) = 70,
    // matching the documented TXN005-equivalent case.
    const message = makeValidatedMessage({
      amount: '75000.00',
      transaction_type: 'wire_transfer',
      timestamp: '2026-01-10T15:00:00Z',
      metadata: { channel: 'branch', country: 'US' },
    });

    const envelope = processTransaction(message);

    expect(new Decimal(envelope.data.amount).greaterThan(50000)).toBe(true);
    expect(envelope.data.risk_score).toBe(70);
    expect(envelope.data.status).toBe('flagged_fraud');
  });

  test('score is capped at 100 even when every factor is triggered', () => {
    // high_value(40) + very_high_value(20) + unusual_timing(20) +
    // cross_border(15) + wire_transfer(10) = 105, capped to 100.
    const message = makeValidatedMessage({
      amount: '60000.00',
      transaction_type: 'wire_transfer',
      timestamp: '2026-01-10T02:00:00Z',
      metadata: { channel: 'api', country: 'DE' },
    });

    const envelope = processTransaction(message);

    expect(envelope.data.risk_score).toBe(100);
    expect(envelope.data.status).toBe('flagged_fraud');
  });
});
