document.addEventListener("DOMContentLoaded", () => {
  const threadForm = document.getElementById("thread-form");
  const threadList = document.getElementById("thread-list");

  // הצגת שרשורים קיימים
  fetch("/api/forum/threads")
    .then(res => res.json())
    .then(threads => {
      threadList.innerHTML = "";
      threads.reverse().forEach(thread => {
        const li = document.createElement("li");
        li.innerHTML = `
          <h3>${thread.title}</h3>
          <p>${thread.body}</p>
          <small>נכתב ע"י ${thread.username} ב-${new Date(thread.createdAt).toLocaleString()}</small>
          <hr>
        `;
        threadList.appendChild(li);
      });
    })
    .catch(err => {
      threadList.innerHTML = "<p>שגיאה בטעינת דיונים</p>";
      console.error("שגיאה:", err);
    });

  // יצירת דיון חדש
  threadForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = threadForm.title.value;
    const body = threadForm.body.value;

    fetch("/api/forum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, username: "משתמש" }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("הדיון נוסף בהצלחה!");
          location.reload();
        } else {
          alert("שגיאה ביצירת דיון");
        }
      })
      .catch(err => {
        alert("שגיאה בחיבור לשרת");
        console.error(err);
      });
  });
});
