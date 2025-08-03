// js/drafts.js

async function loadDrafts() {
  try {
    const res = await fetch("/api/drafts");
    const drafts = await res.json();
    const container = document.getElementById("drafts-container");
    container.innerHTML = "<h3>💾 טיוטות</h3>";

    if (!Array.isArray(drafts) || drafts.length === 0) {
      container.innerHTML += "<p>אין טיוטות שמורות</p>";
      return;
    }

    drafts.forEach(d => {
      const card = document.createElement("div");
      card.className = "msg-card";
      card.innerHTML = `
        <strong>${d.subject || "(ללא נושא)"}</strong><br>
        <small>${d.to || "(לא נבחר נמען)"}</small><br>
        <p>${d.body || ""}</p>
        <div class="actions">
          <button onclick='loadDraft(${JSON.stringify(d)})'>✏️ ערוך</button>
          <button onclick='deleteDraft("${d._id}")'>🗑️ מחק</button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("❌ שגיאה בטעינת טיוטות:", err);
  }
}

function saveDraft() {
  const draft = {
    to: document.getElementById("to").value,
    subject: document.getElementById("subject").value,
    body: document.getElementById("body").value,
    type: document.getElementById("type").value,
  };

  fetch("/api/save-draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  })
    .then(res => res.json())
    .then(() => {
      alert("📥 הטיוטה נשמרה!");
      loadDrafts();
    });
}

function deleteDraft(id) {
  if (!confirm("האם למחוק טיוטה זו?")) return;

  fetch(`/api/draft/${id}`, { method: "DELETE" })
    .then(res => res.json())
    .then(() => loadDrafts());
}

function loadDraft(draft) {
  document.getElementById("to").value = draft.to || "";
  document.getElementById("subject").value = draft.subject || "";
  document.getElementById("body").value = draft.body || "";
  document.getElementById("type").value = draft.type || "אישי";

  const form = document.getElementById("send-form");
  form.classList.add("show");
}

// טען טיוטות בהפעלה
document.addEventListener("DOMContentLoaded", loadDrafts);
