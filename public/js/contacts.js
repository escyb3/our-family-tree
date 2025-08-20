/ public/js/contacts.js

// השלם את הקוד כולו ב-DOMContentLoaded event listener.
// זה מבטיח שהקוד ירוץ רק לאחר שכל רכיבי ה-HTML נטענו.
document.addEventListener('DOMContentLoaded', () => {
    const list = document.getElementById('contact-list');

    async function loadContacts() {
        try {
            // טען את טוקן האימות (Auth Token) מהאחסון המקומי.
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                console.warn('⚠️ המשתמש לא מחובר, לא ניתן לטעון אנשי קשר.');
                if (list) {
                    list.innerHTML = '<li>⚠️ המשתמש לא מחובר</li>';
                }
                return; // יציאה מהפונקציה אם אין טוקן
            }

            const res = await fetch('/api/contacts', {
                method: 'GET',
                headers: {
                    // הוספת טוקן האימות ל-header כדי לאפשר לשרת לאמת את הבקשה.
                    'Authorization': `Bearer ${authToken}`
                }
            });

            // בדיקה האם התשובה היא הצלחה (קוד 200-299)
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`שגיאה בשרת: ${res.status} - ${errorText}`);
            }

            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const responseText = await res.text();
                console.error("❌ התשובה אינה בפורמט JSON:", responseText);
                throw new Error("השרת החזיר תגובה שאינה JSON.");
            }

            const contacts = await res.json();
            console.log('✅ אנשי קשר נטענו בהצלחה:', contacts);

            if (list) {
                if (contacts.length > 0) {
                    list.innerHTML = contacts.map(c => `<li style="padding:6px 0">${c}</li>`).join('');
                } else {
                    list.innerHTML = '<li>אין אנשי קשר</li>';
                }
            }
        } catch (e) {
            console.error('❌ שגיאה בטעינת אנשי קשר:', e);
            if (list) {
                list.innerHTML = `<li style="color:red;">שגיאה בטעינת אנשי קשר.</li>`;
            }
        }
    }

    // קריאה לפונקציה פעם אחת בעת טעינת הדף.
    loadContacts();

    // הוספת הפונקציה לאובייקט window כך שקוד אחר יוכל להשתמש בה.
    window.loadContacts = loadContacts;

});
