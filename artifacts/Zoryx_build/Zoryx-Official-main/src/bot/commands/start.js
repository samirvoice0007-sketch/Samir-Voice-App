const User = require('../../models/User');
const { t } = require('../../locales');
const { languageKeyboard, mainMenuKeyboard } = require('../keyboards');
const { REFERRAL_REWARD_USDT, DEFAULT_LANG, OFFICIAL_CHANNEL, COMMUNITY_CHANNEL } = require('../../config');

module.exports = async function startCommand(ctx) {
  const from = ctx.from;
  const telegramId = String(from.id);
  const payload = ctx.startPayload; // e.g. "ref_123456"

  let user = await User.findOne({ telegramId });
  const isNewUser = !user;

  if (!user) {
    let referredBy = null;
    if (payload && payload.startsWith('ref_')) {
      const refId = payload.replace('ref_', '');
      if (refId && refId !== telegramId) referredBy = refId;
    }

    user = await User.create({
      telegramId,
      firstName: from.first_name || '',
      lastName: from.last_name || '',
      username: from.username || '',
      referredBy,
    });

    if (referredBy) {
      const referrer = await User.findOneAndUpdate(
        { telegramId: referredBy },
        { $inc: { balanceUSDT: REFERRAL_REWARD_USDT, referralCount: 1 } },
        { new: true }
      );
      if (referrer) {
        try {
          await ctx.telegram.sendMessage(
            referrer.telegramId,
            `🎉 +${REFERRAL_REWARD_USDT} USDT! ${from.first_name || 'A friend'} joined using your invite link.`
          );
        } catch (e) {
          /* user may have blocked the bot, ignore */
        }
      }
    }
  } else {
    user.firstName = from.first_name || user.firstName;
    user.lastName = from.last_name || user.lastName;
    user.username = from.username || user.username;
    await user.save();
  }

  if (!user.language) {
    // first time -> marketing intro + language picker (matches the reference screenshot)
    return ctx.reply(t(DEFAULT_LANG).marketingIntro, languageKeyboard());
  }

  // returning user with a language already set -> show the detailed welcome
  // message plus the language buttons again underneath (so they can switch anytime)
  const locale = t(user.language);
  const displayName = from.first_name || from.username || 'Friend';
  await ctx.replyWithMarkdown(locale.welcome(displayName));
  return ctx.reply(locale.welcomeLinks(OFFICIAL_CHANNEL, COMMUNITY_CHANNEL), languageKeyboard());
};
