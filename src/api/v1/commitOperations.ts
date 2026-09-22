import type { ApiV1DeliveryRecord } from './deliveries';
import { DEVELOPER_NEWS_ITEMS } from '../../data/developerNews';
import { getDeityId, getDeityNameFromId, isNoFaithDeity, normalizeDeityName } from '../../game/deity';
import { isDebugModeEnabled } from '../../game/environment';
import { canCharacterEquipCategory, createEquipmentSetSnapshot, evaluateEquipmentSet, evaluateEquipmentState, getSavedEquipmentSlot, MAX_SAVED_EQUIPMENT_SETS } from '../../game/equipmentSets';
import { recordEquipmentState, redoEquipmentState, undoEquipmentState } from '../../game/equipmentHistory';
import { computeCharacterStats } from '../../game/characterComputation';
import { getSortieUnavailableReason } from './sortieAvailability';
import { getExpeditionChangeRejection } from '../../game/expeditionSettings';
import { getInstantExpeditionChargeState } from '../../game/instantExpedition';
import { computePartyStats } from '../../game/partyComputation';
import { hydrateGameState, serializeGameState } from '../../game/saveCodec';
import { getShopFacts, shopLineupInputOf } from '../../game/shopFacts';
import { getEnemyFormFacts } from '../../game/altarFacts';
import { ENEMIES } from '../../data/enemies';
import { describeEquipmentHistory } from './equipmentHistoryFacts';
import { apiExpeditionOutcomeOrNull } from './expeditionOutcome';
import { listUiPreferences, validateUiPreference, type UiPreferenceValue } from './uiPreferenceCatalog';
import { isEquipmentSlotAction, planEquipOperation, planEquipmentSlotOperation } from './equipmentSlots';
import { planCharacterBuildChange } from './buildChange';
import { decodePersistedState, encodePersistedState } from '../../game/storageCompression';
import { createFreshGameState, gameReducer } from '../../hooks/useGameState';
import type { Character, GameState, Party, SavedEquipmentSet } from '../../types';
import { getVariantKey } from '../../types';

// SpecRef: 9.1 | Desktop distribution | Application API
// This is the transport-neutral gameplay-mutation slice of the `/api/v1` commit dispatcher. It owns exactly the
// gameplay logic previously inlined in HomeScreen.tsx's `processApiV1Request` (the section between resolving the
// idempotency/revision/confirmation transaction and building the final envelope). It receives an explicit
// authoritative snapshot plus injected dependencies for the few pieces that are not pure functions of
// (operation, state, parameters) alone, and returns the next state and any control-plane side effects the caller
// (`src/api/v1/authority.ts`, responsible for revision, idempotency, receipts, and persistence) must apply.

export function decodeApiSavePayload(payload: string): GameState {
  return hydrateGameState(JSON.parse(decodePersistedState(payload)) as GameState);
}

/** Whether the Colosseum is enabled: the runtime's Debug setting for the ordinary player, the API debug settings otherwise. */
export function isColosseumEnabled(context: { colosseumEnabled?: boolean; settings?: Record<string, unknown> }): boolean {
  if (context.colosseumEnabled !== undefined) return context.colosseumEnabled;
  return (context.settings?.debug as { colosseumMode?: unknown } | undefined)?.colosseumMode === true;
}

export interface ApiV1CommitContext {
  /** The Colosseum Debug setting of the ordinary player's runtime; absent for an API account (see `isColosseumEnabled`). */
  readonly colosseumEnabled?: boolean;
  /** In-game clock at the start of this transaction (epoch ms); `commit/progress/elapsed` may advance a local copy. */
  readonly simulatedAt: number;
  readonly gameMode: 'mode.normal' | 'mode.orca';
  readonly enemyLevelOffset: number;
  /** The API control settings bag (`stagedControl.settings`); may be mutated in place and is always echoed back. */
  readonly settings: Record<string, unknown>;
  /** The API control equipment-history bag (`stagedControl.equipmentHistory`); mutated in place and echoed back. */
  readonly equipmentHistory: Record<string, { undo: SavedEquipmentSet[]; redo: SavedEquipmentSet[] }>;
  readonly uploadedFiles: Record<string, Record<string, unknown>>;
  /** Canonicalized upload metadata, precomputed by the caller (also used for idempotency canonicalization). */
  readonly canonicalFiles: Record<string, unknown>;
  readonly applyAutoEquipment: (state: GameState, partyIndex: number, characterId: number | undefined, forceFull: boolean) => GameState;
  readonly createDeliveryId: () => string;
  /** Real wall-clock epoch ms, used only for delivery record timestamps (distinct from the in-game `simulatedAt`). */
  readonly now: () => number;
  /** The Instant Expedition charge clock scale (the current Speed of Time); 1 when omitted. */
  readonly chargeDurationScale?: number;
  /** The live party cycle of a party (by index) when the ordinary player's runtime is the actor; absent for an API account. */
  readonly partyCycle?: (partyIndex: number) => ApiV1PartyCycleView | undefined;
  /** Duration of `state.rest` for a party under the current Speed of Time, deity, and modifiers (the UI's own rule). */
  readonly restDurationMs?: (party: Party) => number;
}

/** What a sortie needs to know about the live party cycle (Spec 5.1.1). */
export interface ApiV1PartyCycleView {
  readonly state: string;
  /** The wall-clock start of the state and its planned duration; absent for a state without a clock (idle, reactivate). */
  readonly stateStartedAt?: number;
  readonly durationMs?: number;
  readonly isCurrentExpeditionGodsBattle?: boolean;
  /** Steps of the current `state.rest` when it began, for its progress. */
  readonly restInitialTotalSteps?: number;
}

/** A change to the live party cycle that must be applied only after the commit is durable. */
export interface ApiV1PartyCycleWrite {
  readonly partyIndex: number;
  /** A sortie always leaves the party at the beginning of `state.rest` (Spec 5.1.1, Immediate 出撃 / 神魔戦). */
  readonly cycle: { state: 'rest'; stateStartedAt: number; durationMs: number; restInitialTotalSteps: 1; isCurrentExpeditionGodsBattle: false };
}

export interface ApiV1CommitOutcome {
  state: GameState;
  data: Record<string, unknown>;
  simulatedAt: number;
  settings: Record<string, unknown>;
  equipmentHistory: Record<string, { undo: SavedEquipmentSet[]; redo: SavedEquipmentSet[] }>;
  /** `commit/setting/backup/import` and `commit/setting/backup/reset` invalidate outstanding popups and confirmations. */
  resetControlEvents: boolean;
  delivery: ApiV1DeliveryRecord | null;
  /** Live party-cycle changes the caller applies after the durable commit (empty for every operation but a sortie). */
  partyCycleWrites?: ApiV1PartyCycleWrite[];
}

/**
 * Applies one already-authorized `/api/v1` commit operation to `state` and returns the next state plus any
 * control-plane side effects. Throws an `Error` whose message is one of the stable markers already recognized by
 * the caller's error-code classification (`not_found`, `illegal_action`, or any other message maps to
 * `invalid_request`).
 */
export function applyApiV1Commit(operation: string, state: GameState, parameters: Record<string, unknown>, context: ApiV1CommitContext): ApiV1CommitOutcome {
  let next = state;
  let simulatedAt = context.simulatedAt;
  let data: Record<string, unknown> = {};
  const settings = context.settings;
  let resetControlEvents = false;
  let delivery: ApiV1DeliveryRecord | null = null;
  const partyCycleWrites: ApiV1PartyCycleWrite[] = [];
  const reduce = (action: Parameters<typeof gameReducer>[1]) => { next = gameReducer(next, action); };
  const partyMatch = operation.match(/^commit\/expedition\/(\d+)\/(changeExpedition|sortie|godsBattle|resetStatistics)$/);
  const characterMatch = operation.match(/^commit\/build\/character\/(\d+)\/(.+)$/);

  if (operation === 'commit/setting/backup/export') {
    data = { savePayload: encodePersistedState(JSON.stringify(serializeGameState(next))) };
  } else if (operation === 'commit/setting/backup/import') {
    const backup = context.uploadedFiles.backup;
    if (!backup || typeof backup.contentBase64 !== 'string') throw new Error('invalid_backup');
    const imported = decodeApiSavePayload(atob(backup.contentBase64));
    next = imported;
    resetControlEvents = true;
    data = { imported: true };
  } else if (operation === 'commit/progress/elapsed') {
    const elapsedSeconds = parameters.elapsedSeconds === undefined ? 0 : Number(parameters.elapsedSeconds);
    if (elapsedSeconds !== 0 && (!Number.isInteger(elapsedSeconds) || elapsedSeconds < 60 || elapsedSeconds > 43_200)) throw new Error('invalid_elapsed');
    if (elapsedSeconds > 0) reduce({ type: 'SIMULATE_AFK', elapsedMs: elapsedSeconds * 1000, isAutoRepeatEnabled: true, gameMode: context.gameMode, enemyLevelOffset: context.enemyLevelOffset, simulatedEndAt: simulatedAt + elapsedSeconds * 1000 });
    simulatedAt += elapsedSeconds * 1000;
    data = { requestedElapsedSeconds: elapsedSeconds, acceptedElapsedSeconds: elapsedSeconds, cappedElapsedSeconds: elapsedSeconds, elapsedSeconds, inGameTime: new Date(simulatedAt).toISOString() };
  } else if (operation === 'commit/progress/progressReport' || operation === 'commit/setting/feedback') {
    const deliveryId = context.createDeliveryId();
    const deliveryTime = new Date(context.now()).toISOString();
    delivery = { deliveryId, status: 'queued', createdAt: deliveryTime, updatedAt: deliveryTime, failureReason: null, rewardApplied: false, operation, parameters: structuredClone(parameters), files: context.canonicalFiles };
    data = { deliveryId, status: 'queued' };
  } else if (partyMatch) {
    const partyNumber = Number(partyMatch[1]);
    const partyIndex = next.parties.findIndex((entry) => entry.id === partyNumber);
    if (partyIndex < 0) throw new Error('not_found');
    if (partyMatch[2] === 'changeExpedition') {
      // SpecRef: 9.1.3 | Commit | 3-2-1 {p}/changeExpedition
      // The whole request is validated first (atomic): an unknown or locked destination, an unknown depth limit, or a
      // difficulty offset that is not a valid step within the destination's range rejects everything.
      const rejection = getExpeditionChangeRejection(next.parties[partyIndex], {
        destination: parameters.destination === undefined ? undefined : Number(parameters.destination),
        depthLimit: parameters.depthLimit === undefined ? undefined : String(parameters.depthLimit),
        difficultyOffset: parameters.difficultyOffset === undefined ? undefined : Number(parameters.difficultyOffset),
      }, isColosseumEnabled(context));
      if (rejection) throw new Error(rejection.code === 'illegal_action' ? `illegal_action:${rejection.reason}` : rejection.reason);
      if (parameters.destination !== undefined) reduce({ type: 'SELECT_DUNGEON', partyIndex, dungeonId: Number(parameters.destination), selectionMode: parameters.destinationMode === 'auto' ? 'auto' : 'manual' });
      if (parameters.destinationMode !== undefined) reduce({ type: 'SET_EXPEDITION_DESTINATION_MODE', partyIndex, mode: String(parameters.destinationMode) as Party['expeditionDestinationMode'] });
      if (parameters.depthLimit !== undefined) reduce({ type: 'SET_EXPEDITION_DEPTH_LIMIT', partyIndex, depthLimit: String(parameters.depthLimit) as Party['expeditionDepthLimit'] });
      if (parameters.difficultyOffset !== undefined) reduce({ type: 'SET_EXPEDITION_DIFFICULTY_OFFSET', partyIndex, difficultyOffset: Number(parameters.difficultyOffset) });
      const party = next.parties[partyIndex];
      data = { current: { destination: party.selectedDungeonId, destinationMode: party.expeditionDestinationMode, depthLimit: party.expeditionDepthLimit, difficultyOffset: party.expeditionDifficultyOffset } };
    } else if (partyMatch[2] === 'resetStatistics') {
      // SpecRef: 9.1.3 | Commit | 3-2-4 {p}/resetStatistics
      // The Expedition pane's Reset button: the same reducer action, which restores the party's expedition statistics
      // (Clear, Return, Draw, Retreat, Defeat, and the totals) to their defaults.
      reduce({ type: 'RESET_EXPEDITION_STATS', partyIndex });
      data = {};
    } else {
      // SpecRef: 9.1.3 | Commit | 3-2-2 {p}/sortie
      // SpecRef: 5.1.1 | Party State Machine | Immediate 出撃 / 神魔戦
      // The same sequence of reducer actions as pressing the Sortie or Gods Battle button (HomeScreen `triggerSortie`),
      // with the same refusals. The live party cycle is read through the context and its reset to the beginning of
      // `state.rest` is returned as a write the caller applies once the commit is durable.
      const party = next.parties[partyIndex];
      const godsBattle = partyMatch[2] === 'godsBattle';
      const isColosseum = party.selectedDungeonId === 99;
      const cycle = context.partyCycle?.(partyIndex);
      const maximumHp = computePartyStats(party).partyStats.hp;
      const chargeScale = context.chargeDurationScale ?? 1;
      const previousDiaryIds = new Set(party.diaryLogs.map((entry) => entry.id));
      const unavailable = getSortieUnavailableReason({
        party,
        godsBattle,
        hp: party.currentHp,
        maximumHp,
        chargeStock: getInstantExpeditionChargeState(party, context.simulatedAt, chargeScale).stock,
        cycle,
      });
      if (unavailable) throw new Error(`illegal_action:${unavailable}`);
      if (godsBattle && party.sideQuest) reduce({ type: 'CANCEL_SIDE_QUEST', partyIndex });
      if (!isColosseum) reduce({ type: 'CONSUME_INSTANT_EXPEDITION_STOCK', partyIndex, now: context.simulatedAt, chargeDurationScale: chargeScale });
      if (cycle?.state === 'explore') reduce({ type: 'FINALIZE_DIARY_LOG', partyIndex, simulatedAt: context.simulatedAt });
      reduce({ type: 'CLEAR_PENDING_PROFIT', partyIndex });
      reduce({ type: 'HEAL_PARTY_HP', partyIndex, amount: maximumHp });
      reduce({ type: 'RESOLVE_INSTANT_EXPEDITION', partyIndex, simulatedAt: context.simulatedAt, gameMode: context.gameMode, enemyLevelOffset: context.enemyLevelOffset, triggerGodsBattle: godsBattle });
      reduce({ type: 'ROLL_PARTY_SLEEPINESS', partyIndex });
      if (context.partyCycle && context.restDurationMs) {
        partyCycleWrites.push({ partyIndex, cycle: { state: 'rest', stateStartedAt: context.now(), durationMs: context.restDurationMs(next.parties[partyIndex]), restInitialTotalSteps: 1, isCurrentExpeditionGodsBattle: false } });
      }
      const resolved = next.parties[partyIndex];
      // Only an outcome the party's Diary settings record creates an entry; otherwise the result is the party's latest log.
      const newDiaryEntry = resolved.diaryLogs.find((entry) => !previousDiaryIds.has(entry.id));
      data = { outcome: apiExpeditionOutcomeOrNull(resolved.lastExpeditionLog), rewards: resolved.lastExpeditionLog?.rewards.map((item) => getVariantKey(item)) ?? [], diaryEntryId: newDiaryEntry?.id ?? null, logId: newDiaryEntry ? `diary:${newDiaryEntry.id}` : 'latest' };
    }
  } else if (operation.match(/^commit\/build\/party\/(\d+)$/)) {
    const partyNumber = Number(operation.split('/').at(-1));
    const partyIndex = next.parties.findIndex((entry) => entry.id === partyNumber);
    if (partyIndex < 0) throw new Error('not_found');
    if (parameters.deityId !== undefined) {
      const deityName = getDeityNameFromId(String(parameters.deityId));
      if (!deityName) throw new Error('invalid_deity');
      const normalized = normalizeDeityName(deityName);
      const current = normalizeDeityName(next.parties[partyIndex].deity.name);
      const unlocked = next.global.unlockedDeities.map(normalizeDeityName).includes(normalized);
      const usedElsewhere = !isNoFaithDeity(normalized) && next.parties.some((party, index) => index !== partyIndex && normalizeDeityName(party.deity.name) === normalized);
      if ((!isNoFaithDeity(normalized) && normalized !== current && !unlocked) || usedElsewhere) throw new Error('illegal_action');
      reduce({ type: 'UPDATE_PARTY_DEITY', partyIndex, deityName });
    }
    if (Array.isArray(parameters.order)) {
      const target = parameters.order.map(Number);
      const currentIds = next.parties[partyIndex].characters.map((entry) => entry.id);
      if (target.length !== currentIds.length || new Set(target).size !== target.length || target.some((id) => !currentIds.includes(id))) throw new Error('invalid_order');
      for (let destination = 0; destination < target.length; destination += 1) {
        const source = next.parties[partyIndex].characters.findIndex((entry) => entry.id === target[destination]);
        if (source < 0) throw new Error('invalid_order');
        if (source !== destination) reduce({ type: 'REORDER_PARTY_CHARACTER', partyIndex, fromIndex: source, toIndex: destination });
      }
    }
    data = { current: { deityId: getDeityId(next.parties[partyIndex].deity.name), order: next.parties[partyIndex].characters.map((entry) => entry.id) } };
  } else if (characterMatch) {
    const characterId = Number(characterMatch[1]);
    const partyIndex = next.parties.findIndex((party) => party.characters.some((entry) => entry.id === characterId));
    if (partyIndex < 0) throw new Error('not_found');
    const action = characterMatch[2];
    const characterBefore = next.parties[partyIndex].characters.find((entry) => entry.id === characterId)!;
    // SpecRef: 8.2.4 | Equipment management | three-state toggle(手動/補助/一任)
    // A manual equipment change made while FULL demotes the character to SEMI, exactly as the UI path does.
    const demoteFullAutoEquipment = () => { if (characterBefore.autoEquipmentMode === 2) reduce({ type: 'UPDATE_CHARACTER', partyIndex, characterId, updates: { autoEquipmentMode: 1 } }); };
    const history = context.equipmentHistory;
    const historyKey = String(characterId);
    const characterHistory = history[historyKey] ?? { undo: [], redo: [] };
    const snapshotEquipment = (character: Character): SavedEquipmentSet => ({
      ...createEquipmentSetSnapshot(character.equipment, true),
      name: 'API history',
      createdAt: simulatedAt,
    });
    const equipmentBefore = snapshotEquipment(characterBefore);
    const sameEquipment = (left: SavedEquipmentSet, right: SavedEquipmentSet) => JSON.stringify(left.equipment) === JSON.stringify(right.equipment);
    const recordsEquipmentHistory = !['saveEquipmentSet', 'deleteEquipmentSet', 'renameEquipmentSet', 'undoEquipment', 'redoEquipment'].includes(action);
    if (action === 'changeBuild') {
      // SpecRef: 9.1.3 | Commit | 3-3-2 character/{characterId}/changeBuild
      // `simulation` validates and reports without committing; `confirmation` answers a reported warning. This operation
      // owns its confirmation, so it never issues the generic 9.1.4.5 confirmation challenge.
      const { simulation, confirmation, ...buildParameters } = parameters;
      if (typeof simulation !== 'boolean') throw new Error('invalid_request:simulation');
      if (confirmation !== undefined && confirmation !== 'yes' && confirmation !== 'no') throw new Error('invalid_request:confirmation');
      if (simulation && confirmation !== undefined) throw new Error('invalid_request:confirmation_with_simulation');
      const plan = planCharacterBuildChange(next, characterId, buildParameters);
      let applied = false;
      if (!simulation && confirmation !== 'no') {
        if (plan.requiresConfirmation && confirmation !== 'yes') throw new Error('invalid_request:confirmation_required');
        if (Object.keys(plan.updates).length > 0) {
          reduce({ type: 'UPDATE_CHARACTER', partyIndex, characterId, updates: plan.updates, validatedMimorianAssignments: true });
          applied = true;
        }
      }
      data = { confirmationRequired: plan.requiresConfirmation, warnings: plan.warnings, applied };
    }
    else if (action === 'removeAllEquipment') reduce({ type: 'REMOVE_ALL_EQUIPMENT', partyIndex, characterId });
    else if (isEquipmentSlotAction(action)) {
      const character = next.parties[partyIndex].characters.find((entry) => entry.id === characterId)!;
      for (const step of planEquipmentSlotOperation(action, character, next.global.jewels, parameters)) reduce({ ...step, partyIndex, characterId });
      if (action === 'removeEquipment') demoteFullAutoEquipment();
    }
    else if (action === 'saveEquipmentSet') {
      // The set is captured from the character's current equipment into the lowest empty saved slot.
      const equipmentSet = parameters.equipmentSet as { name?: unknown } | undefined;
      const requestedName = equipmentSet?.name;
      if (requestedName !== undefined && (typeof requestedName !== 'string' || requestedName.trim().length === 0 || requestedName.length > 100)) throw new Error('invalid_request:name');
      if (next.global.savedEquipmentSets.length >= MAX_SAVED_EQUIPMENT_SETS) throw new Error('illegal_action:saved_sets_full');
      const occupied = new Set(next.global.savedEquipmentSets.map((entry) => entry.slot));
      reduce({ type: 'SAVE_EQUIPMENT_SET', partyIndex, characterId, name: requestedName ?? `Set ${next.global.savedEquipmentSets.length + 1}`, createdAt: context.simulatedAt });
      // Sets are ordered by slot, so the new set is the one that was not there before, not the last element.
      const created = next.global.savedEquipmentSets.find((entry) => !occupied.has(entry.slot));
      if (!created) throw new Error('illegal_action:saved_sets_full');
      data = { equipmentSetId: created.slot };
    }
    else if (action === 'loadEquipmentSet') {
      const set = next.global.savedEquipmentSets.find((entry) => entry.slot === Number(parameters.equipmentSetId));
      if (!set) throw new Error('not_found');
      const loadMode = String(parameters.loadMode ?? 'equipSet');
      const maxSlots = computeCharacterStats(characterBefore, next.parties[partyIndex].level).maxEquipSlots;
      // `equipSet` promises every stored item; a partial set must be loaded through an explicit confirmed choice.
      if (loadMode === 'equipSet' && !evaluateEquipmentSet(set, characterBefore, next.global.inventory, maxSlots).allAvailable) throw new Error('illegal_action:partial_load_requires_choice');
      reduce({ type: 'LOAD_EQUIPMENT_SET', partyIndex, characterId, slot: set.slot, mode: loadMode === 'equipSimilar' ? 'similar' : 'exact' });
      const loaded = next.parties[partyIndex].characters.find((entry) => entry.id === characterId)!;
      data = { loadReport: { loadMode, entries: set.equipment.map((entry, index) => {
        const slotIndex = getSavedEquipmentSlot(entry, index);
        const result = slotIndex < maxSlots ? loaded.equipment[slotIndex] : null;
        const exact = result !== null && result.id === entry.item.id && result.enhancement === entry.item.enhancement && result.superRare === entry.item.superRare;
        const reason = result ? null : slotIndex >= maxSlots ? 'slot_unavailable' : !canCharacterEquipCategory(loaded, entry.item.category) ? 'not_equippable' : 'unavailable';
        return { slotIndex, saved: `${entry.isLocked ? 1 : 0}/${entry.item.id}/${entry.item.enhancement}/${entry.item.superRare}`, result: exact ? 'equipped' : result ? 'substituted' : 'skipped', reason };
      }) } };
    }
    else if (action === 'deleteEquipmentSet') {
      if (!next.global.savedEquipmentSets.some((entry) => entry.slot === Number(parameters.equipmentSetId))) throw new Error('not_found');
      reduce({ type: 'DELETE_EQUIPMENT_SET', slot: Number(parameters.equipmentSetId) });
    } else if (action === 'renameEquipmentSet') {
      if (!next.global.savedEquipmentSets.some((entry) => entry.slot === Number(parameters.equipmentSetId))) throw new Error('not_found');
      if (typeof parameters.name !== 'string' || parameters.name.trim().length === 0 || parameters.name.length > 100) throw new Error('invalid_request:name');
      reduce({ type: 'RENAME_EQUIPMENT_SET', slot: Number(parameters.equipmentSetId), name: parameters.name });
    }
    else if (action === 'autoEquipment') {
      const mode = String(parameters.mode);
      if (!['FULL', 'SEMI', 'OFF'].includes(mode)) throw new Error('invalid_request:mode');
      reduce({ type: 'UPDATE_CHARACTER', partyIndex, characterId, updates: { autoEquipmentMode: mode === 'FULL' ? 2 : mode === 'SEMI' ? 1 : 0 } });
      const before = next.parties[partyIndex].characters.find((entry) => entry.id === characterId)!.equipment;
      const ran = parameters.immediateAutoEquipment === true;
      if (ran) next = context.applyAutoEquipment(next, partyIndex, characterId, true);
      const after = next.parties[partyIndex].characters.find((entry) => entry.id === characterId)!.equipment;
      const itemFormat = (item: Character['equipment'][number]): string | null => item
        ? `${item.isLocked ? 1 : 0}/${item.id}/${item.enhancement}/${item.superRare}${item.jewel ? `/${item.jewel.key}:${item.jewel.rank}` : ''}`
        : null;
      data = {
        autoEquipmentReport: {
          ran,
          changes: Array.from({ length: Math.max(before.length, after.length) }, (_, slotIndex) => ({
            slotIndex, before: itemFormat(before[slotIndex] ?? null), after: itemFormat(after[slotIndex] ?? null),
          })).filter((entry) => entry.before !== entry.after),
        },
      };
    }
    else if (action === 'equip') {
      const maxSlots = computeCharacterStats(characterBefore, next.parties[partyIndex].level).maxEquipSlots;
      for (const step of planEquipOperation(characterBefore, next.global.inventory, parameters.targetEquipment, maxSlots, parameters.targetSlot)) reduce({ type: 'EQUIP_ITEM', partyIndex, characterId, slotIndex: step.slotIndex, itemKey: step.itemKey });
      demoteFullAutoEquipment();
    } else if (action === 'undoEquipment' || action === 'redoEquipment') {
      const current = next.parties[partyIndex].characters.find((entry) => entry.id === characterId)!;
      const currentSnapshot = snapshotEquipment(current);
      const transition = action === 'undoEquipment'
        ? undoEquipmentState(characterHistory, currentSnapshot)
        : redoEquipmentState(characterHistory, currentSnapshot);
      if (!transition || sameEquipment(transition.target, currentSnapshot)) throw new Error('illegal_action');
      const maxSlots = computeCharacterStats(current, next.parties[partyIndex].level).maxEquipSlots;
      if (!evaluateEquipmentState(transition.target, current, next.global.inventory, next.global.jewels, maxSlots).allAvailable) throw new Error('illegal_action');
      reduce({ type: 'RESTORE_EQUIPMENT_STATE', partyIndex, characterId, set: transition.target });
      history[historyKey] = transition.history;
    }
    if (recordsEquipmentHistory) {
      const characterAfter = next.parties[partyIndex].characters.find((entry) => entry.id === characterId)!;
      if (!sameEquipment(equipmentBefore, snapshotEquipment(characterAfter))) {
        history[historyKey] = recordEquipmentState(characterHistory, equipmentBefore);
      }
    }
    if (!data.equipmentSetId) {
      const currentCharacter = next.parties[partyIndex].characters.find((entry) => entry.id === characterId)!;
      const historyFacts = describeEquipmentHistory(next, characterId, history);
      data = {
        ...data,
        current: {
          mode: currentCharacter.autoEquipmentMode === 2 ? 'FULL' : currentCharacter.autoEquipmentMode === 1 ? 'SEMI' : 'OFF',
          equipment: currentCharacter.equipment.map((item, slot) => item ? `${slot}/${item.isLocked ? 1 : 0}/${item.id}/${item.enhancement}/${item.superRare}${item.jewel ? `/${item.jewel.key}:${item.jewel.rank}` : ''}` : '0'),
          undoAvailable: historyFacts.undoEquipment.available,
          redoAvailable: historyFacts.redoEquipment.available,
        },
      };
    }
  } else if (operation === 'commit/base/changeJewelPriorityParty') {
    reduce({ type: 'SET_JEWEL_AUTO_EQUIP_PRIORITY_PARTY', partyId: parameters.partyNumber === 'none' ? null : Number(parameters.partyNumber) });
    data = { current: { partyNumber: next.global.jewelAutoEquipPriorityPartyId ?? 'none' } };
  } else if (operation === 'commit/base/sellInventoryItems') {
    // Validate every entry against one snapshot before any sale, so a bad entry sells nothing.
    const requested = Array.isArray(parameters.items) ? parameters.items.map(String) : [];
    if (requested.length === 0) throw new Error('invalid_request:items');
    const stacks = requested.map((format) => {
      const [lock, itemId, enhancement, superRare] = format.split('/').map(Number);
      if (![lock, itemId, enhancement, superRare].every(Number.isInteger)) throw new Error('invalid_request:item_format');
      const variantKey = getVariantKey({ id: itemId, enhancement, superRare });
      const variant = next.global.inventory[variantKey];
      if (!variant) throw new Error('not_found');
      // Selling is all-or-nothing per owned stack; sold, not-owned, or empty variants are unavailable.
      if (variant.status !== 'owned' || variant.count < 1) throw new Error('illegal_action:variant_not_sellable');
      return { variantKey, format: `0/${itemId}/${enhancement}/${superRare}`, quantity: variant.count };
    });
    if (new Set(stacks.map((stack) => stack.variantKey)).size !== stacks.length) throw new Error('invalid_request:duplicate_items');
    const before = { gold: next.global.gold, prana: next.global.prana };
    for (const stack of stacks) reduce({ type: 'SELL_STACK', variantKey: stack.variantKey });
    data = { items: stacks.map((stack) => ({ item: stack.format, quantity: stack.quantity })), goldDelta: next.global.gold - before.gold, pranaDelta: next.global.prana - before.prana };
  } else if (operation === 'commit/base/purchaseShopItems') {
    // SpecRef: 9.1.3 | Commit | 3-4-3 purchaseShopItems
    // Every entry is checked against one snapshot of the lineup at the transaction time before anything is bought, so one bad
    // entry buys nothing. A slot's ID is its 1-based position in the lineup.
    const items = Array.isArray(parameters.items) ? parameters.items : [];
    const requested = items.map((item) => Number(item && typeof item === 'object' ? (item as Record<string, unknown>).shopItemId : NaN));
    if (requested.length === 0 || requested.some((id) => !Number.isSafeInteger(id) || id < 1) || new Set(requested).size !== requested.length) throw new Error('invalid_request:items');
    const facts = getShopFacts(shopLineupInputOf(next), new Date(simulatedAt));
    const entries = requested.map((id) => {
      const entry = facts.entries.find((candidate) => candidate.shopItemId === id);
      if (!entry) throw new Error('not_found');
      if (entry.soldOut) throw new Error('illegal_action:sold_out');
      return entry;
    });
    if (entries.reduce((sum, entry) => sum + entry.price, 0) > next.global.gold) throw new Error('illegal_action:insufficient_gold');
    const before = { gold: next.global.gold, prana: next.global.prana };
    const purchasedFormats: string[] = [];
    for (const entry of entries) {
      // The enhancement and Super Rare title are drawn inside the reducer; the callback reports the exact result.
      reduce({ type: 'BUY_SHOP_ITEM', itemId: entry.itemId, stockItemKey: entry.stockEntryId, now: simulatedAt, onPurchased: (purchased) => { purchasedFormats.push(`0/${purchased.id}/${purchased.enhancement}/${purchased.superRare}`); } });
    }
    if (purchasedFormats.length !== entries.length) throw new Error('illegal_action:purchase_rejected');
    const quantities = new Map<string, number>();
    for (const format of purchasedFormats) quantities.set(format, (quantities.get(format) ?? 0) + 1);
    data = { items: [...quantities].map(([item, quantity]) => ({ item, quantity })), goldDelta: next.global.gold - before.gold, pranaDelta: next.global.prana - before.prana };
  } else if (operation === 'commit/base/unlockSoldItems') {
    const items = parameters.items as string[];
    const keys = Array.isArray(items) ? items.map((format) => { const [, itemId, enhancement, superRare] = String(format).split('/').map(Number); return Object.keys(next.global.inventory).find((variantKey) => { const candidate = next.global.inventory[variantKey]; return candidate.status === 'sold' && candidate.item.id === itemId && candidate.item.enhancement === enhancement && candidate.item.superRare === superRare; }); }) : [];
    if (keys.length === 0 || keys.some((key) => !key) || new Set(keys).size !== keys.length) throw new Error('invalid_items');
    for (const variantKey of keys) reduce({ type: 'SET_VARIANT_STATUS', variantKey: variantKey!, status: 'notown' });
    data = { items };
  } else if (operation === 'commit/base/paidShopRefresh') {
    // SpecRef: 9.1.3 | Commit | 3-4-4 paidShopRefresh
    // Charges the price shown for the current refresh count and replaces the lineup in the same transaction; the reducer
    // would silently ignore a refresh the player cannot afford, so the shortfall is refused here.
    const now = new Date(simulatedAt);
    const before = getShopFacts(shopLineupInputOf(next), now);
    if (!before.paidRefreshAvailable) throw new Error('illegal_action:insufficient_gold');
    const goldBefore = next.global.gold;
    reduce({ type: 'REFRESH_SHOP_LINEUP', now: simulatedAt });
    const after = getShopFacts(shopLineupInputOf(next), now);
    if (after.lineupId === before.lineupId) throw new Error('illegal_action:refresh_rejected');
    data = { lineupId: after.lineupId, goldDelta: next.global.gold - goldBefore, paidRefreshPrice: after.paidRefreshPrice };
  } else if (operation === 'commit/base/unlockForm') {
    // SpecRef: 9.1.3 | Commit | 3-4-6 unlockForm
    // SpecRef: 8.4.5 | Altar (祭壇) | Unlock Costs
    // The reducer ignores a form that cannot be unlocked; the API names why: already unlocked, the category's Alter level is
    // below the form's requirement, or the Prana is short.
    const enemyId = Number(parameters.enemyId);
    const enemy = ENEMIES.find((candidate) => candidate.id === enemyId);
    if (!enemy) throw new Error('not_found');
    const facts = getEnemyFormFacts({ prana: next.global.prana, altarVictoriesByEnemyType: next.global.altarVictoriesByEnemyType, unlockedMimorianEnemyIds: next.global.unlockedMimorianEnemyIds }, enemy);
    if (facts.unavailableReason) throw new Error(`illegal_action:${facts.unavailableReason}`);
    const pranaBefore = next.global.prana;
    reduce({ type: 'UNLOCK_MIMORIAN_ENEMY', enemyId });
    if (!next.global.unlockedMimorianEnemyIds.includes(enemyId)) throw new Error('illegal_action:unlock_rejected');
    data = { enemyId, pranaDelta: next.global.prana - pranaBefore };
  } else if (operation === 'commit/base/markItemsAsSeen') {
    const keys = parameters.items as string[];
    if (!Array.isArray(keys) || keys.some((key) => !next.global.inventory[key])) throw new Error('invalid_items');
    next = { ...next, global: { ...next.global, inventory: Object.fromEntries(Object.entries(next.global.inventory).map(([key, variant]) => [key, keys.includes(key) ? { ...variant, isNew: false } : variant])) } };
    data = { items: keys };
  } else if (operation.match(/^commit\/diary\/(\d+)\/diarySetting$/)) {
    const partyNumber = Number(operation.split('/')[2]); const partyIndex = next.parties.findIndex((entry) => entry.id === partyNumber); if (partyIndex < 0) throw new Error('not_found'); reduce({ type: 'UPDATE_DIARY_SETTINGS', partyIndex, settings: parameters }); data = { current: next.parties[partyIndex].diarySettings };
  } else if (operation === 'commit/diary/diaryEntry/markAsRead') {
    const ids = parameters.diaryEntryId === 'ALL' ? next.parties.flatMap((party) => party.diaryLogs.map((entry) => entry.id)) : (Array.isArray(parameters.diaryEntryId) ? parameters.diaryEntryId : [parameters.diaryEntryId]).map(String);
    for (const id of ids) reduce({ type: 'MARK_DIARY_LOG_SEEN', logId: id });
    data = { diaryEntryId: ids, unreadTotal: next.parties.reduce((sum, party) => sum + party.diaryLogs.filter((entry) => !entry.isRead).length, 0) };
  } else if (operation === 'commit/setting/markNewsAsRead') {
    const versions = parameters.version === undefined ? DEVELOPER_NEWS_ITEMS.map((entry) => entry.id) : (Array.isArray(parameters.version) ? parameters.version : [parameters.version]).map(String);
    reduce({ type: 'MARK_DEVELOPER_NEWS_READ', itemIds: versions }); data = { versions, unreadCount: DEVELOPER_NEWS_ITEMS.filter((entry) => !next.global.readDeveloperNewsItemIds.includes(entry.id)).length };
  } else if (operation === 'commit/setting/clairvoyanceReset') {
    const partyNumber = Number(parameters.partyNumber);
    const partyIndex = next.parties.findIndex((entry) => entry.id === partyNumber);
    if (partyIndex < 0) throw new Error('not_found');
    if (parameters.resetCommonRewards === true) reduce({ type: 'RESET_COMMON_BAGS', partyIndex });
    if (parameters.resetRewards === true) { reduce({ type: 'RESET_UNIQUE_BAGS', partyIndex }); reduce({ type: 'RESET_COMMON_SUPER_RARE_BAG', partyIndex }); reduce({ type: 'RESET_RARE_SUPER_RARE_BAG', partyIndex }); }
    if (parameters.resetSideQuest === true) { reduce({ type: 'RESET_SIDE_QUEST_BAG', partyIndex }); reduce({ type: 'SET_SIDE_QUEST_PROGRESS', partyIndex, progress: 0 }); }
    data = { partyNumber, resetCommonRewards: parameters.resetCommonRewards === true, resetRewards: parameters.resetRewards === true, resetSideQuest: parameters.resetSideQuest === true };
  } else if (operation === 'commit/setting/backup/reset') {
    next = createFreshGameState(next.global.language); resetControlEvents = true; data = {};
  } else if (operation === 'commit/setting/modeSelect') {
    if (parameters.mode !== undefined && parameters.mode !== context.gameMode) throw new Error('illegal_action');
    if (parameters.enemyLevelOffset !== undefined && Number(parameters.enemyLevelOffset) !== context.enemyLevelOffset) throw new Error('illegal_action');
    if (parameters.language !== undefined) reduce({ type: 'SET_LANGUAGE', language: String(parameters.language) as GameState['global']['language'] });
    const current = { ...((settings.modeSelect as Record<string, unknown> | undefined) ?? {}), ...parameters, mode: context.gameMode, enemyLevelOffset: context.enemyLevelOffset, language: next.global.language };
    if (Object.keys(parameters).length > 0) settings.modeSelect = current;
    data = { current };
  } else if (operation === 'commit/setting/enemyEditPane' || operation === 'commit/setting/debug') {
    if (!isDebugModeEnabled()) throw new Error('illegal_action');
    const key = operation.endsWith('/debug') ? 'debug' : 'enemyEditPane';
    const current = { ...((settings[key] as Record<string, unknown> | undefined) ?? {}), ...parameters };
    if (Object.keys(parameters).length > 0) settings[key] = current;
    data = { current };
  } else if (operation === 'commit/setting/uiPreferences') {
    // SpecRef: 9.1.4.17 | UI state ownership | uiPreferences closed catalog
    // Unknown or duplicate keys and wrongly typed values reject the whole update; the preferences live in the save.
    const changes = parameters.changes as Array<{ key?: unknown; value?: unknown }>;
    if (!Array.isArray(changes) || changes.length === 0) throw new Error('invalid_request:changes');
    if (new Set(changes.map((entry) => entry?.key)).size !== changes.length) throw new Error('invalid_request:duplicate_key');
    changes.forEach((entry) => validateUiPreference(next, entry?.key, entry?.value));
    reduce({ type: 'SET_UI_PREFERENCES', changes: changes.map((entry) => ({ key: entry.key as string, value: entry.value as UiPreferenceValue })) });
    data = { uiPreferences: listUiPreferences(next.global.uiPreferences) };
  }
  else throw new Error('invalid_request');

  return { state: next, data, simulatedAt, settings: context.settings, equipmentHistory: context.equipmentHistory, resetControlEvents, delivery, partyCycleWrites };
}
