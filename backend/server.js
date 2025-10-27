const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Register
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`,
      [name, email, hashedPassword],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'Email already registered' });
          }
          return res.status(500).json({ error: 'Database error during registration' });
        }
        res.json({ id: this.lastID, message: 'User registered successfully' });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    try {
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ error: 'Invalid email or password' });

      res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
      res.status(500).json({ error: 'Server error during login' });
    }
  });
});

// Add expense
app.post('/api/expenses', (req, res) => {
  const { date, amount, category, description, user_id } = req.body;
  db.run(
    `INSERT INTO expenses (date, amount, category, description, user_id) VALUES (?, ?, ?, ?, ?)`,
    [date, amount, category, description, user_id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Get expenses for a user
app.get('/api/expenses', (req, res) => {
  const user_id = req.query.user_id;
  db.all(
    `SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC`,
    [user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Delete expense
app.delete('/api/expenses/:id', (req, res) => {
  db.run(`DELETE FROM expenses WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Update expense
app.put('/api/expenses/:id', (req, res) => {
  const { date, amount, category, description } = req.body;
  const { id } = req.params;
  
  db.run(
    `UPDATE expenses SET date = ?, amount = ?, category = ?, description = ? WHERE id = ?`,
    [date, amount, category, description, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes, id: id });
    }
  );
});

// Add income
app.post('/api/income', (req, res) => {
  const { date, amount, category, description, user_id } = req.body;
  db.run(
    `INSERT INTO income (date, amount, category, description, user_id) VALUES (?, ?, ?, ?, ?)`,
    [date, amount, category, description, user_id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Get income for a user
app.get('/api/income', (req, res) => {
  const user_id = req.query.user_id;
  db.all(
    `SELECT * FROM income WHERE user_id = ? ORDER BY date DESC`,
    [user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Update income
app.put('/api/income/:id', (req, res) => {
  const { date, amount, category, description } = req.body;
  const { id } = req.params;
  
  db.run(
    `UPDATE income SET date = ?, amount = ?, category = ?, description = ? WHERE id = ?`,
    [date, amount, category, description, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes, id: id });
    }
  );
});

// Delete income
app.delete('/api/income/:id', (req, res) => {
  db.run(`DELETE FROM income WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Add budget
app.post('/api/budgets', (req, res) => {
  const { user_id, amount, period, start_date, end_date, category } = req.body;
  db.run(
    `INSERT INTO budgets (user_id, amount, period, start_date, end_date, category) VALUES (?, ?, ?, ?, ?, ?)`,
    [user_id, amount, period, start_date, end_date, category || 'all'],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Get budgets for a user
app.get('/api/budgets', (req, res) => {
  const user_id = req.query.user_id;
  db.all(
    `SELECT * FROM budgets WHERE user_id = ? ORDER BY start_date DESC`,
    [user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Update budget
app.put('/api/budgets/:id', (req, res) => {
  const { amount, period, start_date, end_date, category } = req.body;
  const { id } = req.params;
  
  db.run(
    `UPDATE budgets SET amount = ?, period = ?, start_date = ?, end_date = ?, category = ? WHERE id = ?`,
    [amount, period, start_date, end_date, category || 'all', id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// Delete budget
app.delete('/api/budgets/:id', (req, res) => {
  db.run(`DELETE FROM budgets WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Feature 9: Get categories
app.get('/api/categories', (req, res) => {
  const type = req.query.type; // 'expense' or 'income'
  const user_id = req.query.user_id;
  
  let query = `SELECT * FROM categories WHERE (user_id IS NULL OR user_id = ?)`;
  let params = [user_id];
  
  if (type) {
    query += ` AND type = ?`;
    params.push(type);
  }
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Feature 9: Add custom category
app.post('/api/categories', (req, res) => {
  const { name, type, user_id } = req.body;
  db.run(
    `INSERT INTO categories (name, type, user_id) VALUES (?, ?, ?)`,
    [name, type, user_id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});