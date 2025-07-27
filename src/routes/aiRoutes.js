const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const upload = multer({ dest: "uploads/" });

// פייק לוגיקה - להחליף באינטגרציה עם Google AI Studio בעתיד
router.post("/ask", (req, res) => {
  const { prompt } = req.body;
  res.json({ reply: `🔍 תשובה גנאולוגית לשאלה: "${prompt}"` });
});

router.post("/relation", (req, res) => {
  const { name1, name2 } = req.body;
  res.json({ relation: `${name1} הוא אולי דוד מדרגה שנייה של ${name2} 🤔` });
});

router.post("/analyze-file", upload.single("file"), (req, res) => {
  const { originalname, path: filePath } = req.file;
  const ext = path.extname(originalname).toLowerCase();
  const fakeExtract = `🔍 ניתחנו את הקובץ ${originalname} ומצאנו קשרים אפשריים.`

  fs.unlinkSync(filePath);
  res.json({ content: fakeExtract });
});

router.post("/autofill", (req, res) => {
  const { name, birthDate } = req.body;
  res.json({
    result: {
      name: name || "לא ידוע",
      birthDate: birthDate || "1890",
      birthPlace: "פולין",
      parents: ["יצחק", "רבקה"],
    },
  });
});

router.post("/ocr", upload.single("file"), (req, res) => {
  const { originalname } = req.file;
  fs.unlinkSync(req.file.path);
  res.json({ result: `🧾 טקסט זוהה מהקובץ ${originalname} ומכיל שמות ופרטים.` });
});

router.post("/suggest-links", (req, res) => {
  const { name } = req.body;
  res.json({
    suggestions: [`${name} עשוי להיות קרוב משפחה של משה כהן`, `${name} מופיע גם בקובץ ויינברגר`],
  });
});

router.post("/summary", (req, res) => {
  res.json({ summary: "📊 סך הכול 264 אנשים, 93 משפחות, 12 ענפים. משפחות מובילות: בן אבו, ויינברגר, אלחרר..." });
});

router.post("/migration", (req, res) => {
  const { name } = req.body;
  res.json({ mapEmbed: `<iframe src="https://maps.google.com/maps?q=${encodeURIComponent(name)}&output=embed" width="100%" height="300"></iframe>` });
});

module.exports = router;
