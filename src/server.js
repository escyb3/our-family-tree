// server.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const pdfParse = require("pdf-parse");
const { v4: uuidv4 } = require("uuid");
const { Translate } = require("@google-cloud/translate").v2;
const ai = require("./ai");

const upload = multer({ dest: "uploads/" });
const translate = new Translate({ key: process.env.GOOGLE_API_KEY });
const app = express();

// Middleware
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: "secret", resave: false, saveUninitialized: true }));

// File paths and data loading
const usersPath = path.join(__dirname, "data", "users.json");
let users = JSON.parse(fs.readFileSync(usersPath));
const messagesPath = path.join(__dirname, "data", "messages.json");
let messages = fs.existsSync(messagesPath) ? JSON.parse(fs.readFileSync(messagesPath)) : [];
const pendingPath = path.join(__dirname, "data", "pending.json");
let pendingPeople = fs.existsSync(pendingPath) ? JSON.parse(fs.readFileSync(pendingPath)) : [];

// Save helpers
function saveUsers() {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}
function saveMessages() {
  fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));
}
function savePending() {
  fs.writeFileSync(pendingPath, JSON.stringify(pendingPeople, null, 2));
}

// Auth middleware
function auth(role) {
  return (req, res, next) => {
    if (!req.session.user || (role && req.session.user.role !== role && req.session.user.role !== "super")) {
      return res.status(403).send("אין הרשאה");
    }
    next();
  };
}

// Logging
const logStream = fs.createWriteStream(path.join(__dirname, "data", "activity.log"), { flags: "a" });
app.use((req, res, next) => {
  const user = req.session.user ? req.session.user.username : "anonymous";
  const log = `[${new Date().toISOString()}] ${user} => ${req.method} ${req.url}\n`;
  logStream.write(log);
  next();
});

// Auth routes
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user = user;
    res.redirect("/dashboard.html");
  } else {
    res.status(401).send("פרטי התחברות שגויים");
  }
});

// User management
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
  if (user) {
    user.role = role;
    user.side = side;
    saveUsers();
    res.send("עודכן בהצלחה");
  } else {
    res.status(404).send("משתמש לא נמצא");
  }
});
app.post("/delete-user", auth("admin"), (req, res) => {
  users = users.filter(u => u.username !== req.body.username);
  saveUsers();
  res.send("המשתמש נמחק");
});

// Messages
app.get("/messages", (req, res) => {
  const inbox = messages.filter(m => m.to === req.session.user.username + "@family.local");
  res.json(inbox);
});
app.post("/send-message", (req, res) => {
  const msg = {
    from: req.session.user.username + "@family.local",
    to: req.body.to,
    subject: req.body.subject,
    body: req.body.body,
    timestamp: new Date().toISOString(),
    threadId: "msg" + Date.now(),
    replies: []
  };
  messages.push(msg);
  saveMessages();
  res.send("נשלח בהצלחה");
});
app.post("/reply-message", (req, res) => {
  const msg = messages.find(m => m.threadId === req.body.threadId);
  if (msg) {
    msg.replies.push({
      from: req.session.user.username + "@family.local",
      body: req.body.body,
      timestamp: new Date().toISOString()
    });
    saveMessages();
    res.send("תגובה נשלחה");
  } else {
    res.status(404).send("הודעה לא נמצאה");
  }
});

function saveMessages() {
  fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));
}
app.post("/send-message", (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).send("לא מחובר");

  const { to, subject, body, attachment, type = "regular" } = req.body;
  const msg = {
    from: user.username + "@family.local",
    to,
    subject,
    body,
    timestamp: new Date().toISOString(),
    threadId: "msg" + Date.now(),
    replies: [],
    attachment,
    type
  };

  messages.push(msg);
  saveMessages();
  res.send("נשלח בהצלחה");
});
app.post("/reply-message", (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).send("לא מחובר");

  const { threadId, body } = req.body;
  const msg = messages.find(m => m.threadId === threadId);
  if (!msg) return res.status(404).send("לא נמצא");

  msg.replies.push({
    from: user.username + "@family.local",
    body,
    timestamp: new Date().toISOString()
  });

  saveMessages();
  res.send("תגובה נוספה");
});
app.get("/messages", (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).send("לא מחובר");

  const myInbox = messages.filter(m => m.to === user.username + "@family.local");
  res.json(myInbox.reverse());
});
app.post("/upload-attachment", upload.single("attachment"), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).send("לא נשלח קובץ");

  const url = "/uploads/" + file.filename;
  res.json({ url });
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Pending people
app.post("/add-person", (req, res) => {
  const person = {
    ...req.body,
    id: "p" + Date.now(),
    submittedBy: req.session.user?.username || "unknown"
  };
  pendingPeople.push(person);
  savePending();
  res.send("התווסף בהצלחה ואישורך ממתין לאישור מנהל.");
});
app.get("/pending-people", auth("admin"), (req, res) => res.json(pendingPeople));
app.post("/approve-person", auth("admin"), (req, res) => {
  const { id, side } = req.body;
  const index = pendingPeople.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).send("לא נמצא");

  const approved = pendingPeople.splice(index, 1)[0];
  savePending();

  const sidePath = path.join(__dirname, "data", `${side}.json`);
  const sideData = JSON.parse(fs.readFileSync(sidePath));
  sideData.push(approved);
  fs.writeFileSync(sidePath, JSON.stringify(sideData, null, 2));
  res.send("אושר ונשמר");
});

// Events
app.get("/events", (req, res) => {
  const events = JSON.parse(fs.readFileSync("data/events.json"));
  res.json(events);
});
app.post("/events", (req, res) => {
  const events = JSON.parse(fs.readFileSync("data/events.json"));
  events.push(req.body);
  fs.writeFileSync("data/events.json", JSON.stringify(events, null, 2));
  res.sendStatus(200);
});

// API
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

  dest: path.join(__dirname, "uploads"),
limits: { fileSize: 10 * 1024 * 1024 }
});

// Start server
app.listen(3000, () => console.log("השרת רץ על פורט 3000"));
