const User = require('../../models/User');
const { t } = require('../../locales');
const { isAdmin, getPermissions } = require('../middlewares/adminCheck');
const { DEFAULT_LANG } = require('../../config');

const URL_REGEX = /^https?:\/\/\S+$/i;

async function localeFor(user) {
  return t((user && user.language) || DEFAULT_LANG);
}

async function checkPermission(ctx) {
  const telegramId = String(ctx.from.id);
  const admin = await isAdmin(telegramId);
  const perms = await getPermissions(telegramId);
  const user = await User.findOne({ telegramId });
  return { ok: admin && perms.canAnnounce, user, telegramId };
}

// ==== /announcement -> text-only broadcast flow ====
async function announcementCommand(ctx) {
  const { ok, user, telegramId } = await checkPermission(ctx);
  if (!ok) return; // silent for non-admins

  const locale = await localeFor(user);
  await User.updateOne(
    { telegramId },
    { broadcastStep: 'awaiting_text', broadcastDraftPhotoId: null, broadcastDraftText: null }
  );
  return ctx.reply(locale.announcementAsk);
}

// ==== /announcementimage -> image + caption broadcast flow ====
async function announcementImageCommand(ctx) {
  const { ok, user, telegramId } = await checkPermission(ctx);
  if (!ok) return; // silent for non-admins

  const locale = await localeFor(user);
  await User.updateOne(
    { telegramId },
    { broadcastStep: 'awaiting_image', broadcastDraftPhotoId: null, broadcastDraftText: null }
  );
  return ctx.reply(locale.announcementImageAsk);
}

// ==== called from bot.js when broadcastStep === 'awaiting_image' and a photo arrives ====
async function handleBroadcastPhoto(ctx, adminUser) {
  const locale = await localeFor(adminUser);
  const photos = ctx.message.photo;
  const fileId = photos[photos.length - 1].file_id; // highest resolution

  await User.updateOne(
    { telegramId: adminUser.telegramId },
    { broadcastStep: 'awaiting_caption', broadcastDraftPhotoId: fileId }
  );
  return ctx.reply(locale.announcementCaptionAsk);
}

// ==== called from bot.js generic text listener based on broadcastStep ====
async function handleBroadcastText(ctx, adminUser) {
  const locale = await localeFor(adminUser);
  const text = ctx.message.text;

  if (adminUser.broadcastStep === 'awaiting_text' || adminUser.broadcastStep === 'awaiting_caption') {
    await User.updateOne(
      { telegramId: adminUser.telegramId },
      { broadcastStep: 'awaiting_button', broadcastDraftText: text }
    );
    return ctx.reply(locale.announcementButtonAsk);
  }

  if (adminUser.broadcastStep === 'awaiting_button') {
    if (!URL_REGEX.test(text.trim())) {
      return ctx.reply(locale.announcementInvalidUrl);
    }
    return sendBroadcast(ctx, adminUser, text.trim());
  }
}

// ==== /nobutton -> only valid while awaiting_button ====
async function nobuttonCommand(ctx) {
  const telegramId = String(ctx.from.id);
  const user = await User.findOne({ telegramId });
  if (!user || user.broadcastStep !== 'awaiting_button') return; // silent, nothing to do

  return sendBroadcast(ctx, user, null);
}

// ==== Final step: actually broadcast to every real user ====
async function sendBroadcast(ctx, adminUser, buttonUrl) {
  const locale = await localeFor(adminUser);

  const photoId = adminUser.broadcastDraftPhotoId;
  const text = adminUser.broadcastDraftText;

  await User.updateOne(
    { telegramId: adminUser.telegramId },
    { broadcastStep: null, broadcastDraftPhotoId: null, broadcastDraftText: null }
  );

  const users = await User.find({ isFake: false }, { telegramId: 1 }).lean();
  await ctx.reply(locale.announcementSending(users.length));

  const replyMarkup = buttonUrl
    ? { inline_keyboard: [[{ text: locale.announcementButtonLabel, url: buttonUrl }]] }
    : undefined;

  let sent = 0;
  let failed = 0;

  for (const u of users) {
    try {
      if (photoId) {
        await ctx.telegram.sendPhoto(u.telegramId, photoId, {
          caption: text,
          reply_markup: replyMarkup,
        });
      } else {
        await ctx.telegram.sendMessage(u.telegramId, text, { reply_markup: replyMarkup });
      }
      sent++;
    } catch (e) {
      failed++;
    }
    // gentle throttle to avoid Telegram flood limits
    await new Promise((r) => setTimeout(r, 40));
  }

  return ctx.reply(locale.announcementDone(sent, failed));
}

module.exports = {
  announcementCommand,
  announcementImageCommand,
  handleBroadcastPhoto,
  handleBroadcastText,
  nobuttonCommand,
};
