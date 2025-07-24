// convert-gedcom.js
const fs = require("fs");
const path = require("path");
const parseGedcom = require("@wmfs/gedcom-parser");

const INPUT_DIR = path.join(__dirname, "gedcom");
const OUTPUT_DIR = INPUT_DIR; // נשמור באותה תיקייה

const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith(".ged"));

files.forEach(filename => {
  const raw = fs.readFileSync(path.join(INPUT_DIR, filename), "utf-8");
  const gedcom = parseGedcom(raw);
  const people = {};
  const families = {};

  gedcom.forEach(entry => {
    if (entry.tag === "INDI") {
      const id = entry.pointer.replace(/@/g, "");
      const nameRec = entry.tree.find(t => t.tag === "NAME");
      const name = nameRec ? nameRec.data.replace(/\//g, "").trim() : id;
      const photoRec = entry.tree.find(t => t.tag === "OBJE");
      const photo = photoRec?.tree?.[0]?.data || "";
      people[id] = { id, name, photo };
    }
    if (entry.tag === "FAM") {
      const famId = entry.pointer.replace(/@/g, "");
      const husb = entry.tree.find(t => t.tag === "HUSB")?.data?.replace(/@/g, "");
      const wife = entry.tree.find(t => t.tag === "WIFE")?.data?.replace(/@/g, "");
      const children = entry.tree.filter(t => t.tag === "CHIL").map(c => c.data.replace(/@/g, ""));
      children.forEach(cid => {
        if (people[cid]) {
          people[cid].pid = husb;
          people[cid].mid = wife;
        }
      });
    }
  });

  const output = Object.values(people);
  const outName = filename.replace(/\.ged$/i, ".json");
  fs.writeFileSync(path.join(OUTPUT_DIR, outName), JSON.stringify(output, null, 2));

  console.log(`✔️ נוצר: ${outName}`);
});
