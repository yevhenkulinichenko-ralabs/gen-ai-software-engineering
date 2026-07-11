const request = require('supertest');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const api = request(API_URL);

const VALID_CATEGORIES = ['account_access', 'technical_issue', 'billing_question', 'feature_request', 'bug_report', 'other'];
const VALID_PRIORITIES = ['urgent', 'high', 'medium', 'low'];

function makeTicket(overrides = {}) {
  return {
    customer_id: 'cust-e2e',
    customer_email: 'e2e@example.com',
    customer_name: 'E2E User',
    subject: 'Application crashes on startup with an error in the console',
    description: 'The application crashes immediately after launch. An error appears in the logs every time I try.',
    category: 'technical_issue',
    priority: 'medium',
    status: 'new',
    tags: [],
    metadata: { source: 'api', device_type: 'desktop' },
    ...overrides
  };
}

// ─── 1. Complete ticket lifecycle ──────────────────────────────────────────

it('complete ticket lifecycle: create → classify → override → resolve → delete', async () => {
  const created = await api.post('/tickets').send(makeTicket());
  expect(created.status).toBe(201);
  const id = created.body.id;

  const list1 = await api.get('/tickets');
  expect(list1.body.map(t => t.id)).toContain(id);

  const classified = await api.post(`/tickets/${id}/auto-classify`);
  expect(classified.status).toBe(200);
  expect(VALID_CATEGORIES).toContain(classified.body.category);
  expect(VALID_PRIORITIES).toContain(classified.body.priority);
  expect(classified.body.confidence).toBeGreaterThanOrEqual(0);
  expect(classified.body.confidence).toBeLessThanOrEqual(1);
  expect(typeof classified.body.reasoning).toBe('string');
  expect(Array.isArray(classified.body.keywords_found)).toBe(true);

  const afterClassify = await api.get(`/tickets/${id}`);
  expect(afterClassify.body.classification).toBeDefined();
  expect(afterClassify.body.classification.classified_at).toBeDefined();
  expect(afterClassify.body.category).toBe(classified.body.category);

  const statusUpdate = await api.put(`/tickets/${id}`).send({ status: 'in_progress' });
  expect(statusUpdate.status).toBe(200);
  expect(statusUpdate.body.classification_overridden).toBeUndefined();

  const categoryUpdate = await api.put(`/tickets/${id}`).send({ category: 'billing_question' });
  expect(categoryUpdate.status).toBe(200);
  expect(categoryUpdate.body.classification_overridden).toBe(true);
  expect(categoryUpdate.body.category).toBe('billing_question');

  const resolved = await api.put(`/tickets/${id}`).send({
    status: 'resolved',
    assigned_to: 'agent-99',
    resolved_at: new Date().toISOString()
  });
  expect(resolved.status).toBe(200);
  expect(resolved.body.status).toBe('resolved');
  expect(resolved.body.assigned_to).toBe('agent-99');

  const del = await api.delete(`/tickets/${id}`);
  expect(del.status).toBe(204);

  const gone = await api.get(`/tickets/${id}`);
  expect(gone.status).toBe(404);

  const list2 = await api.get('/tickets');
  expect(list2.body.map(t => t.id)).not.toContain(id);
});

// ─── 2. Bulk import with auto-classification verification ──────────────────

it('bulk import of 10 tickets followed by auto-classification of each', async () => {
  const runId = `e2e-bulk-${Date.now()}`;
  const batch = [
    makeTicket({ customer_email: 'u0@e.com', subject: 'Cannot login', description: 'I forgot my password and cannot access my account since yesterday.', assigned_to: runId }),
    makeTicket({ customer_email: 'u1@e.com', subject: 'Payment invoice error', description: 'My invoice shows a wrong charge on my billing statement, need a refund.', assigned_to: runId }),
    makeTicket({ customer_email: 'u2@e.com', subject: 'App crashes on open', description: 'The application crashes and throws an exception every time I open it.', assigned_to: runId }),
    makeTicket({ customer_email: 'u3@e.com', subject: 'Feature suggestion', description: 'I would like to suggest adding dark mode as an enhancement to improve usability.', assigned_to: runId }),
    makeTicket({ customer_email: 'u4@e.com', subject: 'Bug defect found', description: 'Found a defect. Steps to reproduce: open settings, click save, actual behavior differs from expected.', assigned_to: runId }),
    makeTicket({ customer_email: 'u5@e.com', subject: 'Critical production down', description: 'Production is down, this is critical and causing an outage for all users.', assigned_to: runId }),
    makeTicket({ customer_email: 'u6@e.com', subject: 'Security concern', description: 'There is a potential security vulnerability in the login flow we need to address.', assigned_to: runId }),
    makeTicket({ customer_email: 'u7@e.com', subject: 'Minor cosmetic issue', description: 'Just a minor cosmetic misalignment on the button, low priority suggestion.', assigned_to: runId }),
    makeTicket({ customer_email: 'u8@e.com', subject: 'Subscription charge question', description: 'I have a question about my subscription billing and the price I was charged.', assigned_to: runId }),
    makeTicket({ customer_email: 'u9@e.com', subject: 'General inquiry', description: 'Just checking in with the support team, no specific issue today.', assigned_to: runId })
  ];

  const importRes = await api.post('/tickets/import').send(batch);
  expect(importRes.status).toBe(201);
  expect(importRes.body.total_records).toBe(10);
  expect(importRes.body.successful).toBe(10);
  expect(importRes.body.failed).toHaveLength(0);

  const listRes = await api.get(`/tickets?assigned_to=${runId}`);
  expect(listRes.body).toHaveLength(10);
  const ids = listRes.body.map(t => t.id);

  const classifyResults = await Promise.all(
    ids.map(id => api.post(`/tickets/${id}/auto-classify`))
  );
  classifyResults.forEach(res => {
    expect(res.status).toBe(200);
    expect(VALID_CATEGORIES).toContain(res.body.category);
    expect(VALID_PRIORITIES).toContain(res.body.priority);
    expect(res.body.confidence).toBeGreaterThanOrEqual(0);
    expect(res.body.confidence).toBeLessThanOrEqual(1);
  });

  const finalList = await api.get(`/tickets?assigned_to=${runId}`);
  finalList.body.forEach(ticket => {
    expect(ticket.classification).toBeDefined();
    expect(ticket.classification.classified_at).toBeDefined();
    expect(typeof ticket.classification.confidence).toBe('number');
    expect(Array.isArray(ticket.classification.keywords_found)).toBe(true);
  });

  const urgentTicket = finalList.body.find(t => t.customer_email === 'u5@e.com');
  expect(urgentTicket.priority).toBe('urgent');

  const lowTicket = finalList.body.find(t => t.customer_email === 'u7@e.com');
  expect(lowTicket.priority).toBe('low');
});

// ─── 3. Concurrent operations (20+ simultaneous requests) ──────────────────

it('handles 25 concurrent POST /tickets requests without data loss or collisions', async () => {
  const runId = `e2e-conc-${Date.now()}`;
  const requests = Array.from({ length: 25 }, (_, i) =>
    api.post('/tickets').send(makeTicket({
      customer_id: `cust-concurrent-${i}`,
      customer_email: `concurrent${i}@example.com`,
      assigned_to: runId
    }))
  );

  const results = await Promise.all(requests);

  results.forEach(res => expect(res.status).toBe(201));

  const ids = results.map(r => r.body.id);
  expect(new Set(ids).size).toBe(25);

  const list = await api.get(`/tickets?assigned_to=${runId}`);
  expect(list.body).toHaveLength(25);

  const getResults = await Promise.all(ids.map(id => api.get(`/tickets/${id}`)));
  getResults.forEach((res, i) => {
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ids[i]);
  });
});

// ─── 4. Combined filtering by category and priority ────────────────────────

it('filters tickets by combined category + priority query parameters', async () => {
  const runId = `e2e-filter-${Date.now()}`;
  const combos = [
    { category: 'technical_issue', priority: 'high', count: 3 },
    { category: 'technical_issue', priority: 'low',  count: 2 },
    { category: 'billing_question', priority: 'high', count: 2 },
    { category: 'account_access',  priority: 'medium', count: 3 }
  ];

  let emailIndex = 0;
  for (const { category, priority, count } of combos) {
    for (let i = 0; i < count; i++) {
      await api.post('/tickets').send(makeTicket({
        customer_email: `filter${emailIndex++}@example.com`,
        category,
        priority,
        assigned_to: runId
      }));
    }
  }

  const byCategory = await api.get(`/tickets?category=technical_issue&assigned_to=${runId}`);
  expect(byCategory.status).toBe(200);
  expect(byCategory.body).toHaveLength(5);

  const byPriority = await api.get(`/tickets?priority=high&assigned_to=${runId}`);
  expect(byPriority.status).toBe(200);
  expect(byPriority.body).toHaveLength(5);

  const techHigh = await api.get(`/tickets?category=technical_issue&priority=high&assigned_to=${runId}`);
  expect(techHigh.status).toBe(200);
  expect(techHigh.body).toHaveLength(3);
  techHigh.body.forEach(t => {
    expect(t.category).toBe('technical_issue');
    expect(t.priority).toBe('high');
  });

  const billingHigh = await api.get(`/tickets?category=billing_question&priority=high&assigned_to=${runId}`);
  expect(billingHigh.status).toBe(200);
  expect(billingHigh.body).toHaveLength(2);

  const accountMedium = await api.get(`/tickets?category=account_access&priority=medium&assigned_to=${runId}`);
  expect(accountMedium.status).toBe(200);
  expect(accountMedium.body).toHaveLength(3);

  const noMatch = await api.get(`/tickets?category=feature_request&priority=urgent&assigned_to=${runId}`);
  expect(noMatch.status).toBe(200);
  expect(noMatch.body).toHaveLength(0);
});
