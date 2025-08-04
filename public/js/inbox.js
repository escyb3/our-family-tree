/// js/inbox.js - גרסה מתוקנת עם טיוטות, מחיקה, עריכה, תיוג חשוב, תגובות ו-thumbnails

const inboxContainer = document.getElementById("messages");
const form = document.getElementById("send-form");
const search = document.getElementById("search");
const tagFilter = document.getElementById("tag-filter");
const draftsList = document.getElementById("drafts-list");
const username = localStorage.getItem("username");
const currentUser = username + "@family.local";



  // בדיקת משתמש מחובר
  let currentUser = null;
  try {
    const res = await fetch("/api/user");
    if (res.ok) {
      const user = await res.json();
      currentUser = user;
      if (usernameDisplay) {
        usernameDisplay.textContent = `מחובר כ־${user.username}`;

      }

    } else {
      location.href = "/login.html";
    }

  } catch (err) {
    console.error("שגיאה בבדיקת התחברות:", err);
    location.href = "/login.html";
  }

const drafts = JSON.parse(localStorage.getItem("drafts") || "[]");
renderDrafts();
form.onsubmit = async (e) => {
  e.preventDefault();
  const attachment = document.getElementById("attachment").files[0];
  let attachmentUrl = null;

  if (attachment) {
    const data = new FormData();
    data.append("attachment", attachment);
    const res = await fetch("/upload-attachment", { method: "POST", body: data });
    const json = await res.json();
    attachmentUrl = json.url;
  }



  await fetch("/send-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: form.to.value,
      subject: form.subject.value,
      body: form.body.value,
      type: document.getElementById("type").value,
      attachment: attachmentUrl,
    })
  });



  form.reset();
  toggleCompose(false);
  loadMessages();
};
document.getElementById("compose-toggle").addEventListener("click", () => {
  toggleCompose();
});
document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.key === "Enter") {
    form.requestSubmit();
  }
});

function toggleCompose(show) {
  const form = document.getElementById("send-form");
  form.classList.toggle("show", show !== false && !form.classList.contains("show"));

}
function saveDraft() {
  const draft = {
    to: form.to.value,
    subject: form.subject.value,
    body: form.body.value,
    type: document.getElementById("type").value,
    date: new Date().toISOString()
  };

  drafts.push(draft);
  localStorage.setItem("drafts", JSON.stringify(drafts));
  renderDrafts();
  alert("📥 הטיוטה נשמרה!");
}



function renderDrafts() {
  draftsList.innerHTML = drafts.map((d, i) => `
    <li>
      <strong>${d.subject}</strong> (${d.to})
      <button onclick="editDraft(${i})">✏️</button>
      <button onclick="deleteDraft(${i})">🗑️</button>
    </li>
  `).join("");
}



function editDraft(i) {
  const d = drafts[i];
  form.to.value = d.to;
  form.subject.value = d.subject;
  form.body.value = d.body;
  document.getElementById("type").value = d.type;
  toggleCompose(true);
  deleteDraft(i);
}



function deleteDraft(i) {
  drafts.splice(i, 1);
  localStorage.setItem("drafts", JSON.stringify(drafts));
  renderDrafts();
}
async function loadMessages() {
  const res = await fetch("/api/messages");
  const messages = await res.json();
  const filtered = messages.filter(m => {
    const q = search.value.toLowerCase();
    const tag = tagFilter.value;
    const date = document.getElementById("date-filter").value;
    const mode = document.getElementById("sort-mode").value;
    const matchSearch = m.subject.toLowerCase().includes(q) || m.from.toLowerCase().includes(q);
    const matchTag = !tag || m.type === tag;
    const matchDate = !date || (m.timestamp && m.timestamp.startsWith(date));
    const matchBox = mode === "sent" ? m.from === currentUser : m.to.includes(currentUser);
    return matchSearch && matchTag && matchDate && matchBox;
  });
  inboxContainer.innerHTML = filtered.map(msg => `
    <div class="msg-card${msg.important ? ' important' : ''}${!msg.seen ? ' unread' : ''}">
      <strong>${msg.subject}</strong><br>
      <small>${msg.from} → ${msg.to}</small>
      ${msg.attachment?.endsWith(".jpg") || msg.attachment?.endsWith(".png") ? `<br><img class='thumb' src='${msg.attachment}' />` : ""}
      <br><span class="reply-count">🔁 ${msg.replies?.length || 0} תגובות</span>
      <button onclick='preview(${JSON.stringify(msg)})'>👁️ צפייה</button>
      <button onclick='markImportant(${JSON.stringify(msg)})'>⭐ חשוב</button>
    </div>
  `).join("");
}

<button onclick='forwardMessage(${JSON.stringify(msg)})'>📤 העבר</button>
function preview(msg) {
  const el = document.getElementById("preview-content");
  el.innerHTML = `
    <h4>${msg.subject}</h4>
    <p><strong>מ:</strong> ${msg.from}</p>
    <p><strong>תוכן:</strong><br>${msg.body}</p>
    ${(msg.replies || []).map((r, i) => `<div><strong>#${i + 1} ${r.from}:</strong> ${r.body}</div>`).join("")}
    ${msg.attachment ? `<p><a href="${msg.attachment}" target="_blank">📎 קובץ מצורף</a></p>` : ""}
  `;
}

function markImportant(msg) {
  msg.important = !msg.important;
  fetch("/api/mark-important", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: msg.id, important: msg.important })
  }).then(() => loadMessages());
}
search.oninput = loadMessages;
tagFilter.onchange = loadMessages;
document.getElementById("date-filter").onchange = loadMessages;
document.getElementById("sort-mode").onchange = loadMessages;
loadMessages();
