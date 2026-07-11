const { createSchema, updateSchema, CATEGORIES, PRIORITIES, STATUSES } = require('../src/schemas/ticketSchema');

const VALID_TICKET = {
  customer_id: 'cust-001',
  customer_email: 'test@example.com',
  customer_name: 'Test User',
  subject: 'Test subject',
  description: 'This is a detailed description of the issue at hand.',
  category: 'technical_issue',
  priority: 'medium',
  status: 'new',
  tags: [],
  metadata: { source: 'web_form', device_type: 'desktop' }
};

describe('createSchema', () => {
  it('validates a complete valid ticket', () => {
    const { error } = createSchema.validate(VALID_TICKET);
    expect(error).toBeUndefined();
  });

  it('fails when customer_id is missing', () => {
    const { customer_id, ...rest } = VALID_TICKET;
    const { error } = createSchema.validate(rest);
    expect(error).toBeDefined();
  });

  it('fails when customer_email is missing', () => {
    const { customer_email, ...rest } = VALID_TICKET;
    const { error } = createSchema.validate(rest);
    expect(error).toBeDefined();
  });

  it('fails when customer_email is not a valid email', () => {
    const { error } = createSchema.validate({ ...VALID_TICKET, customer_email: 'not-an-email' });
    expect(error).toBeDefined();
  });

  it('fails when category is not in the allowed enum', () => {
    const { error } = createSchema.validate({ ...VALID_TICKET, category: 'unknown_category' });
    expect(error).toBeDefined();
  });

  it('fails when priority is not in the allowed enum', () => {
    const { error } = createSchema.validate({ ...VALID_TICKET, priority: 'super_urgent' });
    expect(error).toBeDefined();
  });

  it('fails when auto_classify is true and category is provided', () => {
    const { error } = createSchema.validate({ ...VALID_TICKET, auto_classify: true });
    expect(error).toBeDefined();
  });

  it('passes when auto_classify is true with category and priority omitted', () => {
    const { category, priority, ...rest } = VALID_TICKET;
    const { error, value } = createSchema.validate({ ...rest, auto_classify: true });
    expect(error).toBeUndefined();
    expect(value.category).toBeNull();
    expect(value.priority).toBeNull();
  });

  it('exports the correct enum constants', () => {
    expect(CATEGORIES).toContain('other');
    expect(PRIORITIES).toContain('urgent');
    expect(PRIORITIES).toContain('medium');
    expect(STATUSES).toContain('new');
    expect(STATUSES).toContain('resolved');
  });
});

describe('updateSchema', () => {
  it('validates a partial update with a single field', () => {
    const { error } = updateSchema.validate({ status: 'in_progress' });
    expect(error).toBeUndefined();
  });

  it('validates multiple fields in a single update', () => {
    const { error } = updateSchema.validate({ status: 'resolved', priority: 'low' });
    expect(error).toBeUndefined();
  });

  it('fails when the update payload is empty', () => {
    const { error } = updateSchema.validate({});
    expect(error).toBeDefined();
  });

  it('fails when status is not a valid enum value', () => {
    const { error } = updateSchema.validate({ status: 'pending' });
    expect(error).toBeDefined();
  });
});
