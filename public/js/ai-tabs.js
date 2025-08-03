async function autoTagMessage(subject, body) {
  const res = await fetch("/api/ask-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: `סווג את ההודעה לנושא: ${subject}\n${body}` })
  });
  const data = await res.json();
  return data.answer?.trim().toLowerCase() || "אחר";
}

// שימוש לדוגמה:
document.getElementById("send-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const subject = form.subject.value;
  const body = form.body.value;
  const tag = await autoTagMessage(subject, body);
  form.type.value = tag;
});
