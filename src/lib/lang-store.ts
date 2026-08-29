import { create } from "zustand";
import type { Lang } from "./i18n";
import { translate, type I18nKey } from "./i18n";

const KEY = "gfbf-lang";

function readLang(): Lang {
  if (typeof window === "undefined") return "bn";
  try {
    return window.localStorage.getItem(KEY) === "en" ? "en" : "bn";
  } catch {
    return "bn";
  }
}

type LangState = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: I18nKey) => string;
};

export const useLang = create<LangState>((set, get) => ({
  lang: readLang(),
  setLang: (lang) => {
    try {
      window.localStorage.setItem(KEY, lang);
    } catch {
      /* ignore */
    }
    set({ lang });
  },
  t: (key) => translate(get().lang, key),
}));
