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
const firebaseConfig = {
  apiKey: "AIzaSyB2HVNHCEcciP5NdHxp3CoK6ga_xrWs9X0",
  authDomain: "mail-inbox-12659.firebaseapp.com",
  projectId: "mail-inbox-12659",
  storageBucket: "mail-inbox-12659.firebasestorage.app",
  messagingSenderId: "1072374074441",
  appId: "1:1072374074441:web:79679d4c5299798efb8398",
  measurementId: "G-LM4D6FG5WY"
};
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
  rootEl.innerHTML = `
    <div class="flex items-center justify-center h-screen bg-gray-100">
      <div class="text-blue-500 w-12 h-12 animate-spin">⏳</div>
    </div>
  `;
}

function renderLogin() {
  const html = `
    <div class="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div class="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div class="flex justify-center mb-6">
          <div class="text-blue-500 w-12 h-12">✉️</div>
        </div>
        <h1 class="text-3xl font-extrabold text-center text-gray-800 mb-6">${t().loginWelcome}</h1>
        <p class="text-center text-gray-600 mb-6">${t().loginMessage}</p>
        <form id="login-form" class="space-y-4">
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700">${t().usernameLabel}</label>
            <div class="mt-1 flex rounded-md shadow-sm">
              <input id="username" name="username" type="text" class="flex-1 block w-full rounded-md sm:text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition duration-150 ease-in-out p-3" placeholder="${t().usernamePlaceholder}" required />
              <span class="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">@family.local</span>
            </div>
          </div>
          <button id="login-button" type="submit" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            ${t().loginButton}
          </button>
        </form>
        <p id="login-status" class="mt-4 text-center text-sm font-medium text-red-500">${statusMessage || ''}</p>
      </div>
    </div>
  `;
  rootEl.innerHTML = html;

  // events
  document.getElementById('login-form').addEventListener('submit', handleLoginFormSubmit);
}

function renderMailbox() {
  // build mailbox layout
  const inboxCount = inboxEmails.length;
  const sentCount = sentEmails.length;
  const leftDir = language === 'he' ? 'rtl' : 'ltr';

  const mainContent = (currentView === 'compose') ? renderComposeHTML() : (selectedEmail ? renderEmailViewHTML() : renderEmailListHTML());

  rootEl.innerHTML = `
    <div class="flex h-screen bg-gray-100" dir="${leftDir}">
      <div class="bg-white w-64 p-4 shadow-lg rounded-r-xl flex flex-col">
        <div class="flex items-center space-x-2 mb-8" dir="ltr">
          <div class="w-8 h-8 text-blue-500">✉️</div>
          <span class="text-2xl font-bold text-gray-800">${t().appName}</span>
        </div>

        <button id="toggle-lang" class="flex items-center w-full px-4 py-2 rounded-md transition duration-150 ease-in-out text-gray-600 hover:bg-gray-100 mb-4">
          🌐 <span class="mr-2">${language === 'he' ? 'English' : 'עברית'}</span>
        </button>

        <p class="text-sm font-medium text-gray-600 mb-2">${t().sidebarWelcome}${username}!</p>
        <p class="text-xs text-gray-500 mb-2">${t().yourEmail}</p>
        <p class="text-sm font-mono text-gray-700 mb-6">${emailAddress}</p>
        <p class="text-xs text-gray-500 mb-6">${t().userId} ${userId || ''}</p>

        <nav class="space-y-2 flex-1">
          <button id="btn-new" class="flex items-center w-full px-4 py-2 rounded-md bg-blue-500 text-white font-semibold hover:bg-blue-600 mb-4">
            ✏️ <span class="mr-2">${t().newEmailButton}</span>
          </button>

          <button id="btn-inbox" class="flex items-center w-full px-4 py-2 rounded-md ${currentFolder==='inbox' ? 'bg-blue-100 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'}">
            📥 <span class="mr-2">${t().inboxFolder} (${inboxCount})</span>
          </button>

          <button id="btn-sent" class="flex items-center w-full px-4 py-2 rounded-md ${currentFolder==='sent' ? 'bg-blue-100 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'}">
            📤 <span class="mr-2">${t().sentFolder} (${sentCount})</span>
          </button>
        </nav>
      </div>

      <div class="flex-1 p-8 overflow-y-auto">
        <div class="bg-white rounded-xl shadow-lg h-full overflow-hidden">
          ${mainContent}
        </div>
      </div>
    </div>
  `;

  // attach events
  document.getElementById('toggle-lang').addEventListener('click', () => {
    language = (language === 'he') ? 'en' : 'he';
    render();
  });
  document.getElementById('btn-new').addEventListener('click', () => { currentView = 'compose'; selectedEmail = null; render(); });
  document.getElementById('btn-inbox').addEventListener('click', () => { currentFolder = 'inbox'; selectedEmail = null; render(); });
  document.getElementById('btn-sent').addEventListener('click', () => { currentFolder = 'sent'; selectedEmail = null; render(); });

  // after rendering main content, wire dynamic handlers inside it
  wireMainContentHandlers();
}

/* ---------- sub-templates ---------- */
function renderEmailListHTML() {
  const emails = (currentFolder === 'inbox') ? inboxEmails : sentEmails;
  const filtered = filterEmails(emails);

  let listHtml = `
    <div class="p-4 flex flex-col h-full overflow-y-auto">
      <div class="relative mb-4">
        <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">🔎</div>
        <input id="search-input" type="text" value="${escapeHtml(searchQuery)}" placeholder="${t().searchPlaceholder}" class="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 transition duration-150 ease-in-out p-2" />
      </div>

      <div class="flex-1 space-y-2 overflow-y-auto p-2">
        <h2 class="text-xl font-bold text-gray-800 mb-4">${currentFolder === 'inbox' ? t().inboxFolder : t().sentFolder}</h2>
  `;

  if (filtered.length > 0) {
    filtered.forEach(email => {
      const dateStr = formatTimestamp(email.timestamp);
      listHtml += `
        <div data-id="${email.id}" class="email-item flex flex-col p-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition duration-150 ease-in-out shadow-sm mb-2">
          <div class="flex justify-between items-center text-sm mb-1">
            <span class="font-semibold text-gray-800">${escapeHtml(email.sender || '')}</span>
            <span class="text-gray-500 text-xs">${escapeHtml(dateStr)}</span>
          </div>
          <div class="text-sm font-medium text-gray-700 truncate">${escapeHtml(email.subject || '')}</div>
        </div>
      `;
    });
  } else {
    listHtml += `<p class="text-center text-gray-500 mt-8">${t().noMessagesInFolder}</p>`;
  }

  listHtml += `</div></div>`;
  return listHtml;
}

function renderEmailViewHTML() {
  if (!selectedEmail) return `<div class="p-4">${t().noMessagesInFolder}</div>`;
  const attHtml = selectedEmail.attachment ? `
    <div class="mt-4 p-3 bg-gray-100 rounded-md">
      <h4 class="flex items-center font-semibold text-gray-800">📎 ${t().attachment}</h4>
      <div class="flex items-center justify-between text-sm text-gray-600 mt-2">
        <span>${escapeHtml(selectedEmail.attachment.name)} (${Math.round((selectedEmail.attachment.size||0)/1024)} KB)</span>
        <button id="fake-download-btn" class="flex items-center text-blue-500 hover:underline">${t().download}</button>
      </div>
      <p class="text-xs text-red-500 mt-2">${t().downloadNotSupported}</p>
    </div>
  ` : '';

  return `
    <div class="p-4 flex flex-col h-full bg-white rounded-lg shadow-sm">
      <div class="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
        <h2 class="text-xl font-bold text-gray-800">${escapeHtml(selectedEmail.subject || '')}</h2>
        <div class="flex space-x-2">
          <button id="reply-btn" class="flex items-center px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600">↩️ ${t().emailReply}</button>
          <button id="back-btn" class="flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300">🏠 ${t().emailBack}</button>
        </div>
      </div>

      <div class="mb-4 text-sm text-gray-600">
        <span class="font-semibold text-gray-800">${t().emailFrom}</span> ${escapeHtml(selectedEmail.sender || '')}
        <br/>
        <span class="font-semibold text-gray-800">${t().emailTo}</span> ${escapeHtml(selectedEmail.recipient || '')}
      </div>

      <div class="text-gray-700 flex-1 overflow-y-auto">
        <div class="whitespace-pre-wrap">${selectedEmail.body || ''}</div>
        ${attHtml}
      </div>
    </div>
  `;
}

function renderComposeHTML() {
  return `
    <div class="p-4 flex flex-col h-full bg-white rounded-lg shadow-sm">
      <div class="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
        <h2 class="text-xl font-bold text-gray-800">${t().composeTitle}</h2>
        <button id="compose-back" class="flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300">🏠 ${t().composeBack}</button>
      </div>

      <form id="compose-form" class="flex-1 flex flex-col space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">${t().recipientLabel}</label>
          <div class="mt-1 flex rounded-md shadow-sm">
            <input id="recipient" type="text" value="${escapeHtml(composeForm.recipient)}" class="flex-1 block w-full rounded-md sm:text-sm border-gray-300 p-2" placeholder="${t().usernamePlaceholder}" required />
            <span class="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">@family.local</span>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">${t().subjectLabel}</label>
          <input id="subject" type="text" value="${escapeHtml(composeForm.subject)}" class="mt-1 block w-full rounded-md shadow-sm sm:text-sm border-gray-300 p-2" />
        </div>

        <div class="flex flex-col">
          <label class="block text-sm font-medium text-gray-700">${t().bodyLabel}</label>
          <div class="flex items-center space-x-2 border-b border-gray-300 bg-gray-50 p-2 rounded-t-md">
            <button type="button" data-cmd="bold" class="p-2 rounded-md hover:bg-gray-200">B</button>
            <button type="button" data-cmd="italic" class="p-2 rounded-md hover:bg-gray-200">I</button>
            <button type="button" data-cmd="underline" class="p-2 rounded-md hover:bg-gray-200">U</button>
          </div>
          <div id="rich-text-editor" contenteditable="true" class="mt-0 block w-full rounded-b-md shadow-sm sm:text-sm border border-gray-300 p-2 h-32 overflow-y-auto focus:outline-none">${composeForm.body || ''}</div>
          <p class="text-xs text-gray-500 mt-2">${t().richTextNote}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">${t().attachmentsLabel}</label>
          <div class="mt-1 flex items-center space-x-2">
            <input id="file-upload" type="file" class="block w-full text-sm text-gray-500" />
            <span id="file-info" class="text-sm text-gray-700">${attachments ? `${escapeHtml(attachments.name)} (${Math.round(attachments.size/1024)} KB)` : ''}</span>
          </div>
        </div>

        <div class="flex flex-col space-y-2 p-4 bg-gray-50 rounded-lg">
          <h3 class="text-md font-bold text-gray-800">${t().composeGeminiTitle}</h3>
          <div class="flex space-x-2">
            <input id="gemini-prompt" type="text" value="${escapeHtml(geminiDraftPrompt)}" placeholder="${t().geminiPlaceholder}" class="flex-1 rounded-md p-2 border border-gray-300" />
            <button id="gemini-btn" type="button" class="px-4 py-2 bg-purple-500 text-white rounded-md">${isGeminiLoading ? '...' : t().geminiButton}</button>
          </div>
          <p id="gemini-error" class="text-red-500 text-sm mt-2" style="display:${isGeminiError ? 'block':'none'};">${t().geminiError}</p>
        </div>

        <button id="send-btn" type="submit" class="w-full py-3 px-4 rounded-md text-white bg-blue-600">${t().sendButton}</button>
        <p id="status-msg" class="mt-4 text-center text-sm font-medium text-green-500">${statusMessage || ''}</p>
      </form>
    </div>
  `;
}

/* ===========================
   Wire handlers for main content (search, list clicks, compose handlers)
   =========================== */
function wireMainContentHandlers() {
  // search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      // throttle: small delay (but simple re-render)
      render();
    });
  }

  // list items click
  const items = Array.from(document.querySelectorAll('.email-item'));
  items.forEach(it => {
    it.addEventListener('click', () => {
      const id = it.getAttribute('data-id');
      const all = currentFolder === 'inbox' ? inboxEmails : sentEmails;
      selectedEmail = all.find(x => x.id === id) || null;
      currentView = 'mailbox';
      render();
    });
  });

  // view buttons
  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.addEventListener('click', () => { selectedEmail = null; render(); });

  const replyBtn = document.getElementById('reply-btn');
  if (replyBtn && selectedEmail) replyBtn.addEventListener('click', () => {
    composeForm = { recipient: selectedEmail.sender, subject: `Re: ${selectedEmail.subject || ''}`, body: '' };
    currentView = 'compose';
    render();
  });

  // compose handlers
  const composeBack = document.getElementById('compose-back');
  if (composeBack) composeBack.addEventListener('click', () => { currentView = 'mailbox'; selectedEmail = null; render(); });

  const composeFormEl = document.getElementById('compose-form');
  if (composeFormEl) {
    // formatting toolbar
    Array.from(composeFormEl.querySelectorAll('button[data-cmd]')).forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-cmd');
        document.execCommand(cmd, false, null);
        if (richTextEl) richTextEl.focus();
      });
    });

    richTextEl = document.getElementById('rich-text-editor');
    if (richTextEl) {
      richTextEl.addEventListener('input', (e) => {
        composeForm.body = e.target.innerHTML;
      });
    }

    const fileInput = document.getElementById('file-upload');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        attachments = e.target.files[0] || null;
        const info = document.getElementById('file-info');
        if (attachments) info.textContent = `${attachments.name} (${Math.round(attachments.size/1024)} KB)`;
        else info.textContent = '';
      });
    }

    // gemini:
    const geminiBtn = document.getElementById('gemini-btn');
    const geminiPromptInput = document.getElementById('gemini-prompt');
    if (geminiPromptInput) geminiPromptInput.addEventListener('input', (e) => geminiDraftPrompt = e.target.value);
    if (geminiBtn) geminiBtn.addEventListener('click', handleGeminiGenerate);

    // send:
    composeFormEl.addEventListener('submit', handleSendEmail);
  }

  // fake download
  const fakeDownloadBtn = document.getElementById('fake-download-btn');
  if (fakeDownloadBtn) fakeDownloadBtn.addEventListener('click', () => alert(t().downloadNotSupported));
}

/* ===========================
   Actions: Login, send email, Gemini
   =========================== */
async function handleLoginFormSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('username');
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;

  username = val;
  loading = true;
  statusMessage = t().loginStatusConnecting;
  render();

  try {
    let userCred;

    if (initialAuthToken) {
      try {
        userCred = await signInWithCustomToken(auth, initialAuthToken);
      } catch (tokenErr) {
        console.warn('Custom token login failed, fallback to anonymous login:', tokenErr);
        userCred = await signInAnonymously(auth);
      }
    } else {
      userCred = await signInAnonymously(auth);
    }

    emailAddress = `${username}@family.local`;
    userId = userCred.user.uid;
    currentView = 'mailbox';
    statusMessage = '';
    // no need to call render here because onAuthStateChanged will set isAuthReady true
  } catch (err) {
    console.error('Login error:', err);
    statusMessage = t().loginError;
  } finally {
    loading = false;
    render();
  }
}
import { createUserWithEmailAndPassword } from "firebase/auth";

async function registerUser(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // משתמש נוצר בהצלחה
    console.log('User registered:', userCredential.user);
  } catch (error) {
    console.error('Registration error:', error);
  }
}



async function handleSendEmail(e) {
  if (e && e.preventDefault) e.preventDefault();
  loading = true;
  statusMessage = '';
  render();

  const recipientVal = document.getElementById('recipient')?.value.trim() || composeForm.recipient || '';
  const subjectVal = document.getElementById('subject')?.value.trim() || composeForm.subject || '';
  const bodyHtml = (document.getElementById('rich-text-editor')?.innerHTML) || composeForm.body || '';

  const newEmail = {
    sender: emailAddress,
    recipient: recipientVal,
    subject: subjectVal || t().emailSubjectPlaceholder,
    body: bodyHtml,
    timestamp: serverTimestamp(),
    attachment: attachments ? {
      name: attachments.name,
      size: attachments.size,
      type: attachments.type
    } : null
  };

  try {
    await addDoc(collection(db, `artifacts/${appId}/public/data/emails`), newEmail);
    statusMessage = t().sendSuccess;
    composeForm = { recipient: '', subject: '', body: '' };
    attachments = null;
    setTimeout(() => {
      statusMessage = '';
      currentView = 'mailbox';
      render();
    }, 1600);
  } catch (err) {
    console.error('Send error:', err);
    statusMessage = t().sendError;
  } finally {
    loading = false;
    render();
  }
}

/* ===== Gemini integration (calls API key if יש) =====
   שים לב: הכנס את המפתח שלך ל־GEMINI_API_KEY למטה כדי שזה יעבוד.
*/
const GEMINI_API_KEY = ''; // <-- הכנס כאן את מפתח ה־API אם יש לך

async function handleGeminiGenerate() {
  if (!geminiDraftPrompt || !GEMINI_API_KEY) {
    if (!GEMINI_API_KEY) {
      alert('No Gemini API key set. Add it in app.js to enable this feature.');
      return;
    }
  }

  isGeminiLoading = true;
  isGeminiError = false;
  render();

  const chatHistory = [{ role: "user", parts: [{ text: geminiDraftPrompt }] }];
  const payload = { contents: chatHistory };
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

  let retries = 0;
  const maxRetries = 3;
  const initialDelay = 1000;

  while (retries < maxRetries) {
    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const data = await resp.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText && richTextEl) {
          richTextEl.innerHTML = generatedText.replace(/\n/g, '<br/>');
        }
        break;
      } else {
        retries++;
        await new Promise(r => setTimeout(r, initialDelay * Math.pow(2, retries-1)));
      }
    } catch (err) {
      console.error('Gemini error', err);
      retries++;
      await new Promise(r => setTimeout(r, initialDelay * Math.pow(2, retries-1)));
    }
  }

  if (retries === maxRetries) {
    isGeminiError = true;
  }
  isGeminiLoading = false;
  render();
}

/* ===========================
   Filtering helper
   =========================== */
function filterEmails(emails) {
  if (!searchQuery) return emails;
  const q = searchQuery.toLowerCase();
  return emails.filter(email =>
    (email.subject || '').toLowerCase().includes(q) ||
    (email.sender || '').toLowerCase().includes(q) ||
    (stripHtml(email.body || '')).toLowerCase().includes(q)
  );
}

/* ===========================
   Firebase realtime listeners (מעתיק את ה־useEffect)
   =========================== */
function setupRealtimeListeners() {
  // הקשבה לשינויי אימות
  onAuthStateChanged(auth, (user) => {
    isAuthReady = true;
    if (user) {
      userId = user.uid;
      // set emailAddress left as-is (login flow sets it)
      // when authenticated, תקשיב למסמכי אימייל
      setupEmailSnapshots();
    } else {
      userId = null;
    }
    render();
  });
}

let unsubscribeInbox = null;
let unsubscribeSent = null;

function setupEmailSnapshots() {
  // נקה מאזינים ישנים
  if (unsubscribeInbox) unsubscribeInbox();
  if (unsubscribeSent) unsubscribeSent();

  if (!userId || !emailAddress) return;

  const inboxQuery = query(collection(db, `artifacts/${appId}/public/data/emails`), where('recipient', '==', emailAddress));
  unsubscribeInbox = onSnapshot(inboxQuery, (snapshot) => {
    const emails = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    emails.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    inboxEmails = emails;
    render();
  });

  const sentQuery = query(collection(db, `artifacts/${appId}/public/data/emails`), where('sender', '==', emailAddress));
  unsubscribeSent = onSnapshot(sentQuery, (snapshot) => {
    const emails = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    emails.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    sentEmails = emails;
    render();
  });
}

/* ===========================
   Helpers: escaping
   =========================== */
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function (s) {
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[s];
  });
}
function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '');
}

/* ===========================
   Initialize app
   =========================== */
function bootstrap() {
  rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('Root element not found');

  setupRealtimeListeners();
  render();
}
bootstrap();
