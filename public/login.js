document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const error = await res.text();
        alert("❌ שגיאה בהתחברות: " + error);
        return;
      }

      const data = await res.json();
      console.log("✅ התחברות הצליחה:", data);
      location.href = "/"; // מעביר לעמוד הבית או לכל עמוד אחר
    } catch (err) {
      console.error("שגיאה בהתחברות:", err);
      alert("⚠️ שגיאה בלתי צפויה בהתחברות");
    }
  });
});
