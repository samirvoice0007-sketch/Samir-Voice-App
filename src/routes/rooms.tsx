import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/lang-store";
import { listRooms } from "@/lib/party";

export const Route = createFileRoute("/rooms")({ component: RoomsPage });

function RoomsPage() {
  return (
    <AuthGate>
      <AppShell>
        <RoomsInner />
      </AppShell>
    </AuthGate>
  );
}

function RoomsInner() {
  const lang = useLang((s) => s.lang);
  const rooms = useQuery({ queryKey: ["rooms"], queryFn: () => listRooms(), refetchInterval: 4000 });
  return (
    <div className="px-4 pt-6">
      <h1 className="font-display text-2xl font-semibold">{t(lang, "rooms")}</h1>
      <div className="mt-4 space-y-3">
        {rooms.data?.map((room) => (
          <Link
            key={room.id}
            to="/room/$id"
            params={{ id: room.id }}
            className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4"
          >
            <div>
              <p className="font-semibold">{room.title}</p>
              <p className="text-xs text-muted">{room.topic}</p>
            </div>
            <span className="rounded-full bg-gold/15 px-3 py-2 text-xs font-semibold text-gold">{t(lang, "join")}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
