import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthedShell } from "@/components/app-shell";
import { Avatar } from "@/components/avatar";
import { Area, Field } from "@/components/field";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/cn";
import { useLang } from "@/lib/lang-store";
import { ensureMyProfile, updateMyProfile } from "@/lib/profiles";
import type { Profile } from "@/lib/types";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  return (
    <AuthedShell>
      <ProfileInner />
    </AuthedShell>
  );
}

function ProfileInner() {
  const { user } = useCurrentUserState();
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ensureMyProfile().then((p) => {
      setProfile(p);
      setName(p.displayName);
      setBio(p.bio);
    });
  }, []);

  async function onSave() {
    setBusy(true);
    try {
      const p = await updateMyProfile({ data: { displayName: name, bio, lang } });
      setProfile(p);
      setMsg(t("saved"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="px-4 pb-4 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">{t("profile")}</h1>
        <button
          type="button"
          className="min-h-11 rounded-lg border border-border bg-elevated px-4 text-sm font-semibold"
          onClick={() => void signOut().catch(() => {})}
        >
          {t("signOut")}
        </button>
      </div>
      <div className="mt-6 text-center">
        <div className="flex justify-center">
          <Avatar name={name || profile?.displayName || "S"} hue={profile?.avatarHue ?? 320} size="lg" />
        </div>
        <p className="mt-2 text-sm text-muted">
          {t("level")} {profile?.level ?? 1} · XP {profile?.xp ?? 0}
        </p>
        <p className="mt-1 text-xs text-muted">
          {profile?.followers ?? 0} {t("followers")}
        </p>
        {user?.primaryEmail ? <p className="mt-1 text-xs text-muted">{user.primaryEmail}</p> : null}
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <Field value={name} onChange={(e) => setName(e.target.value)} placeholder={t("name")} />
        <Area rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t("bio")} />
        <div className="flex gap-2.5">
          <button
            type="button"
            className={cn(
              "min-h-11 flex-1 rounded-lg font-semibold",
              lang === "bn" ? "bg-primary" : "border border-border bg-elevated",
            )}
            onClick={() => setLang("bn")}
          >
            বাংলা
          </button>
          <button
            type="button"
            className={cn(
              "min-h-11 flex-1 rounded-lg font-semibold",
              lang === "en" ? "bg-primary" : "border border-border bg-elevated",
            )}
            onClick={() => setLang("en")}
          >
            English
          </button>
        </div>
        <button
          type="button"
          disabled={busy}
          className="min-h-11 w-full rounded-lg bg-gold text-sm font-semibold text-bg"
          onClick={onSave}
        >
          {t("save")}
        </button>
        {msg ? <p className="text-center text-sm text-muted">{msg}</p> : null}
      </div>
    </main>
  );
}
