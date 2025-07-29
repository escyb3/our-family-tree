// public/forum.js

document.addEventListener("DOMContentLoaded", () => {
  const threadsList = document.getElementById("threads-list");
  const threadView = document.getElementById("thread-view");
  const threadTitle = document.getElementById("thread-title");
  const threadContent = document.getElementById("thread-content");
  const threadForm = document.getElementById("new-thread-form");
  const replyForm = document.getElementById("reply-form");
  const replyInput = document.getElementById("reply-input");
  const categorySelect = document.getElementById("category");
  const userNameDisplay = document.getElementById("user-name-display");

  let currentUser = null;
  let currentThreadId = null;

  fetch("/api/user")
    .then((res) => res.json())
    .then((user) => {
      currentUser = user;
      userNameDisplay.textContent = `התחברת כ-${user.username}`;
    });

  function loadThreads() {
    fetch("/api/forum")
      .then((res) => res.json())
      .then((threads) => {
        threadsList.innerHTML = "";
        threads.forEach((thread) => {
          const div = document.createElement("div");
          div.className =
            "bg-white rounded-xl p-4 shadow-md cursor-pointer hover:bg-gray-100 transition-all";
          div.innerHTML = `
            <div class="flex justify-between">
              <h3 class="text-xl font-semibold">${thread.title}</h3>
              <span class="text-sm text-gray-500">${new Date(
                thread.createdAt
              ).toLocaleString()}</span>
            </div>
            <div class="text-sm text-gray-600">${
              thread.username
            } - קטגוריה: ${thread.category || "כללי"}</div>
            <div class="text-xs text-gray-400">${
              thread.replies?.length || 0
            } תגובות</div>
          `;
          div.addEventListener("click", () => openThread(thread._id));
          threadsList.appendChild(div);
        });
      });
  }

  function openThread(id) {
    fetch(`/api/forum/${id}`)
      .then((res) => res.json())
      .then((thread) => {
        currentThreadId = thread._id;
        threadView.classList.remove("hidden");
        threadTitle.textContent = thread.title;
        threadContent.innerHTML = `
          <div class="mb-4 p-4 rounded-md bg-gray-100">
            <div class="text-sm text-gray-600 mb-2">${
              thread.username
            } - ${new Date(thread.createdAt).toLocaleString()}</div>
            <div class="text-base">${thread.body}</div>
          </div>
          <hr class="my-4" />
        `;
        thread.replies?.forEach((reply) => {
          const replyDiv = document.createElement("div");
          replyDiv.className = "border-t pt-2 mt-2 text-sm text-gray-700";
          replyDiv.innerHTML = `
            <div class="text-gray-600">${reply.username} - ${new Date(
            reply.createdAt
          ).toLocaleString()}</div>
            <div>${reply.body}</div>
          `;
          threadContent.appendChild(replyDiv);
        });
      });
  }

  threadForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("title").value;
    const body = document.getElementById("body").value;
    const category = categorySelect.value;
    fetch("/api/forum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, category }),
    })
      .then((res) => res.json())
      .then(() => {
        threadForm.reset();
        loadThreads();
      });
  });

  replyForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const body = replyInput.value;
    fetch(`/api/forum/${currentThreadId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    })
      .then((res) => res.json())
      .then(() => {
        replyInput.value = "";
        openThread(currentThreadId);
      });
  });

  loadThreads();
});
