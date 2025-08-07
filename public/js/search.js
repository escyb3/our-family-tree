async function searchMessages() {
  const q = document.getElementById("search-box").value.toLowerCase();
  const res = await fetch(`/api/messages?user=${currentUser}`);
  const messages = await res.json();
  const result = messages.filter(m => m.subject.toLowerCase().includes(q) || m.body.toLowerCase().includes(q));
  const list = document.getElementById("search-results");
  list.innerHTML = result.map(m => `<li><strong>${m.subject}</strong>: ${m.body.slice(0, 100)}</li>`).join("");
}
