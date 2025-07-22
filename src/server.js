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

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (user && await bcrypt.compare(password, user.passwordHash)) {
    req.session.username = username;
    req.session.role = user.role;
    res.redirect("/admin.html");
  } else {
    res.send("שגיאה בהתחברות");
  }
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

