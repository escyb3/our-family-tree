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
    light: { name: 'בהיר', bg: 'bg-gray-100', text: 'text-gray-800', primary: 'bg-indigo-600', secondary: 'bg-white', panel: 'bg-white', icon: 'sun', textSecondary: 'text-gray-600' },
    dark: { name: 'כהה', bg: 'bg-gray-900', text: 'text-gray-100', primary: 'bg-slate-800', secondary: 'bg-gray-800', panel: 'bg-gray-800', icon: 'moon', textSecondary: 'text-gray-400' },
    green: { name: 'ירוק', bg: 'bg-emerald-950', text: 'text-emerald-100', primary: 'bg-emerald-700', secondary: 'bg-emerald-800', panel: 'bg-emerald-800', icon: 'palette', textSecondary: 'text-emerald-400' },
};

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

// פונקציה להמרת base64 ל-ArrayBuffer
const base64ToArrayBuffer = (base64) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
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
                const pcmData = base64ToArrayBuffer(audioData);
                const pcm16 = new Int16Array(pcmData);
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
                    .map(conv => (
                        <div
                            key={conv.id}
                            onClick={() => {setSelectedConversation(conv); setIsComposing(false);}}
                            className={`p-4 mb-2 rounded-xl cursor-pointer transition-colors duration-200 ${
                                selectedConversation?.id === conv.id ? `${getThemeClass('primary')} text-white` : `${getThemeClass('secondary')} hover:bg-gray-200`
                            }`}
                        >
                            <div className="flex justify-between items-center">
                                <h3 className={`font-semibold text-lg truncate ${selectedConversation?.id === conv.id ? 'text-white' : getThemeClass('text')}`}>
                                    {conv.subject || 'ללא נושא'}
                                </h3>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        togglePinConversation(conv.id);
                                    }}
                                    title={userProfile.pinnedConversations?.includes(conv.id) ? 'בטל הצמדה' : 'הצמד'}
                                >
                                    <Pin
                                        size={20}
                                        className={`transition-colors ${
                                            userProfile.pinnedConversations?.includes(conv.id)
                                                ? 'text-yellow-400'
                                                : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                    />
                                </button>
                            </div>
                            <p className={`text-sm ${selectedConversation?.id === conv.id ? 'text-white' : getThemeClass('textSecondary')}`}>
                                {getRecipientName(conv.participants)}
                            </p>
                        </div>
                    ))
            ) : (
                <p className={`text-center mt-8 ${getThemeClass('textSecondary')}`}>אין שיחות זמינות</p>
            )}
        </div>
    );

    const renderConversationView = () => (
        <div className="w-full h-full flex flex-col p-4">
            {/* Header */}
            <div className={`p-4 mb-4 rounded-xl shadow-md flex items-center justify-between ${getThemeClass('panel')}`}>
                <div className="flex items-center">
                    <button onClick={() => setSelectedConversation(null)} className={`p-2 rounded-full mr-2 ${getThemeClass('primary')} text-white`}>
                        <ArrowRight size={20} />
                    </button>
                    <div>
                        <h2 className={`text-xl font-bold ${getThemeClass('text')}`}>{selectedConversation.subject}</h2>
                        <p className={`text-sm ${getThemeClass('textSecondary')}`}>{getRecipientName(selectedConversation.participants)}</p>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => summarizeConversation(messages.map(m => m.text).join('\n'))}
                        className={`p-2 rounded-full ${getThemeClass('secondary')} ${getThemeClass('text')} hover:bg-gray-200`}
                        title="סכם שיחה"
                    >
                        <Sparkles size={20} />
                    </button>
                    <button
                        onClick={() => showCustomModal("הערה", "העברת מייל לארכיון פועלת כרגע רק בהדגמה.")}
                        className={`p-2 rounded-full ${getThemeClass('secondary')} ${getThemeClass('text')} hover:bg-gray-200`}
                        title="העבר לארכיון"
                    >
                        <Folder size={20} />
                    </button>
                </div>
            </div>

            {/* Summary display */}
            {isSummarizing && (
                <div className={`p-4 mb-4 rounded-xl ${getThemeClass('panel')} flex items-center justify-center`}>
                    <Loader2 size={24} className="animate-spin mr-2" />
                    <p className={getThemeClass('textSecondary')}>מסכם את השיחה...</p>
                </div>
            )}
            {summary && (
                <div className={`p-4 mb-4 rounded-xl shadow-md ${getThemeClass('panel')}`}>
                    <h3 className={`font-semibold mb-2 ${getThemeClass('text')}`}>סיכום השיחה:</h3>
                    <p className={`${getThemeClass('textSecondary')}`}>{summary}</p>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
                {messages.length > 0 ? (
                    messages.map(msg => (
                        <div
                            key={msg.id}
                            className={`flex mb-4 p-4 rounded-xl ${msg.senderId === userId ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`p-4 max-w-lg rounded-2xl shadow-md ${
                                msg.senderId === userId
                                    ? `${getThemeClass('primary')} text-white`
                                    : `${getThemeClass('secondary')} ${getThemeClass('text')}`
                            }`}>
                                <p className="font-semibold">{users.find(u => u.id === msg.senderId)?.username || 'משתמש לא ידוע'}</p>
                                <p className="mt-1">{msg.text}</p>
                                {msg.attachments?.length > 0 && (
                                    <div className="mt-2">
                                        {msg.attachments.map(att => (
                                            <div
                                                key={att.name}
                                                onClick={() => showFilePreview(att)}
                                                className="flex items-center text-sm p-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                                            >
                                                <FileText size={16} className="mr-2" />
                                                <span className="truncate">{att.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {msg.voiceMessage && (
                                    <div className="mt-2 flex items-center">
                                        <button
                                            onClick={() => {
                                                const audio = new Audio(msg.voiceMessage.url);
                                                audio.play();
                                            }}
                                            className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
                                        >
                                            <Play size={16} />
                                        </button>
                                        <span className="ml-2 text-sm">{msg.voiceMessage.size} KB</span>
                                    </div>
                                )}
                                {msg.isSpam && (
                                    <div className="mt-2 text-sm text-red-500 flex items-center">
                                        <X size={16} className="mr-1" />
                                        <span>סומן כספאם</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className={`text-center mt-8 ${getThemeClass('textSecondary')}`}>התחל שיחה חדשה</p>
                )}
            </div>

            {/* Reply bar */}
            <div className={`mt-4 p-4 rounded-xl shadow-md ${getThemeClass('panel')} flex items-center`}>
                <input
                    type="text"
                    value={draftMessage}
                    onChange={(e) => setDraftMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="כתוב הודעה..."
                    className={`flex-1 p-3 mr-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${getThemeClass('secondary')} ${getThemeClass('text')}`}
                />
                <button
                    onClick={handleSendMessage}
                    className={`p-3 rounded-full text-white ${getThemeClass('primary')} hover:opacity-80 transition-opacity`}
                    title="שלח"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    );

    const renderComposeMail = () => (
        <div className="w-full h-full flex flex-col p-4">
            <div className={`p-4 mb-4 rounded-xl shadow-md flex items-center justify-between ${getThemeClass('panel')}`}>
                <div className="flex items-center">
                    <button onClick={() => setIsComposing(false)} className={`p-2 rounded-full mr-2 ${getThemeClass('primary')} text-white`}>
                        <ArrowRight size={20} />
                    </button>
                    <h2 className={`text-xl font-bold ${getThemeClass('text')}`}>מייל חדש</h2>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setShowDraftModal(true)}
                        className={`p-2 rounded-full ${getThemeClass('secondary')} ${getThemeClass('text')} hover:bg-gray-200`}
                        title="יצירת טיוטה עם Gemini"
                    >
                        <Sparkles size={20} />
                    </button>
                    <button
                        onClick={fileInputRef.current?.click}
                        className={`p-2 rounded-full ${getThemeClass('secondary')} ${getThemeClass('text')} hover:bg-gray-200`}
                        title="צרף קובץ"
                    >
                        <Upload size={20} />
                    </button>
                    <button
                        onClick={() => setShowVoiceMessageModal(true)}
                        className={`p-2 rounded-full ${getThemeClass('secondary')} ${getThemeClass('text')} hover:bg-gray-200`}
                        title="הקלט הודעה קולית"
                    >
                        <Mic size={20} />
                    </button>
                    <button
                        onClick={() => setShowCalendarModal(true)}
                        className={`p-2 rounded-full ${getThemeClass('secondary')} ${getThemeClass('text')} hover:bg-gray-200`}
                        title="קבע אירוע"
                    >
                        <Calendar size={20} />
                    </button>
                </div>
            </div>

            <div className={`flex-1 overflow-y-auto p-4 rounded-xl shadow-md ${getThemeClass('panel')}`}>
                <div className="mb-4">
                    <label className={`block text-sm font-semibold mb-1 ${getThemeClass('text')}`}>אל:</label>
                    <input
                        type="text"
                        value={draftRecipient}
                        onChange={(e) => setDraftRecipient(e.target.value)}
                        placeholder="שם משתמש, כתובת מייל, או 'group:שם_הקבוצה'"
                        className={`w-full p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${getThemeClass('secondary')} ${getThemeClass('text')}`}
                    />
                </div>
                <div className="mb-4">
                    <label className={`block text-sm font-semibold mb-1 ${getThemeClass('text')}`}>נושא:</label>
                    <input
                        type="text"
                        value={draftSubject}
                        onChange={(e) => setDraftSubject(e.target.value)}
                        placeholder="נושא"
                        className={`w-full p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${getThemeClass('secondary')} ${getThemeClass('text')}`}
                    />
                </div>
                <div className="mb-4">
                    <label className={`block text-sm font-semibold mb-1 ${getThemeClass('text')}`}>תוכן:</label>
                    <textarea
                        value={draftMessage}
                        onChange={(e) => setDraftMessage(e.target.value)}
                        placeholder="כתוב את המייל כאן..."
                        className={`w-full h-64 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${getThemeClass('secondary')} ${getThemeClass('text')}`}
                    />
                </div>
                {attachedFile && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <span className="truncate">{attachedFile.name}</span>
                        <button onClick={() => setAttachedFile(null)} className="p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600">
                            <X size={16} />
                        </button>
                    </div>
                )}
                {recordedBlob && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <span className="truncate">הודעה קולית מצורפת</span>
                        <button onClick={() => setRecordedBlob(null)} className="p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600">
                            <X size={16} />
                        </button>
                    </div>
                )}
                <div className="flex items-center justify-end mt-4">
                    <button
                        onClick={handleSendMessage}
                        disabled={(!draftMessage && !attachedFile && !recordedBlob) || !draftRecipient || uploadingFile}
                        className={`py-3 px-6 rounded-full font-semibold text-white transition-colors duration-200 ${
                            (!draftMessage && !attachedFile && !recordedBlob) || !draftRecipient || uploadingFile
                                ? 'bg-gray-400 cursor-not-allowed'
                                : `${getThemeClass('primary')} hover:opacity-80`
                        }`}
                    >
                        <div className="flex items-center">
                            {uploadingFile ? <Loader2 size={20} className="animate-spin mr-2" /> : <Send size={20} className="mr-2" />}
                            שלח
                        </div>
                    </button>
                </div>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
            />
        </div>
    );

    const renderMainApp = () => (
        <div
            className={`min-h-screen flex text-right ${getThemeClass('bg')} ${getThemeClass('text')}`}
            style={{
                backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            {/* Sidebar */}
            <div className={`w-16 md:w-64 flex-shrink-0 p-4 border-l ${getThemeClass('panel')} shadow-lg rounded-xl mr-4 m-4 transition-all duration-300`}>
                <div className="flex flex-col items-center md:items-start h-full">
                    {/* User info & theme toggle */}
                    <div className="flex items-center md:items-start md:flex-row flex-col mb-6 w-full">
                        <div className="bg-gray-300 rounded-full w-10 h-10 flex items-center justify-center text-gray-800">
                            <User size={24} />
                        </div>
                        <div className="hidden md:block mr-2 text-sm">
                            <p className="font-semibold truncate">{userProfile.username}</p>
                            <p className="text-xs">{userId}</p>
                        </div>
                    </div>

                    {/* Folders & Navigation */}
                    <div className="w-full flex-1">
                        <ul className="space-y-2">
                            <li
                                onClick={() => setActiveFolder('inbox')}
                                className={`cursor-pointer flex items-center md:justify-start justify-center p-3 rounded-xl transition-colors duration-200 ${
                                    activeFolder === 'inbox' ? `${getThemeClass('primary')} text-white` : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            >
                                <Mail size={20} className="md:ml-2" />
                                <span className="hidden md:block">דואר נכנס</span>
                            </li>
                            <li
                                onClick={() => setActiveFolder('pinned')}
                                className={`cursor-pointer flex items-center md:justify-start justify-center p-3 rounded-xl transition-colors duration-200 ${
                                    activeFolder === 'pinned' ? `${getThemeClass('primary')} text-white` : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            >
                                <Pin size={20} className="md:ml-2" />
                                <span className="hidden md:block">מוצמדים</span>
                            </li>
                            <li
                                onClick={() => setActiveFolder('sent')}
                                className={`cursor-pointer flex items-center md:justify-start justify-center p-3 rounded-xl transition-colors duration-200 ${
                                    activeFolder === 'sent' ? `${getThemeClass('primary')} text-white` : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            >
                                <Send size={20} className="md:ml-2" />
                                <span className="hidden md:block">נשלח</span>
                            </li>
                            <li
                                onClick={() => setActiveFolder('spam')}
                                className={`cursor-pointer flex items-center md:justify-start justify-center p-3 rounded-xl transition-colors duration-200 ${
                                    activeFolder === 'spam' ? `${getThemeClass('primary')} text-white` : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            >
                                <Trash size={20} className="md:ml-2" />
                                <span className="hidden md:block">ספאם</span>
                            </li>
                            <li
                                onClick={() => setShowSettings(!showSettings)}
                                className={`cursor-pointer flex items-center md:justify-start justify-center p-3 rounded-xl transition-colors duration-200 ${
                                    showSettings ? `${getThemeClass('primary')} text-white` : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            >
                                <Settings size={20} className="md:ml-2" />
                                <span className="hidden md:block">הגדרות</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 flex p-4 h-screen">
                {/* Conversation list */}
                <div className="w-1/3 flex-shrink-0 mr-4">
                    {renderConversationList()}
                </div>
                {/* Conversation view or compose area */}
                <div className="flex-1 flex">
                    {selectedConversation ? renderConversationView() : (isComposing ? renderComposeMail() : <div className="flex-1 p-4 rounded-xl shadow-inner flex items-center justify-center bg-white dark:bg-gray-800">
                        <p className="text-gray-400">בחר שיחה או התחל חדשה</p>
                    </div>)}
                </div>
            </div>

            {/* General modals */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl max-w-sm w-full text-center">
                        <h3 className="text-xl font-bold mb-4">{modalContent.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">{modalContent.message}</p>
                        <button onClick={() => setShowModal(false)} className="py-2 px-6 rounded-full bg-blue-500 text-white font-semibold">
                            סגור
                        </button>
                    </div>
                </div>
            )}
            {showDraftModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">יצירת טיוטה עם Gemini</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">הזן בקצרה את נושא המייל, ו-Gemini ייצור עבורך טיוטה.</p>
                        <textarea
                            value={geminiPrompt}
                            onChange={(e) => setGeminiPrompt(e.target.value)}
                            placeholder="לדוגמה: 'מייל ללקוח לגבי עיכוב במשלוח'"
                            className="w-full h-24 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700"
                        />
                        <div className="flex justify-end space-x-2 mt-4">
                            <button onClick={() => setShowDraftModal(false)} className="py-2 px-4 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                                ביטול
                            </button>
                            <button onClick={generateDraft} disabled={isGeminiWorking} className={`py-2 px-4 rounded-full text-white font-semibold ${isGeminiWorking ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}>
                                {isGeminiWorking ? <Loader2 size={20} className="animate-spin" /> : 'צור טיוטה'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showToneModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">שנה טון</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">בחר את הטון הרצוי עבור הטיוטה:</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {['רשמי', 'ידידותי', 'מקצועי', 'משעשע', 'ממוקד'].map(tone => (
                                <button
                                    key={tone}
                                    onClick={() => changeTone(tone)}
                                    className="py-2 px-4 rounded-full bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors"
                                    disabled={isGeminiWorking}
                                >
                                    {tone}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                            <button onClick={() => setShowToneModal(false)} className="py-2 px-4 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                                ביטול
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showFilePreviewModal && filePreviewContent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl max-w-lg w-full">
                        <h3 className="text-xl font-bold mb-4">תצוגה מקדימה של קובץ</h3>
                        <p className="mb-2 font-semibold">שם הקובץ: {filePreviewContent.name}</p>
                        <a href={filePreviewContent.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            פתח קובץ בטאב חדש
                        </a>
                        <button onClick={() => setShowFilePreviewModal(false)} className="mt-4 block w-full py-2 px-4 rounded-full bg-blue-500 text-white font-semibold">
                            סגור
                        </button>
                    </div>
                </div>
            )}
            {showMailAlert && (
                <div className="fixed bottom-4 left-4 p-4 rounded-xl shadow-lg bg-green-500 text-white flex items-center z-50 animate-bounce">
                    <Mail size={24} className="ml-2" />
                    <span>יש לך מייל חדש!</span>
                </div>
            )}
            {showCalendarModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <form onSubmit={handleSaveEvent} className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl max-w-sm w-full">
                        <h3 className="text-xl font-bold mb-4">קבע אירוע חדש</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">כותרת:</label>
                            <input
                                type="text"
                                value={calendarEventDetails.title}
                                onChange={(e) => setCalendarEventDetails({ ...calendarEventDetails, title: e.target.value })}
                                className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">תאריך:</label>
                            <input
                                type="date"
                                value={calendarEventDetails.date}
                                onChange={(e) => setCalendarEventDetails({ ...calendarEventDetails, date: e.target.value })}
                                className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">שעה:</label>
                            <input
                                type="time"
                                value={calendarEventDetails.time}
                                onChange={(e) => setCalendarEventDetails({ ...calendarEventDetails, time: e.target.value })}
                                className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700"
                                required
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button type="button" onClick={() => setShowCalendarModal(false)} className="py-2 px-4 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                                ביטול
                            </button>
                            <button type="submit" className="py-2 px-4 rounded-full bg-blue-500 text-white font-semibold">
                                שמור
                            </button>
                        </div>
                    </form>
                </div>
            )}
            {showVoiceMessageModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl max-w-sm w-full text-center">
                        <h3 className="text-xl font-bold mb-4">הודעה קולית</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">{isRecording ? 'מקליט...' : 'לחץ כדי להקליט'}</p>
                        <div className="flex justify-center items-center space-x-4">
                            {!isRecording ? (
                                <button onClick={handleStartRecording} className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600">
                                    <Mic size={24} />
                                </button>
                            ) : (
                                <button onClick={handleStopRecording} className="p-4 rounded-full bg-gray-500 text-white hover:bg-gray-600">
                                    <Pause size={24} />
                                </button>
                            )}
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                            <button type="button" onClick={() => setShowVoiceMessageModal(false)} className="py-2 px-4 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                                ביטול
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <Loader2 size={48} className="animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className={`app-container font-sans ${getThemeClass('bg')} ${getThemeClass('text')}`}>
            {isLoggedIn ? renderMainApp() : renderLoginScreen()}
        </div>
    );
}

export default App;

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);

