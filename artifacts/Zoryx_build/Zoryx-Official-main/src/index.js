const path = require('path');
const express = require('express');
const cors = require('cors');

const connectDB = require('./db');
const bot = require('./bot/bot');
const apiRoutes = require('./routes/api');
const { startCheckinReminderScheduler } = require('./bot/jobs/checkinReminder');
const Settings = require('./models/Settings');

async function runSeedCycle() {
  try {
    const settings = await Settings.findOne();
    const now = Date.now();
    const last = settings && settings.lastSeedAt ? new Date(settings.lastSeedAt).getTime() : 0;
    const WEEK = 7 * 24 * 60 * 60 * 1000;
    if (!last || now - last >= WEEK) {
      console.log('🌱 Running seed (auto every 7 days)...');
      const { runSeed } = require('../seed/seedFakeUsers');
      await runSeed();
      console.log('✅ Seed completed');
      if (settings) {
        settings.lastSeedAt = new Date();
        await settings.save();
      } else {
        await Settings.create({ lastSeedAt: new Date() });
      }
    }
  } catch (e) {
    console.error('Seed cycle error:', e.message);
  }
}

const { PORT, WEBHOOK_DOMAIN, BOT_TOKEN } = require('./config');

async function main() {
  await connectDB();

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Telegram webhook endpoint
  const webhookPath = `/telegraf/${BOT_TOKEN}`;
  app.use(bot.webhookCallback(webhookPath));

  // Mini App API
  app.use('/api', apiRoutes);

  // Serve the Mini App static frontend
  app.use(express.static(path.join(__dirname, '..', 'webapp')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'webapp', 'index.html'));
  });

  app.listen(PORT, async () => {
    console.log(`✅ ZORY X BOT server running on port ${PORT}`);

    if (WEBHOOK_DOMAIN) {
      const webhookUrl = `${WEBHOOK_DOMAIN}${webhookPath}`;
      try {
        await bot.telegram.setWebhook(webhookUrl);
        console.log(`✅ Telegram webhook set: ${webhookUrl}`);
      } catch (err) {
        console.error('❌ Failed to set webhook:', err.message);
      }
    } else {
      // local development fallback: long polling
      console.log('ℹ️ WEBHOOK_DOMAIN not set, starting long polling (dev mode)...');
      bot.launch();
    }

    // daily check-in reminder scheduler
    startCheckinReminderScheduler(bot);
    // Auto seed on live + re-run every 7 days
    await runSeedCycle();
    setInterval(runSeedCycle, 24 * 60 * 60 * 1000); // check daily
  });
}

main().catch((err) => {
  console.error('Fatal error starting ZORY X BOT:', err);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
