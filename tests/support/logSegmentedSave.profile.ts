import { encodeCompactBattleEvents } from '../../src/game/compactBattleLog.ts';
import { renderDiaryBattle, renderDiaryMetadata } from '../../src/game/compactDiary.ts';
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

test('a missing referenced Diary record can be omitted during runtime recovery', () => {
  const state = loadFixture();
  const storage = new MemoryStorage();
  const projection = createLogSegmentedSaveProjection(state, STORAGE_KEY);
  const encodedCore = writeProjection(storage, projection);
  const missingKey = [...projection.retainedLogKeys][0]!;
  const missingId = decodeURIComponent(missingKey.split(':').at(-1)!);
  storage.removeItem(missingKey);
  const recovered: string[] = [];

  const hydrated = hydrateLogSegmentedSave(encodedCore, storage, STORAGE_KEY, {
    onMissingDiaryRecord: (partyId, logId) => recovered.push(`${partyId}:${logId}`),
  });

  assert.deepEqual(recovered, [`1:${missingId}`]);
  assert.equal(hydrated?.parties[0]?.diaryLogs.some((entry) => entry.id === missingId), false);
  assert.equal(hydrated?.parties.slice(1).flatMap((party) => party.diaryLogs).length,
    state.parties.slice(1).flatMap((party) => party.diaryLogs).length);
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

test('mixed compact and legacy Diary records keep pooled actors/items, exact Jewels and read state', () => {
  const state = loadFixture();
  const party = state.parties.find(party => party.diaryLogs.length)!;
  const legacy = party.diaryLogs[0];
  const item = party.characters.flatMap(character => character.equipment).find(item => item)!;
  const recordedItem = { ...item, jewel: { key: 'fort' as const, rank: 6 } };
  const compactBattle = encodeCompactBattleEvents([{ opcode: 'attack', phase: 2, actorKind: 1, actorId: 101, targetId: 101, abilityId: null, attackType: 'melee', flags: 0, timing: 12, hits: 1, attempts: 1, aux0: 0, value0: 12, value1: 12, value2: 0, aux1: 0, aux2: 0 }], [{ id: 101, kind: 'character', name: 'Historical name', elementalOffense: 'none', elementalOffenseValue: 1, physicalDefense: 10, abilities: [] }]);
  const room = { ...legacy.expeditionLog.entries[0], compactBattle, details: [], rewardItems: [recordedItem], endEvents: [[2, recordedItem, 3] as [2, typeof recordedItem, number]] };
  const added: DiaryLog = { ...legacy, id: 'compact-roundtrip', isRead: false, semantic: { version: 1, unlock: { boss: true, slot: 3 } }, expeditionLog: { ...legacy.expeditionLog, compactVersion: 1, entries: [room, { ...room, room: 2 }], rewards: [recordedItem] } };
  party.diaryLogs = [added, legacy];
  party.lastExpeditionLog = added.expeditionLog;
  const storage = new MemoryStorage();
  const projection = createLogSegmentedSaveProjection(state, STORAGE_KEY);
  const body = JSON.parse(projection.newLogRecords.find(record => record.key.includes('compact-roundtrip'))!.jsonPayload).value.expeditionLog;
  assert.equal(body.actorTable.length, 1);
  assert.equal(body.itemTable.filter((entry: { id: number }) => entry.id === item.id).length, 1);
  assert.equal(body.entries[0].compactBattle.actors.length, 0);
  const encoded = writeProjection(storage, projection);
  const loaded = hydrateGameState(hydrateLogSegmentedSave(encoded, storage, STORAGE_KEY)!);
  const restored = loaded.parties.find(candidate => candidate.id === party.id)!;
  assert.deepEqual(restored.diaryLogs[1], legacy);
  assert.equal(restored.diaryLogs[0].isRead, false);
  assert.deepEqual(restored.diaryLogs[0].expeditionLog.rewards[0].jewel, { key: 'fort', rank: 6 });
  assert.equal(restored.diaryLogs[0].expeditionLog.entries[0].compactBattle?.actors[0].name, 'Historical name');
  assert.ok(renderDiaryBattle(restored.diaryLogs[0].expeditionLog.entries[0]).length);
  assert.ok(renderDiaryMetadata(restored.diaryLogs[0]).unlockDetail);
  const corrupt = structuredClone(serializeGameState(loaded));
  corrupt.parties.find(candidate => candidate.id === party.id)!.diaryLogs[0].expeditionLog.actorTable = [];
  assert.throws(() => hydrateGameState(corrupt));
  const backup = hydrateGameState(JSON.parse(JSON.stringify(serializeGameState(loaded))));
  assert.deepEqual(backup.parties.find(candidate => candidate.id === party.id)!.diaryLogs[0].expeditionLog.rewards[0].jewel, { key: 'fort', rank: 6 });
});
