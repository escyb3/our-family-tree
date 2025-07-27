// src/ai.js
const fs = require("fs");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

function loadAllPersons() {
  const folder = path.join(__dirname, "data");
  let people = [];
  fs.readdirSync(folder).forEach(file => {
    if (file.endsWith(".json")) {
      const json = JSON.parse(fs.readFileSync(path.join(folder, file)));
      if (Array.isArray(json)) people.push(...json);
    }
  });
  return people;
}

async function askAI(question) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const result = await model.generateContent(question);
  return result.response.text();
}

function checkRelation(name1, name2) {
  const all = loadAllPersons();
  const person1 = all.find(p => p.name.includes(name1));
  const person2 = all.find(p => p.name.includes(name2));
  if (!person1 || !person2) return "לא נמצא קשר";
  return `ייתכן קשר משפחתי בין ${person1.name} ל-${person2.name}`;
}

async function parseAny(filePath) {
  if (filePath.endsWith(".pdf")) {
    const data = fs.readFileSync(filePath);
    const text = (await pdfParse(data)).text;
    return { text };
  }
  if (filePath.endsWith(".png") || filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
    const { data: { text } } = await Tesseract.recognize(filePath, "heb+eng");
    return { text };
  }
  return { error: "פורמט לא נתמך" };
}

function autofillPerson(partial) {
  const all = loadAllPersons();
  const match = all.find(p => p.name.includes(partial.name));
  return match || { error: "לא נמצאו פרטים תואמים" };
}

async function ocrParse(filePath) {
  const { data: { text } } = await Tesseract.recognize(filePath, "heb+eng");
  return { text };
}

function suggestRelations(name) {
  const all = loadAllPersons();
  const person = all.find(p => p.name.includes(name));
  if (!person) return { error: "לא נמצא אדם כזה" };
  const suggestions = all.filter(p => p.lastName === person.lastName && p.id !== person.id).map(p => p.name);
  return { suggestions };
}

function summarizeFamily() {
  const all = loadAllPersons();
  const count = all.length;
  const places = [...new Set(all.map(p => p.birthPlace).filter(Boolean))];
  return { summary: `המשפחה כוללת ${count} אנשים. מקומות לידה עיקריים: ${places.join(", ")}` };
}

module.exports = {
  askAI,
  checkRelation,
  parseAny,
  autofillPerson,
  ocrParse,
  suggestRelations,
  summarizeFamily
};
