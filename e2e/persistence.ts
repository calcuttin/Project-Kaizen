import type { Page } from '@playwright/test';

/** Read committed storage, so a full navigation tests rehydration rather than aborting a write. */
export async function readPersistedValue(page: Page, name: string): Promise<string | null> {
  return page.evaluate(key => new Promise<string | null>((resolve, reject) => {
    const request = indexedDB.open('keyval-store');
    request.onupgradeneeded = () => request.transaction?.abort();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('keyval')) { db.close(); resolve(null); return; }
      const transaction = db.transaction('keyval', 'readonly');
      const read = transaction.objectStore('keyval').get(key);
      let value: string | null = null;
      read.onsuccess = () => { value = read.result ?? null; };
      transaction.oncomplete = () => { db.close(); resolve(value); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
    };
  }), `kaizen:${name}`);
}
