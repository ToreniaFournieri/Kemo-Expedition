import { CLASSES } from '../../data/classes';
import { ENEMIES } from '../../data/enemies';
import { LINEAGES } from '../../data/lineages';
import { PREDISPOSITIONS } from '../../data/predispositions';
import { computeCharacterStats } from '../../game/characterComputation';
import { canCharacterEquipCategory, getEquipmentAptitudeForCategory, type EquipmentAptitude } from '../../game/equipmentSets';
import type { Character, GameState, RaceId } from '../../types';

// SpecRef: 8.2.3 | Character Edit Mode (selected member) | Race, gender, class, lineage, and predisposition selection
// SpecRef: 9.1.4.9 | Operation-specific completion rules | Party build and equipment
// Builds and validates the entire character edit against one immutable snapshot before the reducer can mutate it.

const EDITABLE_RACES = new Set<RaceId>([
  'lupinian', 'vulpinian', 'felidian', 'caninian', 'ursan', 'procyonian',
  'leporian', 'cervin', 'murid', 'mimorian',
]);
const ALLOWED_PARAMETERS = new Set(['name', 'racesAndGender', 'mainClassId', 'subClassId', 'lineage', 'predisposition']);

/** A warning the caller must confirm, as a stable key with numeric arguments (never localized text). */
export interface CharacterBuildWarning { key: string; args: Record<string, number> }

export const BUILD_WARNING_KEYS = {
  equipmentSlotReduction: 'api.warning.changeBuild.equipmentSlotReduction',
  aptitudeRemoved: {
    melee: 'api.warning.changeBuild.meleeAptitudeRemoved',
    ranged: 'api.warning.changeBuild.rangedAptitudeRemoved',
    magic: 'api.warning.changeBuild.magicAptitudeRemoved',
  },
} as const;

export interface CharacterBuildChangePlan {
  partyIndex: number;
  character: Character;
  updates: Partial<Character>;
  equipmentSlotsRemoved: number;
  invalidEquipment: number;
  requiresConfirmation: boolean;
  /** Empty unless confirmation is required (Spec 9.1.3, 3-3-2). */
  warnings: CharacterBuildWarning[];
}

function invalid(reason: string): never { throw new Error(`invalid_request:${reason}`); }
function illegal(reason: string): never { throw new Error(`illegal_action:${reason}`); }

function currentRaceAndGender(character: Character): string {
  return character.raceId === 'mimorian' && character.mimorianEnemyId != null
    ? `${character.raceId}/${character.gender}/${character.mimorianEnemyId}`
    : `${character.raceId}/${character.gender}`;
}

function parseRaceAndGender(state: GameState, character: Character, value: unknown): Pick<Character, 'raceId' | 'gender'> & Partial<Pick<Character, 'mimorianEnemyId'>> {
  if (typeof value !== 'string') invalid('races_and_gender');
  const parts = value.split('/');
  const raceId = parts[0] as RaceId;
  const gender = parts[1];
  if (!EDITABLE_RACES.has(raceId) || (gender !== 'male' && gender !== 'female')) invalid('races_and_gender');
  if (raceId !== 'mimorian' && parts.length !== 2) invalid('races_and_gender');
  if (raceId === 'mimorian') {
    if (parts.length !== 3 || gender !== 'female' || !/^[1-9][0-9]*$/.test(parts[2])) illegal('mimorian_form');
    const enemyId = Number(parts[2]);
    if (!Number.isSafeInteger(enemyId)
      || !state.global.unlockedMimorianEnemyIds.includes(enemyId)
      || !ENEMIES.some((enemy) => enemy.id === enemyId)) illegal('mimorian_form');
    const assignedElsewhere = state.parties.some((party) => party.characters.some((candidate) =>
      candidate.id !== character.id && candidate.raceId === 'mimorian' && candidate.mimorianEnemyId === enemyId));
    if (assignedElsewhere) illegal('mimorian_form_assigned');
    return { raceId, gender, mimorianEnemyId: enemyId };
  }
  return { raceId, gender };
}

export function planCharacterBuildChange(state: GameState, characterId: number, parameters: Record<string, unknown>): CharacterBuildChangePlan {
  if (Object.keys(parameters).some((key) => !ALLOWED_PARAMETERS.has(key))) invalid('unknown_member');
  const partyIndex = state.parties.findIndex((party) => party.characters.some((candidate) => candidate.id === characterId));
  if (partyIndex < 0) throw new Error('not_found');
  const party = state.parties[partyIndex];
  const character = party.characters.find((candidate) => candidate.id === characterId)!;
  const requested: Partial<Character> = {};

  if (parameters.name !== undefined) {
    const name = parameters.name;
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) invalid('name');
    requested.name = name;
  }
  if (parameters.racesAndGender !== undefined) Object.assign(requested, parseRaceAndGender(state, character, parameters.racesAndGender));
  if (parameters.mainClassId !== undefined) {
    if (typeof parameters.mainClassId !== 'string' || !CLASSES.some((entry) => entry.id === parameters.mainClassId)) invalid('main_class');
    requested.mainClassId = parameters.mainClassId as Character['mainClassId'];
  }
  if (parameters.subClassId !== undefined) {
    if (typeof parameters.subClassId !== 'string' || !CLASSES.some((entry) => entry.id === parameters.subClassId)) invalid('sub_class');
    requested.subClassId = parameters.subClassId as Character['subClassId'];
  }
  if (parameters.lineage !== undefined) {
    const lineage = typeof parameters.lineage === 'string' ? LINEAGES.find((entry) => entry.id === parameters.lineage) : undefined;
    if (!lineage || lineage.selectable !== true) invalid('lineage');
    requested.lineageId = lineage.id;
  }
  if (parameters.predisposition !== undefined) {
    const predisposition = typeof parameters.predisposition === 'string' ? PREDISPOSITIONS.find((entry) => entry.id === parameters.predisposition) : undefined;
    if (!predisposition || predisposition.selectable !== true) invalid('predisposition');
    requested.predispositionId = predisposition.id;
  }

  if (character.isUnique) {
    if ((requested.name !== undefined && requested.name !== character.name)
      || (parameters.racesAndGender !== undefined && parameters.racesAndGender !== currentRaceAndGender(character))
      || (requested.lineageId !== undefined && requested.lineageId !== character.lineageId)
      || (requested.predispositionId !== undefined && requested.predispositionId !== character.predispositionId)) {
      illegal('unique_character_immutable');
    }
  }

  const nextCharacter = { ...character, ...requested };
  const duplicateRaceAndGender = party.characters.some((candidate) => candidate.id !== character.id
    && candidate.isUnique !== true && candidate.raceId === nextCharacter.raceId && candidate.gender === nextCharacter.gender);
  if (character.isUnique !== true && duplicateRaceAndGender) illegal('duplicate_race_and_gender');

  const updates = Object.fromEntries(Object.entries(requested).filter(([key, value]) => value !== character[key as keyof Character])) as Partial<Character>;
  const effectiveCharacter = { ...character, ...updates };
  const oldMaximum = computeCharacterStats(character, party.level).maxEquipSlots;
  const nextMaximum = computeCharacterStats(effectiveCharacter, party.level).maxEquipSlots;
  const equipmentSlotsRemoved = Math.max(0, oldMaximum - nextMaximum);
  const reducedSlotContainsEquipment = equipmentSlotsRemoved > 0
    && character.equipment.slice(nextMaximum, oldMaximum).some((item) => item !== null);
  const lostAptitudeItems: Record<EquipmentAptitude, number> = { melee: 0, ranged: 0, magic: 0 };
  for (const item of character.equipment) {
    if (item === null || !canCharacterEquipCategory(character, item.category) || canCharacterEquipCategory(effectiveCharacter, item.category)) continue;
    const aptitude = getEquipmentAptitudeForCategory(item.category);
    if (aptitude) lostAptitudeItems[aptitude] += 1;
  }
  const invalidEquipment = lostAptitudeItems.melee + lostAptitudeItems.ranged + lostAptitudeItems.magic;
  const requiresConfirmation = reducedSlotContainsEquipment || invalidEquipment > 0;

  // The slot warning is reported with the aptitude warnings whenever confirmation is needed, as the Party UI shows them.
  const warnings: CharacterBuildWarning[] = [];
  if (requiresConfirmation) {
    if (equipmentSlotsRemoved > 0) warnings.push({ key: BUILD_WARNING_KEYS.equipmentSlotReduction, args: { count: equipmentSlotsRemoved } });
    for (const aptitude of ['melee', 'ranged', 'magic'] as const) {
      if (lostAptitudeItems[aptitude] > 0) warnings.push({ key: BUILD_WARNING_KEYS.aptitudeRemoved[aptitude], args: { items: lostAptitudeItems[aptitude] } });
    }
  }

  return { partyIndex, character, updates, equipmentSlotsRemoved, invalidEquipment, requiresConfirmation, warnings };
}
