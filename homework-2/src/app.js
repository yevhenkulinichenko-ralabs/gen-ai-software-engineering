const express = require('express');
const app = express();

app.use(express.json());
app.use(express.text({ type: ['text/csv', 'application/xml', 'text/xml'] }));

app.use('/tickets', require('./routes/tickets'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

module.exports = app;
