import type { GameState } from '../types';
import { serializeGameState } from './saveCodec';
import { encodePersistedState } from './storageCompression';

export interface PersistedStateStorage {
  setItem(key: string, value: string): void;
}

export interface PersistencePhaseDurations {
  canonicalSnapshotMs: number;
  jsonStringifyMs: number;
  compressionEncodingMs: number;
  storageWriteMs: number;
  endToEndMs: number;
}

export interface PersistencePayloadSizes {
  jsonChars: number;
  jsonUtf8Bytes: number;
  jsonUtf16Bytes: number;
  encodedChars: number;
  encodedUtf8Bytes: number;
  encodedUtf16Bytes: number;
  compressionRatio: number;
}

export interface PersistedStateProfile {
  phases: PersistencePhaseDurations;
  sizes: PersistencePayloadSizes;
}

interface PersistenceProfilingOptions {
  now?: () => number;
  includeUtf8Sizes?: boolean;
}

function getUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/**
 * The authoritative synchronous save pipeline. Profiling is opt-in so ordinary
 * saves do not read the clock or calculate diagnostic byte lengths.
 */
// SpecRef: 5.1.4 | Save and load | Data persistence
export function persistGameState(
  state: GameState,
  storageKey: string,
  storage: PersistedStateStorage,
  profiling?: PersistenceProfilingOptions,
): PersistedStateProfile | null {
  const now = profiling?.now ?? (() => performance.now());
  const profileEnabled = profiling !== undefined;
  const endToEndStartedAt = profileEnabled ? now() : 0;

  const canonicalStartedAt = profileEnabled ? now() : 0;
  const canonicalSnapshot = serializeGameState(state);
  const canonicalSnapshotMs = profileEnabled ? now() - canonicalStartedAt : 0;

  const stringifyStartedAt = profileEnabled ? now() : 0;
  const jsonPayload = JSON.stringify(canonicalSnapshot);
  const jsonStringifyMs = profileEnabled ? now() - stringifyStartedAt : 0;

  const compressionStartedAt = profileEnabled ? now() : 0;
  const encodedPayload = encodePersistedState(jsonPayload);
  const compressionEncodingMs = profileEnabled ? now() - compressionStartedAt : 0;

  const storageStartedAt = profileEnabled ? now() : 0;
  storage.setItem(storageKey, encodedPayload);
  const storageWriteMs = profileEnabled ? now() - storageStartedAt : 0;
  const endToEndMs = profileEnabled ? now() - endToEndStartedAt : 0;

  if (!profileEnabled) return null;

  const jsonUtf16Bytes = jsonPayload.length * 2;
  const encodedUtf16Bytes = encodedPayload.length * 2;
  return {
    phases: {
      canonicalSnapshotMs,
      jsonStringifyMs,
      compressionEncodingMs,
      storageWriteMs,
      endToEndMs,
    },
    sizes: {
      jsonChars: jsonPayload.length,
      jsonUtf8Bytes: profiling.includeUtf8Sizes ? getUtf8ByteLength(jsonPayload) : 0,
      jsonUtf16Bytes,
      encodedChars: encodedPayload.length,
      encodedUtf8Bytes: profiling.includeUtf8Sizes ? getUtf8ByteLength(encodedPayload) : 0,
      encodedUtf16Bytes,
      compressionRatio: jsonUtf16Bytes === 0 ? 0 : encodedUtf16Bytes / jsonUtf16Bytes,
    },
  };
}
