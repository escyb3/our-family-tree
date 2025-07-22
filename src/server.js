const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const nodemailer = require('nodemailer');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({ secret: 'secret-key', resave: false, saveUninitialized: true }));
app.use(express.static('public'));

// תצורת מייל
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'yairmbenabou@gmail.com',
    pass: 'wcbh ewrf khty vcxy'
  }
});

// טפסים
app.post('/send-email', async (req, res) => {
  const { name, email, message } = req.body;
  await transporter.sendMail({
    from: 'yairmbenabou@gmail.com',
    to: ['escoob30@gmail.com', 'help-center@gmx.com'],
    subject: 'פנייה חדשה מאתר עץ משפחה',
    text: `שם: ${name}\nאימייל: ${email}\nהודעה: ${message}`
  });
  res.send('הודעה נשלחה!');
});

// התחברות והרשמה
const users = [];

app.post('/signup', async (req, res) => {
  const { username, password, familySide } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  users.push({ username, password: hashed, familySide });
  res.redirect('/login.html');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.user = user;
    res.redirect('/family-tree.html');
  } else {
    res.send('שגיאה בהתחברות');
  }
});

app.listen(3000, () => console.log('השרת פועל ב־http://localhost:3000'));
