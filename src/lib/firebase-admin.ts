import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

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
      "Firebase admin env vars are missing — set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
    );
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
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

export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseVerifiedToken> {
  const decoded = await getAuth(firebaseApp()).verifyIdToken(idToken);
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    phoneNumber: decoded.phone_number ?? null,
    name: typeof decoded.name === "string" ? decoded.name : null,
  };
}
