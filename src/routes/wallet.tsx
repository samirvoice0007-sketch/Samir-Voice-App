import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { GIFTS } from "@/lib/gifts";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/lang-store";
import { claimDaily, getMyProfile, listMyGifts } from "@/lib/party";

export const Route = createFileRoute("/wallet")({ component: WalletPage });

function WalletPage() {
  return (
    <AuthGate>
      <AppShell>
        <WalletInner />
      </AppShell>
    </AuthGate>
  );
}

function WalletInner() {
  const lang = useLang((s) => s.lang);
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMyProfile() });
  const gifts = useQuery({ queryKey: ["my-gifts"], queryFn: () => listMyGifts() });
  const daily = useMutation({
    mutationFn: () => claimDaily(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  return (
    <div className="px-4 pt-6">
      <h1 className="font-display text-2xl font-semibold">{t(lang, "wallet")}</h1>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">{t(lang, "coins")}</p>
          <p className="font-display text-3xl text-gold">{me.data?.coins ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">{t(lang, "charm")}</p>
          <p className="font-display text-3xl text-primary">{me.data?.charm ?? 0}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => daily.mutate()}
        disabled={daily.isPending}
        className="mt-4 w-full rounded-2xl border border-gold/40 bg-gold/10 py-3 text-sm font-semibold text-gold"
      >
        {daily.data?.ok === false ? t(lang, "claimed") : t(lang, "daily")}
      </button>

      <h2 className="mt-8 text-sm font-semibold text-muted">{t(lang, "gifts")}</h2>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {GIFTS.map((g) => (
          <div key={g.id} className="rounded-2xl border border-border bg-elevated p-2 text-center">
            <div className="text-2xl">{g.emoji}</div>
            <p className="mt-1 truncate text-[10px]">{lang === "bn" ? g.nameBn : g.nameEn}</p>
            <p className="text-[10px] text-gold">{g.cost}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-semibold text-muted">{t(lang, "history")}</h2>
      <div className="mt-3 space-y-2">
        {!gifts.data?.length ? <p className="text-sm text-muted">{t(lang, "noGifts")}</p> : null}
        {gifts.data?.map((g) => (
          <div key={g.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-sm">
            <span>
              {g.catalog?.emoji} {lang === "bn" ? g.catalog?.nameBn : g.catalog?.nameEn}
            </span>
            <span className="text-gold">{g.cost}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
