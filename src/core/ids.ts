import { nanoid } from 'nanoid';
/** UUIDs for new records; the fallback preserves support for older browsers. */
export const newId = (): string => globalThis.crypto?.randomUUID?.() ?? nanoid(21);
export const nowIso = (): string => new Date().toISOString();
