// js/drafts.js

function saveDraft() {
  const form = document.getElementById("send-form");
  const draft = {
    to: form.querySelector("#to").value,
    subject: form.querySelector("#subject").value,
    body: form.querySelector("#body").value,
    type: form.querySelector("#type").value,
    timestamp: Date.now()
  };

  let drafts = JSON.parse(localStorage.getItem("drafts") || "[]");
  drafts.push(draft);
  localStorage.setItem("drafts", JSON.stringify(drafts));
  alert("💾 טיוטה נשמרה!");
  form.reset();
}

// הצגת טיוטות קיימות (למשל בעת טעינת הדף)
function loadDrafts() {
  const drafts = JSON.parse(localStorage.getItem("drafts") || "[]");
  if (drafts.length === 0) return;

  const container = document.createElement("div");
  container.innerHTML = "<h4>📂 טיוטות שמורות</h4>";
  drafts.forEach((d, i) => {
    const div = document.createElement("div");
    div.className = "msg-card";
    div.innerHTML = `
      <strong>${d.subject || "ללא נושא"}</strong> <br>
      <small>${new Date(d.timestamp).toLocaleString()}</small>
      <p>${d.body.slice(0, 100)}...</p>
      <button onclick="useDraft(${i})">✏️ ערוך</button>
      <button onclick="deleteDraft(${i})">🗑️ מחק</button>
    `;
    container.appendChild(div);
  });

  document.querySelector(".content").prepend(container);
}

function useDraft(index) {
  const drafts = JSON.parse(localStorage.getItem("drafts") || "[]");
  const draft = drafts[index];
  if (!draft) return;

  const form = document.getElementById("send-form");
  form.classList.add("show");
  form.querySelector("#to").value = draft.to;
  form.querySelector("#subject").value = draft.subject;
  form.querySelector("#body").value = draft.body;
  form.querySelector("#type").value = draft.type;
}

function deleteDraft(index) {
  let drafts = JSON.parse(localStorage.getItem("drafts") || "[]");
  drafts.splice(index, 1);
  localStorage.setItem("drafts", JSON.stringify(drafts));
  location.reload();
}

// הפעלה אוטומטית
document.addEventListener("DOMContentLoaded", loadDrafts);
