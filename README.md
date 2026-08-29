# GF BF — Voice rooms for couples & friends

Live party rooms with Google / X / email / phone login, 8-seat voice, chat, gifts, and a coin wallet. Bangla + English.

## What works (no extra keys)

| Feature | How |
|---|---|
| Google & X login | Built-in (works in preview and when published) |
| Email + password | Create account / sign in |
| Phone OTP | In-app verification code (no Firebase / SMS gateway required) |
| Voice | Browser WebRTC between people in the same room |
| Chat, seats, kick, gifts | Realtime + saved |
| Wallet | Coins, charm, daily +50 bonus |
| Language | বাং / EN toggle |

You do **not** need MongoDB Atlas, Agora, Firebase, or Render env vars for this build. Those were why the old app showed “Google login is not configured yet” and “Phone login is not configured yet”.

## Try it

1. Open the app → **Create account** (email) or **Continue with Google**
2. Phone: enter a number → **Send OTP** → the code appears on screen → **Verify**
3. Join **Rose Lounge** / **GF BF Party** / **Music Night**, take a seat, unmute
4. Send a rose from the gift tray (tap a seated friend first)
5. Claim the daily bonus on Wallet

## Notes

- First email password must be **8+ characters**
- Mic permission is requested when you enter a room; tap the mic button to go live
- Two people must be in the same room (two browsers / phones) to hear each other
