// admin.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("createUserForm");
  const msg = document.getElementById("createUserMsg");
  const userList = document.getElementById("userList");

  // רק מנהל אמור להיות כאן → נוודא חיבור
  if (localStorage.getItem("loggedUser") !== "admin") {
    alert("רק מנהל יכול לגשת לדף זה.");
    window.location.href = "/";
  }

  // יצירת משתמש חדש
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;

    try {
      const res = await fetch("/api/createUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (data.success) {
        msg.textContent = "משתמש נוצר בהצלחה 🎉";
        loadUsers();
      } else {
        msg.textContent = data.error || "שגיאה בהוספת משתמש";
      }
    } catch (err) {
      msg.textContent = "בעיה בשרת: " + err.message;
    }
  });

  // טוען רשימת משתמשים
  async function loadUsers() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();

      userList.innerHTML = "";
      data.forEach(u => {
        const li = document.createElement("li");
        li.textContent = u.username;
        userList.appendChild(li);
      });
    } catch (err) {
      userList.innerHTML = "שגיאה בטעינת משתמשים";
    }
  }

  loadUsers();
});
