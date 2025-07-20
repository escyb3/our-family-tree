const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const USERS_FILE = path.join(__dirname, 'data', 'users.json');

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'my-secret-key',
  resave: false,
  saveUninitialized: true
}));

// טעינת משתמשים מהקובץ
function loadUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

// אימות משתמש
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username);

  if (!user) return res.status(401).json({ message: 'משתמש לא קיים' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: 'סיסמה שגויה' });

  req.session.user = {
    username: user.username,
    role: user.role,
    familySide: user.familySide
  };

  res.json({ message: 'התחברת בהצלחה', user: req.session.user });
});

// יציאה
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'התנתקת' });
});

// בדיקת התחברות
app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'לא מחובר' });
  res.json(req.session.user);
});

// שליפת קובץ GEDCOM לפי צד משפחתי
app.get('/api/gedcom', (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'לא מחובר' });

  const familySide = req.session.user.familySide;
  let filename;

  if (req.session.user.role === 'admin') {
    filename = 'all_families.ged';
  } else {
    filename = `${familySide.toLowerCase().replace(/\s/g, '_')}.ged`;
  }

  const filepath = path.join(__dirname, 'gedcoms', filename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ message: 'קובץ לא נמצא' });
  }

  res.sendFile(filepath);
});

app.listen(PORT, () => {
  console.log(`השרת פועל על http://localhost:${PORT}`);
});
