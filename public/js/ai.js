async function summarizeThread(content) {
  const res = await fetch("/api/ai/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  const json = await res.json();
  document.getElementById("summary").textContent = json.summary;
}
