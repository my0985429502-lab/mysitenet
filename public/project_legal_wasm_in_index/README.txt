Web Casino + WASM Miner — Real Integration Scaffold (README.txt)

This project is a scaffold that upgrades the demo into a structure ready for:
1) Real WASM miner integration
2) Payouts ledger and processing (simulated by default)
3) Google OAuth (Passport) for user login
4) Persistent referral system using SQLite

IMPORTANT: This scaffold does NOT automatically perform real mining or send real funds.
You must supply:
- A real WASM miner binary (place in public/miner.wasm) OR integrate your pool client code.
- A payment backend / wallet integration for real payouts (see 'Payouts' below).
- Google OAuth CLIENT_ID and CLIENT_SECRET.

Files added/updated:
- server.js        : Express server with SQLite DB, Passport Google OAuth placeholders, referral and payout endpoints.
- db_init.js       : Script that initializes SQLite DB schema.
- public/miner-loader.js : Client-side loader that attempts to load public/miner.wasm and run it inside a Worker.
- public/worker.js : Updated worker that can load a WASM module if available, otherwise uses JS simulation.
- index.html       : Updated to use miner-loader and show referral/ui improvements.
- admin.html       : Admin panel with payouts log and settings UI.
- README.txt       : This file (plain text instructions).

Quick setup (local testing):
1. Put your wasm miner binary at public/miner.wasm (optional - scaffold can run simulation if absent).
2. Install dependencies: `npm install` (this will download passport, sqlite3, etc.).
3. Initialize DB once: `node db_init.js`
4. Start server: `node server.js`
5. Open http://localhost:3000  and http://localhost:3000/admin

Google OAuth (fill in env variables):
- Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `SESSION_SECRET` in your environment.
- Configure OAuth redirect URI in Google Cloud Console to `http://localhost:3000/auth/google/callback` (change host/port for production).

Payouts & Wallets:
- This scaffold stores payout requests and processes them into a ledger table.
- The `POST /api/admin/process-payouts` endpoint marks payouts as processed (mock).
- Replace the "processPayouts" function in server.js with real wallet/tx broadcasting code to send funds.

Referral logic:
- When a user visits with `?ref=REFCODE`, the server stores the referrer for that session (cookie) and credits future registrations.
- Users are created on Google OAuth first login (or via demo anonymous creation) and linked to referrers.

Security & Compliance:
- Require explicit user consent before mining in production.
- Respect terms of service of browsers and platforms (some forbid background mining).
- For real payouts, implement KYC/AML and anti-fraud measures where necessary.

If you'd like, I can now:
A) Try to load a simple placeholder WASM (minimal) into the project and wire the client to it.
B) Keep the worker simulation but leave hooks for your actual wasm binary (default).
C) Add example code for integrating with an XMR-like pool (note: I'll need to browse for latest repo references).

Choose what to do next (A / B / C) or tell me to package this scaffold into ZIP now.
