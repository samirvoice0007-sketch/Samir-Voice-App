import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Gift, Mic, MicOff, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AvatarOrb } from "@/components/avatar-orb";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { GIFTS, giftById } from "@/lib/gifts";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/lang-store";
import {
  getMyProfile,
  getRoom,
  joinRoom,
  leaveRoom,
  listMessages,
  sendGift,
  sendMessage,
  setMuted,
  takeSeat,
} from "@/lib/party";
import { cn } from "@/lib/utils";

export function RoomView({ roomId }: { roomId: string }) {
  const lang = useLang((s) => s.lang);
  const nav = useNavigate();
  const user = useCurrentUser();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [giftOpen, setGiftOpen] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [fly, setFly] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const roomQ = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => getRoom({ data: { roomId } }),
    refetchInterval: 2500,
  });
  const chatQ = useQuery({
    queryKey: ["chat", roomId],
    queryFn: () => listMessages({ data: { roomId } }),
    refetchInterval: 2000,
  });
  const meQ = useQuery({ queryKey: ["me"], queryFn: () => getMyProfile() });

  useEffect(() => {
    void joinRoom({ data: { roomId } }).then(() => qc.invalidateQueries({ queryKey: ["room", roomId] }));
    return () => {
      void leaveRoom({ data: { roomId } });
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, [roomId, qc]);

  const seats = useMemo(() => {
    const members = roomQ.data?.members ?? [];
    return Array.from({ length: 8 }, (_, i) => members.find((m) => m.seat === i) ?? null);
  }, [roomQ.data]);

  async function toggleMic() {
    if (micOn) {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
      setMicOn(false);
      setSpeaking(false);
      await setMuted({ data: { roomId, muted: true } });
      void qc.invalidateQueries({ queryKey: ["room", roomId] });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicOn(true);
      await setMuted({ data: { roomId, muted: false } });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setSpeaking(avg > 18);
        if (streamRef.current) requestAnimationFrame(loop);
      };
      loop();
      void qc.invalidateQueries({ queryKey: ["room", roomId] });
    } catch {
      setMicOn(false);
    }
  }

  const sendChat = useMutation({
    mutationFn: () => sendMessage({ data: { roomId, body: text.trim() } }),
    onSuccess: () => {
      setText("");
      void qc.invalidateQueries({ queryKey: ["chat", roomId] });
    },
  });

  const giftMut = useMutation({
    mutationFn: (giftId: string) => sendGift({ data: { roomId, toUser: target!, giftId } }),
    onSuccess: (res) => {
      setFly(res.gift.emoji);
      setTimeout(() => setFly(null), 900);
      setGiftOpen(false);
      void qc.invalidateQueries({ queryKey: ["chat", roomId] });
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  async function onLeave() {
    await leaveRoom({ data: { roomId } });
    await nav({ to: "/" });
  }

  if (!roomQ.data) {
    return <div className="grid min-h-dvh place-items-center bg-bg text-muted">{t(lang, "loading")}</div>;
  }

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col bg-bg">
      {fly ? (
        <div className="gift-fly pointer-events-none absolute inset-x-0 top-24 z-20 text-center text-6xl">{fly}</div>
      ) : null}

      <header className="flex items-center justify-between px-4 pt-4">
        <div>
          <p className="font-display text-lg leading-tight">{roomQ.data.title}</p>
          <p className="text-xs text-muted">
            {roomQ.data.topic} · {roomQ.data.members.length} {t(lang, "listeners")}
          </p>
        </div>
        <button type="button" onClick={onLeave} className="grid h-11 w-11 place-items-center rounded-full bg-elevated">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="grid grid-cols-4 gap-3 px-4 pt-6">
        {seats.map((person, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              if (person) setTarget(person.userId);
              else void takeSeat({ data: { roomId, seat: i } }).then(() => qc.invalidateQueries({ queryKey: ["room", roomId] }));
            }}
            className="flex flex-col items-center gap-1"
          >
            {person ? (
              <AvatarOrb
                name={person.displayName}
                hue={person.avatarHue}
                live={person.userId === user?.id ? speaking && micOn : !person.muted}
              />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-full border border-dashed border-border text-[10px] text-muted">
                {t(lang, "emptySeat")}
              </div>
            )}
            <span className="max-w-16 truncate text-[10px] text-muted">
              {person ? person.displayName : t(lang, "takeSeat")}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex-1 overflow-y-auto px-4 pb-2">
        <div className="space-y-2 rounded-2xl border border-border bg-surface/80 p-3">
          {(chatQ.data ?? []).length === 0 ? <p className="text-xs text-muted">{t(lang, "emptyChat")}</p> : null}
          {(chatQ.data ?? []).map((m) => (
            <p key={m.id} className="text-sm">
              <span className="font-semibold text-gold">{m.displayName}</span>{" "}
              {m.kind === "gift" ? (
                <span className="text-primary">
                  {t(lang, "giftSent")} {giftById(m.giftId ?? "")?.emoji}
                </span>
              ) : (
                <span className="text-fg">{m.body}</span>
              )}
            </p>
          ))}
        </div>
      </div>

      <div className="border-t border-border bg-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMic}
            className={cn("grid h-12 w-12 place-items-center rounded-full", micOn ? "bg-primary" : "bg-elevated text-muted")}
            aria-label={micOn ? t(lang, "micOn") : t(lang, "micOff")}
          >
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <form
            className="flex min-h-12 flex-1 items-center gap-2 rounded-full border border-border bg-elevated px-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) sendChat.mutate();
            }}
          >
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              placeholder={t(lang, "chat")}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" className="grid h-9 w-9 place-items-center text-gold">
              <Send className="h-4 w-4" />
            </button>
          </form>
          <button
            type="button"
            onClick={() => setGiftOpen(true)}
            className="grid h-12 w-12 place-items-center rounded-full bg-gold text-bg"
          >
            <Gift className="h-5 w-5" />
          </button>
        </div>
        <p className="text-center text-[11px] text-muted">
          {meQ.data?.coins ?? 0} {t(lang, "coins")}
          {target ? ` · → ${roomQ.data.members.find((m) => m.userId === target)?.displayName ?? ""}` : ""}
        </p>
      </div>

      {giftOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-end bg-bg/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg">{t(lang, "gifts")}</h3>
              <button type="button" onClick={() => setGiftOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {!target ? <p className="mt-2 text-sm text-muted">{t(lang, "pickSomeone")}</p> : null}
            <div className="mt-3 grid grid-cols-4 gap-2">
              {GIFTS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  disabled={!target || giftMut.isPending}
                  onClick={() => giftMut.mutate(g.id)}
                  className="rounded-2xl border border-border bg-elevated p-2 text-center disabled:opacity-40"
                >
                  <div className="text-2xl">{g.emoji}</div>
                  <p className="mt-1 text-[10px]">{lang === "bn" ? g.nameBn : g.nameEn}</p>
                  <p className="text-[10px] text-gold">{g.cost}</p>
                </button>
              ))}
            </div>
            {giftMut.isError ? (
              <p className="mt-2 text-sm text-primary">
                {giftMut.error instanceof Error ? giftMut.error.message : t(lang, "needCoins")}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
