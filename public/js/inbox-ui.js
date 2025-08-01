// inbox-ui.js – תיבת דואר חדשה בסגנון GMAIL

const currentUser = localStorage.getItem("username");
const list = document.getElementById("message-list");
const view = document.getElementById("message-view");
const search = document.getElementById("search");

async function loadMessages() {
  const res = await fetch("/api/messages");
  const all = await res.json();
  const messages = all.filter(m => m.to === currentUser);

  list.innerHTML = messages
    .filter(m => !search.value || m.subject.includes(search.value))
    .map((m, i) => `
      <div class="message-item ${m.seen ? '' : 'unread'}" onclick="viewMessage(${i})">
        <strong>${m.from}</strong><br />
        ${m.subject}<br />
        <small>${new Date(m.timestamp).toLocaleDateString()}</small>
      </div>
    `).join("");

  window._messages = messages;
}

function viewMessage(index) {
  const m = window._messages[index];
  view.innerHTML = `
    <h2>${m.subject}</h2>
    <p><strong>מאת:</strong> ${m.from}</p>
    <p>${m.body}</p>
    ${m.attachment && m.attachment.match(/\.(jpg|png|jpeg)$/)
      ? `<img src="${m.attachment}" style="max-width:100px" />`
      : m.attachment
        ? `<a href="${m.attachment}" target="_blank">📎 קובץ מצורף</a>`
        : ""
    }
    <hr />
    ${(m.replies || []).map((r, i) => `
      <div class="reply"><strong>#${i + 1} ${r.from}:</strong> ${r.body}</div>
    `).join("")}
    <button onclick="reply('${m.threadId}')">🔁 השב</button>
  `;
}

async function reply(threadId) {
  const body = prompt("כתוב תגובה:");
  if (!body) return;
  await fetch("/reply-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId, body })
  });
  loadMessages();
}

document.getElementById("send-form").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target;
  const attachment = f.attachment.files[0];
  let url = null;

  if (attachment) {
    const fd = new FormData();
    fd.append("attachment", attachment);
    const r = await fetch("/upload-attachment", { method: "POST", body: fd });
    url = (await r.json()).url;
  }

  await fetch("/send-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: f.to.value,
      subject: f.subject.value,
      body: f.body.value,
      attachment: url
    })
  });

  f.reset();
  loadMessages();
};

search.oninput = loadMessages;
loadMessages();
