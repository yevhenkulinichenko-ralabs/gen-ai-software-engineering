const CATEGORY_KEYWORDS = {
  account_access: ['login', 'password', '2fa', 'access', 'sign in', 'account', 'locked', 'forgot'],
  technical_issue: ['error', 'crash', 'bug', 'fail', 'broken', 'not working', 'exception', 'timeout'],
  billing_question: ['payment', 'invoice', 'refund', 'charge', 'billing', 'subscription', 'price', 'cost'],
  feature_request: ['feature', 'suggest', 'enhance', 'improve', 'would like', 'request', 'add support'],
  bug_report: ['defect', 'reproduce', 'steps to reproduce', 'expected behavior', 'actual behavior', 'regression']
};

const PRIORITY_KEYWORDS = {
  urgent: ["can't access", 'critical', 'production down', 'security', 'outage', 'data loss'],
  high: ['important', 'blocking', 'asap', 'blocker'],
  low: ['minor', 'cosmetic', 'suggestion', 'nice to have', 'eventually']
};

function classify(subject, description) {
  const text = `${subject} ${description}`.toLowerCase();
  const keywordsFound = [];

  let matchedCategory = null;
  let maxMatches = 0;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter(k => text.includes(k));
    if (matches.length > maxMatches) {
      maxMatches = matches.length;
      matchedCategory = category;
      keywordsFound.push(...matches);
    }
  }
  const category = matchedCategory || 'other';

  let priority = 'medium';
  for (const [level, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    const matches = keywords.filter(k => text.includes(k));
    if (matches.length > 0) {
      priority = level;
      keywordsFound.push(...matches);
      break;
    }
  }

  const confidence = maxMatches > 0
    ? parseFloat(Math.min(0.5 + maxMatches * 0.1, 0.95).toFixed(2))
    : 0.4;
  const reasoning = maxMatches > 0
    ? `Matched ${maxMatches} keyword(s) for category "${category}"`
    : 'No strong keyword matches; defaulting to "other" category';

  return { category, priority, confidence, reasoning, keywords_found: [...new Set(keywordsFound)] };
}

module.exports = { classify };
