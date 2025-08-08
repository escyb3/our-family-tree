// 📅 calendar.js – לוח שנה בסיסי
async function scheduleReminder(messageId, isoTime) {
  const res = await fetch('/api/events', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title:'תזכורת להודעה '+messageId, start: isoTime, extendedProps:{ messageId } })});
  return res.ok;
}
