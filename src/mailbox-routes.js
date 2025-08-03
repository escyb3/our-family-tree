const db = require("./db");

// 📨 שליחת הודעה
router.post("/api/messages", (req, res) => {
  const msg = req.body;
  const id = Date.now().toString();
  db.prepare(`
    INSERT INTO messages (id, fromUser, toUser, subject, body, type, timestamp, threadId, attachment, sendAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, msg.from, msg.to, msg.subject, msg.body, msg.type, new Date().toISOString(), msg.threadId || "", msg.attachment || null, msg.sendAt || null);
  res.json({ success: true });
});

// 📬 שליפת הודעות
router.get("/api/messages", (req, res) => {
  const rows = db.prepare(`SELECT * FROM messages ORDER BY timestamp DESC`).all();
  res.json(rows);
});
// שמירת טיוטה
router.post("/api/save-draft", (req, res) => {
  const d = req.body;
  const id = Date.now().toString();
  db.prepare(`
    INSERT INTO drafts (id, fromUser, toUser, subject, body, type, timestamp, attachment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, d.from, d.to, d.subject, d.body, d.type, new Date().toISOString(), d.attachment || null);
  res.json({ success: true });
});

// שליפת טיוטות
router.get("/api/drafts", (req, res) => {
  const drafts = db.prepare(`SELECT * FROM drafts ORDER BY timestamp DESC`).all();
  res.json(drafts);
});
