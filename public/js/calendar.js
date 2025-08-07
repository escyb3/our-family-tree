// 📅 calendar.js – לוח שנה בסיסי
async function loadCalendarEvents() {
  const res = await fetch("/api/messages?user=" + currentUser);
  const messages = await res.json();
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = messages.map(m => `
    <li><strong>${m.subject}</strong> – ${new Date(m.created_at).toLocaleDateString()}</li>
  `).join("");
}
