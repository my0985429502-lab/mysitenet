const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));

// Initialize SQLite DB (file: data.db in project root)
const DB_FILE = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    amount REAL,
    status TEXT,
    created_at TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);
});

// Helper for settings
function setSetting(key, value){
  db.run('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)', [key, String(value)]);
}
function getSettings(cb){
  db.all('SELECT key,value FROM settings', [], (err, rows) => {
    if(err) return cb({});
    const out = {};
    rows.forEach(r => out[r.key] = r.value);
    cb(out);
  });
}

// Routes
app.get('/', (req,res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/request-jackpot', (req,res) => {
  const userId = req.body.userId || ('anon-' + uuidv4());
  const amount = Number(req.body.amount) || 0;
  const created_at = new Date().toISOString();
  db.run('INSERT INTO payouts(user_id,amount,status,created_at) VALUES(?,?,?,?)', [userId, amount, 'requested', created_at], function(err){
    if(err) return res.status(500).json({ok:false, error: err.message});
    res.json({ok:true, id: this.lastID});
  });
});

app.get('/api/requests', (req,res) => {
  db.all('SELECT id,user_id AS userId,amount,status,created_at FROM payouts ORDER BY id DESC LIMIT 1000', [], (err, rows) => {
    if(err) return res.status(500).json({ok:false, error: err.message});
    res.json({ok:true, payouts: rows});
  });
});

app.post('/api/admin/settings', (req,res) => {
  const body = req.body || {};
  if(!body || typeof body !== 'object') return res.status(400).json({ok:false, error:'invalid body'});
  for(const k of Object.keys(body)){
    setSetting(k, body[k]);
  }
  res.json({ok:true});
});

app.get('/api/settings', (req,res) => {
  getSettings((s) => res.json({ok:true, settings:s}));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Server listening on', port));