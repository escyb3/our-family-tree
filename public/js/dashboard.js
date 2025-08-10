// public/js/dashboard.js
// טעינה ועיבוד נתונים ללוח המחוונים
// הקוד מעודכן כדי להשתמש בנתיב ה-API הקיים /api/messages
async function loadDashboard() {
    // בדיקה נוספת לוודא שהמשתמש מחובר לפני קריאת ה-API
    if (!window.currentUser || !window.currentUser.username) {
        console.warn('⚠️ המשתמש לא מחובר, לא ניתן לטעון את לוח המחוונים.');
        return;
    }

    try {
        // משיכת כל ההודעות מהשרת
        const res = await fetch('/api/messages');
        if (!res.ok) {
            throw new Error('שגיאה בטעינת נתוני לוח המחוונים');
        }
        const messages = await res.json();

        // בגלל מגבלות סביבת הקנבס, אנו מניחים ש-window.currentUser מוגדר
        const currentUser = window.currentUser.username;

        // חישוב הנתונים מהרשימה המלאה של ההודעות
        const sentCount = messages.filter(m => m.from && m.from.includes(currentUser)).length;
        const receivedCount = messages.filter(m => m.to && m.to.includes(currentUser)).length;
        const unreadCount = messages.filter(m => m.to && m.to.includes(currentUser) && !m.seen).length;

        const el = document.getElementById('dashboard-root');
        if (!el) {
            console.error('אלמנט ה-dashboard-root לא נמצא');
            return;
        }

        // הצגת הנתונים בלוח המחוונים
        el.innerHTML = `
            <div style="padding:10px; border-bottom:1px solid #eee"><strong>הודעות שנשלחו:</strong> ${sentCount}</div>
            <div style="padding:10px; border-bottom:1px solid #eee"><strong>הודעות שהתקבלו:</strong> ${receivedCount}</div>
            <div style="padding:10px;"><strong>הודעות שלא נקראו:</strong> ${unreadCount}</div>
        `;
    } catch (e) {
        console.error('❌ שגיאה בטעינת נתוני לוח המחוונים:', e);
        const el = document.getElementById('dashboard-root');
        if (el) {
            el.innerHTML = '<div style="padding:12px;color:#a00">לא ניתן לטעון את לוח המחוונים</div>';
        }
    }
}

// פונקציה אתחול, נקראת רק לאחר אימות המשתמש
function startDashboard() {
    loadDashboard();
    // ניתן גם לבצע ריענון אוטומטי של הנתונים, במידת הצורך
    setInterval(loadDashboard, 60_000);
}

// האזנה לאירוע שהמשתמש מחובר
window.addEventListener('user-authenticated', startDashboard);

// אם המשתמש כבר מחובר בעת טעינת הדף, נתחיל את הלוגיקה מיד
if (window.currentUser) {
    startDashboard();
}
