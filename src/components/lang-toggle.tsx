import { useLang } from "@/lib/lang-store";
import { cn } from "@/lib/cn";

export function LangToggle() {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  return (
    <div className="inline-flex rounded-pill border border-border bg-elevated p-0.5">
      <button
        type="button"
        className={cn(
          "min-h-8 rounded-pill px-2.5 text-xs font-semibold text-muted transition-colors duration-150",
          lang === "bn" && "bg-primary text-fg",
        )}
        onClick={() => setLang("bn")}
      >
        বাং
      </button>
      <button
        type="button"
        className={cn(
          "min-h-8 rounded-pill px-2.5 text-xs font-semibold text-muted transition-colors duration-150",
          lang === "en" && "bg-primary text-fg",
        )}
        onClick={() => setLang("en")}
      >
        EN
      </button>
    </div>
  );
}
