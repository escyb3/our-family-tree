// server/index.js
import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";

// -------- Init paths (ESM) --------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------- Express --------
const app = express();
app.use(express.json());
app.use(cors());

// -------- Firebase Admin Init --------
// אפשרות A: שימוש ב-Application Default Credentials (Cloud / gcloud auth application-default login)
// admin.initializeApp({ credential: admin.credential.applicationDefault() });

// אפשרות B: שימוש בקובץ Service Account
// הגדר משתנה סביבתי SERVICE_ACCOUNT_PATH או ערוך את הנתיב כאן:
const serviceAccountPath =
  process.env.SERVICE_ACCOUNT_PATH || path.join(__dirname, "serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

const db = admin.firestore();

// -------- עזר: בדיקת שם משתמש --------
function isValidUsername(u) {
  return /^[a-z0-9._-]+$/.test(u);
}

// -------- ראוט: יצירת Custom Token --------
app.post("/api/createCustomToken", async (req, res) => {
  try {
    const { username } = req.body || {};
    if (!username || !isValidUsername(username)) {
      return res.status(400).json({ error: "Invalid or missing username" });
    }

    const normalized = String(username).toLowerCase();
    const email = `${normalized}@family.local`;

    // 1) קבלת/יצירת משתמש ב-Firebase Auth
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        // יוצר משתמש חדש עם סיסמה שרק השרת מכיר (לא נחשפת ללקוח)
        userRecord = await admin.auth().createUser({
          email,
          password: "DefaultPassword123!",
          displayName: normalized,
        });
      } else {
        throw err;
      }
    }

    const uid = userRecord.uid;

    // 2) עדכון/יצירת מסמך משתמש ב-Firestore
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    const nowIso = new Date().toISOString();

    if (!snap.exists) {
      await userRef.set({
        username: normalized,
        email,
        createdAt: nowIso,
        lastLogin: nowIso,
      });
    } else {
      await userRef.set(
        {
          username: normalized,
          email,
          lastLogin: nowIso,
        },
        { merge: true }
      );
    }

    // 3) החזרת Custom Token ללקוח
    const customToken = await admin.auth().createCustomToken(uid);
    return res.json({ customToken });
  } catch (err) {
    console.error("createCustomToken error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
});

// -------- הפעלת השרת --------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Auth server listening on http://localhost:${PORT}`);
});
