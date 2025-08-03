// js/autocomplete.js

document.addEventListener("DOMContentLoaded", async () => {
  const toInput = document.getElementById("to");
  if (!toInput) return;

  const res = await fetch("/api/users");
  const users = await res.json();

  toInput.addEventListener("input", () => {
    const value = toInput.value.toLowerCase();
    const matches = users.filter(u => u.includes(value));
    showAutocomplete(matches);
  });

  function showAutocomplete(matches) {
    let list = document.getElementById("autocomplete-list");
    if (!list) {
      list = document.createElement("ul");
      list.id = "autocomplete-list";
      list.style.position = "absolute";
      list.style.background = "#fff";
      list.style.border = "1px solid #ccc";
      list.style.zIndex = 1000;
      toInput.parentNode.appendChild(list);
    }
    list.innerHTML = matches.map(m => `<li>${m}</li>`).join("");
    list.querySelectorAll("li").forEach(li => {
      li.onclick = () => {
        toInput.value = li.textContent;
        list.innerHTML = "";
      };
    });
  }
});
