// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Absolute path for SQLite DB file
const dbPath = path.join(__dirname, 'localyatri.db');

// Create/connect to SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Database connected successfully.");
  }
});

// Initialize tables if they don't exist
db.serialize(() => {
  // Users table: single user for demo
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      balance INTEGER DEFAULT 100
    )`
  );

  // Transactions table
  db.run(
    `CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      amount INTEGER,
      busId TEXT,
      timestamp TEXT
    )`
  );

  // Insert default user if not exists
  db.get("SELECT * FROM users WHERE id = 1", (err, row) => {
    if (err) {
      console.error("❌ Error checking default user:", err.message);
    } else if (!row) {
      db.run("INSERT INTO users (id, balance) VALUES (1, 100)", (err) => {
        if (err) console.error("❌ Error inserting default user:", err.message);
        else console.log("✅ Default user created with balance 100");
      });
    }
  });
});

module.exports = db;

