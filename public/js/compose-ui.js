// js/compose-ui.js

document.addEventListener("DOMContentLoaded", () => {
  const composeToggle = document.getElementById("compose-toggle");
  const sendForm = document.getElementById("send-form");

  composeToggle?.addEventListener("click", () => {
    sendForm.classList.toggle("show");
    if (sendForm.classList.contains("show")) {
      sendForm.scrollIntoView({ behavior: "smooth" });
    }
  });

  document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key === "Enter" && sendForm.classList.contains("show")) {
      sendForm.requestSubmit();
    }
  });

  sendForm?.addEventListener("submit", async e => {
    e.preventDefault();
    const to = sendForm.querySelector("#to").value.trim();
    const subject = sendForm.querySelector("#subject").value.trim();
    const body = sendForm.querySelector("#body").value.trim();
    const type = sendForm.querySelector("#type").value;
    const attachmentInput = sendForm.querySelector("#attachment");

    let attachmentUrl = null;
    if (attachmentInput.files.length > 0) {
      const formData = new FormData();
      formData.append("attachment", attachmentInput.files[0]);
      const res = await fetch("/upload-attachment", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      attachmentUrl = data.url;
    }

    const res = await fetch("/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body, type, attachment: attachmentUrl })
    });

    if (res.ok) {
      alert("✅ הודעה נשלחה בהצלחה!");
      sendForm.reset();
      sendForm.classList.remove("show");
      if (typeof loadMessages === "function") loadMessages();
    } else {
      alert("❌ שגיאה בשליחת ההודעה");
    }
  });
});

