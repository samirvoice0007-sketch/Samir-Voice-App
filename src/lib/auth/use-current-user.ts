import { useSession } from "./client";
import type { SessionUser } from "./client";

export type AppUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
};

export type CurrentUserState = {
  user: AppUser | null;
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

export function useCurrentUserState(): CurrentUserState {
  const { user, isPending } = useSession();
  return { user: toAppUser(user), isPending };
}

export function useCurrentUser(): AppUser | null {
  return useCurrentUserState().user;
}
