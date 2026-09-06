import { toast } from '@/components/Toast';
import type { RegisteredStore } from './store';
import { currentWorkspaceOwner, workspaceAvailable } from './storage';

/** Restore only deleted records, preserving edits made after deletion. */
export function deleteWithUndo(store: Pick<RegisteredStore, 'getState' | 'setState'>, remove: () => void, label: string) {
  const owner = currentWorkspaceOwner();
  const before = store.getState() as Record<string, unknown>;
  remove();
  const after = store.getState() as Record<string, unknown>;
  const removed: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(before)) {
    const next = after[field];
    if (Array.isArray(value) && Array.isArray(next)) removed[field] = value.filter((item) => item?.id && !next.some((row) => row.id === item.id));
    else if (value && next && typeof value === 'object' && typeof next === 'object') {
      removed[field] = Object.fromEntries(Object.entries(value).filter(([id]) => !(id in next)));
    }
  }
  let used = false;
  const undo = () => {
    if (used || !workspaceAvailable() || currentWorkspaceOwner() !== owner) return;
    used = true;
    const current = store.getState() as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(removed)) {
      const next = current[field];
      if (Array.isArray(value) && Array.isArray(next)) patch[field] = [...next, ...value.filter((item) => !next.some((row) => row.id === item.id))];
      else if (value && next && typeof next === 'object') patch[field] = { ...value, ...next };
    }
    store.setState(patch);
    toast('Restored');
  };
  toast(label, { label: 'Undo', run: undo });
  return undo;
}
