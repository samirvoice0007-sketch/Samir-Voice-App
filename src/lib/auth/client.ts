import { create } from "zustand";
import {
  AuthError,
  getCurrentUser,
  getPublicAuthConfig,
  signIn as signInFn,
  signInWithFirebase,
  signOut as signOutFn,
  signUp as signUpFn,
  type SessionUser,
} from "./server";

export { AuthError };
export type { SessionUser };

export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

type SessionState = {
  user: SessionUser | null;
  isPending: boolean;
};

const useSessionStore = create<SessionState>(() => ({
  user: null,
  isPending: true,
}));

const BEARER_KEY = "gfbf.session-token";

export function getBearerToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(BEARER_KEY);
  } catch {
    return null;
  }
}

function setBearerToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.sessionStorage.setItem(BEARER_KEY, token);
    else window.sessionStorage.removeItem(BEARER_KEY);
  } catch {
    /* ignore */
  }
}

function setUser(user: SessionUser | null): void {
  if (user?.token) setBearerToken(user.token);
  useSessionStore.setState({ user, isPending: false });
}

async function refreshSession(): Promise<void> {
  try {
    setUser(await getCurrentUser({ data: { bearerToken: getBearerToken() ?? undefined } }));
  } catch {
    setUser(null);
  }
}

async function initSession(): Promise<void> {
  try {
    const { consumeGoogleRedirectResult } = await import("@/lib/firebase-client");
    const idToken = await consumeGoogleRedirectResult();
    if (idToken) {
      const user = await signInWithFirebase({ data: { idToken } });
      setUser(user);
      return;
    }
  } catch {
    /* fall through */
  }
  await refreshSession();
}

if (typeof window !== "undefined") {
  void initSession();
}

export function useSession(): SessionState {
  return useSessionStore();
}

export async function signUp(input: { email: string; password: string; name?: string }): Promise<SessionUser> {
  const user = await signUpFn({ data: input });
  setUser(user);
  return user;
}

export async function signIn(input: { email: string; password: string }): Promise<SessionUser> {
  const user = await signInFn({ data: input });
  setUser(user);
  return user;
}

export async function signOut(): Promise<void> {
  await signOutFn();
  setBearerToken(null);
  setUser(null);
}

export async function signInWithGoogle(): Promise<void> {
  const { startGoogleSignIn } = await import("@/lib/firebase-client");
  const idToken = await startGoogleSignIn();
  if (idToken) {
    const user = await signInWithFirebase({ data: { idToken } });
    setUser(user);
  }
}

export async function requestPhoneOtp(phoneNumber: string, recaptchaContainerId: string) {
  const { sendPhoneOtp } = await import("@/lib/firebase-client");
  return sendPhoneOtp(phoneNumber, recaptchaContainerId);
}

export async function confirmPhoneOtp(
  confirmation: { confirm: (code: string) => Promise<{ user: { getIdToken: () => Promise<string> } }> },
  code: string,
): Promise<SessionUser> {
  const credential = await confirmation.confirm(code);
  const idToken = await credential.user.getIdToken();
  const user = await signInWithFirebase({ data: { idToken } });
  setUser(user);
  return user;
}

export { getPublicAuthConfig };
