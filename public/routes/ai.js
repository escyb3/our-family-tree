app.post("/api/ask-relation", async (req, res) => {
  const { person1, person2 } = req.body;
  // שימוש במנוע AI לזיהוי קשר
  const answer = await askRelationAI(person1, person2); // פונקציה שאתה מוסיף
  res.json({ answer });
});

app.post("/api/parse-pdf", upload.single("file"), async (req, res) => {
  const file = req.file;
  const parsedData = await extractGenealogyFromFile(file.path); // פונקציית AI
  res.json(parsedData);
});

app.post("/api/autofill", async (req, res) => {
  const incompletePerson = req.body;
  const filledPerson = await autofillMissingFields(incompletePerson); // AI מבוסס השלמה
  res.json(filledPerson);
});
