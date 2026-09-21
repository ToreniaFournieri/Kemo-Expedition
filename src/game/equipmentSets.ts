import { CLASSES } from '../data/classes';
import { LINEAGES } from '../data/lineages';
import { PREDISPOSITIONS } from '../data/predispositions';
import { RACES } from '../data/races';
import { addItemToInventory, removeItemFromInventory } from './inventoryMutation';
import {
  addJewelToInventory,
  planAutoJewelAssignmentsForCharacter,
  removeJewelFromInventory,
} from './jewel';
import type {
  Character,
  InventoryRecord,
  Item,
  ItemCategory,
  JewelInventory,
  SavedEquipmentEntry,
  SavedEquipmentSet,
} from '../types';
import { getVariantKey } from '../types';

export const MAX_SAVED_EQUIPMENT_SETS = 99;

const MELEE_CATEGORIES = new Set<ItemCategory>(['sword', 'katana', 'gauntlet']);
const RANGED_CATEGORIES = new Set<ItemCategory>(['arrow', 'bolt', 'archery']);
const MAGIC_CATEGORIES = new Set<ItemCategory>(['wand', 'grimoire', 'catalyst']);

export type EquipmentAptitude = 'melee' | 'ranged' | 'magic';

/** The combat aptitude an item category needs (`c.equip_melee`, `c.equip_ranged`, `c.equip_magic`); null for none. */
export function getEquipmentAptitudeForCategory(category: ItemCategory): EquipmentAptitude | null {
  if (MELEE_CATEGORIES.has(category)) return 'melee';
  if (RANGED_CATEGORIES.has(category)) return 'ranged';
  if (MAGIC_CATEGORIES.has(category)) return 'magic';
  return null;
}

export type EquipmentSetLoadMode = 'exact' | 'similar';

export interface EquipmentSetAvailability {
  allAvailable: boolean;
  entries: Array<{ entry: SavedEquipmentEntry; available: boolean }>;
}

/** Legacy saved sets were dense arrays; new snapshots persist the exact slot explicitly. */
export function getSavedEquipmentSlot(entry: SavedEquipmentEntry, legacyIndex: number): number {
  return Number.isInteger(entry.slotIndex) ? entry.slotIndex! : legacyIndex;
}

/**
 * Creates an exact, in-memory equipment state target.  Undo/Redo deliberately
 * uses the same target shape and availability evaluator as saved equipment
 * sets, so category aptitude, duplicate variants, and slot limits cannot
 * drift between the two features.
 */
export function createEquipmentSetSnapshot(equipment: readonly (Item | null | undefined)[]): SavedEquipmentSet {
  return {
    slot: 0,
    name: '',
    createdAt: 0,
    equipment: equipment.flatMap((item, slotIndex) => item ? [{
      slotIndex,
      // Jewels are not part of an equipment state: they return to the inventory when equipment is removed, and every
      // restore assigns Jewels afresh (see applyEquipmentSet), so a saved state never carries one.
      item: { ...item, jewel: null },
      isLocked: item.isLocked === true,
    }] : []),
  };
}

export function getCharacterEquipmentCapabilities(character: Character): {
  melee: boolean;
  ranged: boolean;
  magic: boolean;
} {
  const race = RACES.find((value) => value.id === character.raceId);
  const mainClass = CLASSES.find((value) => value.id === character.mainClassId);
  const subClass = CLASSES.find((value) => value.id === character.subClassId);
  const predisposition = PREDISPOSITIONS.find((value) => value.id === character.predispositionId);
  const lineage = LINEAGES.find((value) => value.id === character.lineageId);
  if (!race || !mainClass || !subClass || !predisposition || !lineage) {
    return { melee: false, ranged: false, magic: false };
  }

  const isMaster = character.mainClassId === character.subClassId;
  const bonusGroups = [
    race.bonuses,
    mainClass.mainSubBonuses,
    isMaster ? mainClass.masterBonuses : mainClass.mainBonuses,
    ...(isMaster ? [] : [subClass.mainSubBonuses]),
    predisposition.bonuses,
    lineage.bonuses,
  ];
  let melee = false;
  let ranged = false;
  let magic = false;
  bonusGroups.flat().forEach((bonus) => {
    if (bonus.type === 'grit' || bonus.type === 'equip_melee') melee = true;
    if (bonus.type === 'pursuit' || bonus.type === 'equip_ranged') ranged = true;
    if (bonus.type === 'caster' || bonus.type === 'equip_magic') magic = true;
  });
  return { melee, ranged, magic };
}

export function canCharacterEquipCategory(character: Character, category: ItemCategory): boolean {
  const capabilities = getCharacterEquipmentCapabilities(character);
  if (MELEE_CATEGORIES.has(category)) return capabilities.melee;
  if (RANGED_CATEGORIES.has(category)) return capabilities.ranged;
  if (MAGIC_CATEGORIES.has(category)) return capabilities.magic;
  return true;
}

function createVirtualInventory(character: Character, inventory: InventoryRecord): InventoryRecord {
  const next = { ...inventory };
  character.equipment.forEach((item) => {
    if (!item) return;
    const detached = { ...item, jewel: null };
    const key = getVariantKey(detached);
    const existing = next[key];
    next[key] = existing
      ? { ...existing, count: existing.count + 1, status: 'owned' }
      : { item: detached, count: 1, status: 'owned' };
  });
  return next;
}

function takeExact(inventory: InventoryRecord, entry: SavedEquipmentEntry): Item | null {
  const key = getVariantKey(entry.item);
  const variant = inventory[key];
  if (!variant || variant.count <= 0) return null;
  return { ...variant.item, jewel: null };
}

function takeSimilar(inventory: InventoryRecord, entry: SavedEquipmentEntry): { key: string; item: Item } | null {
  if (entry.item.superRare > 0) return null;
  const candidates = Object.entries(inventory)
    .filter(([, variant]) => variant.count > 0
      && variant.item.id === entry.item.id
      && variant.item.superRare === 0
      && variant.item.enhancement <= entry.item.enhancement)
    .sort(([, a], [, b]) => b.item.enhancement - a.item.enhancement);
  const candidate = candidates[0];
  return candidate ? { key: candidate[0], item: { ...candidate[1].item, jewel: null } } : null;
}

/**
 * Whether each stored item can be equipped now: it must be in the inventory (or already worn), the character must
 * have the aptitude, and the slot must exist. Jewels are not part of availability: they are stored separately and
 * assigned independently every time equipment is set (Spec 8.2.4).
 */
export function evaluateEquipmentSet(
  set: SavedEquipmentSet,
  character: Character,
  inventory: InventoryRecord,
  maxSlots: number,
): EquipmentSetAvailability {
  let available = createVirtualInventory(character, inventory);
  const entries = set.equipment.map((entry, index) => {
    const slotIndex = getSavedEquipmentSlot(entry, index);
    const eligible = slotIndex >= 0 && slotIndex < maxSlots && canCharacterEquipCategory(character, entry.item.category);
    const exact = eligible ? takeExact(available, entry) : null;
    if (exact) available = removeItemFromInventory(available, getVariantKey(exact));
    return { entry, available: Boolean(exact) };
  });
  return { allAvailable: entries.every((value) => value.available), entries };
}

export function applyEquipmentSet(
  set: SavedEquipmentSet,
  character: Character,
  inventory: InventoryRecord,
  jewels: JewelInventory,
  gold: number,
  maxSlots: number,
  mode: EquipmentSetLoadMode,
): { character: Character; inventory: InventoryRecord; jewels: JewelInventory; gold: number } {
  let nextInventory = inventory;
  let nextJewels = jewels;
  let nextGold = gold;

  character.equipment.forEach((item) => {
    if (!item) return;
    const detached = { ...item, jewel: null };
    const result = addItemToInventory(nextInventory, detached, nextGold);
    nextInventory = result.inventory;
    nextGold = result.gold;
    if (item.jewel) nextJewels = addJewelToInventory(nextJewels, item.jewel.key, item.jewel.rank);
  });

  const equipment: (Item | null)[] = Array.from(
    { length: Math.max(character.equipment.length, maxSlots) },
    () => null,
  );
  set.equipment.forEach((entry, index) => {
    const slotIndex = getSavedEquipmentSlot(entry, index);
    if (slotIndex < 0 || slotIndex >= maxSlots) return;
    if (!canCharacterEquipCategory(character, entry.item.category)) return;
    const exactKey = getVariantKey(entry.item);
    const exact = takeExact(nextInventory, entry);
    const candidate = exact
      ? { key: exactKey, item: exact }
      : mode === 'similar' ? takeSimilar(nextInventory, entry) : null;
    if (!candidate) return;
    nextInventory = removeItemFromInventory(nextInventory, candidate.key);
    equipment[slotIndex] = { ...candidate.item, isLocked: entry.isLocked, jewel: null };
  });

  let nextCharacter: Character = {
    ...character,
    equipment,
    autoEquipmentMode: character.autoEquipmentMode === 2 ? 1 : character.autoEquipmentMode,
  };
  // Every item was set without a Jewel, so Jewels are assigned independently, by the same allocator Auto Equipment
  // uses (strongest first, only Jewels the item's category accepts and the inventory still holds).
  const assignments = planAutoJewelAssignmentsForCharacter(nextCharacter, nextJewels);
  assignments.forEach((assignment) => {
    const item = nextCharacter.equipment[assignment.slotIndex];
    if (!item) return;
    nextJewels = removeJewelFromInventory(nextJewels, assignment.key, assignment.rank);
    const nextEquipment = [...nextCharacter.equipment];
    nextEquipment[assignment.slotIndex] = { ...item, jewel: { key: assignment.key, rank: assignment.rank } };
    nextCharacter = { ...nextCharacter, equipment: nextEquipment };
  });

  return { character: nextCharacter, inventory: nextInventory, jewels: nextJewels, gold: nextGold };
}

export function normalizeSavedEquipmentSets(value: unknown): SavedEquipmentSet[] {
  if (!Array.isArray(value)) return [];
  const occupied = new Set<number>();
  return value.flatMap((raw): SavedEquipmentSet[] => {
    if (!raw || typeof raw !== 'object') return [];
    const candidate = raw as Partial<SavedEquipmentSet>;
    if (!Number.isInteger(candidate.slot) || candidate.slot! < 1 || candidate.slot! > MAX_SAVED_EQUIPMENT_SETS || occupied.has(candidate.slot!)) return [];
    if (typeof candidate.name !== 'string' || !Array.isArray(candidate.equipment)) return [];
    const occupiedEquipmentSlots = new Set<number>();
    const equipment = candidate.equipment.flatMap((entry, legacyIndex): SavedEquipmentEntry[] => {
      if (!entry || typeof entry !== 'object' || !(entry as SavedEquipmentEntry).item) return [];
      const saved = entry as SavedEquipmentEntry;
      const slotIndex = getSavedEquipmentSlot(saved, legacyIndex);
      if (!Number.isSafeInteger(slotIndex) || slotIndex < 0 || occupiedEquipmentSlots.has(slotIndex)) return [];
      occupiedEquipmentSlots.add(slotIndex);
      // Older saves stored a Jewel with each item; a saved set carries none, since Jewels are assigned afresh on every restore.
      return [{ slotIndex, item: { ...saved.item, jewel: null }, isLocked: saved.isLocked === true }];
    });
    occupied.add(candidate.slot!);
    return [{ slot: candidate.slot!, name: candidate.name.slice(0, 80), createdAt: Number(candidate.createdAt) || Date.now(), equipment }];
  }).sort((a, b) => a.slot - b.slot);
}
