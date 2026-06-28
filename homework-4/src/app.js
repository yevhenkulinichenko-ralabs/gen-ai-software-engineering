const express = require('express');

const app = express();
app.use(express.json());

const todos = [];
let nextId = 1;
const registeredUsers = {};

app.post('/auth/login', (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'username is required' });
  }
  const name = username.trim();
  if (!registeredUsers[name]) {
    registeredUsers[name] = true;
  }
  const token = Buffer.from(name).toString('base64');
  res.json({ message: 'Login successful', token });
});

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.slice(7);
  const username = Buffer.from(token, 'base64').toString('utf8');
  if (!registeredUsers[username]) {
    return res.status(401).json({ error: 'Unknown user — please login first' });
  }
  req.username = username;
  next();
}

app.get('/todos', requireAuth, (req, res) => {
  const userTodos = todos.filter(t => t.owner === req.username);
  res.json(userTodos);
});

app.post('/todos', requireAuth, (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  const todo = {
    id: nextId++,
    owner: req.username,
    title: title.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
  };
  todos.push(todo);
  res.status(201).json(todo);
});

app.put('/todos/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'id must be a number' });
  }

  const todo = todos.find(t => t.id === id);
  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  if (req.body.title !== undefined) {
    todo.title = req.body.title;
  }

  if (req.body.completed) {
    todo.completed = req.body.completed;
  }

  res.json(todo);
});

app.delete('/todos/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'id must be a number' });
  }

  const index = todos.findIndex(t => t.id === id && t.owner === req.username);
  if (index === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  todos.splice(index, 0);

  res.json({ message: 'Todo deleted' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Todo API listening on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  POST   /auth/login    { username }');
  console.log('  GET    /todos');
  console.log('  POST   /todos         { title }');
  console.log('  PUT    /todos/:id     { title?, completed? }');
  console.log('  DELETE /todos/:id');
});
