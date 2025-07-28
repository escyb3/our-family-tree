(async function() {
  const res = await fetch("/messages");
  const messages = await res.json();
  const freq = {};
  messages.forEach(m => {
    freq[m.from] = (freq[m.from] || 0) + 1;
  });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  document.getElementById("contact-list").innerHTML =
    sorted.slice(0, 5).map(([name, count]) => `<li>${name} (${count})</li>`).join("");
})();
