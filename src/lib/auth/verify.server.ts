import { getCookie } from "@tanstack/react-start/server";
import { SESSION_COOKIE, authConfigured, verifySessionToken, type SessionUser } from "./server";

export { authConfigured };
export type VerifiedUser = SessionUser;

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export async function getSessionUser(bearerToken?: string): Promise<VerifiedUser | null> {
  if (!authConfigured) return null;
  if (bearerToken) {
    const fromBearer = await verifySessionToken(bearerToken);
    if (fromBearer) return fromBearer;
  }
  const cookie = getCookie(SESSION_COOKIE);
  return verifySessionToken(cookie);
}

export async function requireUserId(bearerToken?: string): Promise<string> {
  const user = await getSessionUser(bearerToken);
  if (!user) throw new UnauthorizedError();
  return user.id;
}
