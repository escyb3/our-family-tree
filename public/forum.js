document.addEventListener("DOMContentLoaded", () => {
  const threadForm = document.getElementById("new-thread-form");
  const threadList = document.getElementById("thread-list");

  // שליחת טופס יצירת דיון חדש
  if (threadForm) {
    threadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("title").value;
      const body = document.getElementById("body").value;
      const category = document.getElementById("category").value;

      try {
        const res = await fetch("/api/forum", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, category })
        });

        const result = await res.json();
        alert("✅ דיון נוצר בהצלחה");
        window.location.reload();
      } catch (err) {
        console.error("❌ שגיאה ביצירת דיון:", err);
        alert("❌ שגיאה ביצירת דיון");
      }
    });
  }

  // טען את רשימת הדיונים
  async function loadThreads() {
    try {
      const res = await fetch("/api/forum");
      const threads = await res.json();

      if (!Array.isArray(threads)) {
        threadList.innerHTML = "<p>❌ שגיאה בטעינת דיונים</p>";
        return;
      }

      threadList.innerHTML = "";

      threads.reverse().forEach((thread) => {
        const div = document.createElement("div");
        div.className = "thread";
        div.innerHTML = `
          <h3>${thread.title}</h3>
          <p><strong>נושא:</strong> ${thread.category}</p>
          <p>${thread.body}</p>
          <p><em>נוצר על ידי ${thread.username || "אנונימי"} בתאריך ${new Date(thread.createdAt).toLocaleString("he-IL")}</em></p>
          <hr>
        `;
        threadList.appendChild(div);
      });
    } catch (err) {
      console.error("❌ שגיאה בטעינת דיונים:", err);
      threadList.innerHTML = "<p>❌ לא ניתן לטעון דיונים כרגע.</p>";
    }
  }

  loadThreads();
});
