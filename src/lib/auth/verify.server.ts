import { getCookie } from "@tanstack/react-start/server";
import { SESSION_COOKIE, authConfigured, verifySessionToken, type SessionUser } from "./server";

/**
 * Server-side session resolution (server-only).
 *
 * The session cookie is same-origin and sent with every request (server
 * functions and SSR loaders alike), so we just read + verify it — no bearer
 * token, no live-preview iframe handling, no sibling-site isolation check.
 * Those all existed only for the Grok sandbox; a normal single-origin
 * deployment (Render) doesn't need them.
 */

export { authConfigured };
export type VerifiedUser = SessionUser;

/** Thrown by `requireUserId` when the caller has no valid session. Carries `status: 401`; match `err.message === "Unauthorized"` client-side to send the visitor to sign-in. */
export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** Resolve the signed-in user from the current request's cookie, or `null` if nobody is signed in / the token is invalid or expired. Safe to call from server functions and SSR loaders. */
export async function getSessionUser(): Promise<VerifiedUser | null> {
  if (!authConfigured) return null;
  const token = getCookie(SESSION_COOKIE);
  return verifySessionToken(token);
}

/** Resolve the current user id for a server function, or throw `UnauthorizedError`. Prefer `authMiddleware` (`./middleware`), which calls this for you. */
export async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user.id;
}
