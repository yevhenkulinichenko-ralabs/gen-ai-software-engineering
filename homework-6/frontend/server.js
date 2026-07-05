'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');

const { runPipeline } = require('../orchestrator');

const app = express();
const PORT = process.env.PORT || 3000;

const RESULTS_DIR = path.join(__dirname, '..', 'shared', 'results');

// Per context7 research (research-notes.md entry #2, /expressjs/express):
// express.json() is registered before express.static() and route handlers
// so req.body is populated for any future POST bodies, and static assets
// are served directly from frontend/public.
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Trigger a full pipeline run synchronously and return the resulting
 * summary object as JSON.
 */
app.post('/api/run-pipeline', (req, res) => {
  try {
    const summary = runPipeline();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'pipeline_failed', message: err.message });
  }
});

/**
 * Return the most recent summary.json (if a pipeline run has already
 * happened) without re-running the pipeline, so the UI can populate on
 * load if results already exist.
 */
app.get('/api/results', (req, res) => {
  const summaryPath = path.join(RESULTS_DIR, 'summary.json');
  if (!fs.existsSync(summaryPath)) {
    return res.json(null);
  }
  try {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'read_failed', message: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Transaction pipeline front-end listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
