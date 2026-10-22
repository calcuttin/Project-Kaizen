import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Consume a search result once; wait for hydration if its record is not loaded yet. */
export function useRecordLink(records: Record<string, unknown>, open: (id: string) => void) {
  const [params, setParams] = useSearchParams();
  const callback = useRef(open);
  callback.current = open;
  const id = params.get('record');
  useEffect(() => {
    if (!id || !Object.hasOwn(records, id)) return;
    callback.current(id);
    const next = new URLSearchParams(params);
    next.delete('record');
    setParams(next, { replace: true });
  }, [id, records, params, setParams]);
}
