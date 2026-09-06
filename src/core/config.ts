export type DeploymentMode = 'device' | 'cloud';

type PublicConfig = {
  mode: DeploymentMode;
  appUrl: string;
  clerkPublishableKey?: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  enableBundledImports: boolean;
};

const requestedMode = import.meta.env.VITE_KAIZEN_MODE?.toLowerCase();
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const config: PublicConfig = {
  mode: requestedMode === 'cloud' ? 'cloud' : 'device',
  appUrl: import.meta.env.VITE_APP_URL?.trim() || window.location.origin,
  clerkPublishableKey: clerkPublishableKey || undefined,
  supabaseUrl: supabaseUrl || undefined,
  supabasePublishableKey: supabasePublishableKey || undefined,
  enableBundledImports: import.meta.env.DEV && requestedMode !== 'cloud' && import.meta.env.VITE_ENABLE_BUNDLED_IMPORTS === 'true',
};

export function cloudConfigurationError(): string | null {
  if (config.mode !== 'cloud') return null;
  if (!config.clerkPublishableKey || !config.supabaseUrl || !config.supabasePublishableKey) return 'Cloud mode requires VITE_CLERK_PUBLISHABLE_KEY, VITE_SUPABASE_URL, and VITE_SUPABASE_PUBLISHABLE_KEY.';
  return null;
}
