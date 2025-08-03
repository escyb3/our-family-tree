function toggleFavorite(id) {
  fetch(`/api/message/${id}/favorite`, { method: "POST" }).then(loadMessages);
}

function renderMessageCard(msg) {
  return `
    <div class="msg-card ${msg.favorite ? 'important' : ''}">
      <strong>${msg.subject}</strong>
      <button onclick="toggleFavorite('${msg.id}')">${msg.favorite ? '★' : '☆'}</button>
      ...
    </div>
  `;
}
