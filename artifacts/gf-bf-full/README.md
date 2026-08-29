# GF BF — Group Voice Chat App (Hapi-style)

Full-stack voice party app for Render free tier.

## Features
- Guest / Phone OTP (demo) / Google stub login
- Room list (Mine / Popular)
- Create & join rooms
- 13-seat layout (Owner + 12)
- Realtime chat + gifts via Socket.IO
- Wallet (Coins / Diamonds)
- Invite system UI
- Agora token API (optional free tier)
- Profile / Me menu (SVIP, Gold Mine, Family, CP placeholders ready)

## Deploy on Render
1. Push this repo to GitHub
2. Create Web Service → connect repo
3. Build: `npm install`
4. Start: `npm start`
5. Add Environment Variables (from your list):
   - `MONGO_URI`
   - `JWT_SECRET`
   - `AGORA_APP_ID`
   - `AGORA_APP_CERTIFICATE`
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` (optional)

## Local
```bash
cp .env.example .env
# edit .env
npm install
npm start
```

Open http://localhost:10000

## Notes
- OTP demo code: `123456`
- Agora is optional — app works without it (UI + chat + gifts)
- Seed gifts run automatically on first boot
