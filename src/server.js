const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: "secret-escoob-key",
  resave: false,
  saveUninitialized: false
}));

// טעינת משתמשים
const users = JSON.parse(fs.readFileSync("users.json", "utf-8"));

// התחברות
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);

  if (user && await bcrypt.compare(password, user.password)) {
    req.session.user = user;
    res.redirect("/tree.html");
  } else {
    res.send("שגיאה: שם משתמש או סיסמה שגויים");
  }
});

// התנתקות
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login.html");
  });
});

// שליפת קובץ GEDCOM לפי צד משפחתי
app.get("/gedcom", (req, res) => {
  if (!req.session.user) return res.status(403).send("אין גישה");

  const fileName = `${req.session.user.family}.ged`;
  const filePath = path.join(__dirname, "gedcom", fileName);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("קובץ עץ משפחתי לא נמצא");
  }
});

// שליחת סיכום שיחה / טופס במייל
app.post("/send-summary", async (req, res) => {
  const { to, subject, content } = req.body;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER || "yairmbenabou@gmail.com",
      pass: process.env.EMAIL_PASS || "סיסמת-אפליקציה-כאן"
    }
  });

  const mailOptions = {
    from: '"Our Family Tree" <yairmbenabou@gmail.com>',
    to: [to, "escoob30@gmail.com", "help-center@gmx.com"],
    subject,
    text: content
  };

  try {
    await transporter.sendMail(mailOptions);
    res.send("נשלח בהצלחה");
  } catch (err) {
    console.error("שגיאה בשליחה:", err);
    res.status(500).send("שגיאה בשליחת מייל");
  }
});

// דף ברירת מחדל
app.get("/", (req, res) => {
  res.redirect("/login.html");
});

app.listen(PORT, () => {
  console.log(`💡 השרת פועל בכתובת http://localhost:${PORT}`);
});
