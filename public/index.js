document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/api/user");
    if (res.ok) {
      const data = await res.json();
      console.log("✅ מחובר כ:", data.user);

      // מציג אזור פרטי
      document.getElementById("private-section").classList.remove("hidden");
      document.getElementById("logout-btn").classList.remove("hidden");
    } else {
      console.log("❌ לא מחובר");
      document.getElementById("login-warning").classList.remove("hidden");
    }
  } catch (err) {
    console.error("⚠️ בעיית תקשורת:", err);
  }

  // התנתקות
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" });
    location.reload();
  });
});
