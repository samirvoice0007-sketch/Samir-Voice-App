const path = require('path');
const express = require('express');
const cors = require('cors');

const connectDB = require('./db');
const bot = require('./bot/bot');
const apiRoutes = require('./routes/api');
const { startCheckinReminderScheduler } = require('./bot/jobs/checkinReminder');
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
  });
}

main().catch((err) => {
  console.error('Fatal error starting ZORY X BOT:', err);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
