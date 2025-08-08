// public/js/compose.js
(() => {
  const toggle = document.getElementById('compose-toggle');
  const modal = document.getElementById('compose-modal');
  const form = document.getElementById('compose-form');
  const sendBtn = document.getElementById('send-now');
  const saveDraftBtn = document.getElementById('save-draft');
  const autosaveIndicator = document.getElementById('compose-autosave');
  let autosaveTimer = null;
  const ATTACH = document.getElementById('compose-attachment');

  function showCompose(show=true){
    modal.classList.toggle('hidden', !show);
    modal.setAttribute('aria-hidden', !show);
  }

  toggle.addEventListener('click', ()=> showCompose(true));
  // Close on outside click
  window.addEventListener('click', e=>{
    if (!document.getElementById('compose-modal').contains(e.target) && !document.getElementById('compose-toggle').contains(e.target)) {
      showCompose(false);
    }
  });

  // Ctrl+Enter to send
  document.getElementById('compose-body').addEventListener('keydown', e=>{
    if (e.ctrlKey && e.key==='Enter') {
      e.preventDefault();
      sendNow();
    }
  });

  sendBtn.addEventListener('click', sendNow);
  saveDraftBtn.addEventListener('click', saveDraft);

  async function sendNow(){
    const to = document.getElementById('compose-to').value;
    const subject = document.getElementById('compose-subject').value;
    const body = document.getElementById('compose-body').value;
    const type = document.getElementById('compose-type').value;
    const fd = new FormData();
    fd.append('to', to);
    fd.append('subject', subject);
    fd.append('body', body);
    fd.append('type', type);
    if (ATTACH.files[0]) fd.append('attachment', ATTACH.files[0]);
    try {
      const res = await fetch('/api/send', { method:'POST', body: fd });
      if (!res.ok) throw new Error('send failed');
      autosaveIndicator.textContent = 'נשלח בהצלחה';
      form.reset();
      showCompose(false);
      // refresh inbox
      if (window.fetchMessages) window.fetchMessages();
    } catch (err) {
      console.error(err);
      alert('שגיאה בשליחה');
    }
  }

  async function saveDraft(){
    const to = document.getElementById('compose-to').value;
    const subject = document.getElementById('compose-subject').value;
    const body = document.getElementById('compose-body').value;
    const draft = { to, subject, body, timestamp: new Date().toISOString(), owner: window.currentUser || 'unknown' };
    try {
      const res = await fetch('/api/save-draft', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(draft) });
      if (!res.ok) throw new Error('save draft failed');
      autosaveIndicator.textContent = 'טיוטה נשמרה';
    } catch(e){ console.error(e); autosaveIndicator.textContent = 'שגיאה בשמירת טיוטה'; }
  }

  // autosave every 60s
  function startAutosave(){
    if (autosaveTimer) clearInterval(autosaveTimer);
    autosaveTimer = setInterval(()=>{
      const subject = document.getElementById('compose-subject').value;
      const body = document.getElementById('compose-body').value;
      if (!subject && !body) return;
      saveDraft();
      autosaveIndicator.textContent = `טיוטה נשמרה אוטומטית ${new Date().toLocaleTimeString()}`;
    }, 60_000);
  }
  startAutosave();

  // simple autocomplete for users (fetch from /api/users)
  const toInput = document.getElementById('compose-to');
  let usersCache = [];
  toInput.addEventListener('input', async (e)=>{
    try {
      if (!usersCache.length) {
        const res = await fetch('/api/users'); if (!res.ok) throw 0;
        usersCache = await res.json();
      }
      // show simple suggestions below input (naive)
      const val = toInput.value;
      const suggestions = usersCache.filter(u => u.username?.includes(val) || u.email?.includes(val)).slice(0,6);
      // for brevity: use browser native datalist
      let dl = document.getElementById('to-datalist');
      if (!dl) { dl = document.createElement('datalist'); dl.id='to-datalist'; document.body.appendChild(dl); toInput.setAttribute('list','to-datalist'); }
      dl.innerHTML = suggestions.map(s=>`<option value="${s.username||s.email}">`).join('');
    } catch(e){}
  });
})();
