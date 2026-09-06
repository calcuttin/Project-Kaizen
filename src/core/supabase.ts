import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cloudConfigurationError, config } from './config';
import type { Database } from './database.types';

let client: SupabaseClient<Database> | null = null;
let accessTokenProvider: () => Promise<string | null> = async () => null;
let sessionId: string | undefined;

export function setSupabaseAccessTokenProvider(nextSessionId?: string, provider?: () => Promise<string | null>) {
  if (sessionId !== nextSessionId) client = null;
  sessionId = nextSessionId;
  accessTokenProvider = provider ?? (async () => null);
}

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (config.mode !== 'cloud') return null;
  if (!sessionId) return null;
  const error = cloudConfigurationError();
  if (error) return null;
  const ownerSession = sessionId;
  const tokenProvider = accessTokenProvider;
  client ??= createClient(config.supabaseUrl!, config.supabasePublishableKey!, {
    accessToken: async () => {
      if (sessionId !== ownerSession) throw new Error('Session changed');
      const token = await tokenProvider();
      if (!token || sessionId !== ownerSession) throw new Error('Session changed');
      return token;
    },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
