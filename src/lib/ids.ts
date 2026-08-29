/** Signaling-safe id: letters, digits, underscore, hyphen; max 64. */
export function newId(prefix = "r"): string {
  const raw = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  return `${prefix}${raw}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
}

export function peerIdFromUser(userId: string): string {
  const cleaned = String(userId).replace(/[^a-zA-Z0-9_-]/g, "");
  return (cleaned || "peer").slice(0, 64);
}

export function signalRoom(kind: "c" | "v", roomId: string): string {
  return `${kind}_${String(roomId).replace(/[^a-zA-Z0-9_-]/g, "")}`.slice(0, 64);
}
