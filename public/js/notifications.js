let currentUser = "";

fetch("/api/user")
  .then(res => res.json())
  .then(user => {
    currentUser = user.username;
    checkNotifications();
    setInterval(checkNotifications, 10000);
  })
  .catch(err => {
    console.warn("⚠️ לא הצלחנו לקבל משתמש מחובר:", err);
  });

    if (!Array.isArray(messages)) {
      console.warn("⚠️ תגובת הודעות אינה מערך:", messages);
      return;
    }

    const unseen = messages.filter(
      m => m.to.includes(currentUser) && !m.seen
    ).length;

    const notif = document.getElementById("notification-icon");
    if (notif) {
      notif.innerHTML = unseen ? `🔴 ${unseen} הודעות חדשות` : "🔔";
    }
  } catch (err) {
    console.error("❌ שגיאה בשליפת הודעות:", err);
  }
}
async function fetchNotifications() {
  const res = await fetch("/api/messages");
  const all = await res.json();
  const userRes = await fetch("/api/user");
  const user = await userRes.json();
  const userEmail = user.username + "@family.local";

  const inbox = all.filter(msg => msg.to === userEmail);
  const unread = inbox.filter(msg => !msg.read);
  const container = document.getElementById("notification-container");

  container.innerHTML = "";
  if (unread.length === 0) {
    container.innerHTML = "<p>אין הודעות חדשות</p>";
    return;
  }

  unread.slice(0, 5).forEach(msg => {
    const div = document.createElement("div");
    div.className = "notif-item";
    div.innerHTML = `
      <strong>${msg.from}</strong>:
      ${msg.subject || "ללא נושא"}
      <br><small>${new Date(msg.timestamp).toLocaleString()}</small>
    `;
    container.appendChild(div);
  });
}

setInterval(fetchNotifications, 15000);
fetchNotifications();

