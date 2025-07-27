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

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user = user;
    return res.redirect("/dashboard.html");
  }
  res.status(401).send("פרטי התחברות שגויים");
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

app.get("/messages", auth(), (req, res) => {
  const user = req.session.user.username + "@family.local";
  const query = req.query.q?.toLowerCase() || "";
  const typeFilter = req.query.type || "all";
  let inbox = messages.filter(m => m.to === user);

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

app.post("/send-message", auth(), (req, res) => {
  const { to, subject, body, type = "regular", attachment } = req.body;
  const user = req.session.user.username + "@family.local";

  const msg = {
    from: user,
    to,
    subject,
    body,
    type,
    timestamp: new Date().toISOString(),
    threadId: "msg" + Date.now(),
    replies: [],
    attachment
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

app.listen(3000, () => {
  console.log("השרת רץ על פורט 3000");
});
