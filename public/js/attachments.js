// public/js/attachments.js
// preview selected files and upload helper used by compose.js
document.addEventListener('change', e=>{
  if (e.target.id === 'compose-attachment' || e.target.classList.contains('attachment-input')) {
    const file = e.target.files[0];
    if (!file) return;
    const previewArea = document.getElementById('attachments-area') || document.getElementById('compose-preview');
    if (!previewArea) return;
    const url = URL.createObjectURL(file);
    let html = `<div style="display:flex;gap:8px;align-items:center">
      <div class="file-icon">${file.type.startsWith('image')? '🖼️':'📎'}</div>
      <div><strong>${file.name}</strong><div style="font-size:12px;color:var(--muted)">${Math.round(file.size/1024)} KB</div></div>
      <a href="${url}" target="_blank">פתח</a>
    </div>`;
    previewArea.innerHTML = html;
  }
});
