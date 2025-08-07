-- טבלת משתמשים
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- הודעות
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  to_user TEXT NOT NULL,
  from_user TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  type TEXT,
  labels TEXT[],
  folder TEXT,
  scheduled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  encrypted BOOLEAN DEFAULT true
);

-- טיוטות
CREATE TABLE IF NOT EXISTS drafts (
  id SERIAL PRIMARY KEY,
  to_user TEXT,
  from_user TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  type TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  encrypted BOOLEAN DEFAULT true
);

-- קבצים מצורפים
CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  filename TEXT,
  url TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- לוגים
CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT,
  ip TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
