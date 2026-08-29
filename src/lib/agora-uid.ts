/**
 * Deterministically turn a userId (our Mongo `_id`, a UUID string) into a
 * stable positive 32-bit integer — Agora's classic RTC APIs (both the token
 * builder on the server and the client SDK in the browser) want a numeric
 * uid, not an arbitrary string. Shared between `@/lib/agora` (server) and
 * `room-view.tsx` (browser) so both sides compute the SAME number for the
 * same user — that's what lets the client map an incoming Agora uid back to
 * "whose seat is this" without a server round-trip.
 */
export function numericUid(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return hash || 1; // 0 is reserved by Agora ("let the server assign one")
}
