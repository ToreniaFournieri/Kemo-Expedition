import { evaluateEquipmentSet } from '../../game/equipmentSets';
import { computeCharacterStats } from '../../game/characterComputation';
import type { GameState } from '../../types';

// SpecRef: 9.1.4.5 | Confirmation protocol | Confirmation challenge and choices
// Decides, from one immutable snapshot, whether a commit needs the confirmation flow and which choices it offers.

export interface ApiV1ConfirmationPolicy {
  warningKey: string;
  warningArgs: Record<string, string | number | boolean>;
  /** The parameter that carries the caller's choice; absent for plain yes/no confirmations. */
  choiceField?: string;
  allowedChoices: string[];
}

const LOAD_SET = /^commit\/build\/character\/(\d+)\/loadEquipmentSet$/;

/** Every choice a partial equipment-set load may take. `equipSet` is deliberately absent: it needs every exact item. */
export const PARTIAL_LOAD_CHOICES = ['equipSimilar', 'equipExactMatchesOnly'] as const;

export function resolveConfirmationPolicy(operation: string, state: GameState, parameters: Record<string, unknown>): ApiV1ConfirmationPolicy | null {
  if (operation === 'commit/setting/backup/reset') return { warningKey: 'api.warning.backupReset', warningArgs: {}, allowedChoices: [] };
  if (operation === 'commit/setting/backup/import') return { warningKey: 'api.warning.backupImport', warningArgs: {}, allowedChoices: [] };
  const load = operation.match(LOAD_SET);
  if (!load) return null;

  const characterId = Number(load[1]);
  const party = state.parties.find((entry) => entry.characters.some((character) => character.id === characterId));
  const character = party?.characters.find((entry) => entry.id === characterId);
  const set = state.global.savedEquipmentSets.find((entry) => entry.slot === Number(parameters.equipmentSetId));
  // Unknown character or set: no challenge; the commit itself reports `not_found`.
  if (!party || !character || !set) return null;
  const maxSlots = computeCharacterStats(character, party.level).maxEquipSlots;
  const availability = evaluateEquipmentSet(set, character, state.global.inventory, maxSlots);
  if (availability.allAvailable) return null;
  return {
    warningKey: 'api.warning.equipmentSetPartial',
    warningArgs: { unavailable: availability.entries.filter((entry) => !entry.available).length, total: availability.entries.length },
    choiceField: 'loadMode',
    allowedChoices: [...PARTIAL_LOAD_CHOICES],
  };
}
