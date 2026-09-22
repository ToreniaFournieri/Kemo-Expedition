import { useEffect, useState } from 'react';
import type { InProcessApiAdapter } from '../../api/v1/applicationApi';

// SpecRef: 9.1.4.13 | Adapter and contract-test requirements | Projection tests
// Reads one Application API projection through the trusted in-process adapter. The previous result stays visible while
// a refresh is in flight so controls do not flicker; a request that has been superseded is discarded. A disabled read
// does no work and keeps its last result, and it refreshes as soon as it is enabled again. It also re-reads after every
// successful commit through the adapter, once that commit is fully installed.

export function useApiRead<T>(
  adapter: InProcessApiAdapter | null,
  operation: string,
  input: { pathParameters?: Record<string, unknown>; parameters?: Record<string, unknown> } | null,
  dependencies: readonly unknown[],
  enabled = true,
): T | null {
  const [data, setData] = useState<T | null>(null);
  // Every fully installed commit re-reads the projection: a read that depends on control metadata (for example the
  // equipment history) cannot rely on a game-state change alone, which is published before that metadata is installed.
  const [committed, setCommitted] = useState(0);
  useEffect(() => {
    if (!adapter) return;
    return adapter.subscribe(() => setCommitted((count) => count + 1));
  }, [adapter]);
  useEffect(() => {
    if (!enabled) return;
    if (!adapter || !input) { setData(null); return; }
    let cancelled = false;
    void adapter.read(operation, input).then((response) => {
      if (cancelled) return;
      if (response.error) { console.error('[api-v1] Projection read failed', operation, response.error); setData(null); return; }
      setData(response.data as T);
    });
    return () => { cancelled = true; };
    // The caller owns the dependency list: the projection is re-read when any listed fact changes.
  }, [adapter, operation, enabled, committed, ...dependencies]);
  return data;
}

type ReadInput = { pathParameters?: Record<string, unknown>; parameters?: Record<string, unknown> };

/**
 * Reads several projections of one operation together (for example a batch split under the operation's request limit)
 * and returns their results in order once all have arrived. The read waits `debounceMs` after the last dependency change,
 * so a burst of changes issues one set of requests, and it re-reads after every fully installed commit like `useApiRead`.
 */
export function useApiReadMany<T>(
  adapter: InProcessApiAdapter | null,
  operation: string,
  inputs: readonly ReadInput[] | null,
  dependencies: readonly unknown[],
  debounceMs = 0,
): T[] | null {
  const [data, setData] = useState<T[] | null>(null);
  const [committed, setCommitted] = useState(0);
  useEffect(() => {
    if (!adapter) return;
    return adapter.subscribe(() => setCommitted((count) => count + 1));
  }, [adapter]);
  useEffect(() => {
    // Disabled (`inputs` null): do no work and keep the last result, exactly like `useApiRead`, so a hidden tab shows its previous
    // content when it is shown again instead of an empty pane while the new read is in flight.
    if (!adapter || !inputs) return;
    if (inputs.length === 0) { setData(null); return; }
    let cancelled = false;
    const timer = setTimeout(() => {
      void Promise.all(inputs.map((input) => adapter.read(operation, input))).then((responses) => {
        if (cancelled) return;
        const failed = responses.find((response) => response.error);
        if (failed) { console.error('[api-v1] Projection read failed', operation, failed.error); setData(null); return; }
        setData(responses.map((response) => response.data as T));
      });
    }, debounceMs);
    return () => { cancelled = true; clearTimeout(timer); };
    // The caller owns the dependency list: the projections are re-read when any listed fact changes.
  }, [adapter, operation, committed, ...dependencies]);
  return data;
}
