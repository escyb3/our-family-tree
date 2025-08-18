// src/create-admin.js
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createAdmin() {
  const username = "admin";
  const plainPassword = "webadminyb234"; // שנה לסיסמה שאתה רוצה
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  await pool.query(`
    INSERT INTO users (username, password, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (username) DO UPDATE SET password = $2, role = $3
  `, [username, passwordHash, "admin"]);

  console.log(`✅ נוצר משתמש מנהל: ${username} / ${plainPassword}`);
  process.exit();
}

createAdmin().catch(err => {
  console.error("❌ שגיאה:", err);
  process.exit(1);
});
