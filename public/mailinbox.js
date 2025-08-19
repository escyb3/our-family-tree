// app.js (ESM, Vanilla JS)
// -----------------------------------------------------------
// תלות: Firebase v10 ESM מה-CDN (נטען ב-index.html) + fetch
// -----------------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithCustomToken, onAuthStateChanged, signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp,
         doc, setDoc, deleteDoc, getDoc } 
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
  isTTSLoading: false,
  isReading: false,
  audioEl: null
};

// -------------------- עזרי DOM --------------------
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const elApp = $("#app");
const viewLogin = $("#view-login");
const viewMailbox = $("#view-mailbox");
const mainContent = $("#mainContent");
const globalStatus = $("#globalStatus");

// -------------------- i18n / שפה --------------------
const languageToggleBtn = $("#languageToggle");
languageToggleBtn.addEventListener("click", () => {
  state.language = state.language === "he" ? "en" : "he";
  state.t = lang[state.language];
  document.documentElement.dir = state.language === "he" ? "rtl" : "ltr";
  render();
});

// -------------------- Firebase Init --------------------
const firebaseConfig = window.__firebase_config || {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
async function testFirestoreConnection() {
  try {
    console.log("Testing Firestore connection...");
    const testDocRef = doc(db, "testCollection", "testDoc");
    
    // ננסה לקרוא את הדוקומנט
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

// קרא לפונקציה אחרי אתחול Firebase
testFirestoreConnection();


// -------------------- Auth listeners --------------------
onAuthStateChanged(auth, (user) => {
  state.isAuthReady = true;
  state.userId = user ? user.uid : null;

  if (user) {
    console.log("User logged in:", user.uid, user.email);
    state.currentView = "mailbox";
  } else {
    console.log("User logged out");
    state.currentView = "login";
  }

  render();
});

// -------------------- Utility --------------------
function showStatus(msg, opts={}) {
  if (!msg) { globalStatus.hidden = true; globalStatus.textContent = ""; return; }
  globalStatus.textContent = msg;
  globalStatus.hidden = false;
  if (opts.autoHide) setTimeout(() => showStatus(""), opts.autoHide);
}
function fmtDate(tsSeconds, locale) {
  if (!tsSeconds) return "";
  return new Date(tsSeconds * 1000).toLocaleString(locale, { dateStyle:"short", timeStyle:"short" });
}
function escapeHtml(s=""){
  const d=document.createElement("div"); d.textContent=s; return d.innerHTML;
}

// -------------------- Login --------------------
const loginForm = $("#loginForm");
const usernameInput = $("#usernameInput");
const loginStatus = $("#loginStatus");
const loginBtn = $("#loginBtn");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  if (!username) return;

  loginStatus.hidden = false;
  loginStatus.textContent = state.t.loginStatusConnecting;
  loginBtn.disabled = true;

  try {
    let cred;
    const initialToken = typeof window.__initial_auth_token !== "undefined" ? window.__initial_auth_token : null;
    if (initialToken) {
      cred = await signInWithCustomToken(auth, initialToken);
    } else {
      cred = await signInAnonymously(auth);
    }

    state.username = username;
    state.emailAddress = `${username}@family.local`;
    state.userId = cred.user.uid;
    state.currentView = "mailbox";
    loginStatus.hidden = true;

    // התחלת מאזינים ל־Firestore
    startRealtimeSubscriptions();

    render();
  } catch (err) {
    console.error("Login error:", err);
    loginStatus.hidden = false;
    loginStatus.textContent = state.t.loginError;
  } finally {
    loginBtn.disabled = false;
  }
});

// -------------------- Firestore subscriptions --------------------
let unsubscribeInbox = null;
let unsubscribeSent = null;
let unsubscribeContacts = null;

function startRealtimeSubscriptions() {
  stopRealtimeSubscriptions();
  if (!state.userId || !state.emailAddress) return;

// Inbox
const appId = "1:199399854104:web:6aec488e6aeee0dec3736d";
const inboxQ = query(
  collection(db, `artifacts/${appId}/public/data/emails`),
  where("recipient", "==", state.emailAddress)
);

unsubscribeInbox = onSnapshot(inboxQ, (snap) => {
  const emails = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  emails.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
  state.inboxEmails = emails;
  if (state.currentView === "mailbox" && state.currentFolder === "inbox" && !state.selectedEmail) renderMain();
});


  // Sent
  const sentQ = query(
    collection(db, `artifacts/${appId}/public/data/emails`),
    where("sender", "==", state.emailAddress)
  );
  unsubscribeSent = onSnapshot(sentQ, (snap) => {
    const emails = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    emails.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    state.sentEmails = emails;
    if (state.currentView === "mailbox" && state.currentFolder === "sent" && !state.selectedEmail) renderMain();
  });

  // Contacts (per-user)
  const contactsCol = collection(db, `artifacts/${appId}/users/${state.userId}/contacts`);
  unsubscribeContacts = onSnapshot(contactsCol, (snap) => {
    state.contacts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (state.currentView === "mailbox") renderMain(); // יעדכן את select בקומפוז
  });
}
function stopRealtimeSubscriptions() {
  if (unsubscribeInbox) { unsubscribeInbox(); unsubscribeInbox = null; }
  if (unsubscribeSent) { unsubscribeSent(); unsubscribeSent = null; }
  if (unsubscribeContacts) { unsubscribeContacts(); unsubscribeContacts = null; }
}

// -------------------- Rendering --------------------
function render() {
  // תצוגה
  if (state.currentView === "login") {
    viewLogin.hidden = false;
    viewMailbox.hidden = true;
    $("#loginForm .label").textContent = state.t.usernameLabel;
    usernameInput.placeholder = state.t.usernamePlaceholder;
    $("#loginBtn").textContent = state.t.loginButton;
  } else {
    viewLogin.hidden = true;
    viewMailbox.hidden = false;
    // Sidebar data
    $("#sidebarUsername").textContent = state.username || "";
    $("#sidebarEmail").textContent = state.emailAddress || "";
    $("#sidebarUid").textContent = state.userId || "";
    // Nav active
    $$(".nav-btn").forEach(btn => {
      const f = btn.getAttribute("data-folder");
      if (!f) { btn.classList.toggle("active", state.currentView === "contacts"); return; }
      btn.classList.toggle("active", state.currentFolder === f);
    });
    renderMain();
  }
}

function renderMain() {
  // מבסיס JSX: compose / contacts / email / lists
  if (state.currentView !== "mailbox") return;
  if (state.selectedEmail) return renderEmailView();

  if (state.currentFolder === "inbox") return renderEmailList(state.inboxEmails, "inbox");
  if (state.currentFolder === "sent") return renderEmailList(state.sentEmails, "sent");
  if (state.currentFolder === "trash") return renderEmailList([], "trash");
  if (state.currentFolder === "spam") return renderEmailList([], "spam");
  if (state.currentView === "contacts") return renderContactsView();
  // compose is a mode triggered by button:
  if (state.showCompose) return renderCompose();
}

// Sidebar buttons
$("#btnCompose").addEventListener("click", () => {
  state.showCompose = true;
  state.selectedEmail = null;
  mainContent.scrollTop = 0;
  renderCompose();
});
$("#btnContacts").addEventListener("click", () => {
  state.currentView = "mailbox"; // נשארים ב-mailbox
  state.selectedEmail = null;
  state.showCompose = false;
  state.currentFolder = "inbox"; // לא חובה, רק לשמור עקביות
  // מציגים Contacts כ־main panel
  renderContactsView();
});

// Folder nav
$$(".nav-btn[data-folder]").forEach(btn => {
  btn.addEventListener("click", () => {
    const folder = btn.getAttribute("data-folder");
    state.currentFolder = folder;
    state.selectedEmail = null;
    state.showCompose = false;
    renderMain();
  });
});

// -------------------- UI builders --------------------
function renderEmailList(items, folder) {
  const t = state.t;
  mainContent.innerHTML = `
    <div class="section">
      <div class="row">
        <input id="searchInput" class="input" placeholder="${t.searchPlaceholder}" />
      </div>
      <h2 style="margin:12px 0 8px 0">${folderTitle(folder)}</h2>
      <div id="emailList" class="list"></div>
    </div>
  `;
  const list = $("#emailList", mainContent);
  const searchInput = $("#searchInput", mainContent);
  searchInput.value = state.searchQuery;

  function applyFilter() {
    state.searchQuery = searchInput.value.toLowerCase();
    const filtered = (!state.searchQuery)
      ? items
      : items.filter(e =>
          (e.subject||"").toLowerCase().includes(state.searchQuery) ||
          (e.sender||"").toLowerCase().includes(state.searchQuery) ||
          (e.body||"").toLowerCase().includes(state.searchQuery)
        );
    list.innerHTML = "";
    if (!filtered.length) {
      list.innerHTML = `<div class="muted center" style="padding:20px">${t.noMessagesInFolder}</div>`;
      return;
    }
    for (const email of filtered) {
      const el = document.createElement("div");
      el.className = "mail-item";
      el.innerHTML = `
        <div class="meta">
          <span class="from">${escapeHtml(email.sender||"")}</span>
          <span class="date">${fmtDate(email.timestamp?.seconds, state.language === "he" ? "he-IL" : "en-US")}</span>
        </div>
        <div class="subject">${escapeHtml(email.subject||t.emailSubjectPlaceholder)}</div>
      `;
      el.addEventListener("click", () => {
        state.selectedEmail = email;
        state.showCompose = false;
        renderEmailView();
      });
      list.appendChild(el);
    }
  }

  searchInput.addEventListener("input", applyFilter);
  applyFilter();
}

function folderTitle(f) {
  const t = state.t;
  return f === "inbox" ? t.inboxFolder : f === "sent" ? t.sentFolder : f === "trash" ? t.trashFolder : t.spamFolder;
}

function renderEmailView() {
  const t = state.t;
  const e = state.selectedEmail;
  if (!e) return renderMain();

  mainContent.innerHTML = `
    <div class="section">
      <div class="row right">
        <button id="btnReply" class="btn">↩️ ${t.emailReply}</button>
        <button id="btnBack" class="btn">🏠 ${t.emailBack}</button>
      </div>
      <h2 style="margin-top:10px">${escapeHtml(e.subject || t.emailSubjectPlaceholder)}</h2>
      <div class="kv" style="margin:8px 0">
        <div><span class="k">${t.emailFrom}</span> ${escapeHtml(e.sender||"")}</div>
        <div><span class="k">${t.emailTo}</span> ${escapeHtml(e.recipient||"")}</div>
      </div>
      <div class="section" style="margin-top:10px">
        <div class="email-body" id="emailBody"></div>
        ${e.attachment ? `
          <div class="section" style="margin-top:10px">
            <div class="row">
              <div class="k">📎 ${t.attachment}</div>
              <div class="muted">${escapeHtml(e.attachment.name)} (${Math.round((e.attachment.size||0)/1024)} KB)</div>
              <button id="btnDownload" class="btn">⬇️ ${t.download}</button>
            </div>
            <div class="tiny muted" style="margin-top:6px">${t.downloadNotSupported}</div>
          </div>` : ``}
      </div>

      <div class="section" style="margin-top:12px">
        <div class="flex">
          <button id="btnSummarize" class="btn purple">${t.summarizeButton}</button>
          <button id="btnSuggest" class="btn purple">${t.suggestRepliesButton}</button>
          <button id="btnRead" class="btn purple">${state.isReading ? t.readEmailStopButton : t.readEmailButton}</button>
        </div>
        <div id="aiOutputs" class="col" style="margin-top:10px;gap:8px"></div>
      </div>

      <audio id="ttsAudio" class="hidden"></audio>
    </div>
  `;

  $("#emailBody").innerHTML = e.body || "";

  $("#btnReply").addEventListener("click", () => {
    state.showCompose = true;
    state.compose = {
      recipient: (e.sender||"").split("@")[0],
      subject: `Re: ${e.subject||""}`,
      body: ""
    };
    renderCompose();
  });
  $("#btnBack").addEventListener("click", () => {
    state.selectedEmail = null;
    renderMain();
  });
  if ($("#btnDownload")) {
    $("#btnDownload").addEventListener("click", () => alert(state.t.downloadNotSupported));
  }

  $("#btnSummarize").addEventListener("click", handleSummarizeEmail);
  $("#btnSuggest").addEventListener("click", handleSuggestReplies);
  $("#btnRead").addEventListener("click", handleReadEmail);
  state.audioEl = $("#ttsAudio");
}

function renderCompose() {
  const t = state.t;
  const hasContacts = state.contacts.length > 0;
  mainContent.innerHTML = `
    <div class="section">
      <div class="row right">
        <button id="btnBackToBox" class="btn">🏠 ${t.composeBack}</button>
      </div>
      <h2>${t.composeTitle}</h2>

      <div class="col">
        <label class="label">${t.recipientLabel}</label>
        <div class="row">
          ${hasContacts ? `
            <select id="recipientSelect" class="input">
              <option value="" disabled selected>${t.selectContact}</option>
              ${state.contacts.map(c => `<option value="${escapeHtml(c.username)}">${escapeHtml(c.name)} (${escapeHtml(c.username)})</option>`).join("")}
            </select>
          ` : `
            <input id="recipientInput" class="input" placeholder="${t.contactUsernamePlaceholder}" value="${escapeHtml(state.compose.recipient||"")}"/>
          `}
          <span class="badge">@family.local</span>
        </div>
      </div>

      <div class="col" style="margin-top:8px">
        <label class="label">${t.subjectLabel}</label>
        <input id="subjectInput" class="input" value="${escapeHtml(state.compose.subject||"")}"/>
      </div>

      <div class="col" style="margin-top:8px">
        <label class="label">${t.bodyLabel}</label>
        <div class="toolbar">
          <button class="tool" data-cmd="bold"><b>B</b></button>
          <button class="tool" data-cmd="italic"><i>I</i></button>
          <button class="tool" data-cmd="underline"><u>U</u></button>
        </div>
        <div id="richEditor" class="editor" contenteditable="true"></div>
        <div class="hint">${t.richTextNote}</div>
      </div>

      <div class="col" style="margin-top:8px">
        <label class="label">${t.attachmentsLabel}</label>
        <input id="fileInput" type="file"/>
        <div id="fileMeta" class="tiny muted" style="margin-top:4px"></div>
      </div>

      <div class="section" style="margin-top:12px">
        <div class="row">
          <div class="col" style="flex:1">
            <div class="label" style="margin-bottom:4px">${t.composeGeminiTitle}</div>
            <input id="geminiPrompt" class="input" placeholder="${t.geminiPlaceholder}" />
          </div>
          <button id="btnGemini" class="btn purple">${t.geminiButton}</button>
        </div>
        <div id="geminiError" class="form-status" hidden>${t.geminiError}</div>
      </div>

      <div class="row right" style="margin-top:12px">
        <button id="btnSend" class="btn primary">${t.sendButton}</button>
      </div>
      <div id="composeStatus" class="form-status" hidden></div>
    </div>
  `;

  // Init editor content (keep last typed, if any)
  const editor = $("#richEditor");
  editor.innerHTML = state.compose.body || "";

  // Toolbar actions
  $$(".tool", mainContent).forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.execCommand(btn.dataset.cmd,false,null);
      editor.focus();
    });
  });

  // Compose bindings
  const subjectInput = $("#subjectInput");
  const recipientSelect = $("#recipientSelect");
  const recipientInput = $("#recipientInput");
  subjectInput.addEventListener("input", ()=> state.compose.subject = subjectInput.value);
  if (recipientSelect) {
    recipientSelect.addEventListener("change", ()=> state.compose.recipient = recipientSelect.value);
  } else if (recipientInput) {
    recipientInput.addEventListener("input", ()=> state.compose.recipient = recipientInput.value);
  }
  editor.addEventListener("input", ()=> state.compose.body = editor.innerHTML);

  // File attach
  const fileInput = $("#fileInput");
  const fileMeta = $("#fileMeta");
  fileInput.addEventListener("change", ()=>{
    const f = fileInput.files[0] || null;
    state.attachments = f || null;
    if (f) fileMeta.textContent = `${f.name} (${Math.round(f.size/1024)} KB)`;
    else fileMeta.textContent = "";
  });

  // Back
  $("#btnBackToBox").addEventListener("click", ()=>{
    state.showCompose = false;
    state.compose = { recipient:"", subject:"", body:"" };
    renderMain();
  });

  // Gemini Draft
  const btnGemini = $("#btnGemini");
  const promptInput = $("#geminiPrompt");
  btnGemini.addEventListener("click", async ()=>{
    state.geminiDraftPrompt = promptInput.value.trim();
    if (!state.geminiDraftPrompt) return;
    await handleGeminiGenerate(editor);
  });

  // Send
  $("#btnSend").addEventListener("click", handleSendEmail);
}

function renderContactsView() {
  const t = state.t;
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

  $("#btnBackMail").addEventListener("click", ()=>{
    state.currentFolder = "inbox";
    renderMain();
  });

  // Add contact
  $("#btnAddContact").addEventListener("click", handleAddContact);

  // List
  const list = $("#contactsList");
  list.innerHTML = "";
  if (!state.contacts.length) {
    list.innerHTML = `<div class="muted center" style="padding:20px">${t.noContacts}</div>`;
  } else {
    for (const c of state.contacts) {
      const row = document.createElement("div");
      row.className = "mail-item";
      row.innerHTML = `
        <div class="row" style="justify-content:space-between">
          <div>
            <div class="k">${escapeHtml(c.name||"")}</div>
            <div class="tiny muted">${escapeHtml(c.username||"")}@family.local</div>
          </div>
          <button class="btn" data-id="${c.id}">🗑️</button>
        </div>
      `;
      row.querySelector("button").addEventListener("click", async ()=>{
        if (!confirm(state.t.deleteContactConfirm)) return;
        try {
          await deleteDoc(doc(db, `artifacts/${appId}/users/${state.userId}/contacts`, c.id));
        } catch (e) {
          console.error("Delete contact error:", e);
        }
      });
      list.appendChild(row);
    }
  }
}

// -------------------- Actions --------------------
async function handleSendEmail() {
  const t = state.t;
  const composeStatus = $("#composeStatus");
  composeStatus.hidden = true;

  const newEmail = {
    sender: state.emailAddress,
    recipient: (state.compose.recipient||"").trim() + "@family.local",
    subject: (state.compose.subject||"").trim() || t.emailSubjectPlaceholder,
    body: state.compose.body || "",
    timestamp: serverTimestamp(),
    attachment: state.attachments ? {
      name: state.attachments.name,
      size: state.attachments.size,
      type: state.attachments.type
    } : null
  };

  try {
    await addDoc(collection(db, `artifacts/${appId}/public/data/emails`), newEmail);
    composeStatus.textContent = t.sendSuccess;
    composeStatus.hidden = false;
    state.compose = { recipient:"", subject:"", body:"" };
    state.attachments = null;
    // חזרה לתיבה אחרי רגע
    setTimeout(()=>{
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

  if (!name || !username) return;

  try {
    const id = crypto.randomUUID();
    const ref = doc(db, `artifacts/${appId}/users/${state.userId}/contacts`, id);
    await setDoc(ref, { name, username });
    status.textContent = t.contactAdded;
    status.hidden = false;
    setTimeout(()=>status.hidden = true, 1500);
    // טופס נקי
    $("#contactName").value = "";
    $("#contactUsername").value = "";
  } catch (e) {
    console.error("Add contact error:", e);
    status.textContent = "אירעה שגיאה בהוספת איש הקשר.";
    status.hidden = false;
    setTimeout(()=>status.hidden = true, 1500);
  }
}

// -------------------- Gemini (Draft / Summarize / Replies / TTS) --------------------
const GEMINI_API_KEY = ""; // ← הכנס כאן את המפתח שלך

async function geminiFetch(url, payload) {
  const res = await fetch(`${url}?key=${GEMINI_API_KEY}`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  return res.json();
}

async function handleGeminiGenerate(editorEl) {
  if (!GEMINI_API_KEY) { alert("חסר GEMINI_API_KEY ב-app.js"); return; }
  const t = state.t;
  const errEl = $("#geminiError");
  errEl.hidden = true;

  try {
    const payload = {
      contents: [{ role:"user", parts:[{ text: state.geminiDraftPrompt }]}]
    };
    const data = await geminiFetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent",
      payload
    );
    const generated = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (generated) {
      const html = generated.replace(/\n/g,"<br/>");
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

async function handleSummarizeEmail() {
  if (!GEMINI_API_KEY) { alert("חסר GEMINI_API_KEY ב-app.js"); return; }
  const e = state.selectedEmail;
  if (!e) return;
  state.isSummarizing = true;

  const prompt = `Summarize the following email in a brief, concise paragraph. The email subject is "${e.subject}" and the body is "${(e.body||"").replace(/<[^>]*>?/gm,"")}."`;
  try {
    const payload = { contents:[{ role:"user", parts:[{ text: prompt }]}] };
    const data = await geminiFetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent",
      payload
    );
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || state.t.summaryError;
    state.summary = text;
  } catch {
    state.summary = state.t.summaryError;
  } finally {
    state.isSummarizing = false;
    updateAiOutputs();
  }
}

async function handleSuggestReplies() {
  if (!GEMINI_API_KEY) { alert("חסר GEMINI_API_KEY ב-app.js"); return; }
  const e = state.selectedEmail;
  if (!e) return;
  state.isSuggestingReplies = true;
  state.suggestedReplies = [];

  const prompt = `Given the email with the subject "${e.subject}" and body "${(e.body||"").replace(/<[^>]*>?/gm,"")}", suggest three very short and concise replies. Format them as a JSON array of strings. Do not include any text before or after the JSON. Example response: ["Thanks!", "I'll get back to you soon.", "Okay, I understand."]`;

  try {
    const payload = {
      contents:[{ role:"user", parts:[{ text: prompt }]}],
      generationConfig:{
        responseMimeType:"application/json",
        responseSchema:{ type:"ARRAY", items:{ type:"STRING" } }
      }
    };
    const data = await geminiFetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent",
      payload
    );
    const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const arr = JSON.parse(jsonText || "[]");
    state.suggestedReplies = Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error("Gemini replies error:", e);
  } finally {
    state.isSuggestingReplies = false;
    updateAiOutputs();
  }
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i=0;i<len;i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
}
function pcmToWav(pcm, sampleRate) {
  const pcmData = new Int16Array(pcm);
  const buffer = new ArrayBuffer(44 + pcmData.length * 2);
  const view = new DataView(buffer);
  let o = 0;
  view.setUint32(o, 0x52494646, false); o+=4; // RIFF
  view.setUint32(o, 36 + pcmData.length * 2, true); o+=4;
  view.setUint32(o, 0x57415645, false); o+=4; // WAVE
  view.setUint32(o, 0x666d7420, false); o+=4; // fmt
  view.setUint32(o, 16, true); o+=4;         // chunk length
  view.setUint16(o, 1, true); o+=2;          // PCM
  view.setUint16(o, 1, true); o+=2;          // channels
  view.setUint32(o, sampleRate, true); o+=4;
  view.setUint32(o, sampleRate*2, true); o+=4; // byte rate
  view.setUint16(o, 2, true); o+=2;           // block align
  view.setUint16(o, 16, true); o+=2;          // bits per sample
  view.setUint32(o, 0x64617461, false); o+=4; // data
  view.setUint32(o, pcmData.length*2, true); o+=4;
  for (let i=0;i<pcmData.length;i++,o+=2) view.setInt16(o, pcmData[i], true);
  return new Blob([view], { type:"audio/wav" });
}

async function handleReadEmail() {
  if (!GEMINI_API_KEY) { alert("חסר GEMINI_API_KEY ב-app.js"); return; }
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
    contents:[{ parts:[{ text: textToRead }]}],
    generationConfig:{
      responseModalities:["AUDIO"],
      speechConfig:{ voiceConfig:{ prebuiltVoiceConfig:{ voiceName:"Algieba" } } }
    },
    model:"gemini-2.5-flash-preview-tts"
  };

  try {
    const data = await geminiFetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent",
      payload
    );
    const part = data?.candidates?.[0]?.content?.parts?.[0];
    const audioData = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType;
    if (audioData && mimeType && mimeType.startsWith("audio/")) {
      const rateMatch = mimeType.match(/rate=(\d+)/);
      const sampleRate = rateMatch ? parseInt(rateMatch[1],10) : 24000;
      const pcm = base64ToArrayBuffer(audioData);
      const wavBlob = pcmToWav(pcm, sampleRate);
      const url = URL.createObjectURL(wavBlob);
      const audio = state.audioEl || new Audio();
      audio.src = url;
      audio.play();
      state.audioEl = audio;
      state.isReading = true;
      audio.onended = ()=>{ state.isReading = false; updateAiOutputs(); };
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
    const chips = state.suggestedReplies.map((r,i)=>`<button class="btn" data-reply="${escapeHtml(r)}">${escapeHtml(r)}</button>`).join(" ");
    parts.push(`<div class="section"><div class="k">${t.suggestRepliesButton}:</div><div class="flex" style="margin-top:6px">${chips}</div></div>`);
  }

  if (state.isTTSLoading) parts.push(`<div class="muted">${t.readingEmail}</div>`);
  if (state.isReading) parts.push(`<div class="badge">${t.readEmailStopButton}</div>`);

  wrap.innerHTML = parts.join("") || "";
  // click suggested replies => open compose
  $$('button[data-reply]', wrap).forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const reply = btn.getAttribute("data-reply") || "";
      const e = state.selectedEmail;
      state.showCompose = true;
      state.compose = {
        recipient: (e.sender||"").split("@")[0],
        subject: `Re: ${e.subject||""}`,
        body: escapeHtml(reply)
      };
      renderCompose();
      // הכנס תשובה לתוך העורך
      const ed = $("#richEditor");
      if (ed) { ed.innerHTML = reply; state.compose.body = reply; }
    });
  });
}

// -------------------- התחל --------------------
render();
