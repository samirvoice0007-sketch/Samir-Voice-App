import { defaultIceServers } from "@/lib/multiplayer/p2p";
import type { RtcPollResponse, SignalKind } from "@/lib/multiplayer/p2p";

type Slot = {
  pc: RTCPeerConnection;
  audio?: HTMLAudioElement;
  makingOffer: boolean;
  ignoreOffer: boolean;
  pending: RTCIceCandidateInit[];
};

export class VoiceMesh {
  private readonly room: string;
  private readonly selfId: string;
  private readonly name: string;
  private stream: MediaStream | null = null;
  private readonly peers = new Map<string, Slot>();
  private cursor = 0;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private onRemoteCount?: (n: number) => void;

  constructor(opts: {
    room: string;
    selfId: string;
    name: string;
    stream: MediaStream;
    onRemoteCount?: (n: number) => void;
  }) {
    this.room = opts.room;
    this.selfId = opts.selfId;
    this.name = opts.name;
    this.stream = opts.stream;
    this.onRemoteCount = opts.onRemoteCount;
  }

  setMuted(muted: boolean) {
    this.stream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  async join() {
    try {
      await this.pollOnce();
    } catch {
      /* retry via loop */
    }
    if (this.closed) return;
    this.schedule(800);
  }

  close() {
    this.closed = true;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    for (const slot of this.peers.values()) {
      slot.audio?.pause();
      slot.audio?.remove();
      slot.pc.close();
    }
    this.peers.clear();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    void fetch("/api/rtc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "leave", room: this.room, peer: this.selfId }),
      keepalive: true,
    }).catch(() => {});
  }

  private schedule(ms: number) {
    if (this.closed) return;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => void this.poll(), ms);
  }

  private async poll() {
    if (this.closed) return;
    try {
      await this.pollOnce();
    } catch {
      /* ignore */
    }
    this.schedule(1000);
  }

  private async pollOnce() {
    const params = new URLSearchParams({
      room: this.room,
      peer: this.selfId,
      name: this.name,
      since: String(this.cursor),
    });
    const res = await fetch(`/api/rtc?${params}`);
    if (!res.ok || this.closed) return;
    const body = (await res.json()) as RtcPollResponse;
    this.reconcile(body.peers);
    const roster = new Set(body.peers.map((p) => p.id));
    for (const sig of body.signals) {
      this.cursor = Math.max(this.cursor, sig.id);
      await this.onSignal(sig.from, sig.kind, sig.payload, roster);
      if (this.closed) return;
    }
  }

  private reconcile(peers: { id: string; name: string }[]) {
    const alive = new Set(peers.map((p) => p.id));
    for (const p of peers) {
      if (p.id === this.selfId) continue;
      if (!this.peers.has(p.id)) this.connect(p.id, this.selfId > p.id);
    }
    for (const [id, slot] of this.peers) {
      if (!alive.has(id)) {
        slot.audio?.pause();
        slot.audio?.remove();
        slot.pc.close();
        this.peers.delete(id);
      }
    }
    this.onRemoteCount?.(this.peers.size);
  }

  private connect(peerId: string, initiator: boolean) {
    const pc = new RTCPeerConnection({ iceServers: defaultIceServers() });
    const slot: Slot = { pc, makingOffer: false, ignoreOffer: false, pending: [] };
    this.peers.set(peerId, slot);

    this.stream?.getAudioTracks().forEach((t) => pc.addTrack(t, this.stream!));

    pc.onicecandidate = (e) => {
      if (e.candidate) void this.signal(peerId, "ice", e.candidate.toJSON());
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      let audio = slot.audio;
      if (!audio) {
        audio = document.createElement("audio");
        audio.autoplay = true;
        audio.setAttribute("playsinline", "true");
        audio.style.display = "none";
        document.body.appendChild(audio);
        slot.audio = audio;
      }
      audio.srcObject = stream;
      void audio.play().catch(() => {});
    };
    pc.onnegotiationneeded = async () => {
      try {
        slot.makingOffer = true;
        await pc.setLocalDescription();
        if (pc.localDescription) {
          await this.signal(peerId, "offer", pc.localDescription.toJSON());
        }
      } catch {
        /* next cycle */
      } finally {
        slot.makingOffer = false;
      }
    };
    if (initiator) {
      // Kick negotiation if addTrack didn't (no local stream yet).
      void pc.setLocalDescription().then(() => {
        if (pc.localDescription) void this.signal(peerId, "offer", pc.localDescription.toJSON());
      }).catch(() => {});
    }
  }

  private async onSignal(from: string, kind: SignalKind, payload: unknown, roster: Set<string>) {
    if (this.closed) return;
    let slot = this.peers.get(from);
    if (!slot) {
      if (!roster.has(from)) return;
      this.connect(from, false);
      slot = this.peers.get(from);
      if (!slot) return;
    }
    const polite = this.selfId < from;
    try {
      if (kind === "offer" || kind === "answer") {
        const description = payload as RTCSessionDescriptionInit;
        const collision =
          kind === "offer" && (slot.makingOffer || slot.pc.signalingState !== "stable");
        slot.ignoreOffer = !polite && collision;
        if (slot.ignoreOffer) return;
        await slot.pc.setRemoteDescription(description);
        while (slot.pending.length) {
          const c = slot.pending.shift()!;
          try {
            await slot.pc.addIceCandidate(c);
          } catch {
            /* ignore */
          }
        }
        if (kind === "offer") {
          await slot.pc.setLocalDescription();
          if (slot.pc.localDescription) {
            await this.signal(from, "answer", slot.pc.localDescription.toJSON());
          }
        }
      } else if (kind === "ice") {
        const candidate = payload as RTCIceCandidateInit;
        if (!slot.pc.remoteDescription) {
          slot.pending.push(candidate);
          return;
        }
        try {
          await slot.pc.addIceCandidate(candidate);
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* next offer */
    }
  }

  private async signal(to: string, kind: SignalKind, payload: unknown) {
    await fetch("/api/rtc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        op: "signal",
        room: this.room,
        from: this.selfId,
        to,
        kind,
        payload,
      }),
    });
  }
}
