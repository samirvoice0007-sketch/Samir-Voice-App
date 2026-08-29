# GF BF — Group Voice Party

Complete A–Z web app: rooms, Agora voice, chat, gifts, wallet, BN/EN.

## Features

- Auth: email register/login, guest, Google ID hook, phone OTP hook
- Live rooms: create, join, 8 seats, host kick
- Voice: Agora RTC (token API + Web SDK)
- Chat: Socket.IO realtime
- Gifts + coins + daily bonus + charm
- Profile + follow API
- Bangla / English UI

## Quick start (local)

```bash
cp .env.example .env
# set MONGO_URI, JWT_SECRET, AGORA_APP_ID, AGORA_APP_CERTIFICATE
npm install
npm start
```

Open http://localhost:3000

## Render deploy

1. Push this folder to GitHub
2. New **Web Service** → Node
3. Build: `npm install` · Start: `npm start`
4. Env vars:
   - `MONGO_URI` (required)
   - `JWT_SECRET` (required)
   - `AGORA_APP_ID` / `AGORA_APP_CERTIFICATE`
   - `ADMIN_EMAIL` (optional — that email becomes admin on register)

## API map

| Method | Path | Auth |
|--------|------|------|
| POST | /api/auth/register | no |
| POST | /api/auth/login | no |
| POST | /api/auth/guest | no |
| POST | /api/auth/google | no |
| POST | /api/auth/phone | no |
| GET | /api/auth/me | yes |
| GET/POST | /api/rooms | yes |
| POST | /api/rooms/:id/join\|leave\|seat\|mute\|kick\|gift | yes |
| GET/POST | /api/rooms/:id/messages | yes |
| GET | /api/rooms/:id/agora | yes |
| GET/PATCH | /api/user/profile | yes |
| POST | /api/user/daily | yes |
| GET | /api/user/gifts/history | yes |
| POST | /api/user/follow/:id | yes |

## Notes

- Without Agora keys the app still runs (demo/local mic animation).
- Google/Phone: client verifies then POSTs to `/api/auth/google` or `/phone`.
- Flutter Android/iOS can use the same REST + Agora tokens.
