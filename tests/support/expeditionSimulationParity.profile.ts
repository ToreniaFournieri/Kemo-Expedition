import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import test from 'node:test';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import { withGameplayRandomSourceForTesting } from '../../src/game/gameplayRandom.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import { resolveSimulationRunForTesting } from '../../src/hooks/useGameState.ts';
import { ensureLanguageLoaded, setLanguage, SUPPORTED_LANGUAGES } from '../../src/i18n/index.ts';
import type { GameState } from '../../src/types/index.ts';

const SAVE_PATH = resolvePath(process.cwd(), 'sample_savedata/Exp8,7,6,5,4,3_set_for_test_v0.9.3_dev_20260820.kemoz');

function loadState(): GameState {
  const envelope = JSON.parse(readFileSync(SAVE_PATH, 'utf8')) as { saveDataCompressed: string };
  return hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
}

function seededRandom(seed: number, counter: { draws: number }): () => number {
  let value = seed >>> 0 || 0x9e3779b9;
  return () => {
    counter.draws += 1;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0x1_0000_0000;
  };
}

function resolveRun(state: GameState, partyIndex: number, mode: 'full' | 'forecast', seed: number) {
  const gameplay = { draws: 0 };
  const battle = { seeds: 0 };
  const result = withBattleSeedSourceForTesting(
    () => {
      battle.seeds += 1;
      return (BigInt(seed) << 32n) | BigInt(battle.seeds);
    },
    () => withGameplayRandomSourceForTesting(
      seededRandom(seed, gameplay),
      () => resolveSimulationRunForTesting(state, partyIndex, mode),
    ),
  );
  return { result, gameplayDraws: gameplay.draws, battleSeeds: battle.seeds };
}

await Promise.all(SUPPORTED_LANGUAGES.map((language) => ensureLanguageLoaded(language)));

test('forecast sandbox matches full authoritative outcomes and random consumption in every language', () => {
  for (const [languageIndex, language] of SUPPORTED_LANGUAGES.entries()) {
    setLanguage(language);
    const source = loadState();
    source.global.language = language;
    const sourceBefore = JSON.stringify(source);
    const partyIndex = source.parties.length - 1;
    const seed = 0x7f310000 + languageIndex;
    const full = resolveRun(source, partyIndex, 'full', seed);
    const forecast = resolveRun(source, partyIndex, 'forecast', seed);
    assert.equal(forecast.result.resolution.outcome, full.result.resolution.outcome, language);
    assert.equal(forecast.result.resolution.completedRooms, full.result.resolution.completedRooms, language);
    assert.equal(forecast.result.resolution.finalHp, full.result.resolution.finalHp, language);
    assert.deepEqual(
      forecast.result.resolution.battleDiagnostics,
      full.result.resolution.battleDiagnostics,
      language,
    );
    assert.equal(forecast.result.state.parties[partyIndex].lastExpeditionLog, null, `${language} forecast log retained`);
    assert.equal(
      forecast.result.state.parties[0],
      source.parties[0],
      `${language} unrelated party was cloned`,
    );
    assert.equal(forecast.gameplayDraws, full.gameplayDraws, language);
    assert.equal(forecast.battleSeeds, full.battleSeeds, language);
    assert.equal(JSON.stringify(source), sourceBefore, `${language} source mutation`);
  }
});
