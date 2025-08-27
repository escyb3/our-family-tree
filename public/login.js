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
  storageBucket: "our-family-tree-5c3cc.firebasestorage.app",
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
// התחברות מהטופס
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const statusEl = document.getElementById("status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      // התחברות ב-Firebase
      const userCred = await signInWithEmailAndPassword(auth, email, password);

      // קבלת ID Token כדי לשלוח לשרת
      const idToken = await userCred.user.getIdToken();

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });

      const data = await res.json();

      if (data.success) {
        statusEl.textContent = `✅ ברוך הבא ${data.user.email}, צד: ${data.user.side}, תפקיד: ${data.user.role}`;

        // הפניה לפי צד משפחתי
        if (data.user.side === "Ben Abou") window.location.href = "/ben_abou.html";
        else if (data.user.side === "Elharrar") window.location.href = "/elharrar.html";
        else window.location.href = "/index.html";

      } else {
        statusEl.textContent = "❌ " + (data.message || "שגיאה בהתחברות");
      }

    } catch (err) {
      console.error(err);
      statusEl.textContent = "❌ שגיאת התחברות: " + err.message;
    }
  });
});

