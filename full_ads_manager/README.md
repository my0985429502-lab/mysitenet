Full Ads Manager — Google Integration (Option 2 chosen: integrate with Google Ads; payments handled separately)

What this package does:
- Frontend: simple form to create campaigns, list campaigns
- Backend: stores campaigns in SQLite and can push campaign creation to Google Ads if you fill credentials
- google_ads_client.js: helper template that exchanges refresh token and is the integration point for Google Ads API

How to enable automatic push to Google:
1. Create a Google Cloud OAuth Client (Web application) and set redirect URI to any valid URL (used only for obtaining refresh token).
2. Obtain a refresh token for the Google account that has access to the target Google Ads account:
   - Use OAuth to request scope: https://www.googleapis.com/auth/adwords
   - You can use the OAuth playground or implement the OAuth flow to get a refresh token.
3. Request a developer token in Google Ads (you will receive a token; for full access Google may ask for business documents).
4. If you use an MCC (manager) account, set GOOGLE_LOGIN_CUSTOMER_ID to your manager account id (format 123-456-7890).
5. Optionally set GOOGLE_CUSTOMER_ID when creating campaigns for a specific customer.
6. Put these values into backend/.env (use .env.example as template) and restart the server.

How to know if you have MCC (manager) account:
- If you log into Google Ads and see a list of client accounts you manage, you have an MCC.
- MCC accounts typically have the ability to create or link client accounts.
- If unsure, leave LOGIN_CUSTOMER_ID empty; the module will attempt to act on the account associated with the refresh token.

Running:
- cd backend
- npm install
- copy .env.example to .env and fill required values
- npm start
- open frontend/index.html in browser (or serve via static server)
