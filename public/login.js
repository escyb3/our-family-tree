document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const data = await res.json();
        alert("❌ שגיאה בהתחברות: " + data.message);
        return;
      }

      const data = await res.json();
      console.log("✅ התחברות הצליחה:", data);
      location.href = "/index.html";

    } catch (err) {
      console.error("⚠️ שגיאה בלתי צפויה:", err);
      alert("שגיאה בשרת");
    }
  });
});
