import { useSession } from "./client";
import type { SessionUser } from "./client";

/** Normalized user shape used across the app. */
export type AppUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
};

/** `useCurrentUserState()` result: the user plus the session-loading flag. */
export type CurrentUserState = {
  /** The user — `null` BOTH while the session loads and when signed out. */
  user: AppUser | null;
  /** True while the session is still resolving — don't treat `user: null` as signed out yet. */
  isPending: boolean;
};

function toAppUser(user: SessionUser | null): AppUser | null {
  if (!user) return null;
  return {
    id: user.id,
    displayName: user.name || null,
    primaryEmail: user.email || null,
    profileImageUrl: null,
  };
}

/**
 * Current user + loading state.
 *
 * Protect a route by waiting out `isPending` before acting on `user` —
 * redirecting on `user: null` alone bounces signed-in visitors to sign-in on
 * every hard reload:
 *
 *   import { RedirectToSignIn } from "@/lib/auth/gates";
 *   const { user, isPending } = useCurrentUserState();
 *   if (isPending) return null;              // still resolving — don't redirect yet
 *   if (!user) return <RedirectToSignIn />;  // definitely signed out
 */
export function useCurrentUserState(): CurrentUserState {
  const { user, isPending } = useSession();
  return { user: toAppUser(user), isPending };
}

/**
 * Convenience view of `useCurrentUserState().user` for display (e.g.
 * `user?.displayName ?? "Guest"`). NOTE: `null` means *loading OR signed
 * out* — for redirects/guards use `useCurrentUserState()` and check
 * `isPending`.
 */
export function useCurrentUser(): AppUser | null {
  return useCurrentUserState().user;
}
