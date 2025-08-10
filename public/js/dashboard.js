// public/js/dashboard.js
// טעינה ועיבוד נתונים ללוח המחוונים
// הקוד מעודכן כדי להשתמש בנתיב ה-API הקיים /api/messages
async function loadDashboard() {
  try {
    // משיכת כל ההודעות מהשרת
    const res = await fetch('/api/messages');
    if (!res.ok) {
      throw new Error('שגיאה בטעינת נתוני לוח המחוונים');
    }
    const messages = await res.json();
    
    // בגלל מגבלות סביבת הקנבס, אנו מניחים ש-window.currentUser מוגדר
    const currentUser = window.currentUser || '';

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

// טעינת לוח המחוונים ברגע שהדף נטען
document.addEventListener('DOMContentLoaded', loadDashboard);
// ניתן גם לבצע ריענון אוטומטי של הנתונים, במידת הצורך
// setInterval(loadDashboard, 60_000);
