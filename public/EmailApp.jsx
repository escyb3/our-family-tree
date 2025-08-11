import React, { useState, useEffect, useRef } from 'react';
import { Mail, Send, Edit, Inbox, Home, User, Loader2, Search, CornerUpLeft, Globe, Paperclip, Download, Bold, Italic, Underline } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';

// הגדרת Firebase מהקונפיגורציה הגלובלית
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// אתחול Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// אובייקט עם כל הטקסטים בממשק בשתי שפות
const lang = {
  he: {
    appName: "דוא\"ל פנימי",
    loginWelcome: "ברוכים הבאים",
    loginMessage: "הכנס שם משתמש כדי לנהל את תיבת הדואר המשפחתית שלך.",
    usernameLabel: "שם משתמש",
    usernamePlaceholder: "לדוגמה: יונתן",
    loginButton: "התחבר",
    loginStatusConnecting: "מתחבר...",
    loginError: "שגיאה בהתחברות. אנא נסה שוב.",
    sidebarWelcome: "ברוך הבא, ",
    yourEmail: "כתובת המייל שלך:",
    userId: "מזהה משתמש:",
    newEmailButton: "הודעה חדשה",
    inboxFolder: "דואר נכנס",
    sentFolder: "נשלח",
    searchPlaceholder: "חיפוש מיילים...",
    noEmailsFound: "לא נמצאו הודעות תואמות.",
    emailSubjectPlaceholder: "(ללא נושא)",
    composeTitle: "אימייל חדש",
    recipientLabel: "אל",
    composeBack: "חזרה לתיבת הדואר",
    subjectLabel: "נושא",
    bodyLabel: "הודעה",
    sendButton: "שלח",
    sendSuccess: "ההודעה נשלחה בהצלחה!",
    sendError: "שגיאה בשליחת ההודעה. אנא נסה שוב.",
    composeGeminiTitle: "צור טיוטה בעזרת Gemini AI",
    geminiPlaceholder: "לדוגמה: כתוב מייל קצר כדי להתנצל על איחור.",
    geminiButton: "צור טיוטה",
    geminiError: "אירעה שגיאה. אנא נסה שוב מאוחר יותר.",
    emailFrom: "מאת:",
    emailTo: "אל:",
    emailReply: "השב",
    emailBack: "חזרה",
    loading: "טוען...",
    noMessagesInFolder: "אין הודעות בתיקיה זו.",
    attachmentsLabel: "צירוף קבצים",
    noFileSelected: "לא נבחר קובץ.",
    attachment: "קובץ מצורף:",
    download: "הורד",
    downloadNotSupported: "הערה: הורדת קבצים לא נתמכת בפלטפורמה זו.",
    richTextNote: "הטקסט נשלח כ-HTML כדי לשמור על העיצוב.",
    editorToolbar: "סרגל עריכת טקסט"
  },
  en: {
    appName: "Internal Mail",
    loginWelcome: "Welcome",
    loginMessage: "Enter a username to manage your family's mailbox.",
    usernameLabel: "Username",
    usernamePlaceholder: "e.g., Jonathan",
    loginButton: "Login",
    loginStatusConnecting: "Connecting...",
    loginError: "Login error. Please try again.",
    sidebarWelcome: "Welcome, ",
    yourEmail: "Your email address:",
    userId: "User ID:",
    newEmailButton: "New Message",
    inboxFolder: "Inbox",
    sentFolder: "Sent",
    searchPlaceholder: "Search emails...",
    noEmailsFound: "No matching messages found.",
    emailSubjectPlaceholder: "(No Subject)",
    composeTitle: "New Email",
    recipientLabel: "To",
    composeBack: "Back to Mailbox",
    subjectLabel: "Subject",
    bodyLabel: "Message",
    sendButton: "Send",
    sendSuccess: "Message sent successfully!",
    sendError: "Error sending message. Please try again.",
    composeGeminiTitle: "Draft with Gemini AI",
    geminiPlaceholder: "e.g., Write a short email to apologize for being late.",
    geminiButton: "Draft",
    geminiError: "An error occurred. Please try again later.",
    emailFrom: "From:",
    emailTo: "To:",
    emailReply: "Reply",
    emailBack: "Back",
    loading: "Loading...",
    noMessagesInFolder: "No messages in this folder.",
    attachmentsLabel: "Attach Files",
    noFileSelected: "No file selected.",
    attachment: "Attachment:",
    download: "Download",
    downloadNotSupported: "Note: File downloads are not supported on this platform.",
    richTextNote: "The text is sent as HTML to preserve formatting.",
    editorToolbar: "Text Editor Toolbar"
  }
};

const App = () => {
  // ניהול מצבי האפליקציה
  const [username, setUsername] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [currentView, setCurrentView] = useState('login'); // 'login', 'mailbox', 'compose'
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [inboxEmails, setInboxEmails] = useState([]);
  const [sentEmails, setSentEmails] = useState([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userId, setUserId] = useState('');
  const [composeForm, setComposeForm] = useState({ recipient: '', subject: '', body: '' });
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [geminiDraftPrompt, setGeminiDraftPrompt] = useState('');
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [isGeminiError, setIsGeminiError] = useState(false);
  const [language, setLanguage] = useState('he'); // מצב השפה, ברירת מחדל עברית
  const [attachments, setAttachments] = useState(null); // מצב לקובץ המצורף
  
  // Ref עבור אזור עריכת הטקסט
  const richTextRef = useRef(null);
  const t = lang[language]; // קיצור לשפה הנוכחית

  // לוגיקת החלפת שפה
  const toggleLanguage = () => {
    setLanguage(prevLang => prevLang === 'he' ? 'en' : 'he');
  };

  // קושר את שם המשתמש למזהה ייחודי עבור Firebase.
  const handleLogin = async (e) => {
    e.preventDefault();
    if (username.trim()) {
      setLoading(true);
      setStatusMessage(t.loginStatusConnecting);
      try {
        let userCredential;
        const initialToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (initialToken) {
          userCredential = await signInWithCustomToken(auth, initialToken);
        } else {
          userCredential = await signInAnonymously(auth);
        }
        
        const newEmailAddress = `${username.trim()}@family.local`;
        setEmailAddress(newEmailAddress);
        setUserId(userCredential.user.uid);
        
        setCurrentView('mailbox');
        setStatusMessage('');
      } catch (error) {
        console.error("שגיאה בהתחברות:", error);
        setStatusMessage(t.loginError);
      } finally {
        setLoading(false);
      }
    }
  };

  // השפעת React לניהול מצב ההתחברות וטעינת האימיילים
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthReady(true);
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // השפעת React לטעינת אימיילים בזמן אמת מ-Firestore
  useEffect(() => {
    if (isAuthReady && userId && emailAddress) {
      const inboxQuery = query(
        collection(db, `artifacts/${appId}/public/data/emails`),
        where('recipient', '==', emailAddress)
      );

      const unsubscribeInbox = onSnapshot(inboxQuery, (snapshot) => {
        const emails = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        emails.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setInboxEmails(emails);
      });
      
      const sentQuery = query(
        collection(db, `artifacts/${appId}/public/data/emails`),
        where('sender', '==', emailAddress)
      );
      
      const unsubscribeSent = onSnapshot(sentQuery, (snapshot) => {
        const emails = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        emails.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setSentEmails(emails);
      });

      return () => {
        unsubscribeInbox();
        unsubscribeSent();
      };
    }
  }, [isAuthReady, userId, emailAddress]);

  // שליחת אימייל חדש
  const handleSendEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(t.sendSuccess);

    const newEmail = {
      sender: emailAddress,
      recipient: composeForm.recipient.trim(),
      subject: composeForm.subject.trim() || t.emailSubjectPlaceholder,
      // שמירת התוכן כ-HTML עם העיצוב
      body: richTextRef.current.innerHTML,
      timestamp: serverTimestamp(),
      // שמירת מטא-דאטה של הקובץ המצורף בלבד
      attachment: attachments ? {
        name: attachments.name,
        size: attachments.size,
        type: attachments.type,
      } : null,
    };

    try {
      await addDoc(collection(db, `artifacts/${appId}/public/data/emails`), newEmail);
      setStatusMessage(t.sendSuccess);
      setComposeForm({ recipient: '', subject: '', body: '' });
      setAttachments(null); // איפוס הקובץ המצורף
      if (richTextRef.current) {
        richTextRef.current.innerHTML = '';
      }
      setTimeout(() => {
        setStatusMessage('');
        setCurrentView('mailbox');
      }, 2000);
    } catch (error) {
      console.error("שגיאה בשליחת האימייל:", error);
      setStatusMessage(t.sendError);
    } finally {
      setLoading(false);
    }
  };

  // פונקציה לעריכת טקסט עשיר
  const applyFormatting = (command) => {
    document.execCommand(command, false, null);
    if (richTextRef.current) {
      richTextRef.current.focus();
    }
  };

  // לוגיקת חיפוש - מסנן את האימיילים לפי נושא, שולח או גוף ההודעה
  const filterEmails = (emails) => {
    if (!searchQuery) {
      return emails;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return emails.filter(email => 
      email.subject.toLowerCase().includes(lowerCaseQuery) ||
      email.sender.toLowerCase().includes(lowerCaseQuery) ||
      email.body.toLowerCase().includes(lowerCaseQuery)
    );
  };
  
  // לוגיקת Gemini AI ליצירת טיוטת מייל
  const handleGeminiGenerate = async () => {
    if (!geminiDraftPrompt) return;
    
    setIsGeminiLoading(true);
    setIsGeminiError(false);

    let retries = 0;
    const maxRetries = 3;
    const initialDelay = 1000;

    const chatHistory = [{ role: "user", parts: [{ text: geminiDraftPrompt }] }];
    const payload = { contents: chatHistory };
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    while (retries < maxRetries) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText) {
            // הוספת הטקסט שנוצר לאזור העריכה
            if (richTextRef.current) {
              richTextRef.current.innerHTML = generatedText.replace(/\n/g, '<br/>');
            }
          } else {
            setIsGeminiError(true);
            console.error('Gemini API response was missing text.');
          }
          break; // Break the loop on success
        } else {
          console.error(`Gemini API error: ${response.status}`);
          retries++;
          const delay = initialDelay * Math.pow(2, retries - 1);
          await new Promise(res => setTimeout(res, delay));
        }
      } catch (error) {
        console.error('Error calling Gemini API:', error);
        retries++;
        const delay = initialDelay * Math.pow(2, retries - 1);
        await new Promise(res => setTimeout(res, delay));
      }
    }
    
    if (retries === maxRetries) {
      setIsGeminiError(true);
    }

    setIsGeminiLoading(false);
  };

  // רכיב לטופס ההתחברות
  const renderLogin = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Mail className="text-blue-500 w-12 h-12" />
        </div>
        <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-6">{t.loginWelcome}</h1>
        <p className="text-center text-gray-600 mb-6">{t.loginMessage}</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">{t.usernameLabel}</label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 block w-full rounded-md sm:text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition duration-150 ease-in-out p-3"
                placeholder={t.usernamePlaceholder}
                required
              />
              <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                @family.local
              </span>
            </div>
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5 ml-2" /> : t.loginButton}
          </button>
        </form>
        {statusMessage && <p className="mt-4 text-center text-sm font-medium text-red-500">{statusMessage}</p>}
      </div>
    </div>
  );

  // רכיב לתצוגת רשימת האימיילים
  const renderEmailList = (emails) => (
    <div className="p-4 flex flex-col h-full overflow-y-auto">
      <div className="relative mb-4">
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="block w-full rounded-md border-gray-300 pr-10 focus:border-blue-500 focus:ring-blue-500 transition duration-150 ease-in-out p-2"
        />
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-4">{currentFolder === 'inbox' ? t.inboxFolder : t.sentFolder}</h2>
        {filterEmails(emails).length > 0 ? (
          filterEmails(emails).map(email => (
            <div
              key={email.id}
              onClick={() => setSelectedEmail(email)}
              className="flex flex-col p-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition duration-150 ease-in-out shadow-sm"
            >
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="font-semibold text-gray-800">{email.sender}</span>
                <span className="text-gray-500 text-xs">
                  {new Date(email.timestamp?.seconds * 1000).toLocaleString(language === 'he' ? 'he-IL' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
              <div className="text-sm font-medium text-gray-700 truncate">{email.subject}</div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 mt-8">{t.noMessagesInFolder}</p>
        )}
      </div>
    </div>
  );

  // רכיב לתצוגת אימייל בודד
  const renderEmailView = () => (
    <div className="p-4 flex flex-col h-full bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">{selectedEmail.subject}</h2>
        <div className="flex space-x-2 space-x-reverse">
          <button
            onClick={() => {
              setComposeForm({
                recipient: selectedEmail.sender,
                subject: `Re: ${selectedEmail.subject}`,
                body: '',
              });
              setCurrentView('compose');
            }}
            className="flex items-center px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition duration-150 ease-in-out"
          >
            <CornerUpLeft className="w-4 h-4 ml-2" />
            <span>{t.emailReply}</span>
          </button>
          <button
            onClick={() => setSelectedEmail(null)}
            className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition duration-150 ease-in-out"
          >
            <Home className="w-4 h-4 ml-2" />
            <span>{t.emailBack}</span>
          </button>
        </div>
      </div>
      <div className="mb-4 text-sm text-gray-600">
        <span className="font-semibold text-gray-800">{t.emailFrom}</span> {selectedEmail.sender}
        <br/>
        <span className="font-semibold text-gray-800">{t.emailTo}</span> {selectedEmail.recipient}
      </div>
      <div className="text-gray-700 flex-1 overflow-y-auto">
        <div
          className="whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
        />
        {selectedEmail.attachment && (
          <div className="mt-4 p-3 bg-gray-100 rounded-md">
            <h4 className="flex items-center font-semibold text-gray-800">
              <Paperclip className="w-4 h-4 ml-2" /> {t.attachment}
            </h4>
            <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
              <span>{selectedEmail.attachment.name} ({Math.round(selectedEmail.attachment.size / 1024)} KB)</span>
              <button
                onClick={() => alert(t.downloadNotSupported)} // כפתור הורדה מדומה
                className="flex items-center text-blue-500 hover:underline disabled:text-gray-400"
              >
                <Download className="w-4 h-4 ml-2" />
                <span>{t.download}</span>
              </button>
            </div>
            <p className="text-xs text-red-500 mt-2">{t.downloadNotSupported}</p>
          </div>
        )}
      </div>
    </div>
  );

  // רכיב לטופס שליחת אימייל חדש
  const renderCompose = () => (
    <div className="p-4 flex flex-col h-full bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">{t.composeTitle}</h2>
        <button
          onClick={() => setCurrentView('mailbox')}
          className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition duration-150 ease-in-out"
        >
          <Home className="w-4 h-4 ml-2" />
          <span>{t.composeBack}</span>
        </button>
      </div>
      <form onSubmit={handleSendEmail} className="flex-1 flex flex-col space-y-4">
        <div>
          <label htmlFor="recipient" className="block text-sm font-medium text-gray-700">{t.recipientLabel}</label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              id="recipient"
              name="recipient"
              type="text"
              value={composeForm.recipient}
              onChange={(e) => setComposeForm({...composeForm, recipient: e.target.value})}
              className="flex-1 block w-full rounded-md sm:text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition duration-150 ease-in-out p-2"
              placeholder={t.usernamePlaceholder}
              required
            />
            <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                @family.local
            </span>
          </div>
        </div>
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700">{t.subjectLabel}</label>
          <input
            id="subject"
            name="subject"
            type="text"
            value={composeForm.subject}
            onChange={(e) => setComposeForm({...composeForm, subject: e.target.value})}
            className="mt-1 block w-full rounded-md shadow-sm sm:text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition duration-150 ease-in-out p-2"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="rich-text-editor" className="block text-sm font-medium text-gray-700">{t.bodyLabel}</label>
          {/* סרגל הכלים לעריכת טקסט */}
          <div className="flex items-center space-x-2 space-x-reverse border-b border-gray-300 bg-gray-50 p-2 rounded-t-md">
            <button
              type="button"
              onClick={() => applyFormatting('bold')}
              className="p-2 rounded-md hover:bg-gray-200 transition duration-150 ease-in-out"
              title="Bold"
            >
              <Bold className="w-5 h-5 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('italic')}
              className="p-2 rounded-md hover:bg-gray-200 transition duration-150 ease-in-out"
              title="Italic"
            >
              <Italic className="w-5 h-5 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('underline')}
              className="p-2 rounded-md hover:bg-gray-200 transition duration-150 ease-in-out"
              title="Underline"
            >
              <Underline className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          {/* אזור הטקסט הניתן לעריכה */}
          <div
            id="rich-text-editor"
            ref={richTextRef}
            contentEditable="true"
            className="mt-0 block w-full rounded-b-md shadow-sm sm:text-sm border border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition duration-150 ease-in-out p-2 h-32 overflow-y-auto focus:outline-none"
            onInput={(e) => setComposeForm({...composeForm, body: e.target.innerHTML})}
          />
          <p className="text-xs text-gray-500 mt-2">{t.richTextNote}</p>
        </div>
        {/* קומפוננטת צירוף קבצים */}
        <div>
          <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">{t.attachmentsLabel}</label>
          <div className="mt-1 flex items-center space-x-2 space-x-reverse">
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              onChange={(e) => setAttachments(e.target.files[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {attachments && (
              <span className="text-sm text-gray-700">{attachments.name} ({Math.round(attachments.size / 1024)} KB)</span>
            )}
          </div>
        </div>
        <div className="flex flex-col space-y-2 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-md font-bold text-gray-800">{t.composeGeminiTitle}</h3>
          <div className="flex space-x-2 space-x-reverse">
            <input
              type="text"
              value={geminiDraftPrompt}
              onChange={(e) => setGeminiDraftPrompt(e.target.value)}
              placeholder={t.geminiPlaceholder}
              className="flex-1 block w-full rounded-md shadow-sm sm:text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition duration-150 ease-in-out p-2"
            />
            <button
              type="button"
              onClick={handleGeminiGenerate}
              className="px-4 py-2 bg-purple-500 text-white rounded-md shadow-sm hover:bg-purple-600 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={isGeminiLoading}
            >
              {isGeminiLoading ? <Loader2 className="animate-spin h-5 w-5" /> : t.geminiButton}
            </button>
          </div>
          {isGeminiError && <p className="text-red-500 text-sm mt-2">{t.geminiError}</p>}
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin h-5 w-5 ml-2" /> : t.sendButton}
        </button>
        {statusMessage && <p className="mt-4 text-center text-sm font-medium text-green-500">{statusMessage}</p>}
      </form>
    </div>
  );

  // רכיב לממשק הדואר המלא
  const renderMailbox = () => (
    <div className="flex h-screen bg-gray-100" dir={language === 'he' ? 'rtl' : 'ltr'}>
      {/* Sidebar Navigation */}
      <div className="bg-white w-64 p-4 shadow-lg rounded-r-xl flex flex-col">
        <div className="flex items-center space-x-2 mb-8" dir="ltr">
          <Mail className="w-8 h-8 text-blue-500" />
          <span className="text-2xl font-bold text-gray-800">{t.appName}</span>
        </div>
        <button
          onClick={toggleLanguage}
          className="flex items-center w-full px-4 py-2 rounded-md transition duration-150 ease-in-out text-gray-600 hover:bg-gray-100 mb-4"
        >
          <Globe className="w-5 h-5 ml-2" />
          <span>{language === 'he' ? 'English' : 'עברית'}</span>
        </button>
        <p className="text-sm font-medium text-gray-600 mb-2">{t.sidebarWelcome}{username}!</p>
        <p className="text-xs text-gray-500 mb-2">{t.yourEmail}</p>
        <p className="text-sm font-mono text-gray-700 mb-6">{emailAddress}</p>
        <p className="text-xs text-gray-500 mb-6">{t.userId} {userId}</p>

        {/* Mailbox folders */}
        <nav className="space-y-2 flex-1">
          <button
            onClick={() => {setCurrentView('compose'); setSelectedEmail(null);}}
            className="flex items-center w-full px-4 py-2 rounded-md transition duration-150 ease-in-out bg-blue-500 text-white font-semibold hover:bg-blue-600 mb-4"
          >
            <Edit className="w-5 h-5 ml-2" />
            <span>{t.newEmailButton}</span>
          </button>
          <button
            onClick={() => {setCurrentFolder('inbox'); setSelectedEmail(null);}}
            className={`flex items-center w-full px-4 py-2 rounded-md transition duration-150 ease-in-out ${currentFolder === 'inbox' ? 'bg-blue-100 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Inbox className="w-5 h-5 ml-2" />
            <span>{t.inboxFolder} ({inboxEmails.length})</span>
          </button>
          <button
            onClick={() => {setCurrentFolder('sent'); setSelectedEmail(null);}}
            className={`flex items-center w-full px-4 py-2 rounded-md transition duration-150 ease-in-out ${currentFolder === 'sent' ? 'bg-blue-100 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Send className="w-5 h-5 ml-2" />
            <span>{t.sentFolder} ({sentEmails.length})</span>
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-lg h-full overflow-hidden">
          {currentView === 'compose' ? renderCompose() : selectedEmail ? renderEmailView() : renderEmailList(currentFolder === 'inbox' ? inboxEmails : sentEmails)}
        </div>
      </div>
    </div>
  );

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <Loader2 className="animate-spin text-blue-500 w-12 h-12" />
      </div>
    );
  }

  return (
    <>
      {currentView === 'login' ? renderLogin() : renderMailbox()}
    </>
  );
};

export default App;
