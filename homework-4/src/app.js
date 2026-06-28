const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Validate JWT_SECRET is set
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET environment variable must be set to a string of at least 32 characters');
}

const app = express();
app.use(express.json({ limit: '10kb' }));

const todos = [];
let nextId = 1;
const registeredUsers = Object.create(null); // Prevent prototype pollution
const MAX_TODOS_PER_USER = 100;

// Registration endpoint (Fix 008)
app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'username is required' });
  }
  if (!password || typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ error: 'password is required' });
  }
  const name = username.trim();
  if (registeredUsers[name]) {
    return res.status(409).json({ error: 'Username already taken' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    registeredUsers[name] = { passwordHash };
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint (Fix 003 and Fix 008)
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'username is required' });
  }
  if (!password || typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ error: 'password is required' });
  }
  const name = username.trim();
  const user = registeredUsers[name];
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  try {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    // Issue JWT token (Fix 003)
    const token = jwt.sign({ username: name }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ message: 'Login successful', token });
  } catch (err) {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    req.username = payload.username;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
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
  const userTodoCount = todos.filter(t => t.owner === req.username).length;
  if (userTodoCount >= MAX_TODOS_PER_USER) {
    return res.status(429).json({ error: `Todo limit reached (maximum ${MAX_TODOS_PER_USER} per user)` });
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

  const todo = todos.find(t => t.id === id && t.owner === req.username);
  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  if (req.body.title !== undefined) {
    const newTitle = req.body.title;
    if (!newTitle || typeof newTitle !== 'string' || !newTitle.trim()) {
      return res.status(400).json({ error: 'title must be a non-empty string' });
    }
    todo.title = newTitle.trim();
  }

  if (req.body.completed !== undefined) {
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

  todos.splice(index, 1);

  res.json({ message: 'Todo deleted' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Todo API listening on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  POST   /auth/register { username, password }');
  console.log('  POST   /auth/login    { username, password }');
  console.log('  GET    /todos');
  console.log('  POST   /todos         { title }');
  console.log('  PUT    /todos/:id     { title?, completed? }');
  console.log('  DELETE /todos/:id');
});
