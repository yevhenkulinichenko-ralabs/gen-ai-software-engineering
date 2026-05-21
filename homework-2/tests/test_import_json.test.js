const jsonParser = require('../src/services/parsers/jsonParser');

const SAMPLE_TICKET = {
  customer_id: 'cust-1',
  customer_email: 'user@example.com',
  customer_name: 'Test User',
  subject: 'Test subject',
  description: 'A detailed description.',
  category: 'technical_issue',
  priority: 'medium'
};

describe('JsonParser', () => {
  it('returns an already-parsed array as-is', () => {
    const result = jsonParser.parse([SAMPLE_TICKET]);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].customer_id).toBe('cust-1');
  });

  it('parses a valid JSON string containing an array', () => {
    const result = jsonParser.parse(JSON.stringify([SAMPLE_TICKET]));
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].subject).toBe('Test subject');
  });

  it('handles an empty array without error', () => {
    const result = jsonParser.parse([]);
    expect(result).toEqual([]);
  });

  it('throws when the body is a JSON object instead of an array', () => {
    expect(() => jsonParser.parse(SAMPLE_TICKET)).toThrow('JSON body must be an array');
  });

  it('throws when the body is an invalid JSON string', () => {
    expect(() => jsonParser.parse('{bad json')).toThrow('Invalid JSON');
  });
});
