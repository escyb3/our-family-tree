// public/js/notifications.js
// ניהול התראות על הודעות חדשות
let notifPermission = false;
if ('Notification' in window) {
  // מבקש הרשאת התראות מהמשתמש
  Notification.requestPermission().then(p => notifPermission = (p === 'granted'));
}

async function pollNotifications() {
  try {
    // מבצע קריאה לשרת כדי לקבל את רשימת ההודעות
    const res = await fetch('/api/messages');
    if (!res.ok) {
      // אם הקריאה נכשלת, פשוט חוזר בלי להציג שגיאה גלויה למשתמש
      // console.error("שגיאה בשליפת הודעות להתראות");
      return;
    }
    const msgs = await res.json();
    
    // נקודת התיקון: שימוש ב-window.currentUser כדי להתאים לקוד הקיים
    const currentUser = window.currentUser || ''; 
    
    // מסנן את ההודעות כדי למצוא הודעות שלא נקראו ושייכות למשתמש הנוכחי
    const unread = msgs.filter(m => !m.seen && m.to && m.to.includes(currentUser));
    const count = unread.length;
    const el = document.getElementById('notif-count');
    
    // מעדכן את ספירת ההודעות שלא נקראו ב-UI
    if (el) {
      el.textContent = count ? `🔴 ${count}` : '';
    }
    
    // מציג התראת דפדפן אם יש הודעות חדשות והרשאה קיימת
    if (notifPermission && unread.length) {
      const m = unread[0];
      new Notification(`הודעה חדשה מ־${m.from}`, { body: m.subject || (m.body ? m.body.slice(0, 80) + '...' : '') });
    }
  } catch (e) {
    // טיפול בשגיאות באופן שקט כדי לא להפריע למשתמש, אך מדפיס ליומן
    console.error("שגיאה ב-pollNotifications:", e);
  }
}

// מריץ את הפונקציה מיד, ואז כל 15 שניות
setInterval(pollNotifications, 15000);
pollNotifications();
