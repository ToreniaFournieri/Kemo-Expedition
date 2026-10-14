import { CLASSES } from '../../data/classes';
import { LINEAGES } from '../../data/lineages';
import { PREDISPOSITIONS } from '../../data/predispositions';
import { getUniqueCharacterDef } from '../../data/uniqueCharacters';
import { getDeityId, getDeityNameFromId } from '../../game/deity';
import { addJewelToInventory } from '../../game/jewel';
import { gameReducer } from '../../hooks/useGameState';
import { getVariantKey, type Character, type ClassId, type ExpeditionSimulationResult, type GameState, type Item } from '../../types';
import { describeCharacterBuildCurrent, planCharacterBuildChange, validUniqueSelections } from './buildChange';
import {
  buildBasis, createRandom, deityHolderIndex, deityOptionsFor, deriveSeed, GA_DEITY_SCOPES, GA_EFFORTS, GA_ITEMS_SCOPES, GA_OBJECTIVES,
  measure, planGaChangeSummary, rateGaResult,
  type GaChangeEntry, type GaDeityScope, type GaForecast, type GaItemsScope, type GaObjective, type GaSearchDependencies, type Measured,
} from './gaSearch';
import { objectiveSimulationOptions, prepareObjectiveState, routeRoomCount, type ObjectiveMeasure } from './objectiveMeasure';
import { validRaceAndGenderOptions } from './readModels';
import { buildSimulationRunData } from './simulationView';

// SpecRef: 9.1.3 | Read | 2-3-3 party/{p}/directedBuild
// SpecRef: 9.1.4.9 | Operation-specific completion rules | Directed build
// A three-step search guided by a class composition: Step 1 searches the build layer (unique selection, race/gender, main
// and sub class, order) with a genetic search, Step 2 the deity, and Step 3 lineage and predisposition one member at a
// time. Every candidate runs the requested Auto Equipment and is scored by the same private forecast as `gaSearch`.

export const DIRECTIONS = ['rapidRanged', 'magicBurst', 'meleeBurst', 'free', 'turtle', 'balance'] as const;
export type Direction = typeof DIRECTIONS[number];
const AUTO_EQUIPMENT_RUNS = ['currentSetting', 'FULL', 'SEMI', 'OFF'] as const;
type AutoEquipmentRun = typeof AUTO_EQUIPMENT_RUNS[number];

// SpecRef: 9.1.3 | 2-3-3 Definition | the main class categories.
const CATEGORIES = ['melee', 'ranged', 'magic', 'support'] as const;
type Category = typeof CATEGORIES[number];
type Counts = Record<Category, number>;
const CATEGORY_CLASSES: Record<Category, readonly ClassId[]> = {
  melee: ['duelist', 'samurai', 'sword-saint'],
  ranged: ['ranger', 'striker', 'ninja'],
  magic: ['wizard', 'sage', 'alchemist'],
  support: ['guardian', 'pilgrim', 'lord'],
};
const categoryOf = (classId: ClassId): Category => CATEGORIES.find((category) => CATEGORY_CLASSES[category].includes(classId))!;

// SpecRef: 9.1.3 | 2-3-3 Direction | `[minimum, maximum]` members per category; `free` has no class restriction.
const DIRECTION_RANGES: Record<Direction, Record<Category, readonly [number, number]> | null> = {
  rapidRanged: { melee: [0, 1], ranged: [2, 5], magic: [0, 1], support: [0, 2] },
  magicBurst: { melee: [0, 1], ranged: [0, 1], magic: [2, 5], support: [0, 2] },
  meleeBurst: { melee: [2, 5], ranged: [0, 1], magic: [0, 1], support: [0, 2] },
  free: null,
  turtle: { melee: [1, 2], ranged: [1, 2], magic: [1, 2], support: [2, 3] },
  balance: { melee: [1, 2], ranged: [1, 2], magic: [1, 2], support: [1, 2] },
};

// SpecRef: 9.1.3 | 2-3-3 `tuningParameters` | the `effort` presets.
export const DIRECTED_EFFORT_PRESETS = {
  low: { populationSize: 12, generations: 10, quickRuns: 30, confirmRuns: 150, timeBudgetSeconds: 30 },
  medium: { populationSize: 16, generations: 20, quickRuns: 50, confirmRuns: 300, timeBudgetSeconds: 90 },
  high: { populationSize: 24, generations: 40, quickRuns: 100, confirmRuns: 600, timeBudgetSeconds: 240 },
} as const;
type Effort = keyof typeof DIRECTED_EFFORT_PRESETS;

/** `[minimum, maximum]` of each integer parameter (Spec 9.1.3, 2-3-3). */
const INTEGER_RANGES = {
  populationSize: [8, 64], generations: [1, 200], quickRuns: [10, 300], confirmRuns: [50, 1000], timeBudgetSeconds: [5, 300],
  verifyRuns: [100, 1000], eliteCount: [0, 16], tournamentSize: [2, 8], confirmTopN: [1, 10],
} as const;

export interface DirectedTarget {
  characterId: number;
  uniqueCharacter: boolean;
  raceGender: boolean;
  mainClass: boolean;
  subClass: boolean;
  lineage: boolean;
  predisposition: boolean;
  autoEquipmentRun: AutoEquipmentRun;
}

export interface DirectedBuildRequest {
  direction: Direction;
  targets: DirectedTarget[];
  considerOrderChange: boolean;
  considerDeityChange: GaDeityScope;
  considerItemsScope: GaItemsScope;
  objective: GaObjective;
  parameters: {
    effort: Effort; populationSize: number; generations: number; quickRuns: number; confirmRuns: number; timeBudgetSeconds: number;
    verifyRuns: number; eliteCount: number; mutationRate: number; tournamentSize: number; confirmTopN: number; seed: number | null;
  };
}

function invalid(field: string): never { throw new Error(`invalid_request:${field}`); }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }

function readBoolean(source: Record<string, unknown>, key: string, field: string, fallback: boolean): boolean {
  const value = source[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') invalid(field);
  return value;
}

function readEnum<T extends string>(source: Record<string, unknown>, key: string, field: string, values: readonly T[], fallback: T): T {
  const value = source[key] === undefined ? fallback : source[key];
  if (typeof value !== 'string' || !(values as readonly string[]).includes(value)) invalid(field);
  return value as T;
}

function readInteger(source: Record<string, unknown>, key: keyof typeof INTEGER_RANGES, fallback: number): number {
  const value = source[key];
  if (value === undefined) return fallback;
  const [minimum, maximum] = INTEGER_RANGES[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > maximum) invalid(`tuningParameters.${key}`);
  return value;
}

// SpecRef: 9.1.3 | 2-3-3 `changeableComponents` | the defaults when a member is omitted.
const COMPONENT_DEFAULTS = { uniqueCharacter: false, raceGender: true, mainClass: true, subClass: true, lineage: false, predisposition: false } as const;

/** Validates a `directedBuild` request against party `{p}` (Spec 9.1.4.9). Throws `invalid_request:<field>`. */
export function parseDirectedBuildRequest(state: GameState, partyIndex: number, raw: Record<string, unknown>): DirectedBuildRequest {
  const allowed = new Set(['direction', 'targets', 'considerOrderChange', 'considerDeityChange', 'considerItemsScope', 'objective', 'tuningParameters']);
  const unknown = Object.keys(raw).find((key) => !allowed.has(key));
  if (unknown !== undefined) invalid(`${unknown}.unknown_member`);
  if (raw.direction === undefined) invalid('direction');
  const direction = readEnum(raw, 'direction', 'direction', DIRECTIONS, 'free');
  const party = state.parties[partyIndex];
  if (!Array.isArray(raw.targets) || raw.targets.length === 0 || raw.targets.length > party.characters.length) invalid('targets');
  const seen = new Set<number>();
  const targets = raw.targets.map((entry): DirectedTarget => {
    if (!isRecord(entry)) invalid('targets');
    const extra = Object.keys(entry).find((key) => key !== 'characterId' && key !== 'changeableComponents');
    if (extra !== undefined) invalid(`targets.${extra}.unknown_member`);
    const characterId = entry.characterId;
    if (typeof characterId !== 'number' || !Number.isSafeInteger(characterId) || characterId < 1) invalid('targets.characterId');
    if (!party.characters.some((character) => character.id === characterId)) invalid('targets.characterId.not_in_party');
    if (seen.has(characterId)) invalid('targets.characterId.duplicate');
    seen.add(characterId);
    const source = entry.changeableComponents === undefined ? {} : entry.changeableComponents;
    if (!isRecord(source)) invalid('targets.changeableComponents');
    const known = [...Object.keys(COMPONENT_DEFAULTS), 'autoEquipmentRun'];
    const extraComponent = Object.keys(source).find((key) => !known.includes(key));
    if (extraComponent !== undefined) invalid(`targets.changeableComponents.${extraComponent}.unknown_member`);
    const flags = Object.fromEntries(Object.entries(COMPONENT_DEFAULTS).map(([key, fallback]) => [key, readBoolean(source, key, `targets.changeableComponents.${key}`, fallback)])) as Record<keyof typeof COMPONENT_DEFAULTS, boolean>;
    return { characterId, ...flags, autoEquipmentRun: readEnum(source, 'autoEquipmentRun', 'targets.changeableComponents.autoEquipmentRun', AUTO_EQUIPMENT_RUNS, 'currentSetting') };
  });
  const source = raw.tuningParameters === undefined ? {} : raw.tuningParameters;
  if (!isRecord(source)) invalid('tuningParameters');
  const knownParameters = new Set(['effort', 'mutationRate', 'seed', ...Object.keys(INTEGER_RANGES)]);
  const unknownParameter = Object.keys(source).find((key) => !knownParameters.has(key));
  if (unknownParameter !== undefined) invalid(`tuningParameters.${unknownParameter}.unknown_member`);
  const effort = readEnum(source, 'effort', 'tuningParameters.effort', GA_EFFORTS, 'medium');
  const preset = DIRECTED_EFFORT_PRESETS[effort];
  const populationSize = readInteger(source, 'populationSize', preset.populationSize);
  const eliteCount = readInteger(source, 'eliteCount', 2);
  if (eliteCount > Math.floor(populationSize / 4)) invalid('tuningParameters.eliteCount');
  const mutationRate = source.mutationRate === undefined ? 0.35 : source.mutationRate;
  if (typeof mutationRate !== 'number' || !Number.isFinite(mutationRate) || mutationRate < 0 || mutationRate > 1) invalid('tuningParameters.mutationRate');
  const seed = source.seed === undefined ? null : source.seed;
  if (seed !== null && (typeof seed !== 'number' || !Number.isSafeInteger(seed))) invalid('tuningParameters.seed');
  return {
    direction,
    targets,
    considerOrderChange: readBoolean(raw, 'considerOrderChange', 'considerOrderChange', false),
    considerDeityChange: readEnum(raw, 'considerDeityChange', 'considerDeityChange', GA_DEITY_SCOPES, 'none'),
    considerItemsScope: readEnum(raw, 'considerItemsScope', 'considerItemsScope', GA_ITEMS_SCOPES, 'normal'),
    objective: readEnum(raw, 'objective', 'objective', GA_OBJECTIVES, 'success'),
    parameters: {
      effort,
      populationSize,
      generations: readInteger(source, 'generations', preset.generations),
      quickRuns: readInteger(source, 'quickRuns', preset.quickRuns),
      confirmRuns: readInteger(source, 'confirmRuns', preset.confirmRuns),
      timeBudgetSeconds: readInteger(source, 'timeBudgetSeconds', preset.timeBudgetSeconds),
      verifyRuns: readInteger(source, 'verifyRuns', 500),
      eliteCount,
      mutationRate,
      tournamentSize: readInteger(source, 'tournamentSize', 3),
      confirmTopN: readInteger(source, 'confirmTopN', 3),
      seed: seed as number | null,
    },
  };
}

// ---------------- Composition ----------------

const emptyCounts = (): Counts => ({ melee: 0, ranged: 0, magic: 0, support: 0 });

/** Members per main class category, counting every member of the party (Spec 9.1.4.9 `composition`). */
export function compositionOf(characters: readonly Pick<Character, 'mainClassId'>[]): Counts {
  const counts = emptyCounts();
  for (const character of characters) counts[categoryOf(character.mainClassId)] += 1;
  return counts;
}

// SpecRef: 9.1.4.9 | Directed build Composition | the summed shortfall and excess over the direction's ranges.
export function compositionDistance(direction: Direction, counts: Counts): number {
  const ranges = DIRECTION_RANGES[direction];
  if (!ranges) return 0;
  return CATEGORIES.reduce((sum, category) => {
    const [minimum, maximum] = ranges[category];
    return sum + Math.max(0, minimum - counts[category]) + Math.max(0, counts[category] - maximum);
  }, 0);
}

const addCounts = (a: Counts, b: Counts): Counts => ({ melee: a.melee + b.melee, ranged: a.ranged + b.ranged, magic: a.magic + b.magic, support: a.support + b.support });

/**
 * The category distributions of the changeable main classes that reach the smallest distance. A Support class is never
 * given to two members, so at most the Support classes no fixed member holds can be assigned.
 */
function bestDistributions(direction: Direction, fixed: Counts, changeable: number, supportsLeft: number): { distance: number; distributions: Counts[] } {
  let distance = Infinity;
  let distributions: Counts[] = [];
  for (let melee = 0; melee <= changeable; melee += 1) {
    for (let ranged = 0; melee + ranged <= changeable; ranged += 1) {
      for (let magic = 0; melee + ranged + magic <= changeable; magic += 1) {
        const support = changeable - melee - ranged - magic;
        if (support > supportsLeft) continue;
        const counts = { melee, ranged, magic, support };
        const value = compositionDistance(direction, addCounts(fixed, counts));
        if (value < distance) { distance = value; distributions = [counts]; }
        else if (value === distance) distributions.push(counts);
      }
    }
  }
  return { distance, distributions };
}

// ---------------- Genome ----------------

interface MemberGenes { unique: string; race: string; main: ClassId; sub: ClassId }
interface Genome { order: number[]; members: Record<number, MemberGenes> }

interface Model {
  base: GameState;
  partyIndex: number;
  request: DirectedBuildRequest;
  /** Targets in party order. */
  targets: DirectedTarget[];
  uniqueOptions: Record<number, string[]>;
  raceOptions: Record<number, string[]>;
  current: Genome;
  /** Targets whose main class may change, in party order. */
  changeableMain: number[];
  fixedSupports: Set<ClassId>;
  minDistance: number;
  distributions: Counts[];
}

const ALL_CLASSES = CLASSES.map((entry) => entry.id as ClassId);
const cloneGenome = (genome: Genome): Genome => ({ order: [...genome.order], members: Object.fromEntries(Object.entries(genome.members).map(([id, genes]) => [id, { ...genes }])) });
const genomeKey = (genome: Genome): string => JSON.stringify(genome);
const pick = <T>(values: readonly T[], random: () => number): T => values[Math.floor(random() * values.length)];

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function buildModel(state: GameState, partyIndex: number, request: DirectedBuildRequest): Model {
  const party = state.parties[partyIndex];
  const targetIds = new Set(request.targets.map((target) => target.characterId));
  const targets = party.characters.filter((character) => targetIds.has(character.id)).map((character) => request.targets.find((target) => target.characterId === character.id)!);
  const current: Genome = { order: party.characters.map((character) => character.id), members: {} };
  const uniqueOptions: Model['uniqueOptions'] = {};
  const raceOptions: Model['raceOptions'] = {};
  for (const target of targets) {
    const character = party.characters.find((entry) => entry.id === target.characterId)!;
    const describe = describeCharacterBuildCurrent(character);
    current.members[character.id] = { unique: describe.uniqueSelection, race: describe.racesAndGender, main: character.mainClassId, sub: character.subClassId };
    // SpecRef: 9.1.3 | 2-3-3 `uniqueCharacter` | `false` never assigns a unique character; the current selection stays.
    uniqueOptions[character.id] = target.uniqueCharacter ? [...new Set([describe.uniqueSelection, ...validUniqueSelections(state, character)])] : [describe.uniqueSelection];
    raceOptions[character.id] = target.raceGender ? [...new Set([...(character.isUnique ? [] : [describe.racesAndGender]), ...validRaceAndGenderOptions(state, party, character)])] : [];
  }
  const changeableMain = targets.filter((target) => target.mainClass).map((target) => target.characterId);
  const fixedMembers = party.characters.filter((character) => !changeableMain.includes(character.id));
  const fixedSupports = new Set(fixedMembers.map((character) => character.mainClassId).filter((id) => categoryOf(id) === 'support'));
  const { distance, distributions } = bestDistributions(request.direction, compositionOf(fixedMembers), changeableMain.length, CATEGORY_CLASSES.support.length - fixedSupports.size);
  return { base: state, partyIndex, request, targets, uniqueOptions, raceOptions, current, changeableMain, fixedSupports, minDistance: distance, distributions };
}

const isFelidian = (race: string): boolean => race.startsWith('felidian/');

/** The race/gender a member ends with: a unique selection fixes it. `null` when a released unique's race is left to the game. */
function effectiveRace(model: Model, id: number, genes: MemberGenes): string | null {
  if (genes.unique !== 'none') {
    const def = getUniqueCharacterDef(genes.unique);
    return def ? `${def.raceId}/${def.gender}` : null;
  }
  return model.raceOptions[id].includes(genes.race) ? genes.race : null;
}

/** A race drawn for a target; `rapidRanged` weights `Felidian` 3x (Spec 9.1.3, 2-3-3). */
function drawRace(model: Model, id: number, random: () => number): string {
  const options = model.raceOptions[id];
  if (options.length === 0) return model.current.members[id].race;
  const weight = (race: string) => (model.request.direction === 'rapidRanged' && isFelidian(race) ? 3 : 1);
  let roll = random() * options.reduce((sum, race) => sum + weight(race), 0);
  for (const race of options) { roll -= weight(race); if (roll < 0) return race; }
  return options[options.length - 1];
}

/**
 * Brings a genome back inside the rules (Spec 9.1.4.9 Class rules): unique selections are distinct, a released unique gets
 * a selectable race, non-unique race/gender keys are distinct, the changeable main classes reach the smallest distance,
 * an assigned Support class is never one another member holds, and an assigned `Felidian` is never a main-class ninja.
 */
function repair(model: Model, input: Genome, random: () => number): Genome {
  const genome = cloneGenome(input);
  const party = model.base.parties[model.partyIndex];
  const targetIds = new Set(model.targets.map((target) => target.characterId));
  const uniquesTaken = new Set<string>();
  for (const target of model.targets) {
    const genes = genome.members[target.characterId];
    if (genes.unique !== 'none' && uniquesTaken.has(genes.unique)) genes.unique = 'none';
    if (genes.unique !== 'none') uniquesTaken.add(genes.unique);
    // A member who is not (or no longer) unique needs a selectable race when its race may change.
    if (genes.unique === 'none' && target.raceGender && !model.raceOptions[target.characterId].includes(genes.race)) genes.race = drawRace(model, target.characterId, random);
  }
  // Non-unique race/gender keys are distinct in the party (the `changeBuild` rule).
  const usedRaces = new Set(party.characters.filter((character) => !targetIds.has(character.id) && !character.isUnique).map((character) => describeCharacterBuildCurrent(character).racesAndGender));
  for (const target of model.targets) {
    const genes = genome.members[target.characterId];
    if (genes.unique !== 'none') continue;
    if (usedRaces.has(genes.race) && target.raceGender) {
      const free = model.raceOptions[target.characterId].filter((race) => !usedRaces.has(race));
      if (free.length > 0) genes.race = pick(free, random);
    }
    usedRaces.add(genes.race);
  }
  // Main classes: move members from surplus to missing categories of the nearest best distribution.
  if (model.changeableMain.length > 0) {
    const counts = emptyCounts();
    for (const id of model.changeableMain) counts[categoryOf(genome.members[id].main)] += 1;
    const gap = (distribution: Counts) => CATEGORIES.reduce((sum, category) => sum + Math.abs(distribution[category] - counts[category]), 0);
    const smallest = Math.min(...model.distributions.map(gap));
    const goal = pick(model.distributions.filter((distribution) => gap(distribution) === smallest), random);
    const moving: number[] = [];
    const staying = emptyCounts();
    for (const category of CATEGORIES) {
      const members = shuffle(model.changeableMain.filter((id) => categoryOf(genome.members[id].main) === category), random);
      const surplus = Math.max(0, members.length - goal[category]);
      moving.push(...members.slice(0, surplus));
      staying[category] = members.length - surplus;
    }
    for (const category of CATEGORIES) {
      for (let missing = goal[category] - staying[category]; missing > 0; missing -= 1) {
        const id = moving.shift();
        if (id === undefined) break;
        genome.members[id].main = pick(CATEGORY_CLASSES[category], random);
      }
    }
    // An assigned Support class is one no other member holds; a member keeping its own main class assigns nothing.
    const supports = new Set(model.fixedSupports);
    const assigned = model.changeableMain.filter((id) => genome.members[id].main !== model.current.members[id].main);
    for (const id of model.changeableMain) if (!assigned.includes(id) && categoryOf(genome.members[id].main) === 'support') supports.add(genome.members[id].main);
    for (const id of assigned) {
      const genes = genome.members[id];
      if (categoryOf(genes.main) !== 'support') continue;
      if (supports.has(genes.main)) {
        const free = CATEGORY_CLASSES.support.filter((classId) => !supports.has(classId));
        if (free.length > 0) genes.main = pick(free, random);
      }
      supports.add(genes.main);
    }
  }
  // `Felidian` with main class `class.ninja` is invalid in every direction: both grant `a.first-strike`. A fixed main class
  // keeps the race instead.
  for (const target of model.targets) {
    const genes = genome.members[target.characterId];
    const race = effectiveRace(model, target.characterId, genes);
    if (race === null || !isFelidian(race) || genes.main !== 'ninja') continue;
    if (target.mainClass) genes.main = pick(['ranger', 'striker'] as const, random);
    else if (genes.unique === 'none' && race !== model.current.members[target.characterId].race) genes.race = model.current.members[target.characterId].race;
  }
  return genome;
}

/** A random Step 1 genome: a best distribution's categories, then classes, races, unique selections, and order. */
function sample(model: Model, random: () => number): Genome {
  const genome = cloneGenome(model.current);
  if (model.request.considerOrderChange && random() < 0.5) genome.order = shuffle(genome.order, random);
  const goal = { ...pick(model.distributions, random) };
  const members = shuffle(model.changeableMain, random);
  const assigned = new Set<number>();
  for (const id of members) {
    const category = categoryOf(model.current.members[id].main);
    if (goal[category] > 0 && random() < 0.5) { goal[category] -= 1; assigned.add(id); }
  }
  const slots = shuffle(CATEGORIES.flatMap((category) => new Array<Category>(goal[category]).fill(category)), random);
  for (const id of members) {
    if (assigned.has(id)) continue;
    const category = slots.shift();
    if (category) genome.members[id].main = pick(CATEGORY_CLASSES[category], random);
  }
  for (const target of model.targets) {
    const genes = genome.members[target.characterId];
    if (model.uniqueOptions[target.characterId].length > 1 && random() < 0.5) genes.unique = pick(model.uniqueOptions[target.characterId], random);
    if (target.raceGender && genes.unique === 'none' && random() < 0.7) genes.race = drawRace(model, target.characterId, random);
    if (target.subClass && random() < 0.7) genes.sub = pick(ALL_CLASSES, random);
  }
  return repair(model, genome, random);
}

function mutate(model: Model, input: Genome, random: () => number): Genome {
  const genome = cloneGenome(input);
  const kinds: string[] = [];
  const uniques = model.targets.filter((target) => model.uniqueOptions[target.characterId].length > 1).map((target) => target.characterId);
  const races = model.targets.filter((target) => target.raceGender).map((target) => target.characterId);
  const subs = model.targets.filter((target) => target.subClass).map((target) => target.characterId);
  if (uniques.length > 0) kinds.push('unique');
  if (races.length > 0) kinds.push('race');
  if (model.changeableMain.length > 0) kinds.push('main', 'main');
  if (model.changeableMain.length > 1) kinds.push('mainSwap');
  if (subs.length > 0) kinds.push('sub');
  if (model.request.considerOrderChange && genome.order.length > 1) kinds.push('order');
  if (kinds.length === 0) return genome;
  const steps = 1 + Math.floor(random() * 2);
  for (let step = 0; step < steps; step += 1) {
    const kind = pick(kinds, random);
    if (kind === 'unique') { const id = pick(uniques, random); genome.members[id].unique = pick(model.uniqueOptions[id], random); }
    else if (kind === 'race') { const id = pick(races, random); if (genome.members[id].unique === 'none') genome.members[id].race = drawRace(model, id, random); }
    else if (kind === 'main') {
      // Within the same category, so the composition holds.
      const id = pick(model.changeableMain, random);
      genome.members[id].main = pick(CATEGORY_CLASSES[categoryOf(genome.members[id].main)], random);
    } else if (kind === 'mainSwap') {
      const a = pick(model.changeableMain, random); const b = pick(model.changeableMain, random);
      [genome.members[a].main, genome.members[b].main] = [genome.members[b].main, genome.members[a].main];
    } else if (kind === 'sub') { const id = pick(subs, random); genome.members[id].sub = pick(ALL_CLASSES, random); }
    else {
      const i = Math.floor(random() * genome.order.length); const j = Math.floor(random() * genome.order.length);
      [genome.order[i], genome.order[j]] = [genome.order[j], genome.order[i]];
    }
  }
  return repair(model, genome, random);
}

/** Each member's genes come from one parent; the order from either. */
function crossover(model: Model, a: Genome, b: Genome, random: () => number): Genome {
  const child = cloneGenome(a);
  for (const target of model.targets) if (random() < 0.5) child.members[target.characterId] = { ...b.members[target.characterId] };
  if (random() < 0.5) child.order = [...b.order];
  return repair(model, child, random);
}

// ---------------- Decode ----------------

/** The `changeBuild` parameters a member's genes need; a new unique selection fixes the identity fields itself. */
function buildParameters(model: Model, target: DirectedTarget, genes: MemberGenes): Record<string, unknown> {
  const current = model.current.members[target.characterId];
  const parameters: Record<string, unknown> = {};
  if (genes.unique !== current.unique) parameters.uniqueSelection = genes.unique;
  if (genes.unique === 'none' && target.raceGender && genes.race !== current.race && model.raceOptions[target.characterId].includes(genes.race)) parameters.racesAndGender = genes.race;
  if (target.mainClass && genes.main !== current.main) parameters.mainClassId = genes.main;
  if (target.subClass && genes.sub !== current.sub) parameters.subClassId = genes.sub;
  return parameters;
}

const characterIn = (state: GameState, partyIndex: number, id: number): Character => state.parties[partyIndex].characters.find((entry) => entry.id === id)!;

/** Changes one member's build on a private copy with the `changeBuild` rules; throws when they reject it. */
function changeMember(state: GameState, partyIndex: number, characterId: number, parameters: Record<string, unknown>): GameState {
  if (Object.keys(parameters).length === 0) return state;
  const plan = planCharacterBuildChange(state, characterId, parameters);
  if (Object.keys(plan.updates).length === 0) return state;
  return gameReducer(state, { type: 'UPDATE_CHARACTER', partyIndex, characterId, updates: plan.updates, validatedMimorianAssignments: true, allowUniqueIdentityChange: true });
}

/**
 * Whether the decoded party keeps the class rules (Spec 9.1.4.9): its composition is at the smallest distance, no member
 * whose main class changed took a Support class another member holds, and no member whose race or main class changed is a
 * `Felidian` ninja.
 */
function keepsClassRules(model: Model, state: GameState): boolean {
  const characters = state.parties[model.partyIndex].characters;
  if (compositionDistance(model.request.direction, compositionOf(characters)) > model.minDistance) return false;
  for (const character of characters) {
    const before = characterIn(model.base, model.partyIndex, character.id);
    const mainChanged = before.mainClassId !== character.mainClassId;
    if (mainChanged && categoryOf(character.mainClassId) === 'support' && characters.some((other) => other.id !== character.id && other.mainClassId === character.mainClassId)) return false;
    if ((mainChanged || before.raceId !== character.raceId) && character.raceId === 'felidian' && character.mainClassId === 'ninja') return false;
  }
  return true;
}

/** Applies the Step 1 genes (order, then builds in party order, as `changeSummary` commits them); `null` when invalid. */
function applyGenome(model: Model, genome: Genome): GameState | null {
  let state = model.base;
  const partyIndex = model.partyIndex;
  if (genome.order.join(',') !== model.current.order.join(',')) {
    for (let destination = 0; destination < genome.order.length; destination += 1) {
      const source = state.parties[partyIndex].characters.findIndex((entry) => entry.id === genome.order[destination]);
      if (source !== destination) state = gameReducer(state, { type: 'REORDER_PARTY_CHARACTER', partyIndex, fromIndex: source, toIndex: destination });
    }
  }
  try {
    for (const target of model.targets) state = changeMember(state, partyIndex, target.characterId, buildParameters(model, target, genome.members[target.characterId]));
  } catch {
    return null;
  }
  return keepsClassRules(model, state) ? state : null;
}

// ---------------- autoEquipmentRun ----------------

/** A worn, unlocked item the pass may take for another character (`withinTargets`, `global`). */
interface DonorSlot { partyIndex: number; characterId: number; slot: number; item: Item }

/** The Auto Equipment mode a target runs (Spec 9.1.3, 2-3-3 `autoEquipmentRun`): 0 skips it. */
function runModeOf(model: Model, target: DirectedTarget): 0 | 1 | 2 {
  if (target.autoEquipmentRun === 'FULL') return 2;
  if (target.autoEquipmentRun === 'SEMI') return 1;
  if (target.autoEquipmentRun === 'OFF') return 0;
  const mode = characterIn(model.base, model.partyIndex, target.characterId).autoEquipmentMode;
  return mode === 0 || mode === 2 ? mode : 1;
}

function updateCharacter(state: GameState, characterId: number, update: (character: Character) => Character): GameState {
  const partyIndex = state.parties.findIndex((party) => party.characters.some((character) => character.id === characterId));
  const parties = [...state.parties];
  parties[partyIndex] = { ...parties[partyIndex], characters: parties[partyIndex].characters.map((character) => (character.id === characterId ? update(character) : character)) };
  return { ...state, parties };
}

/**
 * Runs Auto Equipment for one character with the donors' items lent to the Inventory: each donor item is taken out of its
 * slot (its Jewel set aside) and added as one owned copy. Afterwards the copies still in the Inventory go back to the donors
 * last in line, Jewel and all; the donors first in line keep an empty slot and their Jewel returns to the Inventory, as a
 * `removeEquipment` would leave it.
 */
function runWithDonors(state: GameState, donors: readonly DonorSlot[], run: (state: GameState) => GameState): GameState {
  if (donors.length === 0) return run(state);
  const inventory = { ...state.global.inventory };
  const ownedBefore: Record<string, number> = {};
  const originalEntries: Record<string, (typeof inventory)[string] | undefined> = {};
  let lent = state;
  for (const donor of donors) {
    const key = getVariantKey(donor.item);
    if (!(key in ownedBefore)) {
      const entry = inventory[key];
      ownedBefore[key] = entry && entry.status === 'owned' ? entry.count : 0;
      originalEntries[key] = entry;
    }
    const entry = inventory[key];
    inventory[key] = { ...(entry ?? { item: { ...donor.item, jewel: null, isLocked: false } }), count: (entry && entry.status === 'owned' ? entry.count : 0) + 1, status: 'owned' };
    lent = updateCharacter(lent, donor.characterId, (character) => { const equipment = [...character.equipment]; equipment[donor.slot] = null; return { ...character, equipment }; });
  }
  let next = run({ ...lent, global: { ...lent.global, inventory } });
  const settled = { ...next.global.inventory };
  let jewels = next.global.jewels;
  for (const key of Object.keys(ownedBefore)) {
    const ofKey = donors.filter((donor) => getVariantKey(donor.item) === key);
    const left = settled[key] && settled[key].status === 'owned' ? settled[key].count : 0;
    const returned = Math.min(ofKey.length, Math.max(0, left - ownedBefore[key]));
    ofKey.forEach((donor, index) => {
      if (index >= ofKey.length - returned) {
        next = updateCharacter(next, donor.characterId, (character) => { const equipment = [...character.equipment]; equipment[donor.slot] = donor.item; return { ...character, equipment }; });
      } else if (donor.item.jewel) {
        jewels = addJewelToInventory(jewels, donor.item.jewel.key, donor.item.jewel.rank);
      }
    });
    const count = left - returned;
    if (count === ownedBefore[key] && originalEntries[key]) settled[key] = originalEntries[key]!;
    else if (count === 0 && !originalEntries[key]) delete settled[key];
    else if (settled[key]) settled[key] = { ...settled[key], count };
  }
  return { ...next, global: { ...next.global, inventory: settled, jewels } };
}

/**
 * `autoEquipmentRun` for the targets in `ids` (party order), with the 7.1.2.1 dirty check bypassed. Items come from the
 * Inventory and the character's own items, plus (`withinTargets`) the unlocked items of the targets later in the pass, plus
 * (`global`) the unlocked items of every non-target, the party's first and then the other parties in order. An item a
 * target placed earlier in the pass is never taken again, and a locked item never.
 */
function runAutoEquipment(model: Model, state: GameState, ids: readonly number[], dependencies: GaSearchDependencies): GameState {
  const scope = model.request.considerItemsScope;
  const targetIds = new Set(model.targets.map((target) => target.characterId));
  const unlocked = (partyIndex: number, character: Character): DonorSlot[] => character.equipment.flatMap((item, slot) => (item && !item.isLocked ? [{ partyIndex, characterId: character.id, slot, item }] : []));
  let next = state;
  ids.forEach((id, position) => {
    const target = model.targets.find((entry) => entry.characterId === id)!;
    const mode = runModeOf(model, target);
    if (mode === 0) return;
    const donors: DonorSlot[] = [];
    if (scope !== 'normal') {
      for (const later of ids.slice(position + 1)) donors.push(...unlocked(model.partyIndex, characterIn(next, model.partyIndex, later)));
    }
    if (scope === 'global') {
      const order = [model.partyIndex, ...next.parties.map((_, index) => index).filter((index) => index !== model.partyIndex)];
      for (const partyIndex of order) for (const character of next.parties[partyIndex].characters) if (!targetIds.has(character.id)) donors.push(...unlocked(partyIndex, character));
    }
    const original = characterIn(next, model.partyIndex, id).autoEquipmentMode;
    next = updateCharacter(next, id, (character) => ({ ...character, autoEquipmentMode: mode }));
    next = runWithDonors(next, donors, (lent) => dependencies.commitContext.applyAutoEquipment(lent, model.partyIndex, id, true));
    next = updateCharacter(next, id, (character) => ({ ...character, autoEquipmentMode: original }));
  });
  return next;
}

/** Party HP is derived from the characters, so the searched party gets fresh character arrays (its stats cache is keyed by array identity). */
const withFreshParty = (state: GameState, partyIndex: number): GameState => {
  const parties = [...state.parties];
  parties[partyIndex] = { ...parties[partyIndex], characters: parties[partyIndex].characters.map((character) => ({ ...character })) };
  return { ...state, parties };
};

// ---------------- Descriptions ----------------

function describeStep1(model: Model, genome: Genome): string | null {
  const parts: string[] = [];
  if (genome.order.join(',') !== model.current.order.join(',')) parts.push(`order ${genome.order.join(',')}`);
  for (const target of model.targets) {
    const genes = genome.members[target.characterId];
    const current = model.current.members[target.characterId];
    const changes: string[] = [];
    if (genes.unique !== current.unique) changes.push(`unique ${genes.unique}`);
    if (genes.unique === 'none' && target.raceGender && genes.race !== current.race) changes.push(`race ${genes.race}`);
    if (target.mainClass && genes.main !== current.main) changes.push(`main ${genes.main}`);
    if (target.subClass && genes.sub !== current.sub) changes.push(`sub ${genes.sub}`);
    if (changes.length > 0) parts.push(`${target.characterId}: ${changes.join(', ')}`);
  }
  return parts.length > 0 ? parts.join('; ') : null;
}

// ---------------- Search ----------------

export interface DirectedBuildOutcome { data: Record<string, unknown> }

/** Runs `directedBuild` for party `{p}` (Spec 9.1.3, 2-3-3; 9.1.4.9). Never changes `state`. */
export async function runDirectedBuild(state: GameState, partyIndex: number, request: DirectedBuildRequest, dependencies: GaSearchDependencies): Promise<DirectedBuildOutcome> {
  const startedAt = dependencies.now();
  const deadline = startedAt + request.parameters.timeBudgetSeconds * 1000;
  const outOfTime = () => dependencies.now() >= deadline;
  const seed = request.parameters.seed ?? dependencies.createSeed();
  const random = createRandom(deriveSeed(seed, 0));
  const quickSeed = deriveSeed(seed, 1); const confirmSeed = deriveSeed(seed, 2); const verifySeed = deriveSeed(seed, 3);
  const model = buildModel(state, partyIndex, request);
  const { objective, parameters } = request;
  const routeRooms = routeRoomCount(prepareObjectiveState(state, partyIndex, objective).parties[partyIndex]);
  let evaluations = 0;
  const simulateOnce = async (target: GameState, runs: number, simulationSeed: number): Promise<ExpeditionSimulationResult> => {
    evaluations += 1;
    return await dependencies.simulate(prepareObjectiveState(target, partyIndex, objective), partyIndex, runs, simulationSeed, objectiveSimulationOptions(objective)) as ExpeditionSimulationResult;
  };
  // The current build's success rate per (runs, seed), the `minDefeat` baseline (as `gaSearch`).
  const baselines = new Map<string, number>();
  const evaluate = async (target: GameState, runs: number, simulationSeed: number): Promise<Measured> => {
    let baseline: number | null = null;
    if (objective === 'minDefeat') {
      const key = `${runs}:${simulationSeed}`;
      if (!baselines.has(key)) { const result = await simulateOnce(state, runs, simulationSeed); baselines.set(key, (result.Clear + result.Return) / Math.max(1, result.total)); }
      baseline = baselines.get(key)!;
    }
    return measure(objective, await simulateOnce(target, runs, simulationSeed), routeRooms, baseline);
  };
  const equipAll = (target: GameState) => withFreshParty(runAutoEquipment(model, target, target.parties[partyIndex].characters.map((character) => character.id).filter((id) => model.targets.some((entry) => entry.characterId === id)), dependencies), partyIndex);
  const steps: Record<string, { candidatesTried: number; selected: string | null }> = {};

  // ---- Step 1: the build layer (genetic search) ----
  // A candidate is decoded (its builds applied and its Auto Equipment run) only when it is first scored: Auto Equipment is
  // the costly part, so a child bred after the last generation or past the time budget costs nothing.
  interface Individual { genome: Genome; key: string; state?: GameState | null; quick?: number; confirm?: number }
  const individuals = new Map<string, Individual>();
  const individual = (genome: Genome): Individual => {
    const key = genomeKey(genome);
    const known = individuals.get(key);
    if (known) return known;
    const entry: Individual = { genome, key };
    individuals.set(key, entry);
    return entry;
  };
  const decoded = (entry: Individual): GameState | null => {
    if (entry.state === undefined) {
      const built = applyGenome(model, entry.genome);
      entry.state = built === null ? null : equipAll(built);
    }
    return entry.state;
  };
  let step1Tried = 0;
  const scoreQuick = async (entry: Individual) => {
    if (entry.quick !== undefined) return;
    const target = decoded(entry);
    if (target === null) { entry.quick = -Infinity; return; }
    step1Tried += 1;
    entry.quick = (await evaluate(target, parameters.quickRuns, quickSeed)).fitness;
  };
  const scoreConfirm = async (entry: Individual) => {
    const target = decoded(entry);
    if (entry.confirm !== undefined || target === null) return;
    entry.confirm = (await evaluate(target, parameters.confirmRuns, confirmSeed)).fitness;
  };
  // The current build is a candidate when it already keeps the class rules; the rest are direction-weighted samples.
  const currentIndividual = individual(model.current);
  const currentValid = applyGenome(model, model.current) !== null;
  let population: Individual[] = currentValid ? [currentIndividual] : [];
  for (let attempt = 0; population.length < parameters.populationSize && attempt < parameters.populationSize * 4; attempt += 1) population.push(individual(sample(model, random)));
  let best: Individual | null = null;
  for (let generation = 0; generation < parameters.generations && !outOfTime() && population.length > 0; generation += 1) {
    for (const entry of population) { if (outOfTime()) break; await scoreQuick(entry); }
    population.sort((a, b) => (b.quick ?? -Infinity) - (a.quick ?? -Infinity));
    for (const entry of population.slice(0, parameters.confirmTopN)) { if (outOfTime()) break; if ((entry.quick ?? -Infinity) > -Infinity) await scoreConfirm(entry); }
    for (const entry of population) if (entry.confirm !== undefined && entry.confirm > (best?.confirm ?? -Infinity)) best = entry;
    if (outOfTime() || generation === parameters.generations - 1) break;
    const scored = population.filter((entry) => entry.quick !== undefined && entry.quick > -Infinity);
    if (scored.length === 0) { population = population.map(() => individual(sample(model, random))); continue; }
    const tournament = () => {
      let chosen: Individual | null = null;
      for (let round = 0; round < parameters.tournamentSize; round += 1) {
        const candidate = scored[Math.floor(random() * scored.length)];
        if (!chosen || (candidate.quick ?? -Infinity) > (chosen.quick ?? -Infinity)) chosen = candidate;
      }
      return chosen!;
    };
    const next: Individual[] = population.slice(0, parameters.eliteCount);
    while (next.length < parameters.populationSize) {
      let genome = crossover(model, tournament().genome, tournament().genome, random);
      if (random() < parameters.mutationRate) genome = mutate(model, genome, random);
      next.push(individual(genome));
    }
    population = next;
  }
  // SpecRef: 9.1.3 | 2-3-3 Process Step 1 | with no valid candidate the original parameters are kept (Auto Equipment still runs).
  let locked: GameState = (best ? decoded(best) : null) ?? (currentValid ? decoded(currentIndividual) : null) ?? equipAll(model.base);
  steps.step1 = { candidatesTried: step1Tried, selected: best ? describeStep1(model, best.genome) : null };

  // ---- Step 2: the deity ----
  if (request.considerDeityChange !== 'none' && !outOfTime()) {
    const currentDeity = getDeityId(locked.parties[partyIndex].deity.name);
    let bestDeity = currentDeity;
    let bestState = locked;
    let bestScore = -Infinity;
    let tried = 0;
    for (const deity of deityOptionsFor(locked, locked.parties[partyIndex], request.considerDeityChange)) {
      if (outOfTime()) break;
      let candidate = locked;
      if (deity !== currentDeity) {
        const deityName = getDeityNameFromId(deity);
        if (!deityName) continue;
        // A deity another party holds (`allDeities`) is freed first, as `changeSummary` does.
        const holder = deityHolderIndex(candidate, partyIndex, deity);
        if (holder >= 0) candidate = gameReducer(candidate, { type: 'UPDATE_PARTY_DEITY', partyIndex: holder, deityName: 'None' });
        candidate = gameReducer(candidate, { type: 'UPDATE_PARTY_DEITY', partyIndex, deityName });
      }
      tried += 1;
      const score = (await evaluate(candidate, parameters.confirmRuns, confirmSeed)).fitness;
      if (score > bestScore) { bestScore = score; bestDeity = deity; bestState = candidate; }
    }
    locked = bestState;
    steps.step2 = { candidatesTried: tried, selected: bestDeity !== currentDeity ? `deity ${bestDeity}` : null };
  }

  // ---- Step 3: lineage, then predisposition, one target at a time ----
  const tuned = model.targets.filter((target) => target.lineage || target.predisposition);
  if (tuned.length > 0 && !outOfTime()) {
    let incumbent = (await evaluate(locked, parameters.quickRuns, quickSeed)).fitness;
    let tried = 0;
    const chosen: string[] = [];
    const fields = [
      { component: 'lineage' as const, parameter: 'lineage', values: LINEAGES.filter((entry) => entry.selectable === true).map((entry) => entry.id as string), current: (character: Character) => character.lineageId as string },
      { component: 'predisposition' as const, parameter: 'predisposition', values: PREDISPOSITIONS.filter((entry) => entry.selectable === true).map((entry) => entry.id as string), current: (character: Character) => character.predispositionId as string },
    ];
    const order = locked.parties[partyIndex].characters.map((character) => character.id);
    outer: for (const id of order) {
      const target = tuned.find((entry) => entry.characterId === id);
      if (!target) continue;
      for (const field of fields) {
        if (!target[field.component]) continue;
        const character = characterIn(locked, partyIndex, id);
        // A unique character's lineage and predisposition are fixed (the game rules).
        if (character.isUnique) continue;
        const before = field.current(character);
        let bestValue = before;
        let bestState = locked;
        for (const value of field.values) {
          if (value === before) continue;
          if (outOfTime()) break outer;
          let candidate: GameState;
          try { candidate = changeMember(locked, partyIndex, id, { [field.parameter]: value }); } catch { continue; }
          // The re-run covers this target alone: `withinTargets` takes nothing, `global` takes only from non-targets.
          candidate = withFreshParty(runAutoEquipment({ ...model, request: { ...model.request, considerItemsScope: model.request.considerItemsScope === 'global' ? 'global' : 'normal' } }, candidate, [id], dependencies), partyIndex);
          tried += 1;
          const score = (await evaluate(candidate, parameters.quickRuns, quickSeed)).fitness;
          if (score > incumbent) { incumbent = score; bestValue = value; bestState = candidate; }
        }
        if (bestValue !== before) { locked = bestState; chosen.push(`${id}: ${field.parameter} ${bestValue}`); }
      }
    }
    steps.step3 = { candidatesTried: tried, selected: chosen.length > 0 ? chosen.join('; ') : null };
  }

  // ---- Verification: the current and the final build on one fresh seed (as `gaSearch`) ----
  let changeSummary: GaChangeEntry[] = [];
  let finalState = state;
  try {
    changeSummary = planGaChangeSummary(state, partyIndex, locked, dependencies.commitContext);
    if (changeSummary.length > 0) finalState = locked;
  } catch {
    changeSummary = [];
  }
  const verifyRuns = parameters.verifyRuns;
  const verifyBefore = await evaluate(state, verifyRuns, verifySeed);
  const verifyAfter = changeSummary.length > 0 ? await evaluate(finalState, verifyRuns, verifySeed) : verifyBefore;
  const scoredBy: GaObjective | 'progress' = objective === 'success' && verifyBefore.rate === 0 && verifyAfter.rate === 0 ? 'progress' : objective;
  const scoreOf = (measured: Measured): ObjectiveMeasure => (scoredBy === 'progress' ? measured.progress! : measured);
  const rating = rateGaResult(scoredBy, scoreOf(verifyBefore), scoreOf(verifyAfter), verifyRuns, changeSummary.length > 0);
  const forecast: GaForecast = {
    before: buildSimulationRunData(verifyBefore.result, dependencies.revision, 'directed-verify').overview,
    after: buildSimulationRunData(verifyAfter.result, dependencies.revision, 'directed-verify').overview,
  };
  const after = compositionOf(finalState.parties[partyIndex].characters);
  return {
    data: {
      verdict: rating.verdict,
      forecast,
      changeSummary,
      revision: dependencies.revision,
      evaluations,
      elapsedSeconds: Math.round((dependencies.now() - startedAt) / 100) / 10,
      basis: buildBasis(state, partyIndex, changeSummary),
      verification: {
        objective,
        scoredBy,
        runs: verifyRuns,
        before: scoreOf(verifyBefore).rate,
        after: scoreOf(verifyAfter).rate,
        gain: Number.isFinite(rating.gain) ? Math.round(rating.gain * 100) / 100 : null,
        standardError: Math.round(rating.standardError * 100) / 100,
        seed,
      },
      seed,
      direction: request.direction,
      composition: { before: compositionOf(state.parties[partyIndex].characters), after, distance: compositionDistance(request.direction, after) },
      steps,
    },
  };
}
