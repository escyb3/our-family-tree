require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai"); // Google AI

const app = express();
const PORT = process.env.PORT || 3000;

// Static files
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// הגדרת Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// ⬅️ API לצ'אט AI
app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;
    const result = await model.generateContent(userMessage);
    const response = await result.response;
    const text = response.text();
    res.json({ reply: text });
  } catch (err) {
    console.error("שגיאה בצ'אט AI:", err);
    res.status(500).json({ reply: "שגיאה מול Google AI" });
  }
});

// 📝 שליחת טופס (כגון צור קשר / בקשות משפחתיות)
app.post("/submit-form", (req, res) => {
  const formData = req.body;
  const entry = `${new Date().toISOString()} | ${JSON.stringify(formData)}\n`;

  fs.appendFile("data/forms.txt", entry, (err) => {
    if (err) {
      console.error("שגיאה בכתיבה לקובץ:", err);
      return res.status(500).send("שגיאה בשמירה");
    }
    res.send("נשמר בהצלחה!");
  });
});

// הצגת היסטוריית הודעות אם יש צורך
app.get("/messages", (req, res) => {
  const filePath = path.join(__dirname, "data/forms.txt");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("אין הודעות.");
  }
});

// דף בית
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// התחלת השרת
app.listen(PORT, () => {
  console.log(`✅ השרת פעיל על http://localhost:${PORT}`);
});
