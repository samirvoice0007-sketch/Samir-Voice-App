import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthedShell } from "@/components/app-shell";
import { useLang } from "@/lib/lang-store";
import { listRooms } from "@/lib/rooms";
import type { RoomSummary } from "@/lib/types";

export const Route = createFileRoute("/rooms")({ component: RoomsPage });

function RoomsPage() {
  return (
    <AuthedShell>
      <RoomsInner />
    </AuthedShell>
  );
}

function RoomsInner() {
  const t = useLang((s) => s.t);
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);

  useEffect(() => {
    listRooms().then(setRooms).catch(() => setRooms([]));
  }, []);

  return (
    <main className="px-4 pb-4 pt-5">
      <h1 className="font-display text-2xl font-semibold">{t("rooms")}</h1>
      <div className="mt-4 flex flex-col gap-3">
        {rooms.map((r) => (
          <button
            key={r.id}
            type="button"
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-elevated p-3.5 text-left"
            onClick={() => navigate({ to: "/rooms/$id", params: { id: r.id } })}
          >
            <div>
              <div className="font-semibold">{r.title}</div>
              <div className="text-xs text-muted">{r.topic}</div>
            </div>
            <span className="rounded-pill bg-primary/25 px-2 py-1 text-[11px] font-bold text-gold">{t("join")}</span>
          </button>
        ))}
        {!rooms.length ? <p className="text-sm text-muted">{t("emptyRooms")}</p> : null}
      </div>
    </main>
  );
}
