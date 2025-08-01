// inbox-ai.js – הרחבות AI לתיבת ההודעות

const summarizeBtn = document.getElementById("ai-summary");

if (summarizeBtn) {
  summarizeBtn.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/messages");
      const messages = await res.json();

      if (!Array.isArray(messages) || messages.length === 0) {
        alert("אין הודעות לסיכום.");
        return;
      }

      // קיבוץ לפי threadId
      const threads = {};
      messages.forEach(msg => {
        if (!threads[msg.threadId]) threads[msg.threadId] = [];
        threads[msg.threadId].push(msg);
      });

      // נבחר את השרשור האחרון
      const lastThread = Object.values(threads).sort((a, b) => {
        const aTime = new Date(a[0]?.timestamp || 0);
        const bTime = new Date(b[0]?.timestamp || 0);
        return bTime - aTime;
      })[0];

      const fullContent = lastThread.map(m => `${m.from}: ${m.body}`).join("\n");

      const question = `סכם את השיחה הבאה בין בני המשפחה:\n${fullContent}`;

      const response = await fetch("/api/ask-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });

      const json = await response.json();

      alert("🤖 סיכום השיחה:\n" + json.answer);
    } catch (err) {
      console.error("❌ שגיאת סיכום AI:", err);
      alert("אירעה שגיאה בסיכום השיחה");
    }
  });
}
