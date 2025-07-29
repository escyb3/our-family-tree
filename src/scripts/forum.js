// forum.js — צד שרת לפורום המשפחתי

const express = require("express");
const router = express.Router();
const multer = require("multer");
fetch("/api/forum", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "הכותרת שלי",
    body: "הגוף שלי",
    category: "כללי"
  })
})
.then(res => res.json())
.then(data => {
  console.log("✅ נוצר דיון:", data);
})
.catch(err => console.error("❌ שגיאה:", err));
const path = require("path");
const { v4: uuid } = require("uuid");
const { requireLogin, getUserInfo } = require("../middleware/auth");
const ai = require("../utils/ai-tools");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../public/uploads/forum");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuid() + ext);
  }
});
const upload = multer({ storage });

let threads = [];
let replies = [];

// פותח אשכול חדש
router.post("/new-thread", requireLogin, upload.single("file"), (req, res) => {
  const { title, content, category, tags } = req.body;
  const user = getUserInfo(req);
  const id = uuid();
  const thread = {
    id,
    title,
    content,
    author: user.name,
    userId: user.id,
    timestamp: Date.now(),
    category,
    tags: tags?.split(",") || [],
    file: req.file?.filename || null,
    likes: [],
    pinned: false,
    mentions: ai.extractMentions(content),
    summary: ai.summarize(content),
    points: 0,
    replies: []
  };
  threads.push(thread);
  res.json({ success: true, thread });
});

// מוסיף תגובה לדיון
router.post("/reply", requireLogin, upload.single("file"), (req, res) => {
  const { threadId, content, parentId } = req.body;
  const user = getUserInfo(req);
  const reply = {
    id: uuid(),
    threadId,
    content,
    author: user.name,
    userId: user.id,
    timestamp: Date.now(),
    parentId: parentId || null,
    file: req.file?.filename || null,
    likes: [],
    mentions: ai.extractMentions(content),
    summary: ai.summarize(content)
  };
  replies.push(reply);
  res.json({ success: true, reply });
});

// הצבעות/לייקים
router.post("/vote", requireLogin, (req, res) => {
  const { id, type, entity } = req.body; // entity = thread/reply
  const user = getUserInfo(req);
  const list = entity === "thread" ? threads : replies;
  const item = list.find(x => x.id === id);
  if (!item) return res.status(404).json({ error: "Not found" });
  if (!item.likes.includes(user.id)) item.likes.push(user.id);
  item.points = (item.points || 0) + (type === "up" ? 1 : -1);
  res.json({ success: true });
});

// חיפוש
router.get("/search", (req, res) => {
  const { q } = req.query;
  const results = threads.filter(t => t.title.includes(q) || t.content.includes(q));
  res.json(results);
});

// מיון לפי פופולריות/זמן
router.get("/threads", (req, res) => {
  const { sortBy = "new" } = req.query;
  const sorted = [...threads];
  if (sortBy === "popular") sorted.sort((a, b) => b.likes.length - a.likes.length);
  else sorted.sort((a, b) => b.timestamp - a.timestamp);
  res.json(sorted);
});

// שידור חי/התראות בלייב - בהמשך נשלב עם Socket.IO

module.exports = router;
