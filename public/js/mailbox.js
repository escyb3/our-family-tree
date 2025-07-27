const inbox = document.getElementById("inbox");
const form = document.getElementById("send-form");
const searchInput = document.getElementById("search");

form.onsubmit = async (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  const body = {
    to: formData.get("to"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    type: formData.get("type"),
  };

  const file = formData.get("attachment");
  if (file && file.size > 0) {
    const uploadRes = await fetch("/upload-attachment", {
      method: "POST",
      body: formData
    });
    const result = await uploadRes.json();
    if (result.url) body.attachment = result.url;
  }

  await fetch("/send-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  alert("הודעה נשלחה!");
  form.reset();
  loadMessages();
};

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

async function loadMessages() {
  const res = await fetch("/messages");
  const data = await res.json();
  displayMessages(data);
}

function displayMessages(messages) {
  const q = searchInput.value.toLowerCase();
  inbox.innerHTML = messages
    .filter(m => m.subject.toLowerCase().includes(q) || m.body.toLowerCase().includes(q))
    .map(m => `
      <div class="msg-card">
        <p><strong>מ:</strong> ${m.from}</p>
        <p><strong>נושא:</strong> ${m.subject}</p>
        <p>${m.body}</p>
        <p><strong>תאריך:</strong> ${new Date(m.timestamp).toLocaleString()}</p>
        ${m.attachment ? `<p><strong>קובץ מצורף:</strong> <a class="attachment-link" href="${m.attachment}" target="_blank">הצג קובץ</a></p>` : ""}
        ${m.replies.map(r => `<div class="reply"><p><strong>${r.from}:</strong> ${r.body}</p><p>${new Date(r.timestamp).toLocaleString()}</p></div>`).join("")}
        <button onclick="reply('${m.threadId}')">📝 השב</button>
      </div>
    `).join("");
}

searchInput?.addEventListener("input", loadMessages);

loadMessages();
