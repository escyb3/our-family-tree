// forum.js - קובץ צד לקוח ל־forum.html עם כל השדרוגים

// משתנים גלובליים
let currentUser = null;
let currentThreadId = null;

// בעת טעינת הדף
window.addEventListener("DOMContentLoaded", async () => {
  currentUser = await getCurrentUser();
  await loadThreads();
  setupNewThreadButton();
  setupLanguageToggle();
});

async function getCurrentUser() {
  try {
    const res = await fetch("/api/user");
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

async function loadThreads() {
  const res = await fetch("/api/forum/threads");
  const threads = await res.json();
  const list = document.querySelector("#thread-list");
  list.innerHTML = "";

  threads.forEach(t => {
    const div = document.createElement("div");
    div.className = "thread-item border rounded p-3 hover:bg-gray-100 cursor-pointer";
    div.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <strong>${t.title}</strong> <span class="text-sm text-gray-500">(${t.category})</span>
          <div class="text-xs text-gray-400">🧵 ${t.author} - ${new Date(t.created).toLocaleString()}</div>
        </div>
        <div class="text-sm text-blue-500">${t.replies} תגובות</div>
      </div>
    `;
    div.addEventListener("click", () => openThread(t.id));
    list.appendChild(div);
  });
}

function setupNewThreadButton() {
  document.querySelector("#new-thread-btn").addEventListener("click", () => {
    document.querySelector("#thread-form").classList.remove("hidden");
    document.querySelector("#thread-title").focus();
  });

  document.querySelector("#submit-thread").addEventListener("click", async () => {
    const title = document.querySelector("#thread-title").value.trim();
    const content = document.querySelector("#thread-content").value.trim();
    const category = document.querySelector("#thread-category").value;

    if (!title || !content) return alert("נא למלא כותרת ותוכן.");

    const res = await fetch("/api/forum/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, category })
    });

    if (res.ok) {
      document.querySelector("#thread-title").value = "";
      document.querySelector("#thread-content").value = "";
      document.querySelector("#thread-form").classList.add("hidden");
      await loadThreads();
    } else {
      alert("שגיאה ביצירת הדיון.");
    }
  });
}

async function openThread(id) {
  currentThreadId = id;
  const res = await fetch(`/api/forum/threads/${id}`);
  const thread = await res.json();
  const section = document.querySelector("#thread-view");
  section.classList.remove("hidden");

  section.innerHTML = `
    <h2 class="text-xl font-bold mb-2">${thread.title}</h2>
    <p class="text-sm text-gray-500 mb-4">🧵 ${thread.author} (${new Date(thread.created).toLocaleString()})</p>
    <p class="mb-4">${thread.content}</p>
    <hr class="my-4">
    <h3 class="font-bold mb-2">תגובות</h3>
    <div id="replies"></div>
    <textarea id="reply-text" class="w-full border p-2 mt-2 mb-2" placeholder="כתוב תגובה..."></textarea>
    <button id="submit-reply" class="bg-blue-600 text-white px-4 py-2 rounded">שלח תגובה</button>
  `;

  document.querySelector("#submit-reply").addEventListener("click", submitReply);

  const repliesDiv = document.querySelector("#replies");
  repliesDiv.innerHTML = "";
  thread.replies.forEach(r => {
    const rDiv = document.createElement("div");
    rDiv.className = "bg-gray-100 p-2 my-2 rounded";
    rDiv.innerHTML = `<strong>${r.author}</strong> <span class="text-xs text-gray-500">${new Date(r.created).toLocaleString()}</span><br>${r.content}`;
    repliesDiv.appendChild(rDiv);
  });
}

async function submitReply() {
  const content = document.querySelector("#reply-text").value.trim();
  if (!content) return;
  const res = await fetch(`/api/forum/threads/${currentThreadId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });
  if (res.ok) {
    await openThread(currentThreadId);
  } else {
    alert("שגיאה בשליחת תגובה.");
  }
}

function setupLanguageToggle() {
  const langBtn = document.querySelector("#lang-toggle");
  if (!langBtn) return;
  langBtn.addEventListener("click", () => {
    const html = document.documentElement;
    html.lang = html.lang === "he" ? "en" : "he";
    html.dir = html.dir === "rtl" ? "ltr" : "rtl";
    location.reload();
  });
}
