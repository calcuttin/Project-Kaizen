import { useUI } from '@/app/uiStore';
import { resolveExperience, type Experience } from '@/core/experience';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { type DeploymentMode } from '@/core/config';
import { getDeviceId } from '@/core/device';

export type AuthUser = { id: string; email: string | null; name: string | null; imageUrl?: string };

export type AuthContextValue = {
  mode: DeploymentMode;
  ready: boolean;
  user: AuthUser | null;
  localProfileId: string;
  error: string | null;
  experience: Experience;
  setExperience(experience: Experience): Promise<void>;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthContextProvider({ value, children }: { value: AuthContextValue; children: ReactNode }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function DeviceAuthProvider({ children }: { children: ReactNode }) {
  const localProfileId = useMemo(getDeviceId, []);
  const experience = resolveExperience(useUI((state) => state.experience));
  const value = useMemo<AuthContextValue>(() => ({
    experience, setExperience: async (next) => { useUI.getState().setExperience(next); },
    mode: 'device', ready: true, user: null, localProfileId, error: null, signOut: async () => {},
  }), [localProfileId, experience]);
  return <AuthContextProvider value={value}>{children}</AuthContextProvider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
