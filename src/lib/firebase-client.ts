import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  getAuth,
  getRedirectResult,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithRedirect,
  type ConfirmationResult,
} from "firebase/auth";
import { getPublicAuthConfig } from "@/lib/auth/server";

let appPromise: Promise<FirebaseApp> | null = null;

async function firebaseApp(): Promise<FirebaseApp> {
  if (getApps().length) return getApps()[0]!;
  appPromise ??= (async () => {
    const cfg = await getPublicAuthConfig();
    if (!cfg.firebase) {
      throw new Error("Google / phone login is not configured yet.");
    }
    const options: FirebaseOptions = {
      apiKey: cfg.firebase.apiKey,
      authDomain: cfg.firebase.authDomain,
      projectId: cfg.firebase.projectId,
      storageBucket: cfg.firebase.storageBucket,
      messagingSenderId: cfg.firebase.messagingSenderId,
      appId: cfg.firebase.appId,
    };
    return initializeApp(options);
  })();
  return appPromise;
}

async function firebaseAuth() {
  return getAuth(await firebaseApp());
}

function inIframe(): boolean {
  try {
    return typeof window !== "undefined" && window.self !== window.top;
  } catch {
    return true;
  }
}

/** Popup inside iframes; redirect on a normal page. Returns an ID token when the flow finishes in-page. */
export async function startGoogleSignIn(): Promise<string | null> {
  const auth = await firebaseAuth();
  const provider = new GoogleAuthProvider();
  if (inIframe()) {
    const result = await signInWithPopup(auth, provider);
    return result.user.getIdToken();
  }
  await signInWithRedirect(auth, provider);
  return null;
}

export async function consumeGoogleRedirectResult(): Promise<string | null> {
  try {
    if (!getApps().length) {
      const cfg = await getPublicAuthConfig();
      if (!cfg.firebase) return null;
    }
    const auth = await firebaseAuth();
    const result = await getRedirectResult(auth);
    return result ? result.user.getIdToken() : null;
  } catch {
    return null;
  }
}

let recaptchaVerifier: RecaptchaVerifier | null = null;

async function ensureRecaptcha(containerId: string): Promise<RecaptchaVerifier> {
  if (recaptchaVerifier) return recaptchaVerifier;
  const auth = await firebaseAuth();
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  return recaptchaVerifier;
}

export async function sendPhoneOtp(phoneNumber: string, containerId: string): Promise<ConfirmationResult> {
  const auth = await firebaseAuth();
  const verifier = await ensureRecaptcha(containerId);
  return signInWithPhoneNumber(auth, phoneNumber, verifier);
}

export type { ConfirmationResult };
