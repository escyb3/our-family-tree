import { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, addDoc, serverTimestamp, query, orderBy, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';

// Ensure the global Firebase variables are available, or use defaults for local testing.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : '';

// Placeholder images and data for demonstration
const ATTACHMENT_PLACEHOLDER = "https://placehold.co/100x100/A0A0A0/FFFFFF?text=קובץ מצורף";
const EMAIL_PLACEHOLDER = "https://placehold.co/50x50/FCA5A5/FFFFFF?text=P";

const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeView, setActiveView] = useState('inbox'); // 'inbox', 'sent', 'drafts', 'trash', 'contacts', 'mailing_lists', 'compose', 'settings'
  const [inboxEmails, setInboxEmails] = useState([]);
  const [sentEmails, setSentEmails] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [trashEmails, setTrashEmails] = useState([]);
  const [mailingLists, setMailingLists] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '', htmlBody: '', attachment: null, attachmentName: null });
  const [notification, setNotification] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [showMailingListModal, setShowMailingListModal] = useState(false);
  const [editingMailingList, setEditingMailingList] = useState(null);
  const [newListName, setNewListName] = useState('');
  const [selectedUsersForList, setSelectedUsersForList] = useState([]);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [newContactId, setNewContactId] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'important'
  const [signature, setSignature] = useState('');
  const signatureEditorRef = useRef(null);


  // Initialize Firebase and set up authentication
  useEffect(() => {
    if (Object.keys(firebaseConfig).length === 0) {
      console.log('Firebase config is not set. App will run without persistence.');
      return;
    }

    const app = initializeApp(firebaseConfig);
    const firestoreDb = getFirestore(app);
    const firestoreAuth = getAuth(app);
    setDb(firestoreDb);
    setAuth(firestoreAuth);

    const signIn = async () => {
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(firestoreAuth, initialAuthToken);
        } else {
          await signInAnonymously(firestoreAuth);
        }
      } catch (error) {
        console.error('Firebase authentication failed:', error);
      }
    };
    signIn();

    onAuthStateChanged(firestoreAuth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });

  }, []);

  // Set up real-time listeners for all email collections
  useEffect(() => {
    if (!db || !userId) return;

    // Listen to all users
    const usersCollectionPath = `artifacts/${appId}/users/${userId}/users`;
    const unsubscribeUsers = onSnapshot(collection(db, usersCollectionPath), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(usersData);
    });

    // Listen to inbox
    const inboxQuery = query(collection(db, `artifacts/${appId}/users/${userId}/inbox`), orderBy('timestamp', 'desc'));
    const unsubscribeInbox = onSnapshot(inboxQuery, (snapshot) => {
      const emails = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (emails.length > inboxEmails.length) {
        setNotification(`מייל חדש מ: ${emails[0].from}`);
        setTimeout(() => setNotification(''), 3000);
      }
      setInboxEmails(emails);
    });

    // Listen to sent emails
    const sentQuery = query(collection(db, `artifacts/${appId}/users/${userId}/sent`), orderBy('timestamp', 'desc'));
    const unsubscribeSent = onSnapshot(sentQuery, (snapshot) => {
      setSentEmails(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to drafts
    const draftsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/drafts`), orderBy('timestamp', 'desc'));
    const unsubscribeDrafts = onSnapshot(draftsQuery, (snapshot) => {
      setDrafts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    // Listen to trash
    const trashQuery = query(collection(db, `artifacts/${appId}/users/${userId}/trash`), orderBy('timestamp', 'desc'));
    const unsubscribeTrash = onSnapshot(trashQuery, (snapshot) => {
      setTrashEmails(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to mailing lists
    const listsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/mailing_lists`));
    const unsubscribeLists = onSnapshot(listsQuery, (snapshot) => {
      setMailingLists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to contacts
    const contactsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/contacts`));
    const unsubscribeContacts = onSnapshot(contactsQuery, (snapshot) => {
      setContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    // Listen to settings (signature)
    const unsubscribeSettings = onSnapshot(doc(db, `artifacts/${appId}/users/${userId}/settings`, 'userSettings'), (docSnapshot) => {
        if (docSnapshot.exists()) {
            setSignature(docSnapshot.data().signature || '');
        } else {
            setSignature('');
        }
    });

    return () => {
      unsubscribeInbox();
      unsubscribeSent();
      unsubscribeDrafts();
      unsubscribeTrash();
      unsubscribeLists();
      unsubscribeUsers();
      unsubscribeContacts();
      unsubscribeSettings();
    };
  }, [db, userId]);

  // Save the current draft automatically
  useEffect(() => {
    if (!db || !userId || activeView !== 'compose') return;

    const saveDraft = async () => {
      if (!composeData.to && !composeData.subject && !composeData.body && !composeData.htmlBody) return;
      
      try {
        const draftDocRef = doc(db, `artifacts/${appId}/users/${userId}/drafts`, 'currentDraft');
        await setDoc(draftDocRef, {
          ...composeData,
          timestamp: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error("Error saving draft: ", error);
      }
    };
    const handler = setTimeout(saveDraft, 2000);
    return () => clearTimeout(handler);
  }, [composeData, db, userId, activeView]);

  // Load the draft and signature when entering compose view
  useEffect(() => {
    if (!db || !userId || activeView !== 'compose') return;

    const loadDraftAndSignature = async () => {
      try {
        const draftDocRef = doc(db, `artifacts/${appId}/users/${userId}/drafts`, 'currentDraft');
        const draftSnapshot = await getDoc(draftDocRef);
        let draftData = {};
        if (draftSnapshot.exists()) {
          draftData = draftSnapshot.data();
        }
        
        // Append signature to body if it's a new draft
        if (!draftData.body && signature) {
            draftData.htmlBody = `<p dir="rtl">` + signature + `</p>`;
            draftData.body = signature.replace(/<[^>]*>?/gm, '');
        }
        
        setComposeData(draftData);

      } catch (error) {
        console.error("Error loading draft: ", error);
      }
    };
    loadDraftAndSignature();
  }, [activeView, db, userId, signature]);

  // Handle setting an email as read
  const handleMarkAsRead = async (email) => {
    if (!db || !userId || email.isRead) return;
    try {
      const emailDocRef = doc(db, `artifacts/${appId}/users/${userId}/inbox`, email.id);
      await updateDoc(emailDocRef, { isRead: true });
    } catch (error) {
      console.error("Error marking email as read: ", error);
    }
  };

  // Toggle important status
  const handleToggleImportant = async (email, folder) => {
    if (!db || !userId) return;
    try {
      const emailDocRef = doc(db, `artifacts/${appId}/users/${userId}/${folder}`, email.id);
      await updateDoc(emailDocRef, { isImportant: !email.isImportant });
    } catch (error) {
      console.error("Error toggling important status: ", error);
    }
  };

  // Move email to trash
  const handleMoveToTrash = async (email, folder) => {
    if (!db || !userId) return;
    try {
      // Add email to trash collection, noting its original folder
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/trash`), {
        ...email,
        originalFolder: folder,
        deletedAt: serverTimestamp(),
      });
      // Delete from original folder
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/${folder}`, email.id));
    } catch (error) {
      console.error("Error moving email to trash: ", error);
    }
  };

  // Restore email from trash
  const handleRestoreFromTrash = async (email) => {
    if (!db || !userId) return;
    try {
      // Add email back to its original folder
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/${email.originalFolder}`), {
        ...email,
        originalFolder: null, // Clear original folder field
        deletedAt: null,
      });
      // Delete from trash
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/trash`, email.id));
    } catch (error) {
      console.error("Error restoring email: ", error);
    }
  };

  // Permanently delete email from trash
  const handlePermanentDelete = async (emailId) => {
    if (!db || !userId) return;
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/trash`, emailId));
    } catch (error) {
      console.error("Error permanently deleting email: ", error);
    }
  };
  
  // Handlers for sending emails and managing drafts/lists
  const handleSendEmail = async () => {
    if (!db || !userId || !composeData.to || (!composeData.subject && !composeData.body && !composeData.htmlBody)) return;
  
    try {
      const email = {
        to: composeData.to,
        subject: composeData.subject,
        body: composeData.body,
        htmlBody: composeData.htmlBody, // Use the new rich text body
        from: `משתמש ${userId.substring(0, 8)}`,
        attachment: composeData.attachment,
        attachmentName: composeData.attachmentName,
        timestamp: serverTimestamp(),
        isRead: true, // Mark sent emails as read by default
        isImportant: false,
      };
  
      // Send the email to the 'sent' collection for the current user
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/sent`), email);
  
      // Handle recipients
      const recipients = Array.isArray(composeData.to) ? composeData.to : composeData.to.split(',').map(s => s.trim());
      
      for (const recipient of recipients) {
        const mailingList = mailingLists.find(list => list.id === recipient);
        if (mailingList) {
          for (const memberId of mailingList.members) {
            await addDoc(collection(db, `artifacts/${appId}/users/${memberId}/inbox`), { ...email, isRead: false, isImportant: false });
          }
        } else {
          await addDoc(collection(db, `artifacts/${appId}/users/${recipient}/inbox`), { ...email, isRead: false, isImportant: false });
        }
      }
  
      // Clear the current draft after sending
      const draftDocRef = doc(db, `artifacts/${appId}/users/${userId}/drafts`, 'currentDraft');
      await deleteDoc(draftDocRef);
  
      setComposeData({ to: '', subject: '', body: '', htmlBody: '', attachment: null, attachmentName: null });
      setActiveView('sent');
  
    } catch (error) {
      console.error("Error sending email: ", error);
    }
  };

  const createMailingList = async () => {
    if (!db || !userId || !newListName || selectedUsersForList.length === 0) return;

    try {
      if (editingMailingList) {
        const listDocRef = doc(db, `artifacts/${appId}/users/${userId}/mailing_lists`, editingMailingList.id);
        await updateDoc(listDocRef, { name: newListName, members: selectedUsersForList });
      } else {
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/mailing_lists`), {
          name: newListName,
          members: selectedUsersForList,
          createdAt: serverTimestamp(),
        });
      }
      setShowMailingListModal(false);
      setEditingMailingList(null);
      setNewListName('');
      setSelectedUsersForList([]);
    } catch (error) {
      console.error("Error creating/editing mailing list: ", error);
    }
  };
  
  const deleteMailingList = async (listId) => {
      if (window.confirm("האם אתה בטוח שברצונך למחוק את קבוצת הדיוור הזו?")) {
          if (!db || !userId) return;
          try {
              await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/mailing_lists`, listId));
          } catch (error) {
              console.error("Error deleting mailing list: ", error);
          }
      }
  };

  const addContact = async () => {
    if (!db || !userId || !newContactId || !newContactName) return;

    try {
      if (editingContact) {
        const contactDocRef = doc(db, `artifacts/${appId}/users/${userId}/contacts`, editingContact.id);
        await updateDoc(contactDocRef, { name: newContactName, userId: newContactId });
      } else {
        const contactDocRef = doc(collection(db, `artifacts/${appId}/users/${userId}/contacts`), newContactId);
        await setDoc(contactDocRef, {
          name: newContactName,
          userId: newContactId,
        });
      }
      setShowAddContactModal(false);
      setEditingContact(null);
      setNewContactId('');
      setNewContactName('');
    } catch (error) {
      console.error("Error adding/editing contact: ", error);
    }
  };

  const deleteContact = async (contactId) => {
      if (window.confirm("האם אתה בטוח שברצונך למחוק את איש הקשר הזה?")) {
          if (!db || !userId) return;
          try {
              await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/contacts`, contactId));
          } catch (error) {
              console.error("Error deleting contact: ", error);
          }
      }
  };
  
  const handleSaveSignature = async () => {
      if (!db || !userId) return;
      try {
          const settingsDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'userSettings');
          await setDoc(settingsDocRef, { signature: signature }, { merge: true });
          alert("החתימה נשמרה בהצלחה!");
      } catch (error) {
          console.error("Error saving signature: ", error);
          alert("שגיאה בשמירת החתימה.");
      }
  };

  const handleFileAttachment = (e) => {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              setComposeData({
                  ...composeData,
                  attachment: event.target.result,
                  attachmentName: file.name
              });
          };
          reader.readAsDataURL(file);
      }
  };


  const filteredEmails = (folder) => {
    let emails = folder === 'inbox' ? inboxEmails : folder === 'sent' ? sentEmails : drafts;
    
    // Apply main folder-specific filter
    if (folder === 'inbox') {
      if (filter === 'unread') emails = emails.filter(email => !email.isRead);
      if (filter === 'important') emails = emails.filter(email => email.isImportant);
    }

    // Apply search term filter
    if (searchTerm) {
      emails = emails.filter(email =>
        email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.from?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return emails;
  };
  
  const renderMailList = (emails, folder) => {
    return emails.map(email => (
      <div
        key={email.id}
        onClick={() => {
          setSelectedEmail(email);
          if (folder === 'inbox' && !email.isRead) {
            handleMarkAsRead(email);
          }
        }}
        className={`flex items-center p-4 border-b hover:bg-gray-100 transition-colors cursor-pointer ${!email.isRead && activeView === 'inbox' ? 'bg-blue-50' : 'bg-white'}`}
      >
        <div className="flex-shrink-0 mr-4">
          <img src={EMAIL_PLACEHOLDER} alt="פרופיל" className="w-10 h-10 rounded-full" />
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex justify-between items-center">
            <span className={`font-semibold text-gray-800 truncate ${!email.isRead && activeView === 'inbox' ? 'font-bold' : ''}`}>
              {email.from}
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleImportant(email, folder);
                }}
                className={`text-xl transition-transform hover:scale-110 ${email.isImportant ? 'text-yellow-400' : 'text-gray-400'}`}
              >
                ★
              </button>
              <span className="text-sm text-gray-500">
                {email.timestamp?.toDate().toLocaleDateString('he-IL')}
              </span>
            </div>
          </div>
          <h3 className={`font-medium text-gray-700 truncate ${!email.isRead && activeView === 'inbox' ? 'font-bold' : ''}`}>
            {email.subject || '(ללא נושא)'}
          </h3>
          <p className="text-gray-500 text-sm truncate">{email.body}</p>
        </div>
      </div>
    ));
  };
  
  const renderView = () => {
    switch(activeView) {
      case 'inbox':
      case 'sent':
      case 'drafts':
      case 'trash':
        if (selectedEmail) {
          const folder = activeView === 'inbox' ? 'inbox' : activeView === 'sent' ? 'sent' : 'drafts';
          return (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4 border-b pb-4">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="text-blue-600 hover:underline flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  חזור לתיקייה
                </button>
                <div className="flex space-x-2">
                  {activeView !== 'trash' && (
                    <button
                      onClick={() => handleMoveToTrash(selectedEmail, folder)}
                      className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    >
                      🗑️ מחק
                    </button>
                  )}
                  {activeView === 'trash' && (
                    <>
                      <button
                        onClick={() => handleRestoreFromTrash(selectedEmail)}
                        className="bg-green-500 text-white p-2 rounded-full shadow-lg hover:bg-green-600 transition-colors"
                      >
                        ↩️ שחזר
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(selectedEmail.id)}
                        className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                      >
                        ⛔ מחק לצמיתות
                      </button>
                    </>
                  )}
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">{selectedEmail.subject || '(ללא נושא)'}</h2>
              <div className="flex items-center text-gray-600 text-sm mb-4 border-b pb-4">
                <span className="font-medium">{selectedEmail.from}</span>
                <span className="mx-2">אל</span>
                <span className="font-medium">{selectedEmail.to}</span>
              </div>
              <div
                className="whitespace-pre-wrap text-gray-700"
                dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody || selectedEmail.body }}
              ></div>
              {selectedEmail.attachment && (
                <div className="mt-6 p-4 bg-gray-100 rounded-lg shadow-inner flex items-center space-x-4">
                  <img src={selectedEmail.attachment} alt="קובץ מצורף" className="w-24 h-24 rounded-md" />
                  <div>
                    <h4 className="font-semibold text-gray-800">קובץ מצורף: {selectedEmail.attachmentName}</h4>
                    <a href={selectedEmail.attachment} download={selectedEmail.attachmentName} className="text-blue-500 hover:underline">הורד קובץ</a>
                  </div>
                </div>
              )}
            </div>
          );
        }
        const currentEmails = activeView === 'inbox' ? inboxEmails : activeView === 'sent' ? sentEmails : activeView === 'drafts' ? drafts : trashEmails;
        return (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-800">
                {activeView === 'inbox' && 'דואר נכנס'}
                {activeView === 'sent' && 'דואר נשלח'}
                {activeView === 'drafts' && 'טיוטות'}
                {activeView === 'trash' && 'אשפה'}
              </h2>
              <div className="flex items-center space-x-4">
                {activeView === 'inbox' && (
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="p-2 border rounded-full text-sm"
                  >
                    <option value="all">הכל</option>
                    <option value="unread">לא נקרא</option>
                    <option value="important">חשוב</option>
                  </select>
                )}
                <input
                  type="text"
                  placeholder="חפש בדואר..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="p-2 border rounded-full w-1/3 text-right"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredEmails(activeView).length > 0 ? (
                renderMailList(filteredEmails(activeView), activeView)
              ) : (
                <p className="text-center text-gray-500 mt-10">
                  {searchTerm ? 'לא נמצאו תוצאות.' : 'אין מיילים בתיקייה זו.'}
                </p>
              )}
            </div>
          </div>
        );
      case 'mailing_lists':
        return (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-xl font-semibold">קבוצות דיוור</h2>
              <button
                onClick={() => {
                  setEditingMailingList(null);
                  setNewListName('');
                  setSelectedUsersForList([]);
                  setShowMailingListModal(true);
                }}
                className="bg-blue-600 text-white p-2 px-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
              >
                + צור קבוצת דיוור
              </button>
            </div>
            {mailingLists.length > 0 ? (
              <div className="space-y-4">
                {mailingLists.map(list => (
                  <div key={list.id} className="p-4 bg-gray-50 rounded-lg shadow-sm border">
                    <h3 className="font-bold text-lg">{list.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">מזהה קבוצה: {list.id}</p>
                    <p className="text-gray-500 text-sm mt-2">
                      חברים: {list.members.map(memberId => `משתמש ${memberId.substring(0, 8)}`).join(', ')}
                    </p>
                    <div className="mt-4 space-x-2">
                        <button
                          onClick={() => {
                            setEditingMailingList(list);
                            setNewListName(list.name);
                            setSelectedUsersForList(list.members);
                            setShowMailingListModal(true);
                          }}
                          className="bg-yellow-500 text-white text-sm px-3 py-1 rounded-full hover:bg-yellow-600"
                        >
                          ערוך
                        </button>
                        <button
                            onClick={() => deleteMailingList(list.id)}
                            className="bg-red-500 text-white text-sm px-3 py-1 rounded-full hover:bg-red-600"
                        >
                            מחק
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 mt-10">אין קבוצות דיוור כרגע.</p>
            )}
          </div>
        );
      case 'contacts':
        return (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-xl font-semibold">אנשי קשר</h2>
              <button
                onClick={() => {
                  setEditingContact(null);
                  setNewContactId('');
                  setNewContactName('');
                  setShowAddContactModal(true);
                }}
                className="bg-blue-600 text-white p-2 px-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
              >
                + הוסף איש קשר
              </button>
            </div>
            {contacts.length > 0 ? (
              <div className="space-y-4">
                {contacts.map(contact => (
                  <div key={contact.id} className="p-4 bg-gray-50 rounded-lg shadow-sm border">
                    <h3 className="font-bold text-lg">{contact.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">מזהה משתמש: {contact.userId}</p>
                    <div className="mt-4 space-x-2">
                        <button
                            onClick={() => {
                                setComposeData(prev => ({ ...prev, to: contact.userId }));
                                setActiveView('compose');
                            }}
                            className="bg-green-500 text-white text-sm px-3 py-1 rounded-full hover:bg-green-600"
                        >
                            שלח מייל
                        </button>
                        <button
                          onClick={() => {
                            setEditingContact(contact);
                            setNewContactId(contact.userId);
                            setNewContactName(contact.name);
                            setShowAddContactModal(true);
                          }}
                          className="bg-yellow-500 text-white text-sm px-3 py-1 rounded-full hover:bg-yellow-600"
                        >
                          ערוך
                        </button>
                        <button
                            onClick={() => deleteContact(contact.id)}
                            className="bg-red-500 text-white text-sm px-3 py-1 rounded-full hover:bg-red-600"
                        >
                            מחק
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 mt-10">אין אנשי קשר.</p>
            )}
          </div>
        );
      case 'compose':
        return (
          <div className="flex-1 p-6 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">מייל חדש</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">אל</label>
                <div className="mt-1 flex items-center">
                  <input
                    type="text"
                    value={composeData.to}
                    onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                    placeholder="הזן מזהה משתמש או מזהה רשימת דיוור"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  {(contacts.length > 0 || mailingLists.length > 0) && (
                    <select
                      onChange={(e) => setComposeData(prev => ({ ...prev, to: e.target.value }))}
                      className="ml-2 rounded-md border-gray-300 shadow-sm"
                      value={composeData.to}
                    >
                      <option value="">בחר איש קשר או קבוצה</option>
                      {contacts.map(contact => (
                        <option key={contact.id} value={contact.userId}>
                          {contact.name}
                        </option>
                      ))}
                      {mailingLists.map(list => (
                        <option key={list.id} value={list.id}>
                          {list.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">נושא</label>
                <input
                  type="text"
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">גוף ההודעה</label>
                <RichTextEditor
                  value={composeData.htmlBody}
                  onChange={(html) => setComposeData({ ...composeData, htmlBody: html, body: html.replace(/<[^>]*>?/gm, '') })}
                />
              </div>
              {composeData.attachment && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg shadow-inner flex items-center space-x-4">
                  <img src={ATTACHMENT_PLACEHOLDER} alt="קובץ מצורף" className="w-24 h-24 rounded-md" />
                  <div>
                    <h4 className="font-semibold text-gray-800">קובץ מצורף: {composeData.attachmentName}</h4>
                    <button
                        onClick={() => setComposeData({...composeData, attachment: null, attachmentName: null})}
                        className="text-red-500 hover:underline"
                    >
                        הסר
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">צרף קובץ (סימולציה)</label>
                  <input
                      type="file"
                      onChange={handleFileAttachment}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSendEmail}
                className="bg-blue-600 text-white font-bold py-2 px-6 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
              >
                שלח
              </button>
            </div>
          </div>
        );
      case 'settings':
        return (
            <div className="flex-1 p-6 overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">הגדרות</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">חתימת דוא"ל</label>
                        <p className="text-sm text-gray-500 mb-2">החתימה הזו תתווסף אוטומטית לתחתית כל מייל חדש.</p>
                        <RichTextEditor
                            value={signature}
                            onChange={(html) => setSignature(html)}
                            ref={signatureEditorRef}
                        />
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveSignature}
                            className="bg-green-600 text-white font-bold py-2 px-6 rounded-full shadow-lg hover:bg-green-700 transition-colors"
                        >
                            שמור חתימה
                        </button>
                    </div>
                </div>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex font-sans text-right" dir="rtl">
      {/* Notification banner */}
      {notification && (
        <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white text-center p-3 z-50 transition-all duration-300 animate-pulse">
          {notification}
        </div>
      )}

      {/* Main container */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-xl flex flex-col p-4 border-l">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-blue-600">דואר</h1>
            <span className="text-sm text-gray-600">מזהה: {userId ? userId.substring(0, 8) : 'טוען...'}</span>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => { setActiveView('compose'); setSelectedEmail(null); }}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            >
              מייל חדש
            </button>
            <nav className="mt-8 space-y-2">
              <SidebarButton
                label="דואר נכנס"
                icon="📬"
                active={activeView === 'inbox'}
                onClick={() => { setActiveView('inbox'); setSelectedEmail(null); }}
              />
              <SidebarButton
                label="דואר נשלח"
                icon="✉️"
                active={activeView === 'sent'}
                onClick={() => { setActiveView('sent'); setSelectedEmail(null); }}
              />
              <SidebarButton
                label="טיוטות"
                icon="📝"
                active={activeView === 'drafts'}
                onClick={() => { setActiveView('drafts'); setSelectedEmail(null); }}
              />
              <SidebarButton
                label="אשפה"
                icon="🗑️"
                active={activeView === 'trash'}
                onClick={() => { setActiveView('trash'); setSelectedEmail(null); }}
              />
              <SidebarButton
                label="קבוצות דיוור"
                icon="👥"
                active={activeView === 'mailing_lists'}
                onClick={() => { setActiveView('mailing_lists'); setSelectedEmail(null); }}
              />
              <SidebarButton
                label="אנשי קשר"
                icon="📖"
                active={activeView === 'contacts'}
                onClick={() => { setActiveView('contacts'); setSelectedEmail(null); }}
              />
              <SidebarButton
                label="הגדרות"
                icon="⚙️"
                active={activeView === 'settings'}
                onClick={() => { setActiveView('settings'); setSelectedEmail(null); }}
              />
            </nav>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {renderView()}
        </div>
      </div>

      {/* Modal for creating/editing a new mailing list */}
      {showMailingListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <form onSubmit={(e) => { e.preventDefault(); createMailingList(); }} className="bg-white p-6 rounded-lg shadow-2xl max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4 border-b pb-2">
              {editingMailingList ? 'עריכת קבוצת דיוור' : 'יצירת קבוצת דיוור חדשה'}
            </h3>
            <div className="mb-4">
              <label htmlFor="list-name" className="block text-gray-700 font-semibold mb-2">שם הקבוצה</label>
              <input
                type="text"
                id="list-name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="הכנס שם לקבוצת הדיוור"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">בחר חברים</label>
              <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                {allUsers.length > 0 ? (
                  allUsers.map(user => (
                    <div key={user.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`list-user-${user.id}`}
                        value={user.id}
                        checked={selectedUsersForList.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsersForList([...selectedUsersForList, user.id]);
                          } else {
                            setSelectedUsersForList(selectedUsersForList.filter(id => id !== user.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`list-user-${user.id}`} className="mr-2 text-gray-700">
                        {user.name || `משתמש ${user.id.substring(0, 8)}`}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">אין משתמשים נוספים</p>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                type="button"
                onClick={() => setShowMailingListModal(false)}
                className="bg-gray-300 text-gray-800 rounded-full p-2 px-4 hover:bg-gray-400 transition-colors"
              >
                בטל
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white rounded-full p-2 px-4 hover:bg-blue-700 transition-colors"
              >
                {editingMailingList ? 'שמור שינויים' : 'צור רשימה'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal for adding/editing a new contact */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <form onSubmit={(e) => { e.preventDefault(); addContact(); }} className="bg-white p-6 rounded-lg shadow-2xl max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4 border-b pb-2">
              {editingContact ? 'עריכת איש קשר' : 'הוספת איש קשר חדש'}
            </h3>
            <div className="mb-4">
              <label htmlFor="contact-id" className="block text-gray-700 font-semibold mb-2">מזהה משתמש</label>
              <input
                type="text"
                id="contact-id"
                value={newContactId}
                onChange={(e) => setNewContactId(e.target.value)}
                placeholder="הכנס מזהה משתמש של איש קשר"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="contact-name" className="block text-gray-700 font-semibold mb-2">שם איש קשר</label>
              <input
                type="text"
                id="contact-name"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                placeholder="הכנס שם לאיש הקשר"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                type="button"
                onClick={() => setShowAddContactModal(false)}
                className="bg-gray-300 text-gray-800 rounded-full p-2 px-4 hover:bg-gray-400 transition-colors"
              >
                בטל
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white rounded-full p-2 px-4 hover:bg-blue-700 transition-colors"
              >
                {editingContact ? 'שמור שינויים' : 'הוסף איש קשר'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const SidebarButton = ({ label, icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-right flex items-center p-3 rounded-lg transition-colors ${
      active
        ? 'bg-blue-100 text-blue-800 font-bold'
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    <span className="text-xl mr-3">{icon}</span>
    <span>{label}</span>
  </button>
);

// A simple Rich Text Editor component using contenteditable
const RichTextEditor = ({ value, onChange }) => {
  const [htmlContent, setHtmlContent] = useState(value);
  const editorRef = useRef(null);

  useEffect(() => {
    setHtmlContent(value);
  }, [value]);

  const handleInput = (e) => {
    const html = e.target.innerHTML;
    setHtmlContent(html);
    onChange(html);
  };

  const applyStyle = (command, value = null) => {
    document.execCommand(command, false, value);
    // Force React to re-render and capture the new HTML
    if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="border border-gray-300 rounded-md shadow-sm">
      <div className="bg-gray-100 p-2 border-b flex space-x-2">
        <button type="button" onClick={() => applyStyle('bold')} className="font-bold p-1 rounded hover:bg-gray-200">
          B
        </button>
        <button type="button" onClick={() => applyStyle('italic')} className="italic p-1 rounded hover:bg-gray-200">
          I
        </button>
        <button type="button" onClick={() => applyStyle('underline')} className="underline p-1 rounded hover:bg-gray-200">
          U
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        className="min-h-[200px] p-3 outline-none focus:ring-2 focus:ring-blue-500 rounded-b-md"
        style={{ direction: 'rtl', textAlign: 'right' }}
      ></div>
    </div>
  );
};

export default App;
