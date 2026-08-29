import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getGodsBattleProgress, getGodsBattleRequired } from '../../src/game/clearGate.ts';
import { buildExperimentalObservation } from '../../src/game/experimentalApi.ts';
import { getApproxAfkCycleDurationMs } from '../../src/game/afkScheduler.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import { withGameplayRandomSourceForTesting } from '../../src/game/gameplayRandom.ts';
import {
  runExpeditionTransactionForTesting,
  simulateAfkPartyChunkForWorker,
  simulateApiSortieBatchForTesting,
  simulateExpeditionRuns,
} from '../../src/hooks/useGameState.ts';
import { ensureLanguageLoaded, setLanguage, SUPPORTED_LANGUAGES } from '../../src/i18n/index.ts';
import type { GameState } from '../../src/types.ts';

await Promise.all(SUPPORTED_LANGUAGES.map((language) => ensureLanguageLoaded(language)));

const SAVE_PATH = resolve(process.cwd(), 'sample_savedata/Exp8,7,6,5,4,3_set_for_test_v0.9.3_dev_20260820.kemoz');
const outputPath = process.argv[2];
if (!outputPath) throw new Error('output path is required');

function loadState(): GameState {
  const envelope = JSON.parse(readFileSync(SAVE_PATH, 'utf8')) as { saveDataCompressed: string };
  return hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0 || 0x9e3779b9;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0x1_0000_0000;
  };
}

function deterministic<T>(seed: number, operation: () => T): T {
  let battle = 0n;
  return withBattleSeedSourceForTesting(
    () => (BigInt(seed) << 32n) | battle++,
    () => withGameplayRandomSourceForTesting(seededRandom(seed), operation),
  );
}

const languages = ['ja', 'en', 'zh-CN', 'zh-TW'] as const;
const simulatedAt = Date.UTC(2026, 7, 25);
Date.now = () => simulatedAt;
const output: Record<string, unknown> = {};

for (const [languageIndex, language] of languages.entries()) {
  setLanguage(language);
  const seedOffset = languageIndex * 0x1000;
  const onlineState = loadState();
  onlineState.global.language = language;
  const lastPartyIndex = onlineState.parties.length - 1;
  const godsPartyIndex = onlineState.parties.findIndex((party) => (
    Boolean(party.defeatedBossExpeditions[party.selectedDungeonId])
    && getGodsBattleProgress(party, party.selectedDungeonId) >= getGodsBattleRequired()
  ));
  assert.ok(godsPartyIndex >= 0);

  const online = deterministic(0x4b010001 + seedOffset, () => (
    runExpeditionTransactionForTesting(onlineState, lastPartyIndex, { gameMode: 'm.kemo', simulatedAt })
  ));
  const simulation = await deterministic(0x4b020002 + seedOffset, () => (
    simulateExpeditionRuns(loadState(), lastPartyIndex, 'm.kemo', 1)
  ));
  const godsState = loadState();
  godsState.global.language = language;
  const godsBattle = deterministic(0x4b030003 + seedOffset, () => (
    runExpeditionTransactionForTesting(godsState, godsPartyIndex, {
      gameMode: 'm.kemo', triggerGodsBattle: true, simulatedAt,
    })
  ));
  const afk = loadState().parties.map((party, partyIndex) => {
    const afkState = loadState();
    afkState.global.language = language;
    return deterministic(0x4b040000 + seedOffset + partyIndex, () => (
      simulateAfkPartyChunkForWorker(afkState, {
        partyIndex,
        cycleDurationMs: getApproxAfkCycleDurationMs(party, 0.05),
        simulatedCompletedAt: simulatedAt,
        cycleDurationScale: 0.05,
        gameMode: 'm.kemo',
      })
    ));
  });
  const apiOneState = loadState();
  apiOneState.global.language = language;
  const apiOne = deterministic(0x4b050001 + seedOffset, () => (
    simulateApiSortieBatchForTesting(apiOneState, lastPartyIndex, 1, 'm.kemo', simulatedAt)
  ));
  const apiHundredState = loadState();
  apiHundredState.global.language = language;
  const apiHundred = deterministic(0x4b050100 + seedOffset, () => (
    simulateApiSortieBatchForTesting(apiHundredState, lastPartyIndex, 100, 'm.kemo', simulatedAt)
  ));
  const observationState = loadState();
  observationState.global.language = language;
  const observationBefore = buildExperimentalObservation(observationState, 1, false, {}, simulatedAt);
  const observationBatch = deterministic(0x4b060006 + seedOffset, () => (
    simulateApiSortieBatchForTesting(observationState, lastPartyIndex, 1, 'm.kemo', simulatedAt)
  ));
  const observationAfter = buildExperimentalObservation(observationBatch.state, 2, false, {}, simulatedAt);

  output[language] = {
    online,
    simulation,
    godsBattle,
    afk,
    apiOne: {
      state: apiOne.state,
      logs: apiOne.runs.map(({ log }) => log),
    },
    apiHundred: {
      state: apiHundred.state,
      logs: apiHundred.runs.map(({ log }) => log),
    },
    observationBefore,
    observationAfter,
  };
}

writeFileSync(outputPath, JSON.stringify(output));
