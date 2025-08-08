/// public/js/contacts.js
(async function(){
  const list = document.getElementById('contact-list');
  async function loadContacts(){
    try {
      const res = await fetch('/api/contacts');
      if (!res.ok) throw new Error('contacts fail');
      const contacts = await res.json();
      list.innerHTML = contacts.map(c=>`<li style="padding:6px 0">${c}</li>`).join('');
    } catch (e) {
      console.error('❌ שגיאה בטעינת אנשי קשר:', e);
      if (list) list.innerHTML = '<li>אין אנשי קשר</li>';
    }
  }
  loadContacts();
  window.loadContacts = loadContacts;
})();
