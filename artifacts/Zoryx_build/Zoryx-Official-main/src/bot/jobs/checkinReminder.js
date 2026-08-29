const { Markup } = require('telegraf');
const User = require('../../models/User');
const { t } = require('../../locales');
const { isSameUTCDate } = require('../../utils/economy');
const { WEBAPP_URL, DEFAULT_LANG, DAILY_CHECKIN_REWARD_USDT } = require('../../config');

// Sends the daily check-in reminder once per day, at a fixed UTC hour, to
// every real user who hasn't checked in yet today.
const REMINDER_HOUR_UTC = Number(process.env.CHECKIN_REMINDER_HOUR_UTC || 12); // default: 12:00 UTC
const POLL_INTERVAL_MS = 15 * 60 * 1000; // check every 15 minutes whether it's time to fire

let lastRunDateKey = null;

function todayKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
}

async function sendReminders(bot) {
  const users = await User.find({ isFake: false }).lean();
  const now = new Date();

  let sent = 0;
  for (const user of users) {
    const alreadyCheckedIn = isSameUTCDate(user.lastCheckInAt, now);
    if (alreadyCheckedIn) continue;

    const locale = t(user.language || DEFAULT_LANG);
    const streak = user.checkInStreak || 0;

    try {
      await bot.telegram.sendMessage(
        user.telegramId,
        locale.checkinReminder(streak, DAILY_CHECKIN_REWARD_USDT),
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([[Markup.button.webApp(locale.checkInNowBtn, WEBAPP_URL)]]),
        }
      );
      sent++;
    } catch (e) {
      /* user blocked the bot or chat not found, ignore */
    }

    // gentle throttle to stay well under Telegram's rate limits
    await new Promise((r) => setTimeout(r, 40));
  }

  console.log(`⏰ Check-in reminder sent to ${sent} user(s).`);
}

function startCheckinReminderScheduler(bot) {
  setInterval(async () => {
    const now = new Date();
    if (now.getUTCHours() !== REMINDER_HOUR_UTC) return;

    const key = todayKey(now);
    if (lastRunDateKey === key) return; // already sent today
    lastRunDateKey = key;

    console.log('⏰ Running daily check-in reminder job...');
    try {
      await sendReminders(bot);
    } catch (e) {
      console.error('❌ Check-in reminder job failed:', e);
    }
  }, POLL_INTERVAL_MS);

  console.log(`✅ Check-in reminder scheduler started (fires daily at ${REMINDER_HOUR_UTC}:00 UTC).`);
}

module.exports = { startCheckinReminderScheduler };
