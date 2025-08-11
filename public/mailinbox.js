// app.js (type=module)
// וודא שהגדרת window.__firebase_config ו־window.__app_id לפני טעינה או ערוך פה ידנית.

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ===========================
   קונפיגורציה גלובלית
   =========================== */
// אפשר להגדיר את משתני הסביבה בגב ה־HTML כמו שהוצע.
const firebaseConfig = (typeof window.__firebase_config !== 'undefined') ? JSON.parse(window.__firebase_config) : {};
const appId = (typeof window.__app_id !== 'undefined') ? window.__app_id : 'default-app-id';
const initialAuthToken = (typeof window.__initial_auth_token !== 'undefined') ? window.__initial_auth_token : null;

/* ===========
   Inits
   =========== */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =====
   טקסטים (עברית/אנגלית) - מותאם מהקוד המקורי
   ===== */
const lang = {
  he: {
    appName: "דוא\"ל פנימי",
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
    editorToolbar: "סרגל עריכת טקסט"
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
    editorToolbar: "Text Editor Toolbar"
  }
};

/* =========================
   State variables (מחזיקים את מה ש־useState היה מחזיק)
   ========================== */
let username = '';
let emailAddress = '';
let currentView = 'login'; // 'login' | 'mailbox' | 'compose'
let selectedEmail = null;
let currentFolder = 'inbox';
let inboxEmails = [];
let sentEmails = [];
let isAuthReady = false;
let userId = '';
let composeForm = { recipient: '', subject: '', body: '' };
let loading = false;
let statusMessage = '';
let searchQuery = '';
let geminiDraftPrompt = '';
let isGeminiLoading = false;
let isGeminiError = false;
let language = 'he';
let attachments = null;

/* refs to DOM nodes we'll create */
let rootEl;
let richTextEl;

/* תחלופה לשפה */
const t = () => lang[language];

/* ===========================
   Utility: format date
   =========================== */
function formatTimestamp(ts) {
  try {
    if (!ts) return '';
    const ms = ts.seconds ? ts.seconds * 1000 : (ts.toMillis ? ts.toMillis() : Date.now());
    return new Date(ms).toLocaleString(language === 'he' ? 'he-IL' : 'en-US', { dateStyle: 'short', timeStyle: 'short' });
  } catch (e) {
    return '';
  }
}

/* ===========================
   Render functions (ייצוג ה־UI)
   =========================== */
function render() {
  rootEl.innerHTML = ''; // ננקה ונבנה מחדש
  if (!isAuthReady) {
    renderLoading();
    return;
  }
  if (currentView === 'login') {
    renderLogin();
  } else {
    renderMailbox();
  }
}

function renderLoading() {
  rootEl
