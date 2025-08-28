// login.js
// -------------------------
// Firebase Login (ES Module)
// -------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// -------------------------
// קונפיג Firebase
// -------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBtkY1qKbZNFRaMd5fqNtqyf0d7wND5wHI",
  authDomain: "our-family-tree-5c3cc.firebaseapp.com",
  projectId: "our-family-tree-5c3cc",
  storageBucket: "our-family-tree-5c3cc.appspot.com", // ← תיקון סיומת
  messagingSenderId: "788477397236",
  appId: "1:788477397236:web:0d4d95210878564c2036a1",
  measurementId: "G-99LGBPSR3F"
};

// -------------------------
// אתחול Firebase
// -------------------------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// -------------------------
// התחברות מהטופס – גרסה מתוקנת
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const statusEl = document.getElementById("status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      statusEl.textContent = "❌ אנא מלא את כל השדות";
      return;
    }

    console.log("Login attempt with email:", email);

    try {
      // התחברות ב-Firebase
      const userCred = await signInWithEmailAndPassword(auth, email, password);

      // קבלת ID Token (מרוענן)
      const idToken = await userCred.user.getIdToken(true);
      console.log("Got ID Token (first 30 chars):", idToken.substring(0, 30) + "...");

      // שליחה לשרת
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        statusEl.textContent = `✅ ברוך הבא ${data.user.email}, צד: ${data.user.side}, תפקיד: ${data.user.role}`;

        // הפניה לפי צד משפחתי
        switch (data.user.side) {
          case "Ben Abou":
            window.location.href = "/ben_abou.html";
            break;
          case "Elharrar":
            window.location.href = "/elharrar.html";
            break;
          default:
            window.location.href = "/index.html";
        }

      } else {
        statusEl.textContent = "❌ " + (data.message || "שגיאה בהתחברות");
      }

    } catch (err) {
      console.error("Login error:", err);

      let msg = "";
      if (err.code) {
        switch (err.code) {
          case "auth/invalid-email":   msg = "כתובת אימייל לא תקינה"; break;
          case "auth/user-disabled":   msg = "המשתמש מושבת"; break;
          case "auth/user-not-found":  msg = "המשתמש לא נמצא"; break;
          case "auth/wrong-password":  msg = "סיסמה שגויה"; break;
          case "auth/invalid-credential": msg = "אימות נכשל – בדוק אימייל/סיסמה"; break;
          default: msg = err.message;
        }
      } else {
        msg = err.message;
      }

      statusEl.textContent = "❌ שגיאת התחברות: " + msg;
    }
  });
});
