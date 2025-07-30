const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const bcrypt = require("bcrypt");
const pdfParse = require("pdf-parse");
const { v4: uuidv4 } = require("uuid");
const { Translate } = require("@google-cloud/translate").v2;
const ai = require("./ai");

const app = express();
const translate = new Translate({ key: process.env.GOOGLE_API_KEY });

const storage = multer.diskStorage({
  destination: path.join(__dirname, "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.json());

const forumFile = path.join(__dirname, "data", "forum.json");

// יצירת קובץ הפורום אם לא קיים
if (!fs.existsSync(forumFile)) {
  fs.writeFileSync(forumFile, JSON.stringify([]));
}

// קריאת כל השרשורים
    app.get("/api/forum", (req, res) => {
  fs.readFile(forumFile, "utf8", (err, data) => {
    if (err) return res.status(500).send("Error reading forum data");
    try {
      const threads = JSON.parse(data);
      res.json(threads);
    } catch (e) {
      res.status(500).send("Error parsing forum data");
    }
  });
});

    const newThread = {
      _id: Date.now().toString(),
      title: req.body.title,
      body: req.body.body,
      category: req.body.category || "כללי",
      username: req.user?.username || "אנונימי",
      createdAt: new Date(),
      replies: [],
    };
// יצירת שרשור חדש
app.post("/api/forum/new", (req, res) => {
  const newThread = req.body;
  const forumFile = path.join(__dirname, "data", "forum.json");

  fs.readFile(forumFile, "utf8", (err, data) => {
    if (err) {
      console.error("שגיאה בקריאת קובץ הפורום:", err);
      return res.status(500).send("שגיאה בקריאת הפורום");
    }

    let threads = [];
    try {
      threads = JSON.parse(data);
    } catch (parseErr) {
      console.error("שגיאה בפענוח קובץ הפורום:", parseErr);
    }

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

app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: "secret", resave: false, saveUninitialized: true }));

const usersPath = path.join(__dirname, "data", "users.json");
const messagesPath = path.join(__dirname, "data", "messages.json");
const pendingPath = path.join(__dirname, "data", "pending.json");
const eventsPath = path.join(__dirname, "data", "events.json");

let users = fs.existsSync(usersPath) ? JSON.parse(fs.readFileSync(usersPath)) : [];
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

{
  app.post("/api/login", async (req, res) => {
  const users = JSON.parse(fs.readFileSync("./data/users.json"));
  const user = users.find(u => u.username === req.body.username);
  if (!user) return res.status(401).send("שם משתמש שגוי");

  const match = await bcrypt.compare(req.body.password, user.password);
  if (!match) return res.status(401).send("סיסמה שגויה");

  res.send({ success: true, user: { username: user.username, role: user.role, side: user.side } });
});

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

app.get("/messages", auth(), (req, res) => {
  const user = req.session.user.username + "@family.local";
  const query = req.query.q?.toLowerCase() || "";
  const typeFilter = req.query.type || "all";
  let inbox = messages.filter(m => m.to === user);
    const inbox = messages.filter(m => m.to === req.session.user.username + "@family.local");
  res.json(inbox);
});

  if (query) {
    inbox = inbox.filter(m =>
      m.subject?.toLowerCase().includes(query) ||
      m.from?.toLowerCase().includes(query)
    );
  }

  if (typeFilter !== "all") {
    inbox = inbox.filter(m => m.type === typeFilter);
  }

  res.json(inbox.reverse());
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

app.get("/api/user", (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "לא מחובר" });
  res.json(req.session.user);
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
  if (!req.file) return res.status(400).send("אין קובץ");
  res.json({ url: "/uploads/" + req.file.filename });
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

// שמירת טיוטה
app.post("/api/draft", (req, res) => {
  drafts.push({ ...req.body, timestamp: new Date().toISOString() });
  res.json({ success: true });
});

// קבלת הודעות
app.get("/api/messages", (req, res) => {
  const user = "user1@family.local";
  const inbox = messages.filter(msg => msg.to === user);
  const sent = messages.filter(msg => msg.from === user);
  res.json({ inbox, sent });
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
      console.error('שגיאה בקריאת קובץ JSON:', err);
      return res.status(500).json({ error: 'שגיאה בשרת' });
    }
    res.json(JSON.parse(data));
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


// הפעלת השרת
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


