import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Gift, Mic, MicOff, Send, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthedShell } from "@/components/app-shell";
import { Avatar } from "@/components/avatar";
import { Field } from "@/components/field";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/cn";
import { GIFTS, giftById } from "@/lib/gifts";
import { peerIdFromUser, signalRoom } from "@/lib/ids";
import { useLang } from "@/lib/lang-store";
import { useP2PRoom } from "@/lib/multiplayer/use-p2p-room";
import { ensureMyProfile, toggleFollow } from "@/lib/profiles";
import {
  getRoom,
  joinRoom,
  kickMember,
  leaveRoom,
  listMessages,
  sendGift,
  sendMessage,
  setMuted as persistMuted,
  takeSeat,
} from "@/lib/rooms";
import type { ChatMessage, Profile, RoomDetail } from "@/lib/types";
import { useAgoraVoice } from "@/lib/voice/use-agora";

export const Route = createFileRoute("/rooms/$id")({ component: RoomPage });

function RoomPage() {
  return (
    <AuthedShell nav={false}>
      <RoomInner />
    </AuthedShell>
  );
}

function RoomInner() {
  const { id } = Route.useParams();
  const { user } = useCurrentUserState();
  const t = useLang((s) => s.t);
  const lang = useLang((s) => s.lang);
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [chat, setChat] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const [fly, setFly] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [micOn, setMicOn] = useState(false);
  const chatBox = useRef<HTMLDivElement>(null);
  const userId = user?.id ?? "";
  const selfPeer = peerIdFromUser(userId);
  const myRole = room?.members.find((m) => m.userId === userId)?.role ?? "listener";

  const p2p = useP2PRoom({
    room: signalRoom("c", id),
    selfId: selfPeer,
    name: profile?.displayName || user?.displayName || "Star",
    enabled: Boolean(userId),
  });

  const voice = useAgoraVoice({
    roomId: id,
    selfId: userId,
    role: myRole,
    enabled: Boolean(userId),
  });

  const refresh = useCallback(async () => {
    const [r, m] = await Promise.all([getRoom({ data: { id } }), listMessages({ data: { id } })]);
    setRoom(r);
    setMessages(m);
  }, [id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await ensureMyProfile();
        if (!alive) return;
        setProfile(p);
        const r = await joinRoom({ data: { id } });
        if (!alive) return;
        setRoom(r);
        const m = await listMessages({ data: { id } });
        if (!alive) return;
        setMessages(m);
      } catch {
        if (alive) navigate({ to: "/" });
      }
    })();
    const tick = setInterval(() => {
      void refresh().catch(() => {});
    }, 4000);
    return () => {
      alive = false;
      clearInterval(tick);
      void leaveRoom({ data: { id } }).catch(() => {});
    };
  }, [id, navigate, refresh]);

  useEffect(() => {
    return p2p.onMessage((_from, data) => {
      const msg = data as { type?: string; payload?: ChatMessage };
      if (msg?.type === "chat" && msg.payload) {
        setMessages((prev) => (prev.some((m) => m.id === msg.payload!.id) ? prev : [...prev, msg.payload!]));
        if (msg.payload.kind === "gift" && msg.payload.emoji) {
          setFly(msg.payload.emoji);
          setTimeout(() => setFly(null), 900);
        }
      }
      if (msg?.type === "refresh") void refresh().catch(() => {});
    });
  }, [p2p, refresh]);

  useEffect(() => {
    if (chatBox.current) chatBox.current.scrollTop = chatBox.current.scrollHeight;
  }, [messages]);

  const speakingMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (micOn && voice.speaking) map[userId] = true;
    return map;
  }, [micOn, voice.speaking, userId]);

  async function onSeat(seat: number) {
    try {
      const r = await takeSeat({ data: { id, seat } });
      setRoom(r);
      p2p.send({ type: "refresh" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Seat taken");
    }
  }

  async function onMic() {
    const next = !micOn;
    if (next && !voice.canPublish) {
      setErr(t("takeSeat"));
      return;
    }
    if (next && voice.error && voice.error.toLowerCase().includes("microphone")) {
      setErr(t("needMic"));
      return;
    }
    setMicOn(next);
    await voice.setMuted(!next);
    await persistMuted({ data: { id, muted: !next } }).catch(() => {});
  }

  async function onSendChat() {
    const body = chat.trim();
    if (!body) return;
    setChat("");
    const msg = await sendMessage({ data: { id, body } });
    setMessages((prev) => [...prev, msg]);
    p2p.send({ type: "chat", payload: msg });
  }

  async function onGift(giftId: string) {
    if (!target) {
      setErr(t("pickSomeone"));
      return;
    }
    try {
      const res = await sendGift({ data: { id, giftId, toUser: target } });
      setProfile((p) => (p ? { ...p, coins: res.coins } : p));
      setMessages((prev) => [...prev, res.message]);
      p2p.send({ type: "chat", payload: res.message });
      setFly(res.message.emoji || giftById(giftId)?.emoji || "🎁");
      setTimeout(() => setFly(null), 900);
      setGiftsOpen(false);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("needCoins"));
    }
  }

  async function onKick(uid: string) {
    const r = await kickMember({ data: { id, userId: uid } });
    setRoom(r);
    p2p.send({ type: "refresh" });
    if (target === uid) setTarget(null);
  }

  if (!room) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <p className="text-sm text-muted">{t("loading")}</p>
      </main>
    );
  }

  const seats = Array.from({ length: 8 }, (_, i) => room.members.find((m) => m.seat === i) || null);
  const targetName = room.members.find((m) => m.userId === target)?.displayName || "";
  const isHost = room.hostId === userId;
  const voiceLabel = voice.ready
    ? t("voiceReady")
    : voice.error
      ? voice.error.includes("Agora")
        ? t("connecting")
        : t("needMic")
      : t("connecting");

  return (
    <main className="flex min-h-dvh flex-col">
      {fly ? (
        <div className="gift-fly pointer-events-none fixed left-1/2 top-[20%] z-50 text-6xl">{fly}</div>
      ) : null}
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div>
          <div className="font-display text-[1.15rem] font-semibold">{room.title}</div>
          <div className="text-xs text-muted">
            {room.topic} · {room.members.length} {t("listeners")} · {voiceLabel}
          </div>
        </div>
        <button
          type="button"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-elevated"
          onClick={() => navigate({ to: "/" })}
          aria-label={t("leave")}
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 px-4 py-5">
        {seats.map((p, i) => {
          if (!p) {
            return (
              <button
                key={i}
                type="button"
                className="flex flex-col items-center gap-1 text-[10px] text-muted"
                onClick={() => onSeat(i)}
              >
                <span className="grid h-12 w-12 place-items-center rounded-full border border-dashed border-border text-[10px]">
                  {t("emptySeat")}
                </span>
                <span>{t("takeSeat")}</span>
              </button>
            );
          }
          const live =
            p.userId === userId ? micOn && voice.speaking : voice.isRemoteSpeaking(p.userId) || speakingMap[p.userId] || !p.muted;
          return (
            <button
              key={p.userId}
              type="button"
              className="flex flex-col items-center gap-1 text-[10px] text-muted"
              onClick={() => setTarget(p.userId === userId ? null : p.userId)}
            >
              <Avatar name={p.displayName} hue={p.avatarHue} live={Boolean(live)} />
              <span className="max-w-full truncate">{p.displayName}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4">
        <div ref={chatBox} className="max-h-[220px] overflow-y-auto rounded-lg border border-border bg-surface/85 p-3">
          {!messages.length ? <p className="text-xs text-muted">{t("emptyChat")}</p> : null}
          {messages.map((m) => (
            <p key={m.id} className="mb-1.5 text-[13px]">
              <strong className="text-gold">{m.displayName}</strong>{" "}
              {m.kind === "gift" ? (
                <span className="text-primary">
                  {t("giftSent")} {m.emoji || giftById(m.giftId || "")?.emoji || "🎁"}
                </span>
              ) : (
                m.body
              )}
            </p>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-surface px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2.5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className={cn(
              "grid size-12 shrink-0 place-items-center rounded-full",
              micOn ? "bg-primary" : "bg-elevated",
            )}
            onClick={onMic}
            aria-label={micOn ? t("micOn") : t("micOff")}
          >
            {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </button>
          <Field
            value={chat}
            onChange={(e) => setChat(e.target.value)}
            placeholder={t("chat")}
            className="rounded-pill"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void onSendChat();
              }
            }}
          />
          <button
            type="button"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-elevated"
            onClick={() => void onSendChat()}
            aria-label="Send"
          >
            <Send className="size-4" />
          </button>
          <button
            type="button"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-gold text-bg"
            onClick={() => setGiftsOpen(true)}
            aria-label={t("gifts")}
          >
            <Gift className="size-5" />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted">
          {profile?.coins ?? 0} {t("coins")}
          {target ? ` · → ${targetName}` : ""}
        </p>
        {err ? <p className="mt-1 text-center text-xs text-danger">{err}</p> : null}
        {isHost && target ? (
          <div className="mt-2 flex justify-center gap-2">
            <button
              type="button"
              className="min-h-10 rounded-lg border border-border bg-elevated px-3 text-xs font-semibold"
              onClick={() => void onKick(target)}
            >
              {t("kick")} {targetName}
            </button>
            <button
              type="button"
              className="min-h-10 rounded-lg border border-border bg-elevated px-3 text-xs font-semibold"
              onClick={() => void toggleFollow({ data: { userId: target } })}
            >
              {t("follow")}
            </button>
          </div>
        ) : null}
      </div>

      {giftsOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-bg/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[448px] rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">{t("gifts")}</h2>
              <button
                type="button"
                className="grid size-12 place-items-center rounded-full bg-elevated"
                onClick={() => setGiftsOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>
            {!target ? <p className="mt-2 text-sm text-muted">{t("pickSomeone")}</p> : null}
            <div className="mt-3 grid grid-cols-4 gap-2">
              {GIFTS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  disabled={!target}
                  className="rounded-lg border border-border bg-elevated px-1 py-2 text-center"
                  onClick={() => void onGift(g.id)}
                >
                  <div className="text-[22px] leading-none">{g.emoji}</div>
                  <div className="mt-1 text-[10px]">{lang === "bn" ? g.nameBn : g.nameEn}</div>
                  <div className="text-[10px] text-gold">{g.cost}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
