const { classify } = require('../src/services/classificationService');

describe('classify() — category detection', () => {
  it('classifies account_access from login/password keywords', () => {
    const result = classify('Cannot login', 'I forgot my password and cannot access my account.');
    expect(result.category).toBe('account_access');
  });

  it('classifies technical_issue from error/crash keywords', () => {
    const result = classify('App crash', 'The application throws an exception and crashes on startup.');
    expect(result.category).toBe('technical_issue');
  });

  it('classifies billing_question from payment keywords', () => {
    const result = classify('Payment problem', 'My invoice shows a wrong charge and I need a refund.');
    expect(result.category).toBe('billing_question');
  });

  it('classifies feature_request from suggest/enhance keywords', () => {
    const result = classify('Feature suggestion', 'I would like to suggest an enhancement to improve the UI.');
    expect(result.category).toBe('feature_request');
  });

  it('classifies bug_report from defect/reproduce keywords', () => {
    const result = classify('Bug report', 'Found a defect. Steps to reproduce: open the app, click save.');
    expect(result.category).toBe('bug_report');
  });

  it('defaults to "other" when no category keywords match', () => {
    const result = classify('Hello', 'Just saying hello to the support team today.');
    expect(result.category).toBe('other');
  });
});

describe('classify() — priority detection', () => {
  it('assigns urgent priority for critical/production keywords', () => {
    const result = classify('Critical outage', 'Production down, critical issue affecting all users.');
    expect(result.priority).toBe('urgent');
  });

  it('assigns high priority for blocking/important keywords', () => {
    const result = classify('Blocking issue', 'This is blocking our deployment, important to fix ASAP.');
    expect(result.priority).toBe('high');
  });

  it('assigns low priority for minor/cosmetic keywords', () => {
    const result = classify('Minor cosmetic', 'Just a minor cosmetic issue with the button alignment.');
    expect(result.priority).toBe('low');
  });

  it('defaults to medium priority when no priority keywords match', () => {
    const result = classify('General question', 'I have a question about the documentation.');
    expect(result.priority).toBe('medium');
  });
});

describe('classify() — response shape', () => {
  it('returns confidence score between 0 and 1', () => {
    const result = classify('Login error', 'Cannot login to the account. Password is not working.');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('returns higher confidence when multiple keywords match', () => {
    const noMatch = classify('Hello', 'Just saying hello.');
    const multiMatch = classify('Login password access', 'I forgot my login and password and cannot access my account.');
    expect(multiMatch.confidence).toBeGreaterThan(noMatch.confidence);
  });

  it('returns a reasoning string', () => {
    const result = classify('Test', 'Test description here.');
    expect(typeof result.reasoning).toBe('string');
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it('returns keywords_found as an array with no duplicates', () => {
    const result = classify('Login password', 'login password account access');
    expect(Array.isArray(result.keywords_found)).toBe(true);
    const unique = new Set(result.keywords_found);
    expect(unique.size).toBe(result.keywords_found.length);
  });
});
