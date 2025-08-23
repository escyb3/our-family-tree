// public/login.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- Firebase Client Init ----------
const firebaseConfig = {
  // TODO: מלא מהקונסול של Firebase
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------- Elements ----------
const loginForm = document.querySelector("#loginForm");
const usernameInput = document.querySelector("#usernameInput");
const loginStatus = document.querySelector("#loginStatus");
const loginBtn = document.querySelector("#loginBtn");

// ---------- Utils ----------
function isValidUsername(u) {
  return /^[a-z0-9._-]+$/.test(u);
}

// ---------- Login Flow ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = (usernameInput.value || "").trim().toLowerCase();

  if (!username || !isValidUsername(username)) {
    loginStatus.hidden = false;
    loginStatus.textContent = "שם משתמש לא חוקי (מותר: a-z, 0-9, ., _, -)";
    return;
  }

  loginStatus.hidden = false;
  loginStatus.textContent = "Connecting…";
  loginBtn.disabled = true;

  try {
    // בקשת customToken מהשרת שלך
    const res = await fetch("/api/createCustomToken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Server error: ${t}`);
    }

    const { customToken } = await res.json();
    if (!customToken) throw new Error("Missing customToken");

    // התחברות עם הטוקן
    const cred = await signInWithCustomToken(auth, customToken);

    // עדכון state ל-App שלך
    const email = `${username}@family.local`;
    state.username = username;
    state.emailAddress = email;
    state.userId = cred.user.uid;
    state.currentView = "mailbox";
    state.idToken = await cred.user.getIdToken(true);

    loginStatus.hidden = true;

    // תפעול מסכים/סינכרון
    startRealtimeSubscriptions?.();
    render?.();
  } catch (err) {
    console.error("Login error:", err);
    loginStatus.hidden = false;
    loginStatus.textContent = "Login failed: " + (err.message || err.code || "Unknown error");
  } finally {
    loginBtn.disabled = false;
  }
});
