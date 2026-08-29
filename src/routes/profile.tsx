import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { AvatarOrb } from "@/components/avatar-orb";
import { UserButton } from "@/lib/auth/gates";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/lang-store";
import { getMyProfile, updateMyProfile } from "@/lib/party";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  return (
    <AuthGate>
      <AppShell>
        <ProfileInner />
      </AppShell>
    </AuthGate>
  );
}

function ProfileInner() {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMyProfile() });
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (me.data) {
      setName(me.data.displayName);
      setBio(me.data.bio);
    }
  }, [me.data]);

  const save = useMutation({
    mutationFn: () => updateMyProfile({ data: { displayName: name.trim() || "Star", bio, lang } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">{t(lang, "profile")}</h1>
        <UserButton />
      </div>
      <div className="mt-6 flex flex-col items-center">
        <AvatarOrb name={name || "S"} hue={me.data?.avatarHue ?? 320} size="lg" />
        <p className="mt-3 text-sm text-muted">
          {t(lang, "level")} {me.data?.level ?? 1} · XP {me.data?.xp ?? 0}
        </p>
      </div>
      <div className="mt-6 space-y-3">
        <label className="block text-xs text-muted">
          {t(lang, "name")}
          <input
            className="mt-1 w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-xs text-muted">
          {t(lang, "bio")}
          <textarea
            className="mt-1 w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            className={`flex-1 rounded-xl py-3 text-sm ${lang === "bn" ? "bg-primary" : "border border-border"}`}
            onClick={() => setLang("bn")}
          >
            বাংলা
          </button>
          <button
            type="button"
            className={`flex-1 rounded-xl py-3 text-sm ${lang === "en" ? "bg-primary" : "border border-border"}`}
            onClick={() => setLang("en")}
          >
            English
          </button>
        </div>
        <button
          type="button"
          onClick={() => save.mutate()}
          className="w-full rounded-2xl bg-gold py-3 text-sm font-semibold text-bg"
        >
          {t(lang, "save")}
        </button>
      </div>
    </div>
  );
}
