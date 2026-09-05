import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createExpeditionForecastResolution,
  type RunExpeditionApplicationAuthorities,
  type RunExpeditionApplicationCommand,
  type RunExpeditionApplicationResult,
} from '../src/game/expeditionApplicationContract.ts';
import type { ExpeditionLog } from '../src/types/index.ts';

function createLog(): ExpeditionLog {
  return {
    dungeonId: 1,
    dungeonName: 'Contract Test Dungeon',
    difficultyOffset: 0,
    totalExperience: 10,
    totalRooms: 4,
    completedRooms: 1,
    finalOutcome: 'Retreat',
    entries: [{
      room: 1,
      enemyId: 101,
      enemyName: 'Test Enemy',
      enemyHP: 100,
      enemyAttackValues: '1/2/3',
      outcome: 'draw',
      damageDealt: 50,
      damageTaken: 50,
      remainingPartyHP: 450,
      maxPartyHP: 500,
      details: [],
      replayMetadata: { seedHex: '1', rngVersion: 2, randomDrawCount: 7 },
    }],
    rewards: [],
    autoSellProfit: 0,
    autoSellCount: 0,
    autoSellItems: [],
    remainingPartyHP: 450,
    maxPartyHP: 500,
  };
}

test('forecast resolution is a detached projection of the completed log', () => {
  const log = createLog();
  const resolution = createExpeditionForecastResolution(log);

  assert.deepEqual(resolution, {
    outcome: 'Retreat',
    completedRooms: 1,
    finalHp: 450,
    terminalBattleOutcome: 'draw',
    battleDiagnostics: [{
      enemyId: 101,
      outcome: 'draw',
      remainingPartyHP: 450,
      replayMetadata: { seedHex: '1', rngVersion: 2, randomDrawCount: 7 },
    }],
  });
  assert.notEqual(resolution.battleDiagnostics, log.entries);
});

test('application contract keeps command data, caller authorities, and result publication explicit', () => {
  const command: RunExpeditionApplicationCommand = {
    partyIndex: 0,
    simulatedAt: 123,
    triggerGodsBattle: true,
    isAfkSimulation: true,
    battleOutputMode: 'result-only',
    compactBattleResultOutput: true,
    resolutionMode: 'forecast',
  };
  const authorities: RunExpeditionApplicationAuthorities = {
    random: () => 0.5,
    getCommittedAt: () => 123,
  };
  const unchanged: RunExpeditionApplicationResult = {
    kind: 'unchanged',
    reason: 'party-hp-ineligible',
    statusAuthoritySupplied: false,
  };

  assert.equal(command.resolutionMode, 'forecast');
  assert.equal(authorities.random(), 0.5);
  assert.equal(authorities.getCommittedAt(), 123);
  assert.equal(unchanged.kind, 'unchanged');
});

test('contract dependency direction leaves diagnostics, registry mutation, and publication in reducer', () => {
  const contractSource = readFileSync(
    new URL('../src/game/expeditionApplicationContract.ts', import.meta.url),
    'utf8',
  );
  const hookSource = readFileSync(new URL('../src/hooks/useGameState.ts', import.meta.url), 'utf8');
  const applicationSource = readFileSync(
    new URL('../src/game/expeditionApplication.ts', import.meta.url),
    'utf8',
  );
  const runExpedition = hookSource.match(/case 'RUN_EXPEDITION':[\s\S]*?case 'FINALIZE_DIARY_LOG':/)?.[0] ?? '';

  assert.match(hookSource, /\{ type: 'RUN_EXPEDITION' \} & RunExpeditionApplicationCommand/);
  assert.match(runExpedition, /runExpeditionApplication\(/);
  assert.match(runExpedition, /recordRunExpeditionStatusAuthority\(/);
  assert.match(runExpedition, /gameplayRandom/);
  assert.match(runExpedition, /Date\.now\(\)/);
  assert.match(runExpedition, /forecastResolutionByState\.set\(/);
  assert.match(runExpedition, /return \{[\s\S]{0,100}\.\.\.result\.projection/);
  assert.match(hookSource, /createExpeditionForecastResolution\(/);
  assert.match(applicationSource, /prepareExpeditionRun\([\s\S]*runExpeditionService\([\s\S]*planExpeditionPostService\([\s\S]*inventoryCoordinator\.complete\([\s\S]*completeExpeditionPresentation\(/);
  assert.doesNotMatch(
    applicationSource,
    /recordRunExpeditionStatusAuthority|gameplayRandom|Date\.now|WeakMap|forecastResolutionByState|return \{\s*\.\.\.state/,
  );
  assert.doesNotMatch(
    contractSource,
    /useGameState|gameReducer|recordRunExpeditionStatusAuthority|gameplayRandom|Date\.now|WeakMap|forecastResolutionByState|ExpeditionInventoryCoordinator|runExpeditionService/,
  );
});
