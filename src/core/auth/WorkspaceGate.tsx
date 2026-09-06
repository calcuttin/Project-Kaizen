import { useEffect, useState, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { openAccountWorkspace } from '@/core/store';
import { currentWorkspaceOwner, lockWorkspace } from '@/core/storage';

/** Keep account data and component state behind both authentication and storage readiness. */
export function WorkspaceGate({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth();
  const ownerId = ready ? user?.id : undefined;
  const [loadedOwner, setLoadedOwner] = useState<string>();
  const [error, setError] = useState<string>();
  const previousOwner = currentWorkspaceOwner();
  const changed = Boolean(previousOwner && ownerId !== previousOwner);

  useEffect(() => {
    if (changed) {
      lockWorkspace();
      window.location.reload();
      return;
    }
    if (!ownerId) return;
    let cancelled = false;
    void openAccountWorkspace(ownerId).then(() => {
      if (!cancelled) setLoadedOwner(ownerId);
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to open workspace');
    });
    return () => { cancelled = true; };
  }, [ownerId, changed]);

  if (changed || (ownerId && loadedOwner !== ownerId)) return <div className="auth-loading"><LoaderCircle className="auth-spinner" /><span>{error ?? 'Opening your private workspace…'}</span>{error && <button onClick={() => window.location.reload()}>Retry</button>}</div>;
  return children;
}
