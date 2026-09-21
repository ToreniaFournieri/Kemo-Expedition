import assert from 'node:assert/strict';
import { executeApiV1CommitTransaction, type ApiV1ControlMetadata } from '../../src/api/v1/authority';
import { applyApiV1Commit, type ApiV1CommitContext } from '../../src/api/v1/commitOperations';
import { createFreshGameState, gameReducer } from '../../src/hooks/useGameState';
import { canCharacterEquipCategory } from '../../src/game/equipmentSets';
import { getVariantKey, type GameState } from '../../src/types';
import { planEquipmentIntent, type EquipmentIntent } from '../../src/api/v1/equipmentIntents';

// SpecRef: 9.1.4.9 | Operation-specific completion rules | Party build and equipment
// Slot-addressed equipment commands must validate the whole request against one snapshot and report real effects.

function context(equipmentHistory: ApiV1CommitContext['equipmentHistory'] = {}): ApiV1CommitContext {
  return {
    simulatedAt: 0, gameMode: 'mode.normal', enemyLevelOffset: 0, settings: {}, equipmentHistory,
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
assert.deepEqual(
  Object.keys((locked.data as { current: Record<string, unknown> }).current).sort(),
  ['equipment', 'mode', 'redoAvailable', 'undoAvailable'],
  'equipment commands return the complete current response contract',
);
assert.equal((locked.data as { current: { mode: string; undoAvailable: boolean } }).current.mode, 'FULL');
assert.equal((locked.data as { current: { mode: string; undoAvailable: boolean } }).current.undoAvailable, true);
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

// A valid no-op neither creates history nor clears an existing redo branch.
const noOpHistory: ApiV1CommitContext['equipmentHistory'] = {
  [String(characterId)]: { undo: [], redo: [{ slot: 0, name: 'redo', createdAt: 0, equipment: [] }] },
};
applyApiV1Commit(path('lockEquipment'), locked.state, { targetEquipment: armor }, context(noOpHistory));
assert.equal(noOpHistory[String(characterId)].undo.length, 0);
assert.equal(noOpHistory[String(characterId)].redo.length, 1);
const noOpControl: ApiV1ControlMetadata = {
  revisionHighWater: 7, receipts: [], tombstones: [], equipmentHistory: structuredClone(noOpHistory),
};
const noOpCommit = await executeApiV1CommitTransaction({
  operation: path('lockEquipment'), expectedRevision: 7, idempotencyKey: 'equipment-noop-0001', requestId: 'noop',
  parameters: { targetEquipment: armor }, uploadedFiles: {}, state: locked.state, simulatedAt: 0, control: noOpControl,
}, {
  gameMode: 'mode.normal', enemyLevelOffset: 0, cycleDurationScale: 1, applyAutoEquipment: (state) => state,
  persist: async () => undefined, publish: async () => undefined, createOpaqueId: () => 'opaque', createRandomSeed: () => 1, now: () => 0,
});
assert.equal(noOpCommit.ok, true);
if (!noOpCommit.ok) throw new Error(noOpCommit.error.code);
assert.equal(noOpCommit.response.revision, 7, 'a valid equipment no-op does not advance revision');
assert.equal(noOpCommit.stateChanged, false);

// Undo validates the target before changing either history stack.
const missingItem = { ...first, id: 999998, jewel: null };
const unavailableTarget = { slot: 0, name: 'unavailable', createdAt: 0, equipment: [{ slotIndex: 0, item: missingItem, isLocked: false }] };
const undoHistory: ApiV1CommitContext['equipmentHistory'] = {
  [String(characterId)]: { undo: [unavailableTarget], redo: [] },
};
fails(base, 'undoEquipment', {}, 'illegal_action');
let undoError = '';
try { applyApiV1Commit(path('undoEquipment'), base, {}, context(undoHistory)); } catch (error) { undoError = String(error); }
assert.ok(undoError.includes('illegal_action'));
assert.equal(undoHistory[String(characterId)].undo.length, 1);
assert.equal(undoHistory[String(characterId)].redo.length, 0);

// The Party equipment controls translate into the API commands the handlers accept, applied in order.
{
  const run = (state: GameState, intent: EquipmentIntent): GameState => {
    let current = state;
    for (const command of planEquipmentIntent(current, characterId, intent)) {
      current = applyApiV1Commit(path(command.action), current, command.parameters, context()).state;
    }
    return current;
  };
  const commandNames = (state: GameState, intent: EquipmentIntent) => planEquipmentIntent(state, characterId, intent).map((command) => command.action);

  // Unequip: an occupied slot is removed; an empty slot has nothing to remove.
  assert.deepEqual(commandNames(base, { kind: 'equip', slotIndex: armor, itemKey: null }), ['removeEquipment']);
  assert.throws(() => planEquipmentIntent(base, characterId, { kind: 'equip', slotIndex: emptySlot >= 0 ? emptySlot : 99, itemKey: null }), /illegal_action/);
  const removed = run(base, { kind: 'equip', slotIndex: armor, itemKey: null });
  assert.equal(character(removed).equipment[armor], null);

  // Equip into an empty slot is one command; replacing an occupied slot removes it first and re-equips.
  const spare = Object.entries(removed.global.inventory).find(([, variant]) => variant.status === 'owned' && variant.count > 0 && canCharacterEquipCategory(character(removed), variant.item.category));
  assert.ok(spare, 'the freed item is available in the inventory');
  const [spareKey, spareVariant] = spare!;
  const freeSlot = character(removed).equipment.findIndex((item) => item === null);
  assert.deepEqual(commandNames(removed, { kind: 'equip', slotIndex: freeSlot, itemKey: spareKey }), ['equip']);
  const occupied = character(removed).equipment.findIndex((item) => item !== null);
  assert.deepEqual(commandNames(removed, { kind: 'equip', slotIndex: occupied, itemKey: spareKey }), ['equip'], 'a replacement is one atomic command');
  assert.equal((planEquipmentIntent(removed, characterId, { kind: 'equip', slotIndex: occupied, itemKey: spareKey })[0].parameters as { targetSlot: number }).targetSlot, occupied);
  const replaced = run(removed, { kind: 'equip', slotIndex: occupied, itemKey: spareKey });
  assert.equal(getVariantKey(character(replaced).equipment[occupied]!), getVariantKey(spareVariant.item), 'the item lands in the tapped slot');
  assert.ok(Object.values(replaced.global.inventory).some((variant) => variant.item.id === character(removed).equipment[occupied]!.id && variant.count > 0), 'the displaced item returns to the inventory');
  const equipped = run(removed, { kind: 'equip', slotIndex: freeSlot, itemKey: spareKey });
  assert.ok(character(equipped).equipment.some((item) => item && getVariantKey(item) === getVariantKey(spareVariant.item)));
  assert.throws(() => planEquipmentIntent(base, characterId, { kind: 'equip', slotIndex: 0, itemKey: 'missing-key' }), /not_found/);

  // Lock direction follows the current state; the Jewel toggle removes an attached rank and otherwise attaches.
  const fullMode: GameState = { ...base, parties: base.parties.map((party, index) => index === 0 ? { ...party, characters: party.characters.map((entry) => entry.id === characterId ? { ...entry, autoEquipmentMode: 2 as const } : entry) } : party) };
  assert.deepEqual(commandNames(fullMode, { kind: 'toggleLock', slotIndex: armor }), ['lockEquipment']);
  const locked = run(fullMode, { kind: 'toggleLock', slotIndex: armor });
  assert.equal(character(locked).equipment[armor]!.isLocked, true);
  assert.deepEqual(commandNames(locked, { kind: 'toggleLock', slotIndex: armor }), ['unlockEquipment']);
  const withJewel = run(seeded, { kind: 'attachJewel', slotIndex: armor, jewelKey: 'fort', rank: 3 });
  assert.deepEqual(character(withJewel).equipment[armor]!.jewel, { key: 'fort', rank: 3 });
  assert.deepEqual(commandNames(withJewel, { kind: 'attachJewel', slotIndex: armor, jewelKey: 'fort', rank: 3 }), ['jewelRemove']);
  assert.equal(character(run(withJewel, { kind: 'attachJewel', slotIndex: armor, jewelKey: 'fort', rank: 3 })).equipment[armor]!.jewel ?? null, null);

  // Mode and Auto Equipment intents map to the single autoEquipment command.
  assert.deepEqual(planEquipmentIntent(base, characterId, { kind: 'setMode', mode: 1 }), [{ action: 'autoEquipment', parameters: { mode: 'SEMI', immediateAutoEquipment: false } }]);
  assert.deepEqual(planEquipmentIntent(base, characterId, { kind: 'runAuto' }), [{ action: 'autoEquipment', parameters: { mode: 'FULL', immediateAutoEquipment: true } }]);
  assert.deepEqual(commandNames(base, { kind: 'removeAll' }), ['removeAllEquipment']);
  assert.deepEqual(commandNames(base, { kind: 'undo' }), ['undoEquipment']);
  assert.deepEqual(commandNames(base, { kind: 'redo' }), ['redoEquipment']);
  assert.throws(() => planEquipmentIntent(base, 999999, { kind: 'removeAll' }), /not_found/);
}

// `equip` with `targetSlot`: exactly one item, into a real slot, replacing the occupant atomically.
{
  const freeArmorFormat = (state: GameState) => {
    const entry = Object.values(state.global.inventory).find((variant) => variant.status === 'owned' && variant.count > 0 && canCharacterEquipCategory(character(state), variant.item.category))!;
    return `${entry.item.isLocked ? 1 : 0}/${entry.item.id}/${entry.item.enhancement}/${entry.item.superRare}`;
  };
  const freed = applyApiV1Commit(path('removeEquipment'), base, { targetEquipment: armor }, context()).state;
  const format = freeArmorFormat(freed);
  const placed = applyApiV1Commit(path('equip'), freed, { targetEquipment: format, targetSlot: armor }, context()).state;
  assert.ok(character(placed).equipment[armor], 'the requested slot is filled');
  fails(freed, 'equip', { targetEquipment: [format, format], targetSlot: armor }, 'invalid_request');
  fails(freed, 'equip', { targetEquipment: format, targetSlot: -1 }, 'invalid_request');
  fails(freed, 'equip', { targetEquipment: format, targetSlot: '1' }, 'invalid_request');
  fails(freed, 'equip', { targetEquipment: format, targetSlot: 99 }, 'illegal_action');
  fails(freed, 'equip', { targetEquipment: '0/999999/0/0', targetSlot: armor }, 'illegal_action');

  // A character whose equipment array is shorter than its slot count still has free slots to fill.
  const shortArray: GameState = { ...freed, parties: freed.parties.map((party, index) => index === 0 ? { ...party, characters: party.characters.map((entry) => entry.id === characterId ? { ...entry, equipment: [] } : entry) } : party) };
  const filled = applyApiV1Commit(path('equip'), shortArray, { targetEquipment: format }, context()).state;
  assert.ok(character(filled).equipment.some((item) => item !== null && item !== undefined), 'equip works when the array is shorter than the slot count');
  const toSlot = applyApiV1Commit(path('equip'), shortArray, { targetEquipment: format, targetSlot: 2 }, context()).state;
  assert.ok(character(toSlot).equipment[2], 'an explicit slot beyond the array length is honored');
}

// The commit history keeps at most 30 states per character, and a projection would list exactly those.
{
  const history: ApiV1CommitContext['equipmentHistory'] = {};
  let state: GameState = base;
  const format = (() => { const item = character(base).equipment[armor]!; return `${item.isLocked ? 1 : 0}/${item.id}/${item.enhancement}/${item.superRare}`; })();
  for (let index = 0; index < 16; index += 1) {
    state = applyApiV1Commit(path('removeEquipment'), state, { targetEquipment: armor }, context(history)).state;
    state = applyApiV1Commit(path('equip'), state, { targetEquipment: format, targetSlot: armor }, context(history)).state;
  }
  assert.equal(history[String(characterId)].undo.length, 30, '32 equipment changes retain only the 30 most recent states');
  assert.equal(history[String(characterId)].redo.length, 0);
}

console.log('apiV1EquipmentSlots profile ok');
