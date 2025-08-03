// js/drafts.js

async function loadDrafts() {
  try {
    const res = await fetch("/api/drafts");
    const drafts = await res.json();

    const container = document.getElementById("drafts-list");
    if (!container) return;

    container.innerHTML = drafts.map(d => `
      <div class="draft-card">
        <p><strong>${d.subject}</strong></p>
        <p>${d.body}</p>
        <button onclick="editDraft('${d._id}')">✏️ ערוך</button>
        <button onclick="deleteDraft('${d._id}')">🗑️ מחק</button>
      </div>
    `).join("");
  } catch (err) {
    console.error("❌ שגיאה בטעינת טיוטות:", err);
  }
}

async function deleteDraft(id) {
  await fetch(`/api/draft/${id}`, { method: "DELETE" });
  loadDrafts();
}

async function editDraft(id) {
  const res = await fetch(`/api/draft/${id}`);
  const draft = await res.json();
  const form = document.getElementById("send-form");

  form.to.value = draft.to;
  form.subject.value = draft.subject;
  form.body.value = draft.body;
  form.dataset.draftId = id;

  toggleCompose(true);
}
