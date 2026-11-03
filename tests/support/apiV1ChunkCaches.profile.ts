import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { simulateAfkPartyChunkForWorker, getAfkInventoryDeltaForState } from '../../src/hooks/useGameState.ts';
import { getApproxAfkCycleDurationMs } from '../../src/game/afkScheduler.ts';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import { withGameplayRandomSourceForTesting } from '../../src/game/gameplayRandom.ts';
import { serializeGameState } from '../../src/game/saveCodec.ts';
import { setLanguage } from '../../src/i18n/index.ts';
import { loadAndValidateExpedition8Fixture } from './expedition8SaveFixture.ts';
import type { GameState } from '../../src/types.ts';

declare const __API_CHUNK_CACHE_SAMPLES__: number;
declare const __API_CHUNK_CACHE_CHUNKS__: number;
declare const __API_CHUNK_CACHE_COMPARE_UNCACHED__: boolean;

// SpecRef: 9.1.4.4 | Chunk-local computation caches cannot change immutable staged API progression.
const fixedNow = Date.UTC(2030, 0, 1);
const originalNow = Date.now;
Date.now = () => fixedNow;
setLanguage('ja');
const initial = loadAndValidateExpedition8Fixture().state;
const initialJson = JSON.stringify(serializeGameState(initial));

function run(chunkComputationCache: 'shared' | 'none') {
  let state: GameState = initial;
  let cursor = 0n;
  let random = 12345;
  let draws = 0;
  const startedAt = performance.now();
  for (let chunk = 0; chunk < __API_CHUNK_CACHE_CHUNKS__; chunk += 1) {
    for (let partyIndex = 0; partyIndex < state.parties.length; partyIndex += 1) {
      const duration = getApproxAfkCycleDurationMs(state.parties[partyIndex], 0.05);
      state = withBattleSeedSourceForTesting(
        () => (0xaf123456n << 32n) | cursor++,
        () => withGameplayRandomSourceForTesting(() => {
          draws += 1;
          random ^= random << 13; random ^= random >>> 17; random ^= random << 5;
          return (random >>> 0) / 4_294_967_296;
        }, () => simulateAfkPartyChunkForWorker(state, {
          partyIndex,
          cycleDurationMs: duration,
          simulatedCompletedAt: fixedNow + chunk * duration * 30,
          cycleDurationScale: 0.05,
          gameMode: 'mode.normal',
          inventoryStrategy: 'immutable',
          workerOptimization: 'optimized',
          chunkComputationCache,
          compactBattleResultOutput: false,
        })),
      );
      assert.equal(getAfkInventoryDeltaForState(state), undefined, 'immutable API state must not own an overlay delta');
    }
  }
  const wallMs = performance.now() - startedAt;
  const serialized = JSON.stringify(serializeGameState(state));
  assert.equal(JSON.stringify(serializeGameState(initial)), initialJson, 'private staging must preserve the input snapshot');
  return { wallMs, draws, battleSeeds: String(cursor), hash: createHash('sha256').update(serialized).digest('hex'), serialized };
}

try {
  run('shared'); // Warm native battle code and V8 before measurement.
  const results = [];
  for (let sample = 0; sample < __API_CHUNK_CACHE_SAMPLES__; sample += 1) {
    const optimized = run('shared');
    if (__API_CHUNK_CACHE_COMPARE_UNCACHED__) {
      const uncached = run('none');
      assert.equal(optimized.serialized, uncached.serialized, 'cached Chunks must retain every reward, bag, clock, HP, and battle log');
      assert.equal(optimized.draws, uncached.draws, 'cache reuse must retain gameplay RNG order');
      assert.equal(optimized.battleSeeds, uncached.battleSeeds, 'cache reuse must retain native battle seed draws');
    }
    const { serialized: _serialized, ...measurement } = optimized;
    void _serialized;
    results.push(measurement);
  }
  console.log(JSON.stringify({ chunksPerParty: __API_CHUNK_CACHE_CHUNKS__, parties: initial.parties.length, results }));
} finally {
  Date.now = originalNow;
}
