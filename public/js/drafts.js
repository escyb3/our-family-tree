// public/js/drafts.js
// ייבוא פונקציית העזרה לתיבת דיאלוג מותאמת אישית (נניח שקיימת)
// import { showCustomModal, showConfirmModal } from './dialog-helper.js';

(async function() {
    const list = document.getElementById('drafts-list');
    
    // רשימת הטיוטות נשמרת כאן כדי למנוע קריאות API מיותרות
    let drafts = [];

    // פונקציה לטעינת הטיוטות מהשרת
    async function loadDrafts() {
        // בדיקה שהמשתמש מחובר לפני ביצוע קריאת ה-API
        if (!window.currentUser || !window.currentUser.username) {
            console.warn('⚠️ המשתמש לא מחובר, דוחה טעינת טיוטות.');
            if (list) {
                list.innerHTML = '<div style="padding:12px;color:#888">אנא התחבר כדי לראות טיוטות</div>';
            }
            return;
        }

        try {
            const res = await fetch('/api/drafts');
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'שגיאה בטעינת טיוטות');
            }
            drafts = await res.json();
            renderDrafts(drafts);
        } catch (e) {
            console.error('❌ שגיאה בטעינת טיוטות:', e);
            if (list) {
                list.innerHTML = `<div style="padding:12px;color:#a00">שגיאה בטעינת טיוטות: ${e.message}</div>`;
            }
        }
    }

    // פונקציית רינדור של הטיוטות ל-UI
    function renderDrafts(drafts) {
        const container = document.getElementById('drafts-list') || list;
        if (!container) return;

        if (!drafts.length) {
            container.innerHTML = '<div style="padding:10px">אין טיוטות</div>';
            return;
        }

        container.innerHTML = drafts.map(d => {
            const draftId = d.id;
            return `<div class="msg-row" data-id="${draftId}">
                <div class="msg-meta">
                    <strong>${d.subject || '(טיוטה)'}</strong>
                    <div class="msg-sub">${d.to} · ${new Date(d.timestamp).toLocaleString()}</div>
                </div>
                <div style="margin-left:auto">
                    <button data-load="${draftId}">ערוך</button>
                    <button data-del="${draftId}">מחק</button>
                </div>
            </div>`;
        }).join('');
    }

    // האזנה לאירועי לחיצה על כפתורים
    document.body.addEventListener('click', async e => {
        // טעינת טיוטה לעריכה
        if (e.target.dataset.load) {
            const id = e.target.dataset.load;
            const d = drafts.find(x => x.id === id);
            if (!d) {
                console.error('טיוטה לא נמצאה בטבלה המקומית');
                return;
            }
            // פתיחת ממשק יצירת הודעה עם נתוני הטיוטה
            const composeTo = document.getElementById('compose-to');
            const composeSubject = document.getElementById('compose-subject');
            const composeBody = document.getElementById('compose-body');
            
            if (composeTo) composeTo.value = d.to || '';
            if (composeSubject) composeSubject.value = d.subject || '';
            if (composeBody) composeBody.value = d.body || '';

            // נניח שקיימת פונקציה לפתיחת המודל
            if (window.openComposeModalWithDraft) {
                window.openComposeModalWithDraft(d.id, d.to, d.subject, d.body);
            }
        }
        
        // מחיקת טיוטה
        if (e.target.dataset.del) {
            const id = e.target.dataset.del;

            // שימוש בתיבת דיאלוג מותאמת אישית
            // אם יש לך תיבת דיאלוג מותאמת אישית, בטל את ההערה על הקוד הבא:
            // showCustomConfirm('למחוק את הטיוטה?', async () => { ... });
            // כרגע, אנחנו מבצעים את המחיקה ישירות לצורך בדיקה.
            console.log(`[Custom Confirm]: נדרש אישור למחיקת טיוטה ${id}. במקרה אמיתי, דיאלוג יופיע.`);
            
            // בגלל מגבלות סביבת הקנבס, אין אפשרות להשתמש ב-confirm().
            // נבצע את המחיקה ישירות, אך בפועל זה צריך להיות בתוך פונקציית אישור.
            try {
                const res = await fetch(`/api/drafts/${id}`, { method: 'DELETE' });
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'שגיאה במחיקת טיוטה');
                }
                await loadDrafts(); // רענון הרשימה לאחר המחיקה
                console.log('טיוטה נמחקה בהצלחה.');
            } catch (err) {
                console.error('❌ שגיאה במחיקת טיוטה:', err);
                console.log('שגיאה במחיקת טיוטה.');
            }
        }
    });

    // האזנה לאירוע שהמשתמש מחובר
    window.addEventListener('user-authenticated', loadDrafts);
    // אם המשתמש כבר מחובר בעת טעינת הדף, נטען את הטיוטות מיד
    if (window.currentUser) {
        loadDrafts();
    }
    
    // חושף את הפונקציה לשימוש חיצוני
    window.loadDrafts = loadDrafts;
})();
