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

async function reply(threadId, body) {
  const res = await fetch("/reply-message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ threadId, body }),
  });

  if (res.ok) {
    alert("תגובה נשלחה בהצלחה");
    location.reload();
  } else {
    alert("שגיאה בשליחת תגובה");
  }
}
