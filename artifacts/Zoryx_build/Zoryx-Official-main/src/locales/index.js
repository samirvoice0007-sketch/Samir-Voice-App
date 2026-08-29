const en = require('./en');
const zh = require('./zh');
const ru = require('./ru');
const ar = require('./ar');
const fr = require('./fr');
const pt = require('./pt');
const es = require('./es');
const vi = require('./vi');
const bn = require('./bn');

const locales = { en, zh, ru, ar, fr, pt, es, vi, bn };

function t(lang) {
  return locales[lang] || locales.en;
}

module.exports = { t, locales };
