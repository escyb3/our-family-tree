const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Static + Middlewares
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: "family-secret",
  resave: false,
  saveUninitialized: true
}));

// DB Mock
const users = {
  "admin": { passwordHash: bcrypt.hashSync("adminpass", 10), role: "admin" },
  "guest": { passwordHash: bcrypt.hashSync("guestpass", 10), role: "guest" }
};

// Auth Middleware
function requireAuth(req, res, next) {
  if (req.session.username) return next();
  res.redirect("/login.html");
}

// Multer Upload
const upload = multer({ dest: "uploads/" });

// Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "yairmbenabou@gmail.com",
    pass: "wcbh ewrf khty vcxy" // סיסמת אפליקציה
  }
});

// Routes
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const usersPath = path.join(__dirname, "users.json");
  if (!fs.existsSync(usersPath)) return res.status(401).send("קובץ משתמשים לא קיים.");

  const users = JSON.parse(fs.readFileSync(usersPath, "utf8"));

  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).send("שם משתמש לא קיים.");

  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
      // התחברות מוצלחת
      res.cookie("user", JSON.stringify(user), { httpOnly: true });
      res.redirect("/");
    } else {
      res.status(401).send("שגיאה בסיסמה.");
    }
    app.get("/create-user.html", (req, res) => {
  if (!isAuthenticatedAdmin(req)) {
    return res.status(403).send("⛔ אין לך הרשאה לצפות בדף זה.");
  }
  res.sendFile(path.join(__dirname, "create-user.html"));
});
function isAuthenticatedAdmin(req) {
  return req.cookies && req.cookies.username && req.cookies.role === "admin";
}
app.get("/admin-dashboard.html", (req, res) => {
  if (!isAuthenticatedAdmin(req)) {
    return res.status(403).send("⛔ אין לך הרשאה לצפות בדף זה.");
  }
  res.sendFile(path.join(__dirname, "admin-dashboard.html"));
});
    app.get("/manage-users", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "manage-users.html"));
});

app.get("/admin/users", requireAdmin, (req, res) => {
  const users = JSON.parse(fs.readFileSync("users.json", "utf8"));
  const sanitized = users.map(u => ({
    username: u.username,
    role: u.role,
    side: u.side
  }));
  res.json(sanitized);
});

app.post("/admin/delete-user", requireAdmin, (req, res) => {
  const { username } = req.body;
  let users = JSON.parse(fs.readFileSync("users.json", "utf8"));

  if (users.find(u => u.username === username && u.role === "admin")) {
    return res.status(403).send("⛔ לא ניתן למחוק משתמש מסוג admin");
  }

  users = users.filter(u => u.username !== username);
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
  res.send("🗑️ המשתמש נמחק בהצלחה.");
});


  });
});
app.post("/create-user", (req, res) => {
  const { username, password, role, side } = req.body;

  const usersPath = path.join(__dirname, "users.json");
  let users = [];

  if (fs.existsSync(usersPath)) {
    users = JSON.parse(fs.readFileSync(usersPath, "utf8"));
    if (users.find(u => u.username === username)) {
      return res.send("שם המשתמש כבר קיים.");
    }
  }

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).send("שגיאה בהצפנת הסיסמה.");

    const newUser = { username, password: hash, role, side };
    users.push(newUser);
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), "utf8");

    res.send("✅ המשתמש נוסף בהצלחה!");
  });
});

app.post("/upload-gedcom", upload.single("gedcom"), (req, res) => {
  res.send("GEDCOM הועלה בהצלחה");
});

app.post("/send-summary", async (req, res) => {
  const { email, message } = req.body;
  await transporter.sendMail({
    from: '"Family Tree" <yairmbenabou@gmail.com>',
    to: email,
    subject: "סיכום שיחה משפחתית",
    text: message
  });
  res.send("נשלח בהצלחה");
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

