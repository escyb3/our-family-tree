// public/js/inbox-ui.js
// מרכז ניהול תיבת ההודעות - רינדור, thread view, tagging, mark read
(() => {
    const listEl = document.getElementById('messages-list');
    const previewSubject = document.getElementById('preview-subject');
    const previewMeta = document.getElementById('preview-meta');
    const previewBody = document.getElementById('preview-body');
    const threadArea = document.getElementById('thread-area');
    const attachmentsArea = document.getElementById('attachments-area');
    const summaryArea = document.getElementById('summary-area');
    const countInbox = document.getElementById('count-inbox');

    let messages = []; // fetched messages
    let currentFolder = 'inbox';
    let tags = JSON.parse(localStorage.getItem('user-tags') || '[]');

    // UI helpers
    function formatDate(ts) {
        try { return new Date(ts).toLocaleString(); } catch { return ts; }
    }

    function iconForFile(name) {
        const ext = (name || '').split('.').pop().toLowerCase();
        if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return '🖼️';
        if (['pdf'].includes(ext)) return '📄';
        if (['zip', 'rar'].includes(ext)) return '🗜️';
        if (['mp3', 'wav', 'm4a'].includes(ext)) return '🔊';
        return '📎';
    }

    // פונקציה מותאמת אישית להצגת הודעות ואישורי משתמש
    function showMessage(msg) {
        console.log(`[Message]: ${msg}`);
        // במקום alert(), היינו משתמשים במודל מותאמת אישית
    }
    
    // פונקציה מותאמת אישית לטעינת הודעות, המטפלת באימות
    async function fetchMessages() {
        if (!window.currentUser || !window.currentUser.username) {
            console.warn('⚠️ המשתמש לא מחובר, דוחה טעינת הודעות.');
            if (listEl) {
                listEl.innerHTML = '<div style="padding:12px;color:#888">אנא התחבר כדי לראות הודעות</div>';
            }
            return;
        }

        try {
            const res = await fetch('/api/messages');
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'fetch messages failed');
            }
            const data = await res.json();
            if (Array.isArray(data)) messages = data;
            else if (data.inbox) messages = data.inbox.concat(data.sent || []);
            else messages = [];
            renderList();
        } catch (err) {
            console.error('❌ שגיאה בשליפת הודעות:', err);
            if (listEl) {
                listEl.innerHTML = `<div style="padding:12px;color:#a00">שגיאה בטעינת הודעות: ${err.message}</div>`;
            }
        }
    }

    function renderList() {
        if (!listEl) return;
        const search = document.getElementById('global-search')?.value.trim().toLowerCase() || '';
        const sortMode = document.getElementById('sort-mode')?.value || 'timestamp';
        const groupThreads = document.getElementById('group-by-thread')?.checked || false;
        const dateFilter = document.getElementById('date-filter')?.value || '';

        let rows = messages.slice();
        const currentUser = window.currentUser?.username || '';

        // filter by folder
        if (currentFolder === 'inbox') rows = rows.filter(m => m.to && m.to.includes(currentUser));
        if (currentFolder === 'sent') rows = rows.filter(m => m.from && m.from.includes(currentUser));
        if (currentFolder === 'drafts') rows = rows.filter(m => m.draft);
        if (currentFolder === 'trash') rows = rows.filter(m => m.deleted);
        
        // search
        if (search) {
            rows = rows.filter(m => (m.subject || '').toLowerCase().includes(search) ||
                (m.from || '').toLowerCase().includes(search) || (m.body || '').toLowerCase().includes(search));
        }
        
        // date filter
        if (dateFilter) {
            const days = parseInt(dateFilter, 10);
            if (!isNaN(days)) {
                const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
                rows = rows.filter(m => new Date(m.timestamp).getTime() >= cutoff);
            }
        }
        
        // sort
        rows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        if (sortMode === 'important') rows.sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0));
        
        // group threads
        if (groupThreads) {
            const byThread = {};
            rows.forEach(m => {
                const key = m.threadId || m.id;
                if (key) {
                    byThread[key] = byThread[key] || [];
                    byThread[key].push(m);
                }
            });
            listEl.innerHTML = Object.values(byThread).map(group => {
                const top = group[0];
                const unread = group.some(g => !g.seen);
                return `<div class="msg-row ${unread ? 'unread' : ''}" data-id="${top.id}">
                    <div class="msg-meta">
                        <div><strong>${top.subject || '(ללא נושא)'}</strong></div>
                        <div class="msg-sub">${top.from} · ${formatDate(top.timestamp)} · ${group.length} תגובות</div>
                    </div>
                </div>`;
            }).join('');
        } else {
            listEl.innerHTML = rows.map(m => {
                const unreadClass = !m.seen ? 'unread' : '';
                const tag = m.tag ? `<span class="tag-chip" style="background:${m.tagColor || '#eee'}">${m.tag}</span>` : '';
                return `<div class="msg-row ${unreadClass}" data-id="${m.id}">
                    <div style="width:40px;text-align:center">${iconForFile((m.attachments || [])[0] || '')}</div>
                    <div class="msg-meta">
                        <div><strong>${m.subject || '(ללא נושא)'}</strong> ${tag}</div>
                        <div class="msg-sub">${m.from} · ${m.to} · ${formatDate(m.timestamp)}</div>
                    </div>
                </div>`;
            }).join('');
        }
        if (countInbox) {
            countInbox.textContent = messages.filter(m => m.to && m.to.includes(currentUser) && !m.seen).length;
        }
    }

    function bindListClicks() {
        if (!listEl) return;
        listEl.addEventListener('click', e => {
            const row = e.target.closest('.msg-row');
            if (!row) return;
            const id = row.dataset.id;
            openMessage(id);
        });
    }

    async function openMessage(id) {
        const msg = messages.find(m => String(m.id) === String(id));
        if (!msg) return;
        
        // mark seen
        try {
            await fetch('/api/mark-seen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: msg.id })
            });
        } catch (e) {
            console.error('שגיאה בסימון הודעה כנקראת:', e);
        }

        // render preview
        if (previewSubject) previewSubject.textContent = msg.subject || '(ללא נושא)';
        if (previewMeta) previewMeta.textContent = `${msg.from} → ${msg.to} · ${formatDate(msg.timestamp)}`;
        if (previewBody) previewBody.innerHTML = `<div style="white-space:pre-wrap">${escapeHtml(msg.body || '')}</div>`;

        // attachments
        if (attachmentsArea) {
            attachmentsArea.innerHTML = '';
            (msg.attachments || msg.attachment ? (Array.isArray(msg.attachments) ? msg.attachments : [msg.attachment]) : []).forEach(a => {
                const el = document.createElement('div');
                el.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><div class="file-icon">${iconForFile(a)}</div><a href="${a}" target="_blank">${a.split('/').pop()}</a></div>`;
                attachmentsArea.appendChild(el);
            });
        }

        // thread replies
        if (threadArea) {
            threadArea.innerHTML = '';
            (msg.replies || []).forEach((r, i) => {
                const d = document.createElement('div');
                d.innerHTML = `<div style="padding:8px;border-radius:8px;margin-top:8px;background:#fafafa"><strong>#${i + 1} ${r.from}</strong> <small style="color:var(--muted)">${formatDate(r.timestamp)}</small><div style="margin-top:6px">${escapeHtml(r.body)}</div></div>`;
                threadArea.appendChild(d);
            });
        }

        // auto summary (optional)
        const autoSummaryCheckbox = document.getElementById('auto-summary');
        if (autoSummaryCheckbox && autoSummaryCheckbox.checked) {
            if (summaryArea) summaryArea.textContent = 'ביצוע סיכום...';
            try {
                const res = await fetch('/api/ask-ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: `סכם את ההודעה: ${msg.body}` })
                });
                const data = await res.json();
                if (summaryArea) summaryArea.textContent = data.answer || 'אין סיכום';
            } catch (e) {
                if (summaryArea) summaryArea.textContent = 'שגיאה בסיכום';
            }
        } else {
            if (summaryArea) summaryArea.textContent = '';
        }
        renderList();
    }

    function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

    // tag management
    function renderTags() {
        const container = document.getElementById('tags-container');
        if (!container) return;
        container.innerHTML = tags.map(t => `<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
            <span class="tag-chip" style="background:${t.color}">${t.name}</span>
            <button data-tag="${t.name}" class="apply-tag">החל</button>
            <button data-del="${t.name}" class="del-tag">מחק</button>
        </div>`).join('');
    }

    function getCurrentPreviewId() {
        if (previewSubject) return previewSubject.dataset.id || null;
        return null;
    }

    function start() {
        bindListClicks();
        renderTags();
        
        // sidebar folder clicks
        document.querySelectorAll('.list-item').forEach(el => {
            el.addEventListener('click', () => {
                currentFolder = el.dataset.folder;
                renderList();
            });
        });

        // event listeners
        document.getElementById('refresh-btn')?.addEventListener('click', fetchMessages);
        document.getElementById('global-search')?.addEventListener('input', renderList);
        document.getElementById('group-by-thread')?.addEventListener('change', renderList);
        document.getElementById('sort-mode')?.addEventListener('change', renderList);
        document.getElementById('date-filter')?.addEventListener('change', renderList);

        document.getElementById('add-tag')?.addEventListener('click', () => {
            console.log('[Prompt]: שם תג נדרש');
            // במקרה אמיתי, נדרשת כאן תיבת דיאלוג מותאמת אישית
            // const name = showPrompt('שם תג:');
            // אם היה prompt היינו משתמשים בו
            const name = window.prompt('שם תג:');
            if (!name) return;
            const color = window.prompt('צבע רקע (hex או מילים):', '#ffefc2') || '#ffefc2';
            tags.push({ name, color });
            localStorage.setItem('user-tags', JSON.stringify(tags));
            renderTags();
        });
        
        // apply / delete tag buttons (event delegation)
        document.getElementById('tags-container')?.addEventListener('click', async e => {
            if (e.target.classList.contains('apply-tag')) {
                const tag = e.target.dataset.tag;
                console.log('[Prompt]: id נדרש');
                const id = window.prompt('הכנס ID של ההודעה להחלת תג (או בחר מממשק):');
                if (!id) {
                    showMessage('אין id');
                    return;
                }
                try {
                    await fetch('/api/mark-important', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, important: true, tag })
                    });
                    showMessage('תוייג בהצלחה');
                    fetchMessages();
                } catch (err) {
                    showMessage('שגיאה');
                }
            }
            if (e.target.classList.contains('del-tag')) {
                const name = e.target.dataset.del;
                tags = tags.filter(t => t.name !== name);
                localStorage.setItem('user-tags', JSON.stringify(tags));
                renderTags();
            }
        });
        
        // pin/fav/remind actions
        document.getElementById('fav-btn')?.addEventListener('click', async () => {
            const id = getCurrentPreviewId();
            if (!id) {
                showMessage('אין הודעה נבחרת');
                return;
            }
            const msg = messages.find(m => String(m.id) === String(id));
            if (!msg) {
                showMessage('הודעה לא נמצאה');
                return;
            }
            msg.favorite = !msg.favorite;
            try {
                await fetch('/api/mark-important', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, important: msg.favorite })
                });
                fetchMessages();
            } catch (err) {
                showMessage('שגיאה');
            }
        });
        
        document.getElementById('reply-btn')?.addEventListener('click', () => {
            const id = getCurrentPreviewId();
            if (!id) {
                showMessage('בחר הודעה');
                return;
            }
            console.log('[Prompt]: תגובה נדרשת');
            const text = window.prompt('תגובה:');
            if (!text) return;
            fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threadId: id, body: text })
            }).then(() => fetchMessages()).catch(() => showMessage('שגיאה בשליחת תגובה'));
        });
        
        document.getElementById('forward-btn')?.addEventListener('click', () => {
            const id = getCurrentPreviewId();
            if (!id) {
                showMessage('בחר הודעה');
                return;
            }
            const msg = messages.find(m => String(m.id) === String(id));
            if (!msg) {
                showMessage('הודעה לא נמצאה');
                return;
            }
            console.log('[Prompt]: נמען נדרש');
            const to = window.prompt('למי להעביר? (user@family.local)');
            if (!to) return;
            
            fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, subject: 'FW: ' + (msg.subject || ''), body: msg.body })
            }).then(() => fetchMessages()).catch(() => showMessage('שגיאה בהעברת הודעה'));
        });

        setInterval(fetchMessages, 60_000);
    }
    
    // האזנה לאירוע שהמשתמש מחובר
    window.addEventListener('user-authenticated', fetchMessages);
    // אם המשתמש כבר מחובר בעת טעינת הדף, נטען את ההודעות מיד
    if (window.currentUser) {
        fetchMessages();
    }

    // חשיפת פונקציות גלובליות
    window.fetchMessages = fetchMessages;
    window.renderList = renderList;
    window.getCurrentPreviewId = getCurrentPreviewId;
    
    start();
})();
