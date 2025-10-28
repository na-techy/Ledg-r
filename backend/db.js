const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/expenses.db');

db.serialize(() => {
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  // Create expenses table
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      amount REAL,
      category TEXT,
      description TEXT,
      user_id INTEGER NOT NULL
    )
  `);

  // Create income table
  db.run(`
    CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      amount REAL,
      category TEXT,
      description TEXT,
      user_id INTEGER NOT NULL
    )
  `);

  // Create budgets table
  db.run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      period TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      category TEXT,
      is_active INTEGER DEFAULT 1
    )
  `);

  // Category Table
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      user_id INTEGER
    )
  `);

  // Insert default income categories (first)
  db.run(`
    INSERT OR IGNORE INTO categories (id, name, type, user_id) VALUES 
    (1, 'Salary', 'income', NULL),
    (2, 'Freelance', 'income', NULL),
    (3, 'Investment', 'income', NULL),
    (4, 'Gift', 'income', NULL),
    (5, 'Other', 'income', NULL)
  `);

  // Insert default expense categories
  db.run(`
    INSERT OR IGNORE INTO categories (id, name, type, user_id) VALUES 
    (6, 'Essentials', 'expense', NULL),
    (7, 'Mobility', 'expense', NULL),
    (8, 'Personal & Family', 'expense', NULL),
    (9, 'Lifestyle & Leisure', 'expense', NULL),
    (10, 'Work & Education', 'expense', NULL),
    (11, 'Financial & Giving', 'expense', NULL)
  `);
});

module.exports = db;