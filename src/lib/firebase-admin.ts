import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Firebase Admin SDK (server-only) — verifies ID tokens minted by the
 * browser's Firebase client SDK (`@/lib/firebase-client`) after Google
 * sign-in or phone OTP. This app never talks to Firebase's REST API
 * directly; the client SDK handles the actual Google popup / SMS OTP flow,
 * and this file just checks that the resulting token is genuine before we
 * trust it (see `signInWithFirebase` in `@/lib/auth/server`).
 *
 * Required server env vars (Render → Environment):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY   (paste exactly as Firebase gives it — the
 *                           "\n"-escaped multi-line PEM key; this file
 *                           un-escapes it below)
 */

function credentialsConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

function firebaseApp() {
  const existing = getApps();
  if (existing.length) return existing[0]!;

  if (!credentialsConfigured()) {
    throw new Error(
      "Firebase admin env vars are missing — set FIREBASE_PROJECT_ID, " +
        "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (Render → Environment).",
    );
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Render (and most dashboards) store multi-line env vars with literal
      // "\n" characters instead of real newlines — restore them, or the PEM
      // key fails to parse.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export type FirebaseVerifiedToken = {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  name: string | null;
};

/** Verify a Firebase ID token from the browser (Google or phone sign-in). Throws if the token is missing, expired, or forged. */
export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseVerifiedToken> {
  const decoded = await getAuth(firebaseApp()).verifyIdToken(idToken);
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    phoneNumber: decoded.phone_number ?? null,
    name: typeof decoded.name === "string" ? decoded.name : null,
  };
}
