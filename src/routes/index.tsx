import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { LangToggle } from "@/components/lang-toggle";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/lang-store";
import { createRoom, getMyProfile, listRooms } from "@/lib/party";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  return (
    <AuthGate>
      <AppShell>
        <HomeInner />
      </AppShell>
    </AuthGate>
  );
}

function HomeInner() {
  const lang = useLang((s) => s.lang);
  const user = useCurrentUser();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");

  const rooms = useQuery({ queryKey: ["rooms"], queryFn: () => listRooms(), refetchInterval: 4000 });
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMyProfile() });
  const create = useMutation({
    mutationFn: () => createRoom({ data: { title: title.trim(), topic: topic.trim() } }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["rooms"] });
      setOpen(false);
      setTitle("");
      setTopic("");
      await nav({ to: "/room/$id", params: { id: res.id } });
    },
  });

  return (
    <div className="px-4 pt-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Live party</p>
          <h1 className="font-display text-3xl font-semibold">GF BF</h1>
        </div>
        <LangToggle />
      </header>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-muted">{t(lang, "welcome")}</p>
        <p className="text-lg font-semibold">{me.data?.displayName ?? user?.displayName ?? "Star"}</p>
        <div className="mt-3 flex gap-4 text-sm">
          <span>
            <strong className="text-gold">{me.data?.coins ?? "—"}</strong> {t(lang, "coins")}
          </span>
          <span>
            <strong className="text-primary">{me.data?.charm ?? "—"}</strong> {t(lang, "charm")}
          </span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">{t(lang, "liveNow")}</h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-3 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          {t(lang, "createRoom")}
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {rooms.isLoading ? <p className="text-sm text-muted">{t(lang, "loading")}</p> : null}
        {!rooms.isLoading && !rooms.data?.length ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">{t(lang, "emptyRooms")}</p>
        ) : null}
        {rooms.data?.map((room) => (
          <Link
            key={room.id}
            to="/room/$id"
            params={{ id: room.id }}
            className="block rounded-2xl border border-border bg-elevated p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{room.title}</p>
                <p className="text-xs text-muted">{room.topic}</p>
              </div>
              <span className="rounded-full bg-primary/20 px-2 py-1 text-[11px] font-semibold text-gold">LIVE</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              {room.people} {t(lang, "listeners")} · {room.speakers} {t(lang, "speaker")}
            </p>
          </Link>
        ))}
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 grid place-items-end bg-bg/70 p-4 backdrop-blur-sm">
          <form
            className="w-full max-w-lg space-y-3 rounded-3xl border border-border bg-surface p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim().length >= 2) create.mutate();
            }}
          >
            <h3 className="font-display text-xl">{t(lang, "createRoom")}</h3>
            <input
              required
              minLength={2}
              placeholder={t(lang, "roomTitle")}
              className="w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              placeholder={t(lang, "topic")}
              className="w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm outline-none"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <div className="flex gap-2">
              <button type="button" className="flex-1 rounded-xl border border-border py-3 text-sm" onClick={() => setOpen(false)}>
                {lang === "bn" ? "বন্ধ" : "Close"}
              </button>
              <button type="submit" disabled={create.isPending} className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold">
                {t(lang, "start")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
