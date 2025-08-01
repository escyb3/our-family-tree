const currentUser = window.currentUser || sessionStorage.getItem("username");

setInterval(async () => {
  try {
    const res = await fetch("/api/messages");
    const messages = await res.json();

    if (!Array.isArray(messages)) {
      console.warn("⚠️ תגובת הודעות אינה מערך:", messages);
      return;
    }

    const notif = document.getElementById("notifications");
    if (!notif) return;
    
window.currentUser = window.currentUser || localStorage.getItem("username");
    notif.innerHTML = unseen ? `🔴 ${unseen} הודעות חדשות` : "";
  } catch (err) {
    console.error("❌ שגיאה בשליפת הודעות:", err);
  }
}, 10000);
