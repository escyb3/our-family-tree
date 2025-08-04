const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/family_mail.sqlite');

// יצירת טבלאות בסיס
const init = () => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    email TEXT,
    role TEXT DEFAULT 'user'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromUser TEXT,
    toUser TEXT,
    subject TEXT,
    body TEXT,
    type TEXT,
    seen BOOLEAN DEFAULT 0,
    timestamp TEXT,
    attachment TEXT,
    isDraft BOOLEAN DEFAULT 0,
    scheduledAt TEXT,
    encrypted BOOLEAN DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    messageId INTEGER,
    fromUser TEXT,
    body TEXT,
    timestamp TEXT
  )`);
};

module.exports = { db, init };
