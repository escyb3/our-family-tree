// -------------------------
// הגדרות בסיסיות
// -------------------------
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
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

// חיבור לתרגום של גוגל (משתמש במפתח מתוך .env)
const translate = new Translate({ key: process.env.GOOGLE_API_KEY });

// -------------------------
// Middleware
// -------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "supersecret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // local dev
}));

// -------------------------
// Firebase Admin
// -------------------------
const admin = require("firebase-admin");
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require("./serviceAccountKey.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "our-family-tree-5c3cc.appspot.com"
});

const firestore = admin.firestore();

// -------------------------
// Auth route: /api/login
// -------------------------
app.post('/api/login', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ success: false, message: "Missing ID Token" });

  try {
    // אימות ה-ID Token
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const userRef = firestore.collection('user_profiles').doc(uid);
    let profileDoc = await userRef.get();

    // אם אין פרופיל – ניצור אוטומטית
    if (!profileDoc.exists) {
      console.log(`❌ פרופיל לא נמצא עבור UID ${uid} – ניצור אוטומטית`);

      const newProfile = {
        fullName: decoded.name || decoded.email,  // שם מלא אם קיים, אחרת המייל
        role: 'user',
        side: 'Unknown',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        // הוספת קישור לצד המשפחתי, אם קיים
        familySideLink: null
      };

      await userRef.set(newProfile);
      profileDoc = await userRef.get();
    }

    const profileData = profileDoc.data();

    // שמירה בסשן
    req.session.user = {
      uid,
      email: decoded.email,
      // התאמה לשמות המאפיינים בקוד הלקוח
      username: profileData.fullName || decoded.email,
      role: profileData.role,
      familySide: profileData.side,
      // הוספת קישור לצד המשפחתי, אם קיים
      familySideLink: profileData.familySideLink || null
    };

    console.log(`✅ התחברות הצליחה: ${decoded.email}, שם: ${req.session.user.username}, תפקיד: ${profileData.role}, צד: ${profileData.familySide}`);
    res.json({ success: true, user: req.session.user });

  } catch (err) {
    console.error("❌ Firebase token verify error:", err);
    res.status(401).json({ success: false, message: "אימות נכשל" });
  }
});


// -------------------------
// Auth route: /api/logout
// -------------------------
app.post('/api/logout', (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(400).json({ success: false, message: "משתמש כבר מנותק" });
    }

    req.session.destroy(err => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ success: false, message: "שגיאה בעת התנתקות" });
      }

      // ננקה את קוקי הסשן (ברירת מחדל: connect.sid)
      res.clearCookie('connect.sid', { path: '/' });
      res.json({ success: true, message: "התנתקת בהצלחה" });
    });
    
  } catch (err) {
    console.error('Error in /api/logout:', err);
    res.status(500).json({ success: false, message: "שגיאה כללית" });
  }
});

// -------------------------
// Auth route: /api/user
// -------------------------
app.get('/api/user', async (req, res) => {
  try {
    // בדיקה אם המשתמש מחובר
    if (!req.session.user?.uid) {
      return res.status(401).json({ error: 'לא מחובר' });
    }

    const uid = req.session.user.uid;

    // אם כבר יש פרופיל בסשן, נחזיר אותו
    if (req.session.user.profile) {
      return res.json({
        user: {
          uid,
          email: req.session.user.email,
          role: req.session.user.role,
          // התאמה לשם המאפיין בקוד הלקוח
          familySide: req.session.user.side,
          username: req.session.user.name,
          // הוספת קישור לצד המשפחתי, אם קיים
          familySideLink: req.session.user.familySideLink 
        },
        profile: req.session.user.profile
      });
    }

    // שליפה מ-Firebase Auth
    const userRecord = await admin.auth().getUser(uid);

    // שליפה מ-Firestore
    const profileDoc = await firestore.collection('user_profiles').doc(uid).get();
    if (!profileDoc.exists) {
      return res.status(401).json({ error: 'פרופיל משתמש לא נמצא.' });
    }

    const profileData = profileDoc.data();

    // שמירה בסשן
    req.session.user.profile = profileData;
    // שמירה של הקישור לצד המשפחתי, אם קיים
    req.session.user.familySideLink = profileData.familySideLink || null; 
    req.session.save(err => {
      if (err) console.error("Error saving session:", err);
    });

    // החזרת המידע ללקוח
    res.json({
      user: {
        uid,
        email: userRecord.email,
        role: profileData.role,
        // התאמה לשם המאפיין בקוד הלקוח
        familySide: profileData.side, 
        username: profileData.name || userRecord.displayName || userRecord.email,
        // הוספת הקישור לצד המשפחתי, אם קיים
        familySideLink: profileData.familySideLink || null
      },
      profile: profileData
    });

  } catch (err) {
    console.error('Error in /api/user:', err);
    res.status(500).json({ error: 'שגיאת שרת' });
  }
});


// -------------------------
// Middleware
// -------------------------
function requireLogin(req, res, next) {
  if (!req.session.user?.uid) return res.status(401).json({ message: 'צריך להתחבר כדי לגשת' });
  next();
}

function requireAdmin(req, res, next) {
  requireLogin(req, res, () => {
    if (req.session.user.role !== 'admin') return res.status(403).json({ message: "אין לך הרשאה" });
    next();
  });
}



// ✅ התנתקות
app.post('/api/logout', (req, res) => {
  try {
    req.session.destroy(err => {
      if (err) return res.status(500).json({ error: 'שגיאה בעת התנתקות' });
      // ננקה גם את קוקי הסשן (שם ברירת מחדל: connect.sid)
      res.clearCookie('connect.sid');
      res.json({ message: 'התנתקת בהצלחה' });
    });
  } catch (err) {
    console.error('Error in /api/logout:', err);
    res.status(500).json({ error: 'שגיאה כללית' });
  }
});

// ✅ Middleware לבדיקת התחברות
function requireLogin(req, res, next) {
  if (!req.session.user?.uid) {
    return res.status(401).json({ message: 'צריך להתחבר כדי לגשת' });
  }
  next();
}


// דוגמה: קריאה ל־messages
app.get("/api/messages", requireLogin, async (req, res) => {
    const userEmail = req.session.user.email; // השתמש בכתובת המייל שנשמרה בסשן

    // כאן אנו משתמשים ב-Firebase Firestore כדי לשלוף נתונים
    const messagesRef = admin.firestore().collection('messages');
    const snapshot = await messagesRef.where('toUser', '==', userEmail).get();

    const messages = [];
    snapshot.forEach(doc => {
        messages.push(doc.data());
    });

    res.json({ messages });
});


// =========================
// Admin: Users Management
// =========================
app.get('/admin-users', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) return res.status(500).json({ error });
  res.json(data);
});

app.post('/create-user', requireAdmin, async (req, res) => {
  const { username, password, email, role } = req.body;
  const hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase.from('users').insert([
    { username, password: hash, email, role }
  ]);

  if (error) return res.status(500).json({ error });
  res.json({ message: 'User created', user: data[0] });
});

// -------------------------
// הגדרות אפליקציה
// -------------------------
app.use(cors());
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------------
// אחסון קבצים עם multer
// -------------------------
const storage = multer.diskStorage({
  destination: path.join(__dirname, "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage });

// -------------------------
// נתיבי קבצים מקומיים
// -------------------------
const dataDir = path.join(__dirname, "data");
const messagesPath = path.join(dataDir, "messages.json");
const draftsPath = path.join(dataDir, "drafts.json");
const statsPath = path.join(dataDir, "stats.json");
const forumFile = path.join(dataDir, "forum.json");

// ודא שכל התיקיות והקבצים קיימים
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(messagesPath)) fs.writeFileSync(messagesPath, JSON.stringify([], null, 2));
if (!fs.existsSync(draftsPath)) fs.writeFileSync(draftsPath, JSON.stringify([], null, 2));
if (!fs.existsSync(statsPath)) fs.writeFileSync(statsPath, JSON.stringify({}, null, 2));
if (!fs.existsSync(forumFile)) fs.writeFileSync(forumFile, JSON.stringify([]));

// -------------------------
// Middleware לאימות משתמש
// -------------------------
function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user && req.session.user.username) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized: User not logged in" });
}

// -------------------------
// יצירת טבלאות אם לא קיימות
// -------------------------
async function initTables() {
  await query(`CREATE TABLE IF NOT EXISTS messages (
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

  await query(`CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    fromUser TEXT,
    toUser TEXT,
    subject TEXT,
    body TEXT,
    type TEXT,
    timestamp TEXT
  )`);

  await query(`CREATE TABLE IF NOT EXISTS forum (
    id TEXT PRIMARY KEY,
    title TEXT,
    body TEXT,
    category TEXT,
    username TEXT,
    createdAt TIMESTAMP,
    replies JSONB DEFAULT '[]'::jsonb
  )`);
}
async function initTables() {
  try {
    const { error } = await supabase.from("messages").select("id").limit(1);
    if (error) {
      console.error("Supabase init error:", error.message);
    } else {
      console.log("✅ Supabase connection works");
    }
  } catch (err) {
    console.error("DB init error:", err);
  }
}


initTables().catch(err => console.error("DB init error:", err));

// -------------------------
// פורום – יצירת שרשור חדש
// -------------------------
app.post("/api/forum/new", ensureAuthenticated, async (req, res) => {
  try {
    const newThread = {
      id: uuidv4(),
      title: req.body.title,
      body: req.body.body,
      category: req.body.category || "כללי",
      username: req.session.user.username,
      createdAt: new Date(),
      replies: [],
    };

    await query(
      `INSERT INTO forum (id, title, body, category, username, createdAt, replies) 
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [newThread.id, newThread.title, newThread.body, newThread.category, newThread.username, newThread.createdAt, JSON.stringify([])]
    );

    res.json({ success: true, thread: newThread });
  } catch (err) {
    console.error("שגיאה ביצירת שרשור:", err);
    res.status(500).json({ error: "שגיאה בשרת" });
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

// POST /api/mark-seen: סימון הודעה כנקראה
app.post('/api/mark-seen', ensureAuthenticated, (req, res) => {
    const user = req.session.user;
    const { id } = req.body;
    let allMessages = readJsonFile(messagesPath, []);

    const msgToUpdate = allMessages.find(m => m.id === id);
    if (msgToUpdate && (msgToUpdate.to && msgToUpdate.to.includes(user.username))) {
        msgToUpdate.seen = true;
        try {
            fs.writeFileSync(messagesPath, JSON.stringify(allMessages, null, 2));
            return res.json({ success: true, message: 'הודעה סומנה כנקראה' });
        } catch (err) {
            console.error('שגיאה בסימון הודעה כנקראה:', err);
            return res.status(500).json({ error: 'שגיאה בשרת' });
        }
    }
    res.status(404).json({ error: 'הודעה לא נמצאה או שאין למשתמש הרשאה לסמן אותה' });
});


// POST /api/mark-seen: סימון הודעה כנקראה
app.post('/api/mark-seen', ensureAuthenticated, (req, res) => {
    const user = req.session.user;
    const { id } = req.body;
    let allMessages = readJsonFile(messagesPath, []);

    const msgToUpdate = allMessages.find(m => m.id === id);
    if (msgToUpdate && (msgToUpdate.to && msgToUpdate.to.includes(user.username))) {
        msgToUpdate.seen = true;
        try {
            fs.writeFileSync(messagesPath, JSON.stringify(allMessages, null, 2));
            return res.json({ success: true, message: 'הודעה סומנה כנקראה' });
        } catch (err) {
            console.error('שגיאה בסימון הודעה כנקראה:', err);
            return res.status(500).json({ error: 'שגיאה בשרת' });
        }
    }
    res.status(404).json({ error: 'הודעה לא נמצאה או שאין למשתמש הרשאה לסמן אותה' });
});

// --- נתיבים לטיפול בהודעות ---

// GET /api/messages: שליפת הודעות של המשתמש המחובר
app.get('/api/messages', ensureAuthenticated, (req, res) => {
    const user = req.session.user;
    if (!user) {
        return res.status(401).json({ error: 'משתמש לא מאומת.' });
    }
    try {
        const allMessages = readJsonFile(messagesPath, []);
        // סינון הודעות שהמשתמש הוא הנמען או השולח שלהן
        const userMessages = allMessages.filter(msg =>
            (msg.to && msg.to.includes(user.username)) || (msg.from && msg.from.includes(user.username))
        );
        res.json(userMessages);
    } catch (err) {
        console.error('שגיאה בשליפת הודעות:', err);
        res.status(500).json({ error: 'שגיאה בשרת' });
    }
});

// -------------------------
// GET /api/messages/all – שליפת כל ההודעות (בדיקה/ניהול)
// -------------------------
app.get("/api/messages/all", ensureAuthenticated, async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: "משתמש לא מאומת." });

  try {
    const result = await query(`SELECT * FROM messages ORDER BY timestamp DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error("שגיאה בשליפת כל ההודעות:", err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

// -------------------------
// POST /api/send – שליחת הודעה חדשה
// -------------------------
app.post("/api/send", ensureAuthenticated, async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { to, subject, body } = req.body;
  const newMessage = {
    id: uuidv4(),
    fromUser: user.username,
    toUser: to,
    subject,
    body,
    type: "mail",
    timestamp: new Date().toISOString(),
    favorite: 0,
    threadId: null,
  };

  try {
    await query(
      `INSERT INTO messages (id, fromUser, toUser, subject, body, type, timestamp, favorite, threadId) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        newMessage.id,
        newMessage.fromUser,
        newMessage.toUser,
        newMessage.subject,
        newMessage.body,
        newMessage.type,
        newMessage.timestamp,
        newMessage.favorite,
        newMessage.threadId,
      ]
    );

    res.json({ success: true, message: "ההודעה נשלחה בהצלחה", newMessage });
  } catch (err) {
    console.error("שגיאה בכתיבת הודעה:", err);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});

// -------------------------
// POST /api/mark-seen – סימון הודעה כנקראה
// -------------------------
app.post("/api/mark-seen", ensureAuthenticated, async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: "משתמש לא מאומת." });

  const { id } = req.body;

  try {
    const result = await query(
      `UPDATE messages SET type = 'seen' 
       WHERE id = $1 AND toUser = $2 RETURNING *`,
      [id, user.username]
    );

    if (result.rowCount > 0) {
      return res.json({ success: true, message: "הודעה סומנה כנקראה" });
    } else {
      return res.status(404).json({ error: "הודעה לא נמצאה או שאין הרשאה" });
    }
  } catch (err) {
    console.error("שגיאה בסימון הודעה כנקראה:", err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

// -------------------------
// GET /api/drafts – שליפת כל הטיוטות של המשתמש
// -------------------------
app.get("/api/drafts", ensureAuthenticated, async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: "משתמש לא מאומת." });

  try {
    const result = await query(
      `SELECT * FROM drafts WHERE fromUser = $1 ORDER BY timestamp DESC`,
      [user.username]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("שגיאה בשליפת טיוטות:", err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

// -------------------------
// POST /api/drafts – שמירה/עדכון של טיוטה
// -------------------------
app.post("/api/drafts", ensureAuthenticated, async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: "משתמש לא מאומת." });

  const { id, to, subject, body } = req.body;

  try {
    if (id) {
      const result = await query(
        `UPDATE drafts 
         SET toUser=$1, subject=$2, body=$3, timestamp=$4 
         WHERE id=$5 AND fromUser=$6 RETURNING *`,
        [to, subject, body, new Date().toISOString(), id, user.username]
      );

      if (result.rowCount > 0) {
        return res.json({ success: true, message: "טיוטה עודכנה", draft: result.rows[0] });
      } else {
        return res.status(404).json({ error: "טיוטה לא נמצאה" });
      }
    } else {
      const newDraft = {
        id: uuidv4(),
        fromUser: user.username,
        toUser: to,
        subject,
        body,
        timestamp: new Date().toISOString(),
      };

      await query(
        `INSERT INTO drafts (id, fromUser, toUser, subject, body, timestamp) 
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          newDraft.id,
          newDraft.fromUser,
          newDraft.toUser,
          newDraft.subject,
          newDraft.body,
          newDraft.timestamp,
        ]
      );

      return res.json({ success: true, message: "טיוטה נשמרה", draft: newDraft });
    }
  } catch (err) {
    console.error("שגיאה בשמירת טיוטה:", err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

// -------------------------
// DELETE /api/drafts/:id – מחיקת טיוטה
// -------------------------
app.delete("/api/drafts/:id", ensureAuthenticated, async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: "משתמש לא מאומת." });

  const draftId = req.params.id;

  try {
    const result = await query(
      `DELETE FROM drafts WHERE id=$1 AND fromUser=$2 RETURNING *`,
      [draftId, user.username]
    );

    if (result.rowCount > 0) {
      return res.json({ success: true, message: "הטיוטה נמחקה בהצלחה" });
    } else {
      return res.status(404).json({ error: "טיוטה לא נמצאה או שאין הרשאה למחוק אותה" });
    }
  } catch (err) {
    console.error("שגיאה במחיקת טיוטה:", err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

// -------------------------
// GET /api/stats – סטטיסטיקות הודעות
// -------------------------
app.get("/api/stats", ensureAuthenticated, async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: "משתמש לא מאומת." });

  try {
    const sent = await query(`SELECT COUNT(*) FROM messages WHERE fromUser=$1`, [user.username]);
    const received = await query(`SELECT COUNT(*) FROM messages WHERE toUser=$1`, [user.username]);
    const unread = await query(
      `SELECT COUNT(*) FROM messages WHERE toUser=$1 AND type != 'seen'`,
      [user.username]
    );

    res.json({
      sent: parseInt(sent.rows[0].count, 10),
      received: parseInt(received.rows[0].count, 10),
      unread: parseInt(unread.rows[0].count, 10),
    });
  } catch (err) {
    console.error("שגיאה בשליפת נתוני סטטיסטיקה:", err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

// -------------------------
// Middleware נוספים (session, לוגים וכו')
// -------------------------
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: "secret", resave: false, saveUninitialized: true }));

const logStream = fs.createWriteStream(path.join(__dirname, "data", "activity.log"), { flags: "a" });
app.use((req, res, next) => {
  const user = req.session.user ? req.session.user.username : "anonymous";
  const log = `[${new Date().toISOString()}] ${user} => ${req.method} ${req.url}\n`;
  logStream.write(log);
  next();
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

// Middleware לאימות משתמש (הגדרה יחידה!)
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

// 📂 קבוצות
app.get("/api/group/:name", (req, res) => {
  const group = groups[req.params.name];
  if (!group) return res.status(404).json({ error: "Not found" });
  res.json({ members: group });
});

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
  let drafts = {}; // שמירת טיוטות לפי משתמש

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
// =========================
// הודעות ומסרים
// =========================
app.use("/messages", (req, res, next) => {
  if (!req.session.user) return res.status(401).send("לא מחובר");
  next();
});

// שליחת הודעה
app.post("/api/send", upload.fields([{ name: 'attachment' }, { name: 'media' }]), (req, res) => {
  const { to, subject, body, type } = req.body;
  const recipients = to.split(",").map(s => s.trim());
  const sender = req.session.user.username + "@family.local";
  const timestamp = new Date().toISOString();

  const attachments = [];
  if (req.files?.attachment) attachments.push(`/uploads/${req.files.attachment[0].filename}`);
  if (req.files?.media) attachments.push(`/uploads/${req.files.media[0].filename}`);

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

  saveMessages();
  res.json({ success: true });
});

// תגובה להודעה
app.post("/api/reply", (req, res) => {
  const { messageId, body } = req.body;
  const user = req.session.user.username + "@family.local";
  const message = messages.find(m => m.id == messageId);
  if (message) {
    message.replies = message.replies || [];
    message.replies.push({ from: user, body, timestamp: new Date().toISOString() });
    saveMessages();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Message not found" });
  }
});

// סיכום שרשור
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

// סימון כהוצג / קריאה
app.post('/api/messages/seen', (req, res) => {
  const { id } = req.body;
  const msg = messages.find(m => m.id == id);
  if (msg) msg.seen = true;
  saveMessages();
  res.json({ success: true });
});

// סימון כהחשוב
app.post("/api/mark-important", (req, res) => {
  const { id, important } = req.body;
  const msg = messages.find(m => m.id === id);
  if (msg) {
    msg.important = important;
    saveMessages();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Message not found" });
  }
});

// אנשי קשר תכופים
app.get('/api/contacts', (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const email = user.username + '@family.local';
  const contacts = {};

  messages.forEach(msg => {
    const contact = msg.to === email ? msg.from : msg.to;
    contacts[contact] = (contacts[contact] || 0) + 1;
  });

  const frequent = Object.entries(contacts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([contact]) => contact);

  res.json(frequent);
});

// =========================
// AI Routes
// =========================
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

// LocalAI Summarize
app.post("/api/ai/summarize", async (req, res) => {
  try {
    const { text } = req.body;
    const aiRes = await fetch(`${process.env.LOCALAI_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "סכם את ההודעה בקצרה" },
          { role: "user", content: text }
        ]
      })
    });
    const data = await aiRes.json();
    res.json({ summary: data.choices?.[0]?.message?.content || "" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =========================
// פורום
// =========================
function loadForum() {
  if (!fs.existsSync(forumPath)) return [];
  return JSON.parse(fs.readFileSync(forumPath, "utf8"));
}

function saveForum(data) {
  fs.writeFileSync(forumPath, JSON.stringify(data, null, 2));
}

app.get("/api/forum/threads", (req, res) => {
  const threads = loadForum();
  res.json(threads);
});

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

app.post("/api/forum/thread/:id/reply", (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ message: "לא מחובר" });

  const threads = loadForum();
  const thread = threads.find(t => t.id === req.params.id);
  if (!thread) return res.status(404).json({ message: "שרשור לא נמצא" });

  thread.replies.push({ author: user.username, text: req.body.text, date: new Date() });
  saveForum(threads);
  res.json({ success: true });
});

// =========================
// העלאות קבצים
// =========================
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const storageRef = ref(storage, `uploads/${Date.now()}_${req.file.originalname}`);
    await uploadBytes(storageRef, req.file.buffer);
    const url = await getDownloadURL(storageRef);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =========================
// Gemini API
// =========================
app.post("/api/gemini", async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
      process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// =========================
// הפעלת השרת
// =========================
const PORT = process.env.PORT || 3000;
console.log ('The Server Is Ready To Receive Requests')
console.log ('השרת רץ על פורט 300')
app.listen(PORT, () => {
  console.log(`שרת המרכז המשפחתי פעיל בכתובת http://localhost:${PORT}`);
});


