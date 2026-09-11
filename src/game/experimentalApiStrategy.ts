import type { RuntimeGameMode } from './runtimeGameMode';
import type { Character, GameState, ExpeditionDepthLimit } from '../types';
import type { GameAction } from '../hooks/useGameState';
import { RACES } from '../data/races';
import { CLASSES } from '../data/classes';
import { LINEAGES } from '../data/lineages';
import { PREDISPOSITIONS } from '../data/predispositions';
import { ENEMIES } from '../data/enemies';
import { DUNGEONS } from '../data/dungeons';
import { isDungeonEntryUnlocked, isGodsBattleAvailable } from './clearGate';
import { getDifficultyOffsetMax } from './difficultyOffset';
import { deityId, deityNameFromId, getDeityAssignmentConflict, getUnlockedDeityKeys } from './experimentalApi';
import { getDeityKey, DEITY_OPTIONS } from './deity';
import { requireApi, ApiValidationError, apiError } from './experimentalApiSession';
import { getPotentialDefaultNamesByPt } from '../components/home/homeShared';
import { gameplayRandom } from './gameplayRandom';
import { computeCharacterStats } from './characterComputation';
import { canCharacterEquipCategory } from './equipmentSets';
import { buildShopLineup } from './shop';

export type StrategyDependencies = {
  reduce: (state: GameState, action: GameAction) => GameState;
  equip: (state: GameState, partyIndex: number, characterId?: number) => GameState;
};
export const depthLimits: ExpeditionDepthLimit[] = ['1f-3', '1f-4', '2f-3', '2f-4', '3f-3', '3f-4', '4f-3', '4f-4', '5f-3', '5f-4', 'beforeBoss', 'all'];
export function record(value: unknown, field?: string): Record<string, unknown> {
  requireApi(value && typeof value === 'object' && !Array.isArray(value), 'invalid_request', 'An object is required.', 400, field ? diagnostic(field, 'object_required') : undefined);
  return value as Record<string, unknown>;
}
export function keys(value: Record<string, unknown>, allowed: string[], field?: string) {
  requireApi(Object.keys(value).every(k => allowed.includes(k)), 'invalid_request', 'Unknown request property.', 400, field ? diagnostic(`${field}.${Object.keys(value).find(k => !allowed.includes(k))}`, 'unknown_field') : undefined);
}

// SpecRef: 9.1.3 | Experimental AI API | Structured configuration errors
function diagnostic(field: string, code: string) {
  return { field, violations: [{ field, code }] };
}
function checkConfig(condition: unknown, field: string, code: string, message: string, status = 422, reason = code): asserts condition {
  requireApi(condition, code, message, status, diagnostic(field, reason));
}

const buildFields = ['name', 'gender', 'raceId', 'lineageId', 'predispositionId', 'mainClassId', 'subClassId', 'mimorianEnemyId'];
export function characterBuild(c: Character) {
  return Object.fromEntries(buildFields.map(k => [k, (c.raceId === 'mimorian' && ['lineageId', 'predispositionId'].includes(k)) || (c.raceId !== 'mimorian' && k === 'mimorianEnemyId') ? null : c[k as keyof Character] ?? null]));
}
// SpecRef: 9.1.3 | Experimental AI API | Party configuration
export function validateBuild(state: GameState, partyIndex: number, character: Character, changes: Record<string, unknown>) {
  const violations: Array<{ field: string; code: string }> = [];
  const add = (field: string, code = 'unavailable_selection') => violations.push({ field, code });
  for (const key of Object.keys(changes)) {
    if (!buildFields.includes(key)) add(key, 'unknown_field');
    else if (character.isUnique && !['mainClassId', 'subClassId'].includes(key)) add(key, 'immutable_character_field');
  }
  const c = { ...character, ...changes };
  if (typeof c.name !== 'string' || !c.name.trim() || c.name.length > 64) add('name');
  if (!['male', 'female'].includes(c.gender)) add('gender');
  if (!RACES.some(r => r.id === c.raceId && (r.selectable !== false || (character.isUnique && r.id === character.raceId)))) add('raceId');
  for (const field of ['mainClassId', 'subClassId'] as const) if (!CLASSES.some(v => v.id === c[field])) add(field);
  if (c.raceId === 'mimorian') {
    if (c.gender !== 'female') add('gender');
    if (!Number.isInteger(c.mimorianEnemyId) || !state.global.unlockedMimorianEnemyIds.includes(c.mimorianEnemyId as number)
      || !ENEMIES.some(e => e.id === c.mimorianEnemyId)
      || state.parties.some(p => p.characters.some(other => other.id !== c.id && other.raceId === 'mimorian' && other.mimorianEnemyId === c.mimorianEnemyId))) add('mimorianEnemyId');
    for (const field of ['lineageId', 'predispositionId']) if (changes[field] != null) add(field, 'mimorian_field_unavailable');
  } else {
    if (!LINEAGES.some(v => v.id === c.lineageId && (v.selectable || v.id === character.lineageId))) add('lineageId');
    if (!PREDISPOSITIONS.some(v => v.id === c.predispositionId && (v.selectable || v.id === character.predispositionId))) add('predispositionId');
    if (changes.mimorianEnemyId != null) add('mimorianEnemyId');
  }
  if (!c.isUnique && state.parties[partyIndex].characters.some(other => other.id !== c.id && !other.isUnique && other.raceId === c.raceId && other.gender === c.gender)) add('raceId', 'duplicate_race_gender');
  return violations;
}
export function buildOptions(state: GameState, partyIndex: number, characterId: number, proposed: Record<string, unknown>) {
  const c = state.parties[partyIndex].characters.find(c => c.id === characterId);
  requireApi(c, 'character_not_found', 'Character not found.', 404);
  const candidate = { ...c, ...proposed };
  const violations = validateBuild(state, partyIndex, c, proposed);
  const forms = state.global.unlockedMimorianEnemyIds.filter(id => !state.parties.some(p => p.characters.some(other => other.id !== c.id && other.raceId === 'mimorian' && other.mimorianEnemyId === id)));
  const domains = (field: string, ids: unknown[]) => ids.filter(id => !validateBuild(state, partyIndex, c, { ...proposed, [field]: id }).some(v => v.field === field));
  return {
    revision: state.apiRuntime?.revision ?? 0, partyId: state.parties[partyIndex].id, characterId,
    currentBuild: characterBuild(c), candidateBuild: characterBuild(candidate as Character),
    candidateValidation: { valid: violations.length === 0, violations, defaultNameWillBeAssigned: proposed.raceId !== undefined && proposed.raceId !== c.raceId && proposed.name === undefined },
    options: {
      raceGenderPairs: RACES.flatMap(r => ['male', 'female'].flatMap(gender => validateBuild(state, partyIndex, c, { ...proposed, raceId: r.id, gender, ...(r.id === 'mimorian' ? { mimorianEnemyId: proposed.mimorianEnemyId ?? c.mimorianEnemyId ?? forms[0], lineageId: null, predispositionId: null } : {}) }).some(v => ['raceId', 'gender', 'mimorianEnemyId'].includes(v.field)) ? [] : [{ raceId: r.id, gender }])),
      lineageIds: domains('lineageId', LINEAGES.filter(v => v.selectable).map(v => v.id)),
      predispositionIds: domains('predispositionId', PREDISPOSITIONS.filter(v => v.selectable).map(v => v.id)),
      mainClassIds: CLASSES.map(c => c.id), subClassIds: CLASSES.map(c => c.id),
      mimorianEnemyIds: forms,
      editableFields: c.isUnique ? ['mainClassId', 'subClassId'] : buildFields,
    },
  };
}

export function configureParty(input: GameState, partyIndex: number, raw: unknown, deps: StrategyDependencies): GameState {
  const config = record(raw, 'configuration');
  keys(config, ['characters', 'order', 'deityId', 'destination', 'depthLimit', 'difficultyOffset', 'locks', 'autoEquip', 'autoEquipCharacterIds'], 'configuration');
  let state = input;
  const apply = (action: GameAction) => { state = deps.reduce(state, action); };
  const party = state.parties[partyIndex];
  const edits = config.characters === undefined ? [] : config.characters;
  checkConfig(Array.isArray(edits) && edits.length <= party.characters.length, 'configuration.characters', 'invalid_request', 'Invalid character list.', 400, 'invalid_character_list');
  const seen = new Set<number>();
  const candidates = party.characters.map(c => ({ ...c }));
  const updates: Array<{ id: number; changes: Record<string, unknown>; mode?: 0 | 1 | 2; equipmentItemIds?: number[]; field: string }> = [];
  for (const [editIndex, rawEdit] of edits.entries()) {
    const field = `configuration.characters[${editIndex}]`;
    const edit = record(rawEdit, field); keys(edit, ['characterId', 'changes', 'autoEquipmentMode', 'equipment'], field);
    const index = candidates.findIndex(c => c.id === edit.characterId);
    checkConfig(index >= 0 && !seen.has(Number(edit.characterId)), `${field}.characterId`, 'invalid_request', 'Invalid or duplicate character.', 400, index < 0 ? 'character_not_found' : 'duplicate_character');
    seen.add(Number(edit.characterId));
    const changes = edit.changes === undefined ? {} : record(edit.changes, `${field}.changes`);
    candidates[index] = { ...candidates[index], ...changes } as Character;
    if (edit.autoEquipmentMode !== undefined) checkConfig([0, 1, 2].includes(Number(edit.autoEquipmentMode)) && typeof edit.autoEquipmentMode === 'number', `${field}.autoEquipmentMode`, 'invalid_request', 'Invalid equipment mode.', 400, 'invalid_equipment_mode');
    let equipmentItemIds: number[] | undefined;
    if (edit.equipment !== undefined) {
      const equipment = record(edit.equipment, `${field}.equipment`);
      keys(equipment, ['mode', 'itemIds'], `${field}.equipment`);
      checkConfig(equipment.mode === 'replace_all', `${field}.equipment.mode`, 'invalid_request', 'Only replace_all equipment configuration is supported.', 400, 'invalid_equipment_mode');
      checkConfig(Array.isArray(equipment.itemIds), `${field}.equipment.itemIds`, 'invalid_request', 'itemIds must be an array.', 400, 'invalid_equipment_list');
      checkConfig(equipment.itemIds.every(itemId => Number.isInteger(itemId) && Number(itemId) > 0), `${field}.equipment.itemIds`, 'invalid_request', 'Every item ID must be a positive integer.', 400, 'invalid_item_id');
      equipmentItemIds = equipment.itemIds.map(Number);
    }
    updates.push({ id: Number(edit.characterId), changes, mode: edit.autoEquipmentMode as 0 | 1 | 2 | undefined, equipmentItemIds, field });
  }
  const validationState = { ...state, parties: state.parties.map((p, i) => i === partyIndex ? { ...p, characters: candidates } : p) };
  const buildViolations = updates.flatMap((edit, index) => {
    const original = party.characters.find(c => c.id === edit.id)!;
    return validateBuild(validationState, partyIndex, original, edit.changes).map(v => ({
      field: `configuration.characters[${index}].changes.${v.field}`, code: v.code, characterId: edit.id,
    }));
  });
  requireApi(!buildViolations.length, 'invalid_build', 'One or more character build fields are invalid.', 422,
    { field: buildViolations[0]?.field, violations: buildViolations });
  // Validate the final assignment before applying edits, allowing race/gender swaps.
  for (const edit of updates) {
    const original = party.characters.find(c => c.id === edit.id)!;
    const changes = { ...edit.changes } as Partial<Character>;
    if (changes.raceId && changes.raceId !== original.raceId && changes.name === undefined) {
      const pool = getPotentialDefaultNamesByPt()[party.id]?.[changes.raceId]?.[changes.gender ?? original.gender] ?? [];
      const used = new Set(state.parties.flatMap(p => p.characters).map(c => c.name));
      const available = pool.filter(name => !used.has(name));
      const choices = available.length ? available : pool;
      if (choices.length) changes.name = choices[Math.floor(gameplayRandom() * choices.length)];
    }
    apply({ type: 'UPDATE_CHARACTER', partyIndex, characterId: edit.id, updates: changes, validatedMimorianAssignments: true });
  }
  // SpecRef: 9.1.3 | Experimental AI API | Ordered exact equipment configuration
  const equipmentUpdates = updates.filter((edit) => edit.equipmentItemIds !== undefined);
  for (const edit of equipmentUpdates) {
    apply({ type: 'REMOVE_ALL_EQUIPMENT', partyIndex, characterId: edit.id });
  }
  const availableCounts = new Map(Object.entries(state.global.inventory).map(([key, variant]) => [key, variant.status === 'owned' ? variant.count : 0]));
  const resolvedEquipment: Array<{ characterId: number; assignments: Array<{ slotIndex: number; itemKey: string }> }> = [];
  for (const edit of equipmentUpdates) {
    const character = state.parties[partyIndex].characters.find(candidate => candidate.id === edit.id)!;
    const maxSlots = computeCharacterStats(character, state.parties[partyIndex].level).maxEquipSlots;
    checkConfig(edit.equipmentItemIds!.length <= maxSlots, `${edit.field}.equipment.itemIds`, 'equipment_slot_unavailable', 'The requested equipment exceeds the character slot count.', 422, 'equipment_slot_unavailable');
    const assignments: Array<{ slotIndex: number; itemKey: string }> = [];
    for (const [slotIndex, itemId] of edit.equipmentItemIds!.entries()) {
      const candidatesForItem = Object.entries(state.global.inventory)
        .filter(([key, variant]) => (availableCounts.get(key) ?? 0) > 0 && variant.status === 'owned' && variant.item.id === itemId)
        .sort(([keyA, a], [keyB, b]) => (b.item.enhancement - a.item.enhancement) || keyA.localeCompare(keyB));
      const selected = candidatesForItem[0];
      checkConfig(selected, `${edit.field}.equipment.itemIds[${slotIndex}]`, 'equipment_item_unavailable', 'The requested item is unavailable.', 422, 'equipment_item_unavailable');
      checkConfig(canCharacterEquipCategory(character, selected[1].item.category), `${edit.field}.equipment.itemIds[${slotIndex}]`, 'equipment_item_incompatible', 'The character cannot equip the requested item.', 422, 'equipment_item_incompatible');
      availableCounts.set(selected[0], (availableCounts.get(selected[0]) ?? 0) - 1);
      assignments.push({ slotIndex, itemKey: selected[0] });
    }
    resolvedEquipment.push({ characterId: edit.id, assignments });
  }
  for (const resolved of resolvedEquipment) {
    for (const assignment of resolved.assignments) {
      apply({ type: 'EQUIP_ITEM', partyIndex, characterId: resolved.characterId, slotIndex: assignment.slotIndex, itemKey: assignment.itemKey });
    }
  }
  // Explicit modes are final configuration and therefore apply after replace_all's UI-equivalent FULL-to-SEMI transition.
  for (const edit of updates) {
    if (edit.mode !== undefined) apply({ type: 'UPDATE_CHARACTER', partyIndex, characterId: edit.id, updates: { autoEquipmentMode: edit.mode }, validatedMimorianAssignments: true });
  }
  if (config.order !== undefined) {
    const order = config.order;
    checkConfig(Array.isArray(order) && order.length === party.characters.length && new Set(order).size === order.length && order.every(id => party.characters.some(c => c.id === id)), 'configuration.order', 'invalid_request', 'Order must contain every character exactly once.', 400, 'invalid_order');
    for (let i = 0; i < order.length; i++) apply({ type: 'REORDER_PARTY_CHARACTER', partyIndex, fromIndex: state.parties[partyIndex].characters.findIndex(c => c.id === order[i]), toIndex: i });
  }
  if (config.deityId !== undefined) {
    const name = typeof config.deityId === 'string' ? deityNameFromId(config.deityId) : null;
    checkConfig(name && getUnlockedDeityKeys(state.global.unlockedDeities).includes(name), 'configuration.deityId', 'deity_unavailable', 'This deity is locked. Choose an unlocked deity.');
    const assignedParty = getDeityAssignmentConflict(state.parties, party.id, name);
    if (assignedParty) {
      const assignedPartySlot = `PT${assignedParty.id}`;
      const assignedPartyLabel = assignedParty.name ? `${assignedPartySlot}: ${assignedParty.name}` : assignedPartySlot;
      const response = apiError('deity_unavailable', `This deity is already used by another party (${assignedPartyLabel}). Choose another deity.`, 422);
      (response.error as Record<string, unknown>).details = { ...diagnostic('configuration.deityId', 'assigned_to_party'), deityId: config.deityId, reason: 'assigned_to_party', assignedPartyId: assignedParty.id, assignedPartyName: assignedParty.name };
      throw new ApiValidationError(response);
    }
    apply({ type: 'UPDATE_PARTY_DEITY', partyIndex, deityName: name });
  }
  if (config.destination !== undefined) {
    const d = record(config.destination, 'configuration.destination'); keys(d, ['mode', 'dungeonId'], 'configuration.destination');
    checkConfig(d.mode === 'auto' || d.mode === 'fixed', 'configuration.destination.mode', 'invalid_request', 'Invalid destination mode.', 400, 'invalid_destination_mode');
    if (d.dungeonId !== undefined || d.mode === 'fixed') {
      checkConfig(Number.isInteger(d.dungeonId) && DUNGEONS.some(v => v.id === d.dungeonId && isDungeonEntryUnlocked(state.parties[partyIndex], v.id)), 'configuration.destination.dungeonId', 'normal_sortie_unavailable', 'Dungeon unavailable.');
      apply({ type: 'SELECT_DUNGEON', partyIndex, dungeonId: Number(d.dungeonId) });
    }
    apply({ type: 'SET_EXPEDITION_DESTINATION_MODE', partyIndex, mode: d.mode });
  }
  if (config.depthLimit !== undefined) {
    checkConfig(depthLimits.includes(config.depthLimit as ExpeditionDepthLimit), 'configuration.depthLimit', 'invalid_request', 'Invalid depth limit.', 400, 'invalid_depth_limit');
    apply({ type: 'SET_EXPEDITION_DEPTH_LIMIT', partyIndex, depthLimit: config.depthLimit as ExpeditionDepthLimit });
  }
  if (config.difficultyOffset !== undefined) {
    const max = getDifficultyOffsetMax(DUNGEONS.find(d => d.id === state.parties[partyIndex].selectedDungeonId)?.expLevel ?? 1);
    checkConfig(Number.isInteger(config.difficultyOffset) && Number(config.difficultyOffset) >= 0 && Number(config.difficultyOffset) <= max && Number(config.difficultyOffset) % 2 === 0, 'configuration.difficultyOffset', 'difficulty_unavailable', 'Invalid difficulty offset.');
    apply({ type: 'SET_EXPEDITION_DIFFICULTY_OFFSET', partyIndex, difficultyOffset: Number(config.difficultyOffset) });
  }
  if (config.locks !== undefined) {
    checkConfig(Array.isArray(config.locks) && config.locks.length <= 200, 'configuration.locks', 'invalid_request', 'Invalid locks.', 400, 'invalid_lock_list');
    for (const [lockIndex, rawLock] of config.locks.entries()) {
      const field = `configuration.locks[${lockIndex}]`;
      const lock = record(rawLock, field); keys(lock, ['characterId', 'slotIndex', 'locked'], field);
      const c = state.parties[partyIndex].characters.find(c => c.id === lock.characterId);
      checkConfig(c, `${field}.characterId`, 'equipment_lock_unavailable', 'Lock requires an equipped item in FULL mode.', 422, 'character_not_found');
      checkConfig(Number.isInteger(lock.slotIndex) && c.equipment[Number(lock.slotIndex)], `${field}.slotIndex`, 'equipment_lock_unavailable', 'Lock requires an equipped item in FULL mode.', 422, 'occupied_slot_required');
      checkConfig(typeof lock.locked === 'boolean', `${field}.locked`, 'equipment_lock_unavailable', 'Lock requires an equipped item in FULL mode.', 422, 'boolean_required');
      checkConfig(c.autoEquipmentMode === 2, field, 'equipment_lock_unavailable', 'Lock requires an equipped item in FULL mode.', 422, 'full_mode_required');
      if (Boolean(c.equipment[Number(lock.slotIndex)]?.isLocked) !== lock.locked) apply({ type: 'TOGGLE_EQUIPMENT_LOCK', partyIndex, characterId: c.id, slotIndex: Number(lock.slotIndex) });
    }
  }
  if (config.autoEquip !== undefined) checkConfig(typeof config.autoEquip === 'boolean', 'configuration.autoEquip', 'invalid_request', 'autoEquip must be boolean.', 400, 'boolean_required');
  const autoEquipCharacterIds = config.autoEquipCharacterIds === undefined ? [] : config.autoEquipCharacterIds;
  checkConfig(Array.isArray(autoEquipCharacterIds), 'configuration.autoEquipCharacterIds', 'invalid_request', 'autoEquipCharacterIds must be an array.', 400, 'invalid_auto_equip_character_list');
  checkConfig(autoEquipCharacterIds.length <= party.characters.length && new Set(autoEquipCharacterIds).size === autoEquipCharacterIds.length
    && autoEquipCharacterIds.every(id => Number.isInteger(id) && state.parties[partyIndex].characters.some(character => character.id === id)),
  'configuration.autoEquipCharacterIds', 'invalid_request', 'Auto Equipment targets must be unique party character IDs.', 400, 'invalid_auto_equip_character_list');
  checkConfig(!(config.autoEquip && autoEquipCharacterIds.length), 'configuration.autoEquipCharacterIds', 'invalid_request', 'Choose whole-party or targeted Auto Equipment, not both.', 400, 'conflicting_auto_equip_targets');
  if (config.autoEquip) state = deps.equip(state, partyIndex);
  for (const characterId of autoEquipCharacterIds) state = deps.equip(state, partyIndex, Number(characterId));
  return state;
}

export function applyApiCommand(state: GameState, raw: unknown, deps: StrategyDependencies, now: number, mode: RuntimeGameMode = 'mode.normal', offset = 0): GameState {
  const c = record(raw);
  const type = c.type;
  const required: Record<string, string[]> = {
    configure_party: ['partyId', 'configuration'], update_character_build: ['partyId', 'characterId', 'changes'],
    reorder_character: ['partyId', 'characterId', 'targetRow'], set_deity: ['partyId', 'deityId'],
    set_auto_equipment_mode: ['partyId', 'characterId', 'mode'], run_auto_equipment: ['partyId'],
    remove_all_equipment: ['partyId', 'characterId'],
    purchase_shop_item: ['partyId', 'lineupId', 'stockEntryId'],
    toggle_equipment_lock: ['partyId', 'characterId', 'slotIndex'], set_jewel_priority_party: ['partyId'],
    set_expedition_destination: ['partyId', 'mode'], set_expedition_depth: ['partyId', 'depthLimit'],
    set_expedition_difficulty: ['partyId', 'difficultyOffset'], set_auto_run: ['enabled'], god_battle: ['partyId'],
  };
  requireApi(typeof type === 'string' && Object.prototype.hasOwnProperty.call(required, type), 'unsupported_command', 'Unsupported command.', 400);
  requireApi(required[type].every(k => Object.prototype.hasOwnProperty.call(c, k)), 'invalid_request', 'A required command field is missing.', 400);
  const partyIndex = state.parties.findIndex(p => p.id === c.partyId);
  if (type === 'set_auto_run') {
    keys(c, ['type', 'enabled']); requireApi(typeof c.enabled === 'boolean', 'invalid_request', 'enabled must be boolean.', 400);
    return { ...state, apiRuntime: { ...state.apiRuntime!, autoRun: c.enabled } };
  }
  if (type === 'set_jewel_priority_party') {
    keys(c, ['type', 'partyId']); requireApi(c.partyId === null || partyIndex >= 0, 'party_not_found', 'Party not found.', 404);
    return deps.reduce(state, { type: 'SET_JEWEL_AUTO_EQUIP_PRIORITY_PARTY', partyId: c.partyId as number | null });
  }
  requireApi(partyIndex >= 0, 'party_not_found', 'Party not found.', 404);
  const p = state.parties[partyIndex];
  const char = p.characters.find(v => v.id === c.characterId);
  if (type === 'configure_party') { keys(c, ['type', 'partyId', 'configuration']); return configureParty(state, partyIndex, c.configuration, deps); }
  if (type === 'purchase_shop_item') {
    keys(c, ['type', 'partyId', 'lineupId', 'stockEntryId']);
    requireApi(typeof c.lineupId === 'string' && typeof c.stockEntryId === 'string', 'invalid_request', 'lineupId and stockEntryId must be strings.', 400);
    const lineup = buildShopLineup({ parties: state.parties, gold: state.global.gold, shopPurchases: state.global.shopPurchases, shopRefreshCounts: state.global.shopRefreshCounts, shopIntimacy: state.global.shopIntimacy, shopIntimacyLastDecayAt: state.global.shopIntimacyLastDecayAt }, new Date(Date.now()));
    requireApi(c.lineupId === lineup.lineupId, 'shop_lineup_changed', 'The observed shop lineup has changed.', 409, { currentLineupId: lineup.lineupId });
    const entry = lineup.entries.find(candidate => candidate.stockEntryId === c.stockEntryId);
    requireApi(entry && !entry.soldOut, 'shop_item_unavailable', 'The shop stock entry is unavailable.', 422);
    requireApi(state.global.gold >= entry.price, 'insufficient_gold', 'There is not enough Gold for this purchase.', 422, { requiredGold: entry.price, currentGold: state.global.gold });
    // SpecRef: 9.1.3 | Experimental AI API | purchase_shop_item
    return deps.reduce(state, { type: 'BUY_SHOP_ITEM', itemId: entry.itemId, stockItemKey: entry.stockEntryId, partyIndex });
  }
  if (type === 'update_character_build' || type === 'set_auto_equipment_mode') {
    keys(c, type === 'update_character_build' ? ['type', 'partyId', 'characterId', 'changes'] : ['type', 'partyId', 'characterId', 'mode']);
    requireApi(char, 'character_not_found', 'Character not found.', 404);
    return configureParty(state, partyIndex, { characters: [{ characterId: char.id, ...(type === 'update_character_build' ? { changes: c.changes } : { autoEquipmentMode: c.mode }) }] }, deps);
  }
  if (type === 'run_auto_equipment') {
    keys(c, ['type', 'partyId', 'characterId']); requireApi(c.characterId === undefined || char, 'character_not_found', 'Character not found.', 404);
    return deps.equip(state, partyIndex, char?.id);
  }
  if (type === 'remove_all_equipment') {
    keys(c, ['type', 'partyId', 'characterId']);
    requireApi(char, 'character_not_found', 'Character not found.', 404);
    // SpecRef: 9.1.3 | Experimental AI API | remove_all_equipment
    return deps.reduce(state, { type: 'REMOVE_ALL_EQUIPMENT', partyIndex, characterId: char.id });
  }
  if (type === 'reorder_character') {
    keys(c, ['type', 'partyId', 'characterId', 'targetRow']);
    requireApi(char && Number.isInteger(c.targetRow) && Number(c.targetRow) >= 1 && Number(c.targetRow) <= p.characters.length, 'invalid_request', 'Invalid reorder target.', 400);
    return deps.reduce(state, { type: 'REORDER_PARTY_CHARACTER', partyIndex, fromIndex: p.characters.indexOf(char), toIndex: Number(c.targetRow) - 1 });
  }
  if (type === 'toggle_equipment_lock') {
    keys(c, ['type', 'partyId', 'characterId', 'slotIndex']);
    requireApi(char && Number.isInteger(c.slotIndex) && char.equipment[Number(c.slotIndex)], 'equipment_slot_not_found', 'Slot not found.', 404);
    return configureParty(state, partyIndex, { locks: [{ characterId: char.id, slotIndex: c.slotIndex, locked: !char.equipment[Number(c.slotIndex)]?.isLocked }] }, deps);
  }
  if (type === 'set_deity') { keys(c, ['type', 'partyId', 'deityId']); return configureParty(state, partyIndex, { deityId: c.deityId }, deps); }
  if (type === 'set_expedition_destination') { keys(c, ['type', 'partyId', 'mode', 'dungeonId']); return configureParty(state, partyIndex, { destination: { mode: c.mode, ...(c.dungeonId !== undefined ? { dungeonId: c.dungeonId } : {}) } }, deps); }
  if (type === 'set_expedition_depth') { keys(c, ['type', 'partyId', 'depthLimit']); return configureParty(state, partyIndex, { depthLimit: c.depthLimit }, deps); }
  if (type === 'set_expedition_difficulty') { keys(c, ['type', 'partyId', 'difficultyOffset']); return configureParty(state, partyIndex, { difficultyOffset: c.difficultyOffset }, deps); }
  if (type === 'god_battle') {
    keys(c, ['type', 'partyId']);
    requireApi(!state.apiRuntime?.evaluation && isGodsBattleAvailable(p, p.selectedDungeonId) && (p.instantExpeditionStock ?? 0) > 0 && !state.apiRuntime?.autoRun, 'god_battle_unavailable', 'Gods Battle unavailable.');
    state = deps.reduce(state, { type: 'CONSUME_INSTANT_EXPEDITION_STOCK', partyIndex, now });
    return deps.reduce(state, { type: 'RESOLVE_INSTANT_EXPEDITION', partyIndex, simulatedAt: now, triggerGodsBattle: true, gameMode: mode, enemyLevelOffset: offset });
  }
  requireApi(false, 'unsupported_command', 'Unsupported command.', 400);
}
export function mechanicsCatalog() {
  return { races: RACES, classes: CLASSES, lineages: LINEAGES.filter(v => v.selectable), predispositions: PREDISPOSITIONS.filter(v => v.selectable),
    deities: DEITY_OPTIONS.map(d => ({ id: deityId(d.key), displayName: d.name, key: getDeityKey(d.key) })),
    autoEquipmentModes: [{ id: 0, name: 'OFF' }, { id: 1, name: 'SEMI' }, { id: 2, name: 'FULL' }], depthLimits };
}
