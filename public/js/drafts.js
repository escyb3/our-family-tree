// public/js/drafts.js
// load drafts UI in a separate page or via sidebar
(async function(){
  const list = document.getElementById('messages-list') || document.getElementById('drafts-list');
  async function loadDrafts(){
    try {
      const res = await fetch('/api/drafts');
      if (!res.ok) throw new Error('no drafts');
      const drafts = await res.json();
      renderDrafts(drafts);
    } catch (e) {
      console.error('❌ שגיאה בטעינת טיוטות:', e);
      if (list) list.innerHTML = '<div style="padding:12px;color:#a00">לא ניתן לטעון טיוטות</div>';
    }
  }
  function renderDrafts(drafts){
    const container = document.getElementById('drafts-list') || list;
    if (!container) return;
    if (!drafts.length) { container.innerHTML = '<div style="padding:10px">אין טיוטות</div>'; return; }
    container.innerHTML = drafts.map(d=>{
      return `<div class="msg-row" data-id="${d.id||d.timestamp}">
        <div class="msg-meta"><strong>${d.subject||'(טיוטה)'}</strong><div class="msg-sub">${d.to} · ${new Date(d.timestamp).toLocaleString()}</div></div>
        <div style="margin-left:auto"><button data-load="${d.id||d.timestamp}">ערוך</button> <button data-del="${d.id||d.timestamp}">מחק</button></div>
      </div>`;
    }).join('');
  }
  document.body.addEventListener('click', async e=>{
    if (e.target.dataset.load) {
      const id = e.target.dataset.load;
      const res = await fetch('/api/draft?username='+encodeURIComponent(window.currentUser||'')); // server returns drafts for user
      const drafts = await res.json();
      const d = drafts.find(x=> (x.id||x.timestamp) === id );
      if (!d) return alert('טיוטה לא נמצאה');
      // open compose with values
      document.getElementById('compose-to').value = d.to || '';
      document.getElementById('compose-subject').value = d.subject || '';
      document.getElementById('compose-body').value = d.body || '';
      document.getElementById('compose-modal').classList.remove('hidden');
    }
    if (e.target.dataset.del) {
      const id = e.target.dataset.del;
      if (!confirm('למחוק את הטיוטה?')) return;
      await fetch(`/api/draft/${id}`, { method:'DELETE' });
      loadDrafts();
    }
  });
  loadDrafts();
  window.loadDrafts = loadDrafts;
})();
