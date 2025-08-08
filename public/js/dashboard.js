// public/js/dashboard.js
// פשוט מציג נתונים בסיסיים; מומלץ לשלב ספריית גרפים בצד לקוח (Chart.js)
async function loadDashboard(){
  try {
    const res = await fetch('/api/stats');
    const stats = await res.json();
    const el = document.getElementById('dashboard-root');
    if (!el) return;
    el.innerHTML = `<div>נשלחו: ${stats.sent}</div><div>התקבלו: ${stats.received}</div><div>לא נקראו: ${stats.unread}</div>`;
  } catch(e){
    console.error('dashboard error', e);
  }
}
document.addEventListener('DOMContentLoaded', loadDashboard);
