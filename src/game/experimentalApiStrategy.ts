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

export type StrategyDependencies = {
  reduce: (state: GameState, action: GameAction) => GameState;
  equip: (state: GameState, partyIndex: number, characterId?: number) => GameState;
};
export const depthLimits: ExpeditionDepthLimit[] = ['1f-3', '1f-4', '2f-3', '2f-4', '3f-3', '3f-4', '4f-3', '4f-4', '5f-3', '5f-4', 'beforeBoss', 'all'];
export function record(value: unknown): Record<string, unknown> {
  requireApi(value && typeof value === 'object' && !Array.isArray(value), 'invalid_request', 'An object is required.', 400);
  return value as Record<string, unknown>;
}
export function keys(value: Record<string, unknown>, allowed: string[]) {
  requireApi(Object.keys(value).every(k => allowed.includes(k)), 'invalid_request', 'Unknown request property.', 400);
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
  if (!RACES.some(r => r.id === c.raceId)) add('raceId');
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
  const config = record(raw);
  keys(config, ['characters', 'order', 'deityId', 'destination', 'depthLimit', 'difficultyOffset', 'locks', 'autoEquip']);
  let state = input;
  const apply = (action: GameAction) => { state = deps.reduce(state, action); };
  const party = state.parties[partyIndex];
  const edits = config.characters === undefined ? [] : config.characters;
  requireApi(Array.isArray(edits) && edits.length <= party.characters.length, 'invalid_request', 'Invalid character list.', 400);
  const seen = new Set<number>();
  const candidates = party.characters.map(c => ({ ...c }));
  const updates: Array<{ id: number; changes: Record<string, unknown>; mode?: 0 | 1 | 2 }> = [];
  for (const rawEdit of edits) {
    const edit = record(rawEdit); keys(edit, ['characterId', 'changes', 'autoEquipmentMode']);
    const index = candidates.findIndex(c => c.id === edit.characterId);
    requireApi(index >= 0 && !seen.has(Number(edit.characterId)), 'invalid_request', 'Invalid or duplicate character.', 400);
    seen.add(Number(edit.characterId));
    const changes = edit.changes === undefined ? {} : record(edit.changes);
    candidates[index] = { ...candidates[index], ...changes } as Character;
    if (edit.autoEquipmentMode !== undefined) requireApi([0, 1, 2].includes(Number(edit.autoEquipmentMode)) && typeof edit.autoEquipmentMode === 'number', 'invalid_request', 'Invalid equipment mode.', 400);
    updates.push({ id: Number(edit.characterId), changes, mode: edit.autoEquipmentMode as 0 | 1 | 2 | undefined });
  }
  const validationState = { ...state, parties: state.parties.map((p, i) => i === partyIndex ? { ...p, characters: candidates } : p) };
  for (const edit of updates) {
    const original = party.characters.find(c => c.id === edit.id)!;
    const violations = validateBuild(validationState, partyIndex, original, edit.changes);
    requireApi(!violations.length, 'invalid_build', JSON.stringify(violations));
  }
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
    if (edit.mode !== undefined) changes.autoEquipmentMode = edit.mode;
    apply({ type: 'UPDATE_CHARACTER', partyIndex, characterId: edit.id, updates: changes, validatedMimorianAssignments: true });
  }
  if (config.order !== undefined) {
    const order = config.order;
    requireApi(Array.isArray(order) && order.length === party.characters.length && new Set(order).size === order.length && order.every(id => party.characters.some(c => c.id === id)), 'invalid_request', 'Order must contain every character exactly once.', 400);
    for (let i = 0; i < order.length; i++) apply({ type: 'REORDER_PARTY_CHARACTER', partyIndex, fromIndex: state.parties[partyIndex].characters.findIndex(c => c.id === order[i]), toIndex: i });
  }
  if (config.deityId !== undefined) {
    const name = typeof config.deityId === 'string' ? deityNameFromId(config.deityId) : null;
    requireApi(name && getUnlockedDeityKeys(state.global.unlockedDeities).includes(name), 'deity_unavailable', 'This deity is locked. Choose an unlocked deity.');
    const assignedParty = getDeityAssignmentConflict(state.parties, party.id, name);
    if (assignedParty) {
      const assignedPartySlot = `PT${assignedParty.id}`;
      const assignedPartyLabel = assignedParty.name ? `${assignedPartySlot}: ${assignedParty.name}` : assignedPartySlot;
      const response = apiError('deity_unavailable', `This deity is already used by another party (${assignedPartyLabel}). Choose another deity.`, 422);
      (response.error as Record<string, unknown>).details = { reason: 'assigned_to_party', assignedPartyId: assignedParty.id, assignedPartyName: assignedParty.name };
      throw new ApiValidationError(response);
    }
    apply({ type: 'UPDATE_PARTY_DEITY', partyIndex, deityName: name });
  }
  if (config.destination !== undefined) {
    const d = record(config.destination); keys(d, ['mode', 'dungeonId']);
    requireApi(d.mode === 'auto' || d.mode === 'fixed', 'invalid_request', 'Invalid destination mode.', 400);
    if (d.dungeonId !== undefined || d.mode === 'fixed') {
      requireApi(Number.isInteger(d.dungeonId) && DUNGEONS.some(v => v.id === d.dungeonId && isDungeonEntryUnlocked(state.parties[partyIndex], v.id)), 'normal_sortie_unavailable', 'Dungeon unavailable.');
      apply({ type: 'SELECT_DUNGEON', partyIndex, dungeonId: Number(d.dungeonId) });
    }
    apply({ type: 'SET_EXPEDITION_DESTINATION_MODE', partyIndex, mode: d.mode });
  }
  if (config.depthLimit !== undefined) {
    requireApi(depthLimits.includes(config.depthLimit as ExpeditionDepthLimit), 'invalid_request', 'Invalid depth limit.', 400);
    apply({ type: 'SET_EXPEDITION_DEPTH_LIMIT', partyIndex, depthLimit: config.depthLimit as ExpeditionDepthLimit });
  }
  if (config.difficultyOffset !== undefined) {
    const max = getDifficultyOffsetMax(DUNGEONS.find(d => d.id === state.parties[partyIndex].selectedDungeonId)?.expLevel ?? 1);
    requireApi(Number.isInteger(config.difficultyOffset) && Number(config.difficultyOffset) >= 0 && Number(config.difficultyOffset) <= max && Number(config.difficultyOffset) % 2 === 0, 'difficulty_unavailable', 'Invalid difficulty offset.');
    apply({ type: 'SET_EXPEDITION_DIFFICULTY_OFFSET', partyIndex, difficultyOffset: Number(config.difficultyOffset) });
  }
  if (config.locks !== undefined) {
    requireApi(Array.isArray(config.locks) && config.locks.length <= 200, 'invalid_request', 'Invalid locks.', 400);
    for (const rawLock of config.locks) {
      const lock = record(rawLock); keys(lock, ['characterId', 'slotIndex', 'locked']);
      const c = state.parties[partyIndex].characters.find(c => c.id === lock.characterId);
      requireApi(c && Number.isInteger(lock.slotIndex) && c.equipment[Number(lock.slotIndex)] && typeof lock.locked === 'boolean' && c.autoEquipmentMode === 2, 'equipment_lock_unavailable', 'Lock requires an equipped item in FULL mode.');
      if (Boolean(c.equipment[Number(lock.slotIndex)]?.isLocked) !== lock.locked) apply({ type: 'TOGGLE_EQUIPMENT_LOCK', partyIndex, characterId: c.id, slotIndex: Number(lock.slotIndex) });
    }
  }
  if (config.autoEquip !== undefined) requireApi(typeof config.autoEquip === 'boolean', 'invalid_request', 'autoEquip must be boolean.', 400);
  if (config.autoEquip) state = deps.equip(state, partyIndex);
  return state;
}

export function applyApiCommand(state: GameState, raw: unknown, deps: StrategyDependencies, now: number, mode: RuntimeGameMode = 'mode.normal', offset = 0): GameState {
  const c = record(raw);
  const type = c.type;
  const required: Record<string, string[]> = {
    configure_party: ['partyId', 'configuration'], update_character_build: ['partyId', 'characterId', 'changes'],
    reorder_character: ['partyId', 'characterId', 'targetRow'], set_deity: ['partyId', 'deityId'],
    set_auto_equipment_mode: ['partyId', 'characterId', 'mode'], run_auto_equipment: ['partyId'],
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
  if (type === 'update_character_build' || type === 'set_auto_equipment_mode') {
    keys(c, type === 'update_character_build' ? ['type', 'partyId', 'characterId', 'changes'] : ['type', 'partyId', 'characterId', 'mode']);
    requireApi(char, 'character_not_found', 'Character not found.', 404);
    return configureParty(state, partyIndex, { characters: [{ characterId: char.id, ...(type === 'update_character_build' ? { changes: c.changes } : { autoEquipmentMode: c.mode }) }] }, deps);
  }
  if (type === 'run_auto_equipment') {
    keys(c, ['type', 'partyId', 'characterId']); requireApi(c.characterId === undefined || char, 'character_not_found', 'Character not found.', 404);
    return deps.equip(state, partyIndex, char?.id);
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
