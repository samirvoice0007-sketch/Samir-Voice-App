import { useLang } from "@/lib/lang-store";

export function LangToggle() {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  return (
    <div className="inline-flex rounded-full border border-border bg-elevated p-0.5 text-xs font-semibold">
      <button
        type="button"
        className={`rounded-full px-2.5 py-1 ${lang === "bn" ? "bg-primary text-fg" : "text-muted"}`}
        onClick={() => setLang("bn")}
      >
        বাং
      </button>
      <button
        type="button"
        className={`rounded-full px-2.5 py-1 ${lang === "en" ? "bg-primary text-fg" : "text-muted"}`}
        onClick={() => setLang("en")}
      >
        EN
      </button>
    </div>
  );
}
