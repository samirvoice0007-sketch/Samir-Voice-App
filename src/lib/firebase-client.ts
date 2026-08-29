import { getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  getAuth,
  getRedirectResult,
  signInWithPhoneNumber,
  signInWithRedirect,
  type ConfirmationResult,
} from "firebase/auth";

/**
 * Firebase Web (client SDK) — handles the actual Google popup and phone-OTP
 * SMS flow in the browser. This is a DIFFERENT credential set from
 * `@/lib/firebase-admin`'s service account: this is the public "Web app"
 * config from Firebase Console → Project Settings → General → Your apps,
 * safe to ship to the browser (it identifies the project; it does not
 * authorize anything by itself — Firebase's own rules + our server-side
 * token verification do that).
 *
 * Required (Vite exposes only `VITE_`-prefixed vars to the browser — set
 * these on Render → Environment same as the others):
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_APP_ID
 *   VITE_FIREBASE_MESSAGING_SENDER_ID
 *   VITE_FIREBASE_STORAGE_BUCKET
 * (project id is reused from the existing FIREBASE_PROJECT_ID... but that one
 * is server-only, so it's repeated here as VITE_FIREBASE_PROJECT_ID.)
 */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function firebaseApp() {
  return getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
}

function firebaseAuth() {
  return getAuth(firebaseApp());
}

/**
 * Navigate to Google's own sign-in page (redirect flow). This is used
 * instead of a popup because mobile browsers routinely block popups or
 * mishandle them — redirect works everywhere. The browser leaves this page;
 * there is nothing to await here.
 */
export async function startGoogleRedirect(): Promise<void> {
  const provider = new GoogleAuthProvider();
  await signInWithRedirect(firebaseAuth(), provider);
}

/**
 * Call once on every page load (see `@/lib/auth/client`). If the page was
 * just reached because Google sent the user back after `startGoogleRedirect`,
 * returns a Firebase ID token to exchange for our session. Otherwise
 * (normal page load) returns `null` — cheap and safe to call unconditionally.
 */
export async function consumeGoogleRedirectResult(): Promise<string | null> {
  const result = await getRedirectResult(firebaseAuth());
  return result ? result.user.getIdToken() : null;
}

let recaptchaVerifier: RecaptchaVerifier | null = null;

/** Lazily create the invisible reCAPTCHA Firebase's phone-auth flow requires. `containerId` must be an element already mounted in the DOM (e.g. a hidden `<div id="recaptcha-container" />`). */
function ensureRecaptcha(containerId: string): RecaptchaVerifier {
  recaptchaVerifier ??= new RecaptchaVerifier(firebaseAuth(), containerId, { size: "invisible" });
  return recaptchaVerifier;
}

/**
 * Send an OTP SMS to `phoneNumber` (E.164 format, e.g. "+8801XXXXXXXXX").
 * Returns a `ConfirmationResult` — pass it plus the code the user typed to
 * `confirmPhoneOtp` in `@/lib/auth/client`.
 */
export async function sendPhoneOtp(phoneNumber: string, containerId: string): Promise<ConfirmationResult> {
  const verifier = ensureRecaptcha(containerId);
  return signInWithPhoneNumber(firebaseAuth(), phoneNumber, verifier);
}

export type { ConfirmationResult };
