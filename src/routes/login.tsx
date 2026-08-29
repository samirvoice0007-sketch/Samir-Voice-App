import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LangToggle } from "@/components/lang-toggle";
import { authClient, authEnabled, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/lang-store";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const lang = useLang((s) => s.lang);
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({ email, password, name: name || "Star" });
        if (res.error) throw new Error(res.error.message);
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message);
      }
      await nav({ to: "/" });
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative mx-auto grid min-h-dvh max-w-lg place-items-center overflow-hidden bg-bg px-5">
      <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-24 h-48 w-48 rounded-full bg-gold/15 blur-3xl" />
      <div className="relative w-full space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-4xl font-semibold tracking-tight">GF BF</p>
            <p className="mt-1 text-sm text-muted">{t(lang, "tagline")}</p>
          </div>
          <LangToggle />
        </div>

        {authEnabled ? (
          <div className="space-y-2">
            {GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                className="w-full rounded-2xl border border-border bg-elevated px-4 py-3 text-sm font-semibold hover:border-gold/50"
              >
                {p.providerId === "grok-google" ? t(lang, "continueGoogle") : t(lang, "continueX")}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          {lang === "bn" ? "অথবা ইমেইল" : "or email"}
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onEmail} className="space-y-3">
          {mode === "up" ? (
            <label className="block text-xs text-muted">
              {t(lang, "name")}
              <input
                className="mt-1 w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm text-fg outline-none focus:border-primary"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="nickname"
              />
            </label>
          ) : null}
          <label className="block text-xs text-muted">
            {t(lang, "email")}
            <input
              type="email"
              required
              className="mt-1 w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm text-fg outline-none focus:border-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block text-xs text-muted">
            {t(lang, "password")}
            <input
              type="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm text-fg outline-none focus:border-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
            />
          </label>
          {err ? <p className="text-sm text-primary">{err}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-fg disabled:opacity-80"
          >
            {mode === "up" ? t(lang, "signUp") : t(lang, "signIn")}
          </button>
        </form>

        <button
          type="button"
          className="w-full text-center text-sm text-muted"
          onClick={() => setMode(mode === "up" ? "in" : "up")}
        >
          {mode === "up" ? t(lang, "haveAccount") : t(lang, "noAccount")}{" "}
          <span className="text-gold">{mode === "up" ? t(lang, "signIn") : t(lang, "signUp")}</span>
        </button>
      </div>
    </main>
  );
}
