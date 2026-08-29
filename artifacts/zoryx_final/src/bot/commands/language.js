const User = require('../../models/User');
const { t } = require('../../locales');
const { languageKeyboard } = require('../keyboards');
const { DEFAULT_LANG, OFFICIAL_CHANNEL, COMMUNITY_CHANNEL } = require('../../config');

async function setLanguageAction(ctx) {
  const code = ctx.match[1]; // from regex setlang_(en|zh|ru|ar|fr|pt|es|vi|bn)
  const telegramId = String(ctx.from.id);

  await User.findOneAndUpdate({ telegramId }, { language: code }, { new: true, upsert: true });

  const locale = t(code);
  await ctx.answerCbQuery(locale.languageSet);

  const displayName = ctx.from.first_name || ctx.from.username || 'Friend';
  // Replace the marketing/picker message with the detailed welcome message,
  // then send the language buttons again underneath so the user can switch anytime.
  await ctx.editMessageText(locale.welcome(displayName), { parse_mode: 'Markdown' });
  return ctx.reply(locale.welcomeLinks(OFFICIAL_CHANNEL, COMMUNITY_CHANNEL), languageKeyboard());
}

async function changeLanguageAction(ctx) {
  await ctx.answerCbQuery();
  return ctx.reply(t(DEFAULT_LANG).chooseLanguage, languageKeyboard());
}

module.exports = { setLanguageAction, changeLanguageAction };
