import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GoogleMark } from "@/components/google-mark";
import { LangToggle } from "@/components/lang-toggle";
import { Field } from "@/components/field";
import { AppFrame, Splash } from "@/components/app-shell";
import { authClient, authEnabled, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useLang } from "@/lib/lang-store";
import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/phone-auth";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const t = useLang((s) => s.t);
  const [mode, setMode] = useState<"in" | "up">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [demoCode, setDemoCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPending && user) navigate({ to: "/" });
  }, [isPending, user, navigate]);

  if (isPending) return <Splash />;
  if (user) return <Splash />;

  async function onGoogle() {
    setErr("");
    setBusy(true);
    try {
      const google = GROK_PROVIDERS.find((p) => p.idp === "google");
      if (!google || !authEnabled) throw new Error(t("authFailed"));
      await signIn(google.providerId, { callbackURL: "/" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("authFailed"));
      setBusy(false);
    }
  }

  async function onX() {
    setErr("");
    setBusy(true);
    try {
      const x = GROK_PROVIDERS.find((p) => p.idp === "twitter");
      if (!x || !authEnabled) throw new Error(t("authFailed"));
      await signIn(x.providerId, { callbackURL: "/" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("authFailed"));
      setBusy(false);
    }
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "up") {
        const { error } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.split("@")[0] || "Star",
        });
        if (error) throw new Error(error.message || t("authFailed"));
      } else {
        const { error } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (error) throw new Error(error.message || t("authFailed"));
      }
      navigate({ to: "/" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("authFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onSendOtp() {
    setErr("");
    setBusy(true);
    try {
      const res = await sendPhoneOtp({ data: { phone } });
      setPhone(res.phone);
      setOtpSent(true);
      setDemoCode(res.code);
      setOtp(res.code);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("invalidPhone"));
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyOtp() {
    setErr("");
    setBusy(true);
    try {
      const creds = await verifyPhoneOtp({
        data: { phone, code: otp, displayName: name || undefined },
      });
      if (creds.isNew) {
        const { error } = await authClient.signUp.email({
          email: creds.email,
          password: creds.password,
          name: creds.name,
        });
        if (error) {
          const { error: e2 } = await authClient.signIn.email({
            email: creds.email,
            password: creds.password,
          });
          if (e2) throw new Error(e2.message || t("authFailed"));
        }
      } else {
        const { error } = await authClient.signIn.email({
          email: creds.email,
          password: creds.password,
        });
        if (error) throw new Error(error.message || t("authFailed"));
      }
      navigate({ to: "/" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("invalidOtp"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppFrame>
      <main className="relative min-h-dvh overflow-hidden px-4 pb-10 pt-6">
        <div
          className="pointer-events-none absolute -left-10 -top-6 h-44 w-44 rounded-full"
          style={{ background: "color-mix(in oklab, var(--color-primary) 35%, transparent)", filter: "blur(40px)" }}
        />
        <div
          className="pointer-events-none absolute -right-8 bottom-24 h-40 w-40 rounded-full"
          style={{ background: "color-mix(in oklab, var(--color-gold) 25%, transparent)", filter: "blur(40px)" }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[2rem] font-semibold tracking-tight text-primary">GF BF</h1>
            <p className="mt-1 text-sm text-muted">{t("tagline")}</p>
          </div>
          <LangToggle />
        </div>

        <div className="relative mt-8 flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onGoogle}
            className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-elevated px-4 text-sm font-semibold text-fg"
          >
            <GoogleMark className="size-[18px] shrink-0" />
            {t("continueGoogle")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onX}
            className="flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-elevated px-4 text-sm font-semibold text-fg"
          >
            {t("continueX")}
          </button>

          <div className="flex items-center gap-2.5 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            <span>{t("orPhone")}</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Field
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t("phonePlaceholder")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {otpSent ? (
            <>
              {demoCode ? (
                <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-gold">
                  {t("demoCode")}: <span className="font-semibold tabular-nums tracking-widest">{demoCode}</span>
                </p>
              ) : null}
              <Field
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder={t("otp")}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <button
                type="button"
                disabled={busy}
                onClick={onVerifyOtp}
                className="min-h-11 w-full rounded-lg bg-phone px-4 text-sm font-semibold text-fg"
              >
                {t("verifyOtp")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onSendOtp}
                className="min-h-11 w-full rounded-lg border border-border bg-elevated px-4 text-sm font-semibold text-fg"
              >
                {t("resendOtp")}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onSendOtp}
              className="min-h-11 w-full rounded-lg bg-phone px-4 text-sm font-semibold text-fg"
            >
              {t("sendOtp")}
            </button>
          )}

          <div className="flex items-center gap-2.5 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            <span>{t("orEmail")}</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form className="flex flex-col gap-3" onSubmit={onEmail}>
            {mode === "up" ? (
              <Field
                placeholder={t("name")}
                autoComplete="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            ) : null}
            <Field
              type="email"
              placeholder={t("email")}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Field
              type="password"
              placeholder={t("password")}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            {mode === "up" ? <p className="text-xs text-muted">{t("passwordHint")}</p> : null}
            {err ? <p className="text-sm text-danger">{err}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-fg"
            >
              {mode === "up" ? t("signUp") : t("signIn")}
            </button>
          </form>
          <button
            type="button"
            className="min-h-11 w-full rounded-lg border border-border bg-elevated px-4 text-sm font-semibold text-fg"
            onClick={() => {
              setMode(mode === "up" ? "in" : "up");
              setErr("");
            }}
          >
            {mode === "up" ? `${t("haveAccount")} ${t("signIn")}` : `${t("noAccount")} ${t("signUp")}`}
          </button>
        </div>
      </main>
    </AppFrame>
  );
}
