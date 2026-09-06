import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ createClient: vi.fn((_url: string, _key: string, options: { accessToken: () => Promise<string | null> }) => ({ options })) }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('./config', () => ({ config: { mode: 'cloud', supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'test-public-key' }, cloudConfigurationError: () => null }));

afterEach(() => { vi.resetModules(); vi.clearAllMocks(); });

it('binds each client to its session and rejects tokens completed after an account switch', async () => {
  const { setSupabaseAccessTokenProvider, getSupabaseClient } = await import('./supabase');
  expect(getSupabaseClient()).toBeNull();
  let finishA!: (token: string) => void;
  setSupabaseAccessTokenProvider('session_a', () => new Promise((resolve) => { finishA = resolve; }));
  getSupabaseClient();
  const getTokenA = mocks.createClient.mock.calls[0][2].accessToken;
  const pending = getTokenA();
  setSupabaseAccessTokenProvider('session_b', async () => 'B token');
  finishA('A token');
  await expect(pending).rejects.toThrow('Session changed');
  await expect(getTokenA()).rejects.toThrow('Session changed');
  getSupabaseClient();
  await expect(mocks.createClient.mock.calls[1][2].accessToken()).resolves.toBe('B token');
  setSupabaseAccessTokenProvider();
  expect(getSupabaseClient()).toBeNull();
});
