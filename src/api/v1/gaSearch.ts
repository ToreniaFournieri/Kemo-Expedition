import { CLASSES } from '../../data/classes';
import { LINEAGES } from '../../data/lineages';
import { PREDISPOSITIONS } from '../../data/predispositions';
import { computeCharacterStats } from '../../game/characterComputation';
import { getBossGateKey, getEliteGateKey } from '../../game/clearGateCore';
import { getDeityId, getDeityNameFromId } from '../../game/deity';
import { canCharacterEquipCategory } from '../../game/equipmentSets';
import { isJewelAllowedForCategory } from '../../game/jewel';
import { gameReducer } from '../../hooks/useGameState';
import { getVariantKey, type Character, type ExpeditionSimulationResult, type GameState, type Item, type JewelKey } from '../../types';
import { describeCharacterBuildCurrent, planCharacterBuildChange } from './buildChange';
import { recordEquipmentState } from '../../game/equipmentHistory';
import { computePartyStats } from '../../game/partyComputation';
import { buildCalculatedStatus } from './calculatedStatus';
import { applyApiV1Commit, type ApiV1CommitContext } from './commitOperations';
import { sameEquipmentSnapshot, snapshotCharacterEquipment } from './equipmentHistoryFacts';
import { validPartyDeityIds, validRaceAndGenderOptions } from './readModels';
import { buildSimulationRunData } from './simulationView';

// SpecRef: 9.1.3 | Read | 2-3-2 party/{p}/gaSearch
// SpecRef: 9.1.4.9 | Operation-specific completion rules | gaSearch
// A genetic search over the party build. Every candidate is scored by the game's own private forecast
// (`simulateExpeditionRuns`) on fixed seeds, so two builds are always compared on the same random numbers.

export const GA_OBJECTIVES = ['success', 'minDefeat', 'bossDamage', 'experience'] as const;
export type GaObjective = typeof GA_OBJECTIVES[number];
export const GA_EFFORTS = ['low', 'medium', 'high'] as const;
type GaEffort = typeof GA_EFFORTS[number];
export const GA_VERDICTS = ['veryGood', 'good', 'noisy', 'noChange', 'worse'] as const;
export type GaVerdict = typeof GA_VERDICTS[number];
const COMPONENTS = ['raceGender', 'mainClass', 'subClass', 'lineage', 'predisposition', 'equipment', 'jewels'] as const;
type Component = typeof COMPONENTS[number];
const BUILD_FIELDS = { raceGender: 'racesAndGender', mainClass: 'mainClassId', subClass: 'subClassId', lineage: 'lineage', predisposition: 'predisposition' } as const;
type BuildComponent = keyof typeof BUILD_FIELDS;
type BuildField = typeof BUILD_FIELDS[BuildComponent];

// SpecRef: 9.1.3 | 2-3-2 gaSearch `gaParameters` | the `effort` presets.
export const GA_EFFORT_PRESETS: Record<GaEffort, { populationSize: number; generations: number; quickRuns: number; confirmRuns: number; timeBudgetSeconds: number }> = {
  low: { populationSize: 12, generations: 15, quickRuns: 30, confirmRuns: 150, timeBudgetSeconds: 15 },
  medium: { populationSize: 24, generations: 40, quickRuns: 50, confirmRuns: 300, timeBudgetSeconds: 60 },
  high: { populationSize: 48, generations: 80, quickRuns: 100, confirmRuns: 600, timeBudgetSeconds: 180 },
};

/** `[minimum, maximum]` of each integer parameter (Spec 9.1.3, 2-3-2). */
const INTEGER_RANGES = {
  populationSize: [8, 64], generations: [1, 200], quickRuns: [10, 300], confirmRuns: [50, 1000], timeBudgetSeconds: [5, 300],
  verifyRuns: [100, 1000], eliteCount: [0, 16], tournamentSize: [2, 8], confirmTopN: [1, 10], maxChanges: [1, 100],
} as const;

export interface GaParameters {
  effort: GaEffort;
  populationSize: number;
  generations: number;
  quickRuns: number;
  confirmRuns: number;
  timeBudgetSeconds: number;
  verifyRuns: number;
  eliteCount: number;
  mutationRate: number;
  tournamentSize: number;
  confirmTopN: number;
  seed: number | null;
  maxChanges: number | null;
  seedWithHeuristics: boolean;
}

export interface GaTarget { characterId: number; components: Record<Component, boolean> }

export interface GaSearchRequest {
  targets: GaTarget[];
  considerOrderChange: boolean;
  considerDeityChange: boolean;
  objective: GaObjective;
  parameters: GaParameters;
}

/** One Commit API call of `changeSummary`. */
export interface GaChangeEntry { endpoint: string; parameters: Record<string, unknown> }

export interface GaForecast { before: string; after: string }

/** What `applyGaResult` needs from a search; kept in memory only (Spec 9.1.3: not save state). */
export interface StoredGaResult {
  gaResultId: string;
  partyNumber: number;
  revision: number;
  verdict: GaVerdict;
  forecast: GaForecast;
  changeSummary: GaChangeEntry[];
  /** Build-relevant facts at search time (Spec 9.1.3, 3-3-2 Validation). */
  fingerprint: string;
}

export interface GaSearchDependencies {
  simulate: (state: GameState, partyIndex: number, count: number, seed: number) => Promise<unknown>;
  /** Wall clock (ms) for the time budget and `elapsedSeconds`. */
  now: () => number;
  createSeed: () => number;
  createOpaqueId: () => string;
  revision: number;
  /** The commit context `changeSummary` is dry-run against, so every entry is a call the Commit API accepts. */
  commitContext: Pick<ApiV1CommitContext, 'simulatedAt' | 'gameMode' | 'enemyLevelOffset' | 'applyAutoEquipment' | 'now'>;
}

function invalid(field: string): never { throw new Error(`invalid_request:${field}`); }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }

function readBoolean(source: Record<string, unknown>, key: string, field: string, fallback: boolean): boolean {
  const value = source[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') invalid(field);
  return value;
}

function readInteger(source: Record<string, unknown>, key: keyof typeof INTEGER_RANGES, fallback: number | null): number | null {
  const value = source[key];
  if (value === undefined) return fallback;
  const [minimum, maximum] = INTEGER_RANGES[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > maximum) invalid(`gaParameters.${key}`);
  return value;
}

/** Validates a `gaSearch` request against party `{p}` (Spec 9.1.3, 2-3-2). Throws `invalid_request:<field>` or `not_found`. */
export function parseGaSearchRequest(state: GameState, partyIndex: number, raw: Record<string, unknown>): GaSearchRequest {
  const allowed = new Set(['targets', 'considerOrderChange', 'considerDeityChange', 'objective', 'gaParameters']);
  const unknown = Object.keys(raw).find((key) => !allowed.has(key));
  if (unknown !== undefined) invalid(`${unknown}.unknown_member`);
  const party = state.parties[partyIndex];
  if (!Array.isArray(raw.targets) || raw.targets.length === 0 || raw.targets.length > party.characters.length) invalid('targets');
  const seen = new Set<number>();
  const targets = raw.targets.map((entry): GaTarget => {
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
    const extraComponent = Object.keys(source).find((key) => !(COMPONENTS as readonly string[]).includes(key));
    if (extraComponent !== undefined) invalid(`targets.changeableComponents.${extraComponent}.unknown_member`);
    const components = Object.fromEntries(COMPONENTS.map((key) => [key, readBoolean(source, key, `targets.changeableComponents.${key}`, false)])) as Record<Component, boolean>;
    // SpecRef: 9.1.3 | 2-3-2 | A component a character cannot change (a unique character's identity) is ignored.
    const character = party.characters.find((candidate) => candidate.id === characterId)!;
    if (character.isUnique) { components.raceGender = false; components.lineage = false; components.predisposition = false; }
    return { characterId, components };
  });
  const objective = raw.objective === undefined ? 'success' : raw.objective;
  if (typeof objective !== 'string' || !(GA_OBJECTIVES as readonly string[]).includes(objective)) invalid('objective');
  const source = raw.gaParameters === undefined ? {} : raw.gaParameters;
  if (!isRecord(source)) invalid('gaParameters');
  const knownParameters = new Set(['effort', 'mutationRate', 'seed', 'seedWithHeuristics', ...Object.keys(INTEGER_RANGES)]);
  const unknownParameter = Object.keys(source).find((key) => !knownParameters.has(key));
  if (unknownParameter !== undefined) invalid(`gaParameters.${unknownParameter}.unknown_member`);
  const effort = source.effort === undefined ? 'low' : source.effort;
  if (typeof effort !== 'string' || !(GA_EFFORTS as readonly string[]).includes(effort)) invalid('gaParameters.effort');
  const preset = GA_EFFORT_PRESETS[effort as GaEffort];
  const populationSize = readInteger(source, 'populationSize', preset.populationSize)!;
  const eliteCount = readInteger(source, 'eliteCount', 3)!;
  if (eliteCount > Math.floor(populationSize / 4)) invalid('gaParameters.eliteCount');
  const mutationRate = source.mutationRate === undefined ? 0.35 : source.mutationRate;
  if (typeof mutationRate !== 'number' || !Number.isFinite(mutationRate) || mutationRate < 0 || mutationRate > 1) invalid('gaParameters.mutationRate');
  const seed = source.seed === undefined ? null : source.seed;
  if (seed !== null && (typeof seed !== 'number' || !Number.isSafeInteger(seed))) invalid('gaParameters.seed');
  return {
    targets,
    considerOrderChange: readBoolean(raw, 'considerOrderChange', 'considerOrderChange', false),
    considerDeityChange: readBoolean(raw, 'considerDeityChange', 'considerDeityChange', false),
    objective: objective as GaObjective,
    parameters: {
      effort: effort as GaEffort,
      populationSize,
      generations: readInteger(source, 'generations', preset.generations)!,
      quickRuns: readInteger(source, 'quickRuns', preset.quickRuns)!,
      confirmRuns: readInteger(source, 'confirmRuns', preset.confirmRuns)!,
      timeBudgetSeconds: readInteger(source, 'timeBudgetSeconds', preset.timeBudgetSeconds)!,
      verifyRuns: readInteger(source, 'verifyRuns', 500)!,
      eliteCount,
      mutationRate,
      tournamentSize: readInteger(source, 'tournamentSize', 3)!,
      confirmTopN: readInteger(source, 'confirmTopN', 5)!,
      seed,
      maxChanges: readInteger(source, 'maxChanges', null),
      seedWithHeuristics: readBoolean(source, 'seedWithHeuristics', 'gaParameters.seedWithHeuristics', true),
    },
  };
}

// SpecRef: 9.1.3 | 3-3-2 applyGaResult Validation | build-relevant state
/**
 * The party facts a result depends on: order, deity, and every member's build and equipment, plus the owned count of
 * each item variant and Jewel the result equips or attaches. Other inventory changes (new drops) do not invalidate it.
 */
export function gaBuildFingerprint(state: GameState, partyIndex: number, usedVariants: readonly string[], usedJewels: readonly string[]): string {
  const party = state.parties[partyIndex];
  const owned = (key: string) => { const entry = state.global.inventory[key]; return entry && entry.status === 'owned' ? entry.count : 0; };
  return JSON.stringify({
    order: party.characters.map((character) => character.id),
    deity: getDeityId(party.deity.name),
    members: party.characters.map((character) => ({
      build: describeCharacterBuildCurrent(character),
      equipment: character.equipment.map((item) => item ? `${getVariantKey(item)}/${item.jewel ? `${item.jewel.key}:${item.jewel.rank}` : ''}` : null),
    })),
    items: [...new Set(usedVariants)].sort().map((key) => [key, owned(key)]),
    jewels: [...new Set(usedJewels)].sort().map((key) => [key, state.global.jewels[key] ?? 0]),
  });
}

// ---------------- Genome ----------------

interface SlotGene { k: string; j: string | null }
interface Genome {
  order: number[];
  deity: string;
  builds: Record<number, Partial<Record<BuildField, string>>>;
  equipment: Record<number, (SlotGene | null)[]>;
}

interface SearchModel {
  base: GameState;
  partyIndex: number;
  request: GaSearchRequest;
  /** Item variants the search may place, by variant key: the item and how many exist (free + worn by changeable targets). */
  pool: Map<string, { item: Item; total: number }>;
  poolKeys: string[];
  /** Jewels the search may attach: free plus those on targets whose Jewels are changeable. */
  jewelTotals: Record<string, number>;
  buildOptions: Record<number, Partial<Record<BuildField, string[]>>>;
  deityOptions: string[];
  current: Genome;
}

const jewelKeyOf = (item: Item | null | undefined): string | null => item?.jewel ? `${item.jewel.key}:${item.jewel.rank}` : null;
const targetOf = (model: SearchModel, characterId: number) => model.request.targets.find((target) => target.characterId === characterId);

function buildModel(state: GameState, partyIndex: number, request: GaSearchRequest): SearchModel {
  const party = state.parties[partyIndex];
  const pool = new Map<string, { item: Item; total: number }>();
  const add = (item: Item, count: number) => {
    const key = getVariantKey(item);
    const entry = pool.get(key);
    if (entry) entry.total += count;
    else pool.set(key, { item: { ...item, jewel: null, isLocked: false }, total: count });
  };
  const equipmentTargets = request.targets.filter((target) => target.components.equipment);
  if (equipmentTargets.length > 0) {
    for (const entry of Object.values(state.global.inventory)) if (entry.status === 'owned' && entry.count > 0) add(entry.item, entry.count);
  }
  const jewelTotals: Record<string, number> = {};
  if (request.targets.some((target) => target.components.jewels)) {
    for (const [key, count] of Object.entries(state.global.jewels)) if (count > 0) jewelTotals[key] = count;
  }
  const current: Genome = { order: party.characters.map((character) => character.id), deity: getDeityId(party.deity.name), builds: {}, equipment: {} };
  const buildOptions: SearchModel['buildOptions'] = {};
  for (const target of request.targets) {
    const character = party.characters.find((candidate) => candidate.id === target.characterId)!;
    // A Jewels-only target keeps its items; its slot genes still carry the Jewels.
    if (target.components.equipment || target.components.jewels) {
      for (const item of character.equipment) if (item) add(item, 1);
      current.equipment[character.id] = character.equipment.map((item) => item ? { k: getVariantKey(item), j: jewelKeyOf(item) } : null);
    }
    if (target.components.jewels) {
      for (const item of character.equipment) { const key = jewelKeyOf(item); if (key) jewelTotals[key] = (jewelTotals[key] ?? 0) + 1; }
    }
    const describe = describeCharacterBuildCurrent(character);
    const options: Partial<Record<BuildField, string[]>> = {};
    const genes: Partial<Record<BuildField, string>> = {};
    for (const component of Object.keys(BUILD_FIELDS) as BuildComponent[]) {
      if (!target.components[component]) continue;
      const field = BUILD_FIELDS[component];
      const values = field === 'racesAndGender' ? validRaceAndGenderOptions(state, party, character)
        : field === 'mainClassId' || field === 'subClassId' ? CLASSES.map((entry) => entry.id)
          : field === 'lineage' ? LINEAGES.filter((entry) => entry.selectable === true).map((entry) => entry.id)
            : PREDISPOSITIONS.filter((entry) => entry.selectable === true).map((entry) => entry.id);
      const currentValue = String(describe[field]);
      options[field] = [...new Set([currentValue, ...values])];
      genes[field] = currentValue;
    }
    buildOptions[character.id] = options;
    current.builds[character.id] = genes;
  }
  return {
    base: state, partyIndex, request, pool, poolKeys: [...pool.keys()], jewelTotals, buildOptions,
    deityOptions: request.considerDeityChange ? validPartyDeityIds(state, party) : [current.deity], current,
  };
}

const cloneGenome = (genome: Genome): Genome => ({
  order: [...genome.order],
  deity: genome.deity,
  builds: Object.fromEntries(Object.entries(genome.builds).map(([id, genes]) => [id, { ...genes }])),
  equipment: Object.fromEntries(Object.entries(genome.equipment).map(([id, slots]) => [id, slots.map((slot) => slot ? { ...slot } : null)])),
});

/** Tier of an item ID (the thousands digit block); higher tiers are drawn more often when a slot is refilled. */
const tierWeight = (key: string): number => Math.max(1, Math.floor(Number(key.split('-')[0]) / 1000) ** 2);

/** xorshift32: a small deterministic stream for the search itself (selection, crossover, mutation, repair). */
function createRandom(seed: number): () => number {
  let value = (seed >>> 0) || 0x9e3779b9;
  return () => {
    value ^= value << 13; value >>>= 0;
    value ^= value >>> 17;
    value ^= value << 5; value >>>= 0;
    return value / 4294967296;
  };
}

/** Derives the independent seeds of the quick, confirm, and verification runs from the request seed. */
const deriveSeed = (seed: number, stream: number): number => {
  let value = (seed ^ Math.imul(stream + 1, 0x9e3779b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
};

interface Decoded { state: GameState; genome: Genome }

/**
 * Applies a genome to a private copy of the state with repair: an invalid build change keeps the current value, and a
 * slot whose item is unavailable or not equippable is refilled from the remaining pool. Party HP is derived from the
 * characters, so the party gets new character arrays (its stats cache is keyed by array identity).
 */
function decode(model: SearchModel, input: Genome, random: () => number): Decoded {
  const genome = cloneGenome(input);
  let state = model.base;
  const partyIndex = model.partyIndex;
  if (genome.deity !== model.current.deity) {
    const deityName = getDeityNameFromId(genome.deity);
    if (deityName) state = gameReducer(state, { type: 'UPDATE_PARTY_DEITY', partyIndex, deityName });
    else genome.deity = model.current.deity;
  }
  if (genome.order.join(',') !== model.current.order.join(',')) {
    for (let destination = 0; destination < genome.order.length; destination += 1) {
      const source = state.parties[partyIndex].characters.findIndex((entry) => entry.id === genome.order[destination]);
      if (source !== destination) state = gameReducer(state, { type: 'REORDER_PARTY_CHARACTER', partyIndex, fromIndex: source, toIndex: destination });
    }
  }
  // Build changes are planned in party order, the order `changeSummary` commits them in (race/gender rules see earlier changes).
  const buildTargets = model.base.parties[partyIndex].characters.map((character) => targetOf(model, character.id)).filter((target): target is GaTarget => Boolean(target));
  for (const target of buildTargets) {
    const genes = genome.builds[target.characterId];
    const current = model.current.builds[target.characterId];
    if (!genes) continue;
    const changes = Object.fromEntries(Object.entries(genes).filter(([field, value]) => value !== current[field as BuildField]));
    if (Object.keys(changes).length === 0) continue;
    try {
      const plan = planCharacterBuildChange(state, target.characterId, changes);
      if (Object.keys(plan.updates).length > 0) {
        state = gameReducer(state, { type: 'UPDATE_CHARACTER', partyIndex, characterId: target.characterId, updates: plan.updates, validatedMimorianAssignments: true, allowUniqueIdentityChange: true });
      }
    } catch {
      genome.builds[target.characterId] = { ...current };
    }
  }

  const party = state.parties[partyIndex];
  const left: Record<string, number> = Object.fromEntries([...model.pool].map(([key, entry]) => [key, entry.total]));
  const jewelsLeft: Record<string, number> = { ...model.jewelTotals };
  const characters = party.characters.map((character) => ({ ...character }));
  const holes: [Character, number][] = [];
  for (const character of characters) {
    const target = targetOf(model, character.id);
    if (!target?.components.equipment && !target?.components.jewels) continue;
    const maxSlots = computeCharacterStats(character, party.level).maxEquipSlots;
    const original = model.base.parties[partyIndex].characters.find((entry) => entry.id === character.id)!.equipment;
    // A Jewels-only target's items are fixed: each slot keeps its item and only the Jewel gene is read.
    const genes = target.components.equipment
      ? genome.equipment[character.id] ?? []
      : original.map((item, slot) => item ? { k: getVariantKey(item), j: genome.equipment[character.id]?.[slot]?.j ?? null } : null);
    const equipment: (Item | null)[] = new Array(maxSlots).fill(null);
    const repaired: (SlotGene | null)[] = new Array(maxSlots).fill(null);
    for (let slot = 0; slot < maxSlots; slot += 1) {
      const gene = genes[slot];
      if (!gene) continue;
      const entry = model.pool.get(gene.k);
      if (!entry || (left[gene.k] ?? 0) <= 0 || !canCharacterEquipCategory(character, entry.item.category)) { holes.push([character, slot]); continue; }
      left[gene.k] -= 1;
      const item: Item = { ...entry.item, jewel: null };
      let jewel: string | null = null;
      if (target.components.jewels) {
        if (gene.j && (jewelsLeft[gene.j] ?? 0) > 0 && isJewelAllowedForCategory(item.category, gene.j.split(':')[0] as JewelKey)) { jewel = gene.j; jewelsLeft[gene.j] -= 1; }
      } else {
        // Jewels are fixed: only the item that stays in its slot keeps its Jewel.
        const before = original[slot];
        if (before && getVariantKey(before) === gene.k) jewel = jewelKeyOf(before);
      }
      if (jewel) { const [key, rank] = jewel.split(':'); item.jewel = { key: key as JewelKey, rank: Number(rank) }; }
      equipment[slot] = item;
      repaired[slot] = { k: gene.k, j: jewel };
    }
    character.equipment = equipment;
    genome.equipment[character.id] = repaired;
  }
  for (const [character, slot] of holes) {
    for (let attempt = 0; attempt < 30 && model.poolKeys.length > 0; attempt += 1) {
      const key = model.poolKeys[Math.floor(random() * model.poolKeys.length)];
      const entry = model.pool.get(key)!;
      if ((left[key] ?? 0) <= 0 || !canCharacterEquipCategory(character, entry.item.category)) continue;
      left[key] -= 1;
      character.equipment[slot] = { ...entry.item, jewel: null };
      genome.equipment[character.id][slot] = { k: key, j: null };
      break;
    }
  }
  const parties = [...state.parties];
  parties[partyIndex] = { ...party, characters };
  return { state: { ...state, parties }, genome };
}

const genomeKey = (genome: Genome): string => JSON.stringify(genome);

/** Number of `changeSummary` entries the genome needs (Spec 9.1.3, 2-3-2 `maxChanges`), counted from the decoded build. */
function countChanges(model: SearchModel, decoded: Decoded): number {
  const before = model.base.parties[model.partyIndex];
  const after = decoded.state.parties[model.partyIndex];
  let count = decoded.genome.deity !== model.current.deity || decoded.genome.order.join(',') !== model.current.order.join(',') ? 1 : 0;
  for (const target of model.request.targets) {
    const genes = decoded.genome.builds[target.characterId] ?? {};
    if (Object.entries(genes).some(([field, value]) => value !== model.current.builds[target.characterId][field as BuildField])) count += 1;
    if (!target.components.equipment && !target.components.jewels) continue;
    const old = before.characters.find((entry) => entry.id === target.characterId)!.equipment;
    const next = after.characters.find((entry) => entry.id === target.characterId)!.equipment;
    let removed = 0; let jewelRemoved = 0;
    for (let slot = 0; slot < Math.max(old.length, next.length); slot += 1) {
      const a = old[slot] ?? null; const b = next[slot] ?? null;
      const same = a && b && getVariantKey(a) === getVariantKey(b);
      if (a && !same) removed += 1;
      if (b && !same) count += 1 + (b.jewel ? 1 : 0);
      if (same && jewelKeyOf(a) !== jewelKeyOf(b)) { if (a!.jewel) jewelRemoved += 1; if (b!.jewel) count += 1; }
    }
    count += (removed > 0 ? 1 : 0) + (jewelRemoved > 0 ? 1 : 0);
  }
  return count;
}

// ---------------- Objective ----------------

/** Opens every Clear-Gate of the destination and the whole depth, so a `bossDamage` run can reach the boss room. */
function prepareObjectiveState(state: GameState, partyIndex: number, objective: GaObjective): GameState {
  if (objective !== 'bossDamage') return state;
  const party = state.parties[partyIndex];
  const dungeonId = party.selectedDungeonId;
  const clearGateStatus = { ...party.clearGateStatus };
  for (let floor = 1; floor <= 5; floor += 1) clearGateStatus[getEliteGateKey(dungeonId, floor)] = true;
  clearGateStatus[getBossGateKey(dungeonId)] = true;
  const parties = [...state.parties];
  parties[partyIndex] = { ...party, clearGateStatus, expeditionDepthLimit: 'all' };
  return { ...state, parties };
}

interface Measured { rate: number; variance: number; fitness: number; result: ExpeditionSimulationResult }

/**
 * The objective's `<rate>` (Spec 9.1.3, 2-3-2 `verdict`), its per-run variance, and the search fitness (higher is better).
 * `baselineSuccess` is the current build's success rate on the same seed: `minDefeat` may not trade successes for safety
 * (a build that cannot win draws every battle and never loses).
 */
function measure(objective: GaObjective, result: ExpeditionSimulationResult, baselineSuccess: number | null = null): Measured {
  const runs = Math.max(1, result.total);
  const success = (result.Clear + result.Return) / runs;
  // Rooms reached per run give a smooth signal before the first success (a build that goes deeper is closer); it is
  // weighted by the failure share so it only breaks ties while successes are rare.
  const progress = result.rooms.reduce((sum, room) => sum + room.reached, 0) / (runs * Math.max(1, result.rooms.length));
  if (objective === 'minDefeat') {
    const defeat = result.Defeat / runs;
    const successLoss = baselineSuccess === null ? 0 : Math.max(0, baselineSuccess - success);
    return { rate: defeat, variance: defeat * (1 - defeat), fitness: -defeat - 5 * successLoss + 0.01 * success, result };
  }
  if (objective === 'bossDamage') {
    const share = (result.boss?.damageShare ?? 0) / runs;
    // Without per-run shares the variance uses the Bernoulli bound p(1 - p), the largest a [0, 1] value can have.
    return { rate: share, variance: share * (1 - share), fitness: share + 0.1 * progress * (1 - share), result };
  }
  if (objective === 'experience') {
    const mean = (result.totals?.experience ?? 0) / runs;
    const squares = (result.experienceSquareSum ?? 0) / runs;
    return { rate: mean, variance: Math.max(0, squares - mean * mean), fitness: mean, result };
  }
  return { rate: success, variance: success * (1 - success), fitness: Math.log(Math.max(success, 0.5 / runs)) + 0.1 * progress * (1 - success), result };
}

interface Rating { verdict: GaVerdict; gain: number; standardError: number }

// SpecRef: 9.1.3 | 2-3-2 `verdict` | 10 percentage points (20% for `experience`) and 2 standard errors.
export function rateGaResult(objective: GaObjective, before: { rate: number; variance: number }, after: { rate: number; variance: number }, runs: number, changed: boolean): Rating {
  if (!changed) return { verdict: 'noChange', gain: 0, standardError: 0 };
  const lowerIsBetter = objective === 'minDefeat';
  const relative = objective === 'experience';
  const scale = relative ? (before.rate > 0 ? 100 / before.rate : 0) : 100;
  const difference = (after.rate - before.rate) * (lowerIsBetter ? -1 : 1);
  const gain = relative && before.rate <= 0 ? (after.rate > 0 ? Infinity : 0) : difference * scale;
  const rawError = Math.sqrt(before.variance / runs + after.variance / runs);
  const standardError = relative && before.rate <= 0 ? 0 : rawError * scale;
  const threshold = relative ? 20 : 10;
  if (gain > 2 * standardError) return { verdict: gain >= threshold ? 'veryGood' : 'good', gain, standardError };
  if (gain < -2 * standardError) return { verdict: 'worse', gain, standardError };
  return { verdict: 'noisy', gain, standardError };
}

// ---------------- Heuristic seeds ----------------

const attackScore = (item: Item, stats: ReturnType<typeof computeCharacterStats>): number => {
  const enhancement = 1 + 0.1 * item.enhancement;
  return ((item.meleeAttack ?? 0) * Math.max(1, stats.meleeNoA) + (item.rangedAttack ?? 0) * Math.max(1, stats.rangedNoA) + (item.magicalAttack ?? 0) * Math.max(1, stats.magicalNoA)) * enhancement
    * (1 + (item.elementalOffenseBonus ?? 0)) + ((item.meleeNoABonus ?? 0) + (item.rangedNoABonus ?? 0) + (item.magicalNoABonus ?? 0)) * 40 + (item.penetBonus ?? 0) * 20;
};
const durabilityScore = (item: Item): number => ((item.partyHP ?? 0) + 0.5 * ((item.physicalDefense ?? 0) + (item.magicalDefense ?? 0)) + 10 * (item.vitalityBonus ?? 0)) * (1 + 0.1 * item.enhancement);

/** Greedy builds from the item fields alone: one attack-focused and one HP/defense-focused (no Jewels, no build change). */
function heuristicGenomes(model: SearchModel): Genome[] {
  const party = model.base.parties[model.partyIndex];
  const make = (score: (item: Item, character: Character) => number): Genome => {
    const genome = cloneGenome(model.current);
    const left: Record<string, number> = Object.fromEntries([...model.pool].map(([key, entry]) => [key, entry.total]));
    for (const target of model.request.targets) {
      if (!target.components.equipment) continue;
      const character = party.characters.find((entry) => entry.id === target.characterId)!;
      const maxSlots = computeCharacterStats(character, party.level).maxEquipSlots;
      const slots: (SlotGene | null)[] = [];
      for (let slot = 0; slot < maxSlots; slot += 1) {
        let best: string | null = null; let bestScore = -Infinity;
        for (const [key, entry] of model.pool) {
          if ((left[key] ?? 0) <= 0 || !canCharacterEquipCategory(character, entry.item.category)) continue;
          const value = score(entry.item, character);
          if (value > bestScore) { bestScore = value; best = key; }
        }
        if (best) left[best] -= 1;
        slots.push(best ? { k: best, j: null } : null);
      }
      genome.equipment[character.id] = slots;
    }
    return genome;
  };
  const statsById = new Map(party.characters.map((character, index) => [character.id, computeCharacterStats(character, party.level, index + 1)]));
  return [make((item, character) => attackScore(item, statsById.get(character.id)!)), make((item) => durabilityScore(item))];
}

// ---------------- Mutation and crossover ----------------

function mutate(model: SearchModel, input: Genome, random: () => number): Genome {
  const genome = cloneGenome(input);
  const equipmentTargets = model.request.targets.filter((target) => target.components.equipment).map((target) => target.characterId);
  const jewelTargets = model.request.targets.filter((target) => target.components.jewels).map((target) => target.characterId);
  const buildTargets = model.request.targets.filter((target) => Object.keys(model.buildOptions[target.characterId] ?? {}).length > 0).map((target) => target.characterId);
  const kinds: string[] = [];
  if (equipmentTargets.length > 0) kinds.push('replace', 'replace', 'replace', 'swap');
  if (jewelTargets.length > 0 && Object.keys(model.jewelTotals).length > 0) kinds.push('jewel');
  if (buildTargets.length > 0) kinds.push('build');
  if (model.request.considerOrderChange && genome.order.length > 1) kinds.push('order');
  if (model.deityOptions.length > 1) kinds.push('deity');
  if (kinds.length === 0) return genome;
  const pick = <T>(values: readonly T[]): T => values[Math.floor(random() * values.length)];
  const steps = 1 + Math.floor(random() * 3);
  for (let step = 0; step < steps; step += 1) {
    const kind = pick(kinds);
    if (kind === 'replace') {
      const id = pick(equipmentTargets); const slots = genome.equipment[id];
      if (slots.length === 0) continue;
      const slot = Math.floor(random() * slots.length);
      const weighted: string[] = [];
      for (const key of model.poolKeys) for (let weight = tierWeight(key); weight > 0; weight -= 1) weighted.push(key);
      if (weighted.length > 0) slots[slot] = { k: pick(weighted), j: null };
    } else if (kind === 'swap') {
      const a = pick(equipmentTargets); const b = pick(equipmentTargets);
      const sa = genome.equipment[a]; const sb = genome.equipment[b];
      if (sa.length === 0 || sb.length === 0) continue;
      const ia = Math.floor(random() * sa.length); const ib = Math.floor(random() * sb.length);
      [sa[ia], sb[ib]] = [sb[ib], sa[ia]];
    } else if (kind === 'jewel') {
      const id = pick(jewelTargets); const slots = genome.equipment[id];
      const filled = slots.map((gene, index) => gene ? index : -1).filter((index) => index >= 0);
      if (filled.length === 0) continue;
      const slot = pick(filled);
      const jewels = Object.keys(model.jewelTotals);
      slots[slot] = { ...slots[slot]!, j: random() < 0.2 ? null : pick(jewels) };
    } else if (kind === 'build') {
      const id = pick(buildTargets); const options = model.buildOptions[id];
      const field = pick(Object.keys(options) as BuildField[]);
      genome.builds[id][field] = pick(options[field]!);
    } else if (kind === 'order') {
      const i = Math.floor(random() * genome.order.length); const j = Math.floor(random() * genome.order.length);
      [genome.order[i], genome.order[j]] = [genome.order[j], genome.order[i]];
    } else {
      genome.deity = pick(model.deityOptions);
    }
  }
  return genome;
}

/** Each character's whole loadout and build come from one parent; half the time one character's slots are mixed. */
function crossover(model: SearchModel, a: Genome, b: Genome, random: () => number): Genome {
  const child = cloneGenome(a);
  for (const target of model.request.targets) {
    const id = target.characterId;
    if (random() < 0.5) {
      if (b.equipment[id]) child.equipment[id] = b.equipment[id].map((gene) => gene ? { ...gene } : null);
      if (b.builds[id]) child.builds[id] = { ...b.builds[id] };
    }
  }
  const ids = Object.keys(child.equipment).map(Number);
  if (ids.length > 0 && random() < 0.5) {
    const id = ids[Math.floor(random() * ids.length)];
    child.equipment[id] = child.equipment[id].map((gene, slot) => (random() < 0.5 && b.equipment[id] ? (b.equipment[id][slot] ? { ...b.equipment[id][slot]! } : null) : gene));
  }
  if (random() < 0.5) child.order = [...b.order];
  if (random() < 0.5) child.deity = b.deity;
  return child;
}

// ---------------- changeSummary ----------------

const itemFormatOf = (item: Item): string => `${item.isLocked ? 1 : 0}/${item.id}/${item.enhancement}/${item.superRare}`;

/**
 * Builds `changeSummary` in the 9.1.3 order and dry-runs every entry through the Commit API handler on a private copy,
 * so each entry is a call the API accepts as written (the equip Item Format names the exact owned variant, lock included).
 */
export function planGaChangeSummary(base: GameState, partyIndex: number, best: GameState, context: GaSearchDependencies['commitContext']): GaChangeEntry[] {
  const party = base.parties[partyIndex];
  const target = best.parties[partyIndex];
  const entries: GaChangeEntry[] = [];
  let scratch = base;
  const commitContext: ApiV1CommitContext = { ...context, settings: {}, equipmentHistory: {}, uploadedFiles: {}, canonicalFiles: {}, createDeliveryId: () => 'ga-dry-run' };
  const run = (endpoint: string, parameters: Record<string, unknown>) => {
    scratch = applyApiV1Commit(endpoint, scratch, parameters, { ...commitContext, equipmentHistory: {} }).state;
    entries.push({ endpoint, parameters });
  };
  const after = (id: number) => target.characters.find((entry) => entry.id === id)!;
  const sameSlot = (a: Item | null | undefined, b: Item | null | undefined) => Boolean(a && b && getVariantKey(a) === getVariantKey(b));
  // 1. Free every slot whose item changes (all characters first, so items can move between them).
  for (const character of party.characters) {
    const slots = character.equipment.map((item, slot) => (item && !sameSlot(item, after(character.id).equipment[slot]) ? slot : -1)).filter((slot) => slot >= 0);
    if (slots.length > 0) run(`commit/build/character/${character.id}/removeEquipment`, { targetEquipment: slots });
  }
  // 2. Deity and order.
  const party2: Record<string, unknown> = {};
  if (getDeityId(target.deity.name) !== getDeityId(party.deity.name)) party2.deityId = getDeityId(target.deity.name);
  if (target.characters.map((entry) => entry.id).join(',') !== party.characters.map((entry) => entry.id).join(',')) party2.order = target.characters.map((entry) => entry.id);
  if (Object.keys(party2).length > 0) run(`commit/build/party/${party.id}`, party2);
  // 3. Build changes.
  for (const character of party.characters) {
    const before = describeCharacterBuildCurrent(character);
    const next = describeCharacterBuildCurrent(after(character.id));
    const changes = Object.fromEntries((['racesAndGender', 'mainClassId', 'subClassId', 'lineage', 'predisposition'] as const)
      .filter((field) => before[field] !== next[field]).map((field) => [field, next[field]]));
    if (Object.keys(changes).length > 0) run(`commit/build/character/${character.id}/changeBuild`, { ...changes, simulation: false });
  }
  // 4. Equip each new item into its slot.
  for (const character of party.characters) {
    after(character.id).equipment.forEach((item, slot) => {
      if (!item || sameSlot(character.equipment[slot], item)) return;
      const variant = Object.values(scratch.global.inventory).find((entry) => entry.status === 'owned' && entry.count > 0 && getVariantKey(entry.item) === getVariantKey(item));
      if (!variant) throw new Error('ga_plan_unavailable');
      run(`commit/build/character/${character.id}/equip`, { targetEquipment: itemFormatOf(variant.item), targetSlot: slot });
    });
  }
  // 5. Remove Jewels that change on items that stayed, then 6. attach every Jewel of the result.
  for (const character of party.characters) {
    const current = scratch.parties[partyIndex].characters.find((entry) => entry.id === character.id)!;
    const slots = current.equipment.map((item, slot) => (item?.jewel && jewelKeyOf(item) !== jewelKeyOf(after(character.id).equipment[slot]) ? slot : -1)).filter((slot) => slot >= 0);
    if (slots.length > 0) run(`commit/build/character/${character.id}/jewelRemove`, { targetEquipment: slots });
  }
  for (const character of party.characters) {
    after(character.id).equipment.forEach((item, slot) => {
      const wanted = jewelKeyOf(item);
      const current = scratch.parties[partyIndex].characters.find((entry) => entry.id === character.id)!.equipment[slot];
      if (wanted && jewelKeyOf(current) !== wanted) run(`commit/build/character/${character.id}/jewelAttach`, { targetEquipment: slot, jewelToSet: wanted });
    });
  }
  return entries;
}

// ---------------- Search ----------------

export interface GaSearchOutcome { data: Record<string, unknown>; stored: StoredGaResult }

/** Runs `gaSearch` for party `{p}` (Spec 9.1.3, 2-3-2). Never changes `state`. */
export async function runGaSearch(state: GameState, partyIndex: number, request: GaSearchRequest, dependencies: GaSearchDependencies): Promise<GaSearchOutcome> {
  const startedAt = dependencies.now();
  const deadline = startedAt + request.parameters.timeBudgetSeconds * 1000;
  const seed = request.parameters.seed ?? dependencies.createSeed();
  const random = createRandom(deriveSeed(seed, 0));
  const quickSeed = deriveSeed(seed, 1); const confirmSeed = deriveSeed(seed, 2); const verifySeed = deriveSeed(seed, 3); const finalSeed = deriveSeed(seed, 4);
  const model = buildModel(state, partyIndex, request);
  const objective = request.objective;
  let evaluations = 0;
  const simulateOnce = async (target: GameState, runs: number, simulationSeed: number): Promise<ExpeditionSimulationResult> => {
    evaluations += 1;
    return await dependencies.simulate(prepareObjectiveState(target, partyIndex, objective), partyIndex, runs, simulationSeed) as ExpeditionSimulationResult;
  };
  // The current build's success rate per (runs, seed), the `minDefeat` baseline.
  const baselines = new Map<string, number>();
  const baselineOf = async (runs: number, simulationSeed: number): Promise<number | null> => {
    if (objective !== 'minDefeat') return null;
    const key = `${runs}:${simulationSeed}`;
    if (!baselines.has(key)) { const result = await simulateOnce(state, runs, simulationSeed); baselines.set(key, (result.Clear + result.Return) / Math.max(1, result.total)); }
    return baselines.get(key)!;
  };
  const evaluate = async (decoded: Decoded, runs: number, simulationSeed: number): Promise<Measured> => {
    const baseline = await baselineOf(runs, simulationSeed);
    return measure(objective, await simulateOnce(decoded.state, runs, simulationSeed), baseline);
  };
  const outOfTime = () => dependencies.now() >= deadline;

  interface Individual { genome: Genome; decoded: Decoded; key: string; changes: number; quick?: number; confirm?: number }
  const quickCache = new Map<string, number>();
  const confirmCache = new Map<string, number>();
  const individual = (genome: Genome): Individual => {
    const decoded = decode(model, genome, random);
    return { genome: decoded.genome, decoded, key: genomeKey(decoded.genome), changes: countChanges(model, decoded) };
  };
  const allowed = (entry: Individual) => request.parameters.maxChanges === null || entry.changes <= request.parameters.maxChanges;
  const scoreQuick = async (entry: Individual) => {
    if (entry.quick !== undefined) return;
    if (!allowed(entry)) { entry.quick = -Infinity; return; }
    const cached = quickCache.get(entry.key);
    entry.quick = cached ?? (await evaluate(entry.decoded, request.parameters.quickRuns, quickSeed)).fitness;
    quickCache.set(entry.key, entry.quick);
  };
  const scoreConfirm = async (entry: Individual) => {
    if (entry.confirm !== undefined || !allowed(entry)) return;
    const cached = confirmCache.get(entry.key);
    entry.confirm = cached ?? (await evaluate(entry.decoded, request.parameters.confirmRuns, confirmSeed)).fitness;
    confirmCache.set(entry.key, entry.confirm);
  };

  const currentIndividual = individual(model.current);
  // The repaired current genome may differ from the live build only when the live build is itself invalid; keep the live one.
  let population: Individual[] = [currentIndividual];
  if (request.parameters.seedWithHeuristics) for (const genome of heuristicGenomes(model)) population.push(individual(genome));
  while (population.length < request.parameters.populationSize) population.push(individual(mutate(model, population[Math.floor(random() * population.length)].genome, random)));
  let best: Individual = currentIndividual;
  await scoreConfirm(currentIndividual);

  for (let generation = 0; generation < request.parameters.generations && !outOfTime(); generation += 1) {
    for (const entry of population) { if (outOfTime()) break; await scoreQuick(entry); }
    population.sort((a, b) => (b.quick ?? -Infinity) - (a.quick ?? -Infinity));
    for (const entry of population.slice(0, request.parameters.confirmTopN)) { if (outOfTime()) break; await scoreConfirm(entry); }
    for (const entry of population) if (entry.confirm !== undefined && entry.confirm > (best.confirm ?? -Infinity)) best = entry;
    if (outOfTime()) break;
    const scored = population.filter((entry) => entry.quick !== undefined);
    const pick = () => {
      let chosen: Individual | null = null;
      for (let round = 0; round < request.parameters.tournamentSize; round += 1) {
        const candidate = scored[Math.floor(random() * scored.length)];
        if (!chosen || (candidate.quick ?? -Infinity) > (chosen.quick ?? -Infinity)) chosen = candidate;
      }
      return chosen!;
    };
    const next: Individual[] = population.slice(0, request.parameters.eliteCount);
    while (next.length < request.parameters.populationSize) {
      let genome = crossover(model, pick().genome, pick().genome, random);
      if (random() < request.parameters.mutationRate) genome = mutate(model, genome, random);
      next.push(individual(genome));
    }
    population = next;
  }

  // Final selection: the best confirmed builds and the current one are re-scored on a fresh seed with twice the confirm
  // runs. The top confirm score is biased upward (it won partly by luck on the confirm seed); this stage removes most of that
  // before the independent verification.
  const confirmed = new Map<string, Individual>();
  for (const entry of [...population, best]) if (entry.confirm !== undefined && entry.key !== currentIndividual.key) confirmed.set(entry.key, entry);
  const finalists = [...confirmed.values()].sort((a, b) => b.confirm! - a.confirm!).slice(0, 3);
  if (finalists.length > 0 && (finalists[0].confirm ?? -Infinity) > (currentIndividual.confirm ?? -Infinity)) {
    const finalRuns = Math.min(1000, request.parameters.confirmRuns * 2);
    const currentFinal = await evaluate(currentIndividual.decoded, finalRuns, finalSeed);
    let bestFinal = currentFinal;
    best = currentIndividual;
    for (const entry of finalists) {
      const measured = await evaluate(entry.decoded, finalRuns, finalSeed);
      if (measured.fitness > bestFinal.fitness) { bestFinal = measured; best = entry; }
    }
    // A finalist replaces the current build only when it is ahead by at least one standard error of the objective's rate.
    if (best !== currentIndividual) {
      const margin = rateGaResult(objective, currentFinal, bestFinal, finalRuns, true);
      if (!(margin.gain > margin.standardError)) best = currentIndividual;
    }
  } else {
    best = currentIndividual;
  }

  // Verification: the current and the best build on one fresh seed (Spec 9.1.3, 2-3-2 `verdict`).
  const changed = best.key !== currentIndividual.key && best.changes > 0;
  let changeSummary: GaChangeEntry[] = [];
  let bestState = state;
  if (changed) {
    try {
      changeSummary = planGaChangeSummary(state, partyIndex, best.decoded.state, dependencies.commitContext);
      bestState = best.decoded.state;
    } catch {
      changeSummary = [];
    }
  }
  const verifyRuns = request.parameters.verifyRuns;
  const verifyBefore = await evaluate({ state, genome: model.current }, verifyRuns, verifySeed);
  const verifyAfter = changeSummary.length > 0 ? await evaluate({ state: bestState, genome: best.genome }, verifyRuns, verifySeed) : verifyBefore;
  const rating = rateGaResult(objective, verifyBefore, verifyAfter, verifyRuns, changeSummary.length > 0);
  const forecast: GaForecast = {
    before: buildSimulationRunData(verifyBefore.result, dependencies.revision, 'ga-verify').overview,
    after: buildSimulationRunData(verifyAfter.result, dependencies.revision, 'ga-verify').overview,
  };
  const usedVariants = changeSummary.filter((entry) => entry.endpoint.endsWith('/equip')).map((entry) => {
    const [, id, enhancement, superRare] = String(entry.parameters.targetEquipment).split('/');
    return `${id}-${enhancement}-${superRare}`;
  });
  const usedJewels = changeSummary.filter((entry) => entry.endpoint.endsWith('/jewelAttach')).map((entry) => String(entry.parameters.jewelToSet));
  const gaResultId = dependencies.createOpaqueId();
  const elapsedSeconds = Math.round((dependencies.now() - startedAt) / 100) / 10;
  const stored: StoredGaResult = {
    gaResultId,
    partyNumber: state.parties[partyIndex].id,
    revision: dependencies.revision,
    verdict: rating.verdict,
    forecast,
    changeSummary,
    fingerprint: gaBuildFingerprint(state, partyIndex, usedVariants, usedJewels),
  };
  return {
    stored,
    data: {
      verdict: rating.verdict,
      forecast,
      changeSummary,
      revision: dependencies.revision,
      evaluations,
      elapsedSeconds,
      gaResultId,
      // SpecRef: 9.1.4.9 | gaSearch | the measured `<rate>` values, gain, and standard error behind `verdict`.
      verification: {
        objective,
        runs: verifyRuns,
        before: verifyBefore.rate,
        after: verifyAfter.rate,
        gain: Number.isFinite(rating.gain) ? Math.round(rating.gain * 100) / 100 : null,
        standardError: Math.round(rating.standardError * 100) / 100,
        seed,
      },
    },
  };
}

// ---------------- applyGaResult ----------------

// SpecRef: 9.1.3 | Commit | 3-3-2 party/{p}/applyGaResult
export const GA_APPLY_WARNING_KEY = 'api.warning.applyGaResult.unconfirmedImprovement';

const EQUIPMENT_ENDPOINT = /^commit\/build\/character\/(\d+)\/(removeEquipment|equip|jewelRemove|jewelAttach)$/;
const CHARACTER_ENDPOINT = /^commit\/build\/character\/(\d+)\//;

/**
 * Applies a stored `gaSearch` result to party `{p}` as one transaction: every `changeSummary` entry runs through the
 * Commit API handler in order, the changed characters get the requested Auto Equipment mode, and each character whose
 * equipment state changed gets exactly one Undo step (its state before this operation).
 */
export function applyGaResult(state: GameState, partyNumber: number, parameters: Record<string, unknown>, context: ApiV1CommitContext): { state: GameState; data: Record<string, unknown> } {
  const allowed = new Set(['gaResultId', 'autoEquipmentMode', 'simulation', 'confirmation']);
  const unknown = Object.keys(parameters).find((key) => !allowed.has(key));
  if (unknown !== undefined) invalid(`${unknown}.unknown_member`);
  const { gaResultId, simulation, confirmation } = parameters;
  if (typeof gaResultId !== 'string' || gaResultId.length === 0) invalid('gaResultId');
  const mode = parameters.autoEquipmentMode === undefined ? 'SEMI' : parameters.autoEquipmentMode;
  if (mode !== 'SEMI' && mode !== 'OFF') invalid('autoEquipmentMode');
  if (typeof simulation !== 'boolean') invalid('simulation');
  if (confirmation !== undefined && confirmation !== 'yes' && confirmation !== 'no') invalid('confirmation');
  if (simulation && confirmation !== undefined) invalid('confirmation_with_simulation');
  const partyIndex = state.parties.findIndex((party) => party.id === partyNumber);
  if (partyIndex < 0) throw new Error('not_found');

  const stored = context.gaResult?.(partyNumber);
  if (!stored || stored.gaResultId !== gaResultId) throw new Error('illegal_action:ga_result_unavailable');
  if (stored.verdict === 'noChange') throw new Error('illegal_action:ga_result_no_change');
  const usedVariants = stored.changeSummary.filter((entry) => entry.endpoint.endsWith('/equip')).map((entry) => {
    const [, id, enhancement, superRare] = String(entry.parameters.targetEquipment).split('/');
    return `${id}-${enhancement}-${superRare}`;
  });
  const usedJewels = stored.changeSummary.filter((entry) => entry.endpoint.endsWith('/jewelAttach')).map((entry) => String(entry.parameters.jewelToSet));
  if (gaBuildFingerprint(state, partyIndex, usedVariants, usedJewels) !== stored.fingerprint) throw new Error('illegal_action:ga_result_stale');

  const confirmationRequired = stored.verdict === 'worse' || stored.verdict === 'noisy';
  const warnings = confirmationRequired ? [{ key: GA_APPLY_WARNING_KEY, args: {} }] : [];
  const changedIds = [...new Set(stored.changeSummary.map((entry) => Number(entry.endpoint.match(CHARACTER_ENDPOINT)?.[1])).filter((id) => Number.isInteger(id) && id > 0))];
  const equipmentIds = new Set(stored.changeSummary.map((entry) => Number(entry.endpoint.match(EQUIPMENT_ENDPOINT)?.[1])).filter((id) => Number.isInteger(id) && id > 0));

  // Every entry runs against a private history bag: the internal steps record nothing (Spec 9.1.3, 3-3-2 Undo and Redo).
  const run = (source: GameState): GameState => {
    let next = source;
    for (const entry of stored.changeSummary) next = applyApiV1Commit(entry.endpoint, next, entry.parameters, { ...context, equipmentHistory: {} }).state;
    for (const id of equipmentIds) {
      next = gameReducer(next, { type: 'UPDATE_CHARACTER', partyIndex, characterId: id, updates: { autoEquipmentMode: mode === 'SEMI' ? 1 : 0 } });
    }
    return next;
  };
  const statusOf = (source: GameState) => changedIds.map((characterId) => {
    const party = source.parties[partyIndex];
    const index = party.characters.findIndex((entry) => entry.id === characterId);
    return { characterId, calculatedStatus: buildCalculatedStatus(party.characters[index], computePartyStats(party).characterStats[index], party.level) };
  });
  const report = (applied: GaChangeEntry[], source: GameState) => ({
    applied, confirmationRequired, warnings: confirmationRequired ? warnings : [], verdict: stored.verdict, forecast: stored.forecast, calculatedStatus: statusOf(source),
  });

  if (simulation) return { state, data: report(stored.changeSummary, run(state)) };
  if (confirmation === 'no') return { state, data: report([], state) };
  if (confirmationRequired && confirmation !== 'yes') invalid('confirmation_required');
  const next = run(state);
  for (const characterId of changedIds) {
    const before = state.parties[partyIndex].characters.find((entry) => entry.id === characterId)!;
    const after = next.parties[partyIndex].characters.find((entry) => entry.id === characterId)!;
    const snapshot = snapshotCharacterEquipment(before, context.simulatedAt);
    if (sameEquipmentSnapshot(snapshot, snapshotCharacterEquipment(after, context.simulatedAt))) continue;
    context.equipmentHistory[String(characterId)] = recordEquipmentState(context.equipmentHistory[String(characterId)] ?? { undo: [], redo: [] }, snapshot);
  }
  return { state: next, data: report(stored.changeSummary, next) };
}
