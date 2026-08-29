const { Telegraf } = require('telegraf');
const { BOT_TOKEN } = require('../config');
const User = require('../models/User');

const startCommand = require('./commands/start');
const helpCommand = require('./commands/help');
const { setLanguageAction, changeLanguageAction } = require('./commands/language');
const {
  announcementCommand,
  announcementImageCommand,
  handleBroadcastPhoto,
  handleBroadcastText,
  nobuttonCommand,
} = require('./commands/announcement');
const {
  addAdminCommand,
  removeAdminCommand,
  statsCommand,
  totalUsersCommand,
  withdrawalsCommand,
  approveWithdrawCommand,
  rejectWithdrawCommand,
} = require('./commands/admin');

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is missing in .env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.start(startCommand);
bot.command('help', helpCommand);
bot.command('announcement', announcementCommand);
bot.command('announcementimage', announcementImageCommand);
bot.command('nobutton', nobuttonCommand);
bot.command('addadmin', addAdminCommand);
bot.command('removeadmin', removeAdminCommand);
bot.command('stats', statsCommand);
bot.command('totalusers', totalUsersCommand);
bot.command('withdrawals', withdrawalsCommand);
bot.command('approvewithdraw', approveWithdrawCommand);
bot.command('rejectwithdraw', rejectWithdrawCommand);

bot.action(/setlang_(en|zh|ru|ar|fr|pt|es|vi|bn)/, setLanguageAction);
bot.action('change_lang', changeLanguageAction);

// photo messages -> only meaningful while composing an /announcementimage broadcast
bot.on('photo', async (ctx) => {
  const telegramId = String(ctx.from.id);
  const user = await User.findOne({ telegramId });
  if (user && user.broadcastStep === 'awaiting_image') {
    return handleBroadcastPhoto(ctx, user);
  }
  // otherwise: ignore silently, same policy as unknown commands/text
});

bot.on('text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;

  const telegramId = String(ctx.from.id);
  const user = await User.findOne({ telegramId });
  if (
    user &&
    ['awaiting_text', 'awaiting_caption', 'awaiting_button'].includes(user.broadcastStep)
  ) {
    return handleBroadcastText(ctx, user);
  }
});

bot.catch((err, ctx) => {
  console.error(`Bot error for update ${ctx.updateType}:`, err);
});

module.exports = bot;
