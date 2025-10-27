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
      category TEXT
    )
  `);

  // ========== FEATURE 9: Category Table ==========
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      user_id INTEGER
    )
  `);

  // Insert default expense categories
  db.run(`
    INSERT OR IGNORE INTO categories (id, name, type, user_id) VALUES 
    (1, 'Essentials', 'expense', NULL),
    (2, 'Mobility', 'expense', NULL),
    (3, 'Personal & Family', 'expense', NULL),
    (4, 'Lifestyle & Leisure', 'expense', NULL),
    (5, 'Work & Education', 'expense', NULL),
    (6, 'Financial & Giving', 'expense', NULL)
  `);

  // Insert default income categories
  db.run(`
    INSERT OR IGNORE INTO categories (id, name, type, user_id) VALUES 
    (7, 'Salary', 'income', NULL),
    (8, 'Freelance', 'income', NULL),
    (9, 'Investment', 'income', NULL),
    (10, 'Gift', 'income', NULL),
    (11, 'Other', 'income', NULL)
  `);
});

module.exports = db;