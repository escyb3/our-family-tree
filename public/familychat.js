import { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, collection, query, orderBy, addDoc, serverTimestamp, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// Firebase configuration for your website
const firebaseConfig = {
  apiKey: "AIzaSyACQMHrUlPMwu_co8Wg7rgpzWneq1VmyP0",
  authDomain: "family-chat-c5f57.firebaseapp.com",
  projectId: "family-chat-c5f57",
  storageBucket: "family-chat-c5f57.firebasestorage.app",
  messagingSenderId: "735954675901",
  appId: "1:735954675901:web:8f70eb1d08f760b2b1efd4",
  measurementId: "G-8FDJ49T13K"
};

const appId = "default-app-id"; // Used to create Firestore paths
const initialAuthToken = null; // Not needed since standard login is used

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Translation object for UI texts
const translations = {
  he: {
    title: 'אפליקציית צ׳אט',
    connectedUsers: 'משתמשים מחוברים',
    publicChat: 'צ׳אט ציבורי',
    privateChats: 'צ׳אטים פרטיים',
    noOtherUsers: 'אין משתמשים אחרים זמינים.',
    connectedAs: 'מחובר כ:',
    uid: 'UID:',
    chatWith: 'צ\'אט עם',
    startConversation: 'התחל שיחה.',
    isTyping: 'מקליד...',
    editMessagePlaceholder: 'ערוך הודעה...',
    typeMessagePlaceholder: 'הקלד הודעה...',
    sendMessage: 'שלח הודעה',
    logout: 'התנתק',
    usernamePlaceholder: 'שם משתמש (לוגין)',
    displayNamePlaceholder: 'שם תצוגה',
    passwordPlaceholder: 'סיסמה',
    login: 'התחבר',
    createAccount: 'צור חשבון',
    enterDetails: 'אנא הכנס שם משתמש, שם תצוגה וסיסמה.',
    authError: 'שגיאה: ',
    loginSuccess: 'התחברת בהצלחה!',
    registerSuccess: 'המשתמש נוצר בהצלחה!',
    logoutSuccess: 'התנתקת בהצלחה.',
    autoAuthError: 'שגיאה בהתחברות אוטומטית. נסה להתחבר ידנית.',
    fetchUsersError: 'שגיאה בטעינת רשימת המשתמשים.',
    fetchMessagesError: 'שגיאה בטעינת הודעות.',
    fetchPrivateMessagesError: 'שגיאה בטעינת הודעות פרטיות.',
    sendUpdateError: 'שגיאה בשליחת/עדכון ההודעה.',
    edit: 'ערוך',
    delete: 'מחק',
    edited: '(נערך)',
    confirmDelete: 'בטוח שברצונך למחוק את ההודעה?',
    deleteError: 'שגיאה במחיקת ההודעה.',
    loading: 'טוען...',
  },
  en: {
    title: 'Chat Application',
    connectedUsers: 'Connected Users',
    publicChat: 'Public Chat',
    privateChats: 'Private Chats',
    noOtherUsers: 'No other users available.',
    connectedAs: 'Connected as:',
    uid: 'UID:',
    chatWith: 'Chat with',
    startConversation: 'Start a conversation.',
    isTyping: 'is typing...',
    editMessagePlaceholder: 'Edit message...',
    typeMessagePlaceholder: 'Type a message...',
    sendMessage: 'Send Message',
    logout: 'Logout',
    usernamePlaceholder: 'Username (login)',
    displayNamePlaceholder: 'Display Name',
    passwordPlaceholder: 'Password',
    login: 'Login',
    createAccount: 'Create Account',
    enterDetails: 'Please enter username, display name and password.',
    authError: 'Error: ',
    loginSuccess: 'Successfully logged in!',
    registerSuccess: 'User created successfully!',
    logoutSuccess: 'Successfully logged out.',
    autoAuthError: 'Automatic sign-in failed. Please try to log in manually.',
    fetchUsersError: 'Error loading user list.',
    fetchMessagesError: 'Error loading messages.',
    fetchPrivateMessagesError: 'Error loading private messages.',
    sendUpdateError: 'Error sending/updating the message.',
    edit: 'Edit',
    delete: 'Delete',
    edited: '(edited)',
    confirmDelete: 'Are you sure you want to delete this message?',
    deleteError: 'Error deleting the message.',
    loading: 'Loading...',
  },
  fr: {
    title: 'Application de chat',
    connectedUsers: 'Utilisateurs connectés',
    publicChat: 'Chat public',
    privateChats: 'Chats privés',
    noOtherUsers: 'Aucun autre utilisateur disponible.',
    connectedAs: 'Connecté en tant que :',
    uid: 'UID :',
    chatWith: 'Chat avec',
    startConversation: 'Commencez une conversation.',
    isTyping: 'écrit...',
    editMessagePlaceholder: 'Modifier le message...',
    typeMessagePlaceholder: 'Tapez un message...',
    sendMessage: 'Envoyer le message',
    logout: 'Déconnexion',
    usernamePlaceholder: 'Nom d\'utilisateur (login)',
    displayNamePlaceholder: 'Nom d\'affichage',
    passwordPlaceholder: 'Mot de passe',
    login: 'Connexion',
    createAccount: 'Créer un compte',
    enterDetails: 'Veuillez saisir le nom d\'utilisateur, le nom d\'affichage et le mot de passe.',
    authError: 'Erreur : ',
    loginSuccess: 'Connexion réussie !',
    registerSuccess: 'Utilisateur créé avec succès !',
    logoutSuccess: 'Déconnexion réussie.',
    autoAuthError: 'La connexion automatique a échoué. Veuillez essayer de vous connecter manuellement.',
    fetchUsersError: 'Erreur lors du chargement de la liste des utilisateurs.',
    fetchMessagesError: 'Erreur lors du chargement des messages.',
    fetchPrivateMessagesError: 'Erreur lors du chargement des messages privés.',
    sendUpdateError: 'Erreur lors de l\'envoi/de la mise à jour du message.',
    edit: 'Modifier',
    delete: 'Supprimer',
    edited: '(modifié)',
    confirmDelete: 'Êtes-vous sûr de vouloir supprimer ce message ?',
    deleteError: 'Erreur lors de la suppression du message.',
    loading: 'Chargement...',
  }
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isPublicChat, setIsPublicChat] = useState(true);
  const [selectedChatPartner, setSelectedChatPartner] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [language, setLanguage] = useState('he');
  const messageContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const t = translations[language];
  const isRTL = language === 'he';

  // useEffect for initial connection and user state management
  useEffect(() => {
    const handleSignIn = async () => {
      // No special login logic is needed here as the code is for an external site
    };
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, `/artifacts/${appId}/public/data/users`, currentUser.uid);
        onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUsername(docSnap.data().username);
            setDisplayName(docSnap.data().displayName);
          }
        });
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
      setLoading(false);
    });

    handleSignIn();

    return () => unsubscribe();
  }, []);

  // useEffect to listen for user list
  useEffect(() => {
    if (!isAuthReady) return;

    const usersCollection = collection(db, `/artifacts/${appId}/public/data/users`);
    const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => doc.data());
      setUsers(fetchedUsers);
    }, (error) => {
      console.error("Error fetching users:", error);
      setStatusMessage(t.fetchUsersError);
    });
    return () => unsubscribe();
  }, [isAuthReady, language]);

  // useEffect to listen for public or private chat messages
  useEffect(() => {
    if (!isAuthReady || !user) {
      setMessages([]);
      return;
    }

    let q;
    let unsubscribe;

    if (isPublicChat) {
      // Public chat
      const messagesCollection = collection(db, `/artifacts/${appId}/public/data/messages`);
      q = query(messagesCollection, orderBy('timestamp'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(fetchedMessages);
      }, (error) => {
        console.error("Error fetching messages:", error);
        setStatusMessage(t.fetchMessagesError);
      });
    } else if (selectedChatPartner) {
      // Private chat
      const chatId = [user.uid, selectedChatPartner.uid].sort().join('_');
      const messagesCollection = collection(db, `/artifacts/${appId}/public/data/chats/${chatId}/messages`);
      q = query(messagesCollection, orderBy('timestamp'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(fetchedMessages);
      }, (error) => {
        console.error("Error fetching private messages:", error);
        setStatusMessage(t.fetchPrivateMessagesError);
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAuthReady, user, isPublicChat, selectedChatPartner, language]);

  // useEffect to listen for typing status in private chat
  useEffect(() => {
    if (!isAuthReady || !user || isPublicChat || !selectedChatPartner) {
      setIsTyping(false);
      return;
    }

    const chatId = [user.uid, selectedChatPartner.uid].sort().join('_');
    const typingDocRef = doc(db, `/artifacts/${appId}/public/data/chats/${chatId}/typingStatus/status`);

    const unsubscribe = onSnapshot(typingDocRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().typingUser !== user.uid) {
        setIsTyping(true);
      } else {
        setIsTyping(false);
      }
    });

    return () => unsubscribe();
  }, [isAuthReady, user, isPublicChat, selectedChatPartner]);

  // useEffect for automatic chat scroll to the bottom
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Function to handle login and user creation
  const handleAuth = async (isRegister) => {
    if (!username || !password || !displayName) {
      setStatusMessage(t.enterDetails);
      return;
    }
    setLoading(true);
    setStatusMessage('');
    const email = `${username}@family.local`;

    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, `/artifacts/${appId}/public/data/users`, userCredential.user.uid), {
          uid: userCredential.user.uid,
          username: username,
          displayName: displayName,
          email: email,
          createdAt: serverTimestamp(),
        });
        setStatusMessage(t.registerSuccess);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setStatusMessage(t.loginSuccess);
      }
    } catch (error) {
      console.error("Auth Error:", error);
      setStatusMessage(`${t.authError} ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to send a new message or update an existing one
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (message.trim() === '' || !user) {
      return;
    }

    try {
      if (editingMessage) {
        let messageDocRef;
        if (isPublicChat) {
          messageDocRef = doc(db, `/artifacts/${appId}/public/data/messages`, editingMessage.id);
        } else {
          const chatId = [user.uid, selectedChatPartner.uid].sort().join('_');
          messageDocRef = doc(db, `/artifacts/${appId}/public/data/chats/${chatId}/messages`, editingMessage.id);
        }
        await updateDoc(messageDocRef, {
          text: message,
          editedAt: serverTimestamp()
        });
        setEditingMessage(null);
      } else {
        const messagePayload = {
          text: message,
          senderUid: user.uid,
          senderDisplayName: displayName,
          timestamp: serverTimestamp(),
        };

        if (isPublicChat) {
          await addDoc(collection(db, `/artifacts/${appId}/public/data/messages`), messagePayload);
        } else {
          const chatId = [user.uid, selectedChatPartner.uid].sort().join('_');
          await setDoc(doc(db, `/artifacts/${appId}/public/data/chats/${chatId}`), {
            participants: [user.uid, selectedChatPartner.uid],
            lastActive: serverTimestamp()
          }, { merge: true });
          await addDoc(collection(db, `/artifacts/${appId}/public/data/chats/${chatId}/messages`), messagePayload);
        }
      }
      setMessage('');
    } catch (error) {
      console.error("Error sending/updating message:", error);
      setStatusMessage(t.sendUpdateError);
    }
  };

  // Function to edit a message
  const handleEditMessage = (msg) => {
    if (user && msg.senderUid === user.uid) {
      setMessage(msg.text);
      setEditingMessage(msg);
    }
  };

  // Function to delete a message
  const handleDeleteMessage = async (msgId) => {
    if (window.confirm(t.confirmDelete)) {
      try {
        if (isPublicChat) {
          await deleteDoc(doc(db, `/artifacts/${appId}/public/data/messages`, msgId));
        } else {
          const chatId = [user.uid, selectedChatPartner.uid].sort().join('_');
          await deleteDoc(doc(db, `/artifacts/${appId}/public/data/chats/${chatId}/messages`, msgId));
        }
      } catch (error) {
        console.error("Error deleting message:", error);
        setStatusMessage(t.deleteError);
      }
    }
  };

  // Function to switch to a private chat
  const handleSelectChatPartner = (chatPartner) => {
    setSelectedChatPartner(chatPartner);
    setIsPublicChat(false);
    setMessages([]);
  };

  // Function to handle typing
  const handleTyping = async (text) => {
    setMessage(text);
    if (isPublicChat || !selectedChatPartner) return;

    const chatId = [user.uid, selectedChatPartner.uid].sort().join('_');
    const typingDocRef = doc(db, `/artifacts/${appId}/public/data/chats/${chatId}/typingStatus/status`);

    await setDoc(typingDocRef, {
      typingUser: user.uid,
      timestamp: serverTimestamp()
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(async () => {
      await setDoc(typingDocRef, { typingUser: null });
    }, 500);
  };

  // Function to handle logout
  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUsername('');
      setPassword('');
      setDisplayName('');
      setStatusMessage(t.logoutSuccess);
      setSelectedChatPartner(null);
      setIsPublicChat(true);
    } catch (error) {
      console.error("Logout Error:", error);
      setStatusMessage("Error logging out.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !isAuthReady) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{t.loading}</div>
      </div>
    );
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="flex flex-col h-screen font-sans bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 antialiased">
      <div className="flex justify-end p-4 space-x-2 space-x-reverse">
        <button onClick={() => setLanguage('he')} className={`px-4 py-2 rounded-full transition-colors duration-300 ${language === 'he' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
          עברית
        </button>
        <button onClick={() => setLanguage('en')} className={`px-4 py-2 rounded-full transition-colors duration-300 ${language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
          English
        </button>
        <button onClick={() => setLanguage('fr')} className={`px-4 py-2 rounded-full transition-colors duration-300 ${language === 'fr' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
          Français
        </button>
      </div>
      <div className="flex-1 flex flex-col md:flex-row p-4 md:p-8 space-y-4 md:space-y-0 md:space-x-4 md:space-x-reverse">
        {/* User list and status */}
        <div className="w-full md:w-1/4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col space-y-4">
          <h2 className="text-2xl font-bold border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">{t.connectedUsers}</h2>
          {user && (
            <div className="flex-1 overflow-y-auto space-y-2">
              <button
                onClick={() => { setIsPublicChat(true); setSelectedChatPartner(null); }}
                className={`w-full text-right p-3 rounded-xl transition-colors duration-300 ${isPublicChat ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
              >
                {t.publicChat}
              </button>
              <h3 className="text-lg font-semibold mt-4 mb-2">{t.privateChats}</h3>
              {users.filter(u => u.uid !== user.uid).length > 0 ? (
                <ul className="space-y-2">
                  {users.filter(u => u.uid !== user.uid).map((u) => (
                    <li key={u.uid}>
                      <button
                        onClick={() => handleSelectChatPartner(u)}
                        className={`w-full text-right p-3 rounded-xl transition-colors duration-300 ${!isPublicChat && selectedChatPartner?.uid === u.uid ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                      >
                        {u.displayName}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-gray-500 dark:text-gray-400">{t.noOtherUsers}</div>
              )}
            </div>
          )}
          {user && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <p className="text-sm">{t.connectedAs}<br/> <span className="font-bold">{displayName}</span></p>
              <p className="text-sm mt-1">{t.uid}<br/> <span className="font-mono text-xs break-all">{user.uid}</span></p>
            </div>
          )}
        </div>
  
        {/* Main chat area */}
        <div className="w-full md:w-3/4 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="text-center font-bold text-2xl border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
            {isPublicChat ? t.publicChat : `${t.chatWith} ${selectedChatPartner?.displayName}`}
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 mb-4" ref={messageContainerRef}>
            {messages.length > 0 ? (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.senderUid === user?.uid ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`p-3 rounded-xl max-w-[80%] md:max-w-[60%] shadow-md ${
                      msg.senderUid === user?.uid
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'
                    }`}
                  >
                    <div className="font-bold text-sm mb-1">{msg.senderDisplayName}</div>
                    <div>{msg.text}</div>
                    <div className="text-xs mt-1 opacity-70">
                      {msg.timestamp ? new Date(msg.timestamp.toMillis()).toLocaleString() : '...'}
                      {msg.editedAt && (
                        <span className="ml-2">{t.edited}</span>
                      )}
                    </div>
                    {user && msg.senderUid === user.uid && (
                      <div className="flex justify-end space-x-2 space-x-reverse mt-2">
                        <button
                          onClick={() => handleEditMessage(msg)}
                          className="text-xs text-gray-800 dark:text-gray-200 hover:text-yellow-400"
                        >
                          {t.edit}
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          {t.delete}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400">{t.startConversation}</div>
            )}
            {isTyping && (
              <div className="text-center text-gray-500 dark:text-gray-400 animate-pulse">
                {selectedChatPartner?.displayName} {t.isTyping}
              </div>
            )}
          </div>
  
          {user ? (
            <form onSubmit={handleSendMessage} className="flex space-x-2 space-x-reverse mt-auto">
              <input
                type="text"
                value={message}
                onChange={(e) => handleTyping(e.target.value)}
                placeholder={editingMessage ? t.editMessagePlaceholder : t.typeMessagePlaceholder}
                className="flex-1 p-3 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
              />
              <button
                type="submit"
                className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 transition-colors duration-300 shadow-md transform hover:scale-105"
                aria-label={t.sendMessage}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
              <button
                onClick={handleLogout}
                type="button"
                className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition-colors duration-300 shadow-md transform hover:scale-105"
                aria-label={t.logout}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </form>
          ) : (
            <div className="flex flex-col space-y-4">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.usernamePlaceholder}
                className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t.displayNamePlaceholder}
                className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex space-x-2 space-x-reverse">
                <button
                  onClick={() => handleAuth(false)}
                  disabled={loading}
                  className="flex-1 bg-green-500 text-white py-3 rounded-full hover:bg-green-600 transition-colors duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.login}
                </button>
                <button
                  onClick={() => handleAuth(true)}
                  disabled={loading}
                  className="flex-1 bg-purple-500 text-white py-3 rounded-full hover:bg-purple-600 transition-colors duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.createAccount}
                </button>
              </div>
            </div>
          )}
          {statusMessage && (
            <div className="mt-4 p-3 rounded-xl text-center bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm">
              {statusMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
