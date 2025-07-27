// public/mailbox.js

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("messages-container");

  try {
    const res = await fetch("/messages");
    if (!res.ok) throw new Error("שגיאה בטעינת ההודעות");

    const messages = await res.json();

    if (messages.length === 0) {
      container.innerHTML = "<p>אין הודעות בתיבה</p>";
      return;
    }
    const { to, subject, body, attachment, type = "אישי" } = req.body;
    body: JSON.stringify({
  to: form.to.value,
  subject: form.subject.value,
  body: form.body.value,
  type: form.type.value
})


    messages.forEach((msg) => {
      const div = document.createElement("div");
      div.className = "message";

      div.innerHTML = `
        <h3>נושא: ${msg.subject}</h3>
        <p><strong>מאת:</strong> ${msg.from}</p>
        <p><strong>תאריך:</strong> ${new Date(msg.timestamp).toLocaleString("he-IL")}</p>
        <p>${msg.body}</p>

        <h4>תגובות:</h4>
        <div class="replies">
          ${(msg.replies || [])
            .map(
              (r) => `
            <div class="reply">
              <p><strong>${r.from}</strong>: ${r.body}</p>
              <small>${new Date(r.timestamp).toLocaleString("he-IL")}</small>
            </div>
          `
            )
            .join("")}
        </div>

        <textarea placeholder="כתוב תגובה..."></textarea>
        <button onclick="reply('${msg.threadId}', this.previousElementSibling.value)">שלח תגובה</button>
      `;

      container.appendChild(div);
    });
  } catch (err) {
    container.innerHTML = `<p style="color:red">${err.message}</p>`;
  }
});
let allMessages = [];
form.to.value = localStorage.getItem("draft-to") || "";
form.subject.value = localStorage.getItem("draft-subject") || "";
form.body.value = localStorage.getItem("draft-body") || "";

["to", "subject", "body"].forEach(id => {
  document.getElementById(id).addEventListener("input", () => {
    localStorage.setItem(`draft-${id}`, form[id].value);
  });
});

form.onsubmit = async (e) => {
  e.preventDefault();
  ...
  localStorage.removeItem("draft-to");
  localStorage.removeItem("draft-subject");
  localStorage.removeItem("draft-body");
};
 <div>
  <button onclick="showInbox()">📥 נכנסו</button>
  <button onclick="showSent()">📤 נשלחו</button>
</div>
async function showInbox() {
  const res = await fetch("/messages");
  allMessages = await res.json();
  renderMessages(allMessages);
}

async function showSent() {
  const res = await fetch("/messages-sent");
  const sent = await res.json();
  renderMessages(sent);
}
msg.replies.map(r => `
  <div class="reply">
    <p><strong>${r.from}</strong>: ${r.body}</p>
    <p>${new Date(r.timestamp).toLocaleString()}</p>
  </div>
`).join("")
<style>
.reply {
  background: #f1f1f1;
  padding: 0.5rem;
  margin-top: 0.5rem;
  border-radius: 6px;
  margin-right: 1rem;
  border-right: 4px solid #2196f3;
}
</style>


async function loadMessages() {
  const res = await fetch("/messages");
  allMessages = await res.json();
  renderMessages(allMessages);
}

function filterByType(type) {
  if (type === 'all') return renderMessages(allMessages);
  const filtered = allMessages.filter(m => m.type === type);
  renderMessages(filtered);
}

function renderMessages(data) {
  inbox.innerHTML = data.map(...).join(""); // כמו קודם
}

async function reply(threadId, body) {
  const res = await fetch("/reply-message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ threadId, body }),
  });
  function searchMessages() {
  const q = document.getElementById("searchBox").value.toLowerCase();
  const filtered = allMessages.filter(m =>
    m.subject.toLowerCase().includes(q) ||
    m.body.toLowerCase().includes(q) ||
    m.from.toLowerCase().includes(q)
  );
  renderMessages(filtered);
}
  // שמירת טיוטה
form.to.oninput = saveDraft;
form.subject.oninput = saveDraft;
form.body.oninput = saveDraft;

function saveDraft() {
  localStorage.setItem("draft", JSON.stringify({
    to: form.to.value,
    subject: form.subject.value,
    body: form.body.value
  }));
}

window.onload = () => {
  const draft = JSON.parse(localStorage.getItem("draft") || "{}");
  form.to.value = draft.to || "";
  form.subject.value = draft.subject || "";
  form.body.value = draft.body || "";
};
const file = document.getElementById("attachment").files[0];
let attachmentUrl = null;

if (file) {
  const formData = new FormData();
  formData.append("attachment", file);
  const uploadRes = await fetch("/upload-attachment", {
    method: "POST",
    body: formData
  });
  const uploadData = await uploadRes.json();
  attachmentUrl = uploadData.url;
}
body: JSON.stringify({
  to: form.to.value,
  subject: form.subject.value,
  body: form.body.value,
  attachment: attachmentUrl,
  type: form.type.value
})



  if (res.ok) {
    alert("תגובה נשלחה בהצלחה");
    location.reload();
  } else {
    alert("שגיאה בשליחת תגובה");
  }
}
