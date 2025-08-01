document.addEventListener("DOMContentLoaded", () => {
  const createThreadBtn = document.getElementById("create-thread-btn");
  if (createThreadBtn) {
    createThreadBtn.addEventListener("click", createThread);
  }

  loadThreads();
});

async function loadThreads() {
  try {
    const res = await fetch("/api/forum/threads");
    const threads = await res.json();

    const container = document.getElementById("threads-container");
    if (!container) {
      console.error("❌ threads-container לא נמצא");
      return;
    }

    container.innerHTML = "";

    if (threads.length === 0) {
      container.innerHTML = "<p>אין שרשורים עדיין.</p>";
      return;
    }

    threads.forEach(thread => {
      const threadEl = document.createElement("div");
      threadEl.classList.add("thread");
      threadEl.innerHTML = `
        <h3>${thread.title}</h3>
        <p><b>${thread.author}</b> - ${new Date(thread.date).toLocaleString()}</p>
        <p>${thread.content}</p>
        <div class="replies">
          ${thread.replies.map(r => `
            <div class="reply">
              <p><b>${r.author}</b>: ${r.text}</p>
            </div>`).join("")}
        </div>
        <div class="reply-form">
          <input type="text" placeholder="תגובה..." id="reply-${thread.id}" />
          <button onclick="replyToThread('${thread.id}')">הגב</button>
        </div>
        <hr>
      `;
      container.appendChild(threadEl);
    });

  } catch (err) {
    console.error("שגיאה בטעינת שרשורים:", err);
  }
}

async function createThread() {
  const title = document.getElementById("thread-title")?.value.trim();
  const content = document.getElementById("thread-content")?.value.trim();

  if (!title || !content) {
    return alert("יש למלא כותרת ותוכן");
  }

  try {
    const res = await fetch("/api/forum/thread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content })
    });

    if (!res.ok) throw new Error("שגיאה ביצירת שרשור");
    document.getElementById("thread-title").value = "";
    document.getElementById("thread-content").value = "";
    loadThreads();
  } catch (err) {
    console.error("שגיאה ביצירת שרשור:", err);
    alert("❌ שגיאה ביצירת שרשור");
  }
}
function formatDate(dateStr) {
  const options = { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateStr).toLocaleString('he-IL', options);
}
const date = formatDate(thread.createdAt);

async function replyToThread(threadId) {
  const input = document.getElementById(`reply-${threadId}`);
  const text = input?.value.trim();
  if (!text) return;

  try {
    const res = await fetch(`/api/forum/thread/${threadId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    if (!res.ok) throw new Error("שגיאה בשליחת תגובה");
    input.value = "";
    loadThreads();
  } catch (err) {
    console.error("❌ שגיאה בשליחת תגובה:", err);
    alert("שגיאה בשליחת תגובה");
  }
}
