import assert from 'node:assert/strict';
import { applyApiV1Commit, type ApiV1CommitContext } from '../../src/api/v1/commitOperations';
import { createFreshGameState, gameReducer } from '../../src/hooks/useGameState';
import { canCharacterEquipCategory } from '../../src/game/equipmentSets';
import { getVariantKey, type GameState } from '../../src/types';

// SpecRef: 9.1.4.9 | Operation-specific completion rules | Party build and equipment
// Slot-addressed equipment commands must validate the whole request against one snapshot and report real effects.

function context(): ApiV1CommitContext {
  return {
    simulatedAt: 0, gameMode: 'mode.normal', enemyLevelOffset: 0, settings: {}, equipmentHistory: {},
    uploadedFiles: {}, canonicalFiles: {}, applyAutoEquipment: (state) => state, createDeliveryId: () => 'd', now: () => 0,
  };
}

const base = createFreshGameState('ja', Date.parse('2026-01-01T00:00:00.000Z'));
const characterId = base.parties[0].characters[0].id;
const path = (action: string) => `commit/build/character/${characterId}/${action}`;
const character = (state: GameState) => state.parties[0].characters.find((entry) => entry.id === characterId)!;

const filled = character(base).equipment.map((item, slot) => item ? slot : -1).filter((slot) => slot >= 0);
assert.ok(filled.length >= 2, 'fixture character has at least two equipped slots');
const armorSlot = filled.find((slot) => character(base).equipment[slot]!.category === 'armor');
assert.notEqual(armorSlot, undefined, 'fixture has an armor item');
const emptySlot = character(base).equipment.findIndex((item) => item === null);

// Seed jewels: fort (allowed for armor), might (not allowed for armor).
let seeded: GameState = { ...base, global: { ...base.global, jewels: { 'fort:3': 1, 'fort:4': 1, 'might:1': 1 } } };
const seededKeys = Object.keys(seeded.global.jewels);
assert.equal(seededKeys.length, 3);

function fails(state: GameState, action: string, parameters: Record<string, unknown>, marker: string): void {
  let message = '';
  try { applyApiV1Commit(path(action), state, parameters, context()); } catch (error) { message = String(error); }
  assert.ok(message.includes(marker), `${action} ${JSON.stringify(parameters)} expected ${marker}, got "${message}"`);
}

const armor = armorSlot as number;

// jewelAttach: shape errors.
fails(seeded, 'jewelAttach', { targetEquipment: armor, jewelToSet: 'fort' }, 'invalid_request');
fails(seeded, 'jewelAttach', { targetEquipment: armor, jewelToSet: 'gem:3' }, 'invalid_request');
fails(seeded, 'jewelAttach', { targetEquipment: armor, jewelToSet: 'fort:9' }, 'invalid_request');
fails(seeded, 'jewelAttach', { targetEquipment: [armor, armor], jewelToSet: 'fort:3' }, 'invalid_request');
fails(seeded, 'jewelAttach', { targetEquipment: [], jewelToSet: 'fort:3' }, 'invalid_request');
fails(seeded, 'jewelAttach', { targetEquipment: 99, jewelToSet: 'fort:3' }, 'invalid_request');
// jewelAttach: state errors.
fails(seeded, 'jewelAttach', { targetEquipment: armor, jewelToSet: 'might:1' }, 'illegal_action'); // incompatible category
fails(seeded, 'jewelAttach', { targetEquipment: armor, jewelToSet: 'fort:7' }, 'illegal_action'); // not owned
if (emptySlot >= 0) fails(seeded, 'jewelAttach', { targetEquipment: emptySlot, jewelToSet: 'fort:3' }, 'illegal_action');

// jewelAttach success consumes exactly one jewel and attaches it.
const attached = applyApiV1Commit(path('jewelAttach'), seeded, { targetEquipment: armor, jewelToSet: 'fort:3' }, context());
assert.deepEqual(character(attached.state).equipment[armor]!.jewel, { key: 'fort', rank: 3 });
assert.equal(attached.state.global.jewels['fort:3'], undefined, 'the attached jewel leaves the inventory');
assert.equal(seeded.global.jewels['fort:3'], 1, 'the input snapshot is untouched');

// Attaching the same jewel again is a no-op, NOT a silent removal.
const again = applyApiV1Commit(path('jewelAttach'), attached.state, { targetEquipment: armor, jewelToSet: 'fort:3' }, context());
assert.deepEqual(character(again.state).equipment[armor]!.jewel, { key: 'fort', rank: 3 });

// Replacing returns the previous jewel to the inventory.
const replaced = applyApiV1Commit(path('jewelAttach'), attached.state, { targetEquipment: armor, jewelToSet: 'fort:4' }, context());
assert.deepEqual(character(replaced.state).equipment[armor]!.jewel, { key: 'fort', rank: 4 });
assert.equal(replaced.state.global.jewels['fort:3'], 1);

// jewelRemove: really removes the attached jewel and returns it to the inventory (regression: it was a silent no-op).
const removed = applyApiV1Commit(path('jewelRemove'), attached.state, { targetEquipment: armor }, context());
assert.equal(character(removed.state).equipment[armor]!.jewel ?? null, null);
assert.equal(removed.state.global.jewels['fort:3'], 1);
// jewelRemove without an attached jewel, and atomically with one bad slot in a batch, are illegal.
fails(seeded, 'jewelRemove', { targetEquipment: armor }, 'illegal_action');
fails(attached.state, 'jewelRemove', { targetEquipment: [armor, filled.find((slot) => slot !== armor)!] }, 'illegal_action');
fails(attached.state, 'jewelRemove', { targetEquipment: [armor, armor] }, 'invalid_request');

// removeEquipment: real effect, atomic validation.
const other = filled.find((slot) => slot !== armor)!;
const unequipped = applyApiV1Commit(path('removeEquipment'), seeded, { targetEquipment: [armor, other] }, context());
assert.equal(character(unequipped.state).equipment[armor], null);
assert.equal(character(unequipped.state).equipment[other], null);
if (emptySlot >= 0) fails(seeded, 'removeEquipment', { targetEquipment: [armor, emptySlot] }, 'illegal_action');
fails(seeded, 'removeEquipment', { targetEquipment: [armor, armor] }, 'invalid_request');
fails(seeded, 'removeEquipment', { targetEquipment: -1 }, 'invalid_request');

// lock/unlock require FULL auto-equipment mode and a filled slot; already-desired state is a no-op.
const semi = gameReducer(seeded, { type: 'UPDATE_CHARACTER', partyIndex: 0, characterId, updates: { autoEquipmentMode: 1 } });
fails(semi, 'lockEquipment', { targetEquipment: armor }, 'illegal_action');
fails(semi, 'unlockEquipment', { targetEquipment: armor }, 'illegal_action');
const full = gameReducer(semi, { type: 'UPDATE_CHARACTER', partyIndex: 0, characterId, updates: { autoEquipmentMode: 2 } });
assert.equal(character(full).autoEquipmentMode, 2);
const locked = applyApiV1Commit(path('lockEquipment'), full, { targetEquipment: armor }, context());
assert.equal(character(locked.state).equipment[armor]!.isLocked, true);
const lockedAgain = applyApiV1Commit(path('lockEquipment'), locked.state, { targetEquipment: armor }, context());
assert.equal(character(lockedAgain.state).equipment[armor]!.isLocked, true);
const unlocked = applyApiV1Commit(path('unlockEquipment'), locked.state, { targetEquipment: armor }, context());
assert.equal(character(unlocked.state).equipment[armor]!.isLocked === true, false);
if (emptySlot >= 0) fails(full, 'lockEquipment', { targetEquipment: [armor, emptySlot] }, 'illegal_action');
seeded = full;

// removeEquipment is a manual change: a FULL character is demoted to SEMI, matching the UI path (Spec 8.2.4).
assert.equal(character(base).autoEquipmentMode, 2, 'fixture starts in FULL mode');
assert.equal(character(unequipped.state).autoEquipmentMode, 1, 'removeEquipment demotes FULL to SEMI');

// equip: atomic, owned-count, aptitude, and free-slot validation.
const bare = applyApiV1Commit(path('removeAllEquipment'), base, {}, context()).state;
const slotsTotal = character(bare).equipment.length;
const formatOf = (item: { id: number; enhancement: number; superRare: number }) => `0/${item.id}/${item.enhancement}/${item.superRare}`;
const original = character(base).equipment.filter((item): item is NonNullable<typeof item> => item !== null);
const first = original[0];
assert.ok(bare.global.inventory[getVariantKey(first)]?.count >= 1, 'removed equipment returns to inventory');

fails(bare, 'equip', { targetEquipment: 'nonsense' }, 'invalid_request');
fails(bare, 'equip', { targetEquipment: '0/1/9/0' }, 'invalid_request');
fails(bare, 'equip', { targetEquipment: [] }, 'invalid_request');
fails(bare, 'equip', { targetEquipment: '0/999999/0/0' }, 'illegal_action');

const equippedOne = applyApiV1Commit(path('equip'), bare, { targetEquipment: formatOf(first) }, context());
assert.equal(character(equippedOne.state).equipment.filter(Boolean).length, 1);
assert.equal(character(equippedOne.state).equipment[0]!.id, first.id, 'items fill the first empty slot');
assert.equal(character(equippedOne.state).autoEquipmentMode, 1, 'equip demotes FULL to SEMI');
assert.equal(bare.global.inventory[getVariantKey(first)].count - 1, equippedOne.state.global.inventory[getVariantKey(first)]?.count ?? 0);

// Repeating one variant requests several copies; asking for more than owned rejects the whole request.
const owned = bare.global.inventory[getVariantKey(first)].count;
fails(bare, 'equip', { targetEquipment: Array(owned + 1).fill(formatOf(first)) }, 'illegal_action');
if (owned >= 2 && slotsTotal >= 2) {
  const twice = applyApiV1Commit(path('equip'), bare, { targetEquipment: [formatOf(first), formatOf(first)] }, context());
  assert.equal(character(twice.state).equipment.filter(Boolean).length, 2);
}

// Aptitude: a category the character cannot use is illegal, and nothing is applied.
const blocked = (['sword', 'arrow', 'wand'] as const).find((category) => !canCharacterEquipCategory(character(bare), category));
if (blocked) {
  const alien = { ...first, id: 990001, category: blocked, jewel: null };
  const withAlien: GameState = { ...bare, global: { ...bare.global, inventory: { ...bare.global.inventory, [getVariantKey(alien)]: { item: alien, count: 1, status: 'owned' as const, isNew: false } } } };
  fails(withAlien, 'equip', { targetEquipment: [formatOf(first), formatOf(alien)] }, 'illegal_action');
}

// No free slot: requesting more items than there are empty slots rejects the whole request.
const plenty: GameState = { ...base, global: { ...base.global, inventory: { ...base.global.inventory, [getVariantKey(first)]: { item: first, count: 99, status: 'owned' as const, isNew: false } } } };
const emptyCount = character(plenty).equipment.filter((item) => item === null).length;
fails(plenty, 'equip', { targetEquipment: Array(emptyCount + 1).fill(formatOf(first)) }, 'illegal_action');
if (emptyCount > 0) {
  const filledExactly = applyApiV1Commit(path('equip'), plenty, { targetEquipment: Array(emptyCount).fill(formatOf(first)) }, context());
  assert.equal(character(filledExactly.state).equipment.every((item) => item !== null), true);
}

console.log('apiV1EquipmentSlots profile ok');
