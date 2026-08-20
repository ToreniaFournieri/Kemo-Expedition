import type { Character, GameState, InventoryRecord, Party } from '../types';

export const AFK_CHUNK_CYCLE_COUNT = 12;

export interface AfkPartyChunkJob {
  jobId: string;
  partyIndex: number;
  partyId: number;
  simulatedStartedAt: number;
  simulatedCompletedAt: number;
  cycleDurationMs: number;
  baseState: GameState;
  gameMode: 'm.kemo' | 'm.luna' | 'm.laika';
  cycleDurationScale: number;
}

export interface AfkPartyChunkResult {
  jobId: string;
  partyIndex: number;
  partyId: number;
  simulatedCompletedAt: number;
  cycleDurationMs: number;
  baseState: GameState;
  resultState: GameState;
  durationMs: number;
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

function addUnique<T>(current: T[], base: T[], result: T[]): T[] {
  const serializedBase = new Set(base.map((value) => JSON.stringify(value)));
  const serializedCurrent = new Set(current.map((value) => JSON.stringify(value)));
  const additions = result.filter((value) => !serializedBase.has(JSON.stringify(value)));
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

function mergeNumberRecord(
  current: Record<string, number>,
  base: Record<string, number>,
  result: Record<string, number>,
): Record<string, number> {
  const next = { ...current };
  new Set([...Object.keys(base), ...Object.keys(result)]).forEach((key) => {
    const delta = (result[key] ?? 0) - (base[key] ?? 0);
    if (delta !== 0) next[key] = Math.max(0, (next[key] ?? 0) + delta);
  });
  return next;
}

function mergeBattleStats(
  current: NonNullable<GameState['global']['enemyBattleStats']>,
  base: NonNullable<GameState['global']['enemyBattleStats']>,
  result: NonNullable<GameState['global']['enemyBattleStats']>,
): NonNullable<GameState['global']['enemyBattleStats']> {
  const next = { ...current };
  new Set([...Object.keys(base), ...Object.keys(result)]).forEach((rawKey) => {
    const key = Number(rawKey);
    const currentValue = next[key] ?? { defeats: 0, encounters: 0 };
    const baseValue = base[key] ?? { defeats: 0, encounters: 0 };
    const resultValue = result[key] ?? { defeats: 0, encounters: 0 };
    next[key] = {
      defeats: Math.max(0, currentValue.defeats + resultValue.defeats - baseValue.defeats),
      encounters: Math.max(0, currentValue.encounters + resultValue.encounters - baseValue.encounters),
    };
  });
  return next;
}

function mergeInventory(current: InventoryRecord, base: InventoryRecord, result: InventoryRecord): InventoryRecord {
  const next = { ...current };
  new Set([...Object.keys(base), ...Object.keys(result)]).forEach((key) => {
    const baseVariant = base[key];
    const resultVariant = result[key];
    if (!resultVariant) return;
    const delta = resultVariant.count - (baseVariant?.count ?? 0);
    if (delta === 0) return;
    const currentVariant = next[key];
    next[key] = {
      ...(currentVariant ?? resultVariant),
      count: Math.max(0, Math.min(99, (currentVariant?.count ?? 0) + delta)),
      isNew: (currentVariant?.isNew ?? false) || resultVariant.isNew,
    };
  });
  return next;
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
  const baseParty = result.baseState.parties[result.partyIndex];
  const resultParty = result.resultState.parties[result.partyIndex];
  const liveParty = current.parties.find((party) => party.id === result.partyId)
    ?? current.parties[result.partyIndex];
  if (!baseParty || !resultParty || !liveParty) return current;

  const parties = [...current.parties];
  const livePartyIndex = parties.findIndex((party) => party.id === result.partyId);
  if (livePartyIndex < 0) return current;
  parties[livePartyIndex] = overlayPendingPartySettings(baseParty, resultParty, liveParty);

  result.resultState.parties.slice(result.baseState.parties.length).forEach((unlockedParty) => {
    if (!parties.some((party) => party.id === unlockedParty.id)) parties.push(unlockedParty);
  });

  const baseGlobal = result.baseState.global;
  const resultGlobal = result.resultState.global;
  const currentGlobal = current.global;
  const goldDelta = resultGlobal.gold - baseGlobal.gold;
  const pranaDelta = resultGlobal.prana - baseGlobal.prana;

  return {
    ...current,
    parties,
    global: {
      ...currentGlobal,
      gold: Math.max(0, currentGlobal.gold + goldDelta),
      prana: Math.max(0, currentGlobal.prana + pranaDelta),
      inventory: mergeInventory(currentGlobal.inventory, baseGlobal.inventory, resultGlobal.inventory),
      jewels: mergeNumberRecord(currentGlobal.jewels, baseGlobal.jewels, resultGlobal.jewels),
      deityDonations: mergeNumberRecord(currentGlobal.deityDonations, baseGlobal.deityDonations, resultGlobal.deityDonations),
      altarVictoriesByEnemyType: mergeNumberRecord(
        currentGlobal.altarVictoriesByEnemyType ?? {},
        baseGlobal.altarVictoriesByEnemyType ?? {},
        resultGlobal.altarVictoriesByEnemyType ?? {},
      ),
      enemyBattleStats: mergeBattleStats(
        currentGlobal.enemyBattleStats ?? {},
        baseGlobal.enemyBattleStats ?? {},
        resultGlobal.enemyBattleStats ?? {},
      ),
      unlockedMimorianEnemyIds: addUnique(currentGlobal.unlockedMimorianEnemyIds, baseGlobal.unlockedMimorianEnemyIds, resultGlobal.unlockedMimorianEnemyIds),
      unlockedDeities: addUnique(currentGlobal.unlockedDeities, baseGlobal.unlockedDeities, resultGlobal.unlockedDeities),
      challengedGodNames: addUnique(currentGlobal.challengedGodNames, baseGlobal.challengedGodNames, resultGlobal.challengedGodNames),
      revealedItemCompendiumItemIds: addUnique(currentGlobal.revealedItemCompendiumItemIds, baseGlobal.revealedItemCompendiumItemIds, resultGlobal.revealedItemCompendiumItemIds),
      revealedGlossaryAbilityIds: addUnique(currentGlobal.revealedGlossaryAbilityIds, baseGlobal.revealedGlossaryAbilityIds, resultGlobal.revealedGlossaryAbilityIds),
      revealedGlossaryTerrainKeys: addUnique(currentGlobal.revealedGlossaryTerrainKeys, baseGlobal.revealedGlossaryTerrainKeys, resultGlobal.revealedGlossaryTerrainKeys),
    },
  };
}
