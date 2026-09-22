import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { decodePersistedState } from '../src/game/storageCompression.ts';

const hookSource = readFileSync(new URL('../src/hooks/useGameState.ts', import.meta.url), 'utf8');
const homeSource = readFileSync(new URL('../src/components/HomeScreen.tsx', import.meta.url), 'utf8');
const homeSharedSource = readFileSync(new URL('../src/components/home/homeShared.tsx', import.meta.url), 'utf8');
const settingTabSource = readFileSync(new URL('../src/components/home/tabs/SettingTab.tsx', import.meta.url), 'utf8');
const applicationApiSource = readFileSync(new URL('../src/api/v1/applicationApi.ts', import.meta.url), 'utf8');

test('failed game-state writes remain pending and schedule an automatic retry', () => {
  assert.match(hookSource, /onError: \(error\)[\s\S]*saveRetryTimeoutRef\.current = setTimeout[\s\S]*persistenceCoordinatorRef\.current\?\.retry\(\)/);
  assert.match(hookSource, /requestDurable\(latestGameStateRef\.current\)/);
});

test('imports use the startup migration pipeline before they are persisted and committed', () => {
  assert.match(hookSource, /loadSavedState\(JSON\.stringify\(nextState\)\)/);
  assert.match(hookSource, /gameReducer\(imported\.state, \{ type: 'IMPORT_GAME_STATE', state: imported\.state \}\)/);
  assert.match(hookSource, /await persistenceCoordinatorRef\.current\?\.replaceDurable\(normalizedState\)[\s\S]*COMMIT_API_STATE/);
});

test('the Setting tab\'s backup import/reset use the coordinator\'s full-replacement write, never the ordinary autosave', () => {
  // SpecRef: 9.1.4.15 | `commit/setting/backup/import`/`reset` swap in an unrelated save; the ordinary coalescing
  // autosave path (`persistApiState`/`requestOrdinary`) assumes incremental continuity from the last save and would
  // not correctly garbage-collect the prior Diary-record generation the way `replaceDurable` does (see
  // `persistApiStateReplacement`'s own doc comment in homeShared.tsx). This guards against silently routing those
  // two operations back through the ordinary port during a future refactor.
  assert.match(hookSource, /persistApiStateReplacement: useCallback\(async \(nextState: GameState\) => \{[\s\S]*await coordinator\.replaceDurable\(nextState\)/);
  assert.match(homeSharedSource, /persistApiStateReplacement: \(state: GameState\) => Promise<void>/);
  assert.match(homeSource, /persistPlayerReplacement: async \(snapshot\) => \{ await apiActionsRef\.current\.persistApiStateReplacement\(snapshot\); \}/);
  assert.match(applicationApiSource, /persistPlayerReplacement\?: \(state: GameState\) => Promise<void>/);
  assert.match(applicationApiSource, /operation === 'commit\/setting\/backup\/import' \|\| operation === 'commit\/setting\/backup\/reset'\)[\s\S]{0,40}ports\.runtime\.persistPlayerReplacement/);
});

test('backup payloads include a schema-marked runtime snapshot and imports replace it', () => {
  assert.match(homeSharedSource, /interface PersistedRuntimeSnapshot \{[\s\S]*schemaVersion: 1/);
  assert.match(homeSharedSource, /afkChunkCursor: PersistedAfkChunkCursor \| null/);
  assert.match(homeSharedSource, /afkRemainingMsByParty\?: Record<number, number>/);
  assert.match(settingTabSource, /saveDataCompressed:[\s\S]*runtimeSnapshot: getRuntimeSnapshot\(\)/);
  assert.match(homeSource, /normalizeRuntimeSnapshot\(rawRuntimeSnapshot, nextState\.parties\.length\)/);
  assert.match(homeSource, /localStorage\.setItem\(AFK_RUNTIME_STORAGE_KEY, JSON\.stringify\(nextRuntimeSnapshot\)\)/);
  assert.match(homeSource, /afkRemainingMsByParty: afkRemainingMsByPartyRef\.current/);
  assert.match(homeSource, /if \(pendingAfkMsRef\.current > 0\) await actions\.flushSave\(\)\.catch[\s\S]*persistAfkRuntimeState\(\)/);
});

test('the checked-in legacy backup retains the required canonical roots', () => {
  const backupPath = new URL('../sample_savedata/Kemo-Expedition_Backup_v0.9.1_dev_20260809.kemoz', import.meta.url);
  const envelope = JSON.parse(readFileSync(backupPath, 'utf8')) as { saveDataCompressed: string };
  const state = JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as Record<string, unknown>;
  assert.ok(Array.isArray(state.parties));
  assert.equal(typeof state.global, 'object');
  assert.equal(typeof state.bags, 'object');
  assert.equal(typeof state.selectedPartyIndex, 'number');
  assert.equal(typeof state.buildNumber, 'number');
});
