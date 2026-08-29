const User = require('../../models/User');
const { t } = require('../../locales');
const { isAdmin, isOwner } = require('../middlewares/adminCheck');
const { DEFAULT_LANG } = require('../../config');

module.exports = async function helpCommand(ctx) {
  const telegramId = String(ctx.from.id);

  const owner = isOwner(telegramId);
  const admin = owner || (await isAdmin(telegramId));
  if (!admin) {
    // regular users get NO response at all for /help
    return;
  }

  const user = await User.findOne({ telegramId });
  const locale = t((user && user.language) || DEFAULT_LANG);

  if (owner) {
    return ctx.replyWithMarkdown(`${locale.ownerHelpTitle}\n\n${locale.ownerHelpBody}`);
  }
  return ctx.replyWithMarkdown(`${locale.adminHelpTitle}\n\n${locale.adminHelpBody}`);
};
