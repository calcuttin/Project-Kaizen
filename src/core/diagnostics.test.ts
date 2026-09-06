import { expect, it, vi } from 'vitest';
vi.mock('./config', () => ({ config: { mode: 'cloud', supabaseUrl: 'private-url', clerkPublishableKey: 'private-key' } }));
vi.mock('./sync/engine', () => ({ useSyncStatus: { getState: () => ({ status: 'error', pending: 2, conflicts: 1, error: 'private task text and token', owner: 'private-account' }) } }));
import { supportReport } from './diagnostics';
it('reports useful status without copying raw errors, config or account details', () => {
  vi.stubGlobal('navigator', { onLine: true });
  const report = supportReport();
  expect(report).toMatchObject({ mode: 'cloud', saveState: 'error', pendingChanges: 2, conflicts: 1 });
  expect(JSON.stringify(report)).not.toContain('private');
  vi.unstubAllGlobals();
});
