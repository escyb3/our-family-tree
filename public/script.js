document.addEventListener("DOMContentLoaded", async () => {
  const res = await fetch("/messages");
  const messages = await res.json();

  const list = document.getElementById("message-list");
  list.innerHTML = messages.map(m => `
    <div class="msg-card ${m.read ? '' : 'unread'}" data-thread="${m.threadId}">
      <div><strong>${m.subject}</strong></div>
      <div>מאת: ${m.from}</div>
      <div>${new Date(m.timestamp).toLocaleString()}</div>
    </div>
  `).join("");

  list.querySelectorAll(".msg-card").forEach(el => {
    el.addEventListener("click", async () => {
      const threadId = el.dataset.thread;

      // שליחה לשרת לסמן כהודעה שנקראה
      try {
        const response = await fetch(`/mark-read?threadId=${threadId}`);
        const data = await response.json();
        if (data.success) {
          el.classList.remove("unread");
        }
      } catch (err) {
        console.error("שגיאה בסימון כהודעה נקראה", err);
      }

      // כאן תוכל להוסיף פעולה לפתיחת ההודעה המלאה (modal, redirect וכו׳)
    });
  });
});
