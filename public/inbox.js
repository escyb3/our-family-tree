const inbox = document.getElementById("messages");
const form = document.getElementById("send-form");
const search = document.getElementById("search");
const tagFilter = document.getElementById("tag-filter");

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

async function loadMessages() {
  const res = await fetch("/messages");
  const data = await res.json();
  const filtered = data.filter(
    m =>
      (!search.value || m.subject.includes(search.value) || m.from.includes(search.value)) &&
      (!tagFilter.value || m.type === tagFilter.value)
  );
  inbox.innerHTML = filtered.map(m => `
    <div class="msg-card">
      <p><strong>מ:</strong> ${m.from}</p>
      <p><strong>נושא:</strong> ${m.subject}</p>
      <p>${m.body}</p>
      ${m.attachment ? `<p><a href="${m.attachment}" target="_blank">📎 קובץ מצורף</a></p>` : ""}
      <p><strong>תאריך:</strong> ${new Date(m.timestamp).toLocaleString()}</p>
      ${m.replies.map(r => `<div class="reply"><strong>${r.from}:</strong> ${r.body}</div>`).join("")}
      <button onclick="reply('${m.threadId}')">🔁 השב</button>
    </div>
  `).join("");
}

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
