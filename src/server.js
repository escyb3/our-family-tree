require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 🔑 Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 🤖 GPT-4o
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✉️ דוא"ל עלונים
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 🧠 ניתוח רגשי עם AI
app.post('/api/emotion-analysis', async (req, res) => {
  const { memory } = req.body;
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "אתה מנתח רגשות של סיפורי משפחה בעברית." },
      { role: "user", content: `הסיפור: ${memory}` }
    ]
  });
  res.json({ analysis: completion.choices[0].message.content });
});

// 🕯️ נר זיכרון
app.post('/api/candle', async (req, res) => {
  const { name, date, message, photo } = req.body;
  const { data, error } = await supabase.from("candles").insert([{ name, date, message, photo }]);
  if (error) return res.status(500).json({ error });
  res.json({ success: true });
});

// 🧬 צ'אט AI משפחתי
app.post('/api/ask-ai', async (req, res) => {
  const { prompt } = req.body;
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }]
  });
  res.json({ reply: completion.choices[0].message.content });
});

// 📥 מערכת הודעות פנימית (בטא)
app.post('/api/send-message', async (req, res) => {
  const { from, to, subject, body } = req.body;
  const { data, error } = await supabase.from("messages").insert([{ from, to, subject, body }]);
  if (error) return res.status(500).json({ error });
  res.json({ success: true });
});

// 🔍 חיפוש עץ משפחתי
app.get('/api/search', async (req, res) => {
  const { query } = req.query;
  const { data, error } = await supabase
    .from("family_tree")
    .select("*")
    .ilike("name", `%${query}%`);
  if (error) return res.status(500).json({ error });
  res.json({ results: data });
});

// 🧾 העלאת מסמכים היסטוריים
app.post('/api/documents', async (req, res) => {
  const { title, fileUrl } = req.body;
  const { data, error } = await supabase.from("documents").insert([{ title, fileUrl }]);
  if (error) return res.status(500).json({ error });
  res.json({ success: true });
});

// 📰 שליחת עלון משפחתי במייל
app.post('/api/send-newsletter', async (req, res) => {
  const { to, subject, content } = req.body;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html: content
  };
  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔐 הרשאות משתמשים
app.get('/api/user-info', async (req, res) => {
  const { token } = req.query;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error) return res.status(401).json({ error: error.message });
  res.json({
    email: user.email,
    familySide: user.user_metadata.familySide,
    role: user.user_metadata.role
  });
});

// שרת מאזין
app.listen(port, () => {
  console.log(`🌍 Server running on http://localhost:${port}`);
});
