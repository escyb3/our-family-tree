-- משתמשים
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT UNIQUE,
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
  is_read BOOLEAN DEFAULT false,
  pinned BOOLEAN DEFAULT false,
  scheduled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  encrypted BOOLEAN DEFAULT true,
  original_message_id INTEGER,
  in_reply_to INTEGER,
  forwarded_from TEXT,
  group_name TEXT,
  deleted BOOLEAN DEFAULT false
);

-- טיוטות
CREATE TABLE IF NOT EXISTS drafts (
  id SERIAL PRIMARY KEY,
  to_user TEXT,
  from_user TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  type TEXT,
  version INTEGER DEFAULT 1,
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

-- תגים
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS message_tags (
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, tag_id)
);

-- לוגים
CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT,
  ip TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- קבוצות
CREATE TABLE IF NOT EXISTS groups (
  name TEXT PRIMARY KEY,
  members TEXT[] NOT NULL
);

-- תזכורות
CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  remind_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- היסטוריית גרסאות הודעה
CREATE TABLE IF NOT EXISTS message_versions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  version_number INTEGER,
  subject TEXT,
  body TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- תגובות/אינטראקציות (לייק, אישור קבלה וכו')
CREATE TABLE IF NOT EXISTS reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  type TEXT, -- like, confirm, love...
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- פעילויות ניתוח
CREATE TABLE IF NOT EXISTS analytics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  metric TEXT,
  value INTEGER,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- לוח שנה ואירועים
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title TEXT,
  description TEXT,
  date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- הודעות מערכת
CREATE TABLE IF NOT EXISTS system_messages (
  id SERIAL PRIMARY KEY,
  to_user TEXT,
  subject TEXT,
  body TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- מסננים/בלוקים
CREATE TABLE IF NOT EXISTS content_filters (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  blocked_sender TEXT,
  blocked_words TEXT[]
);

-- תיבת משותפת
CREATE TABLE IF NOT EXISTS shared_inboxes (
  id SERIAL PRIMARY KEY,
  name TEXT,
  members TEXT[]
);

-- תרגום הודעות
CREATE TABLE IF NOT EXISTS translations (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  language TEXT,
  translated_body TEXT
);

