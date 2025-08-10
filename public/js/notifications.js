// public/js/notifications.js
// ניהול התראות בדפדפן עבור הודעות חדשות

let notifPermission = false;

// פונקציה לבקשת אישור התראות, מתבצעת רק לאחר אימות המשתמש
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(p => {
            notifPermission = (p === 'granted');
            console.log(`אישור התראות: ${notifPermission}`);
        });
    }
}

// פונקציה לטעינה ולבדיקה של התראות חדשות
async function pollNotifications() {
    // בדיקה נוספת לוודא שהמשתמש מחובר לפני קריאת ה-API
    if (!window.currentUser || !window.currentUser.username) {
        console.warn('⚠️ המשתמש לא מחובר, לא ניתן לבדוק התראות.');
        return;
    }

    try {
        const res = await fetch('/api/messages');
        if (!res.ok) {
            console.error('שגיאה בקבלת הודעות, לא ניתן לבדוק התראות.');
            return;
        }
        const msgs = await res.json();
        const currentUser = window.currentUser.username;

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

// פונקציה אתחול, נקראת רק לאחר אימות המשתמש
function start() {
    requestNotificationPermission();
    pollNotifications();
    setInterval(pollNotifications, 15000);
}

// האזנה לאירוע שהמשתמש מחובר
window.addEventListener('user-authenticated', start);

// אם המשתמש כבר מחובר בעת טעינת הדף, נתחיל את הלוגיקה מיד
if (window.currentUser) {
    start();
}
