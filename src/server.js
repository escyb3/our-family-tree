const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const session = require("express-session");
const bcrypt = require("bcrypt");
const pg = require("pg");
const pdfParse = require("pdf-parse");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
const { Translate } = require("@google-cloud/translate").v2;
const ai = require("./ai");
const fetch = require("node-fetch");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
const translate = new Translate({ key: process.env.GOOGLE_API_KEY });
const db = new sqlite3.Database("./mailbox.db");
const usersPath = path.join(__dirname, "data", "users.json");


const storage = multer.diskStorage({
  destination: path.join(__dirname, "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
// חיבור למסד נתונים PostgreSQL
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost/family_mail",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.json());

// נתיבי קבצים גלובליים
const dataDir = path.join(__dirname, "data");
const messagesPath = path.join(dataDir, "messages.json");
const draftsPath = path.join(dataDir, "drafts.json");
const statsPath = path.join(dataDir, "stats.json");
const forumFile = path.join(__dirname, "data", "forum.json");
// --- אתחול קבצי נתונים: ודא שהקבצים קיימים לפני שהשרת מתחיל ---
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}
if (!fs.existsSync(messagesPath)) {
  fs.writeFileSync(messagesPath, JSON.stringify([], null, 2));
}
if (!fs.existsSync(draftsPath)) {
  fs.writeFileSync(draftsPath, JSON.stringify([], null, 2));
}
if (!fs.existsSync(statsPath)) {
  fs.writeFileSync(statsPath, JSON.stringify({}, null, 2));
}
// -----------------------------------------------------------

// יצירת קובץ הפורום אם לא קיים
if (!fs.existsSync(forumFile)) {
  fs.writeFileSync(forumFile, JSON.stringify([]));
}

app.post("/api/forum/new", (req, res) => {
  const newThread = {
    _id: Date.now().toString(),
    title: req.body.title,
    body: req.body.body,
    category: req.body.category || "כללי",
    username: req.user?.username || "אנונימי",
    createdAt: new Date(),
    replies: [],
  };

  const forumFile = path.join(__dirname, "data", "forum.json");
  const threads = fs.existsSync(forumFile) ? JSON.parse(fs.readFileSync(forumFile)) : [];
  threads.push(newThread);

  fs.writeFile(forumFile, JSON.stringify(threads, null, 2), (err) => {
    if (err) {
      console.error("שגיאה בכתיבה ל־forum.json:", err);
      return res.status(500).send("שגיאה בשרת");
    }
    res.json({ success: true });
    newThread.id = Date.now();
    newThread.replies = [];
    threads.push(newThread);
    fs.writeFile(forumFile, JSON.stringify(threads, null, 2), (err) => {
      if (err) {
        console.error("שגיאה בכתיבה לקובץ:", err);
        return res.status(500).send("Error saving thread");
      }
      console.log("השרשור נשמר בהצלחה");
      res.json({ success: true });
    });
  });
});
// פונקציית Middleware לבדיקת אימות משתמש
function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.user && req.session.user.username) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized: User not logged in' });
}
// Init tables
const initTables = () => {
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    fromUser TEXT,
    toUser TEXT,
    subject TEXT,
    body TEXT,
    type TEXT,
    timestamp TEXT,
    favorite INTEGER DEFAULT 0,
    threadId TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    fromUser TEXT,
    toUser TEXT,
    subject TEXT,
    body TEXT,
    type TEXT,
    timestamp TEXT
  )`);
};

initTables();

// טיוטות
app.get('/api/drafts', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // שליפת טיוטות של המשתמש, ממוינות לפי תאריך עדכון יורד
    const r = await query('SELECT * FROM drafts WHERE user_username=$1 ORDER BY updated_at DESC', [user.username]);
    res.json(r.rows);
  } catch (err) {
    console.error('שגיאה בשליפת טיוטות:', err);
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
});
// פונקציית Middleware לבדיקת אימות משתמש
function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.user && req.session.user.username) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized: User not logged in' });
}

app.get("/api/drafts", (req, res) => {
  const user = req.user?.username || req.query.user;
  const email = user + "@family.local";
  const drafts = db.data.drafts.filter(d => d.from === email);
  res.json(drafts);
});

// POST /api/drafts: שמירה או עדכון של טיוטה
app.post('/api/drafts', (req, res) => {
    // בדיקה ראשונית לוודא שהמשתמש מחובר
    if (!req.session || !req.session.user || !req.session.user.username) {
        return res.status(401).json({ error: 'Unauthorized: User not logged in' });
    }

    const user = req.session.user;
    const { id, to, subject, body } = req.body;
    let drafts = [];

    try {
        // קריאה מקובץ הטיוטות
        const draftsRaw = fs.readFileSync(draftsPath, 'utf8');
        drafts = JSON.parse(draftsRaw);
    } catch (err) {
        // אם הקובץ לא קיים, ניצור מערך ריק כדי למנוע שגיאה
    }

    if (id) {
        // עדכון טיוטה קיימת
        const draftIndex = drafts.findIndex(d => d.id === id && d.from === user.username);
        if (draftIndex !== -1) {
            drafts[draftIndex] = {
                ...drafts[draftIndex],
                to: to,
                subject: subject,
                body: body,
                timestamp: new Date().toISOString()
            };
            fs.writeFileSync(draftsPath, JSON.stringify(drafts, null, 2));
            return res.json({ success: true, message: 'טיוטה עודכנה', draft: drafts[draftIndex] });
        } else {
            return res.status(404).json({ error: 'טיוטה לא נמצאה' });
        }
    } else {
        // שמירת טיוטה חדשה
        const newDraft = {
            id: uuidv4(),
            from: user.username,
            to: to,
            subject: subject,
            body: body,
            timestamp: new Date().toISOString()
        };
        drafts.push(newDraft);
        fs.writeFileSync(draftsPath, JSON.stringify(drafts, null, 2));
        return res.json({ success: true, message: 'טיוטה נשמרה', draft: newDraft });
    }
});
// 📈 אנליטיקה בסיסית
app.get("/api/stats", (req, res) => {
  db.all(`SELECT fromUser, COUNT(*) as count FROM messages GROUP BY fromUser`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const stats = {
      total: rows.reduce((a, r) => a + r.count, 0),
      byUser: Object.fromEntries(rows.map(r => [r.fromUser, r.count]))
    };
    res.json(stats);
  });
});
// פונקציית Middleware לבדיקת אימות משתמש
function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.user && req.session.user.username) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized: User not logged in' });
}


// --- נתיבים לטיפול בהודעות ---

// GET /api/messages: שליפת הודעות של המשתמש המחובר
app.get('/api/messages', ensureAuthenticated, (req, res) => {
    const user = req.session.user;
    const allMessages = readJsonFile(messagesPath, []);

    const userMessages = allMessages.filter(msg => 
        msg.to === user.username || msg.from === user.username
    );
    res.json(userMessages);
});

// GET /api/messages/all: שליפת כל ההודעות
app.get('/api/messages/all', ensureAuthenticated, (req, res) => {
    const allMessages = readJsonFile(messagesPath, []);
    res.json(allMessages);
});

// POST /api/send: שליחת הודעה חדשה
app.post('/api/send', ensureAuthenticated, (req, res) => {
    const user = req.session.user;
    const { to, subject, body } = req.body;
    
    const newMessage = {
        id: uuidv4(),
        from: user.username,
        to: to,
        subject: subject,
        body: body,
        timestamp: new Date().toISOString()
    };

    try {
        const allMessages = readJsonFile(messagesPath, []);
        allMessages.push(newMessage);
        fs.writeFileSync(messagesPath, JSON.stringify(allMessages, null, 2));
        res.json({ success: true, message: 'ההודעה נשלחה בהצלחה' });
    } catch (err) {
        console.error('שגיאה בשליחת הודעה:', err);
        res.status(500).json({ error: 'שגיאה בשרת' });
    }
});

// --- נתיבים לטיפול בטיוטות ---

// GET /api/drafts: שליפת כל הטיוטות של המשתמש
app.get('/api/drafts', ensureAuthenticated, (req, res) => {
    const user = req.session.user;
    const allDrafts = readJsonFile(draftsPath, []);
    const userDrafts = allDrafts.filter(d => d.from === user.username);
    res.json(userDrafts);
});

// POST /api/drafts: שמירה או עדכון של טיוטה
app.post('/api/drafts', ensureAuthenticated, (req, res) => {
    const user = req.session.user;
    const { id, to, subject, body } = req.body;
    let drafts = readJsonFile(draftsPath, []);

    if (id) {
        const draftIndex = drafts.findIndex(d => d.id === id && d.from === user.username);
        if (draftIndex !== -1) {
            drafts[draftIndex] = {
                ...drafts[draftIndex],
                to: to,
                subject: subject,
                body: body,
                timestamp: new Date().toISOString()
            };
            fs.writeFileSync(draftsPath, JSON.stringify(drafts, null, 2));
            return res.json({ success: true, message: 'טיוטה עודכנה', draft: drafts[draftIndex] });
        } else {
            return res.status(404).json({ error: 'טיוטה לא נמצאה' });
        }
    } else {
        const newDraft = {
            id: uuidv4(),
            from: user.username,
            to: to,
            subject: subject,
            body: body,
            timestamp: new Date().toISOString()
        };
        drafts.push(newDraft);
        fs.writeFileSync(draftsPath, JSON.stringify(drafts, null, 2));
        return res.json({ success: true, message: 'טיוטה נשמרה', draft: newDraft });
    }
});

// DELETE /api/drafts/:id: מחיקת טיוטה
app.delete('/api/drafts/:id', ensureAuthenticated, (req, res) => {
    const user = req.session.user;
    const draftId = req.params.id;

    try {
        let drafts = readJsonFile(draftsPath, []);
        const updatedDrafts = drafts.filter(d => d.id !== draftId || d.from !== user.username);
        
        fs.writeFileSync(draftsPath, JSON.stringify(updatedDrafts, null, 2));
        res.json({ success: true, message: 'הטיוטה נמחקה בהצלחה' });
    } catch (err) {
        console.error('שגיאה במחיקת טיוטה:', err);
        res.status(500).json({ error: 'שגיאה בשרת' });
    }
});

// GET /api/stats: נתיב חדש שאני מוסיף כדי לטפל בשגיאות שראית ביומן
app.get('/api/stats', ensureAuthenticated, (req, res) => {
    const user = req.session.user;

    const stats = readJsonFile(statsPath, {});
    res.json(stats);
});


app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: "secret", resave: false, saveUninitialized: true }));

const pendingPath = path.join(__dirname, "data", "pending.json");
const eventsPath = path.join(__dirname, "data", "events.json");

let messages = fs.existsSync(messagesPath) ? JSON.parse(fs.readFileSync(messagesPath)) : [];
let pendingPeople = fs.existsSync(pendingPath) ? JSON.parse(fs.readFileSync(pendingPath)) : [];

const saveUsers = () => fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
const saveMessages = () => fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));
const savePending = () => fs.writeFileSync(pendingPath, JSON.stringify(pendingPeople, null, 2));

const auth = (role) => (req, res, next) => {
  const user = req.session.user;
  if (!user || (role && user.role !== role && user.role !== "super")) {
    return res.status(403).send("אין הרשאה");
  }
  next();
};

const logStream = fs.createWriteStream(path.join(__dirname, "data", "activity.log"), { flags: "a" });
app.use((req, res, next) => {
  const user = req.session.user ? req.session.user.username : "anonymous";
  const log = `[${new Date().toISOString()}] ${user} => ${req.method} ${req.url}\n`;
  logStream.write(log);
  next();
});

// תהליך התחברות POST
app.post("/api/login", async (req, res) => {
  const usersPath = path.join(__dirname, "data", "users.json");

  // יצירת קובץ משתמשים אם לא קיים
  if (!fs.existsSync(usersPath)) {
    const adminUser = {
      username: "admin",
      password: bcrypt.hashSync("family2025", 10),
      role: "admin",
      side: "all"
    };
    const initialUsers = [adminUser];
    fs.writeFileSync(usersPath, JSON.stringify(initialUsers, null, 2));
    console.log("✅ נוצר קובץ users.json עם משתמש admin ברירת מחדל");
  }
   try {
    const usersRaw = fs.readFileSync(usersPath, "utf8");
    const users = JSON.parse(usersRaw);

    const user = users.find(u => u.username === req.body.username);
    if (!user) {
      return res.status(401).json({ success: false, message: "שם משתמש שגוי" });
    }

    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "סיסמה שגויה" });
    }

    req.session.user = {
      username: user.username,
      role: user.role,
      side: user.side
    };

    console.log("✅ התחברות הצליחה:", user.username);
    res.json({ success: true, user: req.session.user });

  } catch (err) {
    console.error("❌ שגיאה בתהליך התחברות:", err);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});

app.get("/api/users", (req, res) => {
  fs.readFile(usersPath, "utf8", (err, data) => {
    // ...
  });
});
// טוען את האירועים מהקובץ
function loadEvents() {
  if (!fs.existsSync(eventsPath)) return [];
  return JSON.parse(fs.readFileSync(eventsPath, "utf8"));
}
// שליפת כל ההודעות (API למשתמש המחובר)
app.get("/api/messages", (req, res) => {
  try {
    const messagesPath = path.join(__dirname, "data", "messages.json");
    if (!fs.existsSync(messagesPath)) return res.json([]);
    const messages = JSON.parse(fs.readFileSync(messagesPath, "utf8"));
    res.json(messages);
  } catch (err) {
    console.error("❌ שגיאה בקריאת ההודעות:", err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

// שומר את האירועים
function saveEvents(events) {
  fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2));
}

// יצרן מייל (שים לב להחליף בפרטים שלך או ENV)
const transporter = nodemailer.createTransport({
  service: "gmail", // או כל שירות אחר
  auth: {
    user: process.env.EMAIL_USER, // מתוך משתני סביבה
    pass: process.env.EMAIL_PASS
  }
});

// API – יצירת אירוע
app.post("/api/events", (req, res) => {
  const events = loadEvents();
  const newEvent = req.body;
  events.push(newEvent);
  saveEvents(events);
  res.status(201).json({ message: "אירוע נשמר בהצלחה" });
});

// API – שליפת כל האירועים
app.get("/api/events", (req, res) => {
  res.json(loadEvents());
});

// 📅 משימה יומית שנשלחת כל יום בשעה 08:00
cron.schedule("0 8 * * *", () => {
  const today = new Date().toISOString().split("T")[0];
  const events = loadEvents();

  events.forEach(event => {
    if (event.start === today && event.extendedProps?.email) {
      const msg = `שלום! היום חל ${event.title} (${today}) – ברכה חמה ממשפחתכם!`;
      transporter.sendMail({
        from: `Our Family Tree <${process.env.EMAIL_USER}>`,
        to: event.extendedProps.email,
        subject: `🎉 תזכורת לאירוע משפחתי היום`,
        text: msg
      }, err => {
        if (err) console.error("שגיאה בשליחה:", err);
        else console.log("✅ ברכה נשלחה ל:", event.extendedProps.email);
      });
    }
  });
});
// פונקציית Middleware לבדיקת אימות משתמש
function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.user && req.session.user.username) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized: User not logged in' });
}
// סיכום עם LocalAI
app.post('/api/summarize', async (req, res) => {
  const { thread } = req.body;
  try {
    const prompt = 'סכם את השיחה הבאה בעברית:\n' + thread;
    const response = await fetch('http://localhost:8080/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5
      })
    });
    const json = await response.json();
    res.send(json.choices[0].message);
  } catch (e) {
    res.status(500).send('שגיאה בסיכום AI');
  }
});
// פונקציית Middleware לבדיקת אימות משתמש
function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.user && req.session.user.username) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized: User not logged in' });
}


const groups = {
  "family@local": ["avishai@family.local", "merav@family.local", "yanai@family.local"]
};

// 📅 תזמון שליחה
const scheduled = [];
app.post("/api/schedule-message", (req, res) => {
  const msg = req.body;
  msg.id = Date.now().toString();
  if (msg.sendAt) scheduled.push(msg);
  else messages.push(msg);
  res.json({ success: true });
});

// קרא אוטומטית מתוזמנים כל 30 שניות
setInterval(() => {
  const now = Date.now();
  for (let i = scheduled.length - 1; i >= 0; i--) {
    if (new Date(scheduled[i].sendAt).getTime() <= now) {
      messages.push(scheduled[i]);
      scheduled.splice(i, 1);
    }
  }
}, 30000);

// 🧠 סיכום שרשור
app.get("/api/thread/:id", (req, res) => {
  const thread = messages.filter(m => m.threadId === req.params.id);
  res.json({ messages: thread });
});

// 📍 מועדפים
app.post("/api/message/:id/favorite", (req, res) => {
  const msg = messages.find(m => m.id === req.params.id);
  if (msg) msg.favorite = !msg.favorite;
  res.json({ success: true });
});
// פונקציית Middleware לבדיקת אימות משתמש
function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.user && req.session.user.username) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized: User not logged in' });
}

// 📂 קבוצות
app.get("/api/group/:name", (req, res) => {
  const group = groups[req.params.name];
  if (!group) return res.status(404).json({ error: "Not found" });
  res.json({ members: group });
});
// פונקציית Middleware לבדיקת אימות משתמש
function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.user && req.session.user.username) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized: User not logged in' });
}

app.post("/api/save-draft", (req, res) => {
  const d = req.body;
  d.id = Date.now().toString();
  d.timestamp = new Date();
  drafts.push(d);
  res.json({ success: true });
});

// 📜 הודעה בודדת (ל־forward)
app.get("/api/message/:id", (req, res) => {
  const msg = messages.find(m => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: "Not found" });
  res.json(msg);
});
// פונקציית Middleware לבדיקת אימות משתמש
function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.user && req.session.user.username) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized: User not logged in' });
}

app.get("/admin-users", auth("admin"), (req, res) => res.json(users));
app.post("/create-user", auth("admin"), (req, res) => {
  const { username, password, email, side, role } = req.body;
  const hash = bcrypt.hashSync(password, 10);
  users.push({ username, password: hash, email, side, role });
  saveUsers();
  res.redirect("/admin-dashboard.html");
});
app.post("/update-user", auth("admin"), (req, res) => {
  const { username, role, side } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).send("משתמש לא נמצא");
  user.role = role;
  user.side = side;
  saveUsers();
  res.send("עודכן בהצלחה");
});
app.post("/delete-user", auth("admin"), (req, res) => {
  users = users.filter(u => u.username !== req.body.username);
  saveUsers();
  res.send("המשתמש נמחק");
});
app.post("/api/add-user", (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "גישה אסורה" });
  }

  const usersPath = path.join(__dirname, "data", "users.json");
  const { username, password, role, side } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "חובה למלא שם משתמש וסיסמה" });
  }

  const users = JSON.parse(fs.readFileSync(usersPath));
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: "שם משתמש כבר קיים" });
  }

  const hashed = bcrypt.hashSync(password, 10);
  users.push({ username, password: hashed, role, side });
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

  res.json({ success: true });
});
// פונקציית Middleware לבדיקת אימות משתמש
function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.user && req.session.user.username) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized: User not logged in' });
}
const requireLogin = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

app.use((req, res, next) => {
  const protectedPages = ["/mailbox.html", "/calendar.html", "/dashboard.html"];
  if (protectedPages.includes(req.path) && !req.session.user) {
    return res.redirect("/login.html");
  }
  next();
});
// דף התחברות (login.html)
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// תהליך התחברות POST
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  let users = ["admin", "avishai", "merav", "yanai"];
let drafts = {}; // שמירת טיוטות לפי משתמש];
  try {
    users = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "users.json")));
  } catch (e) {
    console.error("❌ שגיאה בקריאת users.json:", e);
    return res.status(500).send("שגיאה בשרת, נסה שוב מאוחר יותר");
  }

  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).send("שם משתמש לא קיים");

  bcrypt.compare(password, user.password, (err, result) => {
    if (err) {
      console.error("❌ שגיאה בהשוואת סיסמא:", err);
      return res.status(500).send("שגיאה בשרת, נסה שוב מאוחר יותר");
    }
    if (!result) return res.status(401).send("סיסמה שגויה");

    req.session.user = { username: user.username, role: user.role, side: user.side };
    res.json({ success: true });
  });
});
app.post("/api/draft", (req, res) => {
  const { username = "admin", draft } = req.body;
  drafts[username] = draft;
  res.json({ success: true });
});

app.get("/api/draft", (req, res) => {
  const username = req.query.username || "admin";
  res.json(drafts[username] || {});
});
app.post("/api/delete-message", (req, res) => {
  const { id } = req.body;
  messages = messages.filter(m => m.id !== id);
  res.json({ success: true });
});


// יציאה מהמערכת
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// הגנה על עמוד אילן יוחסין
app.get("/tree/bromberg", (req, res) => {
  const user = req.session.user;
  if (!user || !user.access.includes("bromberg")) {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "public", "tree_bromberg.html"));
});
app.get("/messages", auth(), (req, res) => {
  const user = req.session.user.username + "@family.local";
  const query = req.query.q?.toLowerCase() || "";
  const typeFilter = req.query.type || "all";

  let inbox = messages.filter(msg => msg.to === user);
  let sent = messages.filter(msg => msg.from === user);

  if (query) {
    inbox = inbox.filter(msg =>
      msg.subject?.toLowerCase().includes(query) ||
      msg.body?.toLowerCase().includes(query) ||
      msg.from?.toLowerCase().includes(query)
    );
    sent = sent.filter(msg =>
      msg.subject?.toLowerCase().includes(query) ||
      msg.body?.toLowerCase().includes(query) ||
      msg.to?.toLowerCase().includes(query)
    );
  }

  if (typeFilter !== "all") {
    inbox = inbox.filter(msg => msg.type === typeFilter);
    sent = sent.filter(msg => msg.type === typeFilter);
  }

  res.json({
    inbox: inbox.reverse(),
    sent: sent.reverse()
  });
});


app.get("/mark-read", (req, res) => {
  const { threadId } = req.query;
  const msg = messages.find(m => m.threadId === threadId);
  if (msg) {
    msg.read = true;
    saveMessages();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Message not found" });
  }
});

app.post("/send-message", auth(), (req, res) => {
  const { to, subject, body, type = "regular", attachment } = req.body;
  const user = req.session.user;
    if (!req.session.user) return res.status(401).send("לא מחובר");

  const msg = {
    from: user.username + "@family.local",
    to,
    subject,
    body,
    type,
    timestamp: new Date().toISOString(),
    threadId: "msg" + Date.now(),
    replies: [],
    attachment,
    read: false
  };

  messages.push(msg);
  saveMessages();
  res.send("נשלח בהצלחה");
});

app.post("/reply-message", auth(), (req, res) => {
  const { threadId, body } = req.body;
  const msg = messages.find(m => m.threadId === threadId);
  if (!msg) return res.status(404).send("הודעה לא נמצאה");

  msg.replies.push({
    from: req.session.user.username + "@family.local",
    body,
    timestamp: new Date().toISOString()
  });

  saveMessages();
  res.send("תגובה נשלחה");
});
// קריאת כל האירועים
app.get("/api/calendar", (req, res) => {
  fs.readFile("data/calendar-events.json", "utf8", (err, data) => {
    if (err) return res.json([]);
    try {
      const events = JSON.parse(data);
      res.json(events);
    } catch (e) {
      res.status(500).json({ error: "שגיאה בקריאת נתוני לוח שנה" });
    }
  });
});

// הוספת אירוע חדש
app.post("/api/calendar", (req, res) => {
  const newEvent = {
    id: Date.now().toString(),
    title: req.body.title,
    date: req.body.date,
    type: req.body.type || "כללי",
    description: req.body.description || "",
    person: req.body.person || "", // אופציונלי: מקשר לאדם
    createdAt: new Date()
  };

  fs.readFile("data/calendar-events.json", "utf8", (err, data) => {
    let events = [];
    if (!err && data) {
      try {
        events = JSON.parse(data);
      } catch {}
    }
    events.push(newEvent);
    fs.writeFile("data/calendar-events.json", JSON.stringify(events, null, 2), err => {
      if (err) return res.status(500).json({ error: "שגיאה בשמירה" });
      res.json({ success: true, event: newEvent });
    });
  });
});

// יצירת קובץ אירועים אם לא קיים
if (!fs.existsSync(eventsPath)) {
  fs.writeFileSync(eventsPath, JSON.stringify([]));
}

// קריאת כל האירועים
app.get("/api/events", (req, res) => {
  try {
    const events = JSON.parse(fs.readFileSync(eventsPath));
    res.json(events);
  } catch (e) {
    console.error("שגיאה בקריאת אירועים:", e);
    res.status(500).json({ error: "שגיאה בקריאת אירועים" });
  }
});

// יצירת אירוע חדש
app.post("/api/events", (req, res) => {
  try {
    const events = JSON.parse(fs.readFileSync(eventsPath));
    const newEvent = {
      id: "e" + Date.now(),
      title: req.body.title,
      date: req.body.date,
      type: req.body.type || "כללי",
      personId: req.body.personId || null,
      description: req.body.description || ""
    };
    events.push(newEvent);
    fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2));
    res.json({ success: true, event: newEvent });
  } catch (e) {
    console.error("שגיאה ביצירת אירוע:", e);
    res.status(500).json({ error: "שגיאה בשמירת האירוע" });
  }
});

// עדכון אירוע קיים
app.put("/api/events/:id", (req, res) => {
  try {
    const events = JSON.parse(fs.readFileSync(eventsPath));
    const idx = events.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "אירוע לא נמצא" });

    events[idx] = { ...events[idx], ...req.body };
    fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2));
    res.json({ success: true });
  } catch (e) {
    console.error("שגיאה בעדכון אירוע:", e);
    res.status(500).json({ error: "שגיאה בעדכון" });
  }
});

// מחיקת אירוע
app.delete("/api/events/:id", (req, res) => {
  try {
    let events = JSON.parse(fs.readFileSync(eventsPath));
    events = events.filter(e => e.id !== req.params.id);
    fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2));
    res.json({ success: true });
  } catch (e) {
    console.error("שגיאה במחיקת אירוע:", e);
    res.status(500).json({ error: "שגיאה במחיקה" });
  }
});

app.post("/upload-attachment", upload.single("attachment"), (req, res) => {
  if (!req.file) return res.status(400).send("לא נשלח קובץ");
  res.json({ url: "/uploads/" + req.file.filename });
});

app.get("/pending-people", auth("admin"), (req, res) => res.json(pendingPeople));
app.post("/add-person", auth(), (req, res) => {
  const person = {
    ...req.body,
    id: "p" + Date.now(),
    submittedBy: req.session.user.username
  };
  pendingPeople.push(person);
  savePending();
  res.send("התווסף בהצלחה. ממתין לאישור מנהל.");
});
app.post("/approve-person", auth("admin"), (req, res) => {
  const { id, side } = req.body;
  const index = pendingPeople.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).send("לא נמצא");

  const approved = pendingPeople.splice(index, 1)[0];
  savePending();

  const sidePath = path.join(__dirname, "data", `${side}.json`);
  const sideData = fs.existsSync(sidePath) ? JSON.parse(fs.readFileSync(sidePath)) : [];
  sideData.push(approved);
  fs.writeFileSync(sidePath, JSON.stringify(sideData, null, 2));

  res.send("נשמר ואושר");
});

app.get("/events", (req, res) => {
  const events = fs.existsSync(eventsPath) ? JSON.parse(fs.readFileSync(eventsPath)) : [];
  res.json(events);
});
app.post("/events", (req, res) => {
  const events = fs.existsSync(eventsPath) ? JSON.parse(fs.readFileSync(eventsPath)) : [];
  events.push(req.body);
  fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2));
  res.sendStatus(200);
});

app.get("/api/users", (req, res) => {
  fs.readFile(usersPath, "utf8", (err, data) => {
    if (err) {
      console.error("שגיאה בקריאת משתמשים:", err);
      return res.status(500).json({ error: "שגיאה בשרת" });
    }
    try {
      const users = JSON.parse(data);
      res.json(users);
    } catch (e) {
      res.status(500).json({ error: "שגיאה בניתוח נתוני המשתמשים" });
    }
  });
});
app.get("/api/user", (req, res) => {
  if (!req.session.user) return res.status(401).send("Unauthorized");
  res.json(req.session.user);
});

app.post("/mark-seen", (req, res) => {
  const threadId = req.body.threadId;
  const messagesPath = path.join(__dirname, "data", "messages.json");
  if (!fs.existsSync(messagesPath)) return res.status(404).end();

  const messages = JSON.parse(fs.readFileSync(messagesPath));
  const msg = messages.find(m => m.threadId === threadId);
  if (msg) msg.seen = true;

  fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));
  res.json({ success: true });
});



app.post("/api/ask", async (req, res) => {
  const { question, lang } = req.body;
  const answer = `שאלת: "${question}" - אנו עדיין לומדים את השאלה הזאת.`;
  if (lang === "en") {
    const [translated] = await translate.translate(answer, "en");
    return res.json({ answer: translated });
  }
  res.json({ answer });
});
app.get("/dashboard", (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect("/login");
  res.send(`<h2>Welcome, ${user.name}!</h2><ul>` +
    user.access.map(f => `<li><a href="/tree/${f}">Go to ${f} family tree</a></li>`).join("") +
    `</ul><a href="/logout">Logout</a>`);
});

app.get("/tree/:family", (req, res) => {
  const user = req.session.user;
  const family = req.params.family;
  if (!user || !user.access.includes(family)) {
    return res.redirect("/login");
  }
  const templatePath = path.join(__dirname, "public", "tree_template.html");
  fs.readFile(templatePath, "utf-8", (err, html) => {
    if (err) return res.status(500).send("Error loading page");
    const customized = html.replace(/__FAMILY__/g, family);
    res.send(customized);
  });
});

// AI Routes
app.post("/api/ask-ai", async (req, res) => {
  const { question } = req.body;
  const answer = await ai.askAI(question);
  res.json({ answer });
});

app.post("/api/check-relation", async (req, res) => {
  const { name1, name2 } = req.body;
  const relation = await ai.checkRelation(name1, name2);
  res.json({ relation });
});

app.post("/api/parse-any", upload.single("file"), async (req, res) => {
  const result = await ai.parseAny(req.file.path);
  res.json(result);
});

app.post("/api/autofill-person", async (req, res) => {
  const result = await ai.autofillPerson(req.body.partial);
  res.json(result);
});

app.post("/api/ocr-parse", upload.single("file"), async (req, res) => {
  const result = await ai.ocrParse(req.file.path);
  res.json(result);
});

app.post("/api/suggest-relations", async (req, res) => {
  const suggestions = await ai.suggestRelations(req.body.name);
  res.json({ suggestions });
});

app.get("/api/family-summary", async (req, res) => {
  const summary = await ai.summarizeFamily();
  res.json({ summary });
});

app.get("/messages-sent", (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).send("לא מחובר");
  const outbox = messages.filter(m => m.from === user.username + "@family.local");
  res.json(outbox.reverse());
});
app.use("/messages", (req, res, next) => {
  if (!req.session.user) return res.status(401).send("לא מחובר");
  next();
});

app.post("/upload-attachment", upload.single("attachment"), (req, res) => {
  const file = req.file;
  const url = "/uploads/" + file.filename;
  res.json({ url });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.post("/api/mark-important", (req, res) => {
  const { id, important } = req.body;
  const msg = messages.find(m => m.id === id);
  if (msg) {
    msg.important = important;
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Message not found" });
  }
});
// אימות משתמש (פשוט)
app.get("/api/user", (req, res) => {
  res.json({ username: "user1@family.local" });
});

// שליחת הודעה
app.post("/api/send", upload.fields([{ name: 'attachment' }, { name: 'media' }]), (req, res) => {
  const { to, subject, body, type } = req.body;
  const recipients = to.split(",").map(s => s.trim());
  const sender = "user1@family.local"; // דוגמה
  const timestamp = new Date().toISOString();

  const attachments = [];
  if (req.files?.attachment) {
    attachments.push(`/uploads/${req.files.attachment[0].filename}`);
  }
  if (req.files?.media) {
    attachments.push(`/uploads/${req.files.media[0].filename}`);
  }

  recipients.forEach(recipient => {
    messages.push({
      id: Date.now() + Math.random(),
      from: sender,
      to: recipient,
      subject,
      body,
      type,
      attachments,
      timestamp,
      unread: true,
      replies: []
    });
  });

  res.json({ success: true });
});

// שליחת תגובה
app.post("/api/reply", (req, res) => {
  const { messageId, body } = req.body;
  const user = "user1@family.local";
  const message = messages.find(m => m.id == messageId);
  if (message) {
    message.replies = message.replies || [];
    message.replies.push({
      from: user,
      body,
      timestamp: new Date().toISOString()
    });
  }
  res.json({ success: true });
});

// סיכום שרשור עם AI (פשוט)
app.post("/api/summarize", (req, res) => {
  const { threadId } = req.body;
  const thread = messages.find(m => m.id == threadId);
  if (!thread) return res.status(404).json({ error: "לא נמצא" });

  const summary = `
🧾 נושא: ${thread.subject}
📤 מאת: ${thread.from}
📥 אל: ${thread.to}
🕒 נשלח ב-${thread.timestamp}

תוכן ראשי:
${thread.body}

תשובות:
${(thread.replies || []).map(r => `- ${r.from}: ${r.body}`).join("\n")}
  `;
  res.json({ summary });
});

// סטטיסטיקה בסיסית
app.get("/api/stats", (req, res) => {
  const user = "user1@family.local";
  const sent = messages.filter(m => m.from === user).length;
  const received = messages.filter(m => m.to === user).length;
  const unread = messages.filter(m => m.to === user && m.unread).length;

  res.json({ sent, received, unread });
});

// אנשי קשר תכופים
app.get("/api/contacts", (req, res) => {
  const user = "user1@family.local";
  const contacts = {};

  messages.forEach(msg => {
    const contact = msg.to === user ? msg.from : msg.to;
    contacts[contact] = (contacts[contact] || 0) + 1;
  });

  const frequent = Object.entries(contacts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([contact]) => contact);
  res.json(frequent);
});

// הגשה של קבצים סטטיים (כולל migration-map.html ו־script.js)
app.use(express.static('public'));

// מערך ברירת מחדל — יופעל רק אם לא מצליחים לקרוא מהקובץ
const fallbackMigrationData = [
  {
    name: "משפחת בן אבו",
    path: [
      { lat: 33.5731, lng: -7.5898, date: "1900", place: "קזבלנקה, מרוקו", type: "נולדו" },
      { lat: 32.0853, lng: 34.7818, date: "1948", place: "תל אביב, ישראל", type: "היגרו" },
      { lat: 31.7683, lng: 35.2137, date: "1970", place: "ירושלים, ישראל", type: "עברו" }
    ],
    events: [
      { type: "נולדו", date: "1900", place: "קזבלנקה" },
      { type: "היגרו", date: "1948", place: "תל אביב" },
      { type: "עברו", date: "1970", place: "ירושלים" }
    ]
  },
  {
    name: "משפחת ויינברגר",
    path: [
      { lat: 48.2082, lng: 16.3738, date: "1880", place: "וינה, אוסטריה", type: "נולדו" },
      { lat: 47.3769, lng: 8.5417, date: "1938", place: "ציריך, שווייץ", type: "ברחו" },
      { lat: 40.7128, lng: -74.0060, date: "1950", place: "ניו יורק, ארה״ב", type: "היגרו" }
    ],
    events: [
      { type: "נולדו", date: "1880", place: "וינה" },
      { type: "ברחו", date: "1938", place: "ציריך" },
      { type: "היגרו", date: "1950", place: "ניו יורק" }
    ]
  }
];

app.get('/api/migration-data', (req, res) => {
  fs.readFile(path.join(__dirname, 'data', 'migration-data.json'), 'utf8', (err, data) => {
    if (err) {
      console.warn('⚠️ לא נמצא קובץ migration-data.json – מחזיר נתוני ברירת מחדל');
      return res.json(fallbackMigrationData);
    }

    try {
      const parsed = JSON.parse(data);
      res.json(parsed);
    } catch (e) {
      console.error("שגיאה בניתוח JSON:", e);
      res.json(fallbackMigrationData);
    }
  });
});


// החזרת כל הדיונים
app.get("/api/forum/threads", (req, res) => {
  try {
    const threads = JSON.parse(fs.readFileSync(forumFile));
    res.json(threads);
  } catch (err) {
    console.error("שגיאה בקריאת דיונים:", err);
    res.status(500).json({ error: "שגיאה בקריאת דיונים" });
  }
});
// פונקציית עזר לטעינה
function loadForum() {
  if (!fs.existsSync(forumPath)) return [];
  const raw = fs.readFileSync(forumPath, "utf8");
  return JSON.parse(raw);
}

// פונקציית עזר לשמירה
function saveForum(data) {
  fs.writeFileSync(forumPath, JSON.stringify(data, null, 2));
}

// שליפת כל השרשורים
app.get("/api/forum/threads", (req, res) => {
  const threads = loadForum();
  res.json(threads);
});

// יצירת שרשור חדש
app.post("/api/forum/thread", (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ message: "לא מחובר" });

  const threads = loadForum();
  const newThread = {
    id: Date.now().toString(),
    title: req.body.title,
    content: req.body.content,
    author: user.username,
    date: new Date(),
    replies: []
  };
  threads.unshift(newThread);
  saveForum(threads);
  res.status(201).json({ success: true });
});

// תגובה לשרשור
app.post("/api/forum/thread/:id/reply", (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ message: "לא מחובר" });

  const threads = loadForum();
  const thread = threads.find(t => t.id === req.params.id);
  if (!thread) return res.status(404).json({ message: "שרשור לא נמצא" });

  const reply = {
    author: user.username,
    text: req.body.text,
    date: new Date()
  };
  thread.replies.push(reply);
  saveForum(threads);
  res.json({ success: true });
});
// 🧠 אינטגרציית AI (LocalAI)
app.post("/api/ai/summarize", async (req, res) => {
  try {
    const { text } = req.body;
    const aiRes = await fetch(`${process.env.LOCALAI_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // או כל מודל שיש לך ב-LocalAI
        messages: [{ role: "system", content: "סכם את ההודעה בקצרה" }, { role: "user", content: text }]
      })
    });
    const data = await aiRes.json();
    res.json({ summary: data.choices?.[0]?.message?.content || "" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// mark seen
app.post('/api/messages/seen', async (req, res) => {
  const { id } = req.body;
  await query('UPDATE messages SET seen=true WHERE id=$1', [id]);
  res.json({ success: true });
});
// contacts (simple frequent contacts)
app.get('/api/contacts', async (req, res) => {
  const user = req.session.user; if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const email = user.username + '@family.local';
  const r = await query('SELECT "from","to", count(*) as cnt FROM messages WHERE "from"=$1 OR "to"=$1 GROUP BY "from","to"', [email]);
  res.json(r.rows);
});


// הפעלת השרת
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


