import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { decodePersistedState } from '../src/game/storageCompression.ts';

const hookSource = readFileSync(new URL('../src/hooks/useGameState.ts', import.meta.url), 'utf8');
const homeSource = readFileSync(new URL('../src/components/HomeScreen.tsx', import.meta.url), 'utf8');
const homeSharedSource = readFileSync(new URL('../src/components/home/homeShared.tsx', import.meta.url), 'utf8');
const settingTabSource = readFileSync(new URL('../src/components/home/tabs/SettingTab.tsx', import.meta.url), 'utf8');

test('failed game-state writes remain pending and schedule an automatic retry', () => {
  assert.match(hookSource, /const result = saveState\(pendingSaveStateRef\.current\);[\s\S]*if \(!result\.ok\)[\s\S]*flushPendingSaveAttempt\(\)/);
  assert.match(hookSource, /if \(!result\.ok\)[\s\S]*return;[\s\S]*pendingSaveStateRef\.current = null/);
});

test('imports use the startup migration pipeline before they are persisted and committed', () => {
  assert.match(hookSource, /loadSavedState\(encodePersistedState\(JSON\.stringify\(nextState\)\)\)/);
  assert.match(hookSource, /gameReducer\(imported\.state, \{ type: 'IMPORT_GAME_STATE', state: imported\.state \}\)/);
  assert.match(hookSource, /saveState\(normalizedState\)[\s\S]*COMMIT_API_STATE/);
});

test('backup payloads include a schema-marked runtime snapshot and imports replace it', () => {
  assert.match(homeSharedSource, /interface PersistedRuntimeSnapshot \{[\s\S]*schemaVersion: 1/);
  assert.match(homeSharedSource, /afkChunkCursor: PersistedAfkChunkCursor \| null/);
  assert.match(settingTabSource, /saveDataCompressed:[\s\S]*runtimeSnapshot: getRuntimeSnapshot\(\)/);
  assert.match(homeSource, /normalizeRuntimeSnapshot\(rawRuntimeSnapshot, result\.state\.parties\.length\)/);
  assert.match(homeSource, /localStorage\.setItem\(AFK_RUNTIME_STORAGE_KEY, JSON\.stringify\(nextRuntimeSnapshot\)\)/);
  assert.match(homeSource, /if \(pendingAfkMsRef\.current > 0\) actions\.flushSave\(\);[\s\S]*persistAfkRuntimeState\(\)/);
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
