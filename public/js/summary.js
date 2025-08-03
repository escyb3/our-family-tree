async function summarizeThreadById(threadId) {
  const res = await fetch(`/api/thread/${threadId}`);
  const thread = await res.json();
  const question = "סכם את השיחה הבאה:\n\n" + thread.messages.map(m => `${m.from}: ${m.body}`).join("\n");
  const summary = await fetch("/api/ask-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question })
  }).then(r => r.json());
  document.getElementById("thread-summary").innerText = summary.answer;
}
