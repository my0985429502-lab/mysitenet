/*
Run once: node db_init.js
Creates SQLite database 'data.db' with tables: users, referrals, payouts, settings
*/
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    google_id TEXT,
    email TEXT,
    created_at INTEGER,
    referrer_id TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id TEXT,
    referred_id TEXT,
    created_at INTEGER
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    amount REAL,
    status TEXT,
    created_at INTEGER,
    processed_at INTEGER
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);
  // default settings
  db.run(`INSERT OR IGNORE INTO settings(key,value) VALUES('adminPct','10')`);
  db.run(`INSERT OR IGNORE INTO settings(key,value) VALUES('refPct','5')`);
  console.log('DB initialized.');
  db.close();
});
