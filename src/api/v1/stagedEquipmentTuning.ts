import { DUNGEONS, getDungeonById } from '../../data/dungeons';
import { getSuperRareBonuses, ITEMS } from '../../data/items';
import { computeCharacterStats } from '../../game/characterComputation';
import { canCharacterEquipCategory } from '../../game/equipmentSets';
import { listExpeditionRoomEnemyCandidates } from '../../game/expeditionBattleRoom';
import { getExpeditionSimulationRoomCoordinate } from '../../game/expeditionSimulation';
import { getItemBasePower } from '../../game/itemPower';
import { getItemRarityById } from '../../game/itemRarity';
import { AUTO_JEWEL_ASSIGNMENT_CATEGORY_ORDER, AUTO_JEWEL_KEY_BY_ITEM_CATEGORY } from '../../game/jewel';
import { getCharacterMultiplier } from '../../game/partyComputation';
import { getItemTier } from '../../game/pricing';
import {
  getVariantKey, type AbilityId, type Bonus, type Character, type ElementalOffense, type ElementalResistance, type EnemyDef,
  type ExpeditionSimulationResult, type GameState, type Item, type ItemCategory,
} from '../../types';
import {
  createRandom, deriveSeed, fingerprintOfSummary, planGaChangeSummary,
  type GaChangeEntry, type GaSearchDependencies, type StoredBuildResult,
} from './gaSearch';
import { measureObjective, objectiveSimulationOptions, prepareObjectiveState, routeRoomCount, type ObjectiveMeasure } from './objectiveMeasure';
import { buildSimulationRunData, floorRoomLabel } from './simulationView';

// SpecRef: 7.1.5 | Staged Equipment Tuning
// SpecRef: 9.1.3 | Read | 2-3-7 character/stagedEquipmentTuning
// SpecRef: 9.1.4.9 | Operation-specific completion rules | stagedEquipmentTuning
// Tunes one character's equipment in stages: a baseline finds the bottleneck room, steps 2–4 try other offense elements,
// defense elements, and ability items on quick runs, step 5 combines the qualifying candidates greedily, and step 6
// accepts the result only when it beats the current build by the gate margin and by more than luck.

export const TUNING_OBJECTIVES = ['success', 'minDefeat', 'bossDamage'] as const;
export type TuningObjective = typeof TUNING_OBJECTIVES[number];
/** The score a tuning compares builds by: its objective, or `progress` when `success` is 0 in step 1 (`scoredBy`). */
export type TuningScore = TuningObjective | 'progress';
export const STAGED_TUNING_BASELINE_RUNS = 1000;
const OFFENSE_REQUESTS = ['noRequest', 'e.fire', 'e.ice', 'e.thunder', 'e.none'] as const;

/** `[minimum, maximum, default]` of each integer parameter (Spec 9.1.3, 2-3-7; ranges in 9.1.4.9). */
const INTEGER_PARAMETERS = {
  quickRuns: [10, 1000, 300], finalTuningRuns: [50, 1000, 500],
  offenseElementTrialRuns: [0, 10, 3], offenseElementCandidateCount: [1, 3, 2],
  defenseElementTrialRuns: [0, 20, 5], defenseElementCandidateCount: [1, 3, 2],
  abilityTrialRuns: [0, 50, 20], abilityCandidateCount: [1, 3, 2],
} as const;
type IntegerParameter = keyof typeof INTEGER_PARAMETERS;
/** `minImprovement` and `minGateImprovement`: a relative improvement, `0` to `10` (1000%). */
const RATIO_PARAMETERS = { minImprovement: 0.07, minGateImprovement: 0.07 } as const;
type RatioParameter = keyof typeof RATIO_PARAMETERS;

export interface StagedTuningRequest extends Record<IntegerParameter, number>, Record<RatioParameter, number> {
  characterId: number;
  partyIndex: number;
  objective: TuningObjective;
  /** The requested offense element, or `null` for `noRequest`. */
  offenseElementRequest: ElementalOffense | null;
  /** The requested seed, or `null` for a random one. */
  seed: number | null;
}

function invalid(field: string): never { throw new Error(`invalid_request:${field}`); }

/** Validates a `stagedEquipmentTuning` request (Spec 9.1.3, 2-3-7). Throws `invalid_request:<field>` or `not_found`. */
export function parseStagedTuningRequest(state: GameState, raw: Record<string, unknown>): StagedTuningRequest {
  const allowed = new Set(['characterId', 'baselineRuns', 'offenseElementRequest', 'objective', 'seed', ...Object.keys(INTEGER_PARAMETERS), ...Object.keys(RATIO_PARAMETERS)]);
  const unknown = Object.keys(raw).find((key) => !allowed.has(key));
  if (unknown !== undefined) invalid(`${unknown}.unknown_member`);
  const characterId = raw.characterId;
  if (typeof characterId !== 'number' || !Number.isSafeInteger(characterId) || characterId < 1) invalid('characterId');
  const partyIndex = state.parties.findIndex((party) => party.characters.some((character) => character.id === characterId));
  if (partyIndex < 0) throw new Error('not_found');
  // `baselineRuns` is a constant: it may be sent, but only as its value.
  if (raw.baselineRuns !== undefined && raw.baselineRuns !== STAGED_TUNING_BASELINE_RUNS) invalid('baselineRuns');
  const integers = Object.fromEntries((Object.keys(INTEGER_PARAMETERS) as IntegerParameter[]).map((key) => {
    const [minimum, maximum, fallback] = INTEGER_PARAMETERS[key];
    const value = raw[key] === undefined ? fallback : raw[key];
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > maximum) invalid(key);
    return [key, value];
  })) as Record<IntegerParameter, number>;
  const ratios = Object.fromEntries((Object.keys(RATIO_PARAMETERS) as RatioParameter[]).map((key) => {
    const value = raw[key] === undefined ? RATIO_PARAMETERS[key] : raw[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10) invalid(key);
    return [key, value];
  })) as Record<RatioParameter, number>;
  const request = raw.offenseElementRequest === undefined ? 'noRequest' : raw.offenseElementRequest;
  if (typeof request !== 'string' || !(OFFENSE_REQUESTS as readonly string[]).includes(request)) invalid('offenseElementRequest');
  const objective = raw.objective === undefined ? 'success' : raw.objective;
  if (typeof objective !== 'string' || !(TUNING_OBJECTIVES as readonly string[]).includes(objective)) invalid('objective');
  const seed = raw.seed === undefined ? null : raw.seed;
  if (seed !== null && (typeof seed !== 'number' || !Number.isSafeInteger(seed))) invalid('seed');
  return {
    characterId, partyIndex, objective: objective as TuningObjective,
    offenseElementRequest: request === 'noRequest' ? null : request.slice(2) as ElementalOffense,
    seed: seed as number | null,
    ...integers, ...ratios,
  };
}

// ---------------- Item facts ----------------

type Element = ElementalResistance;
const ELEMENTS: readonly Element[] = ['ice', 'thunder', 'fire'];
const NOA_BONUS: Partial<Record<ItemCategory, 'meleeNoABonus' | 'rangedNoABonus' | 'magicalNoABonus'>> = { gauntlet: 'meleeNoABonus', archery: 'rangedNoABonus', catalyst: 'magicalNoABonus' };
// Categories that fill the same role, for placing an item when no slot holds its own category (7.1.2.2 Group Item category).
const CATEGORY_GROUP: Record<ItemCategory, string> = {
  sword: 'weapon', katana: 'weapon', arrow: 'weapon', bolt: 'weapon', wand: 'weapon', grimoire: 'weapon',
  gauntlet: 'NoA', archery: 'NoA', catalyst: 'NoA', armor: 'armor', robe: 'robe', shield: 'shield',
};
// Bonuses whose copies add up; every other bonus counts once however many items carry it.
const STACKING_BONUS_TYPES = new Set<Bonus['type']>(['vitality', 'strength', 'intelligence', 'mind', 'ability', 'unimplemented_bonus']);

interface ItemFacts {
  item: Item;
  /** The `target d. bonus` the Party pane shows for this character (7.1.2.2 step 4), plus `c.N_NoA` for NoA items. */
  power: number;
  offense: ReadonlySet<Element>;
  resists: ReadonlySet<Element>;
  abilities: readonly AbilityId[];
  /** Bonuses that do not stack: two items sharing one give the effect once (Spec 7.1.5 General rules). */
  signatures: readonly string[];
}

const round6 = (value: number): number => Math.round(value * 1e6) / 1e6;

function describeItem(item: Item, character: Character): ItemFacts {
  const bonuses = [...(item.bonuses ?? []), ...getSuperRareBonuses(item.superRare)];
  const offense = new Set<Element>();
  if (item.elementalOffense && item.elementalOffense !== 'none') offense.add(item.elementalOffense);
  const resists = new Set<Element>();
  const signatures = new Set<string>();
  const abilities: AbilityId[] = [];
  for (const bonus of bonuses) {
    for (const element of ELEMENTS) {
      if (bonus.type === `${element}_offense` && bonus.value > 0) offense.add(element);
      if ((bonus.type === `${element}_defense` && bonus.value > 0) || (bonus.type === `${element}_defense_multiplier_xV` && bonus.value < 1)) resists.add(element);
    }
    if (bonus.type === 'ability' && bonus.abilityId) abilities.push(bonus.abilityId);
    if (!STACKING_BONUS_TYPES.has(bonus.type)) signatures.add(`c.${bonus.type}${bonus.abilityId ? `.${bonus.abilityId}` : ''}+${round6(bonus.value)}`);
  }
  if (item.accuracyBonus) signatures.add(`c.accuracy+${round6(item.accuracyBonus)}`);
  if (item.evasionBonus) signatures.add(`c.evasion+${round6(item.evasionBonus)}`);
  if (item.penetBonus) signatures.add(`c.penet+${round6(item.penetBonus)}`);
  const noABonus = NOA_BONUS[item.category];
  const power = getItemBasePower({ ...item, jewel: null }) * getCharacterMultiplier(character, item.category) + (noABonus ? item[noABonus] ?? 0 : 0);
  return { item, power, offense, resists, abilities, signatures: [...signatures] };
}

// ---------------- Model ----------------

/** Variant key per slot; a locked slot holds its own item, which never changes. */
type Loadout = (string | null)[];

interface TuningModel {
  state: GameState;
  partyIndex: number;
  character: Character;
  /** Unlocked slots within the slot count: the slots a candidate may change. */
  open: number[];
  locked: Set<number>;
  /** Items a candidate may place: the owned Inventory and the character's own unlocked items (never other characters'). */
  pool: Map<string, number>;
  facts: Map<string, ItemFacts>;
  /** Pool keys the character can equip, by category. */
  byCategory: Map<ItemCategory, string[]>;
  /** The Jewels in the Inventory; with those freed from replaced items they fill the changed slots. */
  freeJewels: Record<string, number>;
  /** The current items: every candidate and the tuned build are compared with this build as it is. */
  current: Loadout;
  /** Highest power of each category over the pool and the current items, to compare items across categories. */
  bestPower: Map<ItemCategory, number>;
}

const jewelKeyOf = (item: Item | null | undefined): string | null => item?.jewel ? `${item.jewel.key}:${item.jewel.rank}` : null;
const loadoutKey = (loadout: Loadout): string => loadout.join(',');

function buildModel(state: GameState, partyIndex: number, characterId: number): TuningModel {
  const party = state.parties[partyIndex];
  const character = party.characters.find((entry) => entry.id === characterId)!;
  const slotCount = computeCharacterStats(character, party.level).maxEquipSlots;
  const length = Math.max(slotCount, character.equipment.length);
  const facts = new Map<string, ItemFacts>();
  const pool = new Map<string, number>();
  const factsOf = (item: Item) => {
    const key = getVariantKey(item);
    if (!facts.has(key)) facts.set(key, describeItem({ ...item, jewel: null }, character));
    return key;
  };
  for (const entry of Object.values(state.global.inventory)) {
    if (entry.status !== 'owned' || entry.count <= 0) continue;
    const key = factsOf(entry.item);
    pool.set(key, (pool.get(key) ?? 0) + entry.count);
  }
  const locked = new Set<number>();
  const open: number[] = [];
  const freeJewels: Record<string, number> = {};
  for (const [key, count] of Object.entries(state.global.jewels)) if (count > 0) freeJewels[key] = count;
  const current: Loadout = new Array(length).fill(null);
  for (let slot = 0; slot < length; slot += 1) {
    const item = character.equipment[slot] ?? null;
    if (item?.isLocked) {
      locked.add(slot);
      current[slot] = factsOf(item);
      continue;
    }
    if (item) {
      const key = factsOf(item);
      pool.set(key, (pool.get(key) ?? 0) + 1);
      current[slot] = key;
    }
    if (slot < slotCount) open.push(slot);
  }
  const byCategory = new Map<ItemCategory, string[]>();
  const bestPower = new Map<ItemCategory, number>();
  for (const [key, entry] of facts) {
    const category = entry.item.category;
    bestPower.set(category, Math.max(bestPower.get(category) ?? 0, entry.power));
    if (!pool.has(key) || !canCharacterEquipCategory(character, category)) continue;
    byCategory.set(category, [...(byCategory.get(category) ?? []), key]);
  }
  for (const keys of byCategory.values()) keys.sort();
  return { state, partyIndex, character, open, locked, pool, facts, byCategory, freeJewels, current, bestPower };
}

const factsAt = (model: TuningModel, loadout: Loadout, slot: number): ItemFacts | null => {
  const key = loadout[slot];
  return key ? model.facts.get(key)! : null;
};

/** Offense elements the items of a loadout carry (`e.none` items carry none). */
function offenseElementsOf(model: TuningModel, loadout: Loadout): Set<Element> {
  const elements = new Set<Element>();
  loadout.forEach((key) => { if (key) for (const element of model.facts.get(key)!.offense) elements.add(element); });
  return elements;
}

function resistancesOf(model: TuningModel, loadout: Loadout): Set<Element> {
  const elements = new Set<Element>();
  loadout.forEach((key) => { if (key) for (const element of model.facts.get(key)!.resists) elements.add(element); });
  return elements;
}

/** Copies of `key` the loadout uses; the pool limits them. */
const usageOf = (model: TuningModel, loadout: Loadout, key: string): number => loadout.reduce((sum, entry, slot) => sum + (entry === key && !model.locked.has(slot) ? 1 : 0), 0);

/** Whether `key` may go into `slot`: an equippable copy is left and none of its bonuses is already on another item. */
function fits(model: TuningModel, loadout: Loadout, slot: number, key: string): boolean {
  if (loadout[slot] === key) return false;
  if (usageOf(model, loadout, key) >= (model.pool.get(key) ?? 0)) return false;
  const signatures = new Set(model.facts.get(key)!.signatures);
  if (signatures.size === 0) return true;
  return !loadout.some((other, index) => other && index !== slot && model.facts.get(other)!.signatures.some((signature) => signatures.has(signature)));
}

/** How weak the item in a slot is next to the best item of its category (0 = empty slot). */
const relativePower = (model: TuningModel, loadout: Loadout, slot: number): number => {
  const facts = factsAt(model, loadout, slot);
  return facts ? facts.power / Math.max(1, model.bestPower.get(facts.item.category) ?? 1) : 0;
};

/**
 * Open slots for an item of `category`, best first: an empty slot, then the weakest item of the same category, then of
 * the same group (7.1.2.2 Group Item category), then of any category.
 */
function placementSlots(model: TuningModel, loadout: Loadout, category: ItemCategory, exclude: ReadonlySet<number> = new Set()): number[] {
  const rank = (slot: number): number => {
    const facts = factsAt(model, loadout, slot);
    if (!facts) return 0;
    if (facts.item.category === category) return 1;
    return CATEGORY_GROUP[facts.item.category] === CATEGORY_GROUP[category] ? 2 : 3;
  };
  return model.open.filter((slot) => !exclude.has(slot))
    .sort((a, b) => rank(a) - rank(b) || relativePower(model, loadout, a) - relativePower(model, loadout, b) || a - b);
}

/** Trial 0 takes the strongest key; later trials draw at random, weighted toward stronger items, so each trial differs. */
function draw(model: TuningModel, keys: readonly string[], trial: number, random: () => number): string | null {
  if (keys.length === 0) return null;
  const power = (key: string) => model.facts.get(key)!.power;
  if (trial === 0) return keys.reduce((best, key) => (power(key) > power(best) ? key : best));
  const weight = (key: string) => Math.max(1, power(key)) ** 2;
  let roll = random() * keys.reduce((sum, key) => sum + weight(key), 0);
  for (const key of keys) { roll -= weight(key); if (roll < 0) return key; }
  return keys[keys.length - 1];
}

/** Pool keys of `category` that fit `slot` and satisfy `accept`. */
const optionsFor = (model: TuningModel, loadout: Loadout, slot: number, category: ItemCategory, accept: (facts: ItemFacts) => boolean): string[] =>
  (model.byCategory.get(category) ?? []).filter((key) => accept(model.facts.get(key)!) && fits(model, loadout, slot, key));

/** Pool keys that fit `slot` and satisfy `accept`: of the slot's own category, or of any category for an empty slot. */
function slotOptions(model: TuningModel, loadout: Loadout, slot: number, accept: (facts: ItemFacts) => boolean): string[] {
  const current = factsAt(model, loadout, slot);
  const categories = current ? [current.item.category] : [...model.byCategory.keys()];
  return categories.flatMap((category) => optionsFor(model, loadout, slot, category, accept));
}

/**
 * Places one item that satisfies `accept` (steps 2 and 3): an empty slot first, then the slot whose item is weakest next
 * to the best of its category; a filled slot keeps its category. Trial 0 takes the best slot, later trials one of the
 * best three. Returns the slot, or -1 when no slot can take such an item.
 */
function placeOne(model: TuningModel, loadout: Loadout, accept: (facts: ItemFacts) => boolean, trial: number, random: () => number, exclude: ReadonlySet<number>): number {
  const placements = model.open.filter((slot) => !exclude.has(slot))
    .map((slot) => ({ slot, options: slotOptions(model, loadout, slot, accept) }))
    .filter((placement) => placement.options.length > 0)
    .sort((a, b) => relativePower(model, loadout, a.slot) - relativePower(model, loadout, b.slot) || a.slot - b.slot);
  if (placements.length === 0) return -1;
  const chosen = trial === 0 ? placements[0] : placements[Math.floor(random() * Math.min(placements.length, 3))];
  loadout[chosen.slot] = draw(model, chosen.options, trial, random)!;
  return chosen.slot;
}

/**
 * Final checks of a candidate loadout: it differs from the current build, it uses no more copies than the pool holds, no item
 * it placed shares a non-stacking bonus with another item, every item still has a slot (an item granting
 * `c.equip_slot` may have been replaced), and it does not mix more offense elements than the build it came from.
 */
function acceptable(model: TuningModel, loadout: Loadout, from: Loadout): boolean {
  if (loadoutKey(loadout) === loadoutKey(model.current)) return false;
  const used = new Map<string, number>();
  loadout.forEach((key, slot) => { if (key && !model.locked.has(slot)) used.set(key, (used.get(key) ?? 0) + 1); });
  if ([...used].some(([key, count]) => count > (model.pool.get(key) ?? 0))) return false;
  const placed = model.open.filter((slot) => loadout[slot] !== null && loadout[slot] !== model.current[slot]);
  for (const slot of placed) {
    const signatures = new Set(model.facts.get(loadout[slot]!)!.signatures);
    if (signatures.size > 0 && loadout.some((other, index) => other && index !== slot && model.facts.get(other)!.signatures.some((signature) => signatures.has(signature)))) return false;
  }
  const party = model.state.parties[model.partyIndex];
  const slots = computeCharacterStats({ ...model.character, equipment: equipmentOf(model, loadout) }, party.level).maxEquipSlots;
  if (model.open.some((slot) => loadout[slot] !== null && slot >= slots)) return false;
  return offenseElementsOf(model, loadout).size <= Math.max(1, offenseElementsOf(model, from).size);
}

// ---------------- Jewels ----------------

/** The loadout as equipment: an unchanged slot keeps its item and Jewel, a changed slot gets its new item without one. */
function equipmentOf(model: TuningModel, loadout: Loadout): (Item | null)[] {
  return loadout.map((key, slot) => {
    if (model.locked.has(slot) || key === model.current[slot]) return model.character.equipment[slot] ?? null;
    return key ? { ...model.facts.get(key)!.item, jewel: null } : null;
  });
}

/**
 * Jewels of a simulated build (Spec 7.1.5 Jewels): unchanged slots, locked ones included, keep their Jewels, and only the
 * slots whose item changed get one, by the 7.1.2.2 step 8 allocation: each changed item, in category order, gets the
 * highest rank of its category's Jewel. The candidates are the Inventory Jewels (whatever the Jewel Priority Party) and the
 * Jewels freed from the replaced items; a type and rank already on an unchanged slot or given earlier is not given again.
 * Jewels of other characters are never used.
 */
function allocateJewels(model: TuningModel, loadout: Loadout): (Item | null)[] {
  const equipment = equipmentOf(model, loadout);
  const changed = model.open.filter((slot) => loadout[slot] !== model.current[slot]);
  if (changed.length === 0) return equipment;
  const pool = { ...model.freeJewels };
  for (const slot of changed) {
    const freed = jewelKeyOf(model.character.equipment[slot]);
    if (freed) pool[freed] = (pool[freed] ?? 0) + 1;
  }
  const used = new Set(equipment.flatMap((item, slot) => (changed.includes(slot) ? [] : [jewelKeyOf(item)].filter((id): id is string => id !== null))));
  for (const category of AUTO_JEWEL_ASSIGNMENT_CATEGORY_ORDER) {
    const key = AUTO_JEWEL_KEY_BY_ITEM_CATEGORY[category];
    if (!key) continue;
    for (const slot of changed) {
      const item = equipment[slot];
      if (!item || item.category !== category) continue;
      for (let rank = 8; rank >= 1; rank -= 1) {
        const id = `${key}:${rank}`;
        if ((pool[id] ?? 0) <= 0 || used.has(id)) continue;
        pool[id] -= 1;
        used.add(id);
        equipment[slot] = { ...item, jewel: { key, rank } };
        break;
      }
    }
  }
  return equipment;
}

/** The state with the character wearing `equipment`; the party gets a new character array (its stats cache is keyed by it). */
function withEquipment(model: TuningModel, equipment: (Item | null)[]): GameState {
  const parties = [...model.state.parties];
  const party = parties[model.partyIndex];
  parties[model.partyIndex] = { ...party, characters: party.characters.map((entry) => (entry.id === model.character.id ? { ...entry, equipment } : entry)) };
  return { ...model.state, parties };
}

// ---------------- Bottleneck ----------------

interface Bottleneck { room: number | null; enemies: EnemyDef[]; terrain: string | null }

/**
 * Step 1: the room with the most Draw + Retreat + Defeat ends. When no run ends early, the boss room if a run reached it,
 * otherwise the latest elite room a run reached. A `bossDamage` forecast is the boss battle alone: always the boss room.
 */
function findBottleneck(state: GameState, partyIndex: number, result: ExpeditionSimulationResult, bossOnly: boolean): Bottleneck {
  const dungeon = getDungeonById(state.parties[partyIndex].selectedDungeonId);
  if (!dungeon) return { room: null, enemies: [], terrain: null };
  const roomDef = (room: number) => {
    const { floor, roomInFloor } = getExpeditionSimulationRoomCoordinate(room);
    return { floor, def: dungeon.floors.find((entry) => entry.floorNumber === floor)?.rooms[roomInFloor - 1] };
  };
  let room: number | null = null;
  let worst = 0;
  if (bossOnly) room = result.rooms.find((entry) => roomDef(entry.room).def?.type === 'battle_Boss')?.room ?? null;
  else {
    for (const entry of result.rooms) {
      const ends = entry.Draw + entry.Retreat + entry.Defeat;
      if (ends > worst) { worst = ends; room = entry.room; }
    }
  }
  if (room === null) {
    const reached = result.rooms.filter((entry) => entry.reached > 0 && roomDef(entry.room).def);
    const boss = reached.find((entry) => roomDef(entry.room).def!.type === 'battle_Boss');
    const elite = [...reached].reverse().find((entry) => roomDef(entry.room).def!.type === 'battle_Elite');
    room = boss?.room ?? elite?.room ?? null;
  }
  if (room === null) return { room: null, enemies: [], terrain: null };
  const { floor, def } = roomDef(room);
  return {
    room,
    enemies: def ? listExpeditionRoomEnemyCandidates(def, floor) : [],
    terrain: dungeon.floors.find((entry) => entry.floorNumber === floor)?.terrainEffect ?? null,
  };
}

/** How much damage of `element` the bottleneck enemies take on average (1 = neutral; null, absorb, and reflect take none). */
function elementAffinity(enemies: readonly EnemyDef[], element: ElementalOffense): number {
  if (element === 'none' || enemies.length === 0) return 1;
  return enemies.reduce((sum, enemy) => {
    if (enemy.abilities.some((ability) => ability.id === `${element}_null` || ability.id === `${element}_absorb` || ability.id === `${element}_reflect`)) return sum;
    const multiplier = (enemy.bonuses ?? []).filter((bonus) => bonus.type === `${element}_defense_multiplier_xV`).reduce((product, bonus) => product * bonus.value, 1);
    return sum + enemy.elementalResistance[element] * multiplier;
  }, 0) / enemies.length;
}

/**
 * SpecRef: 7.1.5.1 | Counter ability map | Enemy ability counters. Each counter ability lists the enemy abilities it answers
 * (the protect and barrier breakers also cover reflect and absorb).
 */
const ENEMY_ABILITY_COUNTERS: Readonly<Record<string, readonly string[]>> = {
  null_counter: ['counter', 're_counter'],
  illusion_breaker: ['illusion'],
  bulwark_breaker: ['bulwark'],
  defender_breaker: ['defender'],
  m_barrier_breaker: ['m_barrier', 'magical_reflect', 'magical_absorb'],
  fire_protect_breaker: ['fire_reflect', 'fire_absorb'],
  ice_protect_breaker: ['ice_reflect', 'ice_absorb'],
  thunder_protect_breaker: ['thunder_reflect', 'thunder_absorb'],
  pursuit: ['stealth', 'flee'],
  rage_breaker: ['rage'],
  momentum_breaker: ['momentum'],
  execution_null: ['execution'],
  anti_ambush: ['ambush'],
  anti_overwatch: ['overwatch'],
  unforgettable: ['oblivion', 'fading_memory'],
  null_shock: ['shock'],
  null_corrode: ['corrode'],
  null_life_drain: ['life_drain'],
  null_death_touch: ['death_touch'],
  null_burn: ['burn'],
  null_bind: ['bind'],
  coldproof: ['frostbite'],
  requiem: ['reanimate'],
};

/** SpecRef: 7.1.5.1 | Counter ability map | Terrain counters (`a.output-stabilizer` only on penalty terrains). */
const TERRAIN_COUNTERS: Readonly<Record<string, readonly string[]>> = {
  output_stabilizer: ['terrain.rough-waves', 'terrain.heavy-wind', 'terrain.burrow', 'terrain.gravity'],
  wind_rider: ['terrain.tailwind'],
  true_sight: ['terrain.fog', 'terrain.ash-haze'],
  equation_breaker: ['terrain.machine-logic', 'terrain.silence-field'],
  domain_breaker: ['terrain.floor-domain', 'terrain.cap-domain', 'terrain.echo-domain', 'terrain.silence-field',
    'terrain.duelist-domain', 'terrain.sniper-domain', 'terrain.spell-domain'],
  defiance: ['terrain.suppression'],
  unforgettable: ['terrain.deletion'],
  dryproof: ['terrain.dry'],
  vine_cutter: ['terrain.vine-snare'],
  mana_ward: ['terrain.crystal-zone', 'terrain.mana-burn'],
  siege: ['terrain.fortified'],
};

/** Whether `ability` counters an ability of a bottleneck enemy or the bottleneck room's terrain. */
export function countersBottleneck(ability: string, enemyAbilities: ReadonlySet<string>, terrain: string | null): boolean {
  return (ENEMY_ABILITY_COUNTERS[ability] ?? []).some((target) => enemyAbilities.has(target))
    || (terrain !== null && (TERRAIN_COUNTERS[ability] ?? []).includes(terrain));
}

/** The counters of the bottleneck room in map order, each with the enemy abilities and the terrain it answers there. */
export function bottleneckCounterRows(enemyAbilities: ReadonlySet<string>, terrain: string | null): { ability: string; answers: string[] }[] {
  const rows = new Map<string, string[]>();
  const add = (ability: string, answer: string) => rows.set(ability, [...(rows.get(ability) ?? []), answer]);
  for (const [ability, targets] of Object.entries(ENEMY_ABILITY_COUNTERS)) {
    for (const target of targets) if (enemyAbilities.has(target)) add(ability, `a.${target.replace(/_/g, '-')}`);
  }
  for (const [ability, terrains] of Object.entries(TERRAIN_COUNTERS)) if (terrain !== null && terrains.includes(terrain)) add(ability, terrain);
  return [...rows].map(([ability, answers]) => ({ ability, answers }));
}

// ---------------- Counter sources ----------------

/** Whether the Debug "Display all Compendium" / "Display all Bestiary" settings disclose every item / enemy (9.1.4.7). */
export interface CounterSourceDisclosure { allItems: boolean; allEnemies: boolean }

export interface CounterItemSource {
  itemId: number;
  tier: number;
  itemRarity: string;
  droppedBy: { expedition: number; enemyId: number; rooms: string[] }[];
}

/**
 * SpecRef: 9.1.4.9 | stagedEquipmentTuning | `bottleneckCounters[].sources`: the revealed items that grant `ability`, the
 * highest tier first, each with the encountered enemies that drop it and the rooms of each expedition where they appear.
 * Nothing undisclosed (9.1.4.7): an unrevealed item and an enemy never encountered are left out.
 */
export function counterItemSources(state: GameState, ability: string, disclosure: CounterSourceDisclosure): CounterItemSource[] {
  const revealed = new Set(state.global.revealedItemCompendiumItemIds ?? []);
  const sources = new Map<number, CounterItemSource>();
  for (const item of ITEMS) {
    if (sources.has(item.id) || !(disclosure.allItems || revealed.has(item.id))) continue;
    if (!(item.bonuses ?? []).some((bonus) => bonus.type === 'ability' && bonus.abilityId === ability)) continue;
    sources.set(item.id, { itemId: item.id, tier: getItemTier(item.id), itemRarity: getItemRarityById(item.id), droppedBy: [] });
  }
  if (sources.size === 0) return [];
  const encountered = (enemyId: number) => disclosure.allEnemies || (state.global.enemyBattleStats?.[enemyId]?.encounters ?? 0) > 0;
  for (const dungeon of DUNGEONS) {
    for (const floor of dungeon.floors) {
      floor.rooms.forEach((room, index) => {
        for (const enemy of listExpeditionRoomEnemyCandidates(room, floor.floorNumber)) {
          if (!encountered(enemy.id)) continue;
          for (const itemId of new Set(enemy.itemIds)) {
            const source = sources.get(itemId);
            if (!source) continue;
            let entry = source.droppedBy.find((drop) => drop.expedition === dungeon.id && drop.enemyId === enemy.id);
            if (!entry) source.droppedBy.push(entry = { expedition: dungeon.id, enemyId: enemy.id, rooms: [] });
            entry.rooms.push(`${floor.floorNumber}f-${index + 1}`);
          }
        }
      });
    }
  }
  return [...sources.values()].sort((a, b) => b.tier - a.tier || a.itemId - b.itemId);
}

// ---------------- Scores ----------------

/**
 * SpecRef: 7.1.5 | General rules | Improvement: the relative change on the rarer side of the score, `ratio - 1`. The ratio is
 * the larger of the rise of the good outcome and the fall of the bad one, so a threshold can be met near 0 and near 1 alike;
 * a zero denominator counts as 0.001, and equal scores are no change.
 */
export function tuningImprovement(score: TuningScore, current: number, candidate: number): number {
  if (current === candidate) return 0;
  // `minDefeat` is lower-is-better: its good outcome is the non-defeat rate.
  const [before, after] = score === 'minDefeat' ? [1 - current, 1 - candidate] : [current, candidate];
  const divide = (numerator: number, denominator: number) => numerator / (denominator === 0 ? 0.001 : denominator);
  return Math.max(divide(after, before), divide(1 - before, 1 - after)) - 1;
}

// SpecRef: 7.1.5 | General rules | Luck check: `gain > 2 × SE`, with the per-run variance of each score.
export function tuningLuckCheck(score: TuningScore, before: ObjectiveMeasure, after: ObjectiveMeasure, runs: number): { gain: number; standardError: number; passed: boolean } {
  const gain = score === 'minDefeat' ? before.rate - after.rate : after.rate - before.rate;
  const standardError = Math.sqrt(before.variance / runs + after.variance / runs);
  return { gain, standardError, passed: gain > 2 * standardError };
}

const round4 = (value: number): number => Math.round(value * 1e4) / 1e4;

// ---------------- Candidates ----------------

type TuningStep = 'offenseElement' | 'defenseElement' | 'ability';

interface Candidate {
  step: TuningStep;
  /** `e.fire`, `['r.thunder']`, or the abilities the item adds. */
  label: { element?: string; resistance?: string[]; abilities?: string[] };
  loadout: Loadout;
  /** Slots that differ from the current build, with the key placed there. */
  changes: { slot: number; key: string }[];
  improvement: number;
}

const changesOf = (model: TuningModel, loadout: Loadout) => loadout.flatMap((key, slot) => (key !== model.current[slot] && key !== null ? [{ slot, key }] : []));

/** Item Format of a pool key (`<locked>/<id>/<enhancement>/<superRare>`, the lock of the owned variant). */
const itemFormatOf = (model: TuningModel, key: string): string => {
  const item = model.facts.get(key)!.item;
  return `${item.isLocked ? 1 : 0}/${item.id}/${item.enhancement}/${item.superRare}`;
};

/**
 * Step 2 build for offense element `element`: every elemental item of another element becomes an item of the same
 * category with `element` (or with no element when the category has none); when the build still lacks `element`, the
 * weakest slots that can take an item of it get one, more of them on each trial (all of them on the last).
 */
function offenseCandidate(model: TuningModel, element: ElementalOffense, trial: number, trials: number, random: () => number): Loadout | null {
  const loadout = [...model.current];
  const matches = (facts: ItemFacts) => (element === 'none' ? facts.offense.size === 0 : facts.offense.size === 1 && facts.offense.has(element));
  for (const slot of model.open) {
    const facts = factsAt(model, loadout, slot);
    if (!facts || facts.offense.size === 0 || matches(facts)) continue;
    const category = facts.item.category;
    const elemental = optionsFor(model, loadout, slot, category, matches);
    const plain = element === 'none' ? elemental : optionsFor(model, loadout, slot, category, (entry) => entry.offense.size === 0);
    const key = draw(model, elemental.length > 0 ? elemental : plain, trial, random);
    // A slot that can neither switch nor lose its element would mix elements.
    if (!key) return null;
    loadout[slot] = key;
  }
  // Locked items keep their element; a build that would still mix is not a switch.
  if ([...model.locked].some((slot) => { const facts = factsAt(model, loadout, slot); return facts && facts.offense.size > 0 && !matches(facts); })) return null;
  if (element !== 'none' && !offenseElementsOf(model, loadout).has(element)) {
    const eligible = model.open.filter((slot) => slotOptions(model, loadout, slot, matches).length > 0);
    if (eligible.length === 0) return null;
    const count = Math.max(1, Math.round((eligible.length * (trial + 1)) / Math.max(1, trials)));
    const changed = new Set<number>();
    for (let index = 0; index < count; index += 1) {
      const slot = placeOne(model, loadout, matches, trial, random, changed);
      if (slot < 0) break;
      changed.add(slot);
    }
  }
  return acceptable(model, loadout, model.current) ? loadout : null;
}

/**
 * Step 3 build for resistance combination `combination`: every item resisting an element outside it becomes an item of
 * the same category that does not, and each element of it the build does not resist yet gets one item that resists it.
 * New items never bring another offense element.
 */
function defenseCandidate(model: TuningModel, combination: ReadonlySet<Element>, trial: number, random: () => number): Loadout | null {
  const loadout = [...model.current];
  const offense = offenseElementsOf(model, model.current);
  const compatible = (facts: ItemFacts) => [...facts.offense].every((element) => offense.has(element)) && [...facts.resists].every((element) => combination.has(element));
  for (const slot of [...model.locked]) if ([...(factsAt(model, loadout, slot)?.resists ?? [])].some((element) => !combination.has(element))) return null;
  for (const slot of model.open) {
    const facts = factsAt(model, loadout, slot);
    if (!facts || [...facts.resists].every((element) => combination.has(element))) continue;
    const key = draw(model, optionsFor(model, loadout, slot, facts.item.category, compatible), trial, random);
    if (!key) return null;
    loadout[slot] = key;
  }
  const changed = new Set(model.open.filter((slot) => loadout[slot] !== model.current[slot]));
  for (const element of ELEMENTS) {
    if (!combination.has(element) || resistancesOf(model, loadout).has(element)) continue;
    const slot = placeOne(model, loadout, (facts) => compatible(facts) && facts.resists.has(element), trial, random, changed);
    if (slot < 0) return null;
    changed.add(slot);
  }
  return acceptable(model, loadout, model.current) ? loadout : null;
}

/** Step 4 build: the item `key` in the best open slot (an empty slot, then its own category, its group, any category). */
function abilityCandidate(model: TuningModel, key: string): Loadout | null {
  const loadout = [...model.current];
  const category = model.facts.get(key)!.item.category;
  const slot = placementSlots(model, loadout, category).find((entry) => fits(model, loadout, entry, key));
  if (slot === undefined) return null;
  loadout[slot] = key;
  return acceptable(model, loadout, model.current) ? loadout : null;
}

/**
 * Adds a candidate's changes to a build for step 5. A change whose slot an earlier kept candidate already changed moves
 * to the best other open slot; null when no slot is left or the result breaks a rule.
 */
function addCandidate(model: TuningModel, loadout: Loadout, changed: ReadonlySet<number>, candidate: Candidate): { loadout: Loadout; changed: Set<number> } | null {
  const next = [...loadout];
  const used = new Set(changed);
  for (const change of candidate.changes) {
    let slot = change.slot;
    if (used.has(slot)) {
      const category = model.facts.get(change.key)!.item.category;
      const moved = placementSlots(model, next, category, used).find((entry) => fits(model, next, entry, change.key));
      if (moved === undefined) return null;
      slot = moved;
    }
    next[slot] = change.key;
    used.add(slot);
  }
  // Copies and shared bonuses are checked on the whole result, so the order of the changes does not matter.
  return acceptable(model, next, loadout) ? { loadout: next, changed: used } : null;
}

// ---------------- Run ----------------

export interface StagedTuningOutcome {
  partyNumber: number;
  data: Record<string, unknown>;
  /** The result `applyBuildResult` can apply; only an accepted tuning has one. */
  stored: StoredBuildResult | null;
}

/** Runs `stagedEquipmentTuning` (Spec 7.1.5; 9.1.3, 2-3-7). Never changes `state`. */
export async function runStagedEquipmentTuning(state: GameState, request: StagedTuningRequest, dependencies: GaSearchDependencies): Promise<StagedTuningOutcome> {
  const startedAt = dependencies.now();
  const { partyIndex, objective } = request;
  // SpecRef: 7.1.5 | Same dice | the item draws and the three run seeds all derive from `seed`.
  const seed = request.seed ?? dependencies.createSeed();
  const random = createRandom(deriveSeed(seed, 0));
  const quickSeed = deriveSeed(seed, 1); const finalSeed = deriveSeed(seed, 2); const baselineSeed = deriveSeed(seed, 3);
  const model = buildModel(state, partyIndex, request.characterId);
  let simulationRuns = 0;
  const options = objectiveSimulationOptions(objective);
  const simulate = async (target: GameState, runs: number, simulationSeed: number): Promise<ExpeditionSimulationResult> => {
    simulationRuns += runs;
    return await dependencies.simulate(prepareObjectiveState(target, partyIndex, objective), partyIndex, runs, simulationSeed, options) as ExpeditionSimulationResult;
  };
  // Equipment does not change the route (its gates and depth limit), so `progress` divides by one room count throughout.
  const routeRooms = routeRoomCount(prepareObjectiveState(state, partyIndex, objective).parties[partyIndex]);

  // 1. Baseline and bottleneck (the current build as it is, Jewels included).
  const baseline = await simulate(state, STAGED_TUNING_BASELINE_RUNS, baselineSeed);
  // SpecRef: 7.1.5 | General rules | Score: with no success in step 1 every build would tie at 0, so every step scores
  // `progress` instead.
  const scoredBy: TuningScore = objective === 'success' && measureObjective('success', baseline, routeRooms).rate === 0 ? 'progress' : objective;
  const measureOf = (result: ExpeditionSimulationResult) => measureObjective(scoredBy, result, routeRooms);
  const before = measureOf(baseline);
  const beforeScore = before.rate;
  const bottleneck = findBottleneck(state, partyIndex, baseline, options.bossRoomOnly === true);
  const enemies = bottleneck.enemies;

  const cache = new Map<string, ObjectiveMeasure>();
  const measureLoadout = async (loadout: Loadout, runs: number, simulationSeed: number): Promise<ObjectiveMeasure> => {
    const key = `${runs}:${simulationSeed}:${loadoutKey(loadout)}`;
    // The current items are the current build as it is.
    const target = loadoutKey(loadout) === loadoutKey(model.current) ? state : withEquipment(model, allocateJewels(model, loadout));
    if (!cache.has(key)) cache.set(key, measureOf(await simulate(target, runs, simulationSeed)));
    return cache.get(key)!;
  };
  const scoreLoadout = async (loadout: Loadout, runs: number, simulationSeed: number): Promise<number> => (await measureLoadout(loadout, runs, simulationSeed)).rate;

  // Steps 2–4 compare every candidate with the current build as it is, on one quick seed.
  const recorded: Record<TuningStep, Candidate[]> = { offenseElement: [], defenseElement: [], ability: [] };
  const anyStep = request.offenseElementTrialRuns > 0 || request.defenseElementTrialRuns > 0 || request.abilityTrialRuns > 0;
  const currentQuick = anyStep ? await scoreLoadout(model.current, request.quickRuns, quickSeed) : 0;
  const tried = new Set<string>();
  // Candidates each step simulated on the quick runs, recorded or not (0: the step had nothing to try).
  const candidatesTried: Record<TuningStep, number> = { offenseElement: 0, defenseElement: 0, ability: 0 };
  /** Simulates a candidate once per step; false when there is none or the step already tried the same build. */
  const evaluate = async (step: TuningStep, label: Candidate['label'], loadout: Loadout | null, into: Candidate[]): Promise<boolean> => {
    if (!loadout || tried.has(`${step}:${loadoutKey(loadout)}`)) return false;
    tried.add(`${step}:${loadoutKey(loadout)}`);
    candidatesTried[step] += 1;
    const improvement = tuningImprovement(scoredBy, currentQuick, await scoreLoadout(loadout, request.quickRuns, quickSeed));
    into.push({ step, label, loadout, changes: changesOf(model, loadout), improvement });
    return true;
  };
  // Every candidate each step simulated, recorded or not (`triedCandidates`).
  const simulated: Record<TuningStep, Candidate[]> = { offenseElement: [], defenseElement: [], ability: [] };
  const record = (step: TuningStep, candidates: Candidate[], trials: number) => {
    simulated[step] = candidates;
    recorded[step] = candidates.filter((candidate) => candidate.improvement >= request.minImprovement)
      .sort((a, b) => b.improvement - a.improvement).slice(0, Math.max(2, Math.floor(trials / 5)));
  };

  // 2. Offense elements: the requested one, or the elements the bottleneck enemies resist least.
  if (request.offenseElementTrialRuns > 0) {
    const current = offenseElementsOf(model, model.current);
    // A build that already mixes elements has no current element: every element is an alternative.
    const currentElement: ElementalOffense | null = current.size === 0 ? 'none' : current.size === 1 ? [...current][0] : null;
    const order: ElementalOffense[] = ['ice', 'thunder', 'fire', 'none'];
    const options = request.offenseElementRequest !== null
      ? [request.offenseElementRequest].filter((element) => element !== currentElement)
      : order.filter((element) => element !== currentElement)
        .sort((a, b) => elementAffinity(enemies, b) - elementAffinity(enemies, a) || order.indexOf(a) - order.indexOf(b));
    // An element no slot can take is skipped, so the candidate count is spent on elements that can be tried.
    const elements = options.filter((element) => offenseCandidate(model, element, 0, request.offenseElementTrialRuns, createRandom(1)) !== null).slice(0, request.offenseElementCandidateCount);
    const candidates: Candidate[] = [];
    for (let trial = 0; trial < request.offenseElementTrialRuns; trial += 1) {
      for (const element of elements) await evaluate('offenseElement', { element: `e.${element}` }, offenseCandidate(model, element, trial, request.offenseElementTrialRuns, random), candidates);
    }
    record('offenseElement', candidates, request.offenseElementTrialRuns);
  }

  // 3. Defense elements: resistance combinations, the ones that resist the bottleneck enemies' attack element first.
  if (request.defenseElementTrialRuns > 0) {
    const current = resistancesOf(model, model.current);
    const attacks = enemies.map((enemy) => enemy.elementalOffense).filter((element): element is Element => element !== 'none');
    const combinations: Set<Element>[] = [];
    for (let mask = 0; mask < 8; mask += 1) combinations.push(new Set(ELEMENTS.filter((_, index) => (mask & (1 << index)) !== 0)));
    const same = (combination: Set<Element>) => combination.size === current.size && [...combination].every((element) => current.has(element));
    const coverage = (combination: Set<Element>) => attacks.filter((element) => combination.has(element)).length;
    const distance = (combination: Set<Element>) => ELEMENTS.filter((element) => combination.has(element) !== current.has(element)).length;
    const ordered = combinations.filter((combination) => !same(combination))
      .sort((a, b) => coverage(b) - coverage(a) || distance(a) - distance(b) || combinations.indexOf(a) - combinations.indexOf(b));
    const chosen = ordered.filter((combination) => defenseCandidate(model, combination, 0, createRandom(1)) !== null).slice(0, request.defenseElementCandidateCount);
    const candidates: Candidate[] = [];
    for (let trial = 0; trial < request.defenseElementTrialRuns; trial += 1) {
      for (const combination of chosen) {
        const resistance = combination.size === 0 ? ['r.none'] : ELEMENTS.filter((element) => combination.has(element)).map((element) => `r.${element}`);
        await evaluate('defenseElement', { resistance }, defenseCandidate(model, combination, trial, random), candidates);
      }
    }
    record('defenseElement', candidates, request.defenseElementTrialRuns);
  }

  // 4. Ability items: items granting an ability the character lacks, counters of the bottleneck room (7.1.5.1) first.
  const party = state.parties[partyIndex];
  const row = party.characters.findIndex((entry) => entry.id === model.character.id) + 1;
  const owned = new Set<string>(computeCharacterStats(model.character, party.level, row).abilities.map((ability) => ability.id));
  // A party-wide counter (`a.null-counter`) is already covered when any party member has it.
  const partyOwned = new Set(party.characters.flatMap((entry, index) => computeCharacterStats(entry, party.level, index + 1).abilities.map((ability) => ability.id as string)));
  const coveredCounter = (ability: string) => owned.has(ability) || (ability === 'null_counter' && partyOwned.has(ability));
  const enemyAbilities = new Set(enemies.flatMap((enemy) => enemy.abilities.map((ability) => ability.id as string)));
  const offense = offenseElementsOf(model, model.current);
  // One entry per item ID: its strongest variant left in the pool.
  const byItem = new Map<number, string>();
  for (const keys of model.byCategory.values()) {
    for (const key of keys) {
      const facts = model.facts.get(key)!;
      const adds = facts.abilities.filter((ability) => !owned.has(ability));
      if (adds.length === 0 || ![...facts.offense].every((element) => offense.size === 0 || offense.has(element))) continue;
      if (usageOf(model, model.current, key) >= (model.pool.get(key) ?? 0)) continue;
      const previous = byItem.get(facts.item.id);
      if (!previous || facts.power > model.facts.get(previous)!.power) byItem.set(facts.item.id, key);
    }
  }
  // The abilities that step 4 simulated a candidate for.
  const triedAbilities = new Set<string>();
  if (request.abilityTrialRuns > 0) {
    const breaks = (key: string) => model.facts.get(key)!.abilities.some((ability) => !coveredCounter(ability) && countersBottleneck(ability, enemyAbilities, bottleneck.terrain));
    const remaining = [...byItem.values()].sort();
    const candidates: Candidate[] = [];
    for (let trial = 0; trial < request.abilityTrialRuns && remaining.length > 0; trial += 1) {
      for (let pick = 0; pick < request.abilityCandidateCount && remaining.length > 0; pick += 1) {
        const breakers = remaining.filter(breaks);
        const key = draw(model, breakers.length > 0 ? breakers : remaining, trial, random)!;
        remaining.splice(remaining.indexOf(key), 1);
        const adds = model.facts.get(key)!.abilities.filter((ability) => !owned.has(ability));
        const abilities = adds.map((ability) => `a.${ability.replace(/_/g, '-')}`);
        if (await evaluate('ability', { abilities }, abilityCandidate(model, key), candidates)) for (const ability of adds) triedAbilities.add(ability);
      }
    }
    record('ability', candidates, request.abilityTrialRuns);
  }
  // SpecRef: 9.1.4.9 | stagedEquipmentTuning | what became of each counter of the bottleneck room (7.1.5.1).
  // SpecRef: 9.1.4.9 | stagedEquipmentTuning | `freeGain`: the current build with the counter granted to the character for
  // free (added to its first item, no item change), against the current build on the quick seed: what the ability itself is
  // worth here, apart from any item that grants it. `null` when the character already has it or wears no item.
  const firstWorn = model.character.equipment.findIndex((item) => item !== null);
  const freeCheck = async (ability: string): Promise<{ freeGain: number | null; freeStandardError: number | null }> => {
    if (coveredCounter(ability) || firstWorn < 0) return { freeGain: null, freeStandardError: null };
    const equipment = model.character.equipment.map((item, slot) => (item && slot === firstWorn
      ? { ...item, bonuses: [...(item.bonuses ?? []), { type: 'ability' as const, value: 1, abilityId: ability as AbilityId, abilityLevel: 1 }] }
      : item));
    const free = measureOf(await simulate(withEquipment(model, equipment), request.quickRuns, quickSeed));
    const check = tuningLuckCheck(scoredBy, await measureLoadout(model.current, request.quickRuns, quickSeed), free, request.quickRuns);
    return { freeGain: round4(check.gain), freeStandardError: round4(check.standardError) };
  };
  const bottleneckCounters: { ability: string; answers: string[]; status: string; freeGain: number | null; freeStandardError: number | null; sources: CounterItemSource[] }[] = [];
  for (const { ability, answers } of bottleneckCounterRows(enemyAbilities, bottleneck.terrain)) {
    bottleneckCounters.push({
      ability: `a.${ability.replace(/_/g, '-')}`,
      answers,
      status: coveredCounter(ability) ? 'owned'
        : triedAbilities.has(ability) ? 'tried'
          : [...byItem.values()].some((key) => (model.facts.get(key)!.abilities as readonly string[]).includes(ability)) ? 'notTried' : 'noItem',
      ...await freeCheck(ability),
      sources: counterItemSources(state, ability, dependencies.disclosure ?? { allItems: false, allEnemies: false }),
    });
  }

  // 5. Final tuning: a greedy add pass over every recorded candidate, then a swap pass for the element steps.
  const all = [...recorded.offenseElement, ...recorded.defenseElement, ...recorded.ability].sort((a, b) => b.improvement - a.improvement);
  const combine = (list: readonly Candidate[]): Loadout | null => {
    let build = { loadout: [...model.current] as Loadout, changed: new Set<number>() };
    for (const candidate of list) {
      const next = addCandidate(model, build.loadout, build.changed, candidate);
      if (!next) return null;
      build = next;
    }
    return build.loadout;
  };
  let kept: Candidate[] = [];
  let tuned: Loadout = model.current;
  if (all.length > 0) {
    let bestScore = await scoreLoadout(model.current, request.finalTuningRuns, finalSeed);
    for (const candidate of all) {
      if (candidate.step !== 'ability' && kept.some((entry) => entry.step === candidate.step)) continue;
      const loadout = combine([...kept, candidate]);
      if (!loadout) continue;
      const score = await scoreLoadout(loadout, request.finalTuningRuns, finalSeed);
      if (tuningImprovement(scoredBy, bestScore, score) > 0) { kept.push(candidate); bestScore = score; tuned = loadout; }
    }
    for (const step of ['offenseElement', 'defenseElement'] as const) {
      for (const other of recorded[step]) {
        const index = kept.findIndex((entry) => entry.step === step);
        if (index < 0 || kept[index] === other) continue;
        const swapped = kept.map((entry, position) => (position === index ? other : entry));
        const loadout = combine(swapped);
        if (!loadout) continue;
        const score = await scoreLoadout(loadout, request.finalTuningRuns, finalSeed);
        if (tuningImprovement(scoredBy, bestScore, score) > 0) { kept = swapped; bestScore = score; tuned = loadout; }
      }
    }
  }
  // SpecRef: 7.1.5 | Step 5 Report | each kept candidate's improvement is the build with it and every candidate before it,
  // over the current build on the step 5 seed (after a swap too). Scores already simulated come from the cache.
  const cumulative: number[] = [];
  if (kept.length > 0) {
    const currentFinal = await scoreLoadout(model.current, request.finalTuningRuns, finalSeed);
    for (let position = 0; position < kept.length; position += 1) {
      cumulative.push(tuningImprovement(scoredBy, currentFinal, await scoreLoadout(combine(kept.slice(0, position + 1))!, request.finalTuningRuns, finalSeed)));
    }
  }

  // 6. Final check on the baseline seed: the tuned build against the current build as it is. When step 5 kept nothing there
  // is no change, and the current build's baseline is its own result.
  const changed = loadoutKey(tuned) !== loadoutKey(model.current);
  const tunedState = changed ? withEquipment(model, allocateJewels(model, tuned)) : state;
  const after = changed ? await simulate(tunedState, STAGED_TUNING_BASELINE_RUNS, baselineSeed) : baseline;
  const afterMeasure = measureOf(after);
  const improvement = tuningImprovement(scoredBy, beforeScore, afterMeasure.rate);
  const luck = tuningLuckCheck(scoredBy, before, afterMeasure, STAGED_TUNING_BASELINE_RUNS);
  let accepted = changed && improvement >= request.minGateImprovement && luck.passed;
  let changeSummary: GaChangeEntry[] = [];
  if (accepted) {
    try {
      changeSummary = planGaChangeSummary(state, partyIndex, tunedState, dependencies.commitContext);
    } catch {
      changeSummary = [];
    }
    if (changeSummary.length === 0) accepted = false;
  }

  const forecast = {
    before: buildSimulationRunData(baseline, dependencies.revision, 'staged-tuning').overview,
    after: buildSimulationRunData(after, dependencies.revision, 'staged-tuning').overview,
  };
  const partyNumber = state.parties[partyIndex].id;
  let stored: StoredBuildResult | null = null;
  const buildResultId = accepted ? dependencies.createOpaqueId() : null;
  if (buildResultId) {
    // A tuning result has no verdict: it passed its final check, so `applyBuildResult` never asks for confirmation.
    stored = {
      buildResultId, source: 'stagedEquipmentTuning', partyNumber, revision: dependencies.revision, verdict: null,
      forecast, changeSummary, fingerprint: fingerprintOfSummary(state, partyIndex, changeSummary),
    };
  }
  const describeChanges = (changes: readonly { slot: number; key: string }[]) => changes.map((change) => `${change.slot}=${itemFormatOf(model, change.key)}`);
  const describe = (candidate: Candidate) => ({ ...candidate.label, improvement: round4(candidate.improvement), changes: describeChanges(candidate.changes) });
  // The changes each kept candidate made in the tuned build, after any move to another slot.
  const finalTuning = kept.map((entry, position) => {
    const previous = kept.slice(0, position).reduce<{ loadout: Loadout; changed: Set<number> }>((build, earlier) => addCandidate(model, build.loadout, build.changed, earlier)!, { loadout: [...model.current], changed: new Set() });
    const next = addCandidate(model, previous.loadout, previous.changed, entry)!;
    const changes = next.loadout.flatMap((key, slot) => (key !== previous.loadout[slot] && key !== null ? [{ slot, key }] : []));
    return { step: entry.step, index: recorded[entry.step].indexOf(entry), ...entry.label, improvement: round4(cumulative[position]), changes: describeChanges(changes) };
  });
  return {
    partyNumber,
    stored,
    data: {
      accepted,
      objective,
      scoredBy,
      before: forecast.before,
      after: forecast.after,
      improvement: round4(improvement),
      gain: round4(luck.gain),
      standardError: round4(luck.standardError),
      destination: party.selectedDungeonId,
      level: party.level,
      bottleneckRoom: bottleneck.room === null ? null : floorRoomLabel(bottleneck.room),
      bottleneckCounters,
      candidatesTried,
      // SpecRef: 9.1.4.9 | stagedEquipmentTuning | every candidate each step simulated, with whether the step recorded it.
      triedCandidates: Object.fromEntries((['offenseElement', 'defenseElement', 'ability'] as const).map((step) => [
        step, simulated[step].map((candidate) => ({ ...describe(candidate), recorded: recorded[step].includes(candidate) })),
      ])),
      steps: {
        offenseElement: recorded.offenseElement.map(describe),
        defenseElement: recorded.defenseElement.map(describe),
        ability: recorded.ability.map(describe),
        finalTuning,
      },
      changeSummary: accepted ? changeSummary : [],
      revision: dependencies.revision,
      simulationRuns,
      elapsedSeconds: Math.round((dependencies.now() - startedAt) / 100) / 10,
      seed,
      ...(buildResultId ? { buildResultId } : {}),
    },
  };
}
