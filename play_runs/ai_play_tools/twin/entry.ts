import { readFileSync } from 'node:fs';
import { hydrateGameState } from '../../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../../src/game/storageCompression.ts';
import { simulateExpeditionRuns as simulateExpeditionRunsRaw } from '../../../src/hooks/useGameState.ts';
// ORCA=<offset> env: simulate in mode.orca with that enemy level offset (default: normal)
const simulateExpeditionRuns: typeof simulateExpeditionRunsRaw = (st, pi, mode, n, prog, off) => process.env.ORCA ? simulateExpeditionRunsRaw(st, pi, 'mode.orca', n, prog, +process.env.ORCA) : simulateExpeditionRunsRaw(st, pi, mode, n, prog, off);
import { computePartyStats } from '../../../src/game/partyComputation.ts';
import { withGameplayRandomSourceForTesting } from '../../../src/game/gameplayRandom.ts';
import { withBattleSeedSourceForTesting } from '../../../src/game/battleSeedSource.ts';
export { hydrateGameState, decodePersistedState, simulateExpeditionRuns, computePartyStats, withGameplayRandomSourceForTesting, withBattleSeedSourceForTesting };
export function loadSave(path: string) {
  const text = readFileSync(path, 'utf8');
  return hydrateGameState(JSON.parse(decodePersistedState(text)));
}
export { canCharacterEquipCategory } from '../../../src/game/equipmentSets.ts';
export { computeCharacterStatsInParty } from '../../../src/game/partyComputation.ts';
export { isJewelAllowedForCategory } from '../../../src/game/jewel.ts';
export { gameReducer } from '../../../src/hooks/useGameState.ts';
import { simulateApiSortieBatchForTesting as sortieRaw } from '../../../src/hooks/useGameState.ts';
export const simulateApiSortieBatchForTesting: typeof sortieRaw = (st, pi, n, mode, at, off) => process.env.ORCA ? sortieRaw(st, pi, n, 'mode.orca', at, +process.env.ORCA) : sortieRaw(st, pi, n, mode, at, off);
export { buildBattleLogData } from '../../../src/api/v1/battleLogs.ts';
export { resolveSimulationRunForTesting } from '../../../src/hooks/useGameState.ts';
export { simulateAfkPartyChunkForWorker } from '../../../src/hooks/useGameState.ts';
export { getApproxAfkCycleDurationMs } from '../../../src/game/afkScheduler.ts';
export { ensureLanguageLoaded, setLanguage } from '../../../src/i18n/index.ts';
export { runExpeditionTransactionForTesting } from '../../../src/hooks/useGameState.ts';
export { DUNGEONS } from '../../../src/data/dungeons.ts';
export { parseItemFormat } from '../../../src/api/v1/itemFormat.ts';
