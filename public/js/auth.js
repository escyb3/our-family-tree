// public/js/auth.js
// טפל בחיבור משתמש פשוט (מתבסס על /api/user)
window.currentUser = null;

async function loadCurrentUser() {
  try {
    const res = await fetch('/api/user');
    if (!res.ok) throw new Error('לא מחובר');
    const user = await res.json();
    window.currentUser = user.username || user;
    document.getElementById('user-label').textContent = window.currentUser;
  } catch (e) {
    console.warn('אין משתמש מחובר', e);
    document.getElementById('user-label').textContent = 'אורח';
  }
}
loadCurrentUser();
