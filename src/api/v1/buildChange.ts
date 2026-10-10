import { CLASSES } from '../../data/classes';
import { ENEMIES } from '../../data/enemies';
import { LINEAGES } from '../../data/lineages';
import { PREDISPOSITIONS } from '../../data/predispositions';
import { computeCharacterStats, MAX_CHARACTER_NAME_LENGTH } from '../../game/characterComputation';
import { canCharacterEquipCategory, getEquipmentAptitudeForCategory, type EquipmentAptitude } from '../../game/equipmentSets';
import { getUniqueCharacterDef, isUniqueCharacterAvailable, UNIQUE_CHARACTERS, type UniqueCharacterId } from '../../data/uniqueCharacters';
import { resolveReleasedUniqueBuild } from '../../game/uniqueRelease';
import { translate } from '../../i18n';
import type { Character, GameState, RaceId } from '../../types';

// SpecRef: 8.2.3 | Character Edit Mode (selected member) | Race, gender, class, lineage, and predisposition selection
// SpecRef: 9.1.4.9 | Operation-specific completion rules | Party build and equipment
// Builds and validates the entire character edit against one immutable snapshot before the reducer can mutate it.

const EDITABLE_RACES = new Set<RaceId>([
  'lupinian', 'vulpinian', 'felidian', 'caninian', 'ursan', 'procyonian',
  'leporian', 'cervin', 'murid', 'mimorian',
]);
// SpecRef: 9.1.3 | 3-3-3 changeBuild | Class IDs are accepted both bare (`guardian`) and prefixed (`class.guardian`).
const stripClassPrefix = (id: string): string => id.startsWith('class.') ? id.slice('class.'.length) : id;

const ALLOWED_PARAMETERS = new Set(['name', 'uniqueSelection', 'racesAndGender', 'mainClassId', 'subClassId', 'lineage', 'predisposition']);

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
  /** Empty unless confirmation is required (Spec 9.1.3, 3-3-3). */
  warnings: CharacterBuildWarning[];
}

function invalid(reason: string): never { throw new Error(`invalid_request:${reason}`); }
function illegal(reason: string): never { throw new Error(`illegal_action:${reason}`); }

function currentRaceAndGender(character: Character): string {
  return character.raceId === 'mimorian' && character.mimorianEnemyId != null
    ? `${character.raceId}/${character.gender}/${character.mimorianEnemyId}`
    : `${character.raceId}/${character.gender}`;
}

// SpecRef: 9.1.3 | 2-3-3 character/status `current`; 9.1.4.9 | changeBuild returns the complete new `current`
/** A character's public build facts: the `current` of `read/build/character/status` and of `changeBuild`. */
export function describeCharacterBuildCurrent(character: Character) {
  return {
    uniqueSelection: character.uniqueCharacterId ?? 'none',
    name: character.name,
    racesAndGender: currentRaceAndGender(character),
    mainClassId: character.mainClassId,
    subClassId: character.subClassId,
    lineage: character.lineageId,
    predisposition: character.predispositionId,
  };
}

// SpecRef: 8.2.3 | Character Edit Mode (selected member) | Unique selection: "固有"
/** `false` plus every `uniqueCharacterId` available at the unlocked PT count (Spec 2.1.4.2) and not assigned to another character (the selected character's own stays listed). */
export function validUniqueSelections(state: GameState, character: Character): ('none' | UniqueCharacterId)[] {
  const assignedElsewhere = new Set(state.parties.flatMap((party) => party.characters)
    .filter((candidate) => candidate.id !== character.id && candidate.uniqueCharacterId !== undefined)
    .map((candidate) => candidate.uniqueCharacterId));
  return ['none', ...UNIQUE_CHARACTERS.filter((entry) => !assignedElsewhere.has(entry.id)
    && (character.uniqueCharacterId === entry.id || isUniqueCharacterAvailable(entry, state.parties.length))).map((entry) => entry.id)];
}

function parseRaceAndGender(state: GameState, character: Character, value: unknown): Pick<Character, 'raceId' | 'gender'> & Partial<Pick<Character, 'mimorianEnemyId'>> {
  if (typeof value !== 'string') invalid('racesAndGender');
  const parts = value.split('/');
  const raceId = parts[0] as RaceId;
  const gender = parts[1];
  if (!EDITABLE_RACES.has(raceId) || (gender !== 'male' && gender !== 'female')) invalid('racesAndGender');
  if (raceId !== 'mimorian' && parts.length !== 2) invalid('racesAndGender');
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
  const unknownMember = Object.keys(parameters).find((key) => !ALLOWED_PARAMETERS.has(key));
  if (unknownMember !== undefined) invalid(`${unknownMember}.unknown_member`);
  const partyIndex = state.parties.findIndex((party) => party.characters.some((candidate) => candidate.id === characterId));
  if (partyIndex < 0) throw new Error('not_found');
  const party = state.parties[partyIndex];
  const character = party.characters.find((candidate) => candidate.id === characterId)!;
  const requested: Partial<Character> = {};

  if (parameters.name !== undefined) {
    const name = parameters.name;
    // The rule suffix matches the schema keyword a contract violation reports (`type`, `minLength`, `maxLength`).
    if (typeof name !== 'string') invalid('name.type');
    if (name.trim().length === 0) invalid('name.minLength');
    if (name.length > MAX_CHARACTER_NAME_LENGTH) invalid('name.maxLength');
    requested.name = name;
  }
  const currentSelection = character.uniqueCharacterId ?? 'none';
  let selection: 'none' | UniqueCharacterId = currentSelection;
  if (parameters.uniqueSelection !== undefined) {
    // SpecRef: 8.2.3 | Unique selection: `none` or an available `uniqueCharacterId`.
    const value = parameters.uniqueSelection;
    if (typeof value !== 'string') invalid('uniqueSelection.type');
    if (value !== 'none' && !getUniqueCharacterDef(value)) invalid('uniqueSelection.unknown_value');
    selection = value as 'none' | UniqueCharacterId;
  }
  const changingSelection = selection !== currentSelection;
  let identityFixed = false;
  if (changingSelection) {
    if (selection === 'none') {
      // SpecRef: 8.2.3 | Changing a unique character to `none`: race falls back by table order when unique-only or blocked; lineage and predisposition reset; gender and classes are kept. Explicit parameters below override.
      Object.assign(requested, {
        isUnique: false, uniqueCharacterId: undefined,
        ...resolveReleasedUniqueBuild(character, party.characters.filter((candidate) => candidate.id !== character.id)),
      });
    } else {
      const requestedDef = getUniqueCharacterDef(selection)!;
      // SpecRef: 2.1.4.2 | Unique character `Available At`: selectable once its PT is unlocked.
      if (!isUniqueCharacterAvailable(requestedDef, state.parties.length)) illegal('unique_character_unavailable');
      if (!validUniqueSelections(state, character).includes(selection)) illegal('unique_character_assigned');
      const def = getUniqueCharacterDef(selection)!;
      const identity: Partial<Character> = {
        isUnique: true, uniqueCharacterId: def.id, name: translate(state.global.language, `character.default.${def.nameKey}`),
        gender: def.gender, raceId: def.raceId, mimorianEnemyId: undefined, lineageId: def.lineageId, predispositionId: 'none',
      };
      // A unique character fixes its own name, race, gender, lineage and predisposition.
      const conflicting = (parameters.name !== undefined && parameters.name !== identity.name)
        || (parameters.racesAndGender !== undefined && parameters.racesAndGender !== `${def.raceId}/${def.gender}`)
        || (parameters.lineage !== undefined && parameters.lineage !== def.lineageId)
        || (parameters.predisposition !== undefined && parameters.predisposition !== 'none');
      if (conflicting) illegal('unique_character_immutable');
      Object.assign(requested, identity);
      identityFixed = true;
    }
  }
  if (!identityFixed && parameters.racesAndGender !== undefined) Object.assign(requested, parseRaceAndGender(state, character, parameters.racesAndGender));
  if (parameters.mainClassId !== undefined) {
    const classId = typeof parameters.mainClassId === 'string' ? stripClassPrefix(parameters.mainClassId) : null;
    if (classId === null || !CLASSES.some((entry) => entry.id === classId)) invalid('mainClassId');
    requested.mainClassId = classId as Character['mainClassId'];
  }
  if (parameters.subClassId !== undefined) {
    const classId = typeof parameters.subClassId === 'string' ? stripClassPrefix(parameters.subClassId) : null;
    if (classId === null || !CLASSES.some((entry) => entry.id === classId)) invalid('subClassId');
    requested.subClassId = classId as Character['subClassId'];
  }
  if (!identityFixed && parameters.lineage !== undefined) {
    const lineage = typeof parameters.lineage === 'string' ? LINEAGES.find((entry) => entry.id === parameters.lineage) : undefined;
    if (!lineage || lineage.selectable !== true) invalid('lineage');
    requested.lineageId = lineage.id;
  }
  if (!identityFixed && parameters.predisposition !== undefined) {
    const predisposition = typeof parameters.predisposition === 'string' ? PREDISPOSITIONS.find((entry) => entry.id === parameters.predisposition) : undefined;
    if (!predisposition || predisposition.selectable !== true) invalid('predisposition');
    requested.predispositionId = predisposition.id;
  }

  if (character.isUnique && !changingSelection) {
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
  if (nextCharacter.isUnique !== true && duplicateRaceAndGender) illegal('duplicate_race_and_gender');

  const updates = Object.fromEntries(Object.entries(requested).filter(([key, value]) => value !== character[key as keyof Character])) as Partial<Character>;
  const effectiveCharacter = { ...character, ...updates };
  const oldMaximum = computeCharacterStats(character, party.level).maxEquipSlots;
  const nextMaximum = computeCharacterStats(effectiveCharacter, party.level).maxEquipSlots;
  const equipmentSlotsRemoved = Math.max(0, oldMaximum - nextMaximum);
  const reducedSlotContainsEquipment = equipmentSlotsRemoved > 0
    && character.equipment.slice(nextMaximum, oldMaximum).some((item) => item != null);
  const lostAptitudeItems: Record<EquipmentAptitude, number> = { melee: 0, ranged: 0, magic: 0 };
  for (const item of character.equipment) {
    if (item == null || !canCharacterEquipCategory(character, item.category) || canCharacterEquipCategory(effectiveCharacter, item.category)) continue;
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
