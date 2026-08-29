const I18N = (function () {
  let dict = {};
  const RTL_LANGS = ['ar'];

  async function load(lang) {
    try {
      const res = await fetch(`locales/${lang}.json`);
      dict = await res.json();
    } catch (e) {
      console.error('Failed to load locale', lang, e);
      dict = {};
    }
    applyToDOM(lang);
  }

  function t(key) {
    return dict[key] || key;
  }

  function applyToDOM(lang) {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
      const key = el.getAttribute('data-i18n-ph');
      if (dict[key]) el.setAttribute('placeholder', dict[key]);
    });
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
    const codeEl = document.getElementById('langCode');
    if (codeEl) codeEl.textContent = lang.toUpperCase();
  }

  return { load, t };
})();
