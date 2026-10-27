Полная инструкция по настройке Google Ads:

1. Создайте Google Ads Manager (MCC) и получите Developer Token.
2. В Google Cloud Console создайте OAuth Client ID (Web).
3. Укажите redirect URI: http://localhost:3000/oauth/callback
4. Получите OAuth code → обменяйте на refresh token.
5. Заполните файл backend/.env:
GOOGLE_DEVELOPER_TOKEN=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
6. Запустите:
cd backend
npm install
npm start
7. Откройте frontend/index.html и пользуйтесь.