// public/js/notifications.js
// ניהול התראות בדפדפן עבור הודעות חדשות
let notifPermission = false;
// בדיקה אם הדפדפן תומך בהתראות ואישור מהמשתמש
if ('Notification' in window) {
  Notification.requestPermission().then(p => {
    notifPermission = (p === 'granted');
  });
}

// פונקציה לטעינה ולבדיקה של התראות חדשות
async function pollNotifications() {
  try {
    const res = await fetch('/api/messages');
    if (!res.ok) {
      console.error('שגיאה בקבלת הודעות, לא ניתן לבדוק התראות.');
      return;
    }
    const msgs = await res.json();
    const currentUser = window.currentUser || '';

    // סינון הודעות שלא נקראו עבור המשתמש הנוכחי
    const unread = msgs.filter(m => !m.seen && m.to && m.to.includes(currentUser));
    const count = unread.length;
    const el = document.getElementById('notif-count');

    // עדכון מונה ההתראות ב-UI
    if (el) {
      el.textContent = count ? `🔴 ${count}` : '';
    }

    // אם יש הודעות חדשות ואישור התראות, הצגת התראה בדפדפן
    if (notifPermission && unread.length) {
      const m = unread[0];
      new Notification(`הודעה מ־${m.from}`, {
        body: m.subject || (m.body ? m.body.slice(0, 80) : '(ללא תוכן)')
      });
    }
  } catch (e) {
    console.error('❌ שגיאה בבדיקת התראות:', e);
  }
}

// קריאה ראשונית לפונקציה
pollNotifications();

// הגדרת בדיקה תקופתית כל 15 שניות
setInterval(pollNotifications, 15000);
