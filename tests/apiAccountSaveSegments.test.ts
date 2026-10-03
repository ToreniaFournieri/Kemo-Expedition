import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { buildApiSaveSegments, forgetApiSaveSegmentsHeld, markApiSaveSegmentsHeld } from '../src/api/v1/accountSaveSegments.ts';
import { decodePersistedState } from '../src/game/storageCompression.ts';

const { encodeApiAccountSegments } = createRequire(import.meta.url)('../desktop/api-save-encoder.cjs') as {
  encodeApiAccountSegments: (segments: unknown) => Promise<string>;
};

const makeLog = (seed: number) => ({ finalOutcome: 'Return', note: 'ボケモ🦊 "quoted" \\ ' + seed, rows: Array.from({ length: 400 }, (_, i) => ({ i, seed, text: `row ${i * seed}` })) });
const logs = [1, 2, 3].map(makeLog);
const stateOf = (name: string, last = logs[2]) => ({
  name,
  parties: [{ id: 1, diaryLogs: [{ id: 'a', expeditionLog: logs[0] }, { id: 'b', expeditionLog: logs[1] }], lastExpeditionLog: last, characters: [{ name }] }],
}) as never;

test('segmented account saves reassemble to the exact serialized JSON and reuse held logs', async () => {
  const first = stateOf('A');
  const built = buildApiSaveSegments(first);
  assert.equal(built.defined.length, 3);
  assert.equal(decodePersistedState(await encodeApiAccountSegments(built.segments)), JSON.stringify(first));
  markApiSaveSegmentsHeld(built.defined);

  const second = stateOf('B');
  const next = buildApiSaveSegments(second);
  assert.equal(next.defined.length, 0);
  assert.ok(next.segments.items.every((item) => typeof item === 'string' || item.text === undefined));
  assert.equal(decodePersistedState(await encodeApiAccountSegments(next.segments)), JSON.stringify(second));

  const duplicate = buildApiSaveSegments(stateOf('C', logs[0]));
  assert.equal(decodePersistedState(await encodeApiAccountSegments(duplicate.segments)), JSON.stringify(stateOf('C', logs[0])));
});

test('a host without the referenced logs reports a miss and a full resend recovers', async () => {
  const state = stateOf('D');
  const referencing = buildApiSaveSegments(state);
  assert.ok(referencing.segments.items.some((item) => typeof item !== 'string' && item.text === undefined));
  await assert.rejects(encodeApiAccountSegments({ nonce: 'other-process', items: referencing.segments.items }), /segment_cache_miss/);
  await assert.rejects(encodeApiAccountSegments({ nonce: 'again', items: [{ id: 999 }] }), /segment_cache_miss/);
  forgetApiSaveSegmentsHeld();
  const full = buildApiSaveSegments(state);
  assert.equal(full.defined.length, 3);
  assert.equal(decodePersistedState(await encodeApiAccountSegments(full.segments)), JSON.stringify(state));
});
