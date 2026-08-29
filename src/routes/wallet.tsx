import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthedShell } from "@/components/app-shell";
import { GIFTS } from "@/lib/gifts";
import { useLang } from "@/lib/lang-store";
import { claimDaily, ensureMyProfile, giftHistory } from "@/lib/profiles";
import type { GiftHistoryRow, Profile } from "@/lib/types";

export const Route = createFileRoute("/wallet")({ component: WalletPage });

function WalletPage() {
  return (
    <AuthedShell>
      <WalletInner />
    </AuthedShell>
  );
}

function WalletInner() {
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hist, setHist] = useState<GiftHistoryRow[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([ensureMyProfile(), giftHistory()]).then(([p, h]) => {
      setProfile(p);
      setHist(h);
    });
  }, []);

  async function onDaily() {
    const res = await claimDaily();
    setMsg(res.message === "already" ? t("claimed") : t("daily"));
    const p = await ensureMyProfile();
    setProfile(p);
  }

  return (
    <main className="px-4 pb-4 pt-5">
      <h1 className="font-display text-2xl font-semibold">{t("wallet")}</h1>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs text-muted">{t("coins")}</div>
          <div className="font-display text-[2rem] tabular-nums text-gold">{profile?.coins ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs text-muted">{t("charm")}</div>
          <div className="font-display text-[2rem] tabular-nums text-primary">{profile?.charm ?? 0}</div>
        </div>
      </div>
      <button
        type="button"
        className="mt-4 min-h-11 w-full rounded-lg bg-gold px-4 text-sm font-semibold text-bg"
        onClick={onDaily}
      >
        {t("daily")}
      </button>
      {msg ? <p className="mt-2 text-center text-sm text-muted">{msg}</p> : null}

      <h2 className="mt-6 text-sm font-semibold text-muted">{t("gifts")}</h2>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {GIFTS.map((g) => (
          <div key={g.id} className="rounded-lg border border-border bg-elevated px-1 py-2 text-center">
            <div className="text-[22px] leading-none">{g.emoji}</div>
            <div className="mt-1 text-[10px]">{lang === "bn" ? g.nameBn : g.nameEn}</div>
            <div className="text-[10px] text-gold">{g.cost}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-6 text-sm font-semibold text-muted">{t("history")}</h2>
      <div className="mt-2 flex flex-col gap-2">
        {!hist.length ? <p className="text-sm text-muted">{t("noGifts")}</p> : null}
        {hist.map((h) => (
          <div key={h.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5">
            <span>
              {h.emoji} {lang === "bn" ? h.nameBn : h.nameEn}
            </span>
            <span className="tabular-nums text-gold">{h.cost}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
