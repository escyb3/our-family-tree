const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const messages = document.getElementById("messages");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  appendMessage("👤 אתה", userMessage);
  input.value = "";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage })
    });

    const data = await response.json();
    appendMessage("🤖 AI משפחתי", data.reply);
  } catch (error) {
    appendMessage("🤖", "אירעה שגיאה. נסה שוב מאוחר יותר.");
  }
});

function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = "message";
  msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
}
