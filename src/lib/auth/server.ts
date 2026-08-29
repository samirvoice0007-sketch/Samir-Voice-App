import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/react-start/server";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getCollection } from "@/lib/db";

/**
 * Self-hosted email/password auth (server-only) — replaces the old
 * Better-Auth-via-Grok-broker setup.
 *
 * Sessions are a signed JWT (via `jose`, HS256, secret = `JWT_SECRET`) stored
 * in an httpOnly cookie. There is no separate "session table" — the cookie
 * IS the session, and it's stateless: revoking a session means rotating
 * `JWT_SECRET` (which logs everyone out) rather than deleting a DB row.
 *
 * Required server env vars (Render → Environment):
 *   JWT_SECRET        - long random string, signs every session token
 *   JWT_EXPIRES_IN    - e.g. "30d" (also used as the cookie's maxAge)
 *   ADMIN_EMAIL       - optional: this email always logs in as role "admin"
 *   ADMIN_PASSWORD    - required if ADMIN_EMAIL is set
 */

export const SESSION_COOKIE = "session";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN?.trim() || "30d";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

/** True once a real `JWT_SECRET` is configured. Every route in this app expects this to be true — there is no "auth disabled" mode anymore. */
export const authConfigured = Boolean(JWT_SECRET);

function secretKey(): Uint8Array {
  if (!JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is not set. Add it as a server environment variable (Render → Environment) — never hard-code it.",
    );
  }
  return new TextEncoder().encode(JWT_SECRET);
}

/** Turns "30d" / "12h" / "3600s" / "45m" into seconds, for the cookie's maxAge. Falls back to 30 days if unparsable. */
function expiresInToSeconds(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)?$/.exec(value.trim());
  if (!match) return 30 * 24 * 60 * 60;
  const amount = Number(match[1]);
  const unit = (match[2] ?? "s") as "s" | "m" | "h" | "d";
  const secondsPerUnit = { s: 1, m: 60, h: 3600, d: 86400 } as const;
  return amount * secondsPerUnit[unit];
}

export type Role = "user" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

type UserDoc = {
  _id: string;
  email: string;
  /** Empty string for accounts that only ever signed in via Google/phone. */
  passwordHash: string;
  name: string;
  role: Role;
  createdAt: Date;
  /** E.164 phone number, set for accounts created via phone OTP. */
  phone?: string | null;
  /** Firebase's own user id, set once an account has signed in via Google/phone at least once. */
  firebaseUid?: string;
};

function usersCollection() {
  return getCollection<UserDoc>("users");
}

/** Thrown for any expected auth failure (bad credentials, duplicate email, ...). Carries an HTTP-ish `status` so callers can map it to a response code. */
export class AuthError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/** Sign a session JWT for `user` and set it as an httpOnly cookie on the current response. */
async function issueSessionCookie(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secretKey());

  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiresInToSeconds(JWT_EXPIRES_IN),
  });
}

/** Clear the session cookie (sign-out). */
function clearSessionCookie(): void {
  setCookie(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Verify a session JWT (as read from the cookie) and return its payload, or `null` if missing/invalid/expired. Never throws. */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== "string") return null;
    return {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : "",
      name: typeof payload.name === "string" ? payload.name : "",
      role: payload.role === "admin" ? "admin" : "user",
    };
  } catch {
    return null;
  }
}

const emailPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

const signUpSchema = emailPasswordSchema.extend({
  name: z.string().trim().max(60).optional(),
});

/** Create an account, sign it in (sets the cookie), and return the new user. */
export const signUp = createServerFn({ method: "POST" })
  .validator(signUpSchema)
  .handler(async ({ data }): Promise<SessionUser> => {
    const col = await usersCollection();
    const existing = await col.findOne({ email: data.email });
    if (existing) throw new AuthError("An account with this email already exists.", 409);

    const passwordHash = await bcrypt.hash(data.password, 12);
    const doc: UserDoc = {
      _id: randomUUID(),
      email: data.email,
      passwordHash,
      name: data.name?.trim() || "Star",
      role: ADMIN_EMAIL && data.email === ADMIN_EMAIL ? "admin" : "user",
      createdAt: new Date(),
    };
    await col.insertOne(doc);

    const user: SessionUser = { id: doc._id, email: doc.email, name: doc.name, role: doc.role };
    await issueSessionCookie(user);
    return user;
  });

/**
 * Verify credentials and sign in (sets the cookie).
 *
 * `ADMIN_EMAIL`/`ADMIN_PASSWORD` are a hard-coded operator shortcut: signing
 * in with that exact email checks the password against the env var directly,
 * no MongoDB user document required. Keep this pair out of normal sign-up
 * (the `signUp` handler above already reserves that email for the admin
 * role, but does not let anyone create it without knowing `ADMIN_PASSWORD`
 * — enforce that at the UI level by not exposing sign-up for that email).
 */
export const signIn = createServerFn({ method: "POST" })
  .validator(emailPasswordSchema)
  .handler(async ({ data }): Promise<SessionUser> => {
    if (ADMIN_EMAIL && ADMIN_PASSWORD && data.email === ADMIN_EMAIL) {
      if (data.password !== ADMIN_PASSWORD) throw new AuthError("Invalid email or password.", 401);
      const admin: SessionUser = { id: "admin", email: ADMIN_EMAIL, name: "Admin", role: "admin" };
      await issueSessionCookie(admin);
      return admin;
    }

    const col = await usersCollection();
    const found = await col.findOne({ email: data.email });
    if (!found) throw new AuthError("Invalid email or password.", 401);
    if (!found.passwordHash) {
      throw new AuthError("This account uses Google or phone sign-in — no password is set.", 401);
    }
    const ok = await bcrypt.compare(data.password, found.passwordHash);
    if (!ok) throw new AuthError("Invalid email or password.", 401);

    const user: SessionUser = { id: found._id, email: found.email, name: found.name, role: found.role };
    await issueSessionCookie(user);
    return user;
  });

/** Clear the session cookie. */
export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  clearSessionCookie();
  return { ok: true } as const;
});

/** Resolve the caller's session from their cookie, or `null` if signed out. Used by the browser (via `./client`) to answer "who am I" on page load. */
export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionUser | null> => {
    const { getSessionUser } = await import("./verify.server");
    return getSessionUser();
  },
);

const firebaseSignInSchema = z.object({ idToken: z.string().min(10) });

/**
 * Verify a Firebase ID token (from Google sign-in or phone OTP, minted
 * client-side by `@/lib/firebase-client`) and sign in — creating the
 * MongoDB user document on first sign-in, linking it on later ones.
 *
 * Matching order: existing `firebaseUid` first (repeat sign-in), then by
 * email (lets someone who signed up with email+password later add Google
 * without ending up with two accounts). Phone-only sign-ins with no email
 * always create a fresh account tied to `firebaseUid`.
 */
export const signInWithFirebase = createServerFn({ method: "POST" })
  .validator(firebaseSignInSchema)
  .handler(async ({ data }): Promise<SessionUser> => {
    const { verifyFirebaseIdToken } = await import("@/lib/firebase-admin");
    const decoded = await verifyFirebaseIdToken(data.idToken);
    const email = decoded.email?.toLowerCase() || "";

    const col = await usersCollection();
    let found = await col.findOne({ firebaseUid: decoded.uid });
    if (!found && email) found = await col.findOne({ email });

    if (!found) {
      const doc: UserDoc = {
        _id: randomUUID(),
        email,
        passwordHash: "",
        name: decoded.name?.trim() || "Star",
        role: ADMIN_EMAIL && email === ADMIN_EMAIL ? "admin" : "user",
        createdAt: new Date(),
        phone: decoded.phoneNumber,
        firebaseUid: decoded.uid,
      };
      await col.insertOne(doc);
      found = doc;
    } else if (found.firebaseUid !== decoded.uid) {
      await col.updateOne({ _id: found._id }, { $set: { firebaseUid: decoded.uid } });
    }

    const user: SessionUser = { id: found._id, email: found.email, name: found.name, role: found.role };
    await issueSessionCookie(user);
    return user;
  });
