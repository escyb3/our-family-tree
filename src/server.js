// server.js
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const pdfParse = require("pdf-parse");
const { v4: uuidv4 } = require("uuid");
const { Translate } = require("@google-cloud/translate").v2;
const translate = new Translate({ key: process.env.GOOGLE_API_KEY });

const app = express();

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: "secret", resave: false, saveUninitialized: true }));

const usersPath = path.join(__dirname, 'data', 'users.json');
let users = JSON.parse(fs.readFileSync(usersPath));
function saveUsers() {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

const messagesPath = path.join(__dirname, 'data', 'messages.json');
let messages = fs.existsSync(messagesPath) ? JSON.parse(fs.readFileSync(messagesPath)) : [];
function saveMessages() {
  fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));
}

function auth(role) {
  return (req, res, next) => {
    if (!req.session.user || (role && req.session.user.role !== role && req.session.user.role !== "super")) {
      return res.status(403).send("אין הרשאה");
    }
    next();
  };
}

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

app.get("/admin-users", auth("admin"), (req, res) => {
  res.json(users);
});

app.post("/delete-user", auth("admin"), (req, res) => {
  users = users.filter(u => u.username !== req.body.username);
  saveUsers();
  res.send("המשתמש נמחק");
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

app.post("/create-user", auth("admin"), (req, res) => {
  const { username, password, email, side, role } = req.body;
  const hash = bcrypt.hashSync(password, 10);
  users.push({ username, password: hash, email, side, role });
  saveUsers();
  res.redirect("/admin-dashboard.html");
});

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

let pendingPeople = [];
const pendingPath = path.join(__dirname, 'data', 'pending.json');
if (fs.existsSync(pendingPath)) {
  pendingPeople = JSON.parse(fs.readFileSync(pendingPath));
}
function savePending() {
  fs.writeFileSync(pendingPath, JSON.stringify(pendingPeople, null, 2));
}

app.post("/add-person", (req, res) => {
  const person = req.body;
  person.id = "p" + Date.now();
  person.submittedBy = req.session.user?.username || "unknown";
  pendingPeople.push(person);
  savePending();
  res.send("התווסף בהצלחה ואישורך ממתין לאישור מנהל.");
});

app.get("/pending-people", auth("admin"), (req, res) => {
  res.json(pendingPeople);
});

app.post("/approve-person", auth("admin"), (req, res) => {
  const { id, side } = req.body;
  const index = pendingPeople.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).send("לא נמצא");

  const approved = pendingPeople.splice(index, 1)[0];
  savePending();

  const pathToSide = path.join(__dirname, 'data', `${side}.json`);
  const sideData = JSON.parse(fs.readFileSync(pathToSide));
  sideData.push(approved);
  fs.writeFileSync(pathToSide, JSON.stringify(sideData, null, 2));

  res.send("אושר ונשמר");
});

app.get("/api/user", (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "לא מחובר" });
  res.json(req.session.user);
});

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

app.post("/api/ask", async (req, res) => {
  const { question, lang } = req.body;
  const answer = `שאלת: "${question}" - אנו עדיין לומדים את השאלה הזאת.`;

  if (lang === "en") {
    const [translated] = await translate.translate(answer, "en");
    return res.json({ answer: translated });
  }

  res.json({ answer });
});

app.post("/api/ask-relation", (req, res) => {
  const { name1, name2 } = req.body;
  if (name1 === "שלמה בן אבו" && name2 === "סוזן אלחרר") {
    return res.json({ relation: "בני זוג" });
  }
  res.json({ relation: "הקשר לא נמצא" });
});

app.post("/api/parse-pdf", upload.single("file"), async (req, res) => {
  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(dataBuffer);
    res.json({ text: data.text });
  } catch (err) {
    res.status(500).json({ error: "שגיאה בניתוח הקובץ" });
  }
});

app.post("/api/autofill", (req, res) => {
  const { partial } = req.body;
  const filled = {
    ...partial,
    birthDate: partial.birthDate || "1900",
    birthPlace: partial.birthPlace || "לא ידוע",
    id: uuidv4()
  };
  res.json(filled);
});

const logStream = fs.createWriteStream(path.join(__dirname, "data", "activity.log"), { flags: 'a' });
app.use((req, res, next) => {
  const user = req.session.user ? req.session.user.username : "anonymous";
  const log = `[${new Date().toISOString()}] ${user} => ${req.method} ${req.url}\n`;
  logStream.write(log);
  next();
});
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const { askAI, checkRelation, parseAny, autofillPerson, ocrParse, suggestRelations, summarizeFamily } = require("./ai");

app.post("/api/ask", async (req, res) => {
  const { question } = req.body;
  const answer = await askAI(question);
  res.json({ answer });
});

app.post("/api/ask-relation", async (req, res) => {
  const { name1, name2 } = req.body;
  const relation = await checkRelation(name1, name2);
  res.json({ relation });
});

app.post("/api/parse-any", upload.single("file"), async (req, res) => {
  const result = await parseAny(req.file.path);
  res.json(result);
});

app.post("/api/autofill", async (req, res) => {
  const { partial } = req.body;
  const result = await autofillPerson(partial);
  res.json(result);
});

app.post("/api/ocr-parse", upload.single("file"), async (req, res) => {
  const result = await ocrParse(req.file.path);
  res.json(result);
});

app.post("/api/suggest-relations", async (req, res) => {
  const { name } = req.body;
  const suggestions = await suggestRelations(name);
  res.json({ suggestions });
});

app.get("/api/family-summary", async (req, res) => {
  const summary = await summarizeFamily();
  res.json({ summary });
});


app.listen(3000, () => console.log("השרת רץ על פורט 3000"));
