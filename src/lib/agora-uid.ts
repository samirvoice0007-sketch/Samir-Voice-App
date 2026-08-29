/** Stable positive 32-bit uid for Agora from our string user id. */
export function numericUid(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}
