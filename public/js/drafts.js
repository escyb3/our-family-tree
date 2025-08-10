// public/js/drafts.js
// טעינת טיוטות בממשק או דרך סרגל צד
(async function() {
  const list = document.getElementById('drafts-list');
  let drafts = [];

  // פונקציית טעינה של טיוטות מהשרת
  async function loadDrafts() {
    try {
      const res = await fetch('/api/drafts');
      if (!res.ok) {
        throw new Error('שגיאה בטעינת טיוטות, אנא התחבר מחדש.');
      }
      drafts = await res.json();
      renderDrafts(drafts);
    } catch (e) {
      console.error('❌ שגיאה בטעינת טיוטות:', e);
      if (list) {
        list.innerHTML = '<div style="padding:12px;color:#a00">לא ניתן לטעון טיוטות</div>';
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

  // פונקציית אזהרה מותאמת אישית (במקום alert ו-confirm)
  function showCustomConfirm(message, onConfirm) {
    // בגלל מגבלות סביבת הקנבס, אין אפשרות להשתמש ב-alert() או ב-confirm().
    // במקרה אמיתי, היינו מציגים כאן דיאלוג מותאם אישית (מודאל)
    // לצורך הדגמה, אנחנו נשתמש ב-console.log ונקרא לפונקציה ישירות.
    console.log(`[Custom Confirm]: ${message}. If this were a real app, a dialog would appear now.`);
    if (confirm(message)) {
      onConfirm();
    }
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
      window.openComposeModalWithDraft(d.id, d.to, d.subject, d.body);
    }
    
    // מחיקת טיוטה
    if (e.target.dataset.del) {
      const id = e.target.dataset.del;
      // שימוש בפונקציה showCustomConfirm במקום ב-confirm()
      showCustomConfirm('למחוק את הטיוטה?', async () => {
        try {
          const res = await fetch(`/api/drafts/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('שגיאה במחיקת טיוטה');
          await loadDrafts(); // רענון הרשימה לאחר המחיקה
          // שימוש בפונקציה מותאמת אישית במקום alert()
          console.log('טיוטה נמחקה בהצלחה.');
        } catch (err) {
          console.error('❌ שגיאה במחיקת טיוטה:', err);
          console.log('שגיאה במחיקת טיוטה.');
        }
      });
    }
  });

  // קורא לטעינת טיוטות ראשונית
  loadDrafts();
  
  // חושף את הפונקציה לשימוש חיצוני, אם יש צורך ברענון מנקודה אחרת
  window.loadDrafts = loadDrafts;
})();
