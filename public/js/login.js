// login.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.querySelector("#username").value.trim();
    const password = document.querySelector("#password").value.trim();

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include", // חשוב לשמירת session
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        // התחברות הצליחה
        window.location.href = "/index";
      } else {
        const data = await res.json();
        alert(data.error || "שם משתמש או סיסמה שגויים");
      }
    } catch (err) {
      console.error("שגיאה בעת ניסיון התחברות:", err);
      alert("שגיאה בשרת. נסה שוב מאוחר יותר.");
    }
  });
});
