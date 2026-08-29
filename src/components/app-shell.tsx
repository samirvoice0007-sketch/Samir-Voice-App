import { Link, useRouterState } from "@tanstack/react-router";
import { Gift, House, Mic, UserRound } from "lucide-react";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/lang-store";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", key: "home" as const, icon: House },
  { to: "/rooms", key: "rooms" as const, icon: Mic },
  { to: "/wallet", key: "wallet" as const, icon: Gift },
  { to: "/profile", key: "profile" as const, icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const lang = useLang((s) => s.lang);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-bg">
      <div className="flex-1 pb-24">{children}</div>
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg border-t border-border bg-surface/95 backdrop-blur">
        <div className="grid grid-cols-4 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {tabs.map((tab) => {
            const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-gold" : "text-muted",
                )}
              >
                <Icon className="h-5 w-5" />
                {t(lang, tab.key)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
