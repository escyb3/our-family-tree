//js/notifications.js
setInterval(async () => {
  const res = await fetch("/messages");
  const messages = await res.json();
  const unseen = messages.filter(m => !m.seen).length;
  const notif = document.getElementById("notifications");
  notif.innerHTML = unseen ? `🔴 ${unseen} הודעות חדשות` : "";
}, 10000);
