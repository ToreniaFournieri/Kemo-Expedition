// SpecRef: 9.1.4.3 | Read consistency, caching, and pagination | limit (1–200, default 100) and an opaque cursor
// A cursor is bound to its route, filters, ordering, and revision: a cursor from another route, another filter set, or
// another revision is `invalid_cursor`, and a cursor that cannot be decoded at all is `invalid_request`.

export const PAGE_LIMIT_DEFAULT = 100;
export const PAGE_LIMIT_MAXIMUM = 200;

interface CursorPayload { r: string; f: string; v: number; o: number }

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function encodeCursor(payload: CursorPayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeCursor(cursor: string): CursorPayload {
  try {
    const padded = cursor.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))) as Partial<CursorPayload>;
    if (typeof parsed.r !== 'string' || typeof parsed.f !== 'string' || !Number.isSafeInteger(parsed.v) || !Number.isSafeInteger(parsed.o) || parsed.o! < 0) throw new Error('shape');
    return parsed as CursorPayload;
  } catch {
    throw new Error('invalid_request:cursor');
  }
}

/** One page of an already filtered and ordered list, plus the cursor of the next page (`null` when complete). */
export function paginate<T>(route: string, items: readonly T[], parameters: Record<string, unknown>, revision: number): { page: T[]; nextCursor: string | null } {
  const limit = parameters.limit === undefined ? PAGE_LIMIT_DEFAULT : Number(parameters.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > PAGE_LIMIT_MAXIMUM) throw new Error('invalid_request:limit');
  const { limit: _limit, cursor, ...filters } = parameters;
  const filterKey = canonical(filters);
  let offset = 0;
  if (cursor !== undefined) {
    const decoded = decodeCursor(String(cursor));
    if (decoded.r !== route || decoded.f !== filterKey || decoded.v !== revision || decoded.o > items.length) throw new Error('invalid_cursor');
    offset = decoded.o;
  }
  const page = items.slice(offset, offset + limit);
  const next = offset + page.length;
  return { page, nextCursor: next < items.length ? encodeCursor({ r: route, f: filterKey, v: revision, o: next }) : null };
}
