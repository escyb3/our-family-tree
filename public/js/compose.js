/ public/js/compose.js

// השלם את הקוד כולו ב-DOMContentLoaded event listener.
// זה מבטיח שהקוד ירוץ רק לאחר שכל רכיבי ה-HTML נטענו.
document.addEventListener('DOMContentLoaded', () => {

    const toggle = document.getElementById('compose-toggle');
    const modal = document.getElementById('compose-modal');
    const form = document.getElementById('compose-form');
    const sendBtn = document.getElementById('send-now');
    const saveDraftBtn = document.getElementById('save-draft');
    const autosaveIndicator = document.getElementById('compose-autosave');
    const ATTACH = document.getElementById('compose-attachment');

    let autosaveTimer = null;

    // הפונקציה מציגה או מסתירה את המודאל
    function showCompose(show = true) {
        modal.classList.toggle('hidden', !show);
        modal.setAttribute('aria-hidden', !show);
        // הוסף את המאזין לסגירה רק כשהמודאל פתוח
        if (show) {
            window.addEventListener('click', closeOnOutsideClick);
        } else {
            window.removeEventListener('click', closeOnOutsideClick);
        }
    }
    
    // פונקציה מוגדרת במפורש כדי שיהיה אפשר להסיר אותה
    function closeOnOutsideClick(e) {
        if (!modal.contains(e.target) && !toggle.contains(e.target)) {
            showCompose(false);
        }
    }

    // הוספת מאזין לכפתור הפתיחה
    if (toggle) {
        toggle.addEventListener('click', () => showCompose(true));
    }
    
    // Ctrl+Enter to send
    const bodyInput = document.getElementById('compose-body');
    if (bodyInput) {
        bodyInput.addEventListener('keydown', e => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                sendNow();
            }
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', sendNow);
    }
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', saveDraft);
    }

    async function sendNow() {
        // טען את טוקן האימות
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.error('⚠️ המשתמש לא מחובר, לא ניתן לשלוח הודעה.');
            autosaveIndicator.textContent = 'שגיאה בשליחה: המשתמש לא מחובר';
            return;
        }

        const to = document.getElementById('compose-to').value;
        const subject = document.getElementById('compose-subject').value;
        const body = document.getElementById('compose-body').value;
        const type = document.getElementById('compose-type').value;

        const messageData = {
            to: to,
            subject: subject,
            body: body,
            type: type
        };

        try {
            const res = await fetch('/api/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}` // הוספת טוקן אימות
                },
                body: JSON.stringify(messageData)
            });
            if (!res.ok) throw new Error('send failed');
            autosaveIndicator.textContent = 'נשלח בהצלחה';
            form.reset();
            showCompose(false);
            if (window.fetchMessages) window.fetchMessages();
        } catch (err) {
            console.error(err);
            autosaveIndicator.textContent = 'שגיאה בשליחה';
        }
    }

    async function saveDraft() {
        // טען את טוקן האימות
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.error('⚠️ המשתמש לא מחובר, לא ניתן לשמור טיוטה.');
            autosaveIndicator.textContent = 'שגיאה בשמירה: המשתמש לא מחובר';
            return;
        }

        const to = document.getElementById('compose-to').value;
        const subject = document.getElementById('compose-subject').value;
        const body = document.getElementById('compose-body').value;
        const draft = {
            to,
            subject,
            body,
            timestamp: new Date().toISOString(),
            owner: window.currentUser || 'unknown'
        };

        try {
            const res = await fetch('/api/drafts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}` // הוספת טוקן אימות
                },
                body: JSON.stringify(draft)
            });
            if (!res.ok) throw new Error('save draft failed');
            autosaveIndicator.textContent = 'טיוטה נשמרה';
        } catch (e) {
            console.error(e);
            autosaveIndicator.textContent = 'שגיאה בשמירת טיוטה';
        }
    }

    // autosave every 60s
    function startAutosave() {
        if (autosaveTimer) clearInterval(autosaveTimer);
        autosaveTimer = setInterval(() => {
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
    if (toInput) {
        toInput.addEventListener('input', async (e) => {
            try {
                if (!usersCache.length) {
                    const res = await fetch('/api/users');
                    if (!res.ok) throw 0;
                    usersCache = await res.json();
                }
                const val = toInput.value;
                const suggestions = usersCache.filter(u => u.username?.includes(val) || u.email?.includes(val)).slice(0, 6);
                let dl = document.getElementById('to-datalist');
                if (!dl) {
                    dl = document.createElement('datalist');
                    dl.id = 'to-datalist';
                    document.body.appendChild(dl);
                    toInput.setAttribute('list', 'to-datalist');
                }
                dl.innerHTML = suggestions.map(s => `<option value="${s.username || s.email}">`).join('');
            } catch (e) {}
        });
    }

});
