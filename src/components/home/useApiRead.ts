import { useEffect, useState } from 'react';
import type { InProcessApiAdapter } from '../../api/v1/applicationApi';

// SpecRef: 9.1.4.13 | Adapter and contract-test requirements | Projection tests
// Reads one Application API projection through the trusted in-process adapter. The previous result stays visible while
// a refresh is in flight so controls do not flicker; a request that has been superseded is discarded. A disabled read
// does no work and keeps its last result, and it refreshes as soon as it is enabled again.

export function useApiRead<T>(
  adapter: InProcessApiAdapter | null,
  operation: string,
  input: { pathParameters?: Record<string, unknown>; parameters?: Record<string, unknown> } | null,
  dependencies: readonly unknown[],
  enabled = true,
): T | null {
  const [data, setData] = useState<T | null>(null);
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
  }, [adapter, operation, enabled, ...dependencies]);
  return data;
}

/** Reads one projection per input in parallel and returns the results in input order once every read has completed. */
export function useApiReads<T>(
  adapter: InProcessApiAdapter | null,
  operation: string,
  inputs: readonly { pathParameters?: Record<string, unknown>; parameters?: Record<string, unknown> }[],
  dependencies: readonly unknown[],
  enabled = true,
): T[] | null {
  const [data, setData] = useState<T[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (!adapter) { setData(null); return; }
    let cancelled = false;
    void Promise.all(inputs.map((input) => adapter.read(operation, input))).then((responses) => {
      if (cancelled) return;
      const failed = responses.find((response) => response.error);
      if (failed) { console.error('[api-v1] Projection read failed', operation, failed.error); setData(null); return; }
      setData(responses.map((response) => response.data as T));
    });
    return () => { cancelled = true; };
    // `inputs` is derived from the caller's stable constants; the dependency list decides when to re-read.
  }, [adapter, operation, enabled, ...dependencies]);
  return data;
}
