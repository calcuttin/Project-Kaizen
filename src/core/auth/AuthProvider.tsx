import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth as useClerkAuth, useSession, useUser } from '@clerk/react';
import { cloudConfigurationError, config, type DeploymentMode } from '@/core/config';
import { getDeviceId } from '@/core/device';
import { setSupabaseAccessTokenProvider } from '@/core/supabase';

export type AuthUser = { id: string; email: string | null; name: string | null; imageUrl?: string };

type AuthContextValue = {
  mode: DeploymentMode;
  ready: boolean;
  user: AuthUser | null;
  localProfileId: string;
  error: string | null;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function Provider({ value, children }: { value: AuthContextValue; children: ReactNode }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function DeviceAuthProvider({ children }: { children: ReactNode }) {
  const localProfileId = useMemo(getDeviceId, []);
  const value = useMemo<AuthContextValue>(() => ({
    mode: 'device', ready: true, user: null, localProfileId, error: null, signOut: async () => {},
  }), [localProfileId]);
  return <Provider value={value}>{children}</Provider>;
}

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

  return <Provider value={value}>{children}</Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
