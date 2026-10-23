import { useMemo, type ReactNode } from 'react';
import { useAuth as useClerkAuth, useSession, useUser } from '@clerk/react';
import { cloudConfigurationError, config } from '@/core/config';
import { getDeviceId } from '@/core/device';
import { setSupabaseAccessTokenProvider } from '@/core/supabase';
import { AuthContextProvider, type AuthContextValue, type AuthUser } from './AuthProvider';

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, signOut } = useClerkAuth();
  const { session } = useSession();
  const { user: clerkUser } = useUser();
  const configurationError = cloudConfigurationError();
  const localProfileId = useMemo(getDeviceId, []);
  const authenticated = isLoaded && isSignedIn && session?.user.id === clerkUser?.id;
  setSupabaseAccessTokenProvider(authenticated ? session?.id : undefined, authenticated ? () => session!.getToken() : undefined);
  const user = useMemo(() => authenticated && clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
    name: clerkUser.fullName ?? clerkUser.username ?? null,
    imageUrl: clerkUser.imageUrl,
  } satisfies AuthUser : null, [authenticated, clerkUser]);

  const value = useMemo<AuthContextValue>(() => ({
    mode: 'cloud',
    ready: isLoaded,
    user,
    localProfileId,
    error: configurationError,
    async signOut() { await signOut({ redirectUrl: config.appUrl }); },
  }), [configurationError, isLoaded, localProfileId, signOut, user]);

  return <AuthContextProvider value={value}>{children}</AuthContextProvider>;
}

