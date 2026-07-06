'use strict';

const fs = require('fs');
const path = require('path');
const Decimal = require('decimal.js');
const { processTransaction, runDryRun } = require('../pipeline/validator');
const fixtures = require('./fixtures');

describe('validator.processTransaction', () => {
  test('valid transaction passes with status "validated"', () => {
    const envelope = processTransaction(fixtures.validTransfer);

    expect(envelope.data.status).toBe('validated');
    expect(envelope.data.reason).toBeUndefined();
    expect(
      new Decimal(envelope.data.amount).equals(new Decimal('250.00'))
    ).toBe(true);
    expect(envelope.source_stage).toBe('validator');
    expect(envelope.target_stage).toBe('fraud_detector');
    expect(envelope.message_id).toBeTruthy();
  });

  test('missing required field is rejected with a reason', () => {
    const record = { ...fixtures.validTransfer };
    delete record.destination_account;

    const envelope = processTransaction(record);

    expect(envelope.data.status).toBe('rejected');
    expect(envelope.data.reason).toBe('missing_required_field:destination_account');
  });

  test('each required field individually triggers a missing_required_field rejection', () => {
    const requiredFields = [
      'transaction_id',
      'source_account',
      'destination_account',
      'amount',
      'currency',
      'transaction_type',
      'timestamp',
    ];

    for (const field of requiredFields) {
      const record = { ...fixtures.validTransfer };
      delete record[field];

      const envelope = processTransaction(record);

      expect(envelope.data.status).toBe('rejected');
      expect(envelope.data.reason).toBe(`missing_required_field:${field}`);
    }
  });

  test('invalid currency (e.g. "XYZ") is rejected', () => {
    const envelope = processTransaction(fixtures.invalidCurrency);

    expect(envelope.data.status).toBe('rejected');
    expect(envelope.data.reason).toBe('invalid_currency');
  });

  test('non-numeric amount is rejected', () => {
    const record = { ...fixtures.validTransfer, amount: 'not-a-number' };

    const envelope = processTransaction(record);

    expect(envelope.data.status).toBe('rejected');
    expect(envelope.data.reason).toBe('invalid_amount');
  });

  test('negative amount + transaction_type "refund" is accepted and normalized to absolute value', () => {
    const envelope = processTransaction(fixtures.validRefund);

    expect(envelope.data.status).toBe('validated');
    expect(
      new Decimal(envelope.data.amount).equals(new Decimal('75.00'))
    ).toBe(true);
    expect(new Decimal(envelope.data.amount).isNegative()).toBe(false);
  });

  test('negative amount + non-refund type is rejected', () => {
    const envelope = processTransaction(fixtures.negativeNonRefund);

    expect(envelope.data.status).toBe('rejected');
    expect(envelope.data.reason).toBe('negative_amount_not_allowed');
  });

  test('handles a completely empty record gracefully (missing_required_field on first field)', () => {
    const envelope = processTransaction({});

    expect(envelope.data.status).toBe('rejected');
    expect(envelope.data.reason).toBe('missing_required_field:transaction_id');
  });

  describe('dry-run-style summary (exercising processTransaction directly over a fixture array)', () => {
    // Mirrors the counting logic of pipeline/validator.js's CLI --dry-run
    // path (runDryRun), but against a small local fixture array instead of
    // spawning a subprocess or depending on sample-transactions.json.
    test('reports correct valid/invalid counts against a small fixture array', () => {
      const records = [
        fixtures.validTransfer,
        fixtures.invalidCurrency,
        fixtures.negativeNonRefund,
        fixtures.validRefund,
      ];

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

      expect(total).toBe(4);
      expect(validCount).toBe(2);
      expect(invalidCount).toBe(2);
    });
  });

  describe('runDryRun (CLI helper, read-only against the real sample-transactions.json)', () => {
    // This only ever reads sample-transactions.json and console.logs a
    // summary table -- it never writes to shared/ -- so it's safe to call
    // directly here (as opposed to spawning a subprocess) purely to
    // exercise this branch for coverage. The expected total is derived
    // dynamically from the file's own contents so this test doesn't
    // hardcode assumptions about the fixture count.
    test('runs without throwing and logs a summary whose total matches sample-transactions.json', () => {
      const samplePath = path.join(__dirname, '..', 'sample-transactions.json');
      const expectedTotal = JSON.parse(fs.readFileSync(samplePath, 'utf8')).length;

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      expect(() => runDryRun()).not.toThrow();

      const output = logSpy.mock.calls.map((args) => args.join(' ')).join('\n');
      logSpy.mockRestore();

      expect(output).toContain('Validation Dry-Run Summary');
      expect(output).toContain(`Total:   ${expectedTotal}`);
    });
  });
});
