import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ConfirmationResult } from "react";
import { LangToggle } from "@/components/lang-toggle";
import {
  AuthError,
  confirmPhoneOtp,
  requestPhoneOtp,
  signIn,
  signInWithGoogle,
  signUp,
} from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/lang-store";

export const Route = createFileRoute("/login")({ component: Login });

const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

function errorMessage(error: unknown): string {
  return error instanceof AuthError ? error.message : "Something went wrong. Try again.";
}

function Login() {
  const lang = useLang((s) => s.lang);
  const nav = useNavigate();
  const currentUser = useCurrentUser();

  // Covers the Google redirect flow: the browser leaves for Google's page
  // and comes back to this same /login route once signed in — as soon as
  // the session resolves, move on to the app.
  useEffect(() => {
    if (currentUser) void nav({ to: "/" });
  }, [currentUser, nav]);

  // Email + password
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Phone OTP
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "up") {
        await signUp({ email, password, name: name || "Star" });
      } else {
        await signIn({ email, password });
      }
      await nav({ to: "/" });
    } catch (error) {
      setErr(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setErr("");
    setBusy(true);
    try {
      await signInWithGoogle(); // navigates the browser to Google — code after this won't run
    } catch (error) {
      setErr(errorMessage(error));
      setBusy(false);
    }
  }

  async function onSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const result = await requestPhoneOtp(phone, RECAPTCHA_CONTAINER_ID);
      setConfirmation(result);
    } catch (error) {
      setErr(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmation) return;
    setErr("");
    setBusy(true);
    try {
      await confirmPhoneOtp(confirmation, otp);
      await nav({ to: "/" });
    } catch (error) {
      setErr(errorMessage(error));
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

        {/* Firebase's invisible reCAPTCHA mounts here — must stay in the DOM. */}
        <div id={RECAPTCHA_CONTAINER_ID} />

        <button
          type="button"
          disabled={busy}
          onClick={onGoogle}
          className="w-full rounded-2xl border border-border bg-elevated px-4 py-3 text-sm font-semibold hover:border-gold/50 disabled:opacity-60"
        >
          {lang === "bn" ? "Google দিয়ে চালিয়ে যান" : "Continue with Google"}
        </button>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          {lang === "bn" ? "অথবা ফোন OTP" : "or phone OTP"}
          <span className="h-px flex-1 bg-border" />
        </div>

        {!confirmation ? (
          <form onSubmit={onSendOtp} className="space-y-3">
            <label className="block text-xs text-muted">
              {lang === "bn" ? "ফোন নাম্বার" : "Phone number"}
              <input
                type="tel"
                required
                placeholder="+8801XXXXXXXXX"
                className="mt-1 w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm text-fg outline-none focus:border-primary"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl border border-border bg-elevated py-3 text-sm font-semibold disabled:opacity-60"
            >
              {lang === "bn" ? "কোড পাঠান" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={onVerifyOtp} className="space-y-3">
            <label className="block text-xs text-muted">
              {lang === "bn" ? "SMS কোড" : "SMS code"}
              <input
                type="text"
                inputMode="numeric"
                required
                className="mt-1 w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm text-fg outline-none focus:border-primary"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                autoComplete="one-time-code"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-fg disabled:opacity-80"
            >
              {lang === "bn" ? "যাচাই করুন" : "Verify"}
            </button>
            <button
              type="button"
              className="w-full text-center text-xs text-muted underline-offset-4 hover:underline"
              onClick={() => setConfirmation(null)}
            >
              {lang === "bn" ? "নাম্বার পরিবর্তন করুন" : "Use a different number"}
            </button>
          </form>
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
