import { create } from "zustand";
import type { Lang } from "./i18n";

const KEY = "gfbf-lang";

function readLang(): Lang {
  if (typeof window === "undefined") return "bn";
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "en" ? "en" : "bn";
  } catch {
    return "bn";
  }
}

type LangState = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

export const useLang = create<LangState>((set) => ({
  lang: readLang(),
  setLang: (lang) => {
    try {
      window.localStorage.setItem(KEY, lang);
    } catch {
      /* ignore */
    }
    set({ lang });
  },
}));
