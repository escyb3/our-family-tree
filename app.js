// app.js

document.addEventListener("DOMContentLoaded", () => {
  const lang = document.documentElement.lang || "he";
  const welcome = {
    he: "ברוכים הבאים לאתר אילן היוחסין המשפחתי שלנו!",
    en: "Welcome to our family tree website!",
  };

  document.querySelector("#welcome-msg").textContent = welcome[lang];

  // AI Chat Initialization
  const chatForm = document.getElementById("chat-form");
  const chatBox = document.getElementById("chat-box");

  chatForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = chatForm.querySelector("input").value;
    if (!input) return;

    addChatMessage("🧑‍💬", input);

    const res = await fetch("/api/ask-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: input }),
    });
    const data = await res.json();
    addChatMessage("🤖", data.reply);
    chatForm.reset();
  });

  function addChatMessage(sender, message) {
    const msg = document.createElement("div");
    msg.innerHTML = `<strong>${sender}</strong>: ${message}`;
    msg.classList.add("chat-message");
    chatBox?.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // Candle memory example
  document.querySelectorAll(".candle-form")?.forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.querySelector("input[name='name']").value;
      const message = form.querySelector("textarea").value;
      const candle = document.createElement("div");
      candle.classList.add("candle");
      candle.innerHTML = `🕯️ <strong>${name}</strong>: ${message}`;
      form.parentElement.appendChild(candle);
      form.reset();
    });
  });

  // Language switcher (optional future)
  const langBtn = document.getElementById("lang-switch");
  langBtn?.addEventListener("click", () => {
    window.location.href = window.location.href.includes("/en")
      ? "/index.html"
      : "/en/index.html";
  });

  // Access management
  fetch("/api/user-info")
    .then((res) => res.json())
    .then((data) => {
      const { role, familySide } = data;
      document.body.classList.add(`role-${role}`);
      document.body.classList.add(`side-${familySide}`);
    });
});
