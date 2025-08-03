document.addEventListener("DOMContentLoaded", async () => {
  const threadList = document.getElementById("threadList");
  const newThreadForm = document.getElementById("newThreadForm");
  const usernameDisplay = document.getElementById("usernameDisplay");
  id="threadsContainer"

  // בדיקת משתמש מחובר
  let currentUser = null;
  try {
    const res = await fetch("/api/user");
    if (res.ok) {
      const user = await res.json();
      currentUser = user;
      if (usernameDisplay) {
        usernameDisplay.textContent = `מחובר כ־${user.username}`;
      }
    } else {
      location.href = "/login.html";
    }
  } catch (err) {
    console.error("שגיאה בבדיקת התחברות:", err);
    location.href = "/login.html";
  }

  // טוען את כל השרשורים
  async function loadThreads() {
    try {
      const res = await fetch("/api/forum/threads");
      const threads = await res.json();

      threadList.innerHTML = "";

      if (threads.length === 0) {
        threadList.innerHTML = "<p>אין עדיין דיונים.</p>";
        return;
      }

      for (const thread of threads.reverse()) {
        const threadEl = document.createElement("div");
        threadEl.className = "thread";
        threadEl.innerHTML = `
          <h3>${thread.title}</h3>
          <p>${thread.body}</p>
          <p><strong>קטגוריה:</strong> ${thread.category}</p>
          <p><strong>נוצר על ידי:</strong> ${thread.username} בתאריך ${new Date(thread.createdAt).toLocaleString("he-IL")}</p>
          <div class="replies">
            ${thread.replies.map(r => `<div class="reply"><strong>${r.username}:</strong> ${r.body}</div>`).join("")}
          </div>
          <form class="replyForm" data-id="${thread._id}">
            <input type="text" name="body" placeholder="תגובה..." required />
            <button type="submit">שלח תגובה</button>
          </form>
        `;
        threadList.appendChild(threadEl);
      }
    } catch (err) {
      console.error("שגיאה בטעינת שרשורים:", err);
      threadList.innerHTML = "<p>שגיאה בטעינת דיונים.</p>";
    }
  }

  loadThreads();

  // שליחת דיון חדש
  if (newThreadForm) {
    newThreadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = newThreadForm.title.value.trim();
      const body = newThreadForm.content.value.trim();
      const category = newThreadForm.category.value.trim();

      if (!title || !body) return alert("יש למלא כותרת ותוכן");

      try {
        const res = await fetch("/api/forum/new", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, category }),
        });

        const result = await res.json();
        if (result.success) {
          newThreadForm.reset();
          loadThreads();
        } else {
          alert("שגיאה ביצירת דיון.");
        }
      } catch (err) {
        console.error("שגיאה בשליחת דיון:", err);
        alert("שגיאה בשרת");
      }
    });
  }

  // שליחת תגובה לדיון
  threadList.addEventListener("submit", async (e) => {
    if (!e.target.classList.contains("replyForm")) return;
    e.preventDefault();

    const form = e.target;
    const threadId = form.dataset.id;
    const body = form.body.value.trim();
    if (!body) return;

    try {
      const res = await fetch(`/api/forum/${threadId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      const result = await res.json();
      if (result.success) {
        form.reset();
        loadThreads();
      } else {
        alert("שגיאה בשליחת תגובה");
      }
    } catch (err) {
      console.error("שגיאה:", err);
      alert("שגיאה בשרת");
    }
  });
});
