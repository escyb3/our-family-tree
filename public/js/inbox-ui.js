// inbox-ui.js – תיבת דואר חדשה בסגנון GMAIL

const inboxList = document.getElementById("inbox-list");
const previewPane = document.getElementById("preview-pane");
const dateFilter = document.getElementById("date-filter");
const tagFilter = document.getElementById("tag-filter");
const searchInput = document.getElementById("search");

const currentUser = window.currentUser || localStorage.getItem("username");

async function loadInbox() {
  try {
    const res = await fetch("/api/messages");
    const data = await res.json();

    if (!Array.isArray(data)) {
      inboxList.innerHTML = "<p>שגיאה בטעינת ההודעות</p>";
      return;
    }

    const filtered = data.filter(msg => msg.to === currentUser)
      .filter(m =>
        (!searchInput.value || m.subject.includes(searchInput.value) || m.from.includes(searchInput.value)) &&
        (!tagFilter.value || m.type === tagFilter.value) &&
        (!dateFilter.value || new Date(m.timestamp).toISOString().slice(0, 10) === dateFilter.value)
      );

    if (filtered.length === 0) {
      inboxList.innerHTML = "<p>אין הודעות להצגה</p>";
      return;
    }

    inboxList.innerHTML = filtered.map((m, i) => `
      <div class="thread-item ${m.seen ? '' : 'unread'}" onclick="openThread(${i})">
        <p><strong>${m.from}</strong> – ${m.subject}</p>
        <p class="msg-snippet">${m.body.slice(0, 60)}...</p>
        <p class="msg-time">${new Date(m.timestamp).toLocaleString()}</p>
      </div>
    `).join("");

    window._currentInbox = filtered;
  } catch (err) {
    console.error("❌ שגיאה בטעינת תיבת הדואר:", err);
    inboxList.innerHTML = "<p>שגיאה בשרת</p>";
  }
}

window.openThread = (i) => {
  const msg = window._currentInbox[i];
  if (!msg) return;

  previewPane.innerHTML = `
    <div class="preview-header">
      <h3>${msg.subject}</h3>
      <p><strong>מ:</strong> ${msg.from}</p>
      <p><strong>תאריך:</strong> ${new Date(msg.timestamp).toLocaleString()}</p>
    </div>
    <div class="preview-body">
      <p>${msg.body}</p>
      ${msg.attachment && msg.attachment.match(/\.(jpg|png|gif)$/) ? `<img src="${msg.attachment}" class="thumb">` : msg.attachment ? `<a href="${msg.attachment}" target="_blank">📎 קובץ מצורף</a>` : ""}
      <div class="replies">
        ${(msg.replies || []).map((r, idx) => `<div class="reply"><strong>#${idx + 1} ${r.from}:</strong> ${r.body}</div>`).join("")}
      </div>
    </div>
    <button onclick="reply('${msg.threadId}')">🔁 השב</button>
  `;
}

searchInput.oninput = loadInbox;
tagFilter.onchange = loadInbox;
dateFilter.onchange = loadInbox;

loadInbox();
