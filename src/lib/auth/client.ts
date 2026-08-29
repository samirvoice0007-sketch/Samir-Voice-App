import { create } from "zustand";
import { sendPhoneOtp, signInWithGooglePopup, type ConfirmationResult } from "@/lib/firebase-client";
import {
  AuthError,
  getCurrentUser,
  signIn as signInFn,
  signInWithFirebase,
  signOut as signOutFn,
  signUp as signUpFn,
  type SessionUser,
} from "./server";

export { AuthError };
export type { SessionUser };

/** Always true — this app requires sign-in; there is no "auth disabled" dev mode anymore (that only existed for the Grok sandbox template). */
export const authEnabled = true;

type SessionState = {
  user: SessionUser | null;
  isPending: boolean;
};

/**
 * Shared client-side session store (zustand — same pattern as `lang-store`).
 * `client.ts` owns writes to it; everything else reads it via `useSession()`
 * (or, preferably, `useCurrentUserState()` in `./use-current-user`).
 */
const useSessionStore = create<SessionState>(() => ({
  user: null,
  isPending: true,
}));

function setUser(user: SessionUser | null): void {
  useSessionStore.setState({ user, isPending: false });
}

/** Re-fetch the session from the server and update the shared store. Called once on page load, and again after sign-in/up/out. */
async function refreshSession(): Promise<void> {
  try {
    setUser(await getCurrentUser());
  } catch {
    setUser(null);
  }
}

// Kick off the initial session check once, in the browser only. This module
// also loads during SSR (it's imported by dual client/server components),
// but there's no point fetching there — the SSR render just shows the
// pending state briefly, then the browser resolves the real session.
if (typeof window !== "undefined") {
  void refreshSession();
}

/** Hook: current session user + loading state. Prefer `useCurrentUserState()` in `./use-current-user`, which normalizes the shape for the rest of the app. */
export function useSession(): SessionState {
  return useSessionStore();
}

/** Create an account, then sign in (the server sets the session cookie). */
export async function signUp(input: { email: string; password: string; name?: string }): Promise<SessionUser> {
  const user = await signUpFn({ data: input });
  setUser(user);
  return user;
}

/** Verify credentials and sign in (the server sets the session cookie). */
export async function signIn(input: { email: string; password: string }): Promise<SessionUser> {
  const user = await signInFn({ data: input });
  setUser(user);
  return user;
}

/** Clear the session (the server clears the cookie). */
export async function signOut(): Promise<void> {
  await signOutFn();
  setUser(null);
}

/** Open the Google popup, then exchange the resulting Firebase token for our own session cookie. */
export async function signInWithGoogle(): Promise<SessionUser> {
  const idToken = await signInWithGooglePopup();
  const user = await signInWithFirebase({ data: { idToken } });
  setUser(user);
  return user;
}

/**
 * Send an OTP SMS to `phoneNumber` (E.164 format, e.g. "+8801XXXXXXXXX").
 * `recaptchaContainerId` must be a `<div>` already mounted in the DOM (see
 * the invisible container in `login.tsx`). Pass the returned value plus the
 * code the user types to `confirmPhoneOtp`.
 */
export function requestPhoneOtp(phoneNumber: string, recaptchaContainerId: string): Promise<ConfirmationResult> {
  return sendPhoneOtp(phoneNumber, recaptchaContainerId);
}

/** Verify the OTP code, then exchange the resulting Firebase token for our own session cookie. */
export async function confirmPhoneOtp(confirmation: ConfirmationResult, code: string): Promise<SessionUser> {
  const credential = await confirmation.confirm(code);
  const idToken = await credential.user.getIdToken();
  const user = await signInWithFirebase({ data: { idToken } });
  setUser(user);
  return user;
}
