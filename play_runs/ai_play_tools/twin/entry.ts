import { readFileSync } from 'node:fs';
import { hydrateGameState } from '../../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../../src/game/storageCompression.ts';
import { simulateExpeditionRuns } from '../../../src/hooks/useGameState.ts';
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
export { simulateApiSortieBatchForTesting } from '../../../src/hooks/useGameState.ts';
export { buildBattleLogData } from '../../../src/api/v1/battleLogs.ts';
