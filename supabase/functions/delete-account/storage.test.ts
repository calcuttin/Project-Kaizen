import { expect, it, vi } from 'vitest';
import { removeArtifacts } from './storage';

it('cleans multiple pages and nested folders within the specified account only', async () => {
  const files = new Set([...Array.from({ length: 205 }, (_, i) => `user_a/file-${i}`), 'user_a/nested/file', 'user_b/private']);
  const bucket = {
    async list(prefix: string, { limit }: { limit: number }) {
      const names = new Map<string, { name: string; id: string | null }>();
      for (const path of files) {
        if (!path.startsWith(`${prefix}/`)) continue;
        const rest = path.slice(prefix.length + 1), name = rest.split('/')[0];
        names.set(name, { name, id: rest.includes('/') ? null : path });
      }
      return { data: [...names.values()].slice(0, limit), error: null };
    },
    async remove(paths: string[]) { for (const path of paths) files.delete(path); return { error: null }; },
  };
  await removeArtifacts(bucket, 'user_a');
  expect([...files]).toEqual(['user_b/private']);
});

it('propagates listing and deletion failures instead of claiming all data was erased', async () => {
  const denied = new Error('storage unavailable');
  const remove = vi.fn();
  await expect(removeArtifacts({ list: async () => ({ data: null, error: denied }), remove }, 'user_a')).rejects.toBe(denied);
  expect(remove).not.toHaveBeenCalled();
  await expect(removeArtifacts({ list: async () => ({ data: [{ id: 'a', name: 'file' }], error: null }), remove: async () => ({ error: denied }) }, 'user_a')).rejects.toBe(denied);
});
