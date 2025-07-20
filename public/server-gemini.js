const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/ask-ai', async (req, res) => {
  try {
    const { message } = req.body;

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const result = await model.generateContent(message);
    const response = result.response.text();

    res.json({ reply: response });
  } catch (error) {
    console.error('Gemini Error:', error);
    res.status(500).json({ error: 'שגיאה בעיבוד הבקשה עם Gemini AI' });
  }
});

app.get('/gedcom', (req, res) => {
  fs.readFile('./data/family.ged', 'utf8', (err, data) => {
    if (err) return res.status(500).send('לא ניתן לקרוא קובץ GEDCOM');
    res.send(data);
  });
});

app.listen(PORT, () => {
  console.log(`שרת פעיל בכתובת http://localhost:${PORT}`);
});
