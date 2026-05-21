const request = require('supertest');
const app = require('../src/app');
const repository = require('../src/repositories/ticketsRepository');

const BASE_TICKET = {
  customer_id: 'cust-001',
  customer_email: 'test@example.com',
  customer_name: 'Test User',
  subject: 'Application crashes on startup',
  description: 'The application crashes immediately after launch. An error appears in the logs.',
  category: 'technical_issue',
  priority: 'medium',
  status: 'new',
  tags: [],
  metadata: { source: 'web_form', browser: 'Chrome', device_type: 'desktop' }
};

beforeEach(() => repository.clear());

describe('POST /tickets', () => {
  it('creates a ticket and returns 201 with id and timestamps', async () => {
    const res = await request(app).post('/tickets').send(BASE_TICKET);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.subject).toBe(BASE_TICKET.subject);
    expect(res.body.created_at).toBeDefined();
    expect(res.body.updated_at).toBeDefined();
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/tickets').send({ subject: 'test' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app).post('/tickets').send({ ...BASE_TICKET, customer_email: 'bad-email' });
    expect(res.status).toBe(400);
  });

  it('creates ticket with auto_classify:true, omitting category and priority', async () => {
    const { category, priority, ...body } = BASE_TICKET;
    const res = await request(app).post('/tickets').send({ ...body, auto_classify: true });
    expect(res.status).toBe(201);
    expect(res.body.category).toBeDefined();
    expect(res.body.priority).toBeDefined();
    expect(res.body.classification).toBeDefined();
    expect(typeof res.body.classification.confidence).toBe('number');
  });

  it('returns 400 when auto_classify:true and category is provided', async () => {
    const res = await request(app).post('/tickets').send({ ...BASE_TICKET, auto_classify: true });
    expect(res.status).toBe(400);
  });
});

describe('GET /tickets', () => {
  it('returns empty array when no tickets exist', async () => {
    const res = await request(app).get('/tickets');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all tickets', async () => {
    await request(app).post('/tickets').send(BASE_TICKET);
    await request(app).post('/tickets').send(BASE_TICKET);
    const res = await request(app).get('/tickets');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('filters tickets by status', async () => {
    await request(app).post('/tickets').send(BASE_TICKET);
    const res = await request(app).get('/tickets?status=new');
    expect(res.status).toBe(200);
    expect(res.body.every(t => t.status === 'new')).toBe(true);
  });

  it('filters tickets by category', async () => {
    await request(app).post('/tickets').send(BASE_TICKET);
    const res = await request(app).get('/tickets?category=technical_issue');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });
});

describe('GET /tickets/:id', () => {
  it('returns the ticket by id', async () => {
    const created = await request(app).post('/tickets').send(BASE_TICKET);
    const res = await request(app).get(`/tickets/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/tickets/nonexistent-id');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Ticket not found');
  });
});

describe('PUT /tickets/:id', () => {
  it('updates ticket fields and returns updated ticket', async () => {
    const created = await request(app).post('/tickets').send(BASE_TICKET);
    const res = await request(app)
      .put(`/tickets/${created.body.id}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
    expect(res.body.updated_at).not.toBe(created.body.updated_at);
  });

  it('returns 400 for invalid update data', async () => {
    const created = await request(app).post('/tickets').send(BASE_TICKET);
    const res = await request(app)
      .put(`/tickets/${created.body.id}`)
      .send({ status: 'invalid_status' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).put('/tickets/nonexistent-id').send({ status: 'in_progress' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /tickets/:id', () => {
  it('deletes the ticket and returns 204', async () => {
    const created = await request(app).post('/tickets').send(BASE_TICKET);
    const del = await request(app).delete(`/tickets/${created.body.id}`);
    expect(del.status).toBe(204);
    const check = await request(app).get(`/tickets/${created.body.id}`);
    expect(check.status).toBe(404);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/tickets/nonexistent-id');
    expect(res.status).toBe(404);
  });
});

describe('POST /tickets/:id/auto-classify', () => {
  it('returns category, priority, confidence, reasoning, keywords_found', async () => {
    const created = await request(app).post('/tickets').send(BASE_TICKET);
    const res = await request(app).post(`/tickets/${created.body.id}/auto-classify`);
    expect(res.status).toBe(200);
    expect(res.body.category).toBeDefined();
    expect(res.body.priority).toBeDefined();
    expect(typeof res.body.confidence).toBe('number');
    expect(res.body.confidence).toBeGreaterThanOrEqual(0);
    expect(res.body.confidence).toBeLessThanOrEqual(1);
    expect(typeof res.body.reasoning).toBe('string');
    expect(Array.isArray(res.body.keywords_found)).toBe(true);
  });

  it('stores classification on the ticket after auto-classify', async () => {
    const created = await request(app).post('/tickets').send(BASE_TICKET);
    await request(app).post(`/tickets/${created.body.id}/auto-classify`);
    const ticket = await request(app).get(`/tickets/${created.body.id}`);
    expect(ticket.body.classification).toBeDefined();
    expect(ticket.body.classification.classified_at).toBeDefined();
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).post('/tickets/nonexistent-id/auto-classify');
    expect(res.status).toBe(404);
  });
});

describe('POST /tickets/import', () => {
  it('imports valid JSON array and returns summary', async () => {
    const res = await request(app)
      .post('/tickets/import')
      .send([BASE_TICKET]);
    expect(res.status).toBe(201);
    expect(res.body.total_records).toBe(1);
    expect(res.body.successful).toBe(1);
    expect(res.body.failed).toHaveLength(0);
  });

  it('reports failed records with error details', async () => {
    const invalid = { customer_id: 'x' };
    const res = await request(app)
      .post('/tickets/import')
      .send([BASE_TICKET, invalid]);
    expect(res.status).toBe(201);
    expect(res.body.total_records).toBe(2);
    expect(res.body.successful).toBe(1);
    expect(res.body.failed).toHaveLength(1);
    expect(res.body.failed[0].index).toBe(1);
  });

  it('returns 400 for unsupported Content-Type', async () => {
    const res = await request(app)
      .post('/tickets/import')
      .set('Content-Type', 'text/plain')
      .send('data');
    expect(res.status).toBe(400);
  });
});
