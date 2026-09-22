import { CLASSES } from '../../data/classes.ts';
import { projectDelivery, type ApiV1DeliveryRecord } from './deliveries.ts';
import { DEVELOPER_NEWS_ITEMS } from '../../data/developerNews.ts';
import { ENEMIES } from '../../data/enemies.ts';
import { ITEMS, SUPER_RARE_TITLES } from '../../data/items.ts';
import { LINEAGES } from '../../data/lineages.ts';
import { PREDISPOSITIONS } from '../../data/predispositions.ts';
import { RACES } from '../../data/races.ts';
import { renderDiaryMetadata } from '../../game/compactDiary.ts';
import { getDeityId, getDeityRank, getNextRankDonationRequirement, isNoFaithDeity, normalizeDeityName } from '../../game/deity.ts';
import { getInstantExpeditionChargeState } from '../../game/instantExpedition.ts';
import { evaluateEquipmentSet, getSavedEquipmentSlot } from '../../game/equipmentSets.ts';
import { computeCharacterStatsInParty, computePartyStats } from '../../game/partyComputation.ts';
import { buildCalculatedStatus } from './calculatedStatus.ts';
import { getItemBasePower } from '../../game/itemPower.ts';
import { evaluateItemForCharacter } from '../../game/itemEvaluation.ts';
import { getItemRarityById } from '../../game/itemRarity.ts';
import { describeBonuses, describeItem, describeJewel, formatItemDetails, type ItemDetails, type ItemDetailsMode } from './itemDetails.ts';
import { formatEquipmentEntry, formatItem, parseEquipmentChange, parseEvaluatedItemFormat } from './itemFormat.ts';
import { isJewelAllowedForCategory, JEWEL_DEFS } from '../../game/jewel.ts';
import { describeEquipmentHistory, type EquipmentHistoryBag } from './equipmentHistoryFacts.ts';
import { apiExpeditionOutcomeOrNull } from './expeditionOutcome.ts';
import { buildBattleLogData, buildBattleRoomData, buildRoomResources } from './battleLogs.ts';
import { buildSimulationRunData } from './simulationView.ts';
import { EQUIPMENT_EVALUATION_LIMIT } from './requestLimits.ts';
import { describeUiPreferenceCatalog, listUiPreferences } from './uiPreferenceCatalog.ts';
import { getExpeditionGoals, getSideQuestFacts } from '../../game/expeditionGoals.ts';
import { getEstimatedStartHp, getPartyStateProgress } from '../../game/partyStateProgress.ts';
import { DIFFICULTY_OFFSET_STEP, EXPEDITION_DEPTH_LIMITS, getSelectableDestinationIds, getSelectableDifficultyOffsetMax } from '../../game/expeditionSettings.ts';
import { getSortieUnavailableReason } from './sortieAvailability.ts';
import { getXpToNextLevel } from '../../game/partyLevel.ts';
import { getShopFacts, shopLineupInputOf } from '../../game/shopFacts.ts';
import { getStackSale } from '../../game/inventoryMutation.ts';
import { getSuperRareItemPrana, MAX_ALTAR_LEVEL } from '../../game/prana.ts';
import { getJewelOwnedCount } from '../../game/jewel.ts';
import { getAltarCategoryFacts, getAltarEnemyTypes, getEnemyFormFacts } from '../../game/altarFacts.ts';
import { getEnemyIndividualBonuses, getEnemyTypeBonuses, getMimorianEnemyAbilities } from '../../data/enemies.ts';
import type { ApiV1PartyCycleView } from './commitOperations.ts';
import { MAX_LEVEL, type EnemyDef, type ExpeditionLog, type ExpeditionSimulationResult, type GameState, type Item, type JewelKey, type Party } from '../../types/index.ts';

// SpecRef: 9.1.4.7 | Observation projections | transport-neutral read models

export interface ApiV1HeaderRuntime {
  /** The Debug-pane time speed: `realtime`, `x1_2`, `x5`, `x20`, `x100`, or `unlimited`. */
  readonly timeSpeed: string;
  /** Wall-clock expiry of the progress-report Speed of Time bonus, or `null` when none is active. */
  readonly bonusUntilMs: number | null;
  readonly autoRepeat: boolean;
  /** Whether a progress-report destination is configured for this environment. */
  readonly progressReportConfigured: boolean;
}

export interface ApiV1ReadContext {
  readonly revision: number;
  readonly environment: string;
  readonly gameMode: 'mode.normal' | 'mode.orca';
  readonly enemyLevelOffset: number;
  readonly inGameTime: number;
  readonly simulation?: (partyIndex: number, count: number) => Promise<unknown>;
  /** The live party cycle of a party (by index) for the ordinary player's runtime; absent for an API account. */
  readonly partyCycle?: (partyIndex: number) => ApiV1PartyCycleView | undefined;
  /**
   * The expedition log the UI has disclosed for a party (by index): while a party is in `state.explore` this is the log from
   * before the running exploration, so the result is not spoiled (Spec 8.3, Update Timing). `undefined` means no runtime
   * memory, and the newest log is used.
   */
  readonly disclosedLog?: (partyIndex: number) => ExpeditionLog | null | undefined;
  /**
   * The header facts the ordinary player's runtime owns outside the save: the Debug-pane base Speed of Time, the
   * progress-report bonus expiry, and the auto-repeat switch. Absent for an API account, which has none of them.
   */
  /** The Colosseum Debug setting of the ordinary player's runtime; absent for an API account. */
  readonly colosseumEnabled?: boolean;
  readonly headerRuntime?: () => ApiV1HeaderRuntime;
  /** The Instant Expedition charge clock scale (the current Speed of Time); 1 when omitted. */
  readonly chargeDurationScale?: number;
  readonly control?: { settings?: Record<string, unknown>; deliveries?: unknown[]; equipmentHistory?: Record<string, EquipmentHistoryBag> };
}

const SPEED_OF_TIME_KEYS: Record<string, string> = { realtime: 'real', x1_2: 'x1.2', x5: 'x5', x20: 'x20', x100: 'x100', unlimited: 'unlimited' };

// SpecRef: 8.1.2 | Header | Speed of Time
// SpecRef: 9.1.4.7 | Observation projections | overview
function overviewProjection(state: GameState, context: ApiV1ReadContext) {
  const runtime = context.headerRuntime?.();
  const bonusActive = runtime?.bonusUntilMs != null && runtime.bonusUntilMs > Date.now();
  return {
    gameMode: context.gameMode,
    inGameTime: new Date(context.inGameTime).toISOString(),
    gold: state.global.gold,
    prana: state.global.prana,
    environment: context.environment,
    unreadDiary: state.parties.reduce((sum, party) => sum + party.diaryLogs.filter((entry) => !entry.isRead).length, 0),
    speedOfTime: runtime ? {
      base: SPEED_OF_TIME_KEYS[runtime.timeSpeed] ?? 'real',
      scale: context.chargeDurationScale ?? 1,
      bonusActive,
      bonusUntil: bonusActive ? new Date(runtime.bonusUntilMs!).toISOString() : null,
    } : null,
    autoRepeat: runtime ? runtime.autoRepeat : null,
    progressReportInfo: { available: runtime?.progressReportConfigured ?? false, bonusActive },
  };
}

function itemFormat(item: Item): string {
  return formatItem(item, item.isLocked === true);
}

function equipmentEntry(item: Item | null, slotIndex: number): string {
  return item ? formatEquipmentEntry(slotIndex, item, item.isLocked === true, item.jewel) : '0';
}

function partyByNumber(state: GameState, value: unknown): { party: Party; index: number } | null {
  const partyNumber = Number(value);
  const index = state.parties.findIndex((party) => party.id === partyNumber);
  return index >= 0 ? { party: state.parties[index], index } : null;
}

function findCharacter(state: GameState, value: unknown) {
  const characterId = Number(value);
  for (let partyIndex = 0; partyIndex < state.parties.length; partyIndex += 1) {
    const characterIndex = state.parties[partyIndex].characters.findIndex((character) => character.id === characterId);
    if (characterIndex >= 0) return { party: state.parties[partyIndex], partyIndex, character: state.parties[partyIndex].characters[characterIndex], characterIndex };
  }
  return null;
}

function compactObservation(state: GameState, context: ApiV1ReadContext, simulations: string[]) {
  return {
    globalInfo: { gameMode: context.gameMode, inGameTime: new Date(context.inGameTime).toISOString(), gold: state.global.gold, prana: state.global.prana },
    partyInfo: state.parties.map((party, partyIndex) => ({
      party: {
        partyNumber: party.id,
        level: party.level,
        experiencePoint: `${Math.floor((party.experience / Math.max(1, getXpToNextLevel(party.level))) * 100)}%/${party.experience}/${getXpToNextLevel(party.level)}`,
        deity: getDeityId(party.deity.name),
        deityRank: getDeityRank(state.global.deityDonations[normalizeDeityName(party.deity.name)] ?? party.deityGold ?? 0),
        condition: party.condition,
      },
      state: partyStateKey(party, computePartyStats(party).partyStats.hp, context.partyCycle?.(partyIndex)),
      lastDestination: disclosedLogOf(state, context, partyIndex)?.dungeonId ?? party.selectedDungeonId,
      lastOutcome: apiExpeditionOutcomeOrNull(disclosedLogOf(state, context, partyIndex)),
    })),
    attention: {
      latestSimulationResult: simulations,
      emptyEquipmentSlot: state.parties.flatMap((party) => party.characters.flatMap((character) => {
        const empty = Math.max(0, computePartyStats(party).characterStats.find((entry) => entry.characterId === character.id)!.maxEquipSlots - character.equipment.filter(Boolean).length);
        return empty > 0 ? [`${character.id}/${empty}`] : [];
      })),
      notification: state.parties.map((party) => ({
        partyNumber: party.id,
        unreadDiary: party.diaryLogs.filter((entry) => !entry.isRead).length,
        unreadDiaryTitle: party.diaryLogs.filter((entry) => !entry.isRead).map((entry) => `${entry.id}/${entry.triggers.join('+')}/${entry.expeditionLog.dungeonName}/${new Date(entry.createdAt).toISOString()}`),
      })),
    },
  };
}

/** The log a client may see for a party: the disclosed log while the runtime hides a running exploration, else the newest one. */
function disclosedLogOf(state: GameState, context: ApiV1ReadContext, partyIndex: number): ExpeditionLog | null {
  const disclosed = context.disclosedLog?.(partyIndex);
  return disclosed !== undefined ? disclosed : state.parties[partyIndex].lastExpeditionLog;
}

/**
 * `state.<name>` of a party: the live cycle when the ordinary player's runtime is the actor, otherwise the resume state of
 * Spec 5.1.1 (below maximum HP the party rests, else it is idle) because an API account has no live cycle.
 */
function partyStateKey(party: Party, maximumHp: number, cycle: ApiV1PartyCycleView | undefined): string {
  if (cycle) return `state.${cycle.state}`;
  return party.currentHp < maximumHp ? 'state.rest' : 'state.idle';
}

// SpecRef: 8.3 | UI_EXPEDITION | Progress Visual Update
// SpecRef: 9.1.4.7 | Observation projections | expedition
// Everything the Expedition pane draws for a party, from the party and its live cycle. While a party is exploring, the
// rooms of the running log are revealed only as the exploration clock reaches them (server-gated): a client never receives a
// room, an HP value, or an outcome from the future, and `nextRevealAt` says when to read again.
function expeditionProjection(state: GameState, context: ApiV1ReadContext) {
  const nowMs = Date.now();
  const chargeScale = context.chargeDurationScale ?? 1;
  return {
    parties: state.parties.map((party, partyIndex) => {
      const computed = computePartyStats(party);
      const maximumHp = computed.partyStats.hp;
      const charge = getInstantExpeditionChargeState(party, nowMs, chargeScale);
      const cycle = context.partyCycle?.(partyIndex);
      const timed = cycle && typeof cycle.stateStartedAt === 'number' && typeof cycle.durationMs === 'number' && cycle.state !== 'idle' && cycle.state !== 'reactivate';
      const log = disclosedLogOf(state, context, partyIndex);
      const runningLog = cycle?.state === 'explore' ? party.lastExpeditionLog : null;
      const progress = timed
        ? getPartyStateProgress({
          clock: { state: cycle.state, stateStartedAt: cycle.stateStartedAt!, durationMs: cycle.durationMs!, restInitialTotalSteps: cycle.restInitialTotalSteps },
          party,
          maximumHp,
          nowMs,
          log: runningLog,
        })
        : null;
      const revealed = runningLog && progress?.revealedRoomCount != null ? runningLog.entries.slice(0, progress.revealedRoomCount) : [];
      const displayedHp = runningLog && runningLog.entries.length > 0
        ? (revealed.length === 0 ? getEstimatedStartHp(runningLog.entries[0]) : revealed[revealed.length - 1].remainingPartyHP)
        : party.currentHp;
      const sortieReason = (godsBattle: boolean) => getSortieUnavailableReason({ party, godsBattle, hp: displayedHp, maximumHp, chargeStock: charge.stock, cycle });
      const control = (godsBattle: boolean) => {
        const reason = sortieReason(godsBattle);
        return { available: reason === null, unavailableReason: reason };
      };
      const sideQuest = getSideQuestFacts(party, chargeScale, nowMs);
      return {
        partyNumber: party.id,
        name: party.name,
        state: partyStateKey(party, maximumHp, cycle),
        // The state's own clock (the runtime's wall-clock time): clients interpolate progress between the two instants.
        stateStartedAt: timed ? new Date(cycle.stateStartedAt!).toISOString() : null,
        stateDurationMs: timed ? cycle.durationMs! : null,
        stateExpectedEndAt: timed ? new Date(cycle.stateStartedAt! + cycle.durationMs!).toISOString() : null,
        progress: progress && {
          kind: progress.kind,
          mainPercent: progress.mainPercent,
          totalSteps: progress.totalSteps,
          completedSteps: progress.completedSteps,
          subProgress: progress.subProgress && { startedAt: new Date(progress.subProgress.startedAt).toISOString(), endsAt: new Date(progress.subProgress.endsAt).toISOString() },
          nextChangeAt: progress.nextChangeAt === null ? null : new Date(progress.nextChangeAt).toISOString(),
        },
        exploration: runningLog && progress ? {
          dungeonId: runningLog.dungeonId,
          difficultyOffset: runningLog.difficultyOffset ?? 0,
          totalRooms: runningLog.totalRooms,
          revealedRoomCount: revealed.length,
          nextRevealAt: progress.nextChangeAt === null ? null : new Date(progress.nextChangeAt).toISOString(),
          // The revealed rooms in full (the same public room shape as `latestBattleLog`), so the pane renders the running
          // exploration without ever holding a room from the future.
          rooms: revealed.map(buildBattleRoomData),
          resources: { rooms: revealed.map(buildRoomResources), compact: runningLog.compactVersion === 1 },
        } : null,
        currentHp: displayedHp,
        maximumHp,
        disclosedFloor: log?.entries.at(-1)?.floor ?? null,
        disclosedOutcome: apiExpeditionOutcomeOrNull(log),
        destination: party.selectedDungeonId,
        destinationMode: party.expeditionDestinationMode,
        depthLimit: party.expeditionDepthLimit,
        difficultyOffset: party.expeditionDifficultyOffset,
        chargeStock: charge.stock,
        chargeDuration: charge.remainingMs <= 0 ? 0 : Math.ceil(charge.remainingMs / 1000),
        clearGates: getExpeditionGoals(party, cycle?.state).map((goal) => {
          if (goal.kind === 'eliteGate') return { kind: goal.kind, dungeonId: goal.dungeonId, floor: goal.floor, current: goal.current, required: goal.required };
          if (goal.kind === 'bossGate') return { kind: goal.kind, dungeonId: goal.dungeonId, floor: null, current: goal.current, required: goal.required };
          if (goal.kind === 'godGate') return { kind: goal.kind, dungeonId: goal.dungeonId, floor: null, current: goal.collected, required: goal.required };
          if (goal.kind === 'entryGate') return { kind: goal.kind, dungeonId: goal.nextDungeonId, floor: null, current: 0, required: 1 };
          return { kind: goal.kind, dungeonId: goal.dungeonId, floor: null, current: 0, required: 1 };
        }),
        sideQuest,
        controls: { sortie: control(false), godsBattle: control(true) },
      };
    }),
  };
}

function partyProjection(state: GameState, parameters: Record<string, unknown>) {
  const selected = partyByNumber(state, parameters.partyNumber) ?? { party: state.parties[state.selectedPartyIndex] ?? state.parties[0], index: state.selectedPartyIndex };
  const party = selected.party;
  const partyStatus = computePartyStats(party);
  const computed = partyStatus.characterStats;
  return {
    effectiveSelection: { partyNumber: party.id, characterId: Number(parameters.characterId) || party.characters[0]?.id || null },
    party: {
      partyNumber: party.id,
      name: party.name,
      level: party.level,
      experience: party.experience,
      experienceToNext: party.level < MAX_LEVEL ? Math.ceil(getXpToNextLevel(party.level)) : 0,
      maxHp: Math.floor(partyStatus.partyStats.hp),
      deityId: getDeityId(party.deity.name),
      deityRank: getDeityRank(state.global.deityDonations[normalizeDeityName(party.deity.name)] ?? party.deityGold ?? 0),
      condition: party.condition,
      order: party.characters.map((character) => character.id),
      characters: party.characters.map((character, index) => ({
        characterId: character.id,
        name: character.name,
        raceId: character.raceId,
        gender: character.gender,
        mainClassId: character.mainClassId,
        subClassId: character.subClassId,
        lineageId: character.lineageId,
        predispositionId: character.predispositionId,
        isUnique: character.isUnique === true,
        mimorianEnemyId: character.mimorianEnemyId ?? null,
        calculatedStatus: buildCalculatedStatus(character, computed[index], party.level),
        equipment: character.equipment.map(equipmentEntry),
        autoEquipmentMode: character.autoEquipmentMode,
      })),
    },
  };
}

// SpecRef: 9.1.3 | 2-4-1 searchItems | Item category filter
const API_CATEGORY_TO_ITEM_CATEGORY: Record<string, string> = { sword: 'sword', katana: 'katana', bow: 'archery', armor: 'armor', glove: 'gauntlet', wand: 'wand', robe: 'robe', shield: 'shield', bolt: 'bolt', book: 'grimoire', catalyst: 'catalyst', arrow: 'arrow' };

/**
 * Searches the items known to the player (9.1.3, 2-4-1). Every result is one string in `items`:
 * - inventory stacks: `<Item Format>/<quantity>/<calculatedBasePower>`;
 * - character-assigned items: `<Item Format>/<characterId>/<jewelType>:<jewelRank>/<calculatedBasePower>` (`0:0` without a Jewel);
 * - the `jewel` category: unassigned Jewels as `<jewelType>:<jewelRank>/<quantity>` and assigned Jewels as character-assigned items.
 * `state` selects owned stacks, character-assigned (`equipped`) items, sold stacks, or all. The fields chosen by `details`
 * follow in the fixed order ability, cBonus, otherBonus. Equipment is sorted by higher calculated base power, then higher
 * item id, then higher Jewel rank (remaining ties: higher enhancement, higher Super Rare title, stack before
 * character-assigned, lower character id). Unassigned Jewels come first, by higher rank, then higher Jewel type. `limit`
 * (default 10, at most 5000) is applied after filtering and sorting.
 */
const SEARCH_ITEMS_DEFAULT_LIMIT = 10;
const SEARCH_ITEMS_MAX_LIMIT = 5000;

function searchItems(state: GameState, parameters: Record<string, unknown>) {
  const wantedState = String(parameters.state ?? 'owned');
  const category = parameters.category === undefined ? null : String(parameters.category);
  const mode = String(parameters.details ?? 'abilityAndCBonus') as ItemDetailsMode;
  const limit = parameters.limit === undefined ? SEARCH_ITEMS_DEFAULT_LIMIT : Number(parameters.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > SEARCH_ITEMS_MAX_LIMIT) throw new Error('invalid_request:limit');
  const searchAbility = parameters.searchAbility === undefined ? null : String(parameters.searchAbility);
  const searchBonus = parameters.searchBonus === undefined ? null : String(parameters.searchBonus);
  const includesState = (name: 'owned' | 'sold' | 'equipped') => wantedState === 'all' || wantedState === name;
  const itemFilterGiven = (parameters.rarity !== undefined && parameters.rarity !== 'all') || parameters.superRare !== undefined
    || parameters.superRareId !== undefined || parameters.itemId !== undefined;

  const matchesItem = (item: Item): boolean => {
    if (category !== null && category !== 'jewel' && item.category !== API_CATEGORY_TO_ITEM_CATEGORY[category]) return false;
    if (parameters.rarity !== undefined && parameters.rarity !== 'all' && getItemRarityById(item.id) !== parameters.rarity) return false;
    if (parameters.superRare !== undefined && (item.superRare > 0) !== (parameters.superRare === true || parameters.superRare === 'true')) return false;
    if (parameters.superRareId !== undefined && item.superRare !== Number(parameters.superRareId)) return false;
    if (parameters.itemId !== undefined && item.id !== Number(parameters.itemId)) return false;
    return true;
  };
  const matchesDetails = (details: ItemDetails): boolean => (searchAbility === null || details.ability.some((entry) => entry.split(':')[0] === searchAbility))
    && (searchBonus === null || details.cBonus.includes(searchBonus) || details.otherBonus.includes(searchBonus));
  const withDetails = (base: string, details: ItemDetails) => [base, ...formatItemDetails(details, mode)].join('/');

  // Sort keys are compared ascending, so "higher first" values are negated.
  type Entry = { order: number[]; text: string };
  const entries: Entry[] = [];
  const jewelText = (jewel: { key: string; rank: number } | null | undefined) => jewel ? `${jewel.key}:${jewel.rank}` : '0:0';
  const equipmentOrder = (item: Item, kind: 0 | 1, characterId: number) => [1, -getItemBasePower(item), -item.id, -(item.jewel?.rank ?? 0), -item.enhancement, -item.superRare, kind, characterId];

  if (category !== 'jewel') {
    for (const variant of Object.values(state.global.inventory)) {
      const status = variant.status === 'owned' ? 'owned' : variant.status === 'sold' ? 'sold' : null;
      if (!status || !includesState(status) || (status === 'owned' && variant.count < 1) || !matchesItem(variant.item)) continue;
      const details = describeItem(variant.item);
      if (matchesDetails(details)) entries.push({ order: equipmentOrder(variant.item, 0, 0), text: withDetails(`${itemFormat(variant.item)}/${variant.count}/${getItemBasePower(variant.item)}`, details) });
    }
  } else if (!itemFilterGiven && includesState('owned')) {
    for (const [key, count] of Object.entries(state.global.jewels)) {
      const [jewelKey, rank] = key.split(':');
      if (count < 1 || !(jewelKey in JEWEL_DEFS)) continue;
      const details = describeJewel(jewelKey as JewelKey, Number(rank));
      if (matchesDetails(details)) entries.push({ order: [0, -Number(rank), -Object.keys(JEWEL_DEFS).indexOf(jewelKey), 0, 0, 0, 0, 0], text: withDetails(`${key}/${count}`, details) });
    }
  }
  if (includesState('equipped')) {
    for (const party of state.parties) {
      for (const character of party.characters) {
        for (const item of character.equipment) {
          if (!item || !matchesItem(item) || (category === 'jewel' && !item.jewel)) continue;
          const details = category === 'jewel' && item.jewel ? describeJewel(item.jewel.key, item.jewel.rank) : describeItem(item);
          if (matchesDetails(details)) entries.push({ order: equipmentOrder(item, 1, character.id), text: withDetails(`${itemFormat(item)}/${character.id}/${jewelText(item.jewel)}/${getItemBasePower(item)}`, details) });
        }
      }
    }
  }
  entries.sort((left, right) => { for (let index = 0; index < left.order.length; index += 1) { const difference = left.order[index] - right.order[index]; if (difference !== 0) return difference; } return 0; });
  return { items: entries.slice(0, limit).map((entry) => entry.text) };
}

export function buildApiV1PartyObservationForTesting(state: GameState) {
  return { parties: state.parties.map((party) => partyProjection(state, { partyNumber: party.id }).party) };
}

// SpecRef: 8.4.1 | Shop (お店) | Lineup, Dialogue by intimacy, Paid Refresh
// The shop at one instant (the request's clock), from the same shared facts the Shop pane uses.
function shopProjection(state: GameState, nowMs: number) {
  const facts = getShopFacts(shopLineupInputOf(state), new Date(nowMs));
  return {
    lineupId: facts.lineupId,
    intimacy: facts.intimacy,
    dialogue: { key: facts.dialogueKey, args: {} },
    paidRefreshCountdown: facts.refreshCountdownSeconds,
    paidRefreshPrice: facts.paidRefreshPrice,
    paidRefresh: { available: facts.paidRefreshAvailable, unavailableReason: facts.paidRefreshAvailable ? null : 'insufficient_gold' },
    refreshesAt: new Date(facts.refreshesAt).toISOString(),
    entries: facts.entries.map((entry) => ({ shopItemId: entry.shopItemId, itemId: entry.itemId, price: entry.price, rarity: entry.rarity, soldOut: entry.soldOut, available: entry.available, unavailableReason: entry.unavailableReason })),
  };
}

// SpecRef: 8.4.5 | Altar (祭壇)
function altarGlobal(state: GameState) {
  return { prana: state.global.prana, altarVictoriesByEnemyType: state.global.altarVictoriesByEnemyType, unlockedMimorianEnemyIds: state.global.unlockedMimorianEnemyIds };
}

/** The Alter level and victories of every enemy category; the individual forms are read through `enemyFormList`. */
function altarProjection(state: GameState) {
  const global = altarGlobal(state);
  return {
    prana: state.global.prana,
    maximumAltarLevel: MAX_ALTAR_LEVEL,
    categories: getAltarEnemyTypes().map((enemyType) => getAltarCategoryFacts(global, enemyType)),
    unlockedEnemyIds: [...state.global.unlockedMimorianEnemyIds],
  };
}

/** One enemy form: its abilities and bonuses as a Mimorian would copy them, its cost, and why it cannot be unlocked. */
function enemyFormEntry(state: GameState, enemy: EnemyDef) {
  const facts = getEnemyFormFacts(altarGlobal(state), enemy);
  const abilities = getMimorianEnemyAbilities(enemy);
  const bonuses = describeBonuses([...getEnemyTypeBonuses(enemy.enemyType), ...getEnemyIndividualBonuses(enemy.id)]);
  return {
    enemyId: enemy.id,
    enemyName: enemy.name,
    nameKey: enemy.nameKey ?? null,
    enemyType: enemy.enemyType,
    enemyTier: enemy.isGodEnemy ? 'divine' as const : enemy.type,
    enemyAbility: abilities.map((ability) => ({ abilityId: `a.${ability.id.replace(/_/g, '-')}`, level: ability.level })),
    enemyBonus: [...bonuses.cBonus, ...bonuses.otherBonus],
    unlockCost: facts.unlockCost,
    unlockCondition: { requiredAltarLevel: facts.requiredAltarLevel, currentAltarLevel: facts.currentAltarLevel, met: facts.currentAltarLevel >= facts.requiredAltarLevel },
    unlocked: facts.unlocked,
    unlockable: { available: facts.unavailableReason === null, unavailableReason: facts.unavailableReason },
  };
}

// SpecRef: 8.4.2 | Inventory(所持品)
// The inventory as the Inventory pane shows it: every variant with its state, count, highlight, and what selling it pays; the
// Jewels held; and every item worn by a character with its owner (a Jewel is listed with the item it is attached to).
function inventoryProjection(state: GameState) {
  const authorities = { getPrana: getSuperRareItemPrana };
  const jewels = (Object.keys(JEWEL_DEFS) as JewelKey[]).flatMap((jewelKey) => Array.from({ length: 8 }, (_, index) => ({ jewelKey, rank: index + 1, quantity: getJewelOwnedCount(state.global.jewels, jewelKey, index + 1) })))
    .filter((entry) => entry.quantity > 0);
  const computedByParty = state.parties.map((party) => computePartyStats(party).characterStats);
  const equippedItems = state.parties.flatMap((party, partyIndex) => party.characters.flatMap((character, memberIndex) => {
    const maxSlots = computedByParty[partyIndex].find((entry) => entry.characterId === character.id)?.maxEquipSlots ?? character.equipment.length;
    return character.equipment.flatMap((item, slotIndex) => item ? [{
      characterId: character.id,
      partyNumber: party.id,
      member: memberIndex + 1,
      slotIndex,
      item: itemFormat(item),
      jewel: item.jewel ? `${item.jewel.key}:${item.jewel.rank}` : null,
      // A slot beyond the character's current slot count keeps its item but does not work, and its Jewel is not counted.
      active: slotIndex < maxSlots,
    }] : []);
  }));
  return {
    inventory: Object.entries(state.global.inventory).map(([variantKey, variant]) => ({
      variantKey,
      item: itemFormat(variant.item),
      quantity: variant.count,
      status: variant.status,
      isNew: variant.isNew === true,
      sale: variant.status === 'owned' && variant.count > 0 ? getStackSale(variant.item, variant.count, authorities) : null,
    })),
    jewels,
    equippedItems,
    jewelPriorityParty: state.global.jewelAutoEquipPriorityPartyId ?? 'none',
  };
}

function baseProjection(state: GameState, context: ApiV1ReadContext) {
  return {
    currencies: { gold: state.global.gold, prana: state.global.prana },
    ...inventoryProjection(state),
    shop: shopProjection(state, context.inGameTime),
    altar: altarProjection(state),
  };
}

function diaryProjection(state: GameState) {
  return {
    unreadTotal: state.parties.reduce((total, party) => total + party.diaryLogs.filter((entry) => !entry.isRead).length, 0),
    parties: state.parties.map((party) => ({ partyNumber: party.id, settings: party.diarySettings, entries: party.diaryLogs.map((entry) => ({ diaryEntryId: entry.id, partyNumber: party.id, occurredAt: new Date(entry.createdAt).toISOString(), unread: !entry.isRead, metadata: renderDiaryMetadata(entry), battleLog: entry.expeditionLog ? { logId: entry.id, availability: { available: true, unavailableReason: null } } : null })) })),
  };
}

export async function buildApiV1ReadData(operationId: string, state: GameState, parameters: Record<string, unknown>, context: ApiV1ReadContext): Promise<Record<string, unknown>> {
  if (operationId === 'read/observation' || operationId === 'read/observation/compact') {
    const simulations: string[] = [];
    for (let index = 0; index < state.parties.length; index += 1) {
      const result = await context.simulation?.(index, 100) as { Clear?: number; Return?: number; Draw?: number; Retreat?: number; Defeat?: number; total?: number } | undefined;
      const total = result?.total ?? 100;
      const percent = (value: number | undefined) => Math.round(((value ?? 0) / total) * 100);
      simulations.push(`PT${state.parties[index].id} / Clear ${percent(result?.Clear)}% / Return ${percent(result?.Return)}% / Draw ${percent(result?.Draw)}% / Retreat ${percent(result?.Retreat)}% / Defeat ${percent(result?.Defeat)}%`);
    }
    return compactObservation(state, context, simulations);
  }
  if (operationId === 'read/observation/overview') return { headerInfo: overviewProjection(state, context) };
  if (operationId === 'read/observation/expedition') return { expeditionInfo: expeditionProjection(state, context) };
  if (operationId === 'read/observation/party') {
    // `parties` lists every unlocked party's deity and members so the party selector and the deity and Mimorian
    // assignment rules do not need the other parties' full projections.
    const parties = state.parties.map((party) => ({
      partyNumber: party.id,
      deityId: getDeityId(party.deity.name),
      characters: party.characters.map((character) => ({ characterId: character.id, name: character.name, raceId: character.raceId, mimorianEnemyId: character.mimorianEnemyId ?? null })),
    }));
    return { partyInfo: { ...partyProjection(state, parameters), parties, unlockedMimorianEnemyIds: [...state.global.unlockedMimorianEnemyIds] } };
  }
  if (operationId === 'read/observation/base') return { baseInfo: baseProjection(state, context) };
  if (operationId === 'read/observation/diary') return { diaryInfo: diaryProjection(state) };
  if (operationId === 'read/observation/setting') return { settingInfo: { language: state.global.language, environment: context.environment, gameMode: context.gameMode, enemyLevelOffset: context.enemyLevelOffset, ...(context.control?.settings ?? {}), uiPreferences: listUiPreferences(state.global.uiPreferences), uiPreferenceCatalog: describeUiPreferenceCatalog() } };

  const expedition = operationId.match(/^read\/expedition\/(\d+)\/(setting|latestBattleLog|simulationRun|chargeStock)$/);
  if (expedition) {
    const selected = partyByNumber(state, expedition[1]);
    if (!selected) throw new Error('not_found');
    const { party, index } = selected;
    if (expedition[2] === 'setting') {
      // SpecRef: 9.1.3 | Read | 2-2-1 {p}/setting
      // The choices are the same shared rules the commit validates against: unlocked destinations (the Colosseum only when
      // enabled), the fixed depth limits, and a difficulty range that stays at 0 until the destination's boss was defeated.
      const maximumOffset = getSelectableDifficultyOffsetMax(party, party.selectedDungeonId);
      return {
        current: { destination: party.selectedDungeonId, destinationMode: party.expeditionDestinationMode, depthLimit: party.expeditionDepthLimit, difficultyOffset: party.expeditionDifficultyOffset },
        validOptions: {
          destination: getSelectableDestinationIds(party, context.colosseumEnabled ?? (context.control?.settings?.debug as { colosseumMode?: unknown } | undefined)?.colosseumMode === true),
          depthLimit: [...EXPEDITION_DEPTH_LIMITS],
          difficultyOffset: { min: 0, max: maximumOffset, step: DIFFICULTY_OFFSET_STEP },
        },
      };
    }
    if (expedition[2] === 'latestBattleLog') {
      // Omitted `logId` selects the party's latest retained log; `diary:<id>` selects the log of one retained Diary entry.
      if (parameters.logId === undefined) return buildBattleLogData(disclosedLogOf(state, context, index), party.id, 'latest');
      const diaryId = /^diary:(.+)$/.exec(String(parameters.logId))?.[1];
      const diary = diaryId === undefined ? undefined : party.diaryLogs.find((entry) => String(entry.id) === diaryId);
      if (!diary) throw new Error('not_found');
      return buildBattleLogData(diary.expeditionLog, party.id, String(parameters.logId));
    }
    if (expedition[2] === 'simulationRun') {
      if (!context.simulation) throw new Error('runtime_unavailable');
      return buildSimulationRunData(await context.simulation(index, 1_000) as ExpeditionSimulationResult, context.revision, crypto.randomUUID());
    }
    const charge = getInstantExpeditionChargeState(party, Date.now(), context.chargeDurationScale ?? 1);
    return { chargeStock: charge.stock, chargeDuration: charge.remainingMs <= 0 ? 0 : Math.ceil(charge.remainingMs / 1000) };
  }

  const partyBuild = operationId.match(/^read\/build\/party\/(\d+)$/);
  if (partyBuild) {
    const selected = partyByNumber(state, partyBuild[1]);
    if (!selected) throw new Error('not_found');
    const currentDeityId = getDeityId(selected.party.deity.name);
    const usedByOtherParties = new Set(state.parties.filter((party) => party.id !== selected.party.id).map((party) => getDeityId(party.deity.name)));
    const deityId = Array.from(new Set(['none', currentDeityId, ...state.global.unlockedDeities.map(getDeityId)]))
      .filter((id) => id === 'none' || id === currentDeityId || !usedByOtherParties.has(id));
    return { current: { deityId: currentDeityId, order: selected.party.characters.map((entry) => entry.id) }, validOptions: { deityId, order: selected.party.characters.map((entry) => entry.id) } };
  }
  const characterRead = operationId.match(/^read\/build\/character\/(\d+)\/(status|equipment|equipmentSet|equipmentEvaluation)$/);
  if (characterRead) {
    const found = findCharacter(state, characterRead[1]);
    if (!found) throw new Error('not_found');
    const { party, character, characterIndex } = found;
    if (characterRead[2] === 'status') {
      const racesAndGender = character.raceId === 'mimorian' && character.mimorianEnemyId != null
        ? `${character.raceId}/${character.gender}/${character.mimorianEnemyId}`
        : `${character.raceId}/${character.gender}`;
      const editableRaceIds = new Set(['lupinian', 'vulpinian', 'felidian', 'caninian', 'ursan', 'procyonian', 'leporian', 'cervin', 'murid']);
      const normalRaceOptions = RACES.filter((race) => editableRaceIds.has(race.id)).flatMap((race) => (['male', 'female'] as const)
        .filter((gender) => !party.characters.some((candidate) => candidate.id !== character.id && candidate.isUnique !== true && candidate.raceId === race.id && candidate.gender === gender))
        .map((gender) => `${race.id}/${gender}`));
      const assignedMimorianForms = new Set(state.parties.flatMap((entry) => entry.characters)
        .filter((candidate) => candidate.id !== character.id && candidate.raceId === 'mimorian')
        .map((candidate) => candidate.mimorianEnemyId));
      const mimorianOptions = state.global.unlockedMimorianEnemyIds
        .filter((enemyId) => ENEMIES.some((enemy) => enemy.id === enemyId) && !assignedMimorianForms.has(enemyId))
        .map((enemyId) => `mimorian/female/${enemyId}`);
      return {
        calculatedStatus: buildCalculatedStatus(party.characters[characterIndex], computePartyStats(party).characterStats[characterIndex], party.level),
        current: { unique: character.isUnique === true, name: character.name, racesAndGender, mainClassId: character.mainClassId, subClassId: character.subClassId, lineage: character.lineageId, predisposition: character.predispositionId },
        editableFields: { name: character.isUnique !== true, unique: character.isUnique === true },
        validOptions: {
          racesAndGender: character.isUnique ? ['none'] : [...normalRaceOptions, ...mimorianOptions],
          mainClassId: CLASSES.map((entry) => entry.id),
          subClassId: CLASSES.map((entry) => entry.id),
          lineage: character.isUnique ? ['none'] : LINEAGES.filter((entry) => entry.selectable === true).map((entry) => entry.id),
          predisposition: character.isUnique ? ['none'] : PREDISPOSITIONS.filter((entry) => entry.selectable === true).map((entry) => entry.id),
        },
      };
    }
    if (characterRead[2] === 'equipment') {
      // Empty slots are counted against the character's real slot count: the equipment array may be shorter.
      const maxSlots = computePartyStats(party).characterStats[characterIndex].maxEquipSlots;
      const emptySlots = Array.from({ length: maxSlots }, (_, slot) => slot).filter((slot) => !character.equipment[slot]).length;
      return {
        current: { mode: character.autoEquipmentMode === 2 ? 'FULL' : character.autoEquipmentMode === 1 ? 'SEMI' : 'OFF', equipment: character.equipment.map(equipmentEntry) },
        validOptions: { mode: ['FULL', 'SEMI', 'OFF'], numberOfEmptyEquipmentSlots: emptySlots, ...describeEquipmentHistory(state, character.id, context.control?.equipmentHistory) },
      };
    }
    if (characterRead[2] === 'equipmentEvaluation') {
      // SpecRef: 9.1.3 | Read | 2-3-5 character/{characterId}/equipmentEvaluation
      const requested = parameters.targetItems === undefined ? [] : Array.isArray(parameters.targetItems) ? parameters.targetItems : [parameters.targetItems];
      const requestedChanges = parameters.equipmentChanges === undefined ? [] : Array.isArray(parameters.equipmentChanges) ? parameters.equipmentChanges : [parameters.equipmentChanges];
      if (requested.length === 0 && requestedChanges.length === 0) throw new Error('invalid_request:targetItems');
      if (new Set(requested).size !== requested.length) throw new Error('invalid_request:targetItems');
      if (new Set(requestedChanges).size !== requestedChanges.length) throw new Error('invalid_request:equipmentChanges');
      if (requested.length > EQUIPMENT_EVALUATION_LIMIT) throw new Error('invalid_request:targetItems');
      if (requestedChanges.length > EQUIPMENT_EVALUATION_LIMIT) throw new Error('invalid_request:equipmentChanges');
      const currentStats = computeCharacterStatsInParty(party, characterIndex);
      return {
        calculatedItemStatus: requested.map((entry) => {
          const item = typeof entry === 'string' ? parseEvaluatedItemFormat(entry) : null;
          if (!item || !item.jewel || !isJewelAllowedForCategory(item.category, item.jewel.key)) throw new Error('invalid_request:targetItems');
          return { item: entry as string, ...evaluateItemForCharacter(character, item, party.level), abilities: describeItem(item).ability };
        }),
        calculatedEquipmentChange: requestedChanges.map((entry) => {
          const change = typeof entry === 'string' ? parseEquipmentChange(entry) : null;
          if (!change || change.slotIndex >= currentStats.maxEquipSlots
            || (change.item?.jewel && !isJewelAllowedForCategory(change.item.category, change.item.jewel.key))) {
            throw new Error('invalid_request:equipmentChanges');
          }
          const equipment = [...character.equipment];
          equipment[change.slotIndex] = change.item;
          const nextStats = computeCharacterStatsInParty(party, characterIndex, { ...character, equipment });
          return {
            change: entry as string,
            equippable: change.item === null || evaluateItemForCharacter(character, change.item, party.level).equippable,
            physicalDefenseDelta: Math.round(nextStats.physicalDefense) - Math.round(currentStats.physicalDefense),
            magicalDefenseDelta: Math.round(nextStats.magicalDefense) - Math.round(currentStats.magicalDefense),
          };
        }),
      };
    }
    const ids = Array.isArray(parameters.equipmentSetId) ? parameters.equipmentSetId.map(Number) : parameters.equipmentSetId ? [Number(parameters.equipmentSetId)] : null;
    const maxSlots = computePartyStats(party).characterStats[characterIndex].maxEquipSlots;
    return {
      equipmentSets: state.global.savedEquipmentSets.filter((set) => !ids || ids.includes(set.slot)).map((set) => {
        const availability = evaluateEquipmentSet(set, character, state.global.inventory, maxSlots);
        return {
          equipmentSetId: set.slot,
          equipmentSet: {
            equipmentSetId: set.slot,
            name: set.name,
            createdAt: new Date(set.createdAt).toISOString(),
            ...(parameters.isEquipmentSetDetail === true || parameters.isEquipmentSetDetail === 'true'
              ? { equipment: set.equipment.map((entry, index) => formatEquipmentEntry(getSavedEquipmentSlot(entry, index), entry.item, entry.isLocked, null)) }
              : {}),
            availability: {
              allAvailable: availability.allAvailable,
              entries: availability.entries.map(({ entry, available, unavailableReason }, index) => ({
                slotIndex: getSavedEquipmentSlot(entry, index),
                item: formatEquipmentEntry(getSavedEquipmentSlot(entry, index), entry.item, entry.isLocked, null),
                available,
                unavailableReason,
              })),
            },
          },
        };
      }),
    };
  }

  if (operationId === 'read/base/searchItems') return searchItems(state, parameters);
  if (operationId === 'read/base/jewelPriorityParty') return { current: { partyNumber: state.global.jewelAutoEquipPriorityPartyId ?? 'none' }, validOptions: { partyNumber: [...state.parties.map((party) => party.id), 'none'] } };
  if (operationId === 'read/base/shopInfo') {
    const { lineupId: _lineupId, refreshesAt: _refreshesAt, entries: _entries, ...info } = shopProjection(state, context.inGameTime);
    return info;
  }
  if (operationId === 'read/base/shopItemsList') {
    const shop = shopProjection(state, context.inGameTime);
    // `items` are the compact `<shopItemId>/<itemId>/<price>/<availability>` strings of 9.1.3; `entries` carry the same facts
    // structured, including why a slot cannot be bought.
    return {
      current: { lineupId: shop.lineupId, refreshesAt: shop.refreshesAt, items: shop.entries.map((entry) => `${entry.shopItemId}/${entry.itemId}/${entry.price}/${entry.available}`), entries: shop.entries },
      validOptions: { items: shop.entries.filter((entry) => entry.available).map((entry) => entry.shopItemId) },
    };
  }
  if (operationId === 'read/base/altarInfo') return { altarOverview: altarProjection(state) };
  if (operationId === 'read/base/enemyFormList') {
    // Optional intersecting filters; omission lists every enemy form.
    const enemyId = parameters.enemyId === undefined ? undefined : Number(parameters.enemyId);
    const forms = ENEMIES.filter((enemy) => (enemyId === undefined || enemy.id === enemyId) && (parameters.enemyType === undefined || enemy.enemyType === parameters.enemyType));
    if (enemyId !== undefined && forms.length === 0) throw new Error('not_found');
    const entries = forms.map((enemy) => enemyFormEntry(state, enemy));
    return { current: { enemyFormList: entries }, validOptions: { enemyId: entries.filter((entry) => entry.unlockable.available).map((entry) => entry.enemyId) } };
  }

  const diarySetting = operationId.match(/^read\/diary\/(\d+)\/diarySetting$/);
  if (diarySetting) { const selected = partyByNumber(state, diarySetting[1]); if (!selected) throw new Error('not_found'); return { current: selected.party.diarySettings, validOptions: { superRareThreshold: ['all', 1, 2, 3, 4, 5, 6, 'none'], defeatNotificationMode: ['defeatOnly', 'defeatAndDraw', 'defeatDrawRetreat', 'all', 'none'] } }; }
  const diaryEntry = operationId.match(/^read\/diary\/diaryEntry\/(.+)$/);
  if (diaryEntry) { for (const party of state.parties) { const entry = party.diaryLogs.find((candidate) => candidate.id === diaryEntry[1]); if (entry) return { entry: { diaryEntryId: entry.id, partyNumber: party.id, occurredAt: new Date(entry.createdAt).toISOString(), unread: !entry.isRead, content: { format: 'semantic', title: { key: 'diary.title', args: {} }, subtitle: { key: 'diary.subtitle', args: {} }, events: [] }, battleLog: { logId: entry.id, availability: { available: true, unavailableReason: null } } } }; } throw new Error('not_found'); }

  if (operationId === 'read/setting/modeSelect') return { current: { mode: context.gameMode, enemyLevelOffset: context.enemyLevelOffset, language: state.global.language, ...((context.control?.settings?.modeSelect as Record<string, unknown> | undefined) ?? {}) }, validOptions: { mode: ['mode.normal', 'mode.orca'], enemyLevelOffset: { min: 0, max: 20, step: 1 }, language: ['ja', 'en', 'zh-CN', 'zh-TW', 'ko'], darkMode: ['off', 'on', 'system'], theme: ['theme.kemo', 'theme.laika', 'theme.leonard', 'theme.orca', 'theme.nox', 'theme.luna', 'theme.mishka', 'theme.puchitsa', 'theme.hagakure', 'theme.souga-ha', 'theme.finn', 'theme.merle', 'theme.rosaria', 'theme.milly', 'theme.guabi', 'theme.nemea', 'theme.bernetta', 'theme.yone', 'theme.niv', 'theme.nave'] } };
  if (operationId === 'read/setting/enemyEditPane') return { current: (context.control?.settings?.enemyEditPane as Record<string, unknown> | undefined) ?? {}, validOptions: { enemyLevel: { min: 1, max: 99, step: 1 }, terrainEffect: ['none'], enemyType: [], mainClass: CLASSES.map((entry) => entry.id), subClass: ['none', ...CLASSES.map((entry) => entry.id)], addedAbilities: { maximumEntries: 5, level: { min: 1, max: 5 } } } };
  if (operationId === 'read/setting/debug') return { current: (context.control?.settings?.debug as Record<string, unknown> | undefined) ?? {}, validOptions: { speedOfTime: ['real', 'x1.2', 'x5', 'x20', 'x100', 'unlimited'], godsBattleCondition: ['normal', 'simple'], godsStrength: ['normal', 'veryWeak'] } };
  if (operationId.startsWith('read/setting/delivery/')) { const deliveryId = operationId.split('/').at(-1); const delivery = (context.control?.deliveries as ApiV1DeliveryRecord[] | undefined)?.find((entry) => entry.deliveryId === deliveryId); if (!delivery) throw new Error('not_found'); return projectDelivery(delivery); }

  if (operationId === 'resources/developerNewsNotification') return { entries: DEVELOPER_NEWS_ITEMS.map((entry) => ({ version: entry.id, date: entry.date, content: entry.content })) };
  if (operationId === 'resources/donationBox') {
    // Every unlocked god with its rank, donated Gold, and the total needed for the next rank.
    const gods = state.global.unlockedDeities.flatMap((name) => {
      if (isNoFaithDeity(name)) return [];
      const donated = state.global.deityDonations[normalizeDeityName(name)] ?? 0;
      const next = getNextRankDonationRequirement(donated);
      return [`${getDeityId(name)}/${getDeityRank(donated)}/${donated}/${next ?? 'MAX'}`];
    });
    return { gods };
  }
  if (operationId.startsWith('resources/clairvoyance/')) return { reward: {}, enhancement: {}, superRare: {}, sideQuest: {}, sleepiness: {} };
  if (operationId === 'resources/glossary') return { entries: [], validOptions: { category: ['Ab.', 'Base.', 'Fixed.', 'Inc.', 'Mech.', 'Faith.', 'Magic.', 'Quest.', 'Terrain.'] } };
  if (operationId === 'resources/itemCompendium') return { items: ITEMS.filter((item) => !parameters.itemId || item.id === Number(parameters.itemId)).map((item) => ({ itemId: item.id, name: item.name, category: item.category, ability: [], cBonus: item.bonuses ?? [], otherBonus: [] })) };
  if (operationId === 'resources/characterRoster') return { races: RACES.map((race) => ({ raceId: race.id, status: race.stats, bonus: race.bonuses, defaultAbility: race.defaultAbility, unlockAbility: race.unlockAbility })) };
  if (operationId === 'resources/bestiary') return { enemies: ENEMIES.filter((enemy) => !parameters.enemyId || enemy.id === Number(parameters.enemyId)) };
  if (operationId === 'resources/superRareList') return { superRare: SUPER_RARE_TITLES.map((entry) => `${entry.value}/${entry.title}/${entry.multiplier}`) };
  return {};
}
