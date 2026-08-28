import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  createLogSegmentedSaveProjection,
  getDiaryLogStorageKey,
  hydrateLogSegmentedSave,
  removeOrphanedDiaryLogRecords,
  type LogSegmentedStorage,
} from '../../src/game/logSegmentedSave.ts';
import { hydrateGameState, serializeGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState, encodePersistedState } from '../../src/game/storageCompression.ts';
import type { DiaryLog, GameState } from '../../src/types/index.ts';

const STORAGE_KEY = 'save:dev';

class MemoryStorage implements LogSegmentedStorage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size }
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
  key(index: number) { return [...this.values.keys()][index] ?? null }
}

function loadFixture(): GameState {
  const envelope = JSON.parse(readFileSync(
    resolve(process.cwd(), 'sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz'), 'utf8',
  )) as { saveDataCompressed: string };
  return hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
}

function writeProjection(storage: MemoryStorage, projection: ReturnType<typeof createLogSegmentedSaveProjection>) {
  projection.newLogRecords.forEach((record) => {
    storage.setItem(record.key, encodePersistedState(record.jsonPayload));
  });
  const encodedCore = encodePersistedState(projection.coreJsonPayload);
  storage.setItem(STORAGE_KEY, encodedCore);
  removeOrphanedDiaryLogRecords(STORAGE_KEY, storage, projection.retainedLogKeys);
  return encodedCore;
}

test('log-segmented persistence round-trips the canonical Expedition 8 state', () => {
  const state = loadFixture();
  const storage = new MemoryStorage();
  const projection = createLogSegmentedSaveProjection(state, STORAGE_KEY);
  const encodedCore = writeProjection(storage, projection);

  assert.ok(projection.newLogRecords.length > 0);
  assert.ok(projection.coreJsonChars < JSON.stringify(serializeGameState(state)).length * 0.15);
  assert.deepEqual(hydrateLogSegmentedSave(encodedCore, storage, STORAGE_KEY), serializeGameState(state));
});

test('read-state updates rewrite only the core and reuse immutable Diary records', () => {
  const state = loadFixture();
  const storage = new MemoryStorage();
  const first = createLogSegmentedSaveProjection(state, STORAGE_KEY);
  writeProjection(storage, first);

  const target = state.parties.find((party) => party.diaryLogs.length > 0)!;
  const updated: GameState = {
    ...state,
    parties: state.parties.map((party) => party.id === target.id ? {
      ...party,
      diaryLogs: party.diaryLogs.map((entry, index) => index === 0 ? { ...entry, isRead: true } : entry),
    } : party),
  };
  const second = createLogSegmentedSaveProjection(updated, STORAGE_KEY, first.retainedLogKeys);
  const encodedCore = writeProjection(storage, second);

  assert.equal(second.newLogRecords.length, 0);
  assert.equal(hydrateLogSegmentedSave(encodedCore, storage, STORAGE_KEY)?.parties
    .find((party) => party.id === target.id)?.diaryLogs[0]?.isRead, true);
});

test('retention commits the new manifest before deleting the expired Diary record', () => {
  const state = loadFixture();
  const storage = new MemoryStorage();
  const first = createLogSegmentedSaveProjection(state, STORAGE_KEY);
  writeProjection(storage, first);

  const targetIndex = state.parties.findIndex((party) => party.diaryLogs.length >= 2);
  const target = state.parties[targetIndex]!;
  const expired = target.diaryLogs.at(-1)!;
  const template = target.diaryLogs[0]!;
  const added: DiaryLog = {
    ...template,
    id: `${template.id}-segmented-test`,
    createdAt: template.createdAt + 1,
    isRead: false,
  };
  const nextLogs = [added, ...target.diaryLogs.slice(0, -1)];
  const updated: GameState = {
    ...state,
    parties: state.parties.map((party, index) => index === targetIndex ? { ...party, diaryLogs: nextLogs } : party),
  };
  const second = createLogSegmentedSaveProjection(updated, STORAGE_KEY, first.retainedLogKeys);
  assert.equal(second.newLogRecords.length, 1);

  second.newLogRecords.forEach((record) => storage.setItem(record.key, encodePersistedState(record.jsonPayload)));
  const encodedCore = encodePersistedState(second.coreJsonPayload);
  storage.setItem(STORAGE_KEY, encodedCore);
  assert.ok(storage.getItem(getDiaryLogStorageKey(STORAGE_KEY, target.id, expired.id)));
  assert.equal(removeOrphanedDiaryLogRecords(STORAGE_KEY, storage, second.retainedLogKeys), 1);
  assert.equal(storage.getItem(getDiaryLogStorageKey(STORAGE_KEY, target.id, expired.id)), null);
  assert.deepEqual(hydrateLogSegmentedSave(encodedCore, storage, STORAGE_KEY), serializeGameState(updated));
});

test('a missing referenced Diary record invalidates the segmented save', () => {
  const state = loadFixture();
  const storage = new MemoryStorage();
  const projection = createLogSegmentedSaveProjection(state, STORAGE_KEY);
  const encodedCore = writeProjection(storage, projection);
  storage.removeItem([...projection.retainedLogKeys][0]!);
  assert.throws(() => hydrateLogSegmentedSave(encodedCore, storage, STORAGE_KEY), /missing Diary record/);
});

test('a partial full replacement cannot overwrite records referenced by the prior manifest', () => {
  const state = loadFixture();
  const storage = new MemoryStorage();
  const first = createLogSegmentedSaveProjection(state, STORAGE_KEY);
  const priorCore = writeProjection(storage, first);
  const targetIndex = state.parties.findIndex((party) => party.diaryLogs.length > 0);
  const changed: GameState = {
    ...state,
    parties: state.parties.map((party, index) => index === targetIndex ? {
      ...party,
      diaryLogs: party.diaryLogs.map((entry, logIndex) => logIndex === 0
        ? { ...entry, createdAt: entry.createdAt + 1 }
        : entry),
    } : party),
  };
  const replacement = createLogSegmentedSaveProjection(changed, STORAGE_KEY, first.retainedLogKeys, {
    rewriteAllLogs: true,
    recordNamespace: 'replacement-test',
  });

  const firstReplacementRecord = replacement.newLogRecords[0]!;
  storage.setItem(firstReplacementRecord.key, encodePersistedState(firstReplacementRecord.jsonPayload));
  assert.deepEqual(hydrateLogSegmentedSave(priorCore, storage, STORAGE_KEY), serializeGameState(state));
  assert.notEqual(firstReplacementRecord.key, [...first.retainedLogKeys][0]);
});

test('legacy monolithic payloads remain distinguishable from segmented cores', () => {
  const envelope = JSON.parse(readFileSync(
    resolve(process.cwd(), 'sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz'), 'utf8',
  )) as { saveDataCompressed: string };
  assert.equal(hydrateLogSegmentedSave(envelope.saveDataCompressed, new MemoryStorage(), STORAGE_KEY), null);
});
