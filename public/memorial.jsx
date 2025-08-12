import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Component for a single memorial card with interactive features
const MemorialCard = ({ memorial, currentUserId }) => {
  const [comments, setComments] = useState(memorial.comments || []);
  const [newComment, setNewComment] = useState('');
  const db = getFirestore();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  // Handler for lighting a candle, updates Firestore
  const handleLightCandle = async () => {
    try {
      const memorialRef = doc(db, 'artifacts', appId, 'public', 'data', 'memorials', memorial.id);
      await updateDoc(memorialRef, {
        candles: (memorial.candles || 0) + 1,
      });
    } catch (error) {
      console.error('Error updating candle count:', error);
    }
  };

  // Handler for adding a comment, updates Firestore
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (newComment.trim() === '') return;

    try {
      const memorialRef = doc(db, 'artifacts', appId, 'public', 'data', 'memorials', memorial.id);
      const updatedComments = [
        ...comments,
        {
          author: currentUserId, // Using the user ID as author
          text: newComment,
          timestamp: new Date().toLocaleString('he-IL'),
        },
      ];
      await updateDoc(memorialRef, {
        comments: updatedComments,
      });
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center max-w-lg mx-auto transition-transform duration-300 hover:scale-105">
      <img
        src={memorial.photoUrl}
        alt={memorial.name}
        className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-gray-200"
      />
      <h3 className="text-3xl font-bold text-gray-800 mb-1">
        {memorial.name}
      </h3>
      <p className="text-gray-500 italic mb-4">
        {memorial.years}
      </p>
      <p className="text-gray-600 text-center mb-4">
        {memorial.dedication}
      </p>

      {/* Interactive Candle Section */}
      <div className="flex items-center gap-4 mt-4">
        <button
          onClick={handleLightCandle}
          className="bg-red-600 text-white font-bold py-2 px-6 rounded-full shadow-md hover:bg-red-700 transition"
        >
          🕯️ הדלק נר לזכרו
        </button>
        <span className="text-gray-700 font-medium">
          {memorial.candles} נרות נשמה הודלקו
        </span>
      </div>

      {/* Comments Section */}
      <div className="w-full mt-8">
        <h4 className="text-xl font-bold mb-4 border-b pb-2 border-gray-200">
          זיכרונות ותגובות
        </h4>
        <ul className="space-y-4 max-h-60 overflow-y-auto pr-2">
          {memorial.comments?.length > 0 ? (
            memorial.comments.map((comment, index) => (
              <li key={index} className="bg-gray-50 p-3 rounded-lg shadow-sm">
                <p className="text-gray-800 text-sm">{comment.text}</p>
                <div className="text-gray-400 text-xs mt-1">
                  <span>מאת: {comment.author}</span>
                  <span className="mr-2"> | {comment.timestamp}</span>
                </div>
              </li>
            ))
          ) : (
            <p className="text-gray-500 text-center text-sm">עדיין אין תגובות. היה הראשון לשתף זיכרון.</p>
          )}
        </ul>
        <form onSubmit={handleAddComment} className="mt-4 flex flex-col gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="שתף זיכרון או כתוב מסר..."
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
            dir="rtl"
            rows="3"
          ></textarea>
          <button
            type="submit"
            className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition"
          >
            פרסם תגובה
          </button>
        </form>
      </div>
    </div>
  );
};

const App = () => {
  // Hardcoded initial data for Frank
  const initialMemorials = [
    {
      id: "frank-van-der-velde",
      name: 'פרנק ון דר ולדה',
      years: '1943 - 2025',
      dedication: 'פרנק היה אדם אהוב, אבא, סבא, חבר, ונשמה חמה וטובה.',
      photoUrl: 'https://placehold.co/150x150/E9D5FF/5B21B6?text=פרנק',
      candles: 0,
      comments: [],
    },
  ];

  const [memorials, setMemorials] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMemorialData, setNewMemorialData] = useState({
    name: '',
    years: '',
    dedication: '',
    photoFile: null, // Now stores the file object itself
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false); // New state for upload status
  const [userId, setUserId] = useState('');

  // Firebase initialization and authentication
  useEffect(() => {
    const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const publicCollectionPath = `artifacts/${appId}/public/data/memorials`;

    const authenticateAndFetch = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined') {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase Auth Error:", error);
      }

      onAuthStateChanged(auth, async (user) => {
        if (user) {
          setUserId(user.uid);
          const memorialsCollection = collection(db, publicCollectionPath);

          // Seed the database with initial memorials if they don't exist
          for (const memorial of initialMemorials) {
            const memorialRef = doc(db, publicCollectionPath, memorial.id);
            const docSnap = await getDoc(memorialRef);
            if (!docSnap.exists()) {
              await setDoc(memorialRef, memorial);
            }
          }

          // onSnapshot listens for real-time updates from Firestore
          const unsubscribe = onSnapshot(memorialsCollection, (snapshot) => {
            const fetchedMemorials = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setMemorials(fetchedMemorials);
            setIsLoading(false);
          }, (error) => {
            console.error("Error fetching memorials:", error);
            setIsLoading(false);
          });

          return () => unsubscribe(); // Cleanup the listener on unmount
        }
      });
    };
    
    authenticateAndFetch();
    
  }, []);

  // Handler to update the form state as the user types
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setNewMemorialData(prevData => ({
      ...prevData,
      [id]: value
    }));
  };

  // New handler for file input, stores the file object
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024 * 5) { // 5MB size limit
        alert("הקובץ גדול מדי. נא לבחור תמונה קטנה יותר (עד 5MB).");
        e.target.value = '';
        return;
      }
      setNewMemorialData(prevData => ({
        ...prevData,
        photoFile: file,
      }));
    }
  };

  // Handler to submit the new memorial form, now handles file upload
  const handleAddMemorial = async (e) => {
    e.preventDefault();
    if (!newMemorialData.name || !newMemorialData.years) {
      alert("יש למלא שם ושנות חיים.");
      return;
    }

    setIsUploading(true);

    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const db = getFirestore();
      const storage = getStorage();

      let photoUrl = `https://placehold.co/150x150/E2E8F0/1A202C?text=${newMemorialData.name.charAt(0)}`;

      // If a file was selected, upload it to Firebase Storage
      if (newMemorialData.photoFile) {
        const storageRef = ref(storage, `memorial-photos/${appId}/${Date.now()}-${newMemorialData.photoFile.name}`);
        const snapshot = await uploadBytes(storageRef, newMemorialData.photoFile);
        photoUrl = await getDownloadURL(snapshot.ref);
      }

      const newMemorial = {
        name: newMemorialData.name,
        years: newMemorialData.years,
        dedication: newMemorialData.dedication,
        candles: 0,
        comments: [],
        photoUrl: photoUrl,
      };

      const memorialsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'memorials');
      await addDoc(memorialsCollection, newMemorial);

      setNewMemorialData({ name: '', years: '', dedication: '', photoFile: null });
      setIsModalOpen(false);

    } catch (error) {
      console.error("Error adding new memorial:", error);
      alert('הייתה בעיה בשמירת הזיכרון. אנא נסה שוב.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-8 text-right font-heebo">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold text-gray-800 mb-2">
          קיר זיכרון משפחתי 🕯️
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          "האנשים שאנו אוהבים אינם עוזבים אותנו באמת. הם הולכים איתנו, בכל רגע."
        </p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-6 bg-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-600 transition"
        >
          ➕ הוסף זיכרון לקיר
        </button>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500">טוען זיכרונות...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {memorials.map(memorial => (
            <MemorialCard key={memorial.id} memorial={memorial} currentUserId={userId} />
          ))}
        </div>
      )}

      {/* The modal for adding a new memorial */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 left-4 text-gray-500 hover:text-gray-800 text-2xl font-bold"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-6 text-center">הוסף זיכרון חדש</h2>
            <form onSubmit={handleAddMemorial} className="space-y-4 text-right">
              <div>
                <label htmlFor="name" className="block text-gray-700 font-medium mb-1">שם הנפטר/ת:</label>
                <input
                  type="text"
                  id="name"
                  value={newMemorialData.name}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  dir="rtl"
                  required
                />
              </div>
              <div>
                <label htmlFor="years" className="block text-gray-700 font-medium mb-1">שנות חיים (לדוגמה: 1943 - 2025):</label>
                <input
                  type="text"
                  id="years"
                  value={newMemorialData.years}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  dir="rtl"
                  required
                />
              </div>
              <div>
                <label htmlFor="dedication" className="block text-gray-700 font-medium mb-1">הקדשה אישית (אופציונלי):</label>
                <textarea
                  id="dedication"
                  value={newMemorialData.dedication}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  dir="rtl"
                  rows="3"
                ></textarea>
              </div>
              <div>
                <label htmlFor="photoFile" className="block text-gray-700 font-medium mb-1">העלה תמונה (עד 5MB):</label>
                <input
                  type="file"
                  id="photoFile"
                  onChange={handleFileChange}
                  className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  accept="image/*"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition mt-4 disabled:bg-blue-300"
                disabled={isUploading}
              >
                {isUploading ? 'מעלה תמונה...' : 'פרסם זיכרון'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
