// js/forward.js
async function forwardMessage(id) {
  const res = await fetch(`/api/message/${id}`);
  const m = await res.json();
  document.getElementById("to").value = "";
  document.getElementById("subject").value = "Fw: " + m.subject;
  document.getElementById("body").value = `-- Forwarded --\nFrom: ${m.fromUser}\n${m.body}`;
  document.getElementById("type").value = m.type;
  toggleCompose(true);
}
