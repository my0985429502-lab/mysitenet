const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const fetch = require('node-fetch');
dotenv.config();

const DB_FILE = process.env.DATABASE_FILE || './database.db';
const SCHEMA_FILE = path.join(__dirname, '..', 'database', 'schema.sql');

// ensure db dir
const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir) && dbDir !== '.') fs.mkdirSync(dbDir, {recursive:true});

const db = new sqlite3.Database(DB_FILE);
function initDb(){
  const schema = fs.readFileSync(SCHEMA_FILE,'utf8');
  db.exec(schema);
  db.run(`CREATE TABLE IF NOT EXISTS balances (user_id INTEGER PRIMARY KEY, balance REAL DEFAULT 0)`);
  db.run(`CREATE TABLE IF NOT EXISTS tokens (token TEXT PRIMARY KEY, user_id INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS google_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, refresh_token TEXT, scope TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
}
initDb();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// simple auth for demo: single admin token
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-token-demo';

function requireAdmin(req,res,next){
  const t = req.headers['x-admin-token'];
  if(!t || t !== ADMIN_TOKEN) return res.status(401).json({ok:false,error:'unauthorized'});
  next();
}

// serve frontend
app.use('/static', express.static(path.join(__dirname,'..','frontend')));

// Campaign creation endpoint
app.post('/api/campaign/create', requireAdmin, async (req,res) => {
  try{
    const {siteUrl, name, budget, keywords, geo, headline, description} = req.body;
    if(!siteUrl || !name) return res.status(400).json({ok:false,error:'siteUrl and name required'});
    // save locally
    const stmt = db.prepare('INSERT INTO campaigns (client_id, name, budget, status, site_url, keywords, geo, headline, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run([1, name, budget||0, 'pending', siteUrl, keywords||'', geo||'', headline||'', description||''], function(err){
      if(err) return res.status(500).json({ok:false,error:'db error'});
      const campaignId = this.lastID;
      // if Google credentials exist, attempt to create campaign
      const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN;
      const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
      if(developerToken && refreshToken){
        const googleClient = require('./google_ads_client');
        (async ()=>{
          try{
            const customerId = process.env.GOOGLE_CUSTOMER_ID || null;
            const loginCustomerId = process.env.GOOGLE_LOGIN_CUSTOMER_ID || null;
            const result = await googleClient.createCampaignFromData({refreshToken, developerToken, loginCustomerId, customerId, campaignData:{name, budget, siteUrl, keywords, geo, headline, description}});
            // save google id
            db.run('UPDATE campaigns SET google_campaign_id = ?, status = ? WHERE id = ?', [result.googleCampaignId, 'running', campaignId]);
          }catch(e){
            console.error('Google create error',e);
            db.run('UPDATE campaigns SET status = ? WHERE id = ?', ['error_google', campaignId]);
          }
        })();
        res.json({ok:true, campaignId, message:'Created locally and started google create (async).'});
      } else {
        res.json({ok:true, campaignId, message:'Created locally. Set Google credentials in .env to enable auto-push.'});
      }
    });
  }catch(e){
    console.error(e);
    res.status(500).json({ok:false,error:'server error'});
  }
});

// list campaigns
app.get('/api/campaigns', requireAdmin, (req,res)=>{
  db.all('SELECT id, client_id, name, budget, status, google_campaign_id, site_url, created_at FROM campaigns ORDER BY created_at DESC', [], (err,rows)=>{
    if(err) return res.status(500).json({ok:false,error:'db error'});
    res.json({ok:true,campaigns:rows});
  });
});

// manual push to google for a campaign
app.post('/api/campaign/push/:id', requireAdmin, async (req,res)=>{
  const id = req.params.id;
  db.get('SELECT * FROM campaigns WHERE id = ?', [id], async (err,row)=>{
    if(err || !row) return res.status(404).json({ok:false,error:'not found'});
    const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    if(!developerToken || !refreshToken) return res.status(400).json({ok:false,error:'Google credentials missing in .env'});
    const googleClient = require('./google_ads_client');
    try{
      const result = await googleClient.createCampaignFromData({refreshToken, developerToken, loginCustomerId: process.env.GOOGLE_LOGIN_CUSTOMER_ID || null, customerId: process.env.GOOGLE_CUSTOMER_ID || null, campaignData: row});
      db.run('UPDATE campaigns SET google_campaign_id = ?, status = ? WHERE id = ?', [result.googleCampaignId, 'running', id]);
      res.json({ok:true, result});
    }catch(e){
      console.error(e);
      db.run('UPDATE campaigns SET status = ? WHERE id = ?', ['error_google', id]);
      res.status(500).json({ok:false,error:'google error', detail: String(e)});
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Server started on', PORT));
