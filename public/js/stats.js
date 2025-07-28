(async function() {
  const res = await fetch("/messages");
  const messages = await res.json();
  const stats = {
    סה"כ: messages.length,
    משפחה: messages.filter(m => m.type === "family").length,
    מנהל: messages.filter(m => m.type === "admin").length
  };
  document.getElementById("stats-content").innerHTML =
    Object.entries(stats).map(([k, v]) => `<p>${k}: ${v}</p>`).join("");
})();
