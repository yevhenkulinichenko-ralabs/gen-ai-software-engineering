'use strict';

/**
 * Small, self-contained fixture set for the pipeline test suite.
 *
 * Deliberately independent of sample-transactions.json's contents (per
 * tasks/008-tests-suite.md) so these tests don't silently change behavior
 * if that file is edited later.
 */

const validTransfer = {
  transaction_id: 'FTX-001',
  source_account: 'ACC-1001',
  destination_account: 'ACC-2001',
  amount: '250.00',
  currency: 'USD',
  transaction_type: 'transfer',
  timestamp: '2026-01-10T14:00:00Z',
  description: 'Fixture: plain valid transfer',
  metadata: {
    channel: 'online',
    country: 'US',
  },
};

const invalidCurrency = {
  transaction_id: 'FTX-002',
  source_account: 'ACC-1002',
  destination_account: 'ACC-2002',
  amount: '100.00',
  currency: 'XYZ',
  transaction_type: 'transfer',
  timestamp: '2026-01-10T14:05:00Z',
  description: 'Fixture: invalid currency code',
  metadata: {
    channel: 'online',
    country: 'US',
  },
};

const negativeNonRefund = {
  transaction_id: 'FTX-003',
  source_account: 'ACC-1003',
  destination_account: 'ACC-2003',
  amount: '-50.00',
  currency: 'USD',
  transaction_type: 'transfer',
  timestamp: '2026-01-10T14:10:00Z',
  description: 'Fixture: negative amount on a non-refund type',
  metadata: {
    channel: 'online',
    country: 'US',
  },
};

const highValueWireTransfer = {
  transaction_id: 'FTX-004',
  source_account: 'ACC-1004',
  destination_account: 'ACC-2004',
  amount: '75000.00',
  currency: 'USD',
  transaction_type: 'wire_transfer',
  timestamp: '2026-01-10T15:00:00Z', // daytime UTC, US -> high_value + very_high_value + wire_transfer = 70
  description: 'Fixture: high-value wire transfer, unambiguously flagged_fraud',
  metadata: {
    channel: 'branch',
    country: 'US',
  },
};

const crossBorderUnusualHour = {
  transaction_id: 'FTX-005',
  source_account: 'ACC-1005',
  destination_account: 'ACC-2005',
  amount: '15000.00',
  currency: 'EUR',
  transaction_type: 'transfer',
  timestamp: '2026-01-10T03:00:00Z', // unusual hour (00:00-06:00 UTC), non-US
  description: 'Fixture: cross-border + unusual timing combination',
  metadata: {
    channel: 'api',
    country: 'DE',
  },
};

const validRefund = {
  transaction_id: 'FTX-006',
  source_account: 'ACC-1006',
  destination_account: 'ACC-2006',
  amount: '-75.00',
  currency: 'GBP',
  transaction_type: 'refund',
  timestamp: '2026-01-10T14:20:00Z',
  description: 'Fixture: negative refund amount, normalized to absolute value',
  metadata: {
    channel: 'online',
    country: 'GB',
  },
};

module.exports = {
  validTransfer,
  invalidCurrency,
  negativeNonRefund,
  highValueWireTransfer,
  crossBorderUnusualHour,
  validRefund,
};
