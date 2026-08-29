# GF BF — Voice rooms for couples & friends

Live party rooms with Google / email / phone login, 8-seat Agora voice, chat, gifts, and a coin wallet. Bangla + English.

Hosted on **Render**. Data in **MongoDB**. Identity via **Firebase Admin + JWT**. Voice via **Agora**.

## Render env vars (already named — do not rename)

| Name | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string |
| `FIREBASE_PROJECT_ID` | Firebase project |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin service account |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin PEM (`\n` escaped is fine) |
| `JWT_SECRET` | Signs session JWTs |
| `SESSION_SECRET` | HMAC-signs the session cookie |
| `AGORA_APP_ID` | Agora app id (sent to the browser with tokens) |
| `AGORA_APP_CERTIFICATE` | Agora certificate (server-only token minting) |
| `ADMIN_EMAIL` | Operator login email |
| `ADMIN_PASSWORD` | Operator login password |

Google and phone OTP also need the **public Firebase web app** config (Firebase Console → Project settings → Your apps). Set these on Render if they are not already present:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN` (defaults to `<projectId>.firebaseapp.com`)
- `FIREBASE_APP_ID`

Email + password and `ADMIN_EMAIL` / `ADMIN_PASSWORD` work without the web config.

## Deploy on Render

1. New **Web Service** → this repo (or upload the ZIP)
2. Runtime: **Node**
3. Build: `npm install --include=dev && npm run build`
4. Start: `npm start`
5. Paste the env vars above
6. Add your Render URL to Firebase Auth → Authorized domains, and enable Google + Phone providers

The server listens on `0.0.0.0` and honors Render’s `PORT`.

## Local

```bash
npm install
export JWT_SECRET=dev-jwt SESSION_SECRET=dev-session
export ADMIN_EMAIL=admin@gfbf.app ADMIN_PASSWORD=admin12345
# optional: MONGO_URI, Firebase, Agora
npm run dev
```

Without `MONGO_URI` the app uses an in-memory store (data resets on restart).

## Try it

1. Open the app → **Create account** (email) or **Continue with Google**
2. Phone: enter a number → **Send OTP** → SMS code → **Verify**
3. Join **Rose Lounge** / **GF BF Party** / **Music Night**, take a seat, unmute
4. Send a rose from the gift tray (tap a seated friend first)
5. Claim the daily bonus on Wallet
