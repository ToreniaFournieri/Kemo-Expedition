// Offline API emulator entry: the game's own elapsed progression, commit operations and (extracted) auto-equipment.
import { readFileSync, writeFileSync } from 'node:fs';
import { hydrateGameState, serializeGameState } from '../../../src/game/saveCodec.ts';
import { decodePersistedState, encodePersistedState } from '../../../src/game/storageCompression.ts';
export { hydrateGameState, serializeGameState, decodePersistedState, encodePersistedState };
export { computePartyStats, computeCharacterStatsInParty } from '../../../src/game/partyComputation.ts';
export { withGameplayRandomSourceForTesting, createApiRandom, withGameplayRandomSource } from '../../../src/game/gameplayRandom.ts';
export { withBattleSeedSourceForTesting } from '../../../src/game/battleSeedSource.ts';
export { gameReducer, simulateExpeditionRuns, simulateAfkPartyChunkForWorker } from '../../../src/hooks/useGameState.ts';
export { getApproxAfkCycleDurationMs } from '../../../src/game/afkScheduler.ts';
export { getInstantExpeditionChargeState } from '../../../src/game/instantExpedition.ts';
export { stageApiV1ElapsedProgression } from '../../../src/api/v1/elapsedProgression.ts';
export { applyApiV1Commit } from '../../../src/api/v1/commitOperations.ts';
export { ensureLanguageLoaded, setLanguage } from '../../../src/i18n/index.ts';
export { DUNGEONS } from '../../../src/data/dungeons.ts';
export { buildBattleLogData } from '../../../src/api/v1/battleLogs.ts';
export { applyAutoEquipment, planAutoEquipment } from './autoequip.ts';
export function loadSave(path: string) { return hydrateGameState(JSON.parse(decodePersistedState(readFileSync(path, 'utf8')))); }
export function writeSave(path: string, state: any) { writeFileSync(path, encodePersistedState(JSON.stringify(serializeGameState(state)))); }
