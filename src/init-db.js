// init-db.js – יוצר את הטבלאות בבסיס הנתונים לפי schema.sql
const fs = require("fs");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost/family_mail",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function initDatabase() {
  const schema = fs.readFileSync("schema.sql", "utf8");
  try {
    await pool.query(schema);
    console.log("✅ Database initialized successfully!");
  } catch (err) {
    console.error("❌ Error initializing database:", err);
  } finally {
    pool.end();
  }
}

initDatabase();
