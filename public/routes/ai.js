const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const pdfParse = require("pdf-parse");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

router.post("/api/ask", async (req, res) => {
  try {
    const result = await model.generateContent(req.body.question);
    const text = result.response.text();
    res.json({ answer: text });
  } catch (err) {
    res.status(500).json({ error: "שגיאה בעיבוד הבקשה" });
  }
});

router.post("/api/ask-relation", async (req, res) => {
  const { name1, name2 } = req.body;
  const prompt = `מה הקשר המשפחתי בין ${name1} ל-${name2}?`;
  try {
    const result = await model.generateContent(prompt);
    res.json({ relation: result.response.text() });
  } catch (err) {
    res.status(500).json({ relation: "שגיאה" });
  }
});

router.post("/api/parse-pdf", upload.single("file"), async (req, res) => {
  try {
    const data = await pdfParse(req.file.buffer);
    const result = await model.generateContent("פענח את עץ המשפחה הבא:\n" + data.text);
    res.json({ text: result.response.text() });
  } catch (err) {
    res.json({ error: "לא ניתן לעבד את הקובץ" });
  }
});

router.post("/api/autofill", async (req, res) => {
  const { partial } = req.body;
  const prompt = `השלם את פרטי האדם: ${JSON.stringify(partial)}`;
  try {
    const result = await model.generateContent(prompt);
    res.json({ data: result.response.text() });
  } catch (err) {
    res.status(500).json({ error: "שגיאה בהשלמה" });
  }
});

module.exports = router;
