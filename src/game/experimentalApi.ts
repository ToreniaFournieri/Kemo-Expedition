import { CLASSES } from '../data/classes';
import { DUNGEONS } from '../data/dungeons';
import { LINEAGES } from '../data/lineages';
import { PREDISPOSITIONS } from '../data/predispositions';
import { RACES } from '../data/races';
import { GameState, Item, ItemRarity, Party, getVariantKey, MAX_LEVEL } from '../types';
import { computePartyStats } from './partyComputation';
import { getXpToNextLevel } from './partyLevel';
import { getDifficultyOffsetMax } from './difficultyOffset';
import { getDeityKey, DEITY_OPTIONS } from './deity';
import {
  CLEAR_GATE_REQUIRED,
  getBossGateKey,
  getClearGateProgress,
  getEliteGateKey,
  getGodsBattleProgress,
  getGodsBattleRequired,
  isClearGateUnlocked,
  isDungeonEntryUnlocked,
} from './clearGate';
import { getEnvironmentId } from './environment';

export type ExperimentalPartyCycle = {
  state: string;
  stateStartedAt: number;
  durationMs: number;
  restInitialTotalSteps?: number;
};

const itemCategories = ['armor', 'robe', 'shield', 'sword', 'katana', 'gauntlet', 'arrow', 'bolt', 'archery', 'wand', 'grimoire', 'catalyst'] as const;

export function deityId(name: string): string {
  const key = getDeityKey(name) ?? name;
  if (key === 'None') return 'none';
  return key.toLowerCase().replace(/^(god|goddess) of /, '').replace(/\s+/g, '_');
}

export function deityNameFromId(id: string): string | null {
  return DEITY_OPTIONS.find((option) => deityId(option.key) === id)?.key ?? null;
}

export function getUnlockedDeityKeys(unlockedDeities: string[]): string[] {
  const unlockedKeys = new Set(unlockedDeities.map(getDeityKey).filter((key): key is NonNullable<ReturnType<typeof getDeityKey>> => key !== null));
  unlockedKeys.add('None');
  return DEITY_OPTIONS.map((option) => option.key).filter((key) => unlockedKeys.has(key));
}

export function getDeityAssignmentConflict(parties: Party[], targetPartyId: number, deityName: string): Party | null {
  const deityKey = getDeityKey(deityName);
  if (!deityKey || deityKey === 'None') return null;
  return parties.find((party) => party.id !== targetPartyId && getDeityKey(party.deity.name) === deityKey) ?? null;
}

function rarity(item: Item): ItemRarity {
  const suffix = item.id % 100;
  if (suffix >= 81) return 'mythicRare';
  if (suffix >= 61) return 'bossRare';
  if (suffix >= 41) return 'eliteRare';
  return suffix >= 21 ? 'uncommon' : 'common';
}

function conditionKey(value: number): string {
  if (value >= 300) return 'condition.ecstatic';
  if (value >= 100) return 'condition.good';
  if (value > -100) return 'condition.normal';
  if (value > -300) return 'condition.bad';
  return 'condition.desperate';
}

function latestExpedition(party: Party) {
  const log = party.lastExpeditionLog;
  if (!log) return null;
  const rewardsByRarity = { common: 0, uncommon: 0, eliteRare: 0, bossRare: 0, mythicRare: 0 };
  log.rewards.forEach((item) => { rewardsByRarity[rarity(item)] += 1; });
  return {
    dungeonId: log.dungeonId,
    difficultyOffset: log.difficultyOffset,
    finalOutcome: log.finalOutcome,
    completedRooms: log.completedRooms,
    totalRooms: log.totalRooms,
    totalExperience: log.totalExperience,
    rewardsByRarity,
    autoSellCount: log.autoSellCount,
    autoSellProfit: log.autoSellProfit,
    remainingHp: log.remainingPartyHP,
    maximumHp: log.maxPartyHP,
    completedAt: party.pendingDiaryLog?.createdAt ?? party.diaryLogs.at(-1)?.createdAt ?? null,
  };
}

function buildPartyState(cycle?: ExperimentalPartyCycle) {
  if (!cycle || cycle.state === 'idle') return { id: cycle ? 'state.idle' : 'state.idle', progressKind: 'none', completedSteps: null, totalSteps: null, startedAt: null, endsAt: null };
  if (cycle.state === 'rest' && cycle.restInitialTotalSteps) {
    const elapsed = Math.max(0, Date.now() - cycle.stateStartedAt);
    return { id: 'state.rest', progressKind: 'steps', completedSteps: Math.min(cycle.restInitialTotalSteps, Math.floor(elapsed / Math.max(1, cycle.durationMs))), totalSteps: cycle.restInitialTotalSteps, startedAt: null, endsAt: null };
  }
  return { id: `state.${cycle.state}`, progressKind: 'continuous', completedSteps: null, totalSteps: null, startedAt: cycle.stateStartedAt, endsAt: cycle.stateStartedAt + cycle.durationMs };
}

export function buildExperimentalObservation(
  state: GameState,
  revision: number,
  autoRun: boolean,
  cycles: Record<number, ExperimentalPartyCycle>,
  simulatedAt: number,
) {
  const unlockedDungeonIds = DUNGEONS.filter((dungeon) => dungeon.id !== 99 && state.parties.some((party) => isDungeonEntryUnlocked(party, dungeon.id))).map((dungeon) => dungeon.id);
  const unlockedDeityKeys = getUnlockedDeityKeys(state.global.unlockedDeities);
  const inventoryEntries = Object.entries(state.global.inventory).filter(([, variant]) => variant.count > 0 && variant.status === 'owned');
  const equipmentByCategory = Object.fromEntries(itemCategories.map((category) => {
    const candidates = inventoryEntries.filter(([, variant]) => variant.item.category === category);
    const best = candidates.slice().sort((a, b) => (b[1].item.superRare - a[1].item.superRare) || (b[1].item.enhancement - a[1].item.enhancement) || (b[1].item.id - a[1].item.id))[0];
    return [category, {
      ownedCount: candidates.reduce((sum, [, variant]) => sum + variant.count, 0),
      autoEquipmentCandidateCount: candidates.length,
      bestCandidate: best ? { itemId: best[1].item.id, variantId: best[0], tier: Math.max(1, Math.floor(best[1].item.id / 1000)), rarity: rarity(best[1].item), enhancement: best[1].item.enhancement, superRare: best[1].item.superRare } : null,
    }];
  }));

  const parties = state.parties.slice().sort((a, b) => a.id - b.id).map((party, partyIndex) => {
    const computed = computePartyStats(party);
    const maximumHp = computed.partyStats.hp;
    const selectedDungeon = DUNGEONS.find((entry) => entry.id === party.selectedDungeonId);
    const maximumDifficultyOffset = getDifficultyOffsetMax(selectedDungeon?.expLevel ?? 1);
    const clearGates = selectedDungeon?.id === 99
      ? []
      : [
          ...(party.selectedDungeonId > 1 ? [{
            id: `entry:${party.selectedDungeonId}`,
            kind: 'entering',
            current: party.defeatedBossExpeditions[party.selectedDungeonId - 1] ? 1 : 0,
            required: 1,
            satisfied: isDungeonEntryUnlocked(party, party.selectedDungeonId),
            dungeonId: party.selectedDungeonId,
            floor: 1,
            room: 1,
          }] : []),
          ...Array.from({ length: 5 }, (_, index) => {
            const floor = index + 1;
            const gateKey = getEliteGateKey(party.selectedDungeonId, floor);
            return {
              id: String(gateKey),
              kind: 'clear',
              current: getClearGateProgress(party, gateKey),
              required: CLEAR_GATE_REQUIRED,
              satisfied: isClearGateUnlocked(party, gateKey),
              dungeonId: party.selectedDungeonId,
              floor,
              room: 4,
            };
          }),
          (() => {
            const gateKey = getBossGateKey(party.selectedDungeonId);
            return {
              id: String(gateKey),
              kind: 'clear',
              current: getClearGateProgress(party, gateKey),
              required: CLEAR_GATE_REQUIRED,
              satisfied: isClearGateUnlocked(party, gateKey),
              dungeonId: party.selectedDungeonId,
              floor: 6,
              room: 4,
            };
          })(),
          {
            id: `godBattle:${party.selectedDungeonId}`,
            kind: 'godBattle',
            current: getGodsBattleProgress(party, party.selectedDungeonId),
            required: getGodsBattleRequired(),
            satisfied: Boolean(
              party.defeatedBossExpeditions[party.selectedDungeonId]
              && getGodsBattleProgress(party, party.selectedDungeonId) >= getGodsBattleRequired()
            ),
            dungeonId: party.selectedDungeonId,
            floor: null,
            room: null,
          },
        ];
    const assignableDeityIds = unlockedDeityKeys
      .filter((deityKey) => !getDeityAssignmentConflict(state.parties, party.id, deityKey))
      .map(deityId);
    const characterActions = party.characters.flatMap((character) => [
      { type: 'update_character_build', partyId: party.id, characterId: character.id, constraints: { preflightOperation: '/experimental/v1/build-options', editableFields: character.isUnique ? ['mainClassId', 'subClassId'] : ['name', 'gender', 'raceId', 'lineageId', 'predispositionId', 'mainClassId', 'subClassId', 'mimorianEnemyId'] } },
      { type: 'reorder_character', partyId: party.id, characterId: character.id, constraints: { minimumRow: 1, maximumRow: party.characters.length } },
      { type: 'set_auto_equipment_mode', partyId: party.id, characterId: character.id, constraints: { modes: [0, 1, 2] } },
      { type: 'run_auto_equipment', partyId: party.id, characterId: character.id, constraints: {} },
    ]);
    return {
      id: party.id,
      name: party.name,
      level: party.level,
      experience: party.experience,
      experienceToNext: party.level >= MAX_LEVEL ? null : getXpToNextLevel(party.level),
      hp: { current: party.currentHp, maximum: maximumHp },
      condition: { value: party.condition, key: conditionKey(party.condition) },
      deityId: deityId(party.deity.name),
      state: buildPartyState(cycles[partyIndex]),
      automation: { jewelPriority: state.global.jewelAutoEquipPriorityPartyId === party.id },
      expedition: {
        destinationMode: party.expeditionDestinationMode,
        selectedDungeonId: party.selectedDungeonId,
        depthLimit: party.expeditionDepthLimit,
        difficultyOffset: party.expeditionDifficultyOffsetByDungeon[party.selectedDungeonId] ?? party.expeditionDifficultyOffset,
        maximumDifficultyOffset,
        instantExpeditionStock: party.instantExpeditionStock ?? 0,
        instantExpeditionChargeStartedAt: party.instantExpeditionChargeStartedAt ?? null,
        normalSortieAvailable: unlockedDungeonIds.includes(party.selectedDungeonId) && maximumHp > 0,
        godBattleAvailable: Boolean(
          party.defeatedBossExpeditions[party.selectedDungeonId]
          && getGodsBattleProgress(party, party.selectedDungeonId) >= getGodsBattleRequired()
          && (party.instantExpeditionStock ?? 0) > 0
          && !autoRun
        ),
      },
      clearGates,
      sideQuest: party.sideQuest ? { ...party.sideQuest } : null,
      characters: party.characters.map((character, row) => {
        const stats = computed.characterStats[row];
        return {
          id: character.id,
          row: row + 1,
          isUnique: Boolean(character.isUnique),
          build: { name: character.name, gender: character.gender, raceId: character.raceId, lineageId: character.raceId === 'mimorian' ? null : character.lineageId, predispositionId: character.raceId === 'mimorian' ? null : character.predispositionId, mainClassId: character.mainClassId, subClassId: character.subClassId, mimorianEnemyId: character.raceId === 'mimorian' ? character.mimorianEnemyId ?? null : null },
          autoEquipmentMode: character.autoEquipmentMode ?? 0,
          computed: stats ? { maximumEquipmentSlots: stats.maxEquipSlots, baseStats: stats.baseStats, rangedAttack: stats.rangedAttack, rangedNumberOfAttacks: stats.rangedNoA, magicalAttack: stats.magicalAttack, magicalNumberOfAttacks: stats.magicalNoA, meleeAttack: stats.meleeAttack, meleeNumberOfAttacks: stats.meleeNoA, physicalDefense: stats.physicalDefense, magicalDefense: stats.magicalDefense, accuracy: stats.accuracyBonus, evasion: stats.evasionBonus, elementalOffense: stats.elementalOffense, elementalResistance: stats.elementalDefenseMultipliers, abilities: stats.abilities.map((ability) => ({ id: ability.id, level: ability.level })) } : null,
          equipment: character.equipment.slice(0, stats?.maxEquipSlots ?? character.equipment.length).map((item, slotIndex) => ({ slotIndex, locked: Boolean(item?.isLocked), item: item ? { itemId: item.id, variantId: getVariantKey(item), category: item.category, tier: Math.max(1, Math.floor(item.id / 1000)), rarity: rarity(item), enhancement: item.enhancement, superRare: item.superRare, rawStats: { ...item, jewel: undefined, isLocked: undefined, isNew: undefined }, jewel: item.jewel ?? null } : null })),
        };
      }),
      latestExpedition: latestExpedition(party),
      _legalActions: [
        ...characterActions,
        { type: 'set_deity', partyId: party.id, characterId: null, constraints: { deityIds: assignableDeityIds } },
        { type: 'run_auto_equipment', partyId: party.id, characterId: null, constraints: {} },
        { type: 'set_jewel_priority_party', partyId: party.id, characterId: null, constraints: {} },
        { type: 'set_expedition_destination', partyId: party.id, characterId: null, constraints: { modes: ['auto', 'fixed'], dungeonIds: unlockedDungeonIds } },
        { type: 'set_expedition_depth', partyId: party.id, characterId: null, constraints: { depthLimits: ['1f-3', '1f-4', '2f-3', '2f-4', '3f-3', '3f-4', '4f-3', '4f-4', '5f-3', '5f-4', 'beforeBoss', 'all'] } },
        { type: 'set_expedition_difficulty', partyId: party.id, characterId: null, constraints: { minimum: 0, maximum: maximumDifficultyOffset, step: 2 } },
        ...(party.characters.flatMap((character) => character.equipment.flatMap((item, slotIndex) => item && (character.autoEquipmentMode ?? 0) === 2 ? [{ type: 'toggle_equipment_lock', partyId: party.id, characterId: character.id, constraints: { slotIndex } }] : []))),
        ...(unlockedDungeonIds.includes(party.selectedDungeonId) && maximumHp > 0 ? [{ type: 'sortie', partyId: party.id, characterId: null, constraints: { minimumCount: 1, maximumCount: 100 } }] : []),
        ...(
          party.defeatedBossExpeditions[party.selectedDungeonId]
          && getGodsBattleProgress(party, party.selectedDungeonId) >= getGodsBattleRequired()
          && (party.instantExpeditionStock ?? 0) > 0
          && !autoRun
            ? [{ type: 'god_battle', partyId: party.id, characterId: null, constraints: {} }]
            : []
        ),
      ],
    };
  });
  const legalActions: Array<{ type: string; partyId: number | null; characterId: number | null; constraints: Record<string, unknown> }> = [
    ...parties.flatMap((party) => party._legalActions),
    { type: 'set_auto_run', partyId: null, characterId: null, constraints: { enabled: [true, false] } },
  ];
  return {
    revision,
    observedAt: Date.now(),
    simulatedAt,
    environment: getEnvironmentId(),
    language: state.global.language,
    resources: { gold: state.global.gold, prana: state.global.prana, jewelsByKeyAndRank: { ...state.global.jewels } },
    automation: { autoRun },
    progression: { unlockedPartyIds: parties.map((party) => party.id), unlockedDungeonIds, unlockedDeityIds: unlockedDeityKeys.map(deityId) },
    catalogs: {
      selectableRaceIds: RACES.map((race) => race.id),
      selectableClassIds: CLASSES.map((entry) => entry.id),
      selectablePredispositionIds: PREDISPOSITIONS.filter((entry) => entry.selectable).map((entry) => entry.id),
      selectableLineageIds: LINEAGES.filter((entry) => entry.selectable).map((entry) => entry.id),
      unlockedMimorianEnemyIds: [...state.global.unlockedMimorianEnemyIds].sort((a, b) => a - b),
      dungeons: DUNGEONS.filter((entry) => unlockedDungeonIds.includes(entry.id)).map((entry) => ({ id: entry.id, tier: entry.tier, displayName: entry.name })),
      deities: DEITY_OPTIONS.filter((entry) => unlockedDeityKeys.includes(entry.key)).map((entry) => {
        const assignedParty = entry.key === 'None'
          ? null
          : state.parties.find((party) => getDeityKey(party.deity.name) === entry.key) ?? null;
        return {
          id: deityId(entry.key),
          displayName: entry.name,
          assignedPartyId: assignedParty?.id ?? null,
          assignedPartyName: assignedParty?.name ?? null,
        };
      }),
    },
    inventory: { equipmentByCategory },
    parties: parties.map(({ _legalActions: _discard, ...party }) => party),
    legalActions,
  };
}

export function outcomeFromParty(party: Party): 'Clear' | 'Turned_Back' | 'Draw_Retreat' | 'Wounded_Retreat' | 'Defeat' {
  const log = party.lastExpeditionLog;
  if (!log) return 'Turned_Back';
  if (log.finalOutcome === 'Clear') return 'Clear';
  if (log.finalOutcome === 'Defeat') return 'Defeat';
  if (log.entries.at(-1)?.outcome === 'draw') return 'Draw_Retreat';
  return log.completedRooms === 0 ? 'Turned_Back' : 'Wounded_Retreat';
}
