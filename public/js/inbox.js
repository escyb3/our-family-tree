const inboxContainer = document.getElementById("messages");
const form = document.getElementById("send-form");
const search = document.getElementById("search");
const tagFilter = document.getElementById("tag-filter");

const currentUser = window.currentUser || localStorage.getItem("username");

async function loadMessages() {
  const res = await fetch("/api/messages");
  const data = await res.json();

  if (!Array.isArray(data)) {
    console.error("⚠️ הנתונים שהתקבלו אינם מערך:", data);
    inboxContainer.innerHTML = "<p>❌ שגיאה בטעינת הודעות</p>";
    return;
  }

  const filtered = data
    .filter(m => m.to === currentUser)
    .filter(m =>
      (!search.value || m.subject.includes(search.value) || m.from.includes(search.value)) &&
      (!tagFilter.value || m.type === tagFilter.value)
    );

  inboxContainer.innerHTML = filtered.map(m => `
    <div class="msg-card">
      <p><strong>מ:</strong> ${m.from}</p>
      <p><strong>נושא:</strong> ${m.subject}</p>
      <p>${m.body}</p>
      ${m.attachment ? `<p><a href="${m.attachment}" target="_blank">📎 קובץ מצורף</a></p>` : ""}
      <p><strong>תאריך:</strong> ${new Date(m.timestamp).toLocaleString()}</p>
      ${(m.replies || []).map((r, i) => `
        <div class="reply"><strong>#${i + 1} ${r.from}:</strong> ${r.body}</div>
      `).join("")}
      <button onclick="reply('${m.threadId}')">🔁 השב</button>
    </div>
  `).join("") || "<p>אין הודעות בתיבה</p>";
}
inboxContainer.innerHTML = filtered.map(m => `
  <div class="msg-card ${m.seen ? '' : 'unseen'}">
    <p><strong>מ:</strong> ${m.from}</p>
    <p><strong>נושא:</strong> ${m.subject}</p>
    <p>${m.body}</p>
    ${m.attachment ? `<p><a href="${m.attachment}" target="_blank">📎 קובץ מצורף</a></p>` : ""}
    <p><strong>תאריך:</strong> ${new Date(m.timestamp).toLocaleString()}</p>
    ${(m.replies || []).map((r, i) => `
      <div class="reply"><strong>#${i + 1} ${r.from}:</strong> ${r.body}</div>
    `).join("")}
    <button onclick="reply('${m.threadId}')">🔁 השב</button>
    ${!m.seen ? `<button onclick="markAsSeen('${m.threadId}')">✅ סמן כנקראה</button>` : "<span class='seen-mark'>✔️ נקראה</span>"}
  </div>
`).join("") || "<p>אין הודעות בתיבה</p>";
async function markAsSeen(threadId) {
  await fetch("/mark-seen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId })
  });
  loadMessages();
}

form.onsubmit = async (e) => {
  e.preventDefault();

  const attachment = document.getElementById("attachment").files[0];
  let attachmentUrl = null;

  if (attachment) {
    const data = new FormData();
    data.append("attachment", attachment);
    const res = await fetch("/upload-attachment", {
      method: "POST",
      body: data,
    });
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
      attachment: attachmentUrl,
    }),
  });

  form.reset();
  loadMessages();
};

async function reply(threadId) {
  const content = prompt("כתוב תגובה:");
  if (!content) return;

  await fetch("/reply-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId, body: content })
  });

  loadMessages();
}

search.oninput = loadMessages;
tagFilter.onchange = loadMessages;

loadMessages();
