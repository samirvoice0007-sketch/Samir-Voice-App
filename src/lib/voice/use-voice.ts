import { useCallback, useEffect, useRef, useState } from "react";
import { VoiceMesh } from "./mesh";

export function useVoiceMesh(opts: {
  room: string;
  selfId: string;
  name: string;
  live: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [remoteCount, setRemoteCount] = useState(0);
  const [muted, setMutedState] = useState(true);
  const meshRef = useRef<VoiceMesh | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!opts.live) return;
    let cancelled = false;
    let ctx: AudioContext | null = null;
    let raf = 0;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
        const mesh = new VoiceMesh({
          room: opts.room,
          selfId: opts.selfId,
          name: opts.name,
          stream,
          onRemoteCount: setRemoteCount,
        });
        meshRef.current = mesh;
        await mesh.join();
        if (cancelled) {
          mesh.close();
          return;
        }
        setReady(true);
        ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyserRef.current = analyser;
        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          setSpeaking(rms > 0.04);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Microphone blocked");
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      analyserRef.current = null;
      ctx?.close().catch(() => {});
      meshRef.current?.close();
      meshRef.current = null;
      setReady(false);
      setSpeaking(false);
    };
  }, [opts.room, opts.selfId, opts.name, opts.live]);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
    meshRef.current?.setMuted(next);
  }, []);

  return { error, ready, remoteCount, muted, setMuted, speaking };
}
