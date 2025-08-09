// notifications.js
let notifPermission = false;
if ('Notification' in window) {
  Notification.requestPermission().then(p=>notifPermission = (p==='granted'));
}

async function pollNotifications(){
  try {
    const res = await fetch('/api/messages');
    if (!res.ok) return;
    const msgs = await res.json();
    const unread = msgs.filter(m => !m.seen && m.to && m.to.includes((localStorage.getItem('username') || '') + '@family.local'));
    const count = unread.length;
    const el = document.getElementById('notif-count');
    if (el) el.textContent = count ? `🔴 ${count}` : '';
    if (notifPermission && unread.length) {
      const m = unread[0];
      new Notification(`הודעה מ־${m.from}`, { body: m.subject || m.body.slice(0,80) });
    }
  } catch(e){}
}

setInterval(pollNotifications, 15000);
pollNotifications();
