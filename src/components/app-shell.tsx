import { Link, useRouterState } from "@tanstack/react-router";
import { Gift, House, Mic, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/cn";
import { useLang } from "@/lib/lang-store";
import { ensureMyProfile } from "@/lib/profiles";
import type { Profile } from "@/lib/types";

export function Splash() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6">
      <div className="text-center">
        <div className="font-display text-3xl font-semibold tracking-tight text-primary">GF BF</div>
        <p className="mt-2 text-sm text-muted">Loading…</p>
      </div>
    </main>
  );
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-bg">
      {children}
    </div>
  );
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const t = useLang((s) => s.t);
  const items = [
    { to: "/", label: t("home"), icon: House, match: (p: string) => p === "/" },
    { to: "/rooms", label: t("rooms"), icon: Mic, match: (p: string) => p.startsWith("/rooms") },
    { to: "/wallet", label: t("wallet"), icon: Gift, match: (p: string) => p === "/wallet" },
    { to: "/profile", label: t("profile"), icon: UserRound, match: (p: string) => p === "/profile" },
  ];
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-[480px] -translate-x-1/2 grid-cols-4 border-t border-border bg-surface/90 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
      {items.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
              active ? "text-gold" : "text-muted",
            )}
          >
            <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AuthedShell({
  children,
  nav = true,
}: {
  children: React.ReactNode;
  nav?: boolean;
}) {
  const { user, isPending } = useCurrentUserState();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isPending || !user) return;
    let alive = true;
    ensureMyProfile()
      .then((p) => {
        if (alive) setProfile(p);
      })
      .catch(() => {
        if (alive) setProfile(null);
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [isPending, user]);

  if (isPending) return <Splash />;
  if (!user) return <RedirectToSignIn />;
  if (!ready) return <Splash />;

  return (
    <AppFrame>
      <div className={nav ? "pb-24" : ""}>{children}</div>
      {nav ? <BottomNav /> : null}
    </AppFrame>
  );
}

export function useAuthedProfileRefresh() {
  return ensureMyProfile;
}
