import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  decodePersistedState,
  encodePersistedState,
  encodeStoredState,
  encodeStoredStateSync,
} from '../src/game/storageCompression.ts';

const workerSource = readFileSync(new URL('../src/workers/persistenceWorker.ts', import.meta.url), 'utf8');
const persistenceSource = readFileSync(new URL('../src/game/savePersistence.ts', import.meta.url), 'utf8');

const samples = [
  '',
  'a',
  '{"k":1}',
  JSON.stringify({ name: 'ボケモ', emoji: '🦊', text: 'x'.repeat(10_000), numbers: Array.from({ length: 4_000 }, (_, i) => i * 7) }),
  // Pseudo-random payload exercises every 15-bit packing remainder.
  Array.from({ length: 50_000 }, (_, i) => String.fromCharCode(32 + ((i * 2654435761) >>> 0) % 90)).join(''),
];

test('internal deflate storage encodings round-trip through the shared decoder', async () => {
  for (const sample of samples) {
    const sync = encodeStoredStateSync(sample);
    const native = await encodeStoredState(sample);
    assert.ok(sync.startsWith('kexp-df15:'));
    assert.ok(native.startsWith('kexp-df15:'));
    assert.equal(decodePersistedState(sync), sample);
    assert.equal(decodePersistedState(native), sample);
  }
});

test('internal deflate storage uses only non-control, non-surrogate code units', () => {
  const encoded = encodeStoredStateSync(samples[4]!);
  const body = encoded.slice(encoded.indexOf(':', 'kexp-df15:'.length) + 1);
  for (let index = 0; index < body.length; index += 1) {
    const unit = body.charCodeAt(index);
    assert.ok(unit >= 0x20 && unit <= 0x801f, `unit ${unit.toString(16)} at ${index}`);
  }
});

test('legacy LZ and uncompressed payloads remain readable', () => {
  for (const sample of samples) assert.equal(decodePersistedState(encodePersistedState(sample)), sample);
  assert.equal(decodePersistedState('{"plain":true}'), '{"plain":true}');
});

test('corrupted deflate storage payloads fail loudly', () => {
  const encoded = encodeStoredStateSync(samples[3]!);
  assert.throws(() => decodePersistedState(encoded.slice(0, encoded.length - 40)), /Failed to decode compressed save payload/);
  assert.throws(() => decodePersistedState('kexp-df15:abc:xyz'), /Failed to decode compressed save payload/);
});

test('autosaves use deflate storage while exported backups keep the portable codec', () => {
  assert.match(workerSource, /request\.codec === 'portable'[\s\S]*encodePersistedState[\s\S]*encodeStoredState/);
  assert.match(persistenceSource, /createExportPayload[\s\S]*codec: 'portable'/);
  assert.match(persistenceSource, /const encodedPayload = encodeStoredStateSync\(jsonPayload\)/);
});
