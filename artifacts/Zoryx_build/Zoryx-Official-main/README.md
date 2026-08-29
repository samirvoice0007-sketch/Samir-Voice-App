# ⚡ ZORY X BOT

Telegram Earning Bot + Mini App — Tasks, Referrals, Leaderboard, Multi-language, Ads.
Stack: **Node.js (Telegraf + Express) + MongoDB + GitHub + Render**.

---

## ✨ Features

- **/start** — welcome message + language picker (Bangla / English / Hindi / Arabic) + "Open App" button. This is the ONLY command regular users ever get a reply from.
- **/help** — shows the full admin command list. Silently ignored for normal users (no reply at all), and any other unknown command/text from a normal user is also silently ignored, exactly as requested.
- **/announcement** — admin sends a message, bot forwards it to every user who has ever started the bot.
- **/addadmin `<telegram_id>`** / **/removeadmin `<telegram_id>`** — owner-only, grants a user permission to add tasks & send announcements from the Mini App / bot.
- **/stats** — owner-only quick stats (users / admins / tasks).
- **Mini App** with 4 bottom tabs:
  - **Home** — Telegram name + profile photo, coin/energy/invite stats, quick actions.
  - **Earn** — task list (Go → Check flow), "Watch Ad" banner, and an **Add Task** button that is visible **only to admins**. Adding a task opens a bottom-sheet with a platform switcher (Telegram / Bot / Discord / YouTube / TikTok / Facebook / Twitter / Instagram / Website — icon changes per platform), Title, URL and Submit.
  - **Friends** — referral link with Copy + Share buttons. Sharing via Telegram's native share sheet automatically shows your bot's profile photo + bio as a rich preview, so no extra image handling is needed.
  - **Leaderboard** — top users by coins. Comes pre-seeded with realistic "fake" users (see below) so the board never looks empty.
- **Anti-cheat**: Telegram channel-join tasks are verified for real via `getChatMember` (bot must be added as admin of that channel). Tasks that point to platforms Telegram has no public verification API for (other bots, Discord, YouTube, TikTok, etc.) require the user to tap **Go** first and enforce a short minimum wait before **Check** succeeds — this isn't perfect (no method is, for third-party platforms) but it stops one-tap cheating.
- **Ad system**: "Watch Ad" button rewards coins + energy. Hook in your Monetag (or any) rewarded-ad script — see `MONETAG_ZONE_ID` below.
- **Multi-language**: bot messages AND the Mini App UI both support Bangla, English, Hindi, Arabic. Users can switch anytime from the 🌐 button top-right of the Mini App.

---

## 📁 Project Structure

```
zory-x-bot/
├── src/
│   ├── index.js              # Express server + Telegram webhook + static hosting
│   ├── config.js             # env config
│   ├── db.js                 # MongoDB connection
│   ├── bot/
│   │   ├── bot.js            # Telegraf bot setup
│   │   ├── keyboards.js      # inline keyboards
│   │   ├── commands/         # /start /help /announcement /addadmin ...
│   │   └── middlewares/      # admin permission checks
│   ├── models/                # User, Admin, Task, TaskCompletion (Mongoose)
│   ├── controllers/           # user & task API logic
│   ├── routes/api.js          # Mini App REST API
│   ├── locales/                # bot chat messages (bn/en/hi/ar)
│   └── utils/                 # Telegram initData validation, channel URL parsing
├── webapp/                    # Mini App frontend (vanilla HTML/CSS/JS)
│   ├── index.html
│   ├── css/style.css          # premium dark-gradient UI
│   ├── js/app.js
│   ├── js/i18n.js
│   └── locales/                # UI strings (bn/en/hi/ar)
├── seed/seedFakeUsers.js      # seeds the leaderboard with fake users
├── render.yaml
├── package.json
└── .env.example
```

---

## 🚀 Setup

### 1. Create the bot
Talk to [@BotFather](https://t.me/BotFather):
- `/newbot` → name it **ZORY X BOT**, choose a username (e.g. `ZoryXBot`).
- `/setmenubutton` or just rely on the inline "Open App" button already built into `/start`.
- To actually get a Mini App button in the chat's attachment menu too, use `/newapp` and point it at your Render URL once deployed (optional — the inline button already works without this).

### 2. MongoDB
Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas), whitelist `0.0.0.0/0` (or Render's IPs), grab the connection string.

### 3. Environment variables
Copy `.env.example` → `.env` and fill in:

```
BOT_TOKEN=...              # from BotFather
BOT_USERNAME=ZoryXBot
MONGODB_URI=...
ADMIN_IDS=your_telegram_numeric_id
WEBAPP_URL=https://your-app.onrender.com
WEBHOOK_DOMAIN=https://your-app.onrender.com
MONETAG_ZONE_ID=your_zone_id
```

> Get your numeric Telegram ID from [@userinfobot](https://t.me/userinfobot).

### 4. Run locally (optional)
```bash
npm install
npm start
```
Without `WEBHOOK_DOMAIN` set, the bot falls back to long-polling for local testing.

### 5. Deploy to Render
1. Push this project to a GitHub repo.
2. On [Render](https://render.com) → New → Blueprint → connect the repo (it will read `render.yaml` automatically), or create a Web Service manually with:
   - Build command: `npm install`
   - Start command: `npm start`
3. Add the environment variables from `.env.example` in Render's dashboard.
4. Once deployed, set `WEBAPP_URL` and `WEBHOOK_DOMAIN` to your actual Render URL and redeploy — the app registers the Telegram webhook automatically on boot.

### 6. Seed the leaderboard with fake users
```bash
npm run seed:fake
```
Run this once after your first deploy (or locally pointing at the same `MONGODB_URI`). Re-run any time to refresh the fake numbers.

### 7. Make yourself an admin & add tasks
Your `ADMIN_IDS` in `.env` are the **owner(s)** — full control automatically. Open the Mini App → **Earn** tab → you'll see a floating **+ Add Task** button that regular users never see. Use `/addadmin <telegram_id>` to promote helpers (they'll be able to add tasks + send announcements, but not add other admins).

### 8. Hook up real ads (Monetag)
In `webapp/index.html`, add your Monetag zone script tag (they'll give you an exact `<script>` snippet after you register your Mini App with them), and expose a `window.showMonetagRewardedAd()` function that resolves once the ad finishes — `app.js` already calls it automatically when present, and falls back to a short delay if it isn't.

---

## 🌐 Language system
- First `/start` → user is asked to pick a language; it's stored per-user in MongoDB and reused everywhere (bot replies + Mini App).
- Users can change it anytime: in the bot via the "🌐 Change Language" button under `/start`, or in the Mini App via the 🌐 pill top-right.

## ⚠️ Honest limitations (please read)
- **Telegram channel-join tasks** are verified for real — but only works for **public** channels where **ZORY X BOT is an admin**. Private invite links (`t.me/+xxxx`) can't be checked this way.
- **"Start another bot" / YouTube / Discord / TikTok / Facebook / Twitter / Instagram tasks** cannot be cryptographically verified — Telegram (or those platforms) don't expose an API for a third-party bot to confirm "this user really did X" on their own. The Go→wait→Check flow reduces casual cheating but is not bulletproof. If you need airtight verification for a specific platform, it usually requires that platform's own OAuth login, which is a bigger integration.
- The **leaderboard's fake users** are just for visual presentation (`isFake: true`) — they never receive coins for real and don't affect real payouts.

---

Made for **ZORY X BOT** 🚀

---

## 🆕 v2 — FoxiGrow-style economy update

- **5 bottom tabs**: Home, Tasks, Rank, Activity, Profile (referral card now lives inside **Rank**).
- **ZX Coin economy**: 10 ZX Coin = 1 USDT (`COIN_TO_USDT_RATE` in `.env`). Reward amounts for any task (admin-added or user-submitted) must be between **0.2 and 100 ZX Coin**.
- **Daily Check-in** with streak tracking (Home + Activity → Daily tab).
- **Live-looking stats** on the Rank page (Total Tasks / Total Rewards / Users / Running Time) — combine real DB counts with `BASE_FAKE_*` numbers from `.env` so the numbers look established from day one. A rotating "X*** just withdrew Y USDT" ticker appears under the header everywhere.
- **Leaderboard tabs**: Tasks (by total ZX→USDT earned), Invites (by referral count), Weekly (resets every Monday 00:00 UTC, live countdown shown).
- **Activity Center**: Achieve tab (Invite / Earning achievements with progress bars + claim button), Daily tab (check-in), Events tab (placeholder).
- **Withdraw system**: Profile → Wallet → Withdraw opens a FoxiGrow-style form (Withdrawable Balance, Amount + MAX, BEP20 recipient address, min `WITHDRAW_MIN_USDT`, fee-free, 24h processing note). This **does not send crypto automatically** — it creates a request, notifies the owner(s) in Telegram, and deducts the balance immediately (escrow). Owners review with `/withdrawals` and settle manually, then run `/approvewithdraw <id>` (or `/rejectwithdraw <id>` to refund).
- **User-submitted paid tasks**: in the Tasks tab, the **"💰 Post a Task"** button lets any user create a task by sending USDT to `TASK_PAYMENT_ADDRESS` (shown with a copy button, network label from `TASK_PAYMENT_NETWORK`) and filling in title/URL/platform/reward-per-user/slots. It stays inactive (`pending`) until an admin approves it from the **Pending** button in the Tasks tab (admins only) — which also DMs the owner(s) when a new one comes in.
- **Removed**: Google account linking, Skills Verification, Account Management, and the "Link X Account" task type — none of these exist anymore, as requested.
- **Official channel**: `https://t.me/zoryxofficial` is wired into the Profile → Messages & Community links (`OFFICIAL_CHANNEL` / `COMMUNITY_CHANNEL` in `.env`).

### New/updated env vars — see `.env.example`
`COIN_TO_USDT_RATE`, `REFERRAL_REWARD`, `AD_REWARD`, `DAILY_CHECKIN_REWARD`, `WITHDRAW_MIN_USDT`, `TASK_PAYMENT_ADDRESS`, `TASK_PAYMENT_NETWORK`, `OFFICIAL_CHANNEL`, `COMMUNITY_CHANNEL`, `BASE_FAKE_USERS`, `BASE_FAKE_TASKS`, `BASE_FAKE_REWARDS_USD`, `LAUNCH_DATE`.

### New admin bot commands
- `/withdrawals` — list pending withdrawal requests
- `/approvewithdraw <id>` — mark a withdrawal as sent (after you pay manually)
- `/rejectwithdraw <id>` — reject and refund the user's balance

### Honest note on withdraw & task payments
There is no blockchain/payment-gateway integration here — Render can't safely hold private keys for you, and TON/BEP20 payments need a wallet-side integration you control. Both flows (user withdraw, user task payment) are **request + manual admin confirmation** systems, which is how most Telegram earning bots like this actually operate. If you later want automatic on-chain verification, that's a separate integration (e.g. TON API / BscScan API polling) on top of this foundation.

---

## 🆕 v3 — USDT-only economy + manual verification

- **No coin system anymore.** Every balance, reward, and task payout is stored and shown directly in **USDT** (💵 emoji everywhere, no "ZX Coin").
- **Task rewards**: any amount from **0.001 to 100 USDT** per task (admin free-add or user-requested).
- **Action types per platform** — the Add Task form now shows a platform-appropriate action selector:
  - Telegram Channel → Join (auto-verified via Bot API)
  - Telegram Bot → Start (wait-timer verified)
  - Website → Visit (wait-timer verified)
  - Discord → Join (manual review)
  - TikTok → Follow / Like / Comment / Share (manual review)
  - YouTube → Subscribe / Like / Comment (manual review)
  - Instagram → Follow / Like / Comment / Share (manual review)
  - Facebook → Follow / Like / Comment / Share (manual review)
  - X (Twitter) → Follow / Like / Comment / Repost (manual review)
- **"Verify Now" flow**: for platforms with no public verification API, after tapping Go the user taps **Verify Now**, submits their username on that platform, and it lands in an admin-only **Verifications** queue (Tasks tab) with Approve/Reject buttons. Approve credits the USDT reward automatically.
- **Watch Ad**: default reward is 0.5 USDT, editable anytime by an admin via the ✏️ icon next to the ad banner (no redeploy needed — stored in a `Settings` document). A scrollable **Ad History** box under the button shows the user's past ad-watch rewards.
- **Activity → Achieve** milestones (USDT, matches the requested table):
  - 3 invites → 1.5 USDT · 50 invites → 25 USDT · 200 invites → 100 USDT
  - 1000 invites → 500 USDT · 5000 invites → 2500 USDT · 20000 invites → 10000 USDT
  - Daily check-in → 0.5 USDT/day
- **Activity → Events**: admins can create simple announcement-style events (title, description, optional link) from a "+ Create Event" button; all users see them in the Events tab.
- **Rank/Leaderboard limit raised to 100** (was 50) on all three tabs (Tasks/Invites/Weekly).
- **Post a Task (regular users)**: simplified to a fixed payment amount (`TASK_POST_PAYMENT_USDT`, default 10 USDT). The user sends that amount to your wallet address (shown with a copy button), picks a platform, and submits a title+link. It becomes a `TaskRequest` an admin reviews — once payment is confirmed manually, the admin adds the real task themselves from the normal "+ Add Task" form.
- **Anti-spam**: the same link (normalized) can't be submitted twice — either as an active task or as a pending task request — until the existing one is resolved.

### New/renamed env vars — see `.env.example`
`REFERRAL_REWARD_USDT`, `AD_REWARD_USDT_DEFAULT` (initial value only — admin can change it live), `DAILY_CHECKIN_REWARD_USDT`, `TASK_POST_PAYMENT_USDT`. Removed: `COIN_TO_USDT_RATE`, `REFERRAL_REWARD`, `AD_REWARD`, `DAILY_CHECKIN_REWARD`.

### New admin capabilities in the Mini App
- Tasks tab → **Requests** button: review/approve/reject paid task requests (payment verification).
- Tasks tab → **Verify** button: review/approve/reject task-completion verifications (username submissions).
- Tasks tab → ✏️ icon on the ad banner: change the per-ad USDT reward live.
- Activity → Events tab → **+ Create Event**: post an event/announcement card.

---

## 🆕 v4 — 9 languages, Owner vs Admin help, total-users command

- **9 languages** end-to-end (bot chat + Mini App): English, 中文, Русский, العربية, Français, Português, Español, Tiếng Việt, বাংলা. Hindi was removed to match this exact set — the app safely falls back to English for anyone with a legacy `hi` setting.
- **New `/start` flow**: first-time users see a marketing intro ("Task volume and earnings are skyrocketing... $100–$3000/month") + a 9-language picker. Returning users see a detailed welcome (task/check-in/invite bullets, $100–$3000 invite line, Notifications/Announcements/Community links) with the language buttons shown again underneath so they can switch anytime.
- **`/help` now differs by role**:
  - **Owner** sees the full command list (`/start`, `/help`, `/announcement`, `/addadmin`, `/removeadmin`, `/stats`, `/totalusers`, `/withdrawals`, `/approvewithdraw`, `/rejectwithdraw`).
  - **Admin** sees a shorter list: `/announcement`, `/totalusers`, `/withdrawals`, `/approvewithdraw`, `/rejectwithdraw`.
  - Regular users still get no reply at all to `/help`.
- **`/withdrawals`, `/approvewithdraw`, `/rejectwithdraw`** are now usable by **both Owner and Admin** (previously Owner-only).
- **New `/totalusers` command** (Owner + Admin): shows how many real users have ever `/start`'d the bot.

### Files changed/added in this update
- `src/config.js` — 9-language `SUPPORTED_LANGS`
- `src/locales/index.js` — loads all 9 locale files
- `src/locales/en.js`, `zh.js`, `ru.js`, `ar.js`, `fr.js`, `pt.js`, `es.js`, `vi.js`, `bn.js` — full bot message translations (`hi.js` is no longer referenced; safe to delete)
- `src/bot/keyboards.js` — 9-language flag buttons
- `src/bot/commands/start.js` — new marketing + detailed welcome flow
- `src/bot/commands/language.js` — updated to match the new flow
- `src/bot/commands/help.js` — Owner vs Admin split
- `src/bot/commands/admin.js` — withdrawal commands now Admin+Owner, new `/totalusers`
- `src/bot/bot.js` — registers `/totalusers`, updated language regex
- `webapp/index.html` — 9-language buttons in the language modal
- `webapp/css/style.css` — last odd language button spans full width (matches the reference screenshot)
- `webapp/locales/en.json`, `zh.json`, `ru.json`, `ar.json`, `fr.json`, `pt.json`, `es.json`, `vi.json`, `bn.json` — full Mini App UI translations (`hi.json` is no longer referenced; safe to delete)
