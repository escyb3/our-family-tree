(async function loadStats() {
  const res = await fetch("/api/messages");
  const msgs = await res.json();
  const users = {};
  msgs.forEach(m => {
    users[m.from] = (users[m.from] || 0) + 1;
  });

  const statsDiv = document.getElementById("stats-content");
  statsDiv.innerHTML = Object.entries(users).map(
    ([user, count]) => `<p>${user}: ${count} הודעות</p>`
  ).join("");
})();
