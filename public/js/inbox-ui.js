// public/js/inbox-ui.js

const inboxContainer = document.getElementById("messages");
const form = document.getElementById("send-form");
const search = document.getElementById("search");
const tagFilter = document.getElementById("tag-filter");
const fromDate = document.getElementById("from-date");
const toDate = document.getElementById("to-date");
const folderSelect = document.getElementById("folder");
const currentUser = window.currentUser || localStorage.getItem("username");

let allMessages = [];

async function loadMessages() {
  const res = await fetch("/api/messages");
  const data = await res.json();
  if (!Array.isArray(data)) return;

  allMessages = data;
  renderMessages();
}

function renderMessages() {
  const selectedFolder = folderSelect.value; // inbox / sent / all
  const filtered = allMessages.filter(m => {
    if (selectedFolder === "inbox" && m.to !== currentUser) return false;
    if (selectedFolder === "sent" && m.from !== currentUser) return false;
    if (search.value && !m.subject.includes(search.value) && !m.from.includes(search.value)) return false;
    if (tagFilter.value && m.type !== tagFilter.value) return false;
    if (fromDate.value && new Date(m.timestamp) < new Date(fromDate.value)) return false;
    if (toDate.value && new Date(m.timestamp) > new Date(toDate.value)) return false;
    return true;
  });

  inboxContainer.innerHTML = filtered.map(m => `
    <div class="msg-card" onclick="viewMessage('${m.threadId}')">
      <p><strong>${m.from}</strong> → ${m.to}</p>
      <p><strong>${m.subject}</strong></p>
      <p class="preview">${m.body.slice(0, 100)}...</p>
      <small>${new Date(m.timestamp).toLocaleString()}</small>
    </div>
  `).join("") || "<p>אין הודעות להצגה</p>";
}

async function viewMessage(threadId) {
  const msg = allMessages.find(m => m.threadId === threadId);
  if (!msg) return;

  const view = document.getElementById("message-view");
  view.innerHTML = `
    <h3>${msg.subject}</h3>
    <p><strong>מ:</strong> ${msg.from}</p>
    <p><strong>אל:</strong> ${msg.to}</p>
    <p>${msg.body}</p>
    ${msg.attachment ? `<img src="${msg.attachment}" style="max-width:200px">` : ""}
    <hr>
    <h4>תגובות:</h4>
    ${(msg.replies || []).map((r, i) => `
      <div class="reply"><strong>#${i + 1} ${r.from}:</strong> ${r.body}</div>
    `).join("")}
    <button onclick="reply('${msg.threadId}')">🔁 השב</button>
    <button onclick="summarizeAI('${msg.threadId}')">🧠 סכם עם AI</button>
    <div id="ai-summary"></div>
  `;
}

async function reply(threadId) {
  const content = prompt("כתוב תגובה:");
  if (!content) return;

  await fetch("/reply-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId, body: content })
  });

  await loadMessages();
  viewMessage(threadId);
}

async function summarizeAI(threadId) {
  const msg = allMessages.find(m => m.threadId === threadId);
  if (!msg) return;
  const q = `סכם את השיחה בין ${msg.from} ל־${msg.to} בנושא ${msg.subject}: ${msg.body}`;
  const res = await fetch("/api/ask-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: q })
  });
  const json = await res.json();
  document.getElementById("ai-summary").innerHTML = `<div class="ai-summary">🧠 ${json.answer}</div>`;
}

// Ctrl+Enter לשליחה מהירה
form.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    form.querySelector("button[type=submit]").click();
  }
});

search.oninput = renderMessages;
tagFilter.onchange = renderMessages;
fromDate.onchange = renderMessages;
toDate.onchange = renderMessages;
folderSelect.onchange = renderMessages;

loadMessages();
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("send-form");
  const composeBtn = document.getElementById("compose-toggle");
  const sendBtn = form?.querySelector("button[type='submit']");
  const to = document.getElementById("to");
  const subject = document.getElementById("subject");
  const body = document.getElementById("body");
  const type = document.getElementById("type");

  if (!form || !composeBtn || !sendBtn) return;

  // שליחה עם Ctrl + Enter
  document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key === "Enter") {
      form.requestSubmit();
    }
  });

  // כפתור Compose
  composeBtn.addEventListener("click", () => {
    form.classList.toggle("show");
    if (form.classList.contains("show")) to?.focus();
  });

  // שליחת הודעה
  form.addEventListener("submit", async e => {
    e.preventDefault();

    const attachment = document.getElementById("attachment")?.files[0];
    let attachmentUrl = null;

    if (attachment) {
      const data = new FormData();
      data.append("attachment", attachment);
      const res = await fetch("/upload-attachment", {
        method: "POST",
        body: data
      });
      const json = await res.json();
      attachmentUrl = json.url;
    }

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: to.value,
        subject: subject.value,
        body: body.value,
        type: type.value,
        attachment: attachmentUrl
      })
    });

    if (res.ok) {
      form.reset();
      form.classList.remove("show");
      if (typeof loadMessages === "function") loadMessages();
    } else {
      alert("שליחה נכשלה ❌");
    }
  });
});

