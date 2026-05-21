const request = require('supertest');

// Requires a running server. Start with: npm start
// Override with: API_URL=http://localhost:4000 npm run test:perf
const API_URL = process.env.API_URL || 'http://localhost:3000';
const api = request(API_URL);

jest.setTimeout(60000);

const BASE_TICKET = {
  customer_id: 'cust-perf',
  customer_email: 'perf@example.com',
  customer_name: 'Perf User',
  subject: 'Application crashes on startup with an error in the logs',
  description: 'The application crashes immediately after launch. An error appears in the logs every time.',
  category: 'technical_issue',
  priority: 'medium',
  status: 'new',
  tags: [],
  metadata: { source: 'api', device_type: 'desktop' }
};

function uniqueTicket(i) {
  return {
    ...BASE_TICKET,
    customer_id: `perf-${Date.now()}-${i}`,
    customer_email: `perf${i}_${Date.now()}@example.com`
  };
}

it('imports 100 records via POST /tickets/import in under 3000ms', async () => {
  const batch = Array.from({ length: 100 }, (_, i) => uniqueTicket(i));
  const start = Date.now();
  const res = await api.post('/tickets/import').send(batch);
  const elapsed = Date.now() - start;
  expect(res.status).toBe(201);
  expect(res.body.successful).toBe(100);
  expect(elapsed).toBeLessThan(3000);
});

it('lists all tickets via GET /tickets in under 500ms', async () => {
  const start = Date.now();
  const res = await api.get('/tickets');
  const elapsed = Date.now() - start;
  expect(res.status).toBe(200);
  expect(elapsed).toBeLessThan(500);
});

it('filters tickets by category via GET /tickets?category= in under 500ms', async () => {
  const start = Date.now();
  const res = await api.get('/tickets?category=technical_issue');
  const elapsed = Date.now() - start;
  expect(res.status).toBe(200);
  expect(elapsed).toBeLessThan(500);
});

it('creates 20 tickets with auto_classify:true in under 5000ms', async () => {
  const { category, priority, ...body } = BASE_TICKET;
  const start = Date.now();
  for (let i = 0; i < 20; i++) {
    const res = await api.post('/tickets').send({
      ...body,
      customer_id: `perf-ac-${Date.now()}-${i}`,
      customer_email: `perfac${i}_${Date.now()}@example.com`,
      auto_classify: true
    });
    expect(res.status).toBe(201);
  }
  expect(Date.now() - start).toBeLessThan(5000);
});

it('auto-classifies 10 tickets sequentially via POST /tickets/:id/auto-classify in under 3000ms', async () => {
  const ids = [];
  for (let i = 0; i < 10; i++) {
    const res = await api.post('/tickets').send(uniqueTicket(i));
    expect(res.status).toBe(201);
    ids.push(res.body.id);
  }
  const start = Date.now();
  for (const id of ids) {
    const res = await api.post(`/tickets/${id}/auto-classify`);
    expect(res.status).toBe(200);
  }
  expect(Date.now() - start).toBeLessThan(3000);
});
