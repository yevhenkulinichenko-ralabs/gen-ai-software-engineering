const request = require('supertest');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const api = request(API_URL);

const BASE_TICKET = {
  customer_id: 'cust-001',
  customer_email: 'test@example.com',
  customer_name: 'Test User',
  subject: 'Cannot login to my account',
  description: 'I forgot my password and cannot access my account since this morning.',
  category: 'account_access',
  priority: 'high',
  status: 'new',
  tags: ['login'],
  metadata: { source: 'web_form', device_type: 'desktop' }
};

it('full CRUD lifecycle: create → get → update → delete', async () => {
  const created = await api.post('/tickets').send(BASE_TICKET);
  expect(created.status).toBe(201);
  const id = created.body.id;

  const fetched = await api.get(`/tickets/${id}`);
  expect(fetched.status).toBe(200);
  expect(fetched.body.subject).toBe(BASE_TICKET.subject);

  const updated = await api.put(`/tickets/${id}`).send({ status: 'resolved' });
  expect(updated.status).toBe(200);
  expect(updated.body.status).toBe('resolved');

  const deleted = await api.delete(`/tickets/${id}`);
  expect(deleted.status).toBe(204);

  const gone = await api.get(`/tickets/${id}`);
  expect(gone.status).toBe(404);
});

it('creates ticket with auto_classify and stores classification with confidence/reasoning', async () => {
  const { category, priority, ...body } = BASE_TICKET;
  const created = await api.post('/tickets').send({ ...body, auto_classify: true });
  expect(created.status).toBe(201);

  const ticket = await api.get(`/tickets/${created.body.id}`);
  expect(ticket.body.classification).toBeDefined();
  expect(typeof ticket.body.classification.confidence).toBe('number');
  expect(ticket.body.classification.reasoning).toBeDefined();
  expect(Array.isArray(ticket.body.classification.keywords_found)).toBe(true);
  expect(ticket.body.classification.classified_at).toBeDefined();
});

it('imports a JSON batch and all records appear in the list', async () => {
  const runId = Date.now();
  const batch = [
    { ...BASE_TICKET, customer_id: `c1-${runId}`, customer_email: 'a@example.com' },
    { ...BASE_TICKET, customer_id: `c2-${runId}`, customer_email: 'b@example.com' }
  ];
  const imp = await api.post('/tickets/import').send(batch);
  expect(imp.status).toBe(201);
  expect(imp.body.successful).toBe(2);

  const r1 = await api.get(`/tickets?customer_id=c1-${runId}`);
  expect(r1.status).toBe(200);
  expect(r1.body).toHaveLength(1);

  const r2 = await api.get(`/tickets?customer_id=c2-${runId}`);
  expect(r2.status).toBe(200);
  expect(r2.body).toHaveLength(1);
});

it('manual category override sets classification_overridden on the ticket', async () => {
  const created = await api.post('/tickets').send(BASE_TICKET);
  const id = created.body.id;

  const updated = await api.put(`/tickets/${id}`).send({ category: 'billing_question' });
  expect(updated.status).toBe(200);
  expect(updated.body.classification_overridden).toBe(true);
});

it('auto-classify endpoint updates ticket category/priority and stores classification', async () => {
  const created = await api.post('/tickets').send(BASE_TICKET);
  const id = created.body.id;

  const classified = await api.post(`/tickets/${id}/auto-classify`);
  expect(classified.status).toBe(200);

  const ticket = await api.get(`/tickets/${id}`);
  expect(ticket.body.classification).toBeDefined();
  expect(ticket.body.classification.confidence).toBeGreaterThanOrEqual(0);
  expect(ticket.body.category).toBe(classified.body.category);
  expect(ticket.body.priority).toBe(classified.body.priority);
});
