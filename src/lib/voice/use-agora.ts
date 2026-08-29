import type { IAgoraRTCClient, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAgoraToken } from "@/lib/agora";
import { numericUid } from "@/lib/agora-uid";

export function useAgoraVoice(opts: {
  roomId: string;
  selfId: string;
  role: "host" | "speaker" | "listener" | string;
  enabled: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [canPublish, setCanPublish] = useState(false);
  const [muted, setMutedState] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [remoteSpeaking, setRemoteSpeaking] = useState<Set<number>>(new Set());
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const micOnRef = useRef(false);

  useEffect(() => {
    if (!opts.enabled || !opts.roomId || !opts.selfId) return;
    let cancelled = false;

    async function connect() {
      try {
        const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
        const { appId, channel, uid, token, canPublish: publishAllowed } = await getAgoraToken({
          data: { roomId: opts.roomId },
        });
        if (cancelled) return;

        const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
        clientRef.current = client;
        await client.setClientRole(publishAllowed ? "host" : "audience");

        client.enableAudioVolumeIndicator();
        client.on("volume-indicator", (volumes) => {
          setRemoteSpeaking((prev) => {
            const next = new Set(prev);
            for (const v of volumes) {
              if (v.level > 15) next.add(v.uid as number);
              else next.delete(v.uid as number);
            }
            return next;
          });
        });
        client.on("user-published", async (remoteUser, mediaType) => {
          await client.subscribe(remoteUser, mediaType);
          if (mediaType === "audio") remoteUser.audioTrack?.play();
        });

        await client.join(appId, channel, token, uid);
        if (cancelled) {
          await client.leave();
          return;
        }
        setCanPublish(publishAllowed);
        setReady(true);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setReady(false);
          setCanPublish(false);
          setError(e instanceof Error ? e.message : "Voice unavailable");
        }
      }
    }

    void connect();
    return () => {
      cancelled = true;
      const client = clientRef.current;
      clientRef.current = null;
      localTrackRef.current?.close();
      localTrackRef.current = null;
      micOnRef.current = false;
      setMutedState(true);
      setSpeaking(false);
      setReady(false);
      void client?.leave();
    };
  }, [opts.roomId, opts.selfId, opts.role, opts.enabled]);

  const setMuted = useCallback(async (nextMuted: boolean) => {
    const client = clientRef.current;
    if (nextMuted) {
      const track = localTrackRef.current;
      if (client && track) await client.unpublish([track]).catch(() => {});
      track?.close();
      localTrackRef.current = null;
      micOnRef.current = false;
      setMutedState(true);
      setSpeaking(false);
      return;
    }
    if (!client || !canPublish) {
      setError("Take a seat to talk");
      return;
    }
    try {
      const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
      const track = await AgoraRTC.createMicrophoneAudioTrack();
      localTrackRef.current = track;
      await client.publish([track]);
      micOnRef.current = true;
      setMutedState(false);
      setError(null);
      const loop = () => {
        if (!localTrackRef.current) return;
        setSpeaking(localTrackRef.current.getVolumeLevel() > 0.15);
        requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      setMutedState(true);
      setError(e instanceof Error ? e.message : "Microphone blocked");
    }
  }, [canPublish]);

  const isRemoteSpeaking = useCallback(
    (userId: string) => remoteSpeaking.has(numericUid(userId)),
    [remoteSpeaking],
  );

  return { error, ready, canPublish, muted, setMuted, speaking, isRemoteSpeaking };
}
