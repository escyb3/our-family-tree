import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Mail, Sun, Moon, Palette, Check, X, Loader2, Pin, PinOff, Tag, Search, Folder, Trash, FileText, Send, User, Users, Plus, Star, Link, Group, File, LogIn, Upload, Sparkles, Volume2, Settings, ArrowRight, Calendar, Mic, Play, Pause } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, getDocs, addDoc, serverTimestamp, where, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- הגדרות ושירותי אפליקציה ---
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : '';

// הגדרות API של Gemini
const API_KEY = "";
const GEMINI_TEXT_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;
const GEMINI_TTS_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${API_KEY}`;
const GEMINI_TTS_VOICE = "Kore"; // קול ברירת מחדל

// ערכות נושא לאפליקציה
const defaultThemes = {
  light: { name: 'בהיר', bg: 'bg-gray-100', text: 'text-gray-800', primary: 'bg-indigo-600', secondary: 'bg-white', panel: 'bg-white', icon: 'sun', textSecondary: 'text-gray-600' }
    dark: { name: 'כהה', bg: 'bg-gray-900', text: 'text-gray-100', primary: 'bg-slate-800', secondary: 'bg-gray-800', panel: 'bg-gray-800', icon: 'moon', textSecondary: 'text-gray-400' }
green: { name: 'ירוק', bg: 'bg-emerald-950', text: 'text-emerald-100', primary: 'bg-emerald-700', secondary: 'bg-emerald-800', panel: 'bg-emerald-800', icon: 'palette', textSecondary: 'text-emerald-400' },

// פונקציה להמרת PCM ל-WAV
const pcmToWav = (pcmData, sampleRate) => {
    const pcm16 = pcmData;
    const dataLength = pcm16.byteLength;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    const writer = new (function (view) {
      let pos = 0;
      this.uint32 = (v) => { view.setUint32(pos, v, true); pos += 4; };
      this.uint16 = (v) => { view.setUint16(pos, v, true); pos += 2; };
      this.uint8 = (v) => { view.setUint8(pos, v); pos += 1; };
    })(view);

    writer.uint32(0x46464952); // "RIFF"
    writer.uint32(36 + dataLength);
    writer.uint32(0x45564157); // "WAVE"
    writer.uint32(0x20746d66); // "fmt "
    writer.uint32(16);
    writer.uint16(1); // Format: PCM
    writer.uint16(1); // Channels: 1
    writer.uint32(sampleRate);
    writer.uint32(sampleRate * 2); // Byte rate
    writer.uint16(2); // Block align
    writer.uint16(16); // Bits per sample
    writer.uint32(0x61746164); // "data"
    writer.uint32(dataLength);

    const pcm8 = new Uint8Array(pcm16.buffer);
    for (let i = 0; i < dataLength; i++) {
        writer.uint8(pcm8[i]);
    }
    return new Blob([buffer], { type: 'audio/wav' });
};

// --- קומפוננטת האפליקציה הראשית ---
function App() {
  // מצבי האפליקציה
  const [theme, setTheme] = useState('light');
  const [showMailAlert, setShowMailAlert] = useState(false);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [draftSubject, setDraftSubject] = useState('');
  const [draftRecipient, setDraftRecipient] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState('');
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userProfile, setUserProfile] = useState({});
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({});
  const fileInputRef = useRef(null);
  const [isGeminiWorking, setIsGeminiWorking] = useState(false);
  const [geminiPrompt, setGeminiPrompt] = useState('');
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showToneModal, setShowToneModal] = useState(false);
  const [showFilePreviewModal, setShowFilePreviewModal] = useState(false);
  const [filePreviewContent, setFilePreviewContent] = useState(null);
  const [usernameError, setUsernameError] = useState('');
  const [isReadingAudio, setIsReadingAudio] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [customTheme, setCustomTheme] = useState({
      bg: '#f3f4f6', text: '#1f2937', primary: '#4f46e5', secondary: '#ffffff', panel: '#ffffff', textSecondary: '#6b7280'
  });
  const [showSettings, setShowSettings] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [usernameLogin, setUsernameLogin] = useState('');
  const [isLoginInProgress, setIsLoginInProgress] = useState(false);

  // מצבי תזמון אירוע
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarEventDetails, setCalendarEventDetails] = useState({ title: '', date: '', time: '' });

  // מצבי הודעה קולית
  const [showVoiceMessageModal, setShowVoiceMessageModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // אתחול Firebase ושירותים
  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authInstance = getAuth(app);
      setDb(firestore);
      setAuth(authInstance);

      const unsubscribeAuth = onAuthStateChanged(authInstance, async (user) => {
        if (user) {
          setUserId(user.uid);
          setIsLoggedIn(true);
        } else {
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(authInstance, initialAuthToken);
              setUserId(authInstance.currentUser?.uid);
              setIsLoggedIn(true);
            } else {
              setIsLoggedIn(false);
            }
          } catch (error) {
            console.error("Failed to sign in:", error);
            setIsLoggedIn(false);
          }
        }
        setIsAuthReady(true);
      });
      return () => unsubscribeAuth();
    } catch (e) {
      console.error("Error initializing Firebase: ", e);
    }
  }, []);

  // טעינת נתונים בזמן אמת
  useEffect(() => {
    if (!db || !isLoggedIn || !userId) return;

    const userDocRef = doc(db, `artifacts/${appId}/users/${userId}`);
    const unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserProfile(data);
        if (data.customTheme) {
            setCustomTheme(data.customTheme);
        }
        if (data.backgroundImage) {
            setBackgroundImage(data.backgroundImage);
        }
      }
    });

    const usersColRef = collection(db, `artifacts/${appId}/public/data/users`);
    const unsubscribeUsers = onSnapshot(usersColRef, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersList);
    });

    const contactsDocRef = doc(db, `artifacts/${appId}/users/${userId}/contacts/list`);
    const unsubscribeContacts = onSnapshot(contactsDocRef, (doc) => {
      setContacts(doc.exists() ? doc.data().contacts : []);
    });
    
    const groupsColRef = collection(db, `artifacts/${appId}/users/${userId}/groups`);
    const unsubscribeGroups = onSnapshot(groupsColRef, (snapshot) => {
        const groupsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGroups(groupsList);
    });

    const convsQuery = query(collection(db, `artifacts/${appId}/public/data/conversations`), where("participants", "array-contains", userId));
    const unsubscribeConvs = onSnapshot(convsQuery, (snapshot) => {
      const convsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const newMails = convsList.some(conv => {
        const lastMessageTime = conv.lastMessageTimestamp?.toDate().getTime() || 0;
        const lastReadTime = userProfile.lastReadTime?.[conv.id]?.toDate().getTime() || 0;
        return lastMessageTime > lastReadTime;
      });
      if (newMails) {
        handleNewMail();
      }
      setConversations(convsList);
      const allTags = new Set();
      convsList.forEach(conv => conv.tags?.forEach(tag => allTags.add(tag)));
      setTags(Array.from(allTags));
    });

    return () => {
      unsubscribeProfile();
      unsubscribeUsers();
      unsubscribeContacts();
      unsubscribeGroups();
      unsubscribeConvs();
    };
  }, [db, isLoggedIn, userId, userProfile.lastReadTime]);

  useEffect(() => {
    if (!db || !selectedConversation) {
      setMessages([]);
      return;
    }
    const messagesQuery = query(
      collection(db, `artifacts/${appId}/public/data/conversations/${selectedConversation.id}/messages`)
    );
    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    const updateLastReadTime = async () => {
      if (userProfile.lastReadTime?.[selectedConversation.id]?.isEqual(selectedConversation.lastMessageTimestamp)) {
          return;
      }
      const userDocRef = doc(db, `artifacts/${appId}/users/${userId}`);
      await updateDoc(userDocRef, {
          [`lastReadTime.${selectedConversation.id}`]: serverTimestamp()
      });
    };
    if (selectedConversation.lastMessageTimestamp) {
      updateLastReadTime();
    }

    return () => unsubscribeMessages();
  }, [db, selectedConversation, userId, userProfile]);

  // פונקציות המפעילות את Gemini API
  const callGeminiApi = async (prompt) => {
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory };
        const response = await fetch(GEMINI_TEXT_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText) {
          return generatedText;
        } else {
          throw new Error("Empty response from LLM");
        }
      } catch (error) {
        console.error(`Error calling Gemini API, retrying... Attempt ${attempts + 1}`, error);
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        } else {
          throw new Error("Failed to get response from Gemini API after multiple attempts.");
        }
      }
    }
  };

  // פונקציות קוליות (TTS)
  const readMessage = async (text) => {
    setIsReadingAudio(text);
    const payload = {
        contents: [{
            parts: [{ text: `Say cheerfully: ${text}` }]
        }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: GEMINI_TTS_VOICE }
                }
            }
        },
        model: "gemini-2.5-flash-preview-tts"
    };

    try {
        const response = await fetch(GEMINI_TTS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        const part = result?.candidates?.[0]?.content?.parts?.[0];
        const audioData = part?.inlineData?.data;
        const mimeType = part?.inlineData?.mimeType;

        if (audioData && mimeType && mimeType.startsWith("audio/")) {
            const sampleRateMatch = mimeType.match(/rate=(\d+)/);
            const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 16000;
            const pcmData = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
            const pcm16 = new Int16Array(pcmData.buffer);
            const wavBlob = pcmToWav(pcm16, sampleRate);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);
            const audio = new Audio(url);
            audio.play();
            audio.onended = () => setIsReadingAudio(null);
        } else {
            throw new Error("Invalid audio response from API");
        }
    } catch (error) {
        console.error("Error generating audio:", error);
        showCustomModal("שגיאה", "אירעה שגיאה בהשמעת ההודעה.");
        setIsReadingAudio(null);
    }
  };

  // פונקציות הקלטת קול
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(audioBlob);
        audioChunksRef.current = [];
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("שגיאה בגישה למיקרופון", error);
      showCustomModal("שגיאה", "לא היתה גישה למיקרופון. אנא ודא/י שנתת הרשאה.");
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };
  
  // חיפוש מתקדם
  const handleAdvancedSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    setSearchResults([]);
    const allMessagesText = conversations.flatMap(conv => {
        const fullMessages = messages.filter(m => m.conversationId === conv.id).map(m => m.text).join(' ');
        return {
            id: conv.id,
            text: fullMessages
        };
    });

    const prompt = `אתר את השיחות הרלוונטיות ביותר מתוך הטקסטים הבאים, בהתבסס על החיפוש הבא: "${searchQuery}".
    הטקסטים:
    ${JSON.stringify(allMessagesText)}
    
    השב עם מערך של ID-ים של השיחות הרלוונטיות בלבד. לדוגמה: ["id1", "id3"].`;

    try {
        const generatedText = await callGeminiApi(prompt);
        const relevantIds = JSON.parse(generatedText.replace(/```json/g, '').replace(/```/g, ''));
        if (Array.isArray(relevantIds)) {
            setSearchResults(relevantIds);
        }
    } catch (error) {
        console.error("Error with advanced search:", error);
        setSearchResults([]);
        showCustomModal("שגיאה", "אירעה שגיאה בחיפוש. אנא נסה שוב.");
    } finally {
        setIsSearching(false);
    }
  };


  const summarizeConversation = async (text) => {
    setIsSummarizing(true);
    setSummary('');
    try {
      const prompt = `סכם את השיחה הבאה בנקודות מרכזיות ותוך כדי שמירה על השפה המקורית (עברית).
      ${text}`;
      const generatedText = await callGeminiApi(prompt);
      setSummary(generatedText);
    } catch (error) {
      console.error("Error summarizing conversation:", error);
      setSummary("אירעה שגיאה בסיכום השיחה. אנא נסה שוב.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const generateDraft = async () => {
    if (!geminiPrompt) return;
    setIsGeminiWorking(true);
    try {
      const prompt = `כתוב טיוטה של מייל קצר בעברית המבוסס על ההנחיה הבאה:
      "${geminiPrompt}"
      `;
      const generatedText = await callGeminiApi(prompt);
      setDraftMessage(generatedText);
      setShowDraftModal(false);
    } catch (error) {
      console.error("Error generating draft:", error);
      showCustomModal("שגיאה", "אירעה שגיאה ביצירת הטיוטה. אנא נסה שוב.");
    } finally {
      setIsGeminiWorking(false);
      setGeminiPrompt('');
    }
  };

  const changeTone = async (tone) => {
    if (!draftMessage) return;
    setIsGeminiWorking(true);
    try {
      const prompt = `שכתב את הטקסט הבא בעברית כדי שיהיה בטון ${tone}:
      "${draftMessage}"
      `;
      const generatedText = await callGeminiApi(prompt);
      setDraftMessage(generatedText);
      setShowToneModal(false);
    } catch (error) {
      console.error("Error changing tone:", error);
      showCustomModal("שגיאה", "אירעה שגיאה בשינוי הטון. אנא נסה שוב.");
    } finally {
      setIsGeminiWorking(false);
    }
  };
  
  const checkIsSpam = async (messageText, subjectText) => {
    try {
      const prompt = `האם המייל הבא הוא ספאם? ענה רק עם 'כן' או 'לא'.
      נושא: "${subjectText}"
      תוכן: "${messageText}"`;
      const response = await callGeminiApi(prompt);
      const isSpam = response.trim().toLowerCase().includes('כן');
      return isSpam;
    } catch (error) {
      console.error("Error checking for spam:", error);
      const spamKeywords = ["הצעה מיוחדת", "זכה בפרס", "הגרלה", "מבצע מוגבל"];
      return spamKeywords.some(keyword => messageText.includes(keyword));
    }
  };

  // פונקציות עיקריות לניהול שיחות
  const handleSendMessage = async () => {
    if (!draftMessage && !attachedFile && !recordedBlob) return;
    const isMessageSpam = await checkIsSpam(draftMessage, draftSubject);
    
    let attachmentData = null;
    let voiceMessageData = null;

    if (attachedFile) {
      setUploadingFile(true);
      const storage = getStorage();
      const fileRef = storageRef(storage, `attachments/${userId}/${attachedFile.name}_${Date.now()}`);
      await uploadBytes(fileRef, attachedFile);
      const fileUrl = await getDownloadURL(fileRef);
      attachmentData = {
        name: attachedFile.name,
        url: fileUrl,
        size: (attachedFile.size / 1024).toFixed(2), // KB
        type: attachedFile.type
      };
      setUploadingFile(false);
    }

    if (recordedBlob) {
      setUploadingFile(true);
      const storage = getStorage();
      const voiceRef = storageRef(storage, `voice-messages/${userId}/voice_${Date.now()}.webm`);
      await uploadBytes(voiceRef, recordedBlob);
      const voiceUrl = await getDownloadURL(voiceRef);
      voiceMessageData = {
        url: voiceUrl,
        size: (recordedBlob.size / 1024).toFixed(2), // KB
        type: recordedBlob.type
      };
      setUploadingFile(false);
    }
    
    if (selectedConversation) {
      const messagesCollectionRef = collection(db, `artifacts/${appId}/public/data/conversations/${selectedConversation.id}/messages`);
      await addDoc(messagesCollectionRef, {
        senderId: userId,
        text: draftMessage,
        timestamp: serverTimestamp(),
        attachments: attachmentData ? [attachmentData] : [],
        voiceMessage: voiceMessageData,
        isSpam: isMessageSpam
      });
      const conversationDocRef = doc(db, `artifacts/${appId}/public/data/conversations/${selectedConversation.id}`);
      await updateDoc(conversationDocRef, {
        lastMessageTimestamp: serverTimestamp()
      });
    } else {
      let recipientIds;
      if (draftRecipient.startsWith('group:')) {
          const groupName = draftRecipient.substring(6);
          const group = groups.find(g => g.name === groupName);
          if (!group) {
              showCustomModal("שגיאה", "קבוצה לא נמצאה. אנא ודא שהשם נכון.");
              return;
          }
          recipientIds = [userId, ...group.members.map(member => member.id)];
      } else {
          const recipientEmails = draftRecipient.split(',').map(email => email.trim());
          const recipientUsers = users.filter(u => recipientEmails.includes(u.email));
          if (recipientUsers.length === 0) {
              showCustomModal("שגיאה", "נמען לא נמצא. אנא ודא שהכתובת נכונה.");
              return;
          }
          recipientIds = [userId, ...recipientUsers.map(u => u.id)];
      }

      const newConversationRef = await addDoc(collection(db, `artifacts/${appId}/public/data/conversations`), {
        participants: recipientIds,
        subject: draftSubject || 'ללא נושא',
        tags: [],
        lastMessageTimestamp: serverTimestamp()
      });
      const messagesCollectionRef = collection(db, `artifacts/${appId}/public/data/conversations/${newConversationRef.id}/messages`);
      await addDoc(messagesCollectionRef, {
        senderId: userId,
        text: draftMessage,
        timestamp: serverTimestamp(),
        attachments: attachmentData ? [attachmentData] : [],
        voiceMessage: voiceMessageData,
        isSpam: isMessageSpam
      });
      setSelectedConversation({ id: newConversationRef.id, participants: recipientIds, subject: draftSubject, tags: [] });
      setIsComposing(false);
    }
    setDraftMessage('');
    setDraftRecipient('');
    setDraftSubject('');
    setAttachedFile(null);
    setRecordedBlob(null);
  };

  const showCustomModal = (title, message) => {
    setModalContent({ title, message });
    setShowModal(true);
  };

  const handleLogin = async () => {
    if (!usernameLogin) {
      setUsernameError("אנא הזן שם משתמש.");
      return;
    }
    setIsLoginInProgress(true);
    setUsernameError('');
    try {
      const publicUsersRef = collection(db, `artifacts/${appId}/public/data/users`);
      const q = query(publicUsersRef, where("username", "==", usernameLogin));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const existingUserDoc = querySnapshot.docs[0];
        const existingUserId = existingUserDoc.id;
        const authInstance = getAuth(initializeApp(firebaseConfig));
        await signInAnonymously(authInstance); // sign in anonymously and then link the profile
        const newUid = authInstance.currentUser.uid;
        await setDoc(doc(db, `artifacts/${appId}/users/${newUid}`), {
          username: usernameLogin,
          email: `${usernameLogin}@family.local`,
          uid: newUid,
        });
        await setDoc(doc(db, `artifacts/${appId}/public/data/users/${newUid}`), {
          username: usernameLogin,
          email: `${usernameLogin}@family.local`,
          uid: newUid,
        });
        setUserId(newUid);
        setIsLoggedIn(true);
      } else {
        const authInstance = getAuth(initializeApp(firebaseConfig));
        await signInAnonymously(authInstance);
        const uid = authInstance.currentUser.uid;
        const email = `${usernameLogin}@family.local`;
        await setDoc(doc(db, `artifacts/${appId}/users/${uid}`), { username: usernameLogin, email, pinnedConversations: [] });
        await setDoc(doc(db, `artifacts/${appId}/public/data/users/${uid}`), { username: usernameLogin, email });
        setUserId(uid);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error("Login failed:", error);
      showCustomModal("שגיאה", "ההתחברות נכשלה. אנא נסה שוב.");
      setIsLoginInProgress(false);
    }
  };


  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  const showFilePreview = (attachment) => {
    setFilePreviewContent(attachment);
    setShowFilePreviewModal(true);
  };

  const addContact = async (email, name) => {
    if (!email || !name) return;
    const contactsDocRef = doc(db, `artifacts/${appId}/users/${userId}/contacts/list`);
    await setDoc(contactsDocRef, { contacts: arrayUnion({ email, name }) }, { merge: true });
  };

  const createGroup = async (groupName, members) => {
    if (!groupName || members.length === 0) return;
    const groupDocRef = doc(db, `artifacts/${appId}/users/${userId}/groups/${groupName}`);
    await setDoc(groupDocRef, { name: groupName, members: members.map(m => ({ id: m.id, email: m.email })) });
  };
  
  const getRecipientName = (participantIds) => {
      const otherParticipants = participantIds.filter(p => p !== userId);
      if (otherParticipants.length === 1) {
          const contact = contacts.find(c => users.find(u => u.id === otherParticipants[0])?.email === c.email);
          if (contact) return contact.name;
          const user = users.find(u => u.id === otherParticipants[0]);
          if (user) return user.username;
          return 'משתמש לא ידוע';
      }
      const group = groups.find(g => g.members.some(member => member.id === userId)); // Simple group check
      if(group) return group.name;
      return 'קבוצה';
  };

  const togglePinConversation = async (convId) => {
    const userDocRef = doc(db, `artifacts/${appId}/users/${userId}`);
    const isPinned = userProfile.pinnedConversations?.includes(convId);
    if (isPinned) {
      await updateDoc(userDocRef, {
        pinnedConversations: arrayRemove(convId)
      });
    } else {
      await updateDoc(userDocRef, {
        pinnedConversations: arrayUnion(convId)
      });
    }
  };
  
  const handleNewMail = () => {
    setShowMailAlert(true);
    setTimeout(() => {
      setShowMailAlert(false);
    }, 5000);
  };

  const handleSaveEvent = (e) => {
    e.preventDefault();
    if (calendarEventDetails.title && calendarEventDetails.date && calendarEventDetails.time) {
      showCustomModal("אירוע נשמר", `אירוע בשם "${calendarEventDetails.title}" נשמר ליומן בתאריך ${calendarEventDetails.date} בשעה ${calendarEventDetails.time}.`);
      setShowCalendarModal(false);
      setCalendarEventDetails({ title: '', date: '', time: '' });
    }
  };

  const getThemeClass = (prop) => {
    const currentTheme = userProfile.customTheme || defaultThemes[theme];
    return currentTheme[prop];
  };

  const renderLoginScreen = () => (
    <div className={`flex items-center justify-center min-h-screen ${defaultThemes.light.bg}`}>
      <div className={`p-8 rounded-xl shadow-2xl w-full max-w-sm text-center ${defaultThemes.light.panel}`}>
        <h1 className="text-3xl font-bold mb-4">ברוכים הבאים</h1>
        <p className={`mb-6 ${defaultThemes.light.textSecondary}`}>התחבר עם שם משתמש כדי להתחיל</p>
        <div className="relative mb-4">
          <input
            type="text"
            value={usernameLogin}
            onChange={(e) => {
                setUsernameLogin(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                setUsernameError('');
            }}
            placeholder="בחר או הזן שם משתמש"
            className={`w-full p-3 rounded-lg focus:outline-none focus:ring-2 ${usernameError ? 'focus:ring-red-500 border-red-500' : 'focus:ring-blue-500'} ${defaultThemes.light.secondary} ${defaultThemes.light.text}`}
          />
          <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${defaultThemes.light.textSecondary}`}>@family.local</span>
        </div>
        {usernameError && <p className="text-red-500 text-sm mb-4">{usernameError}</p>}
        <button
          onClick={handleLogin}
          className={`w-full py-3 rounded-lg font-semibold text-white transition-colors duration-200 ${
            usernameLogin && !isLoginInProgress ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'
          }`}
          disabled={!usernameLogin || isLoginInProgress}
        >
          <div className="flex items-center justify-center">
            {isLoginInProgress ? <Loader2 size={20} className="animate-spin ml-2" /> : <LogIn size={20} className="ml-2" />}
            התחבר
          </div>
        </button>
        <p className={`mt-4 text-xs ${defaultThemes.light.textSecondary}`}>השם יהפוך לכתובת המייל הייחודית שלך.</p>
      </div>
    </div>
  );

  const renderConversationList = () => (
    <div className={`w-full h-full p-4 overflow-y-auto ${getThemeClass('panel')} shadow-inner rounded-xl`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">שיחות</h2>
        <button
          onClick={() => {setIsComposing(true); setSelectedConversation(null);}}
          className={`p-2 rounded-full ${getThemeClass('primary')} text-white hover:opacity-80 transition-opacity`}
          title="מייל חדש"
        >
          <Plus size={20} />
        </button>
      </div>
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="חפש מיילים, תגיות..."
          className={`w-full p-3 pl-10 pr-4 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${getThemeClass('secondary')} ${getThemeClass('text')}`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
            onClick={handleAdvancedSearch}
            disabled={isSearching}
            className={`absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-white ${getThemeClass('primary')} hover:opacity-80`}
        >
          {isSearching ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
        </button>
      </div>
      {searchResults.length > 0 && (
          <div className="mb-4 p-4 rounded-xl bg-yellow-100 text-yellow-800">
              <h3 className="font-semibold">תוצאות חיפוש מתקדם:</h3>
              <p>נמצאו {searchResults.length} שיחות מתאימות לחיפוש.</p>
          </div>
      )}
      <div className="flex flex-wrap gap-2 mb-4">
        {tags.map(tag => (
          <button
            key={tag}
            onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              selectedTags.includes(tag) ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-800'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      {conversations.length > 0 ? (
        conversations
          .filter(conv => {
            const isSpam = messages.some(msg => msg.isSpam && conv.id === selectedConversation?.id);
            if (activeFolder === 'inbox' && isSpam) return false;
            if (activeFolder === 'spam' && !isSpam) return false;
            if (activeFolder === 'pinned' && !userProfile.pinnedConversations?.includes(conv.id)) return false;
            if (searchResults.length > 0 && !searchResults.includes(conv.id)) return false;
            if (searchQuery && !searchResults.length && !conv.subject?.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            if (selectedTags.length > 0 && !selectedTags.some(tag => conv.tags?.includes(tag))) {
                return false;
            }
            return true;
          })
          .sort((a, b) => {
            const aPinned = userProfile.pinnedConversations?.includes(a.id);
            const bPinned = userProfile.pinnedConversations?.includes(b.id);
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return (b.lastMessageTimestamp?.toDate() || 0) - (a.lastMessageTimestamp?.toDate() || 0);
          })
          .map(conv => {
            const isPinned = userProfile.pinnedConversations?.includes(conv.id);
            const isUnread = conv.lastMessageTimestamp && userProfile.lastReadTime?.[conv.id] && conv.lastMessageTimestamp?.toDate() > userProfile.lastReadTime?.[conv.id]?.toDate();
            const recipientName = getRecipientName(conv.participants);
            
            return (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-4 mb-2 rounded-xl cursor-pointer transition-transform transform hover:-translate-x-1 border-r-4 ${
                  selectedConversation?.id === conv.id ? 'bg-blue-100 dark:bg-slate-700 border-blue-500' : `${getThemeClass('panel')} border-transparent`
                } relative`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {isPinned && <Pin size={16} className="text-gray-500 ml-2" />}
                    <h3 className={`font-semibold ${isUnread ? 'text-blue-600' : ''}`}>{conv.subject || 'ללא נושא'}</h3>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); togglePinConversation(conv.id); }} className="text-gray-400 hover:text-blue-500 transition-colors">
                    {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                  </button>
                </div>
                <p className={`text-sm ${getThemeClass('textSecondary')} truncate`}>{recipientName}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {conv.tags?.map(tag => (
                    <span key={tag} className="bg-gray-300 text-gray-800 text-xs px-2 py-1 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            );
          })
      ) : (
        <p className={`text-center ${getThemeClass('textSecondary')} mt-8`}>אין שיחות בתיקייה זו.</p>
      )}
    </div>
  );

  const renderMessageView = () => (
    <div className={`flex flex-col h-full ${getThemeClass('panel')}`}>
      <div className={`p-4 shadow-md flex items-center justify-between ${getThemeClass('primary')} rounded-t-xl`}>
        <div className="flex items-center">
          <button onClick={() => setSelectedConversation(null)} className="ml-4 p-2 rounded-full hover:bg-white/20">
            <X size={20} />
          </button>
          <h2 className="text-xl font-bold">{selectedConversation.subject || 'ללא נושא'}</h2>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={() => summarizeConversation(messages.map(m => m.text).join('\n'))} className="p-2 rounded-full hover:bg-white/20" title="סכם שיחה" disabled={isSummarizing}>
              {isSummarizing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
            </button>
            <button onClick={() => togglePinConversation(selectedConversation.id)} className="p-2 rounded-full hover:bg-white/20" title={userProfile.pinnedConversations?.includes(selectedConversation.id) ? 'בטל הצמדה' : 'הצמד'}>
              {userProfile.pinnedConversations?.includes(selectedConversation.id) ? <PinOff size={20} /> : <Pin size={20} />}
            </button>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map(msg => {
            const sender = users.find(u => u.id === msg.senderId);
            const isMe = msg.senderId === userId;
            const isSpam = msg.isSpam;
            const senderName = isMe ? 'אני' : (sender?.username || 'משתמש לא ידוע');
            return (
                <div key={msg.id} className={`flex mb-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-3xl shadow-lg max-w-lg ${
                        isMe ? 'bg-blue-500 text-white rounded-bl-3xl' : 'bg-gray-200 text-gray-900 rounded-br-3xl'
                    } ${isSpam ? 'bg-red-200' : ''}`}>
                        <div className="flex items-center mb-1">
                            <span className={`font-semibold ${isMe ? 'text-white' : 'text-blue-600'}`}>
                                {senderName}
                            </span>
                            {isSpam && <span className="mr-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">ספאם</span>}
                            {msg.text && (
                                <button
                                    onClick={() => readMessage(msg.text)}
                                    disabled={isReadingAudio === msg.text}
                                    className={`mr-2 p-1 rounded-full ${isReadingAudio === msg.text ? 'bg-gray-400' : 'bg-white/20'} hover:bg-white/30`}
                                >
                                    {isReadingAudio === msg.text ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                                </button>
                            )}
                        </div>
                        {msg.text && <p>{msg.text}</p>}
                        {msg.attachments?.map((attachment, index) => (
                            <button key={index} onClick={() => showFilePreview(attachment)} className="flex items-center text-sm mt-2 text-blue-300 hover:underline">
                                <Link size={16} className="mr-1" />
                                {attachment.name} ({attachment.size} KB)
                            </button>
                        ))}
                        {msg.voiceMessage && (
                          <audio controls src={msg.voiceMessage.url} className="mt-2 w-full"></audio>
                        )}
                        <button onClick={() => setShowCalendarModal(true)} className="flex items-center text-sm mt-2 text-blue-300 hover:underline">
                          <Calendar size={16} className="mr-1" />
                          תזמן אירוע
                        </button>
                        <span className={`block text-xs mt-2 ${isMe ? 'text-white/70' : 'text-gray-500'}`}>
                            {msg.timestamp?.toDate().toLocaleString('he-IL')}
                        </span>
                    </div>
                </div>
            );
        })}
      </div>
      {summary && (
        <div className={`p-4 m-4 rounded-xl shadow-md bg-blue-100 text-blue-800`}>
          <h3 className="font-semibold mb-2">סיכום אוטומטי</h3>
          <p className="whitespace-pre-wrap">{summary}</p>
        </div>
      )}
      <div className={`p-4 border-t ${getThemeClass('panel')} flex items-center`}>
        <input
          type="text"
          value={draftMessage}
          onChange={(e) => setDraftMessage(e.target.value)}
          placeholder="כתוב הודעה..."
          className={`flex-1 p-3 rounded-full focus:outline-none ${getThemeClass('secondary')} ${getThemeClass('text')}`}
        />
        <button onClick={handleSendMessage} className={`mr-2 p-3 rounded-full ${getThemeClass('primary')} text-white hover:opacity-80 transition-opacity`} disabled={!draftMessage && !attachedFile && !recordedBlob}>
          <Send size={20} />
        </button>
      </div>
    </div>
  );

  const renderNewMailComposer = () => (
    <div className={`flex flex-col h-full ${getThemeClass('panel')} rounded-xl`}>
      <div className={`p-4 shadow-md flex items-center justify-between ${getThemeClass('primary')} rounded-t-xl`}>
        <h2 className="text-xl font-bold">מייל חדש</h2>
        <button onClick={() => setIsComposing(false)} className="p-2 rounded-full hover:bg-white/20">
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="mb-4">
          <label className={`block text-sm font-semibold mb-2 ${getThemeClass('textSecondary')}`}>אל</label>
          <input
            type="text"
            value={draftRecipient}
            onChange={(e) => setDraftRecipient(e.target.value)}
            placeholder="כתובת מייל (user1@family.local, group:family-chat)"
            className={`w-full p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${getThemeClass('secondary')} ${getThemeClass('text')}`}
          />
        </div>
        <div className="mb-4">
          <label className={`block text-sm font-semibold mb-2 ${getThemeClass('textSecondary')}`}>נושא</label>
          <input
            type="text"
            value={draftSubject}
            onChange={(e) => setDraftSubject(e.target.value)}
            placeholder="נושא המייל"
            className={`w-full p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${getThemeClass('secondary')} ${getThemeClass('text')}`}
          />
        </div>
        <div className="mb-4">
          <label className={`block text-sm font-semibold mb-2 ${getThemeClass('textSecondary')}`}>הודעה</label>
          <div className="relative">
            <textarea
              value={draftMessage}
              onChange={(e) => setDraftMessage(e.target.value)}
              placeholder="תוכן ההודעה"
              className={`w-full p-3 rounded-lg h-48 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${getThemeClass('secondary')} ${getThemeClass('text')}`}
            ></textarea>
            <div className="absolute left-2 top-2 flex flex-col space-y-2">
              <button
                onClick={() => setShowDraftModal(true)}
                className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                title="צור טיוטה אוטומטית"
              >
                <Sparkles size={16} />
              </button>
              <button
                onClick={() => setShowToneModal(true)}
                className="p-2 rounded-full bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                title="שנה טון של המייל"
              >
                <Sparkles size={16} />
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center mb-4 space-x-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button onClick={() => fileInputRef.current.click()} className={`p-3 rounded-lg flex items-center text-white font-semibold transition-colors ${getThemeClass('primary')} hover:opacity-80`}>
            <Upload size={20} className="ml-2" />
            צרף קובץ
          </button>
          <button
              onClick={() => setShowVoiceMessageModal(true)}
              className={`p-3 rounded-lg flex items-center text-white font-semibold transition-colors bg-green-500 hover:bg-green-600`}
          >
              <Mic size={20} className="ml-2" />
              הודעה קולית
          </button>
          {attachedFile && (
            <div className={`mr-4 flex items-center text-sm ${getThemeClass('textSecondary')}`}>
              <File size={16} className="ml-2" />
              <span>{attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)} className="mr-2 text-red-500">
                <X size={16} />
              </button>
            </div>
          )}
          {recordedBlob && (
              <div className={`mr-4 flex items-center text-sm ${getThemeClass('textSecondary')}`}>
                  <Mic size={16} className="ml-2" />
                  <span>הודעה קולית הוקלטה</span>
                  <button onClick={() => setRecordedBlob(null)} className="mr-2 text-red-500">
                      <X size={16} />
                  </button>
              </div>
          )}
        </div>
      </div>
      <div className={`p-4 border-t ${getThemeClass('panel')} flex justify-end`}>
        <button
          onClick={handleSendMessage}
          className={`p-3 rounded-full ${getThemeClass('primary')} text-white hover:opacity-80 transition-opacity`}
          title="שלח"
          disabled={!draftRecipient || (!draftMessage && !attachedFile && !recordedBlob)}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );

  const renderContacts = () => (
    <div className={`w-full h-full p-4 overflow-y-auto ${getThemeClass('panel')} shadow-inner rounded-xl`}>
      <h2 className="text-xl font-bold mb-4">אנשי קשר</h2>
      <div className="mb-4 grid md:grid-cols-2 gap-4">
        <div className={`bg-gray-200 p-4 rounded-xl ${getThemeClass('secondary')}`}>
            <h3 className="font-semibold mb-2">משתמשי המערכת</h3>
            {users.filter(u => u.id !== userId).map(u => (
                <div key={u.id} className={`p-3 mb-2 rounded-lg flex items-center justify-between ${getThemeClass('panel')}`}>
                    <div>
                        <p className="font-semibold">{u.username}</p>
                        <p className={`text-sm ${getThemeClass('textSecondary')}`}>{u.email}</p>
                    </div>
                    <button onClick={() => addContact(u.email, u.username)} className="p-2 rounded-full text-white bg-blue-500 hover:bg-blue-600 transition-colors">
                        <Plus size={16} />
                    </button>
                </div>
            ))}
        </div>
        <div className={`bg-gray-200 p-4 rounded-xl ${getThemeClass('secondary')}`}>
            <h3 className="font-semibold mb-2">אנשי הקשר שלי</h3>
            {contacts.map((c, index) => (
                <div key={index} className={`p-3 mb-2 rounded-lg flex items-center ${getThemeClass('panel')}`}>
                    <User size={20} className="ml-2" />
                    <div>
                        <p className="font-semibold">{c.name}</p>
                        <p className={`text-sm ${getThemeClass('textSecondary')}`}>{c.email}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderGroups = () => {
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);

    return (
      <div className={`w-full h-full p-4 overflow-y-auto ${getThemeClass('panel')} shadow-inner rounded-xl`}>
        <h2 className="text-xl font-bold mb-4">קבוצות דיון</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className={`${getThemeClass('secondary')} p-4 rounded-xl`}>
              <h3 className="font-semibold mb-2">צור קבוצה חדשה</h3>
              <div className="mb-3">
                  <input
                      type="text"
                      placeholder="שם הקבוצה"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className={`w-full p-2 rounded-md ${getThemeClass('panel')} ${getThemeClass('text')}`}
                  />
              </div>
              <div className="space-y-2 mb-3">
                  {users.filter(u => u.id !== userId).map(u => (
                      <div key={u.id} className="flex items-center justify-between">
                          <label className="flex items-center cursor-pointer">
                              <input
                                  type="checkbox"
                                  checked={selectedMembers.some(m => m.id === u.id)}
                                  onChange={() => {
                                      if (selectedMembers.some(m => m.id === u.id)) {
                                          setSelectedMembers(selectedMembers.filter(m => m.id !== u.id));
                                      } else {
                                          setSelectedMembers([...selectedMembers, u]);
                                      }
                                  }}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="mr-2 text-sm">{u.username}</span>
                          </label>
                      </div>
                  ))}
              </div>
              <button
                  onClick={() => createGroup(newGroupName, selectedMembers)}
                  className={`w-full py-2 px-4 rounded-lg text-white font-semibold ${
                      newGroupName && selectedMembers.length > 0 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!newGroupName || selectedMembers.length === 0}
              >
                  צור קבוצה
              </button>
          </div>
          <div className={`${getThemeClass('secondary')} p-4 rounded-xl`}>
              <h3 className="font-semibold mb-2">הקבוצות שלי</h3>
              {groups.map((g) => (
                  <div key={g.id} className={`p-3 mb-2 rounded-lg ${getThemeClass('panel')}`}>
                      <p className="font-semibold">{g.name}</p>
                      <p className={`text-sm ${getThemeClass('textSecondary')}`}>חברים: {g.members.map(m => users.find(u => u.id === m.id)?.username || 'משתמש לא ידוע').join(', ')}</p>
                  </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    const handleThemeSave = async () => {
        if (!db || !userId) return;
        const userDocRef = doc(db, `artifacts/${appId}/users/${userId}`);
        await updateDoc(userDocRef, { customTheme });
        showCustomModal("הצלחה", "ערכת הנושא נשמרה בהצלחה!");
    };
    
    const handleBackgroundUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const storage = getStorage();
        const fileRef = storageRef(storage, `backgrounds/${userId}/${file.name}`);
        setUploadingFile(true);
        await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileRef);
        setUploadingFile(false);
        setBackgroundImage(fileUrl);
        
        const userDocRef = doc(db, `artifacts/${appId}/users/${userId}`);
        await updateDoc(userDocRef, { backgroundImage: fileUrl });
        showCustomModal("הצלחה", "תמונת הרקע הועלתה בהצלחה!");
    };

    return (
        <div className={`w-full h-full p-4 overflow-y-auto ${getThemeClass('panel')} shadow-inner rounded-xl`}>
            <h2 className="text-xl font-bold mb-4">הגדרות</h2>
            <div className="grid md:grid-cols-2 gap-6">
                <div className={`${getThemeClass('secondary')} p-4 rounded-xl`}>
                    <h3 className="font-semibold mb-2">ערכת נושא מותאמת אישית</h3>
                    <p className={`text-sm ${getThemeClass('textSecondary')} mb-4`}>בחר צבעים משלך לאפליקציה.</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block mb-1">צבע רקע</label>
                            <input type="color" value={customTheme.bg} onChange={(e) => setCustomTheme({...customTheme, bg: e.target.value})} className="w-full h-10" />
                        </div>
                        <div>
                            <label className="block mb-1">צבע טקסט</label>
                            <input type="color" value={customTheme.text} onChange={(e) => setCustomTheme({...customTheme, text: e.target.value})} className="w-full h-10" />
                        </div>
                        <div>
                            <label className="block mb-1">צבע ראשי</label>
                            <input type="color" value={customTheme.primary} onChange={(e) => setCustomTheme({...customTheme, primary: e.target.value})} className="w-full h-10" />
                        </div>
                        <button onClick={handleThemeSave} className={`w-full py-2 px-4 rounded-lg text-white font-semibold bg-blue-500 hover:bg-blue-600`}>
                            שמור ערכת נושא
                        </button>
                    </div>
                </div>
                <div className={`${getThemeClass('secondary')} p-4 rounded-xl`}>
                    <h3 className="font-semibold mb-2">תמונת רקע</h3>
                    <p className={`text-sm ${getThemeClass('textSecondary')} mb-4`}>העלה תמונה שתופיע ברקע האפליקציה.</p>
                    <input type="file" onChange={handleBackgroundUpload} className="w-full" />
                    {backgroundImage && (
                        <div className="mt-4">
                            <p className="font-semibold">תמונת רקע נוכחית:</p>
                            <img src={backgroundImage} alt="Background Preview" className="w-full h-32 object-cover rounded-lg mt-2" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
  };
  
  const renderContent = () => {
    switch (activeFolder) {
      case 'inbox':
      case 'pinned':
      case 'spam':
        return renderConversationList();
      case 'contacts':
        return renderContacts();
      case 'groups':
        return renderGroups();
      case 'settings':
        return renderSettings();
      default:
        return renderConversationList();
    }
  };

  const renderModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`p-6 rounded-xl shadow-2xl w-full max-w-lg ${getThemeClass('panel')}`}>
        <div className="flex justify-between items-center pb-3 border-b-2 mb-4">
          <h3 className="text-xl font-bold">{modalContent.title}</h3>
          <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>
        <div className="mb-4">
          {modalContent.message}
        </div>
      </div>
    </div>
  );
  
  const renderDraftModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`p-6 rounded-xl shadow-2xl w-full max-w-lg ${getThemeClass('panel')}`}>
        <h3 className="text-xl font-bold mb-4">צור טיוטה אוטומטית</h3>
        <textarea
          value={geminiPrompt}
          onChange={(e) => setGeminiPrompt(e.target.value)}
          placeholder="כתוב הנחיה קצרה למייל שתרצה לכתוב (לדוגמה: מייל לבקש העלאה בשכר)"
          className={`w-full p-3 rounded-lg h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${getThemeClass('secondary')} ${getThemeClass('text')}`}
        ></textarea>
        <div className="flex justify-end mt-4">
          <button onClick={() => setShowDraftModal(false)} className="py-2 px-4 rounded-lg bg-gray-300 text-gray-800 hover:bg-gray-400">
            ביטול
          </button>
          <button
            onClick={generateDraft}
            className={`py-2 px-4 mr-2 rounded-lg text-white font-semibold transition-colors ${
              isGeminiWorking ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
            }`}
            disabled={isGeminiWorking}
          >
            {isGeminiWorking ? <Loader2 size={20} className="animate-spin" /> : 'צור טיוטה'}
          </button>
        </div>
      </div>
    </div>
  );
  
  const renderToneModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`p-6 rounded-xl shadow-2xl w-full max-w-lg ${getThemeClass('panel')}`}>
        <h3 className="text-xl font-bold mb-4">שנה טון של המייל</h3>
        <p className="mb-4">בחר טון חדש עבור הטיוטה:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => changeTone('פורמלי')}
            className={`py-2 px-4 rounded-lg text-white font-semibold transition-colors ${isGeminiWorking ? 'bg-gray-500 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'}`}
            disabled={isGeminiWorking}
          >
            פורמלי
          </button>
          <button
            onClick={() => changeTone('ידידותי')}
            className={`py-2 px-4 rounded-lg text-white font-semibold transition-colors ${isGeminiWorking ? 'bg-gray-500 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'}`}
            disabled={isGeminiWorking}
          >
            ידידותי
          </button>
          <button
            onClick={() => changeTone('עסקי')}
            className={`py-2 px-4 rounded-lg text-white font-semibold transition-colors ${isGeminiWorking ? 'bg-gray-500 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'}`}
            disabled={isGeminiWorking}
          >
            עסקי
          </button>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={() => setShowToneModal(false)} className="py-2 px-4 rounded-lg bg-gray-300 text-gray-800 hover:bg-gray-400">
            ביטול
          </button>
        </div>
      </div>
    </div>
  );

  const renderFilePreviewModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90%] overflow-auto ${getThemeClass('panel')}`}>
        <div className="flex justify-between items-center pb-3 border-b-2 mb-4">
          <h3 className="text-xl font-bold">תצוגה מקדימה: {filePreviewContent?.name}</h3>
          <button onClick={() => setShowFilePreviewModal(false)} className="p-2 rounded-full hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>
        <div className="text-center">
          {filePreviewContent?.type.startsWith('image/') && (
            <img src={filePreviewContent.url} alt={filePreviewContent.name} className="max-w-full h-auto rounded-lg shadow-md mx-auto" />
          )}
          {filePreviewContent?.type === 'application/pdf' && (
            <iframe src={filePreviewContent.url} className="w-full h-[60vh] rounded-lg shadow-md border-none"></iframe>
          )}
          {filePreviewContent?.type.includes('word') && (
            <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg">
              <p className="font-bold">תצוגה מקדימה של קבצי וורד אינה זמינה כרגע.</p>
              <p className="text-sm mt-2">אנא הורד את הקובץ כדי לצפות בו.</p>
              <a href={filePreviewContent?.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center text-blue-500 hover:underline">
                  <Link size={16} className="ml-1" />
                  הורד קובץ
              </a>
            </div>
          )}
          {!filePreviewContent?.type.startsWith('image/') && filePreviewContent?.type !== 'application/pdf' && !filePreviewContent?.type.includes('word') && (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg">
                <p className="font-bold">לא ניתן להציג קובץ מסוג "{filePreviewContent?.type}"</p>
                <p className="text-sm mt-2">סוגי הקבצים הנתמכים כרגע: תמונות, PDF וקבצי טקסט</p>
                <a href={filePreviewContent?.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center text-blue-500 hover:underline">
                    <Link size={16} className="ml-1" />
                    הורד קובץ
                </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCalendarModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`p-6 rounded-xl shadow-2xl w-full max-w-md ${getThemeClass('panel')}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">תזמון אירוע</h3>
          <button onClick={() => setShowCalendarModal(false)} className="p-2 rounded-full hover:bg-gray-200">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSaveEvent} className="space-y-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">כותרת האירוע</label>
            <input
              type="text"
              value={calendarEventDetails.title}
              onChange={(e) => setCalendarEventDetails({ ...calendarEventDetails, title: e.target.value })}
              className={`p-2 border rounded-md focus:ring-2 focus:ring-blue-500 text-right ${getThemeClass('secondary')}`}
              placeholder="הזן כותרת"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">תאריך</label>
            <input
              type="date"
              value={calendarEventDetails.date}
              onChange={(e) => setCalendarEventDetails({ ...calendarEventDetails, date: e.target.value })}
              className={`p-2 border rounded-md focus:ring-2 focus:ring-blue-500 text-right ${getThemeClass('secondary')}`}
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">שעה</label>
            <input
              type="time"
              value={calendarEventDetails.time}
              onChange={(e) => setCalendarEventDetails({ ...calendarEventDetails, time: e.target.value })}
              className={`p-2 border rounded-md focus:ring-2 focus:ring-blue-500 text-right ${getThemeClass('secondary')}`}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 transition-colors"
          >
            שמור אירוע
          </button>
        </form>
      </div>
    </div>
  );

  const renderVoiceMessageModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`p-6 rounded-xl shadow-2xl w-full max-w-md ${getThemeClass('panel')} text-center`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">הקלט הודעה קולית</h3>
          <button onClick={() => setShowVoiceMessageModal(false)} className="p-2 rounded-full hover:bg-gray-200">
            <X size={24} />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center space-y-4">
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            {isRecording ? <div className="w-8 h-8 rounded-full bg-white"></div> : <Mic size={48} />}
          </button>
          <p className="text-lg font-medium">
            {isRecording ? 'מקליט...' : (recordedBlob ? 'ההקלטה מוכנה לשליחה.' : 'לחץ כדי להקליט')}
          </p>
          {recordedBlob && (
            <>
              <audio src={URL.createObjectURL(recordedBlob)} controls className="w-full" />
              <button
                onClick={() => {
                  handleSendMessage();
                  setShowVoiceMessageModal(false);
                }}
                className="flex items-center justify-center bg-green-600 text-white p-3 rounded-md font-semibold hover:bg-green-700 transition-colors w-full"
              >
                <Send className="ml-2" />
                שלח הודעה
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );


  return (
    <>
      {!isLoggedIn && isAuthReady ? renderLoginScreen() : (
        <div 
            dir="rtl" 
            className={`min-h-screen ${getThemeClass('bg')} ${getThemeClass('text')} transition-colors duration-300 font-sans`}
            style={backgroundImage ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
          <div className="flex flex-col md:flex-row min-h-screen backdrop-blur-sm bg-black bg-opacity-10">
            <aside className={`md:w-64 p-4 shadow-lg ${getThemeClass('primary')} flex flex-col justify-between text-white`}>
              <div>
                <h1 className="text-2xl font-bold mb-6">מיילבוקס</h1>
                <div className="flex space-x-2 mb-8">
                  {Object.entries(defaultThemes).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setTheme(key)}
                      className={`p-3 rounded-full shadow-md transition-all ${
                        theme === key ? 'bg-white/20' : 'bg-white/10'
                      }`}
                      title={value.name}
                    >
                      {value.icon}
                    </button>
                  ))}
                </div>
                
                <h2 className="text-xl font-semibold mb-4">תיקיות</h2>
                <nav className="space-y-2">
                  <button onClick={() => setActiveFolder('inbox')} className={`w-full text-right p-3 rounded-lg transition-colors flex items-center hover:bg-white/20 ${activeFolder === 'inbox' ? 'bg-white/20' : ''}`}>
                    <Folder size={20} className="ml-2" />דואר נכנס
                  </button>
                  <button onClick={() => setActiveFolder('pinned')} className={`w-full text-right p-3 rounded-lg transition-colors flex items-center hover:bg-white/20 ${activeFolder === 'pinned' ? 'bg-white/20' : ''}`}>
                    <Pin size={20} className="ml-2" />מוצמדים
                  </button>
                  <button onClick={() => setActiveFolder('spam')} className={`w-full text-right p-3 rounded-lg transition-colors flex items-center hover:bg-white/20 ${activeFolder === 'spam' ? 'bg-white/20' : ''}`}>
                    <Trash size={20} className="ml-2" />ספאם
                  </button>
                  <button onClick={() => setActiveFolder('contacts')} className={`w-full text-right p-3 rounded-lg transition-colors flex items-center hover:bg-white/20 ${activeFolder === 'contacts' ? 'bg-white/20' : ''}`}>
                    <User size={20} className="ml-2" />אנשי קשר
                  </button>
                  <button onClick={() => setActiveFolder('groups')} className={`w-full text-right p-3 rounded-lg transition-colors flex items-center hover:bg-white/20 ${activeFolder === 'groups' ? 'bg-white/20' : ''}`}>
                    <Users size={20} className="ml-2" />קבוצות דיון
                  </button>
                  <button onClick={() => setActiveFolder('settings')} className={`w-full text-right p-3 rounded-lg transition-colors flex items-center hover:bg-white/20 ${activeFolder === 'settings' ? 'bg-white/20' : ''}`}>
                    <Settings size={20} className="ml-2" />הגדרות
                  </button>
                </nav>
              </div>
              {userProfile.email && (
                <div className="mt-8 text-sm opacity-80">
                  <p>ברוך הבא, {userProfile.username}</p>
                  <p>אימייל: <span className="font-mono">{userProfile.email}</span></p>
                  <p>ID: <span className="font-mono">{userId}</span></p>
                </div>
              )}
            </aside>
    
            <main className="flex-1 p-8">
              {showMailAlert && (
                <div className="fixed top-4 left-4 bg-green-500 text-white p-4 rounded-lg shadow-xl animate-fade-in-left">
                  <div className="flex items-center space-x-2">
                    <Check size={24} />
                    <span>יש לך מייל חדש!</span>
                  </div>
                </div>
              )}
              <div className="h-full">
                {isComposing ? renderNewMailComposer() : (
                  selectedConversation ? renderMessageView() : renderContent()
                )}
              </div>
            </main>
          </div>
          {showModal && renderModal()}
          {showDraftModal && renderDraftModal()}
          {showToneModal && renderToneModal()}
          {showFilePreviewModal && renderFilePreviewModal()}
          {showCalendarModal && renderCalendarModal()}
          {showVoiceMessageModal && renderVoiceMessageModal()}
        </div>
      )}
    </>
  );
}

export default App;
