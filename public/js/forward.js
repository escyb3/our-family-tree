// js/forward.js

function forwardMessage(msg) {
  const form = document.getElementById("send-form");
  toggleCompose(true);

  form.subject.value = "Fw: " + msg.subject;
  form.body.value = `---------- הודעה מועברת ----------\nמאת: ${msg.from}\nתאריך: ${new Date(msg.timestamp).toLocaleString()}\n\n${msg.body}`;
  form.to.focus();
}
