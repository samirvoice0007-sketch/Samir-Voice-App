const { Markup } = require('telegraf');
const { WEBAPP_URL, SUPPORTED_LANGS } = require('../config');

const LANG_LABELS = {
  en: '🇬🇧 English',
  zh: '🇨🇳 中文',
  ru: '🇷🇺 Русский',
  ar: '🇸🇦 العربية',
  fr: '🇫🇷 Français',
  pt: '🇧🇷 Português',
  es: '🇪🇸 Español',
  vi: '🇻🇳 Tiếng Việt',
  bn: '🇧🇩 বাংলা',
};

function languageKeyboard() {
  const buttons = SUPPORTED_LANGS.map((code) =>
    Markup.button.callback(LANG_LABELS[code], `setlang_${code}`)
  );
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  return Markup.inlineKeyboard(rows);
}

function mainMenuKeyboard(locale) {
  return Markup.inlineKeyboard([
    [Markup.button.webApp(locale.openApp, WEBAPP_URL)],
    [Markup.button.callback(locale.changeLanguage, 'change_lang')],
  ]);
}

module.exports = { languageKeyboard, mainMenuKeyboard, LANG_LABELS };
