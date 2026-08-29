import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthedShell } from "@/components/app-shell";
import { LangToggle } from "@/components/lang-toggle";
import { Field } from "@/components/field";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useLang } from "@/lib/lang-store";
import { ensureMyProfile } from "@/lib/profiles";
import { createRoom, listRooms } from "@/lib/rooms";
import type { Profile, RoomSummary } from "@/lib/types";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  return (
    <AuthedShell>
      <HomeInner />
    </AuthedShell>
  );
}

function HomeInner() {
  const { user } = useCurrentUserState();
  const t = useLang((s) => s.t);
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([ensureMyProfile(), listRooms()])
      .then(([p, r]) => {
        if (!alive) return;
        setProfile(p);
        setRooms(r);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function onCreate() {
    setErr("");
    setBusy(true);
    try {
      const room = await createRoom({ data: { title, topic } });
      navigate({ to: "/rooms/$id", params: { id: room.id } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create room");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="px-4 pb-4 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">{t("liveParty")}</div>
          <h1 className="font-display text-[2rem] font-semibold tracking-tight text-primary">GF BF</h1>
        </div>
        <LangToggle />
      </div>

      <section className="mt-4 rounded-xl border border-border bg-surface p-4">
        <div className="text-[13px] text-muted">{t("welcome")}</div>
        <div className="text-lg font-semibold">{profile?.displayName || user?.displayName || "Star"}</div>
        <div className="mt-2 flex gap-4 text-[13px]">
          <span>
            <strong className="tabular-nums text-gold">{profile?.coins ?? 0}</strong> {t("coins")}
          </span>
          <span>
            <strong className="tabular-nums text-primary">{profile?.charm ?? 0}</strong> {t("charm")}
          </span>
        </div>
      </section>

      <div className="mt-6 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-muted">{t("liveNow")}</h2>
        <button
          type="button"
          className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold"
          onClick={() => setOpen(true)}
        >
          {t("createRoom")}
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {!rooms.length ? (
          <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">{t("emptyRooms")}</div>
        ) : null}
        {rooms.map((r) => (
          <button
            key={r.id}
            type="button"
            className="rounded-xl border border-border bg-elevated p-3.5 text-left"
            onClick={() => navigate({ to: "/rooms/$id", params: { id: r.id } })}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{r.title}</div>
                <div className="text-xs text-muted">{r.topic}</div>
              </div>
              <span className="rounded-pill bg-primary/25 px-2 py-1 text-[11px] font-bold text-gold">LIVE</span>
            </div>
            <div className="mt-2 text-xs text-muted">
              {r.people} {t("listeners")} · {r.speakers} {t("speaker")}
            </div>
          </button>
        ))}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-bg/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[448px] rounded-xl border border-border bg-surface p-4">
            <h2 className="font-display text-xl font-semibold">{t("createRoom")}</h2>
            <div className="mt-3 flex flex-col gap-3">
              <Field placeholder={t("roomTitle")} value={title} onChange={(e) => setTitle(e.target.value)} />
              <Field placeholder={t("topic")} value={topic} onChange={(e) => setTopic(e.target.value)} />
              {err ? <p className="text-sm text-danger">{err}</p> : null}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  className="min-h-11 flex-1 rounded-lg border border-border bg-elevated font-semibold"
                  onClick={() => setOpen(false)}
                >
                  {t("close")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="min-h-11 flex-1 rounded-lg bg-primary font-semibold"
                  onClick={onCreate}
                >
                  {t("start")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
