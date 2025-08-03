// server/db.js
const Database = require('better-sqlite3');
const db = new Database('./data/mailbox.db');

// יצירת טבלאות אם לא קיימות
db.exec(`
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  fromUser TEXT,
  toUser TEXT,
  subject TEXT,
  body TEXT,
  type TEXT,
  timestamp TEXT,
  seen INTEGER DEFAULT 0,
  threadId TEXT,
  favorite INTEGER DEFAULT 0,
  attachment TEXT,
  sendAt TEXT
);

CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  fromUser TEXT,
  toUser TEXT,
  subject TEXT,
  body TEXT,
  type TEXT,
  timestamp TEXT,
  attachment TEXT
);

CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY
);
`);

module.exports = db;
