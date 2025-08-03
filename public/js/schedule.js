document.getElementById("send-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const scheduled = document.getElementById("send-time").value;
  const data = {
    to: form.to.value,
    subject: form.subject.value,
    body: form.body.value,
    type: form.type.value,
    sendAt: scheduled || null
  };
  await fetch("/api/schedule-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  form.reset();
});
