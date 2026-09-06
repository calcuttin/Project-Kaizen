import { useEffect } from 'react';
import { useAuth } from '@/core/auth/AuthProvider';
import { startCloudSync, syncNow, useSyncStatus } from './engine';
import { saveStatus } from './saveStatus';
import { Link } from 'react-router-dom';
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
  const state = useSyncStatus();
  if (mode === 'device') return <span className="sync-badge device">Device only</span>;
  if (!user) return null;
  return <span className={`sync-badge ${state.status}`} role="status">{saveStatus(state)}{state.status === 'error' && !state.localError && <button onClick={() => void syncNow()}>Retry</button>}{(state.conflicts > 0 || state.localError) && <Link to="/settings">Review</Link>}</span>;
}
