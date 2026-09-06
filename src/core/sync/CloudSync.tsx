import { useEffect } from 'react';
import { useAuth } from '@/core/auth/AuthProvider';
import { startCloudSync, useSyncStatus } from './engine';
import { registeredStores, whenHydrated } from '@/core/store';
import { setSyncScope } from './outbox';

export function CloudSync() {
  const { mode, user } = useAuth();
  const ownerId = user?.id;
  useEffect(() => {
    if (mode !== 'cloud' || !ownerId) return;
    setSyncScope(ownerId);
    let cancelled = false;
    let stop: (() => void) | undefined;
    void Promise.all([...registeredStores().values()].map((store) => whenHydrated(store))).then(() => { if (!cancelled) stop = startCloudSync(); });
    return () => { cancelled = true; stop?.(); setSyncScope(); };
  }, [mode, ownerId]);
  return null;
}

export function SyncBadge() {
  const { mode, user } = useAuth();
  const status = useSyncStatus((state) => state.status);
  const pending = useSyncStatus((state) => state.pending);
  if (mode === 'device') return <span className="sync-badge device">Device only</span>;
  if (!user) return null;
  return <span className={`sync-badge ${status}`}>{status === 'syncing' ? 'Syncing…' : status === 'offline' ? `Offline${pending ? ` · ${pending} pending` : ''}` : status === 'error' ? 'Sync needs attention' : 'Synced'}</span>;
}
