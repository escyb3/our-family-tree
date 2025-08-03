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

async function checkNotifications() {
  try {
    const res = await fetch("/api/messages");
    const messages = await res.json();

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
