import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/react-start/server";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { getCollection } from "@/lib/db";

/**
 * Custom auth: Firebase Admin for Google/phone identity, JWT sessions,
 * SESSION_SECRET for cookie HMAC. Replaces Better-Auth.
 */

export const SESSION_COOKIE = "session";

const JWT_SECRET = process.env.JWT_SECRET?.trim();
const SESSION_SECRET = process.env.SESSION_SECRET?.trim();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN?.trim() || "30d";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export const authConfigured = Boolean(JWT_SECRET || SESSION_SECRET);

export type Role = "user" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  token?: string;
};

type UserDoc = {
  _id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  createdAt: Date;
  phone?: string | null;
  firebaseUid?: string;
};

export class AuthError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function jwtKey(): Uint8Array {
  const secret = JWT_SECRET || SESSION_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Add it on Render → Environment.");
  }
  return new TextEncoder().encode(secret);
}

function cookieHmacKey(): string {
  const secret = SESSION_SECRET || JWT_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set. Add it on Render → Environment.");
  }
  return secret;
}

function expiresInToSeconds(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)?$/.exec(value.trim());
  if (!match) return 30 * 24 * 60 * 60;
  const amount = Number(match[1]);
  const unit = (match[2] ?? "s") as "s" | "m" | "h" | "d";
  return amount * ({ s: 1, m: 60, h: 3600, d: 86400 } as const)[unit];
}

function signCookieValue(jwt: string): string {
  const mac = createHmac("sha256", cookieHmacKey()).update(jwt).digest("base64url");
  return `${jwt}.${mac}`;
}

function unsignCookieValue(value: string | undefined | null): string | null {
  if (!value) return null;
  const lastDot = value.lastIndexOf(".");
  if (lastDot <= 0) return null;
  const jwt = value.slice(0, lastDot);
  const mac = value.slice(lastDot + 1);
  const expected = createHmac("sha256", cookieHmacKey()).update(jwt).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return jwt;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

async function mintJwt(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(jwtKey());
}

async function issueSession(user: SessionUser): Promise<SessionUser> {
  const token = await mintJwt(user);
  setCookie(SESSION_COOKIE, signCookieValue(token), cookieOptions(expiresInToSeconds(JWT_EXPIRES_IN)));
  return { ...user, token };
}

function clearSessionCookie(): void {
  setCookie(SESSION_COOKIE, "", cookieOptions(0));
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  const jwt = token.includes(".") && token.split(".").length === 4 ? unsignCookieValue(token) : token;
  const raw = jwt ?? (token.split(".").length === 3 ? token : null);
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, jwtKey());
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

function usersCollection() {
  return getCollection<UserDoc>("users");
}

const emailPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

const signUpSchema = emailPasswordSchema.extend({
  name: z.string().trim().max(60).optional(),
});

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
    return issueSession({ id: doc._id, email: doc.email, name: doc.name, role: doc.role });
  });

export const signIn = createServerFn({ method: "POST" })
  .validator(emailPasswordSchema)
  .handler(async ({ data }): Promise<SessionUser> => {
    if (ADMIN_EMAIL && ADMIN_PASSWORD && data.email === ADMIN_EMAIL) {
      if (data.password !== ADMIN_PASSWORD) throw new AuthError("Invalid email or password.", 401);
      return issueSession({ id: "admin", email: ADMIN_EMAIL, name: "Admin", role: "admin" });
    }
    const col = await usersCollection();
    const found = await col.findOne({ email: data.email });
    if (!found) throw new AuthError("Invalid email or password.", 401);
    if (!found.passwordHash) {
      throw new AuthError("This account uses Google or phone sign-in — no password is set.", 401);
    }
    const ok = await bcrypt.compare(data.password, found.passwordHash);
    if (!ok) throw new AuthError("Invalid email or password.", 401);
    return issueSession({ id: found._id, email: found.email, name: found.name, role: found.role });
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  clearSessionCookie();
  return { ok: true as const };
});

export const getCurrentUser = createServerFn({ method: "GET" })
  .validator((d: { bearerToken?: string } | undefined) => d ?? {})
  .handler(async ({ data }): Promise<SessionUser | null> => {
    const { getSessionUser } = await import("./verify.server");
    return getSessionUser(data?.bearerToken);
  });

const firebaseSignInSchema = z.object({ idToken: z.string().min(10) });

export const signInWithFirebase = createServerFn({ method: "POST" })
  .validator(firebaseSignInSchema)
  .handler(async ({ data }): Promise<SessionUser> => {
    const { verifyFirebaseIdToken } = await import("@/lib/firebase-admin");
    const decoded = await verifyFirebaseIdToken(data.idToken);
    const email = decoded.email?.toLowerCase() || "";
    const col = await usersCollection();
    let found =
      (await col.findOne({ firebaseUid: decoded.uid })) ||
      (email ? await col.findOne({ email }) : null) ||
      (decoded.phoneNumber ? await col.findOne({ phone: decoded.phoneNumber }) : null);

    if (!found) {
      const doc: UserDoc = {
        _id: randomUUID(),
        email: email || `fb:${decoded.uid}@users.gfbf.app`,
        passwordHash: "",
        name: decoded.name?.trim() || (decoded.phoneNumber ? `User${decoded.phoneNumber.slice(-4)}` : "Star"),
        role: ADMIN_EMAIL && email === ADMIN_EMAIL ? "admin" : "user",
        createdAt: new Date(),
        phone: decoded.phoneNumber,
        firebaseUid: decoded.uid,
      };
      await col.insertOne(doc);
      found = doc;
    } else {
      const patch: Record<string, unknown> = {};
      if (found.firebaseUid !== decoded.uid) patch.firebaseUid = decoded.uid;
      if (decoded.phoneNumber && found.phone !== decoded.phoneNumber) patch.phone = decoded.phoneNumber;
      if (Object.keys(patch).length) await col.updateOne({ _id: found._id }, { $set: patch });
    }

    return issueSession({ id: found._id, email: found.email, name: found.name, role: found.role });
  });

export const getPublicAuthConfig = createServerFn({ method: "GET" }).handler(async () => {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "";
  const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "";
  const authDomain =
    process.env.FIREBASE_AUTH_DOMAIN ||
    process.env.VITE_FIREBASE_AUTH_DOMAIN ||
    (projectId ? `${projectId}.firebaseapp.com` : "");
  const appId = process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || "";
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.VITE_FIREBASE_STORAGE_BUCKET ||
    (projectId ? `${projectId}.appspot.com` : "");
  const messagingSenderId =
    process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "";
  const firebaseReady = Boolean(apiKey && projectId && appId);
  return {
    google: firebaseReady,
    phone: firebaseReady,
    agora: Boolean(process.env.AGORA_APP_ID && process.env.AGORA_APP_CERTIFICATE),
    firebase: firebaseReady
      ? { apiKey, authDomain, projectId, appId, storageBucket, messagingSenderId }
      : null,
  };
});
