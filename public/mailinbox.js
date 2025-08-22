// mailinbox.js (ESM, Vanilla JS)
// -----------------------------------------------------------
// תלות: Firebase v10 ESM מה-CDN (נטען ב-index.html) + fetch
// -----------------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithCustomToken, onAuthStateChanged,signInWithEmailAndPassword,  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, collection, addDoc, onSnapshot, query, where, serverTimestamp,
          setDoc, deleteDoc, getDoc, orderBy } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// -------------------- שפה / טקסטים --------------------
const lang = {
  he: {
    appName: 'דוא"ל פנימי',
    loginWelcome: "ברוכים הבאים",
    loginMessage: "הכנס שם משתמש כדי לנהל את תיבת הדואר המשפחתית שלך.",
    usernameLabel: "שם משתמש",
    usernamePlaceholder: "לדוגמה: יונתן",
    loginButton: "התחבר",
    loginStatusConnecting: "מתחבר...",
    loginError: "שגיאה בהתחברות. אנא נסה שוב.",
    sidebarWelcome: "ברוך הבא, ",
    yourEmail: "כתובת המייל שלך:",
    userId: "מזהה משתמש:",
    newEmailButton: "הודעה חדשה",
    inboxFolder: "דואר נכנס",
    sentFolder: "נשלח",
    trashFolder: "אשפה",
    spamFolder: "זבל",
    contacts: "אנשי קשר",
    searchPlaceholder: "חיפוש מיילים...",
    noEmailsFound: "לא נמצאו הודעות תואמות.",
    emailSubjectPlaceholder: "(ללא נושא)",
    composeTitle: "אימייל חדש",
    recipientLabel: "אל",
    composeBack: "חזרה לתיבת הדואר",
    subjectLabel: "נושא",
    bodyLabel: "הודעה",
    sendButton: "שלח",
    sendSuccess: "ההודעה נשלחה בהצלחה!",
    sendError: "שגיאה בשליחת ההודעה. אנא נסה שוב.",
    composeGeminiTitle: "צור טיוטה בעזרת Gemini AI",
    geminiPlaceholder: "לדוגמה: כתוב מייל קצר כדי להתנצל על איחור.",
    geminiButton: "צור טיוטה",
    geminiError: "אירעה שגיאה. אנא נסה שוב מאוחר יותר.",
    emailFrom: "מאת:",
    emailTo: "אל:",
    emailReply: "השב",
    emailBack: "חזרה",
    loading: "טוען...",
    noMessagesInFolder: "אין הודעות בתיקיה זו.",
    attachmentsLabel: "צירוף קבצים",
    noFileSelected: "לא נבחר קובץ.",
    attachment: "קובץ מצורף:",
    download: "הורד",
    downloadNotSupported: "הערה: הורדת קבצים לא נתמכת בפלטפורמה זו.",
    richTextNote: "הטקסט נשלח כ-HTML כדי לשמור על העיצוב.",
    editorToolbar: "סרגל עריכת טקסט",
    contactsTitle: "אנשי קשר",
    newContactButton: "הוסף איש קשר",
    addContactTitle: "הוספת איש קשר",
    contactNameLabel: "שם",
    contactNamePlaceholder: "שם מלא או כינוי",
    contactUsernameLabel: "שם משתמש",
    addContactButton: "הוסף",
    contactAdded: "איש קשר נוסף בהצלחה!",
    noContacts: "לא נמצאו אנשי קשר.",
    selectContact: "בחר איש קשר",
    contactUsernamePlaceholder: "שם משתמש בלבד",
    deleteContactConfirm: "האם אתה בטוח שברצונך למחוק איש קשר זה?",
    contactsBack: "חזרה לדואר",
    summarizeButton: "סכם הודעה",
    summarizing: "מסכם...",
    summaryError: "שגיאה בסיכום ההודעה.",
    suggestRepliesButton: "הצע תשובות",
    suggestingReplies: "מחפש תשובות...",
    readEmailButton: "הקרא הודעה",
    readingEmail: "מקריא...",
    readingStopped: "ההקראה הופסקה.",
    readEmailStopButton: "עצור הקראה"
  },
  en: {
    appName: "Internal Mail",
    loginWelcome: "Welcome",
    loginMessage: "Enter a username to manage your family's mailbox.",
    usernameLabel: "Username",
    usernamePlaceholder: "e.g., Jonathan",
    loginButton: "Login",
    loginStatusConnecting: "Connecting...",
    loginError: "Login error. Please try again.",
    sidebarWelcome: "Welcome, ",
    yourEmail: "Your email address:",
    userId: "User ID:",
    newEmailButton: "New Message",
    inboxFolder: "Inbox",
    sentFolder: "Sent",
    trashFolder: "Trash",
    spamFolder: "Spam",
    contacts: "Contacts",
    searchPlaceholder: "Search emails...",
    noEmailsFound: "No matching messages found.",
    emailSubjectPlaceholder: "(No Subject)",
    composeTitle: "New Email",
    recipientLabel: "To",
    composeBack: "Back to Mailbox",
    subjectLabel: "Subject",
    bodyLabel: "Message",
    sendButton: "Send",
    sendSuccess: "Message sent successfully!",
    sendError: "Error sending message. Please try again.",
    composeGeminiTitle: "Draft with Gemini AI",
    geminiPlaceholder: "e.g., Write a short email to apologize for being late.",
    geminiButton: "Draft",
    geminiError: "An error occurred. Please try again later.",
    emailFrom: "From:",
    emailTo: "To:",
    emailReply: "Reply",
    emailBack: "Back",
    loading: "Loading...",
    noMessagesInFolder: "No messages in this folder.",
    attachmentsLabel: "Attach Files",
    noFileSelected: "No file selected.",
    attachment: "Attachment:",
    download: "Download",
    downloadNotSupported: "Note: File downloads are not supported on this platform.",
    richTextNote: "The text is sent as HTML to preserve formatting.",
    editorToolbar: "Text Editor Toolbar",
    contactsTitle: "Contacts",
    newContactButton: "Add Contact",
    addContactTitle: "Add Contact",
    contactNameLabel: "Name",
    contactNamePlaceholder: "Full name or nickname",
    contactUsernameLabel: "Username",
    addContactButton: "Add",
    contactAdded: "Contact added successfully!",
    noContacts: "No contacts found.",
    selectContact: "Select a contact",
    contactUsernamePlaceholder: "username only",
    deleteContactConfirm: "Are you sure you want to delete this contact?",
    contactsBack: "Back to mail",
    summarizeButton: "Summarize Email",
    summarizing: "Summarizing...",
    summaryError: "Error summarizing email.",
    suggestRepliesButton: "Suggest Replies",
    suggestingReplies: "Suggesting replies...",
    readEmailButton: "Read Email",
    readingEmail: "Reading...",
    readingStopped: "Reading stopped.",
    readEmailStopButton: "Stop Reading"
  }
};

// -------------------- מצב גלובלי --------------------
const state = {
  language: "he",
  t: lang["he"],
  username: "",
  emailAddress: "",
  userId: null,
  isAuthReady: false,
  currentView: "login",    // login | mailbox
  currentFolder: "inbox",  // inbox | sent | trash | spam
  selectedEmail: null,
  inboxEmails: [],
  sentEmails: [],
  searchQuery: "",
  compose: { recipient: "", subject: "", body: "" },
  attachments: null,
  contacts: [],
  newContact: { name: "", username: "" },
  // Gemini
  geminiDraftPrompt: "",
  isGeminiLoading: false,
  isGeminiError: false,
  summary: null,
  isSummarizing: false,
  suggestedReplies: [],
  isSuggestingReplies: false,
  // TTS
  isTTSLoading: false,
  isReading: false,
  audioEl: null
};
// -------------------- Firebase Init --------------------
const firebaseConfig = window.__firebase_config || {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// -------------------- Firestore dev helpers --------------------
async function testFirestoreConnection() {
  try {
    console.log("Testing Firestore connection...");
    const testDocRef = doc(db, "testCollection", "testDoc");
    const docSnap = await getDoc(testDocRef);

    if (docSnap.exists()) {
      console.log("✅ Firestore connection OK. Test doc data:", docSnap.data());
    } else {
      console.log("⚠️ Firestore connection OK, but test doc does not exist.");
    }
  } catch (error) {
    console.error("❌ Firestore connection failed:", error);
  }
}

async function createTestDoc() {
  try {
    const testDocRef = doc(db, "testCollection", "testDoc");
    await setDoc(testDocRef, { hello: "world", timestamp: new Date() });
    console.log("✅ Test doc created!");
  } catch (error) {
    console.error("❌ Failed to create test doc:", error);
  }
}

// -------------------- גלובלי למיילים --------------------
let unsubscribeMails = null;

// -------------------- Auth listeners --------------------
onAuthStateChanged(auth, async (user) => {
  state.isAuthReady = true;
  state.userId = user ? user.uid : null;

  if (user) {
    console.log("User logged in:", user.uid);

    // מאזינים לריל־טיים
    startRealtimeSubscriptions();
    startMailboxListener(user.uid);

    // בדיקות חיבור Firestore - להריץ רק ב-localhost
    if (window.location.hostname === "localhost") {
      try {
        await createTestDoc();
        await testFirestoreConnection();
      } catch (err) {
        console.error("Dev test failed:", err);
      }
    }

  } else {
    console.log("User not logged in");
    state.currentView = "login";
    // אם יש לך פונקציה שמציגה מסך התחברות – תקרא לה כאן
    if (typeof showLoginView === "function") {
      showLoginView();
    }
  }
});

// -------------------- Listener לדואר --------------------
// -------------------- Listener לדואר --------------------
// כאן לא עושים let שוב, כי כבר מוגדר למעלה
unsubscribeMails = null;

function startMailboxListener(userId) {
  const mailRef = collection(db, "mails");
  const q = query(mailRef, where("recipientId", "==", userId), orderBy("timestamp", "desc"));

  unsubscribeMails = onSnapshot(
    q,
    (snapshot) => {
      const container = document.getElementById("mailContainer");
      if (!container) return;

      container.innerHTML = ""; // נקה לפני הצגת עדכון חדש
      snapshot.forEach((doc) => {
        const mail = doc.data();
        const mailDiv = document.createElement("div");
        mailDiv.classList.add("mail-item");
        mailDiv.innerHTML = `
          <strong>From:</strong> ${escapeHtml(mail.sender)}<br>
          <strong>Subject:</strong> ${escapeHtml(mail.subject)}<br>
          <p>${escapeHtml(mail.body)}</p>
          <hr>
        `;
        container.appendChild(mailDiv);
      });
    },
    (error) => {
      console.error("Error listening to mailbox:", error);
    }
  );
}

// escapeHtml למניעת XSS
function escapeHtml(s = "") {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// Listener לכפתור שליחה
const btnSend = document.getElementById("btnSend");
if (btnSend) {
  btnSend.addEventListener("click", async () => {
    // קוד לשליחת מייל
  });
} else {
  console.warn("btnSend not found yet!");
}



// -------------------- Utility --------------------
function showStatus(msg, opts = {}) {
  if (!msg) {
    globalStatus.hidden = true;
    globalStatus.textContent = "";
    return;
  }
  globalStatus.textContent = msg;
  globalStatus.hidden = false;
  if (opts.autoHide) setTimeout(() => showStatus(""), opts.autoHide);
}

function fmtDate(tsSeconds, locale) {
  if (!tsSeconds) return "";
  return new Date(tsSeconds * 1000).toLocaleString(locale, { dateStyle:"short", timeStyle:"short" });
}

// הגדרה רק אם לא קיים כבר
if (typeof escapeHtml === "undefined") {
  function escapeHtml(s = "") {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }
}

// -------------------- DOM Helpers --------------------
document.addEventListener("DOMContentLoaded", () => {
  // -------------------- DOM Helpers --------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const elApp = $("#app");
  const viewLogin = $("#view-login");
  const viewMailbox = $("#view-mailbox");
  const mainContent = $("#mainContent");
  const globalStatus = $("#globalStatus");

  // חשיפה ל־window כדי שיהיה גלובלי
  window.$ = $;
  window.$$ = $$;
  window.elApp = elApp;
  window.viewLogin = viewLogin;
  window.viewMailbox = viewMailbox;
  window.mainContent = mainContent;
  window.globalStatus = globalStatus;

  // -------------------- Rendering --------------------
  function render() {
    const usernameInput = $("#usernameInput");
    const loginFormLabel = $("#loginForm .label");
    const loginBtn = $("#loginBtn");
    const sidebarUsername = $("#sidebarUsername");
    const sidebarEmail = $("#sidebarEmail");
    const sidebarUid = $("#sidebarUid");

    if (state.currentView === "login") {
      if (viewLogin) viewLogin.hidden = false;
      if (viewMailbox) viewMailbox.hidden = true;

      if (loginFormLabel) loginFormLabel.textContent = state.t.usernameLabel;
      if (usernameInput) usernameInput.placeholder = state.t.usernamePlaceholder;
      if (loginBtn) loginBtn.textContent = state.t.loginButton;

    } else {
      if (viewLogin) viewLogin.hidden = true;
      if (viewMailbox) viewMailbox.hidden = false;

      if (sidebarUsername) sidebarUsername.textContent = state.username || "";
      if (sidebarEmail) sidebarEmail.textContent = state.emailAddress || "";
      if (sidebarUid) sidebarUid.textContent = state.userId || "";

      $$(".nav-btn").forEach(btn => {
        const f = btn.getAttribute("data-folder");
        if (!f) {
          btn.classList.toggle("active", state.currentView === "contacts");
          return;
        }
        btn.classList.toggle("active", state.currentFolder === f);
      });

      renderMain();
    }
  }

  // -------------------- Render Main --------------------
  function renderMain() {
    if (state.currentView !== "mailbox") return;
    if (state.selectedEmail) return renderEmailView();

    switch (state.currentFolder) {
      case "inbox": return renderEmailList(state.inboxEmails, "inbox");
      case "sent": return renderEmailList(state.sentEmails, "sent");
      case "trash": return renderEmailList([], "trash");
      case "spam": return renderEmailList([], "spam");
    }

    if (state.currentView === "contacts") return renderContactsView();
    if (state.showCompose) return renderCompose();
  }

  // קריאה ראשונית ל-render אחרי טעינת DOM
  render();
});



// -------------------- i18n / שפה --------------------
const languageToggleBtn = document.querySelector("#languageToggle");

languageToggleBtn.addEventListener("click", () => {
  state.language = state.language === "he" ? "en" : "he";
  state.t = lang[state.language];
  document.documentElement.dir = state.language === "he" ? "rtl" : "ltr";
  render(); // אם יש לך פונקציה כזו שמרנדרת את המסך
});


// -------------------- Login --------------------
const loginForm = document.querySelector("#loginForm");
const usernameInput = document.querySelector("#usernameInput");
const loginStatus = document.querySelector("#loginStatus");
const loginBtn = document.querySelector("#loginBtn");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  if (!username) return;

  loginStatus.hidden = false;
  loginStatus.textContent = "Connecting...";
  loginBtn.disabled = true;

  try {
    const email = `${username}@family.local`;
    const password = "defaultPassword"; // סיסמת ברירת מחדל לכולם

    let userCredential;
    try {
      // מנסה להתחבר אם המשתמש כבר קיים
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        // אם המשתמש לא קיים – צור אותו
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        throw err;
      }
    }

    // מזהה המשתמש
    const uid = userCredential.user.uid;

    // בדיקה אם המשתמש כבר קיים ב-Firestore
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // אם זה כניסה ראשונה – צור רשומה ב-Firestore
      await setDoc(userRef, {
        username: username,
        email: email,
        createdAt: Date.now()
      });
    }

    // קבלת טוקן
    const idToken = await userCredential.user.getIdToken(true);

    // עדכון state
    state.username = username;
    state.emailAddress = email;
    state.userId = uid;
    state.currentView = "mailbox";
    state.idToken = idToken;

    loginStatus.hidden = true;

    // חיבור ל-Firestore
    startRealtimeSubscriptions();
    render();
  } catch (err) {
    console.error("Login error:", err);
    loginStatus.textContent = "Login failed: " + err.message;
  } finally {
    loginBtn.disabled = false;
  }
});




// -------------------- Attach Event Listeners with File Upload (Safe Version) --------------------
function attachListeners() {
  const btnSend = document.getElementById("btnSend");
  const composeForm = document.getElementById("composeForm");

  if (!btnSend || !composeForm) {
    console.warn("attachListeners: btnSend or composeForm not found!");
    return;
  }

  // מניעת רישום כפול של מאזינים
  if (btnSend.dataset.listenerAttached === "true") {
    console.log("attachListeners: listener already attached to btnSend");
    return;
  }
  btnSend.dataset.listenerAttached = "true";

  btnSend.addEventListener("click", async (e) => {
    e.preventDefault();

    const { recipient, subject, body } = state.compose || {};
    const attachments = state.attachments || [];

    if (!recipient || !body) {
      alert("Recipient and body are required");
      return;
    }

    try {
      // בדיקה אם הנמען קיים ב-Firestore
      const recipientRef = doc(db, "users", recipient); // recipient = username
      const recipientSnap = await getDoc(recipientRef);

      if (!recipientSnap.exists()) {
        alert(`Recipient "${recipient}" does not exist`);
        return; // ביטול שליחה אם הנמען לא קיים
      }

      const uploadedFiles = [];

      // בדיקה שה-storage מוגדר
      if (!window.storage) {
        console.error("Firebase Storage not initialized!");
        alert("Storage not available");
        return;
      }

      // העלאה של קבצים אם קיימים
      for (const file of attachments) {
        if (!file) continue;
        const storageRef = ref(
          storage,
          `emails/${state.userId || "unknownUser"}/${Date.now()}_${file.name}`
        );
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedFiles.push({
          name: file.name,
          size: file.size,
          type: file.type || null,
          url
        });
      }

      // הכנת אובייקט הודעה
      const emailDataForSender = {
        sender: state.emailAddress || "unknown@family.local",
        recipient: `${recipient}@family.local`,
        subject: subject || "No Subject",
        body,
        timestamp: serverTimestamp(),
        attachments: uploadedFiles.length > 0 ? uploadedFiles : null
      };

      // עבור הנמען נוסיף read:false
      const emailDataForRecipient = {
        ...emailDataForSender,
        read: false
      };

      // שמירה אצל השולח
      const senderEmailCollection = collection(db, `users/${state.userId}/emails`);
      await addDoc(senderEmailCollection, emailDataForSender);

      // שמירה אצל הנמען עם read:false
      const recipientEmailCollection = collection(db, `users/${recipient}/emails`);
      await addDoc(recipientEmailCollection, emailDataForRecipient);

      alert("Email sent successfully!");

      // איפוס השדות אחרי שליחה
      state.compose = { recipient: "", subject: "", body: "" };
      state.attachments = [];
      const inputs = composeForm.querySelectorAll("input, textarea");
      inputs.forEach(input => (input.value = ""));
      
    } catch (err) {
      console.error("Failed to send email:", err);
      alert("Failed to send email. Please try again.");
    }
  });
}

// לוודא שהפונקציה תרוץ רק אחרי שה־DOM נטען
document.addEventListener("DOMContentLoaded", attachListeners);
// -------------------- Mark Email as Read --------------------
async function markEmailAsRead(emailId) {
  try {
    if (!state.userId) return;
    const emailRef = doc(db, `users/${state.userId}/emails`, emailId);
    await setDoc(emailRef, { read: true }, { merge: true }); // merge:true משאיר שדות אחרים
    console.log(`Email ${emailId} marked as read`);
  } catch (err) {
    console.error("Failed to mark email as read:", err);
  }
}

// -------------------- Example: when opening email --------------------
function openEmail(emailDoc) {
  // הצגת תוכן ההודעה ל-UI
  displayEmailContent(emailDoc.data());

  // עדכון read:true אצל הנמען
  if (emailDoc.data().recipient === state.emailAddress) {
    markEmailAsRead(emailDoc.id);
  }
}


// -------------------- Firestore subscriptions --------------------
let unsubscribeInbox = null;
let unsubscribeSent = null;
let unsubscribeContacts = null;

function startRealtimeSubscriptions() {
  stopRealtimeSubscriptions();
  if (!state.userId || !state.emailAddress) return;

  const appId = "1:199399854104:web:6aec488e6aeee0dec3736d";

  // Inbox
  const inboxQ = query(
    collection(db, `artifacts/${appId}/public/data/emails`),
    where("recipient", "==", state.emailAddress),
    orderBy("timestamp", "desc")
  );

  unsubscribeInbox = onSnapshot(inboxQ, (snap) => {
    state.inboxEmails = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (state.currentView === "mailbox" && state.currentFolder === "inbox" && !state.selectedEmail) renderMain();
  });

  // Sent
  const sentQ = query(
    collection(db, `artifacts/${appId}/public/data/emails`),
    where("sender", "==", state.emailAddress),
    orderBy("timestamp", "desc")
  );
  unsubscribeSent = onSnapshot(sentQ, (snap) => {
    state.sentEmails = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (state.currentView === "mailbox" && state.currentFolder === "sent" && !state.selectedEmail) renderMain();
  });

  // Contacts
  const contactsCol = collection(db, `artifacts/${appId}/users/${state.userId}/contacts`);
  unsubscribeContacts = onSnapshot(contactsCol, (snap) => {
    state.contacts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (state.currentView === "mailbox") renderMain();
  });
}

function stopRealtimeSubscriptions() {
  if (unsubscribeInbox) { unsubscribeInbox(); unsubscribeInbox = null; }
  if (unsubscribeSent) { unsubscribeSent(); unsubscribeSent = null; }
  if (unsubscribeContacts) { unsubscribeContacts(); unsubscribeContacts = null; }
}

// -------------------- Attachments --------------------
const dropZone = document.getElementById("dropZone");
const attachmentInput = document.getElementById("attachmentInput");
const attachmentList = document.getElementById("attachmentList");

state.attachments = [];

// בדיקה לפני הוספת מאזינים
if (dropZone && attachmentInput && attachmentList) {

  // פתיחת קובץ בלחיצה על ה-dropZone
  dropZone.addEventListener("click", () => attachmentInput.click());

  // טיפול בקבצים שנבחרו ידנית
  attachmentInput.addEventListener("change", (e) => handleFiles(e.target.files));

  // טיפול בקבצים שנגררו
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  });
}

// פונקציה לעיבוד קבצים והוספתם ל-state + UI
function handleFiles(files) {
  const newFiles = Array.from(files);
  state.attachments.push(...newFiles);
  renderAttachmentList();
}

// הצגת רשימת קבצים עם אייקונים וכפתור הסרה
function getFileIcon(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif'].includes(ext)) return '🖼️';
  if (['pdf'].includes(ext)) return '📄';
  if (['doc','docx'].includes(ext)) return '📝';
  if (['zip','rar'].includes(ext)) return '🗜️';
  return '📎';
}

function renderAttachmentList() {
  if (!attachmentList) return;
  attachmentList.innerHTML = "";
  state.attachments.forEach((file, index) => {
    const li = document.createElement("li");
    li.innerHTML = `${getFileIcon(file)} ${file.name} (${Math.round(file.size / 1024)} KB)`;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.type = "button";
    removeBtn.addEventListener("click", () => {
      state.attachments.splice(index, 1);
      renderAttachmentList();
    });

    li.appendChild(removeBtn);
    attachmentList.appendChild(li);
  });
}

// -------------------- Compose Inputs --------------------
const recipientInput = document.getElementById("recipientInput");
const subjectInput = document.getElementById("subjectInput");
const bodyInput = document.getElementById("bodyInput");

if (recipientInput) recipientInput.addEventListener("input", (e) => state.compose.recipient = e.target.value);
if (subjectInput) subjectInput.addEventListener("input", (e) => state.compose.subject = e.target.value);
if (bodyInput) bodyInput.addEventListener("input", (e) => state.compose.body = e.target.value);

// -------------------- Compose / Send --------------------
attachListeners(); // ודא שפונקציה זו קיימת

// -------------------- Helpers --------------------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
// -------------------- Sidebar / Navigation --------------------
const btnCompose = document.getElementById("btnCompose");
const btnContacts = document.getElementById("btnContacts");

if (btnCompose) {
  btnCompose.addEventListener("click", () => {
    state.showCompose = true;
    state.selectedEmail = null;
    if (mainContent) mainContent.scrollTop = 0;
    renderCompose();
  });
}

if (btnContacts) {
  btnContacts.addEventListener("click", () => {
    state.currentView = "mailbox";
    state.selectedEmail = null;
    state.showCompose = false;
    state.currentFolder = "inbox";
    renderContactsView();
  });
}

$$(".nav-btn[data-folder]").forEach(btn => {
  btn.addEventListener("click", () => {
    state.currentFolder = btn.getAttribute("data-folder");
    state.selectedEmail = null;
    state.showCompose = false;
    renderMain();
  });
});

 // -------------------- Gemini Draft --------------------
const btnGemini = document.getElementById("btnGemini");
const promptInput = document.getElementById("geminiPrompt");

if (btnGemini && promptInput) {
  btnGemini.addEventListener("click", async () => {
    if (!state.userId) {
      alert("You must be logged in to use Gemini");
      return;
    }

    state.geminiDraftPrompt = promptInput.value.trim();
    if (!state.geminiDraftPrompt) return;

    if (typeof handleGeminiGenerate === "function") {
      await handleGeminiGenerate(editor); // פונקציה שלך לטיוטת Gemini
    }
  });
}

// -------------------- Contacts View --------------------
function renderContactsView() {
  const t = state.t;
  const appId = "1:199399854104:web:6aec488e6aeee0dec3736d"; // הוספנו את ההגדרה

  mainContent.innerHTML = `
    <div class="section">
      <div class="row right">
        <button id="btnBackMail" class="btn">🏠 ${t.contactsBack}</button>
      </div>
      <h2>${t.contactsTitle}</h2>

      <div class="section">
        <h3 style="margin:0 0 8px 0">${t.addContactTitle}</h3>
        <div class="col">
          <label class="label">${t.contactNameLabel}</label>
          <input id="contactName" class="input" placeholder="${t.contactNamePlaceholder}" />
        </div>
        <div class="col" style="margin-top:8px">
          <label class="label">${t.contactUsernameLabel}</label>
          <div class="row">
            <input id="contactUsername" class="input" placeholder="${t.contactUsernamePlaceholder}" />
            <span class="badge">@family.local</span>
          </div>
        </div>
        <div class="row right" style="margin-top:8px">
          <button id="btnAddContact" class="btn green">${t.addContactButton}</button>
        </div>
        <div id="contactStatus" class="form-status" hidden></div>
      </div>

      <div class="section" style="margin-top:12px">
        <h3 style="margin:0 0 8px 0">${t.contactsTitle}</h3>
        <div id="contactsList" class="list"></div>
      </div>
    </div>
  `;

  const btnBackMail = document.getElementById("btnBackMail");
  if (btnBackMail) {
    btnBackMail.addEventListener("click", () => {
      state.currentFolder = "inbox";
      renderMain();
    });
  }

  const btnAddContact = document.getElementById("btnAddContact");
  if (btnAddContact) {
    btnAddContact.addEventListener("click", handleAddContact);
  }

  const list = document.getElementById("contactsList");
  if (!list) return;

  list.innerHTML = "";

  if (!state.contacts || !state.contacts.length) {
    list.innerHTML = `<div class="muted center" style="padding:20px">${t.noContacts}</div>`;
  } else {
    for (const c of state.contacts) {
      const row = document.createElement("div");
      row.className = "mail-item";

      row.innerHTML = `
        <div class="row" style="justify-content:space-between">
          <div>
            <div class="k">${escapeHtml(c.name || "")}</div>
            <div class="tiny muted">${escapeHtml(c.username || "")}@family.local</div>
          </div>
          <button class="btn" data-id="${c.id}">🗑️</button>
        </div>
      `;

      const btnDelete = row.querySelector("button");
      if (btnDelete) {
        btnDelete.addEventListener("click", async () => {
          if (!confirm(state.t.deleteContactConfirm)) return;
          try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${state.userId}/contacts`, c.id));
            state.contacts = state.contacts.filter(contact => contact.id !== c.id);
            row.remove();
          } catch (e) {
            console.error("Delete contact error:", e);
            alert("Failed to delete contact. Please try again.");
          }
        });
      }

      list.appendChild(row);
    }
  }

  // Contact suggestions
  const recipientInput = document.getElementById("recipientInput");
  const contactSuggestions = document.getElementById("contactSuggestions");

  if (recipientInput && contactSuggestions) {
    function showContactSuggestions(value) {
      contactSuggestions.innerHTML = "";
      if (!value) {
        contactSuggestions.style.display = "none";
        return;
      }

      const filtered = state.contacts.filter(c =>
        c.name.toLowerCase().includes(value.toLowerCase()) ||
        c.username.toLowerCase().includes(value.toLowerCase())
      );

      filtered.forEach(c => {
        const div = document.createElement("div");
        div.textContent = `${c.name} (${c.username}@family.local)`;
        div.addEventListener("click", () => {
          recipientInput.value = c.username;
          contactSuggestions.style.display = "none";
        });
        contactSuggestions.appendChild(div);
      });

      contactSuggestions.style.display = filtered.length ? "block" : "none";
    }

    recipientInput.addEventListener("input", (e) => showContactSuggestions(e.target.value));

    document.addEventListener("click", (e) => {
      if (!recipientInput.contains(e.target) && !contactSuggestions.contains(e.target)) {
        contactSuggestions.style.display = "none";
      }
    });

    recipientInput.addEventListener("dragover", (e) => e.preventDefault());
    recipientInput.addEventListener("drop", (e) => {
      e.preventDefault();
      const droppedName = e.dataTransfer.getData("text/plain");
      const contact = state.contacts.find(c => c.name === droppedName);
      if (contact) recipientInput.value = contact.username;
    });
  }

  // Drag & Drop from list
  if (list) {
    list.querySelectorAll(".mail-item").forEach(item => {
      item.draggable = true;
      item.addEventListener("dragstart", (e) => {
        const kElem = item.querySelector(".k");
        if (kElem) e.dataTransfer.setData("text/plain", kElem.textContent);
      });
    });
  }
}


// -------------------- Actions --------------------
async function handleSendEmail() {
  const t = state.t;
  const composeStatus = $("#composeStatus");
  composeStatus.hidden = true;

  // attachments כ-array
  const attachmentsData = state.attachments && state.attachments.length
    ? state.attachments.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type
      }))
    : null;

  const newEmail = {
    sender: state.emailAddress,
    recipient: (state.compose.recipient || "").trim() + "@family.local",
    subject: (state.compose.subject || "").trim() || t.emailSubjectPlaceholder,
    body: state.compose.body || "",
    timestamp: serverTimestamp(),
    attachment: attachmentsData
  };

  try {
    await addDoc(collection(db, `artifacts/${appId}/public/data/emails`), newEmail);
    composeStatus.textContent = t.sendSuccess;
    composeStatus.hidden = false;

    // איפוס compose ו־attachments
    state.compose = { recipient: "", subject: "", body: "" };
    state.attachments = [];

    // חזרה לתיבה אחרי רגע
    setTimeout(() => {
      state.showCompose = false;
      renderMain();
    }, 800);
  } catch (err) {
    console.error("Send email error:", err);
    composeStatus.textContent = t.sendError;
    composeStatus.hidden = false;
  }
}

async function handleAddContact() {
  const t = state.t;
  const name = $("#contactName").value.trim();
  const username = $("#contactUsername").value.trim();
  const status = $("#contactStatus");
  status.hidden = true;

  if (!state.userId) { 
    alert("You must be logged in to add contacts");
    return;
  }

  if (!name || !username) return;

  try {
    const id = crypto.randomUUID();
    const ref = doc(db, `artifacts/${appId}/users/${state.userId}/contacts`, id);
    await setDoc(ref, { name, username });
    status.textContent = t.contactAdded;
    status.hidden = false;
    setTimeout(() => status.hidden = true, 1500);

    // טופס נקי
    $("#contactName").value = "";
    $("#contactUsername").value = "";
  } catch (e) {
    console.error("Add contact error:", e);
    status.textContent = "אירעה שגיאה בהוספת איש הקשר.";
    status.hidden = false;
    setTimeout(() => status.hidden = true, 1500);
  }
}

// -------------------- Gemini (Draft / Summarize / Replies / TTS) --------------------
const GEMINI_API_KEY = ""; // ← הכנס כאן את המפתח שלך

async function geminiFetch(url, payload) {
  const res = await fetch(`${url}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  return res.json();
}

async function handleGeminiGenerate(editorEl) {
  if (!GEMINI_API_KEY) { alert("חסר GEMINI_API_KEY ב-app.js"); return; }
  if (!editorEl) return;

  const t = state.t;
  const errEl = $("#geminiError");
  errEl.hidden = true;

  try {
    const payload = {
      contents: [{ role: "user", parts: [{ text: state.geminiDraftPrompt }] }]
    };
    const data = await geminiFetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent",
      payload
    );
    const generated = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (generated) {
      const html = generated.replace(/\n/g, "<br/>");
      editorEl.innerHTML = html;
      state.compose.body = html;
    } else {
      errEl.textContent = t.geminiError;
      errEl.hidden = false;
    }
  } catch (e) {
    console.error("Gemini draft error:", e);
    errEl.textContent = t.geminiError;
    errEl.hidden = false;
  }
}

// -------------------- Helpers --------------------
if (typeof window.escapeHtml !== "function") {
  window.escapeHtml = function (text = "") {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  };
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
}

function pcmToWav(pcmData, sampleRate) {
  const buffer = new ArrayBuffer(44 + pcmData.length * 2);
  const view = new DataView(buffer);
  let o = 0;
  view.setUint32(o, 0x52494646, false); o += 4; // RIFF
  view.setUint32(o, 36 + pcmData.length * 2, true); o += 4;
  view.setUint32(o, 0x57415645, false); o += 4; // WAVE
  view.setUint32(o, 0x666d7420, false); o += 4; // fmt
  view.setUint32(o, 16, true); o += 4;
  view.setUint16(o, 1, true); o += 2;          // PCM
  view.setUint16(o, 1, true); o += 2;          // channels
  view.setUint32(o, sampleRate, true); o += 4;
  view.setUint32(o, sampleRate * 2, true); o += 4; // byte rate
  view.setUint16(o, 2, true); o += 2;           // block align
  view.setUint16(o, 16, true); o += 2;          // bits per sample
  view.setUint32(o, 0x64617461, false); o += 4; // data
  view.setUint32(o, pcmData.length * 2, true); o += 4;
  for (let i = 0; i < pcmData.length; i++, o += 2) view.setInt16(o, pcmData[i], true);
  return new Blob([view], { type: "audio/wav" });
}


// -------------------- AI Outputs Update --------------------
function updateAiOutputs() {
  const wrap = $("#aiOutputs");
  if (!wrap) return;
  const t = state.t;
  const parts = [];

  if (state.isSummarizing) parts.push(`<div class="muted">${t.summarizing}</div>`);
  if (state.summary) {
    parts.push(`<div class="section"><div class="k">${t.summarizeButton}:</div><div style="margin-top:6px">${escapeHtml(state.summary)}</div></div>`);
  }

  if (state.isSuggestingReplies) parts.push(`<div class="muted">${t.suggestingReplies}</div>`);
  if (state.suggestedReplies.length) {
    const chips = state.suggestedReplies
      .map(r => `<button class="btn" data-reply="${escapeHtml(r)}">${escapeHtml(r)}</button>`)
      .join(" ");
    parts.push(`<div class="section"><div class="k">${t.suggestRepliesButton}:</div><div class="flex" style="margin-top:6px">${chips}</div></div>`);
  }

  if (state.isTTSLoading) parts.push(`<div class="muted">${t.readingEmail}</div>`);
  if (state.isReading) parts.push(`<div class="badge">${t.readEmailStopButton}</div>`);

  wrap.innerHTML = parts.join("") || "";

  // Remove old listeners to avoid duplicates
  $$('button[data-reply]', wrap).forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.replaceWith(newBtn);
  });

  // click suggested replies => open compose
  $$('button[data-reply]', wrap).forEach(btn => {
    btn.addEventListener("click", () => {
      const reply = btn.getAttribute("data-reply") || "";
      const e = state.selectedEmail;
      if (!e) return;
      state.showCompose = true;
      state.compose = {
        recipient: (e.sender || "").split("@")[0],
        subject: `Re: ${e.subject || ""}`,
        body: escapeHtml(reply)
      };
      renderCompose();
      const ed = $("#richEditor");
      if (ed) { ed.innerHTML = reply; state.compose.body = reply; }
    });
  });
}

// -------------------- Summarize Email --------------------
async function handleSummarizeEmail() {
  const e = state.selectedEmail;
  if (!e) return;

  state.isSummarizing = true;
  updateAiOutputs();

  const prompt = `Summarize the following email in a brief, concise paragraph. Subject: "${e.subject}". Body: "${(e.body || "").replace(/<[^>]*>?/gm,"")}"`;

  try {
    let summary = "";
    if (GEMINI_API_KEY) {
      const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
      const data = await geminiFetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent",
        payload
      );
      summary = data?.candidates?.[0]?.content?.parts?.[0]?.text || state.t.summaryError;
    } else {
      summary = await fakeAISummarize(e.body);
    }
    state.summary = summary;
  } catch (err) {
    console.error(err);
    state.summary = state.t.summaryError;
  } finally {
    state.isSummarizing = false;
    updateAiOutputs();
  }
}

// -------------------- Suggest Replies --------------------
async function handleSuggestReplies() {
  const e = state.selectedEmail;
  if (!e) return;
  state.isSuggestingReplies = true;
  state.suggestedReplies = [];

  const prompt = `Given the email with subject "${e.subject}" and body "${(e.body||"").replace(/<[^>]*>?/gm,"")}", suggest three very short replies as a JSON array of strings.`;

  try {
    let arr = [];
    if (GEMINI_API_KEY) {
      const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: { type: "ARRAY", items: { type: "STRING" } }
        }
      };
      const data = await geminiFetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent",
        payload
      );
      const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      arr = JSON.parse(jsonText || "[]");
    } else {
      arr = await fakeAISuggestReplies(e.body);
    }
    state.suggestedReplies = Array.isArray(arr) ? arr : [];
  } catch (err) {
    console.error("Gemini replies error:", err);
  } finally {
    state.isSuggestingReplies = false;
    updateAiOutputs();
  }
}

// -------------------- Read Email (TTS) --------------------
async function handleReadEmail() {
  const e = state.selectedEmail;
  if (!e) return;

  if (state.isReading) {
    state.audioEl?.pause();
    state.isReading = false;
    updateAiOutputs();
    return;
  }

  state.isTTSLoading = true;
  updateAiOutputs();

  const textToRead = `Subject: ${e.subject}. Body: ${(e.body||"").replace(/<[^>]*>?/gm, "")}`;
  const payload = {
    contents: [{ parts: [{ text: textToRead }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Algieba" } } }
    },
    model: "gemini-2.5-flash-preview-tts"
  };

  try {
    let audioData, mimeType;
    if (GEMINI_API_KEY) {
      const data = await geminiFetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent",
        payload
      );
      const part = data?.candidates?.[0]?.content?.parts?.[0];
      audioData = part?.inlineData?.data;
      mimeType = part?.inlineData?.mimeType;
    }

    if (audioData && mimeType && mimeType.startsWith("audio/")) {
      const rateMatch = mimeType.match(/rate=(\d+)/);
      const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
      const pcm = new Int16Array(base64ToArrayBuffer(audioData));
      const wavBlob = pcmToWav(pcm, sampleRate);
      const url = URL.createObjectURL(wavBlob);
      const audio = state.audioEl || new Audio();
      audio.pause();
      audio.src = url;
      audio.play();
      state.audioEl = audio;
      state.isReading = true;
      audio.onended = () => { state.isReading = false; updateAiOutputs(); };
    } else {
      console.error("TTS: no audio data");
    }
  } catch (err) {
    console.error("Gemini TTS error:", err);
  } finally {
    state.isTTSLoading = false;
    updateAiOutputs();
  }
}

// -------------------- Gemini AI Draft --------------------
$("#btnGemini")?.addEventListener("click", async () => {
  const prompt = $("#geminiPrompt")?.value.trim();
  const geminiError = $("#geminiError");
  if (geminiError) geminiError.hidden = true;

  if (!prompt) return;

  try {
    state.isGeminiLoading = true;
    const draft = await fakeGeminiDraft(prompt); // קריאה ל-API אמיתי
    state.compose.body = draft;
    const editor = $("#richEditor");
    if (editor) editor.innerHTML = draft;
  } catch(err) {
    console.error(err);
    if (geminiError) geminiError.hidden = false;
  } finally {
    state.isGeminiLoading = false;
  }
});

// -------------------- Send Email --------------------
$("#btnSend")?.addEventListener("click", async () => {
  const composeStatus = $("#composeStatus");
  if (!composeStatus) return;
  composeStatus.hidden = false;
  composeStatus.textContent = state.t.loginStatusConnecting;

  const { recipient, subject, body } = state.compose;
  if (!recipient || !body) {
    composeStatus.textContent = "Recipient and body are required!";
    return;
  }

  try {
    const appId = "1:199399854104:web:6aec488e6aeee0dec3736d";
    await addDoc(collection(db, `artifacts/${appId}/public/data/emails`), {
      sender: state.emailAddress,
      recipient: `${recipient}@family.local`,
      subject: subject || state.t.emailSubjectPlaceholder,
      body,
      timestamp: serverTimestamp(),
      attachment: state.attachments
        ? Array.isArray(state.attachments)
          ? state.attachments.map(f => ({ name: f.name, size: f.size }))
          : { name: state.attachments.name, size: state.attachments.size }
        : null
    });
    composeStatus.textContent = state.t.sendSuccess;
    state.compose = { recipient: "", subject: "", body: "" };
    state.attachments = null;
    renderCompose();
  } catch (err) {
    console.error(err);
    composeStatus.textContent = state.t.sendError;
  }
});

// -------------------- Fake API Helpers --------------------
async function fakeAISummarize(text) { return "סיכום הדוגמה: " + text.slice(0,100) + "…"; }
async function fakeAISuggestReplies(text) { return ["תשובה 1","תשובה 2","תשובה 3"]; }
function fakeTTSUrl(text) { return `https://api.fakeTTS.com/speech?text=${encodeURIComponent(text)}`; }
async function fakeGeminiDraft(prompt) { return "טיוטת Gemini AI לדוגמה עבור: " + prompt; }

// -------------------- Call Render --------------------
function render() {
  console.log("Render called");
}

// -------------------- התחל --------------------
render();
