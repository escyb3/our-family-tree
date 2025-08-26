import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, getIdTokenResult } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// קונפיג Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBtkY1qKbZNFRaMd5fqNtqyf0d7wND5wHI",
  authDomain: "our-family-tree-5c3cc.firebaseapp.com",
  projectId: "our-family-tree-5c3cc",
  storageBucket: "our-family-tree-5c3cc.firebasestorage.app",
  messagingSenderId: "788477397236",
  appId: "1:788477397236:web:0d4d95210878564c2036a1",
  measurementId: "G-99LGBPSR3F"
};

// אתחול
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// התחברות מהטופס
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const statusEl = document.getElementById("status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const token = await getIdTokenResult(userCred.user);

      // claims שהגדרת בצד השרת (role + familySide)
      const { role, familySide } = token.claims;

      statusEl.textContent = `✅ ברוך הבא ${email}, צד: ${familySide}, תפקיד: ${role}`;

      // דוגמת הפניה לעץ מתאים
      if (familySide === "Ben Abou") {
        window.location.href = "/ben_abou.html";
      } else if (familySide === "Elharrar") {
        window.location.href = "/elharrar.html";
      } else {
        window.location.href = "/index.html";
      }

    } catch (err) {
      statusEl.textContent = "❌ שגיאת התחברות: " + err.message;
    }
  });
});

