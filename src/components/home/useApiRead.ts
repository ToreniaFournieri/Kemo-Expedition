import { useEffect, useState } from 'react';
import type { InProcessApiAdapter } from '../../api/v1/applicationApi';

// SpecRef: 9.1.4.13 | Adapter and contract-test requirements | Projection tests
// Reads one Application API projection through the trusted in-process adapter. The previous result stays visible while
// a refresh is in flight so controls do not flicker; a request that has been superseded is discarded.

export function useApiRead<T>(
  adapter: InProcessApiAdapter | null,
  operation: string,
  input: { pathParameters?: Record<string, unknown>; parameters?: Record<string, unknown> } | null,
  dependencies: readonly unknown[],
): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    if (!adapter || !input) { setData(null); return; }
    let cancelled = false;
    void adapter.read(operation, input).then((response) => {
      if (cancelled) return;
      if (response.error) { console.error('[api-v1] Projection read failed', operation, response.error); setData(null); return; }
      setData(response.data as T);
    });
    return () => { cancelled = true; };
    // The caller owns the dependency list: the projection is re-read when any listed fact changes.
  }, [adapter, operation, ...dependencies]);
  return data;
}
