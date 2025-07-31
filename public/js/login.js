// login.js

document.querySelector("form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.querySelector("#username").value;
  const password = document.querySelector("#password").value;

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      alert("התחברת בהצלחה!");
      window.location.href = "/"; // או /dashboard.html אם יש לך דף ראשי למשתמשים
    } else {
      alert(data.message || "שגיאה בהתחברות");
    }
  } catch (err) {
    console.error("שגיאה בעת ניסיון התחברות:", err);
    alert("שגיאה בשרת. נסה שוב מאוחר יותר.");
  }
});
