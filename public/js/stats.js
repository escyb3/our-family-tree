(async function() {
  try {
    const res = await fetch("/api/messages");
    const messages = await res.json();

    if (!Array.isArray(messages)) {
      console.warn("⚠️ התגובה מהשרת אינה מערך:", messages);
      return;
    }

    const stats = {
      "סה\"כ": messages.length,
      "משפחה": messages.filter(m => m.type === "family").length,
      "מנהל": messages.filter(m => m.type === "admin").length
    };

    const container = document.getElementById("stats-content");
    if (!container) return;

    container.innerHTML = Object.entries(stats)
      .map(([k, v]) => `<p>${k}: ${v}</p>`)
      .join("");

  } catch (err) {
    console.error("❌ שגיאה בשליפת סטטיסטיקות:", err);
  }
})();
