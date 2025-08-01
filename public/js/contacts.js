// רשימת 5 אנשי הקשר המובילים
(async function() {
  try {
    const res = await fetch("/api/messages");
    const messages = await res.json();

    if (!Array.isArray(messages)) {
      console.error("⚠️ הנתונים אינם מערך:", messages);
      return;
    }

    const freq = {};
    messages.forEach(m => {
      freq[m.from] = (freq[m.from] || 0) + 1;
    });

    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const contactList = document.getElementById("contact-list");
    if (contactList) {
      contactList.innerHTML = sorted
        .slice(0, 5)
        .map(([name, count]) => `<li>${name} (${count})</li>`)
        .join("");
    }

  } catch (err) {
    console.error("❌ שגיאה בטעינת רשימת קשר:", err);
  }
})();

// רשימת כל השולחים
async function loadContacts() {
  try {
    const res = await fetch("/api/messages");
    const messages = await res.json();

    if (!Array.isArray(messages)) {
      console.error("⚠️ ההודעות אינן מערך:", messages);
      return;
    }

    const senders = [...new Set(messages.map(m => m.from))];
    const list = document.getElementById("contacts-list");
    if (list) {
      list.innerHTML = senders.map(sender => `<li>${sender}</li>`).join("");
    }

  } catch (err) {
    console.error("❌ שגיאה בטעינת אנשי קשר:", err);
  }
}

loadContacts();
