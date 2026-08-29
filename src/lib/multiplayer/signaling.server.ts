/**
 * In-process WebRTC signaling for chat P2P. Ephemeral — a single Render
 * instance is enough. Voice audio uses Agora, not this relay.
 */
import { z } from "zod";
import type { PeerRow, RtcPollResponse, SignalRow } from "./p2p";

const ID = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const signalSchema = z.object({
  op: z.literal("signal"),
  room: ID,
  from: ID,
  to: ID,
  kind: z.enum(["offer", "answer", "ice"]),
  payload: z.unknown().refine((v) => v !== undefined && JSON.stringify(v).length <= 32_768, {
    message: "payload too large",
  }),
});
const leaveSchema = z.object({ op: z.literal("leave"), room: ID, peer: ID });
const postSchema = z.discriminatedUnion("op", [signalSchema, leaveSchema]);

const PEER_TTL_MS = 30_000;
const SIGNAL_TTL_MS = 60_000;

type Peer = { id: string; name: string; lastSeen: number };
type Signal = { id: number; room: string; to: string; from: string; kind: SignalRow["kind"]; payload: unknown; createdAt: number };

const globalRef = globalThis as typeof globalThis & {
  __rtcState__?: { peers: Map<string, Peer>; signals: Signal[]; nextId: number };
};

function state() {
  globalRef.__rtcState__ ??= { peers: new Map(), signals: [], nextId: 1 };
  return globalRef.__rtcState__;
}

function peerKey(room: string, peer: string) {
  return `${room}::${peer}`;
}

function prune(now = Date.now()) {
  const s = state();
  for (const [k, p] of s.peers) {
    if (now - p.lastSeen > PEER_TTL_MS) s.peers.delete(k);
  }
  s.signals = s.signals.filter((sig) => now - sig.createdAt <= SIGNAL_TTL_MS);
}

function roster(room: string): PeerRow[] {
  const now = Date.now();
  const out: PeerRow[] = [];
  for (const [k, p] of state().peers) {
    if (!k.startsWith(`${room}::`)) continue;
    if (now - p.lastSeen > PEER_TTL_MS) continue;
    out.push({ id: p.id, name: p.name });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id)).slice(0, 32);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function handleGet(url: URL): Promise<Response> {
  const parsed = z
    .object({
      room: ID,
      peer: ID,
      name: z.string().max(64).default(""),
      since: z.coerce.number().int().min(0).default(0),
    })
    .safeParse({
      room: url.searchParams.get("room"),
      peer: url.searchParams.get("peer"),
      name: url.searchParams.get("name") ?? "",
      since: url.searchParams.get("since") ?? 0,
    });
  if (!parsed.success) return json({ error: "invalid query" }, 400);
  const { room, peer, name, since } = parsed.data;
  const s = state();
  prune();
  s.peers.set(peerKey(room, peer), { id: peer, name, lastSeen: Date.now() });
  const rows = s.signals.filter((sig) => sig.room === room && sig.to === peer && sig.id > since).slice(0, 200);
  const body: RtcPollResponse = {
    peers: roster(room),
    signals: rows.map((r) => ({ id: r.id, from: r.from, kind: r.kind, payload: r.payload })),
  };
  return json(body);
}

async function handlePost(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid request" }, 400);
  const msg = parsed.data;
  const s = state();
  prune();
  if (msg.op === "signal") {
    s.signals.push({
      id: s.nextId++,
      room: msg.room,
      to: msg.to,
      from: msg.from,
      kind: msg.kind,
      payload: msg.payload,
      createdAt: Date.now(),
    });
  } else {
    s.peers.delete(peerKey(msg.room, msg.peer));
  }
  return json({ ok: true });
}

export async function handleSignaling(request: Request): Promise<Response> {
  try {
    if (request.method === "GET") return await handleGet(new URL(request.url));
    if (request.method === "POST") return await handlePost(request);
    return json({ error: "method not allowed" }, 405);
  } catch (error) {
    console.error("[rtc] signaling error:", error);
    return json({ error: "signaling failed" }, 500);
  }
}
