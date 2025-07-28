// inbox-ai.js – מקום להרחבות AI בתיבת ההודעות

// דוגמה עתידית: סיכום שיחה
/*
(async function() {
  const res = await fetch("/messages");
  const messages = await res.json();
  const thread = messages[0];
  const q = "סכם את השיחה בין המשתמשים לפי התוכן הבא: " + thread.body;
  const summary = await fetch("/api/ask-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: q })
  }).then(r => r.json());
  console.log("סיכום:", summary.answer);
})();
*/

