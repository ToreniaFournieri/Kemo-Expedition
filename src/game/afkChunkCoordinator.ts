import type { Character, GameState, InventoryRecord, Party, TerrainEffectKey } from '../types';

export const AFK_CHUNK_CYCLE_COUNT = 12;

/** Balanced recovery concurrency: limit synchronous full-state worker
 * submissions to two per renderer task while leaving capacity for the UI/OS. */
export function getAfkWorkerPoolLimit(logicalProcessors: number | undefined, partyCount: number): number {
  const processors = Number.isFinite(logicalProcessors) ? Math.max(1, Math.floor(logicalProcessors!)) : 4;
  const hardwareLimit = processors <= 3 ? 1 : 2;
  return Math.max(1, Math.min(Math.max(1, Math.floor(partyCount)), hardwareLimit));
}

export interface AfkPartyChunkJob {
  jobId: string;
  partyIndex: number;
  partyId: number;
  simulatedStartedAt: number;
  simulatedCompletedAt: number;
  cycleDurationMs: number;
  operationCount?: number;
  baseState: GameState;
  gameMode: 'm.kemo' | 'm.luna' | 'm.laika';
  cycleDurationScale: number;
  queuedAt?: number;
  workerCreatedAt?: number;
  isFirstWorkerJob?: boolean;
  inputTransferBytes?: number;
}

export interface AfkWorkerPerformanceTelemetry {
  workerStartupMs: number;
  queueMs: number;
  executionMs: number;
  inputTransferBytes: number | null;
  outputTransferBytes: number | null;
}

export interface AfkPartyChunkResult {
  schemaVersion: 1;
  jobId: string;
  partyIndex: number;
  partyId: number;
  simulatedCompletedAt: number;
  cycleDurationMs: number;
  operationCount: number;
  baseParty: Party;
  resultParty: Party;
  unlockedParties: Party[];
  globalDelta: AfkGlobalDelta;
  durationMs: number;
  workerTelemetry: AfkWorkerPerformanceTelemetry;
}

export type AfkPartyChunkWorkerResult = Omit<AfkPartyChunkResult, 'baseParty'>;

/**
 * Removes retained Diary presentation history from parties that this worker
 * cannot advance. The target party remains byte-identical because its existing
 * history is authoritative for Diary retention and finalization.
 */
export function createAfkPartyChunkWorkerState(state: GameState, partyIndex: number): GameState {
  return {
    ...state,
    parties: state.parties.map((party, index) => (
      index === partyIndex
        ? party
        : { ...party, lastExpeditionLog: null, diaryLogs: [] }
    )),
  };
}

export function createAfkPartyChunkWorkerResult(result: AfkPartyChunkResult): AfkPartyChunkWorkerResult {
  const { baseParty: _baseParty, ...workerResult } = result;
  return workerResult;
}

export function hydrateAfkPartyChunkResult(
  result: AfkPartyChunkWorkerResult,
  baseParty: Party,
): AfkPartyChunkResult {
  return {
    schemaVersion: result.schemaVersion,
    jobId: result.jobId,
    partyIndex: result.partyIndex,
    partyId: result.partyId,
    simulatedCompletedAt: result.simulatedCompletedAt,
    cycleDurationMs: result.cycleDurationMs,
    operationCount: result.operationCount,
    baseParty,
    resultParty: result.resultParty,
    unlockedParties: result.unlockedParties,
    globalDelta: result.globalDelta,
    durationMs: result.durationMs,
    workerTelemetry: result.workerTelemetry,
  };
}

function normalizeTransferBytes(value: number | null | undefined): number | null {
  return value == null ? null : Math.max(0, Math.floor(value));
}

interface InventoryDelta {
  countDelta: number;
  isNew: boolean;
  variant: InventoryRecord[string];
}

interface BattleStatDelta {
  defeats: number;
  encounters: number;
}

export interface AfkGlobalDelta {
  gold: number;
  prana: number;
  inventory: Record<string, InventoryDelta>;
  jewels: Record<string, number>;
  deityDonations: Record<string, number>;
  altarVictoriesByEnemyType: Record<string, number>;
  enemyBattleStats: Record<number, BattleStatDelta>;
  unlockedMimorianEnemyIds: number[];
  unlockedDeities: string[];
  challengedGodNames: string[];
  revealedItemCompendiumItemIds: number[];
  revealedGlossaryAbilityIds: string[];
  revealedGlossaryTerrainKeys: TerrainEffectKey[];
}

export function compareAfkChunkResults(
  left: Pick<AfkPartyChunkResult, 'simulatedCompletedAt' | 'partyId' | 'jobId'>,
  right: Pick<AfkPartyChunkResult, 'simulatedCompletedAt' | 'partyId' | 'jobId'>,
): number {
  return left.simulatedCompletedAt - right.simulatedCompletedAt
    || left.partyId - right.partyId
    || left.jobId.localeCompare(right.jobId);
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function addUnique<T>(current: T[], additions: T[]): T[] {
  const serializedCurrent = new Set(current.map((value) => JSON.stringify(value)));
  return [
    ...current,
    ...additions.filter((value) => {
      const key = JSON.stringify(value);
      if (serializedCurrent.has(key)) return false;
      serializedCurrent.add(key);
      return true;
    }),
  ];
}

function createNumberDelta(
  base: Record<string, number>,
  result: Record<string, number>,
): Record<string, number> {
  const delta: Record<string, number> = {};
  new Set([...Object.keys(base), ...Object.keys(result)]).forEach((key) => {
    const value = (result[key] ?? 0) - (base[key] ?? 0);
    if (value !== 0) delta[key] = value;
  });
  return delta;
}

function mergeNumberDelta(
  current: Record<string, number>,
  delta: Record<string, number>,
): Record<string, number> {
  const next = { ...current };
  Object.entries(delta).forEach(([key, value]) => {
    if (value !== 0) next[key] = Math.max(0, (next[key] ?? 0) + value);
  });
  return next;
}

function createBattleStatsDelta(
  base: NonNullable<GameState['global']['enemyBattleStats']>,
  result: NonNullable<GameState['global']['enemyBattleStats']>,
): Record<number, BattleStatDelta> {
  const delta: Record<number, BattleStatDelta> = {};
  new Set([...Object.keys(base), ...Object.keys(result)]).forEach((rawKey) => {
    const key = Number(rawKey);
    const baseValue = base[key] ?? { defeats: 0, encounters: 0 };
    const resultValue = result[key] ?? { defeats: 0, encounters: 0 };
    const value = {
      defeats: resultValue.defeats - baseValue.defeats,
      encounters: resultValue.encounters - baseValue.encounters,
    };
    if (value.defeats !== 0 || value.encounters !== 0) delta[key] = value;
  });
  return delta;
}

function mergeBattleStatsDelta(
  current: NonNullable<GameState['global']['enemyBattleStats']>,
  delta: Record<number, BattleStatDelta>,
): NonNullable<GameState['global']['enemyBattleStats']> {
  const next = { ...current };
  Object.entries(delta).forEach(([rawKey, value]) => {
    const key = Number(rawKey);
    const currentValue = next[key] ?? { defeats: 0, encounters: 0 };
    next[key] = {
      defeats: Math.max(0, currentValue.defeats + value.defeats),
      encounters: Math.max(0, currentValue.encounters + value.encounters),
    };
  });
  return next;
}

function createInventoryDelta(base: InventoryRecord, result: InventoryRecord): Record<string, InventoryDelta> {
  const delta: Record<string, InventoryDelta> = {};
  new Set([...Object.keys(base), ...Object.keys(result)]).forEach((key) => {
    const resultVariant = result[key];
    if (!resultVariant) return;
    const countDelta = resultVariant.count - (base[key]?.count ?? 0);
    if (countDelta !== 0 || resultVariant.isNew) {
      delta[key] = { countDelta, isNew: resultVariant.isNew === true, variant: resultVariant };
    }
  });
  return delta;
}

function mergeInventoryDelta(current: InventoryRecord, delta: Record<string, InventoryDelta>): InventoryRecord {
  const next = { ...current };
  Object.entries(delta).forEach(([key, change]) => {
    const currentVariant = next[key];
    next[key] = {
      ...(currentVariant ?? change.variant),
      count: Math.max(0, Math.min(99, (currentVariant?.count ?? 0) + change.countDelta)),
      isNew: (currentVariant?.isNew ?? false) || change.isNew,
    };
  });
  return next;
}

function additions<T>(base: T[], result: T[]): T[] {
  const baseKeys = new Set(base.map((value) => JSON.stringify(value)));
  return result.filter((value) => !baseKeys.has(JSON.stringify(value)));
}

export function createAfkPartyChunkResult(
  job: AfkPartyChunkJob,
  resultState: GameState,
  durationMs: number,
  workerTelemetry: Partial<AfkWorkerPerformanceTelemetry> = {},
): AfkPartyChunkResult {
  const baseGlobal = job.baseState.global;
  const resultGlobal = resultState.global;
  return {
    schemaVersion: 1,
    jobId: job.jobId,
    partyIndex: job.partyIndex,
    partyId: job.partyId,
    simulatedCompletedAt: job.simulatedCompletedAt,
    cycleDurationMs: job.cycleDurationMs,
    operationCount: Math.max(1, Math.floor(job.operationCount ?? AFK_CHUNK_CYCLE_COUNT)),
    baseParty: job.baseState.parties[job.partyIndex],
    resultParty: resultState.parties[job.partyIndex],
    unlockedParties: resultState.parties.slice(job.baseState.parties.length),
    globalDelta: {
      gold: resultGlobal.gold - baseGlobal.gold,
      prana: resultGlobal.prana - baseGlobal.prana,
      inventory: createInventoryDelta(baseGlobal.inventory, resultGlobal.inventory),
      jewels: createNumberDelta(baseGlobal.jewels, resultGlobal.jewels),
      deityDonations: createNumberDelta(baseGlobal.deityDonations, resultGlobal.deityDonations),
      altarVictoriesByEnemyType: createNumberDelta(baseGlobal.altarVictoriesByEnemyType ?? {}, resultGlobal.altarVictoriesByEnemyType ?? {}),
      enemyBattleStats: createBattleStatsDelta(baseGlobal.enemyBattleStats ?? {}, resultGlobal.enemyBattleStats ?? {}),
      unlockedMimorianEnemyIds: additions(baseGlobal.unlockedMimorianEnemyIds, resultGlobal.unlockedMimorianEnemyIds),
      unlockedDeities: additions(baseGlobal.unlockedDeities, resultGlobal.unlockedDeities),
      challengedGodNames: additions(baseGlobal.challengedGodNames, resultGlobal.challengedGodNames),
      revealedItemCompendiumItemIds: additions(baseGlobal.revealedItemCompendiumItemIds, resultGlobal.revealedItemCompendiumItemIds),
      revealedGlossaryAbilityIds: additions(baseGlobal.revealedGlossaryAbilityIds, resultGlobal.revealedGlossaryAbilityIds),
      revealedGlossaryTerrainKeys: additions(baseGlobal.revealedGlossaryTerrainKeys, resultGlobal.revealedGlossaryTerrainKeys),
    },
    durationMs,
    workerTelemetry: {
      workerStartupMs: Math.max(0, workerTelemetry.workerStartupMs ?? 0),
      queueMs: Math.max(0, workerTelemetry.queueMs ?? 0),
      executionMs: Math.max(0, workerTelemetry.executionMs ?? durationMs),
      inputTransferBytes: normalizeTransferBytes(workerTelemetry.inputTransferBytes ?? job.inputTransferBytes),
      outputTransferBytes: normalizeTransferBytes(workerTelemetry.outputTransferBytes),
    },
  };
}

function overlayChangedCharacterSettings(base: Character[], result: Character[], live: Character[]): Character[] {
  if (jsonEqual(base, live)) return result;
  const liveById = new Map(live.map((character) => [character.id, character]));
  const resultById = new Map(result.map((character) => [character.id, character]));
  return live.map((liveCharacter) => {
    const baseCharacter = base.find((character) => character.id === liveCharacter.id);
    const resultCharacter = resultById.get(liveCharacter.id) ?? liveCharacter;
    return baseCharacter && jsonEqual(baseCharacter, liveCharacter) ? resultCharacter : liveCharacter;
  }).filter((character) => liveById.has(character.id));
}

const PARTY_SETTING_KEYS = [
  'name',
  'deity',
  'selectedDungeonId',
  'expeditionDestinationMode',
  'expeditionDepthLimit',
  'expeditionDifficultyOffset',
  'expeditionDifficultyOffsetByDungeon',
  'diarySettings',
] as const satisfies ReadonlyArray<keyof Party>;

/**
 * Captures whether this PT has live changes that were made after its worker
 * snapshot. The coordinator calls this once, before committing the Chunk, so
 * later changes cannot alter the auto-equipment decision for this boundary.
 */
export function hasPendingPartySettingChanges(base: Party, live: Party): boolean {
  return PARTY_SETTING_KEYS.some((key) => !jsonEqual(base[key], live[key]))
    || !jsonEqual(base.characters, live.characters);
}

export function overlayPendingPartySettings(base: Party, result: Party, live: Party): Party {
  const next = { ...result };
  PARTY_SETTING_KEYS.forEach((key) => {
    if (!jsonEqual(base[key], live[key])) {
      (next as unknown as Record<string, unknown>)[key] = live[key];
    }
  });
  next.characters = overlayChangedCharacterSettings(base.characters, result.characters, live.characters);
  return next;
}

/**
 * Applies one completed party Chunk to the authoritative state. Workers operate
 * on captured snapshots, so shared additions are merged as deltas while live PT
 * settings are overlaid after the Chunk result.
 */
export function commitAfkPartyChunk(current: GameState, result: AfkPartyChunkResult): GameState {
  const baseParty = result.baseParty;
  const resultParty = result.resultParty;
  const liveParty = current.parties.find((party) => party.id === result.partyId)
    ?? current.parties[result.partyIndex];
  if (!baseParty || !resultParty || !liveParty) return current;

  const parties = [...current.parties];
  const livePartyIndex = parties.findIndex((party) => party.id === result.partyId);
  if (livePartyIndex < 0) return current;
  parties[livePartyIndex] = overlayPendingPartySettings(baseParty, resultParty, liveParty);

  result.unlockedParties.forEach((unlockedParty) => {
    if (!parties.some((party) => party.id === unlockedParty.id)) parties.push(unlockedParty);
  });

  const currentGlobal = current.global;
  const delta = result.globalDelta;

  return {
    ...current,
    parties,
    global: {
      ...currentGlobal,
      gold: Math.max(0, currentGlobal.gold + delta.gold),
      prana: Math.max(0, currentGlobal.prana + delta.prana),
      inventory: mergeInventoryDelta(currentGlobal.inventory, delta.inventory),
      jewels: mergeNumberDelta(currentGlobal.jewels, delta.jewels),
      deityDonations: mergeNumberDelta(currentGlobal.deityDonations, delta.deityDonations),
      altarVictoriesByEnemyType: mergeNumberDelta(
        currentGlobal.altarVictoriesByEnemyType ?? {},
        delta.altarVictoriesByEnemyType,
      ),
      enemyBattleStats: mergeBattleStatsDelta(
        currentGlobal.enemyBattleStats ?? {},
        delta.enemyBattleStats,
      ),
      unlockedMimorianEnemyIds: addUnique(currentGlobal.unlockedMimorianEnemyIds, delta.unlockedMimorianEnemyIds),
      unlockedDeities: addUnique(currentGlobal.unlockedDeities, delta.unlockedDeities),
      challengedGodNames: addUnique(currentGlobal.challengedGodNames, delta.challengedGodNames),
      revealedItemCompendiumItemIds: addUnique(currentGlobal.revealedItemCompendiumItemIds, delta.revealedItemCompendiumItemIds),
      revealedGlossaryAbilityIds: addUnique(currentGlobal.revealedGlossaryAbilityIds, delta.revealedGlossaryAbilityIds),
      revealedGlossaryTerrainKeys: addUnique(currentGlobal.revealedGlossaryTerrainKeys, delta.revealedGlossaryTerrainKeys),
    },
  };
}
