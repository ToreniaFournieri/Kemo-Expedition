import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
  assert.match(persistenceSource, /createExportPayload\(state: GameState, encoding: 'portable' \| 'stored' = 'portable'\)[\s\S]*codec: 'portable' as const/);
  assert.match(persistenceSource, /const encodedPayload = encodeStoredStateSync\(jsonPayload\)/);
});

// Golden UTF-16 bytes captured from the previous portable encoder, independently of its decoder.
// Include lone surrogates, every code unit, dictionary-width growth, and seeded random text.
test('portable exports retain exact legacy bytes across Unicode and dictionary boundaries', () => {
  let seed = 0x12345;
  let random = '';
  for (let index = 0; index < 120_000; index += 1) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    random += String.fromCharCode((seed >>> 0) % 65_536);
  }
  const cases = [
    ['', 'ec27915909e852edbe302e645eff0a7802c2b1206792829edefba9eb8aa97268'],
    ['a', 'a9ce7c9fad059723291de2979290ac94a4a5b4078ccc99990d4cf49f342b8f63'],
    ['aa', '557d99b062da0be6492c21fe384642d8b11aa10db3dace2f563974ebe5325358'],
    ['aabbcc', '4d75d5c8736984cb984948dbf61bc58d9da44d33c466b3487f23d89881d6a8ad'],
    ['日本語🦊한국어\ud800\udfff\u0000', '2e03a610349b4f97e71a22cae5c8b678c7df35b21c599615836143574ad0da7f'],
    ['x'.repeat(10_000), '8d087e1ce00cbb3b4b11f69336618b3ca4dfbe490d118605e4b23da721aed7b7'],
    [String.fromCharCode(...Array.from({ length: 65_536 }, (_, index) => index)), 'c606caa98192191e90b99c9fdb2598710237ff158b11c9b3f79c1e04b53b97a7'],
    [random, 'e43b5d2a839a5bbfed93ef368bfec2ca774a9c713a448466c907b1f6c61bd057'],
  ] as const;
  for (const [input, hash] of cases) {
    const encoded = encodePersistedState(input);
    assert.equal(createHash('sha256').update(encoded, 'utf16le').digest('hex'), hash);
    assert.equal(decodePersistedState(encoded), input);
  }
});
