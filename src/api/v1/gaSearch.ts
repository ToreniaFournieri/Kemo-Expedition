import { CLASSES } from '../../data/classes';
import { LINEAGES } from '../../data/lineages';
import { PREDISPOSITIONS } from '../../data/predispositions';
import { computeCharacterStats } from '../../game/characterComputation';
import { getDeityId, getDeityNameFromId } from '../../game/deity';
import { canCharacterEquipCategory } from '../../game/equipmentSets';
import { isJewelAllowedForCategory } from '../../game/jewel';
import { gameReducer } from '../../hooks/useGameState';
import { getVariantKey, type Character, type ExpeditionSimulationOptions, type ExpeditionSimulationResult, type GameState, type Item, type JewelKey, type Party } from '../../types';
import { describeCharacterBuildCurrent, planCharacterBuildChange } from './buildChange';
import { recordEquipmentState } from '../../game/equipmentHistory';
import { computePartyStats } from '../../game/partyComputation';
import { buildCalculatedStatus } from './calculatedStatus';
import { applyApiV1Commit, type ApiV1CommitContext } from './commitOperations';
import { sameEquipmentSnapshot, snapshotCharacterEquipment } from './equipmentHistoryFacts';
import { validPartyDeityIds, validRaceAndGenderOptions } from './readModels';
import { forecastScope, measureObjective, objectiveSimulationOptions, prepareObjectiveState, routeRoomCount, type ForecastScope, type ObjectiveMeasure } from './objectiveMeasure';
import { buildSimulationRunData } from './simulationView';
import { hashText } from './battleLogs';
import { baseSlotsAt, conquestGoal, expectedRunsToGoal, experienceToLevel, parseLevelProbe, probedLevels, requiredRateForBudget, type LevelProbeGoal, type LevelProbeRequest } from './levelProbe';

// SpecRef: 9.1.3 | Read | 2-3-2 party/{p}/gaSearch
// SpecRef: 9.1.4.9 | Operation-specific completion rules | gaSearch
// A genetic search over the party build. Every candidate is scored by the game's own private forecast
// (`simulateExpeditionRuns`) on fixed seeds, so two builds are always compared on the same random numbers.

// SpecRef: 9.1.3 | 2-0 Objectives | the objectives every build search shares.
export const GA_OBJECTIVES = ['success', 'minDefeat', 'bossDamage', 'experience', 'progress'] as const;
export type GaObjective = typeof GA_OBJECTIVES[number];
export const GA_EFFORTS = ['low', 'medium', 'high'] as const;
// SpecRef: 9.1.3 | 2-3-2 gaSearch `gaParameters.effort` | `max` is `gaSearch` only; `directedBuild` keeps `GA_EFFORTS`.
export const GA_SEARCH_EFFORTS = [...GA_EFFORTS, 'max'] as const;
type GaEffort = typeof GA_SEARCH_EFFORTS[number];
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
  // A wall search: bound by `timeBudgetSeconds`, never by `generations`; 300 quick runs keep each score's noise low.
  max: { populationSize: 64, generations: 200, quickRuns: 300, confirmRuns: 600, timeBudgetSeconds: 590 },
};

/** `[minimum, maximum]` of each integer parameter (Spec 9.1.3, 2-3-2). */
const INTEGER_RANGES = {
  populationSize: [8, 64], generations: [1, 200], quickRuns: [10, 1000], confirmRuns: [50, 1000], timeBudgetSeconds: [5, 600],
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
  /** The verification seed; `null` derives it from `seed`. */
  verifySeed: number | null;
  maxChanges: number | null;
  seedWithHeuristics: boolean;
}

export interface GaTarget { characterId: number; components: Record<Component, boolean> }

// SpecRef: 9.1.3 | 2-3-2 gaSearch `considerItemsScope` | whose worn items the search may consider besides the Inventory.
export const GA_ITEMS_SCOPES = ['normal', 'withinTargets', 'global'] as const;
export type GaItemsScope = typeof GA_ITEMS_SCOPES[number];

// SpecRef: 9.1.3 | 2-3-2 gaSearch `considerDeityChange` | which deities the search may give the party.
export const GA_DEITY_SCOPES = ['none', 'unoccupiedDeities', 'allDeities'] as const;
export type GaDeityScope = typeof GA_DEITY_SCOPES[number];

export interface GaSearchRequest {
  targets: GaTarget[];
  considerOrderChange: boolean;
  considerDeityChange: GaDeityScope;
  considerItemsScope: GaItemsScope;
  objective: GaObjective;
  objectiveGuard: ObjectiveGuard | null;
  parameters: GaParameters;
  /** The level probe; absent (as in `directedBuild`'s polish) means `off`. */
  levelProbe?: LevelProbeRequest;
  /** `seedBuilds`; absent (as in `directedBuild`'s polish) means none, and the Return has no `seeds`. */
  seedBuilds?: SeedBuild[];
}

// SpecRef: 9.1.3 | 2-3-2 gaSearch `seedBuilds` | a build template: build values only, no equipment.
export interface SeedBuild {
  label: string | null;
  /** Each entry keeps its request index for the `characters[i]` field paths of `seeds[].ignored`. */
  characters: { index: number; characterId: number; values: Partial<Record<BuildField, string>> }[];
  order: number[] | null;
  deityId: string | null;
}
export const SEED_IGNORE_REASONS = ['notChangeable', 'invalidValue', 'notAllowed', 'populationFull', 'duplicate'] as const;
type SeedIgnoreReason = typeof SEED_IGNORE_REASONS[number];

/** One Commit API call of `changeSummary`. */
export interface GaChangeEntry { endpoint: string; parameters: Record<string, unknown> }

export interface GaForecast { before: string; after: string }

export interface GaSearchDependencies {
  /** A private forecast on a fixed seed; `options.bossRoomOnly` fights the boss battle alone (`bossDamage`). */
  simulate: (state: GameState, partyIndex: number, count: number, seed: number, options?: ExpeditionSimulationOptions) => Promise<unknown>;
  /** Wall clock (ms) for the time budget and `elapsedSeconds`. */
  now: () => number;
  createSeed: () => number;
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
  const allowed = new Set(['targets', 'considerOrderChange', 'considerDeityChange', 'considerItemsScope', 'objective', 'objectiveGuard', 'levelProbe', 'seedBuilds', 'gaParameters']);
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
  const considerItemsScope = raw.considerItemsScope === undefined ? 'normal' : raw.considerItemsScope;
  if (typeof considerItemsScope !== 'string' || !(GA_ITEMS_SCOPES as readonly string[]).includes(considerItemsScope)) invalid('considerItemsScope');
  const considerDeityChange = raw.considerDeityChange === undefined ? 'none' : raw.considerDeityChange;
  if (typeof considerDeityChange !== 'string' || !(GA_DEITY_SCOPES as readonly string[]).includes(considerDeityChange)) invalid('considerDeityChange');
  const objective = raw.objective === undefined ? 'success' : raw.objective;
  if (typeof objective !== 'string' || !(GA_OBJECTIVES as readonly string[]).includes(objective)) invalid('objective');
  const source = raw.gaParameters === undefined ? {} : raw.gaParameters;
  if (!isRecord(source)) invalid('gaParameters');
  const knownParameters = new Set(['effort', 'mutationRate', 'seed', 'verifySeed', 'seedWithHeuristics', ...Object.keys(INTEGER_RANGES)]);
  const unknownParameter = Object.keys(source).find((key) => !knownParameters.has(key));
  if (unknownParameter !== undefined) invalid(`gaParameters.${unknownParameter}.unknown_member`);
  const effort = source.effort === undefined ? 'low' : source.effort;
  if (typeof effort !== 'string' || !(GA_SEARCH_EFFORTS as readonly string[]).includes(effort)) invalid('gaParameters.effort');
  const preset = GA_EFFORT_PRESETS[effort as GaEffort];
  const populationSize = readInteger(source, 'populationSize', preset.populationSize)!;
  const eliteCount = readInteger(source, 'eliteCount', 3)!;
  if (eliteCount > Math.floor(populationSize / 4)) invalid('gaParameters.eliteCount');
  const mutationRate = source.mutationRate === undefined ? 0.35 : source.mutationRate;
  if (typeof mutationRate !== 'number' || !Number.isFinite(mutationRate) || mutationRate < 0 || mutationRate > 1) invalid('gaParameters.mutationRate');
  const seed = source.seed === undefined ? null : source.seed;
  if (seed !== null && (typeof seed !== 'number' || !Number.isSafeInteger(seed))) invalid('gaParameters.seed');
  const verifySeed = source.verifySeed === undefined ? null : source.verifySeed;
  if (verifySeed !== null && (typeof verifySeed !== 'number' || !Number.isSafeInteger(verifySeed))) invalid('gaParameters.verifySeed');
  return {
    targets,
    considerOrderChange: readBoolean(raw, 'considerOrderChange', 'considerOrderChange', false),
    considerDeityChange: considerDeityChange as GaDeityScope,
    considerItemsScope: considerItemsScope as GaItemsScope,
    objective: objective as GaObjective,
    objectiveGuard: parseObjectiveGuard(raw.objectiveGuard, objective as GaObjective),
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
      verifySeed: verifySeed as number | null,
      maxChanges: readInteger(source, 'maxChanges', null),
      seedWithHeuristics: readBoolean(source, 'seedWithHeuristics', 'gaParameters.seedWithHeuristics', true),
    },
    levelProbe: parseLevelProbe(raw.levelProbe),
    ...(raw.seedBuilds === undefined ? {} : { seedBuilds: parseSeedBuilds(party, raw.seedBuilds) }),
  };
}

const SEED_MEMBERS = new Set(['label', 'characters', 'order', 'deityId']);
const SEED_CHARACTER_FIELDS = Object.values(BUILD_FIELDS) as BuildField[];

// SpecRef: 9.1.4.9 | GA search Validation | `seedBuilds`: only the shape is validated here. A well-formed value the game
// rules do not allow is not an error: the search ignores it and reports it in `seeds`.
function parseSeedBuilds(party: Party, raw: unknown): SeedBuild[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 16) invalid('seedBuilds');
  const partyIds = party.characters.map((character) => character.id);
  return raw.map((entry, index): SeedBuild => {
    const at = `seedBuilds[${index}]`;
    if (!isRecord(entry)) invalid(at);
    const extra = Object.keys(entry).find((key) => !SEED_MEMBERS.has(key));
    if (extra !== undefined) invalid(`${at}.${extra}.unknown_member`);
    if (entry.label !== undefined && (typeof entry.label !== 'string' || entry.label.length > 64)) invalid(`${at}.label`);
    if (entry.characters !== undefined && !Array.isArray(entry.characters)) invalid(`${at}.characters`);
    const seen = new Set<number>();
    const characters = ((entry.characters ?? []) as unknown[]).map((member, memberIndex) => {
      const path = `${at}.characters[${memberIndex}]`;
      if (!isRecord(member)) invalid(path);
      const extraField = Object.keys(member).find((key) => key !== 'characterId' && !(SEED_CHARACTER_FIELDS as string[]).includes(key));
      if (extraField !== undefined) invalid(`${path}.${extraField}.unknown_member`);
      const characterId = member.characterId;
      if (typeof characterId !== 'number' || !Number.isSafeInteger(characterId) || !partyIds.includes(characterId) || seen.has(characterId)) invalid(`${path}.characterId`);
      seen.add(characterId);
      const values: Partial<Record<BuildField, string>> = {};
      for (const field of SEED_CHARACTER_FIELDS) {
        if (member[field] === undefined) continue;
        if (typeof member[field] !== 'string') invalid(`${path}.${field}`);
        values[field] = member[field] as string;
      }
      return { index: memberIndex, characterId, values };
    });
    const order = entry.order;
    if (order !== undefined && (!Array.isArray(order) || order.length !== partyIds.length || new Set(order).size !== order.length
      || !order.every((id) => partyIds.includes(id as number)))) invalid(`${at}.order`);
    if (entry.deityId !== undefined && typeof entry.deityId !== 'string') invalid(`${at}.deityId`);
    return { label: (entry.label as string | undefined) ?? null, characters, order: (order as number[] | undefined) ?? null, deityId: (entry.deityId as string | undefined) ?? null };
  });
}

// SpecRef: 9.1.3 | 3-3-2 applyBuildChanges Validation | build-relevant state
/**
 * The party facts a result depends on: order, deity, and every member's build and equipment, plus the owned count of
 * each item variant and Jewel the result equips or attaches. Other inventory changes (new drops) do not change it.
 */
export function gaBuildFingerprint(state: GameState, partyIndex: number, usedVariants: readonly string[], usedJewels: readonly string[], outsideCharacterIds: readonly number[] = [], takenDeity: string | null = null): string {
  const party = state.parties[partyIndex];
  const holder = takenDeity === null ? -1 : deityHolderIndex(state, partyIndex, takenDeity);
  const signature = (item: Item | null) => item ? `${getVariantKey(item)}/${item.jewel ? `${item.jewel.key}:${item.jewel.rank}` : ''}` : null;
  const owned = (key: string) => { const entry = state.global.inventory[key]; return entry && entry.status === 'owned' ? entry.count : 0; };
  return JSON.stringify({
    order: party.characters.map((character) => character.id),
    deity: getDeityId(party.deity.name),
    members: party.characters.map((character) => ({
      build: describeCharacterBuildCurrent(character),
      equipment: character.equipment.map(signature),
    })),
    // `considerItemsScope: global` takes items from characters outside the party; their equipment is build-relevant too.
    outside: [...new Set(outsideCharacterIds)].sort((a, b) => a - b).map((id) => [id, state.parties.flatMap((entry) => entry.characters).find((entry) => entry.id === id)?.equipment.map(signature) ?? null]),
    items: [...new Set(usedVariants)].sort().map((key) => [key, owned(key)]),
    jewels: [...new Set(usedJewels)].sort().map((key) => [key, state.global.jewels[key] ?? 0]),
    // `considerDeityChange: allDeities` frees the deity it takes from the party holding it; that holder is build-relevant too.
    deityHolder: holder >= 0 ? state.parties[holder].id : null,
  });
}

/** Index of the other party that holds deity `id`, or -1 (no deity is never held). */
export function deityHolderIndex(state: GameState, partyIndex: number, id: string): number {
  return id === 'none' ? -1 : state.parties.findIndex((party, index) => index !== partyIndex && getDeityId(party.deity.name) === id);
}

/** The build-relevant facts behind a `changeSummary`: the Items and Jewels it places and the characters it touches. */
function fingerprintOfSummary(state: GameState, partyIndex: number, changeSummary: readonly GaChangeEntry[]): string {
  const deityEntry = changeSummary.find((entry) => entry.endpoint === `commit/build/party/${state.parties[partyIndex].id}` && entry.parameters.deityId !== undefined);
  const usedVariants = changeSummary.filter((entry) => entry.endpoint.endsWith('/equip')).map((entry) => {
    const [, id, enhancement, superRare] = String(entry.parameters.targetEquipment).split('/');
    return `${id}-${enhancement}-${superRare}`;
  });
  const usedJewels = changeSummary.filter((entry) => entry.endpoint.endsWith('/jewelAttach')).map((entry) => String(entry.parameters.jewelToSet));
  const inParty = new Set(state.parties[partyIndex].characters.map((character) => character.id));
  const outside = changeSummary.map((entry) => Number(entry.endpoint.match(CHARACTER_ENDPOINT)?.[1])).filter((id) => Number.isInteger(id) && id > 0 && !inParty.has(id));
  return gaBuildFingerprint(state, partyIndex, usedVariants, usedJewels, outside, deityEntry ? String(deityEntry.parameters.deityId) : null);
}

// SpecRef: 9.1.4.9 | `basis` | an opaque digest of the build-relevant state a `changeSummary` depends on. It is computed from
// the entries and the save alone, so `applyBuildChanges` recomputes it without any stored result.
export function buildBasis(state: GameState, partyIndex: number, changeSummary: readonly GaChangeEntry[]): string {
  return hashText(fingerprintOfSummary(state, partyIndex, changeSummary));
}

// ---------------- Genome ----------------

interface SlotGene { k: string; j: string | null }
interface Genome {
  order: number[];
  deity: string;
  builds: Record<number, Partial<Record<BuildField, string>>>;
  equipment: Record<number, (SlotGene | null)[]>;
}

/** A worn, unlocked item of a character outside `targets` that `considerItemsScope: global` may take. */
interface Donor { characterId: number; partyIndex: number; slot: number; key: string }

interface SearchModel {
  base: GameState;
  partyIndex: number;
  request: GaSearchRequest;
  /** Item variants the search may place, by variant key: the item and how many shared copies exist (Inventory + shared worn + donors). */
  pool: Map<string, { item: Item; total: number }>;
  /** Shared copies that need no donor: the Inventory plus the items worn by equipment targets when the scope pools them. */
  sharedBase: Record<string, number>;
  /** Copies only one character may use: its own worn items under `normal`, and the fixed items of an equipment-locked target. */
  own: Record<number, Record<string, number>>;
  /** Each jar's copies (variant keys), the highest enhancement first. */
  jars: Map<string, string[]>;
  /** Jars each target may place (a copy shared or its own). */
  keysFor: Record<number, string[]>;
  /** Locked worn items of targets: they keep their slot and Jewel and are never taken (Spec 9.1.3, 2-3-2 `equipment`). */
  frozen: Record<number, Map<number, Item>>;
  /** Items `global` may take from other characters, in the order they are taken (the party first, then the other parties). */
  donors: Donor[];
  /** Jewels the search may attach: free plus those on targets whose Jewels are changeable. */
  jewelTotals: Record<string, number>;
  buildOptions: Record<number, Partial<Record<BuildField, string[]>>>;
  deityOptions: string[];
  current: Genome;
}

const jewelKeyOf = (item: Item | null | undefined): string | null => item?.jewel ? `${item.jewel.key}:${item.jewel.rank}` : null;
const targetOf = (model: SearchModel, characterId: number) => model.request.targets.find((target) => target.characterId === characterId);

// SpecRef: 9.1.4.9 | GA search Candidates | an equipment gene names a jar, not a copy: all copies of an item without a
// Super Rare title share one jar, and each Super Rare title of an item is a jar of its own (its bonuses differ). A slot
// takes the jar's highest-enhancement copy still available, so a lower copy is placed only when every higher one is used.
export const jarKeyOf = (item: { id: number; superRare: number }): string => (item.superRare > 0 ? `${item.id}-sr${item.superRare}` : String(item.id));
/** A target's slot gene: a jar for an equipment target, the worn copy itself for a Jewels-only target (its items stay). */
const geneKeyOf = (target: GaTarget, item: Item): string => (target.components.equipment ? jarKeyOf(item) : getVariantKey(item));

function buildModel(state: GameState, partyIndex: number, request: GaSearchRequest): SearchModel {
  const party = state.parties[partyIndex];
  const pool = new Map<string, { item: Item; total: number }>();
  const add = (item: Item, count: number) => {
    const key = getVariantKey(item);
    const entry = pool.get(key);
    if (entry) entry.total += count;
    else pool.set(key, { item: { ...item, jewel: null, isLocked: false }, total: count });
  };
  const sharedBase: Record<string, number> = {};
  const own: SearchModel['own'] = {};
  const frozen: SearchModel['frozen'] = {};
  const donors: Donor[] = [];
  const equipmentTargets = request.targets.filter((target) => target.components.equipment);
  if (equipmentTargets.length > 0) {
    for (const entry of Object.values(state.global.inventory)) {
      if (entry.status !== 'owned' || entry.count <= 0) continue;
      add(entry.item, entry.count);
      sharedBase[getVariantKey(entry.item)] = (sharedBase[getVariantKey(entry.item)] ?? 0) + entry.count;
    }
    // SpecRef: 9.1.3 | 2-3-2 gaSearch `considerItemsScope` | `global` also takes unlocked items worn outside `targets`.
    if (request.considerItemsScope === 'global') {
      const targetIds = new Set(request.targets.map((target) => target.characterId));
      const order = [partyIndex, ...state.parties.map((_, index) => index).filter((index) => index !== partyIndex)];
      for (const index of order) {
        for (const character of state.parties[index].characters) {
          if (targetIds.has(character.id)) continue;
          character.equipment.forEach((item, slot) => {
            if (!item || item.isLocked) return;
            add(item, 1);
            donors.push({ characterId: character.id, partyIndex: index, slot, key: getVariantKey(item) });
          });
        }
      }
    }
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
      const ownCounts: Record<string, number> = {};
      const fixed = new Map<number, Item>();
      character.equipment.forEach((item, slot) => {
        if (!item) return;
        // Locked equipment is never changed or taken: it stays in its slot with its Jewel.
        if (item.isLocked) { fixed.set(slot, item); return; }
        const key = getVariantKey(item);
        if (target.components.equipment && request.considerItemsScope !== 'normal') { add(item, 1); sharedBase[key] = (sharedBase[key] ?? 0) + 1; }
        else { add(item, 0); ownCounts[key] = (ownCounts[key] ?? 0) + 1; }
        const jewel = jewelKeyOf(item);
        if (target.components.jewels && jewel) jewelTotals[jewel] = (jewelTotals[jewel] ?? 0) + 1;
      });
      own[character.id] = ownCounts;
      frozen[character.id] = fixed;
      current.equipment[character.id] = character.equipment.map((item) => item ? { k: geneKeyOf(target, item), j: jewelKeyOf(item) } : null);
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
  const jars: SearchModel['jars'] = new Map();
  for (const [key, entry] of pool) jars.set(jarKeyOf(entry.item), [...(jars.get(jarKeyOf(entry.item)) ?? []), key]);
  for (const copies of jars.values()) copies.sort((a, b) => pool.get(b)!.item.enhancement - pool.get(a)!.item.enhancement);
  const keysFor: SearchModel['keysFor'] = {};
  for (const target of request.targets) {
    const usable = (key: string) => pool.get(key)!.total > 0 || (own[target.characterId]?.[key] ?? 0) > 0;
    keysFor[target.characterId] = [...jars].filter(([, copies]) => copies.some(usable)).map(([jar]) => jar);
  }
  return {
    base: state, partyIndex, request, pool, sharedBase, own, jars, keysFor, frozen, donors, jewelTotals, buildOptions,
    deityOptions: deityOptionsFor(state, party, request.considerDeityChange), current,
  };
}

/**
 * `considerDeityChange` choices: `unoccupiedDeities` is `read/build/party/{p}` `validOptions.deityId`; `allDeities` adds
 * every unlocked deity another party holds (that party is left with no deity).
 */
export function deityOptionsFor(state: GameState, party: Party, scope: GaDeityScope): string[] {
  const current = getDeityId(party.deity.name);
  if (scope === 'none') return [current];
  if (scope === 'unoccupiedDeities') return validPartyDeityIds(state, party);
  return [...new Set(['none', current, ...state.global.unlockedDeities.map(getDeityId)])];
}

const cloneGenome = (genome: Genome): Genome => ({
  order: [...genome.order],
  deity: genome.deity,
  builds: Object.fromEntries(Object.entries(genome.builds).map(([id, genes]) => [id, { ...genes }])),
  equipment: Object.fromEntries(Object.entries(genome.equipment).map(([id, slots]) => [id, slots.map((slot) => slot ? { ...slot } : null)])),
});

/** Tier of a jar's item ID (the thousands digit block); higher tiers are drawn more often when a slot is refilled. */
const tierWeight = (key: string): number => Math.max(1, Math.floor(Number(key.split('-')[0]) / 1000) ** 2);

/** xorshift32: a small deterministic stream for the search itself (selection, crossover, mutation, repair). */
export function createRandom(seed: number): () => number {
  let value = (seed >>> 0) || 0x9e3779b9;
  return () => {
    value ^= value << 13; value >>>= 0;
    value ^= value >>> 17;
    value ^= value << 5; value >>>= 0;
    return value / 4294967296;
  };
}

/** Derives the independent seeds of the quick, confirm, and verification runs from the request seed. */
export const deriveSeed = (seed: number, stream: number): number => {
  let value = (seed ^ Math.imul(stream + 1, 0x9e3779b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
};

interface Decoded { state: GameState; genome: Genome }

/**
 * Applies a genome to a private copy of the state with repair: an invalid build change keeps the current value, and a
 * slot whose jar has no copy left or is not equippable is refilled from the remaining pool. Slots take their jar's
 * highest-enhancement copy left in party order, so the current build's own genes upgrade a worn copy when a higher
 * copy of the same item is free. An empty slot of an equipment
 * target is filled too: a filled slot only adds power, so no candidate (the current build's included) keeps a free slot
 * while a usable item is left. Party HP is derived from the characters, so the party gets new character arrays (its
 * stats cache is keyed by array identity).
 */
function decode(model: SearchModel, input: Genome, random: () => number): Decoded {
  const genome = cloneGenome(input);
  let state = model.base;
  const partyIndex = model.partyIndex;
  if (genome.deity !== model.current.deity) {
    const deityName = getDeityNameFromId(genome.deity);
    if (deityName) {
      // A deity another party holds (`allDeities`) is freed first, as `changeSummary` does.
      const holder = deityHolderIndex(state, partyIndex, genome.deity);
      if (holder >= 0) state = gameReducer(state, { type: 'UPDATE_PARTY_DEITY', partyIndex: holder, deityName: 'None' });
      state = gameReducer(state, { type: 'UPDATE_PARTY_DEITY', partyIndex, deityName });
    } else genome.deity = model.current.deity;
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
  const supply = createSupply(model);
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
    const fixed = model.frozen[character.id];
    for (let slot = 0; slot < maxSlots; slot += 1) {
      const locked = fixed?.get(slot);
      if (locked) { equipment[slot] = locked; repaired[slot] = { k: geneKeyOf(target, locked), j: jewelKeyOf(locked) }; continue; }
      const gene = genes[slot];
      // An empty slot of an equipment target is a hole like an unusable gene (a Jewels-only target keeps its items).
      if (!gene) { if (target.components.equipment) holes.push([character, slot]); continue; }
      const sample = model.pool.get(target.components.equipment ? model.jars.get(gene.k)?.[0] ?? '' : gene.k);
      const key = !sample || !canCharacterEquipCategory(character, sample.item.category) ? null
        : target.components.equipment ? supply.takeBest(character.id, gene.k) : supply.take(character.id, gene.k) ? gene.k : null;
      if (key === null) { holes.push([character, slot]); continue; }
      const item: Item = { ...model.pool.get(key)!.item, jewel: null };
      let jewel: string | null = null;
      if (target.components.jewels) {
        if (gene.j && (jewelsLeft[gene.j] ?? 0) > 0 && isJewelAllowedForCategory(item.category, gene.j.split(':')[0] as JewelKey)) { jewel = gene.j; jewelsLeft[gene.j] -= 1; }
      } else {
        // Jewels are fixed: only the item that stays in its slot keeps its Jewel.
        const before = original[slot];
        if (before && getVariantKey(before) === key) jewel = jewelKeyOf(before);
      }
      if (jewel) { const [key, rank] = jewel.split(':'); item.jewel = { key: key as JewelKey, rank: Number(rank) }; }
      equipment[slot] = item;
      repaired[slot] = { k: gene.k, j: jewel };
    }
    character.equipment = equipment;
    genome.equipment[character.id] = repaired;
  }
  // A hole takes a usable copy at random, weighted toward higher tiers. A copy that needs no donor (`global`) is
  // preferred, so filling a slot strips another character only when nothing else is left.
  for (const [character, slot] of holes) {
    const usable = (model.keysFor[character.id] ?? []).filter((jar) => { const key = supply.best(character.id, jar); return key !== null && canCharacterEquipCategory(character, model.pool.get(key)!.item.category); });
    const withoutDonor = usable.filter((jar) => !needsDonor(model, supply, character.id, supply.best(character.id, jar)!));
    const jar = pickByTier(withoutDonor.length > 0 ? withoutDonor : usable, random);
    if (jar === null) continue;
    const key = supply.takeBest(character.id, jar)!;
    character.equipment[slot] = { ...model.pool.get(key)!.item, jewel: null };
    genome.equipment[character.id][slot] = { k: jar, j: null };
  }
  const parties = [...state.parties];
  parties[partyIndex] = { ...party, characters };
  return { state: { ...state, parties: removeDonorItems(model, parties, partyIndex, characters, supply) }, genome };
}

/** A key drawn at random, weighted by `tierWeight`; null when there is none. */
function pickByTier(keys: readonly string[], random: () => number): string | null {
  if (keys.length === 0) return null;
  let roll = random() * keys.reduce((sum, key) => sum + tierWeight(key), 0);
  for (const key of keys) { roll -= tierWeight(key); if (roll < 0) return key; }
  return keys[keys.length - 1];
}

/** Whether the next copy of `key` would come from a donor (`global`): the character's own and the pooled copies are used up. */
const needsDonor = (model: SearchModel, supply: Supply, characterId: number, key: string): boolean =>
  (supply.ownLeft[characterId]?.[key] ?? 0) <= 0 && (supply.sharedLeft[key] ?? 0) <= model.pool.get(key)!.total - (model.sharedBase[key] ?? 0);

interface Supply {
  sharedLeft: Record<string, number>; ownLeft: Record<number, Record<string, number>>; take: (characterId: number, key: string) => boolean; available: (characterId: number, key: string) => boolean;
  /** The copy a jar gives next: its highest-enhancement copy still available to the character; null when none is left. */
  best: (characterId: number, jar: string) => string | null;
  /** Takes the `best` copy of a jar and returns its variant key. */
  takeBest: (characterId: number, jar: string) => string | null;
}

/** The copies a decode may hand out: a character's own copies first, then the shared ones (Inventory, pooled worn items, donors). */
function createSupply(model: SearchModel): Supply {
  const sharedLeft: Record<string, number> = Object.fromEntries([...model.pool].map(([key, entry]) => [key, entry.total]));
  const ownLeft: Record<number, Record<string, number>> = Object.fromEntries(Object.entries(model.own).map(([id, counts]) => [id, { ...counts }]));
  const available = (characterId: number, key: string) => (ownLeft[characterId]?.[key] ?? 0) > 0 || (sharedLeft[key] ?? 0) > 0;
  const take = (characterId: number, key: string) => {
    const counts = ownLeft[characterId];
    if (counts && (counts[key] ?? 0) > 0) { counts[key] -= 1; return true; }
    if ((sharedLeft[key] ?? 0) > 0) { sharedLeft[key] -= 1; return true; }
    return false;
  };
  const best = (characterId: number, jar: string) => model.jars.get(jar)?.find((key) => available(characterId, key)) ?? null;
  const takeBest = (characterId: number, jar: string) => { const key = best(characterId, jar); if (key !== null) take(characterId, key); return key; };
  return { sharedLeft, ownLeft, take, available, best, takeBest };
}

/**
 * `considerItemsScope: global`: the shared copies the targets use beyond the Inventory and their own released items are
 * taken from the donors, in donor order. Returns the parties with those slots emptied.
 */
function removeDonorItems(model: SearchModel, parties: GameState['parties'], partyIndex: number, characters: Character[], supply: Supply): GameState['parties'] {
  if (model.donors.length === 0) return parties;
  const deficit: Record<string, number> = {};
  for (const [key, entry] of model.pool) {
    const used = entry.total - (supply.sharedLeft[key] ?? 0);
    const need = used - (model.sharedBase[key] ?? 0);
    if (need > 0) deficit[key] = need;
  }
  const removals = new Map<number, number[]>();
  for (const donor of model.donors) {
    if ((deficit[donor.key] ?? 0) <= 0) continue;
    deficit[donor.key] -= 1;
    removals.set(donor.characterId, [...(removals.get(donor.characterId) ?? []), donor.slot]);
  }
  if (removals.size === 0) return parties;
  const strip = (character: Character): Character => {
    const slots = removals.get(character.id);
    if (!slots) return character;
    const equipment = [...character.equipment];
    for (const slot of slots) equipment[slot] = null;
    return { ...character, equipment };
  };
  const next = [...parties];
  const own = next[partyIndex];
  next[partyIndex] = { ...own, characters: characters.map(strip) };
  next.forEach((entry, index) => {
    if (index === partyIndex || !entry.characters.some((character) => removals.has(character.id))) return;
    next[index] = { ...entry, characters: entry.characters.map(strip) };
  });
  return next;
}

const genomeKey = (genome: Genome): string => JSON.stringify(genome);

/** Number of `changeSummary` entries the genome needs (Spec 9.1.3, 2-3-2 `maxChanges`), counted from the decoded build. */
function countChanges(model: SearchModel, decoded: Decoded): number {
  const before = model.base.parties[model.partyIndex];
  const after = decoded.state.parties[model.partyIndex];
  let count = decoded.genome.deity !== model.current.deity || decoded.genome.order.join(',') !== model.current.order.join(',') ? 1 : 0;
  if (deityHolderIndex(model.base, model.partyIndex, decoded.genome.deity) >= 0) count += 1;
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
  // `global` donors: one `removeEquipment` entry per character that lost items.
  const donorIds = new Set(model.donors.map((donor) => donor.characterId));
  const emptied = (state: GameState, id: number) => state.parties.flatMap((entry) => entry.characters).find((entry) => entry.id === id)!.equipment.filter(Boolean).length;
  for (const id of donorIds) if (emptied(decoded.state, id) < emptied(model.base, id)) count += 1;
  return count;
}

// ---------------- Objective ----------------

export interface Measured {
  rate: number; variance: number; fitness: number; result: ExpeditionSimulationResult;
  /** `success` only: the `progress` measure that breaks ties between builds. */
  progress?: ObjectiveMeasure;
}

/**
 * The objective's `<rate>` (Spec 9.1.3, 2-3-2 `verdict`), its per-run variance, and the search fitness (higher is better).
 * `baselineSuccess` is the current build's success rate on the same seed: `minDefeat` may not trade successes for safety
 * (a build that cannot win draws every battle and never loses). `routeRooms` scales the `success` tie-break.
 */
export function measure(objective: GaObjective, result: ExpeditionSimulationResult, routeRooms: number, baselineSuccess: number | null = null): Measured {
  const runs = Math.max(1, result.total);
  const { rate, variance } = measureObjective(objective, result, routeRooms);
  if (objective === 'minDefeat') {
    const success = (result.Clear + result.Return) / runs;
    const successLoss = baselineSuccess === null ? 0 : Math.max(0, baselineSuccess - success);
    return { rate, variance, fitness: -rate - 5 * successLoss + 0.01 * success, result };
  }
  // A `bossDamage` run is the boss battle alone, so its share is the whole signal; `progress` is its own score.
  if (objective === 'bossDamage' || objective === 'experience' || objective === 'progress') return { rate, variance, fitness: rate, result };
  // SpecRef: 9.1.3 | 2-3-2 `objective` `success` | `progress` (7.1.5) breaks ties while successes are rare, weighted by the
  // failure share: a build that clears more rooms, or deals more of a lost battle's enemy HP, is closer to a success.
  const progress = measureObjective('progress', result, routeRooms);
  return { rate, variance, fitness: successFitness(rate, progress.rate, runs), result, progress };
}

/** The `success` search fitness: `ln(success)` (floored at half a run) plus the failure-weighted `progress` tie-break. */
export const successFitness = (rate: number, progress: number, runs: number): number => Math.log(Math.max(rate, 0.5 / runs)) + 0.1 * progress * (1 - rate);

interface Rating { verdict: GaVerdict; gain: number; standardError: number }

// SpecRef: 9.1.3 | 2-3-2 `verdict` | 10 percentage points (20% for `experience`) and 2 standard errors. `progress` is rated
// like `success`: higher is better, in percentage points.
export function rateGaResult(objective: GaObjective | 'progress', before: { rate: number; variance: number }, after: { rate: number; variance: number }, runs: number, changed: boolean): Rating {
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

// ---------------- Objective guard and cross-check ----------------

// SpecRef: 9.1.3 | 2-0 `objectiveGuard` | a minimum on a second objective, `success`, `bossDamage`, or `progress`.
export const GUARD_OBJECTIVES = ['success', 'bossDamage', 'progress'] as const;
export type GuardObjective = typeof GUARD_OBJECTIVES[number];
export interface ObjectiveGuard { objective: GuardObjective; minimum: number }

/** Validates `objectiveGuard` (Spec 9.1.3, 2-0): one member, another objective than `objective`, a minimum of 0 to 1. */
export function parseObjectiveGuard(raw: unknown, objective: string): ObjectiveGuard | null {
  if (raw === undefined) return null;
  if (!isRecord(raw) || Object.keys(raw).length !== 1) invalid('objectiveGuard');
  const [key] = Object.keys(raw);
  if (!(GUARD_OBJECTIVES as readonly string[]).includes(key)) invalid(`objectiveGuard.${key}.unknown_member`);
  if (key === objective) invalid(`objectiveGuard.${key}.same_as_objective`);
  const minimum = raw[key];
  if (typeof minimum !== 'number' || !Number.isFinite(minimum) || minimum < 0 || minimum > 1) invalid(`objectiveGuard.${key}`);
  return { objective: key as GuardObjective, minimum };
}

/** The `crossCheck` objective (Spec 9.1.3, 2-0): the guard's, otherwise `success` for `bossDamage` and `bossDamage` for the rest. */
export const crossCheckObjective = (objective: string, guard: ObjectiveGuard | null): GuardObjective =>
  guard?.objective ?? (objective === 'bossDamage' ? 'success' : 'bossDamage');

/** A scored candidate: the objective fitness and, with a guard, the guard objective's rate on the same runs. */
export interface GuardedScore { fitness: number; guard?: number }

/**
 * Ranks two scored candidates (Spec 9.1.3, 2-3-2 `objectiveGuard`): positive when `a` ranks above `b`. A candidate that
 * reaches the guard ranks above one that does not; among those that miss it, the higher guard rate ranks first; ties and
 * candidates that both reach it are ranked by the objective fitness.
 */
export function compareGuarded(a: GuardedScore, b: GuardedScore, guard: ObjectiveGuard | null): number {
  if (guard && a.guard !== undefined && b.guard !== undefined) {
    const aReaches = a.guard >= guard.minimum; const bReaches = b.guard >= guard.minimum;
    if (aReaches !== bReaches) return aReaches ? 1 : -1;
    if (!aReaches && a.guard !== b.guard) return a.guard - b.guard;
  }
  return a.fitness - b.fitness;
}

/** The guard or cross-check objective's measure of one build: its own simulation (`bossDamage` fights the boss alone). */
export async function measureSecondObjective(dependencies: GaSearchDependencies, target: GameState, partyIndex: number, objective: GuardObjective, runs: number, seed: number): Promise<ObjectiveMeasure> {
  const prepared = prepareObjectiveState(target, partyIndex, objective);
  const result = await dependencies.simulate(prepared, partyIndex, runs, seed, objectiveSimulationOptions(objective)) as ExpeditionSimulationResult;
  // `progress` is counted in rooms, so it needs the route's room count.
  return measureObjective(objective, result, objective === 'progress' ? routeRoomCount(prepared.parties[partyIndex]) : 0);
}

// ---------------- Request time limit ----------------

// SpecRef: 9.1.3 | 2-3-2 `timeBudgetSeconds` | the whole request, verification included, fits in the budget: the search stops
// early enough for the work left after it. That work is estimated from the measured cost per simulated run, times 1.5 plus
// one second for safety.
export const RESERVE_FACTOR = 1.5;
export const RESERVE_MARGIN_MS = 1000;

/** Measures the wall-clock cost per simulated run of each objective, from the runs it timed. */
export function createRunMeter(now: () => number) {
  const totals = new Map<string, { ms: number; runs: number }>();
  return {
    async time<T>(objective: string, runs: number, work: () => Promise<T>): Promise<T> {
      const started = now();
      const value = await work();
      const entry = totals.get(objective) ?? { ms: 0, runs: 0 };
      totals.set(objective, { ms: entry.ms + Math.max(0, now() - started), runs: entry.runs + runs });
      return value;
    },
    /** Milliseconds per run of `objective`; 0 before any timed run. */
    perRun(objective: string): number { const entry = totals.get(objective); return entry && entry.runs > 0 ? entry.ms / entry.runs : 0; },
  };
}

/** The time the work after the search needs, in ms: `runs` per objective, with the safety factor and margin. */
export function reserveMs(meter: ReturnType<typeof createRunMeter>, runs: Record<string, number>): number {
  return RESERVE_FACTOR * Object.entries(runs).reduce((sum, [objective, count]) => sum + meter.perRun(objective) * count, 0) + RESERVE_MARGIN_MS;
}

// ---------------- Verification summary ----------------

export interface VerificationInput {
  objective: GaObjective;
  guard: ObjectiveGuard | null;
  crossObjective: GuardObjective;
  verifyRuns: number;
  seed: number;
  verifySeed: number;
  routeRooms: number;
  before: Measured;
  after: Measured;
  crossBefore: ObjectiveMeasure;
  crossAfter: ObjectiveMeasure;
  changed: boolean;
  revision: number;
  scope: ForecastScope;
  label: string;
}

const round4 = (value: number): number => Math.round(value * 10000) / 10000;

/**
 * `verdict`, `forecast`, and `verification` from the verification runs of the current and the final build (Spec 9.1.3,
 * 2-3-2): the verdict is judged on the objective (or `progress` when both builds have no success), `progress` is reported
 * for every objective but `bossDamage`, `crossCheck` holds the second objective, and with a guard a result that loses the
 * guard the current build reaches is `worse`.
 */
export function summarizeVerification(input: VerificationInput): { verdict: GaVerdict; forecast: Record<string, unknown>; verification: Record<string, unknown> } {
  const { objective, before, after, verifyRuns, guard } = input;
  // SpecRef: 9.1.3 | 2-3-2 `verdict` `<rate>` | `success`: when both builds have no success in the verification runs, the
  // success rates tie at 0, so the verdict is judged on `progress` (the score the search broke the tie with).
  const scoredBy: GaObjective | 'progress' = objective === 'success' && before.rate === 0 && after.rate === 0 ? 'progress' : objective;
  // `success` keeps its `progress` tie-break beside its rate; the `progress` objective is its own measure.
  const scoreOf = (measured: Measured): ObjectiveMeasure => (scoredBy === 'progress' && objective === 'success' ? measured.progress! : measured);
  const rating = rateGaResult(scoredBy, scoreOf(before), scoreOf(after), verifyRuns, input.changed);
  const reached = guard ? { before: input.crossBefore.rate >= guard.minimum, after: input.crossAfter.rate >= guard.minimum } : null;
  const verdict: GaVerdict = input.changed && reached && reached.before && !reached.after ? 'worse' : rating.verdict;
  const progressOf = (measured: Measured): number => round4((measured.progress ?? measureObjective('progress', measured.result, input.routeRooms)).rate);
  return {
    verdict,
    forecast: {
      before: buildSimulationRunData(before.result, input.revision, input.label).overview,
      after: buildSimulationRunData(after.result, input.revision, input.label).overview,
      scope: input.scope,
    },
    verification: {
      objective,
      scoredBy,
      runs: verifyRuns,
      before: scoreOf(before).rate,
      after: scoreOf(after).rate,
      gain: Number.isFinite(rating.gain) ? Math.round(rating.gain * 100) / 100 : null,
      standardError: Math.round(rating.standardError * 100) / 100,
      seed: input.seed,
      verifySeed: input.verifySeed,
      progress: objective === 'bossDamage' ? null : { before: progressOf(before), after: progressOf(after) },
      crossCheck: {
        objective: input.crossObjective,
        before: round4(input.crossBefore.rate),
        after: round4(input.crossAfter.rate),
        minimum: guard ? guard.minimum : null,
        reached,
      },
    },
  };
}

// ---------------- Heuristic seeds ----------------

const attackScore = (item: Item, stats: ReturnType<typeof computeCharacterStats>): number => {
  const enhancement = 1 + 0.1 * item.enhancement;
  return ((item.meleeAttack ?? 0) * Math.max(1, stats.meleeNoA) + (item.rangedAttack ?? 0) * Math.max(1, stats.rangedNoA) + (item.magicalAttack ?? 0) * Math.max(1, stats.magicalNoA)) * enhancement
    * (1 + (item.elementalOffenseBonus ?? 0)) + ((item.meleeNoABonus ?? 0) + (item.rangedNoABonus ?? 0) + (item.magicalNoABonus ?? 0)) * 40 + (item.penetBonus ?? 0) * 20;
};
const durabilityScore = (item: Item): number => ((item.partyHP ?? 0) + 0.5 * ((item.physicalDefense ?? 0) + (item.magicalDefense ?? 0)) + 10 * (item.vitalityBonus ?? 0)) * (1 + 0.1 * item.enhancement);

/**
 * Greedy builds from the item fields alone (no Jewels, no build change): one attack-focused and one HP/defense-focused
 * loadout, and the current build with only its empty slots filled the same two ways. `decode` fills a free slot at
 * random (tier-weighted); these give the search a greedy fill to compare with.
 */
function heuristicGenomes(model: SearchModel): Genome[] {
  const party = model.base.parties[model.partyIndex];
  const statsById = new Map(party.characters.map((character, index) => [character.id, computeCharacterStats(character, party.level, index + 1)]));
  const attack = (item: Item, character: Character) => attackScore(item, statsById.get(character.id)!);
  const make = (score: (item: Item, character: Character) => number, keepCurrent: boolean) => greedyGenome(model, model.current, score, keepCurrent, party.characters);
  return [make(attack, false), make(durabilityScore, false), make(attack, true), make(durabilityScore, true)].filter((genome): genome is Genome => genome !== null);
}

/**
 * A greedy loadout of the equipment targets from `start`: each free slot takes the jar whose copy scores best. With
 * `keepCurrent`, every slot `start` fills keeps its gene and only the free slots are filled (null when none could be);
 * otherwise every slot is chosen anew. `characters` gives the slot counts and equip checks (a build change can alter them).
 */
function greedyGenome(model: SearchModel, start: Genome, score: (item: Item, character: Character) => number, keepCurrent: boolean, characters: readonly Character[]): Genome | null {
  const party = model.base.parties[model.partyIndex];
  const targets = model.request.targets.filter((target) => target.components.equipment);
  const genome = cloneGenome(start);
  const supply = createSupply(model);
  // A fill keeps every worn item, so their copies are taken before any free slot is filled.
  if (keepCurrent) for (const target of targets) for (const gene of genome.equipment[target.characterId] ?? []) if (gene) supply.takeBest(target.characterId, gene.k);
  let filled = false;
  for (const target of targets) {
    const character = characters.find((entry) => entry.id === target.characterId)!;
    const maxSlots = computeCharacterStats(character, party.level).maxEquipSlots;
    const slots: (SlotGene | null)[] = [];
    for (let slot = 0; slot < maxSlots; slot += 1) {
      const locked = model.frozen[character.id]?.get(slot);
      if (locked) { slots.push({ k: jarKeyOf(locked), j: jewelKeyOf(locked) }); continue; }
      const kept = keepCurrent ? start.equipment[character.id]?.[slot] : null;
      if (kept) { slots.push({ ...kept }); continue; }
      // Each jar is scored by the copy it would give.
      let best: string | null = null; let bestScore = -Infinity;
      for (const jar of model.keysFor[character.id] ?? []) {
        const key = supply.best(character.id, jar);
        const item = key === null ? null : model.pool.get(key)!.item;
        if (!item || !canCharacterEquipCategory(character, item.category)) continue;
        const value = score(item, character);
        if (value > bestScore) { bestScore = value; best = jar; }
      }
      if (best) { supply.takeBest(character.id, best); filled = true; }
      slots.push(best ? { k: best, j: null } : null);
    }
    genome.equipment[character.id] = slots;
  }
  return keepCurrent && !filled ? null : genome;
}

// ---------------- Seed builds ----------------

/** One `seedBuilds` value the seed's genome carries: the request path, and what `inBest` compares. */
type SeedValue = { field: string } & ({ kind: 'build'; characterId: number; buildField: BuildField; value: string } | { kind: 'order'; value: number[] } | { kind: 'deity'; value: string });
interface SeedPlan { genome: Genome; used: SeedValue[]; ignored: { field: string; reason: SeedIgnoreReason }[] }

/** The genes `inBest` and `duplicate` compare: everything a seed can set (equipment is filled afterwards). */
const buildSignature = (genome: Genome): string => JSON.stringify({ order: genome.order, deity: genome.deity, builds: genome.builds });

// SpecRef: 9.1.4.9 | GA search Seeds | a seed starts from the current build and sets each value it may use, checked one by
// one by the `changeBuild` rules in party order; a value that fails keeps the current value and is reported.
function planSeed(model: SearchModel, seed: SeedBuild): SeedPlan {
  const { partyIndex } = model;
  const genome = cloneGenome(model.current);
  const used: SeedValue[] = [];
  const ignored: SeedPlan['ignored'] = [];
  const position = (id: number) => model.base.parties[partyIndex].characters.findIndex((character) => character.id === id);
  let state = model.base;
  for (const member of [...seed.characters].sort((a, b) => position(a.characterId) - position(b.characterId))) {
    const target = targetOf(model, member.characterId);
    for (const component of Object.keys(BUILD_FIELDS) as BuildComponent[]) {
      const field = BUILD_FIELDS[component];
      const value = member.values[field];
      if (value === undefined) continue;
      const path = `characters[${member.index}].${field}`;
      // The rules come first, so a value no character may take (a unique character's lineage) is `notAllowed`.
      let plan: ReturnType<typeof planCharacterBuildChange>;
      try { plan = planCharacterBuildChange(state, member.characterId, { [field]: value }); } catch (error) {
        ignored.push({ field: path, reason: String((error as Error).message).startsWith('invalid_request') ? 'invalidValue' : 'notAllowed' });
        continue;
      }
      if (!target?.components[component]) { ignored.push({ field: path, reason: 'notChangeable' }); continue; }
      if (Object.keys(plan.updates).length > 0) {
        state = gameReducer(state, { type: 'UPDATE_CHARACTER', partyIndex, characterId: member.characterId, updates: plan.updates, validatedMimorianAssignments: true, allowUniqueIdentityChange: true });
      }
      // The gene takes the build's own spelling of the value (a class ID with or without its prefix is one class).
      const gene = String(describeCharacterBuildCurrent(state.parties[partyIndex].characters.find((character) => character.id === member.characterId)!)[field]);
      genome.builds[member.characterId][field] = gene;
      used.push({ field: path, kind: 'build', characterId: member.characterId, buildField: field, value: gene });
    }
  }
  if (seed.order !== null) {
    if (!model.request.considerOrderChange) ignored.push({ field: 'order', reason: 'notChangeable' });
    else { genome.order = [...seed.order]; used.push({ field: 'order', kind: 'order', value: [...seed.order] }); }
  }
  if (seed.deityId !== null) {
    const known = getDeityNameFromId(seed.deityId) !== null;
    if (!known) ignored.push({ field: 'deityId', reason: 'invalidValue' });
    else if (model.request.considerDeityChange === 'none') ignored.push({ field: 'deityId', reason: 'notChangeable' });
    else if (!model.deityOptions.includes(seed.deityId)) ignored.push({ field: 'deityId', reason: 'notAllowed' });
    else { genome.deity = seed.deityId; used.push({ field: 'deityId', kind: 'deity', value: seed.deityId }); }
  }
  return { genome, used, ignored };
}

/** Whether `genome` has every value a seed used (`seeds[].inBest`). */
const hasSeedValues = (genome: Genome, used: readonly SeedValue[]): boolean => used.every((entry) => {
  if (entry.kind === 'build') return genome.builds[entry.characterId]?.[entry.buildField] === entry.value;
  if (entry.kind === 'order') return genome.order.join(',') === entry.value.join(',');
  return genome.deity === entry.value;
});

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
      for (const key of model.keysFor[id] ?? []) for (let weight = tierWeight(key); weight > 0; weight -= 1) weighted.push(key);
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
  const after = (id: number) => best.parties.flatMap((entry) => entry.characters).find((entry) => entry.id === id)!;
  const sameSlot = (a: Item | null | undefined, b: Item | null | undefined) => Boolean(a && b && getVariantKey(a) === getVariantKey(b));
  // 1. Free every slot whose item changes (all characters first, so items can move between them). `considerItemsScope:
  // global` can take items from characters of other parties, so every party is covered.
  for (const character of [...party.characters, ...base.parties.filter((_, index) => index !== partyIndex).flatMap((entry) => entry.characters)]) {
    const slots = character.equipment.map((item, slot) => (item && !sameSlot(item, after(character.id).equipment[slot]) ? slot : -1)).filter((slot) => slot >= 0);
    if (slots.length > 0) run(`commit/build/character/${character.id}/removeEquipment`, { targetEquipment: slots });
  }
  // 2. Deity and order. A deity another party holds (`considerDeityChange: allDeities`) is freed first: that party gets none.
  const party2: Record<string, unknown> = {};
  const deity = getDeityId(target.deity.name);
  if (deity !== getDeityId(party.deity.name)) {
    const holder = deityHolderIndex(scratch, partyIndex, deity);
    if (holder >= 0) run(`commit/build/party/${scratch.parties[holder].id}`, { deityId: 'none' });
    party2.deityId = deity;
  }
  if (target.characters.map((entry) => entry.id).join(',') !== party.characters.map((entry) => entry.id).join(',')) party2.order = target.characters.map((entry) => entry.id);
  if (Object.keys(party2).length > 0) run(`commit/build/party/${party.id}`, party2);
  // 3. Build changes. A new unique selection fixes the character's race, gender, lineage, and predisposition itself, so
  // they are sent only with `none` or an unchanged selection.
  for (const character of party.characters) {
    const before = describeCharacterBuildCurrent(character);
    const next = describeCharacterBuildCurrent(after(character.id));
    const uniqueChanged = before.uniqueSelection !== next.uniqueSelection;
    const identityFixed = uniqueChanged && next.uniqueSelection !== 'none';
    const fields = identityFixed ? (['mainClassId', 'subClassId'] as const) : (['racesAndGender', 'mainClassId', 'subClassId', 'lineage', 'predisposition'] as const);
    const changes: Record<string, unknown> = Object.fromEntries(fields.filter((field) => before[field] !== next[field]).map((field) => [field, next[field]]));
    if (uniqueChanged) changes.uniqueSelection = next.uniqueSelection;
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

export interface GaSearchOutcome {
  data: Record<string, unknown>;
  /** Polish mode only: the best confirmed build (`directedBuild` Step 4 judges it in its own Final selection). */
  best?: GameState;
}

/** `directedBuild` Step 4 (`polishMethod: ga`): search until `deadline`, then return the best confirmed build unverified. */
export interface GaPolishMode { deadline: number }

/** Runs `gaSearch` for party `{p}` (Spec 9.1.3, 2-3-2). Never changes `state`. */
export async function runGaSearch(state: GameState, partyIndex: number, request: GaSearchRequest, dependencies: GaSearchDependencies, polish?: GaPolishMode): Promise<GaSearchOutcome> {
  const startedAt = dependencies.now();
  const deadline = startedAt + request.parameters.timeBudgetSeconds * 1000;
  const seed = request.parameters.seed ?? dependencies.createSeed();
  const random = createRandom(deriveSeed(seed, 0));
  const quickSeed = deriveSeed(seed, 1); const confirmSeed = deriveSeed(seed, 2); const finalSeed = deriveSeed(seed, 4);
  const verifySeed = request.parameters.verifySeed ?? deriveSeed(seed, 3);
  const model = buildModel(state, partyIndex, request);
  const { objective, objectiveGuard: guard } = request;
  const crossObjective = crossCheckObjective(objective, guard);
  // Builds do not change the route (its gates and depth limit), so its room count is the same for every candidate.
  const routeRooms = routeRoomCount(prepareObjectiveState(state, partyIndex, objective).parties[partyIndex]);
  const meter = createRunMeter(dependencies.now);
  let evaluations = 0;
  const simulateOnce = async (target: GameState, runs: number, simulationSeed: number): Promise<ExpeditionSimulationResult> => {
    evaluations += 1;
    return await meter.time(objective, runs, async () => await dependencies.simulate(prepareObjectiveState(target, partyIndex, objective), partyIndex, runs, simulationSeed, objectiveSimulationOptions(objective)) as ExpeditionSimulationResult);
  };
  const second = (target: GameState, runs: number, simulationSeed: number) => meter.time(crossObjective, runs, () => measureSecondObjective(dependencies, target, partyIndex, crossObjective, runs, simulationSeed));
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
    return measure(objective, await simulateOnce(decoded.state, runs, simulationSeed), routeRooms, baseline);
  };

  // The current build's verification runs depend on nothing the search finds, so they run first. Their cost per run sets
  // aside the time the final selection and the result's verification need inside `timeBudgetSeconds`.
  const verifyRuns = request.parameters.verifyRuns;
  const finalRuns = Math.min(1000, request.parameters.confirmRuns * 2);
  // A polish pass has no verification of its own: its caller re-scores the result.
  const verifyBefore = polish ? null : await evaluate({ state, genome: model.current }, verifyRuns, verifySeed);
  const crossBefore = polish ? null : await second(state, verifyRuns, verifySeed);
  const finalSelectionRuns = 5 * finalRuns;
  // SpecRef: 9.1.3 | 2-3-2 `levelProbe` Process 5 | the probe's runs are reserved too: the current level and each probed level
  // with `confirmRuns`, and two fills per level with `quickRuns`. A whole-route objective's cost per run stands in for them.
  const probe = polish || !request.levelProbe || request.levelProbe.mode === 'off' ? null : request.levelProbe;
  const probeCostKey = objective === 'bossDamage' ? crossObjective : objective;
  const probeRuns = probe ? (probe.count + 1) * request.parameters.confirmRuns + probe.count * 2 * request.parameters.quickRuns : 0;
  const reserved: Record<string, number> = { [objective]: verifyRuns + finalSelectionRuns };
  reserved[crossObjective] = (reserved[crossObjective] ?? 0) + verifyRuns + (guard ? finalSelectionRuns : 0);
  reserved[probeCostKey] = (reserved[probeCostKey] ?? 0) + probeRuns;
  const searchDeadline = polish ? polish.deadline : deadline - reserveMs(meter, reserved);
  const outOfTime = () => dependencies.now() >= searchDeadline;

  interface Individual extends Partial<GuardedScore> { genome: Genome; decoded: Decoded; key: string; changes: number; quick?: number; confirm?: number }
  const quickCache = new Map<string, number>();
  const confirmCache = new Map<string, { confirm: number; guard?: number }>();
  const individual = (genome: Genome, stream: () => number = random): Individual => {
    const decoded = decode(model, genome, stream);
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
  // SpecRef: 9.1.3 | 2-3-2 `objectiveGuard` | the guard is measured on the confirmed candidates only, with `confirmRuns`.
  const scoreConfirm = async (entry: Individual) => {
    if (entry.confirm !== undefined || !allowed(entry)) return;
    let cached = confirmCache.get(entry.key);
    if (!cached) {
      const confirm = (await evaluate(entry.decoded, request.parameters.confirmRuns, confirmSeed)).fitness;
      cached = guard ? { confirm, guard: (await second(entry.decoded.state, request.parameters.confirmRuns, confirmSeed)).rate } : { confirm };
      confirmCache.set(entry.key, cached);
    }
    entry.confirm = cached.confirm;
    entry.guard = cached.guard;
  };
  const confirmedScore = (entry: Individual): GuardedScore => ({ fitness: entry.confirm ?? -Infinity, guard: entry.guard });
  const ranksAbove = (a: Individual, b: Individual) => a.confirm !== undefined && (b.confirm === undefined || compareGuarded(confirmedScore(a), confirmedScore(b), guard) > 0);

  // SpecRef: 9.1.4.9 | GA search Seeds | each used seed takes a first-generation place of a mutant, with the better of its
  // attack-focused and HP-focused fills by their quick score (kept, so the first generation does not score it again).
  // Seeds have their own random stream, so a search without them draws exactly as before.
  interface SeedReport { label: string | null; status: 'used' | 'ignored'; ignored: SeedPlan['ignored']; quickRate: number | null; inBest: boolean }
  const placeSeeds = async (seeds: readonly SeedBuild[]) => {
    const seedRandom = createRandom(deriveSeed(seed, 6));
    const party = state.parties[partyIndex];
    // At most `populationSize / 2` seeds, and never more than the places left after the current build and the heuristics.
    const cap = Math.min(Math.floor(request.parameters.populationSize / 2), request.parameters.populationSize - population.length);
    const signatures = new Set([buildSignature(model.current)]);
    const results: { report: SeedReport; used: SeedValue[] }[] = [];
    let usedCount = 0;
    for (const seedBuild of seeds) {
      const report: SeedReport = { label: seedBuild.label, status: 'ignored', ignored: [], quickRate: null, inBest: false };
      results.push({ report, used: [] });
      if (usedCount >= cap) { report.ignored.push({ field: 'seed', reason: 'populationFull' }); continue; }
      const plan = planSeed(model, seedBuild);
      report.ignored.push(...plan.ignored);
      // A seed with no value at all is the current build.
      if (plan.used.length === 0) { if (plan.ignored.length === 0) report.ignored.push({ field: 'seed', reason: 'duplicate' }); continue; }
      const signature = buildSignature(plan.genome);
      if (signatures.has(signature)) { report.ignored.push({ field: 'seed', reason: 'duplicate' }); continue; }
      signatures.add(signature);
      // The seed's own characters (a class change can add slots or equip rights) decide the fills' slots and equip checks.
      const shaped = decode(model, plan.genome, seedRandom).state.parties[partyIndex].characters;
      const statsById = new Map(shaped.map((character, index) => [character.id, computeCharacterStats(character, party.level, index + 1)]));
      const attack = (item: Item, character: Character) => attackScore(item, statsById.get(character.id)!);
      const fills = [greedyGenome(model, plan.genome, attack, false, shaped), greedyGenome(model, plan.genome, durabilityScore, false, shaped)]
        .filter((genome): genome is Genome => genome !== null)
        .map((genome) => individual(genome, seedRandom));
      const candidates = [...new Map(fills.map((entry) => [entry.key, entry])).values()];
      let chosen: Individual | null = null;
      let chosenScore: GuardedScore = { fitness: -Infinity };
      let chosenRate = 0;
      for (const candidate of candidates) {
        if (outOfTime()) break;
        const measured = await evaluate(candidate.decoded, request.parameters.quickRuns, quickSeed);
        const score: GuardedScore = {
          fitness: allowed(candidate) ? measured.fitness : -Infinity,
          guard: guard ? (await second(candidate.decoded.state, request.parameters.quickRuns, quickSeed)).rate : undefined,
        };
        if (chosen === null || compareGuarded(score, chosenScore, guard) > 0) { chosen = candidate; chosenScore = score; chosenRate = measured.rate; }
      }
      const entry = chosen ?? candidates[0];
      if (chosen) { entry.quick = chosenScore.fitness; quickCache.set(entry.key, entry.quick); report.quickRate = round4(chosenRate); }
      report.status = 'used';
      results[results.length - 1].used = plan.used;
      usedCount += 1;
      population.push(entry);
    }
    return results;
  };

  // The current build with its empty slots filled (a filled slot only adds power) is the search's start and its fallback
  // result; the live build itself is the fallback only when that fill alone needs more than `maxChanges` entries.
  const currentIndividual = individual(model.current);
  const live: Individual = { genome: model.current, decoded: { state, genome: model.current }, key: 'live', changes: 0 };
  const fallback = allowed(currentIndividual) ? currentIndividual : live;
  let population: Individual[] = [currentIndividual];
  if (request.parameters.seedWithHeuristics) for (const genome of heuristicGenomes(model)) population.push(individual(genome));
  const seedResults = request.seedBuilds && !polish ? await placeSeeds(request.seedBuilds) : null;
  while (population.length < request.parameters.populationSize) population.push(individual(mutate(model, population[Math.floor(random() * population.length)].genome, random)));
  let best: Individual = fallback;
  await scoreConfirm(fallback);

  // SpecRef: 9.1.4.9 | GA search Stop | `generationsRun` counts the generations whose quick scoring finished; `stopReason` is
  // `timeBudget` when the time check stopped the loop before it ran `generations` times.
  let generationsRun = 0;
  let stopReason: 'generations' | 'timeBudget' = 'generations';
  for (let generation = 0; generation < request.parameters.generations; generation += 1) {
    if (outOfTime()) { stopReason = 'timeBudget'; break; }
    for (const entry of population) { if (outOfTime()) break; await scoreQuick(entry); }
    if (population.every((entry) => entry.quick !== undefined)) generationsRun += 1;
    population.sort((a, b) => (b.quick ?? -Infinity) - (a.quick ?? -Infinity));
    for (const entry of population.slice(0, request.parameters.confirmTopN)) { if (outOfTime()) break; await scoreConfirm(entry); }
    for (const entry of population) if (ranksAbove(entry, best)) best = entry;
    // A last generation whose quick scoring finished has run all `generations`, even if its confirm runs were cut short.
    if (outOfTime()) { if (generation + 1 < request.parameters.generations || generationsRun <= generation) stopReason = 'timeBudget'; break; }
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

  if (polish) return { data: { evaluations }, best: best.decoded.state };

  // Final selection: the best confirmed builds and the fallback are re-scored on a fresh seed with twice the confirm
  // runs. The top confirm score is biased upward (it won partly by luck on the confirm seed); this stage removes most of that
  // before the independent verification.
  const confirmed = new Map<string, Individual>();
  for (const entry of [...population, best]) if (entry.confirm !== undefined && entry.key !== fallback.key) confirmed.set(entry.key, entry);
  const finalists = [...confirmed.values()].sort((a, b) => compareGuarded(confirmedScore(b), confirmedScore(a), guard)).slice(0, 3);
  if (finalists.length > 0 && ranksAbove(finalists[0], fallback)) {
    const finalScore = async (entry: Individual) => {
      const measured = await evaluate(entry.decoded, finalRuns, finalSeed);
      return { measured, guardMeasure: guard ? await second(entry.decoded.state, finalRuns, finalSeed) : null };
    };
    const scoreOf = (final: Awaited<ReturnType<typeof finalScore>>): GuardedScore => ({ fitness: final.measured.fitness, guard: final.guardMeasure?.rate });
    const currentFinal = await finalScore(fallback);
    let bestFinal = currentFinal;
    best = fallback;
    for (const entry of finalists) {
      const final = await finalScore(entry);
      if (compareGuarded(scoreOf(final), scoreOf(bestFinal), guard) > 0) { bestFinal = final; best = entry; }
    }
    // A finalist replaces the fallback only when it is ahead by at least one standard error of the objective's rate. For
    // `success`, `progress` breaks a tie the same way (every build at 0 successes, for example). With a guard, a finalist
    // that reaches it replaces a fallback that does not; when both miss it, the finalist must be ahead on the guard instead.
    if (best !== fallback) {
      const ahead = (before: ObjectiveMeasure | undefined, after: ObjectiveMeasure | undefined) => before !== undefined && after !== undefined
        && after.rate - before.rate > Math.sqrt(before.variance / finalRuns + after.variance / finalRuns);
      const fallbackReaches = !guard || currentFinal.guardMeasure!.rate >= guard.minimum;
      const bestReaches = !guard || bestFinal.guardMeasure!.rate >= guard.minimum;
      if (guard && bestReaches && !fallbackReaches) {
        // kept: the finalist reaches the guard and the fallback does not.
      } else if (guard && !bestReaches) {
        if (!ahead(currentFinal.guardMeasure!, bestFinal.guardMeasure!)) best = fallback;
      } else {
        const margin = rateGaResult(objective, currentFinal.measured, bestFinal.measured, finalRuns, true);
        const tieBroken = bestFinal.measured.rate === currentFinal.measured.rate && ahead(currentFinal.measured.progress, bestFinal.measured.progress);
        if (!(margin.gain > margin.standardError) && !tieBroken) best = fallback;
      }
    }
  } else {
    best = fallback;
  }

  // Verification: the current and the best build on one fresh seed (Spec 9.1.3, 2-3-2 `verdict`).
  const changed = best.changes > 0;
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
  const verifyAfter = changeSummary.length > 0 ? await evaluate({ state: bestState, genome: best.genome }, verifyRuns, verifySeed) : verifyBefore!;
  const crossAfter = changeSummary.length > 0 ? await second(bestState, verifyRuns, verifySeed) : crossBefore!;
  const summary = summarizeVerification({
    objective, guard, crossObjective, verifyRuns, seed, verifySeed, routeRooms, before: verifyBefore!, after: verifyAfter, crossBefore: crossBefore!, crossAfter,
    changed: changeSummary.length > 0, revision: dependencies.revision, scope: forecastScope(state, partyIndex, objective), label: 'ga-verify',
  });

  // SpecRef: 9.1.3 | 2-3-2 `levelProbe` | the probed build is the result only when it should be applied.
  let levelProbe: Record<string, unknown> | null = null;
  if (probe) {
    const applied = summary.verdict === 'veryGood' || summary.verdict === 'good';
    const outcome = await runLevelProbe({
      model, state, partyIndex, probe, applied, genome: applied ? best.genome : model.current, build: applied ? bestState : state,
      confirmRuns: request.parameters.confirmRuns, quickRuns: request.parameters.quickRuns, quickSeed, verifySeed, seed, deadline, now: dependencies.now,
      simulate: (target, runs, simulationSeed) => meter.time(probeCostKey, runs, async () => {
        evaluations += 1;
        return await dependencies.simulate(target, partyIndex, runs, simulationSeed) as ExpeditionSimulationResult;
      }),
    });
    levelProbe = outcome;
  }
  // SpecRef: 9.1.3 | 2-3-2 `seeds` | `inBest`: the result build has every value the seed used.
  const resultGenome = changeSummary.length > 0 ? best.genome : model.current;
  const seeds = seedResults?.map(({ report, used }) => ({ ...report, inBest: report.status === 'used' && hasSeedValues(resultGenome, used) }));
  const elapsedSeconds = Math.round((dependencies.now() - startedAt) / 100) / 10;
  return {
    data: {
      verdict: summary.verdict,
      forecast: summary.forecast,
      changeSummary,
      revision: dependencies.revision,
      evaluations,
      generationsRun,
      stopReason,
      elapsedSeconds,
      ...(seeds ? { seeds } : {}),
      basis: buildBasis(state, partyIndex, changeSummary),
      // SpecRef: 9.1.4.9 | gaSearch | the measured `<rate>` values, gain, and standard error behind `verdict`.
      verification: summary.verification,
      levelProbe,
    },
  };
}

// ---------------- Level probe ----------------

interface LevelProbeInput {
  model: SearchModel;
  state: GameState;
  partyIndex: number;
  probe: LevelProbeRequest;
  /** Whether the probed build is the search result (`veryGood` or `good`) rather than the current build. */
  applied: boolean;
  genome: Genome;
  build: GameState;
  confirmRuns: number;
  quickRuns: number;
  quickSeed: number;
  verifySeed: number;
  seed: number;
  deadline: number;
  now: () => number;
  simulate: (target: GameState, runs: number, seed: number) => Promise<ExpeditionSimulationResult>;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** A copy of the state with one party changed. */
function withParty(state: GameState, partyIndex: number, change: Partial<Party>): GameState {
  const parties = [...state.parties];
  parties[partyIndex] = { ...parties[partyIndex], ...change };
  return { ...state, parties };
}

// SpecRef: 9.1.3 | 2-3-2 `levelProbe` Process | the probed build at the current level, then at each probed level with its
// newly opened slots filled, until a level meets the target. Returns the `levelProbe` response member, or null.
async function runLevelProbe(input: LevelProbeInput): Promise<Record<string, unknown> | null> {
  const { model, state, partyIndex, probe } = input;
  const party = state.parties[partyIndex];
  const conquest = probe.purpose === 'conquest';
  const goal: LevelProbeGoal | null = conquest ? conquestGoal(party) : null;
  if (conquest && !goal) return null;
  // `conquest` runs the whole route to the goal (the depth limit opened); `farming` runs the searched route as it is.
  const measureAt = async (target: GameState, runs: number, simulationSeed: number): Promise<ObjectiveMeasure> => {
    const prepared = conquest ? withParty(target, partyIndex, { expeditionDepthLimit: 'all' }) : target;
    return measureObjective(conquest ? 'success' : 'minDefeat', await input.simulate(prepared, runs, simulationSeed), 0);
  };
  const expectedRuns = (measured: ObjectiveMeasure) => (goal ? expectedRunsToGoal(measured.rate, goal.required, goal.current) : null);
  const meets = (measured: ObjectiveMeasure): boolean => {
    if (!conquest) return measured.rate * 100 <= probe.maxDefeat;
    const runs = expectedRuns(measured);
    return runs !== null && runs <= probe.runBudget;
  };
  const point = (level: number, filledSlots: number, measured: ObjectiveMeasure) => {
    const runs = expectedRuns(measured);
    return {
      level, baseSlots: baseSlotsAt(level), filledSlots, rate: round2(measured.rate * 100),
      standardError: round2(Math.sqrt(measured.variance / input.confirmRuns) * 100),
      expectedRuns: runs === null ? null : round2(runs), experienceToLevel: experienceToLevel(party, level),
    };
  };
  const outOfTime = () => input.now() >= input.deadline;
  const points: ReturnType<typeof point>[] = [];
  let truncated = false;
  let levelNeeded: number | null = null;
  if (outOfTime()) truncated = true;
  else {
    const current = await measureAt(input.build, input.confirmRuns, input.verifySeed);
    if (probe.mode === 'auto' && meets(current)) return null;
    points.push(point(party.level, 0, current));
    if (meets(current)) levelNeeded = party.level;
  }
  const random = createRandom(deriveSeed(input.seed, 5));
  for (const level of levelNeeded === null && !truncated ? probedLevels(party.level, probe.steps, probe.count) : []) {
    if (outOfTime()) { truncated = true; break; }
    // The search model at the probed level: the same items, more base slots.
    const levelModel = buildModel(withParty(state, partyIndex, { level }), partyIndex, model.request);
    // The build's own characters (a class change can add slots) decide the slot counts and the equip checks of the fill.
    const shaped = decode(levelModel, input.genome, random).state.parties[partyIndex].characters;
    const levelParty = levelModel.base.parties[partyIndex];
    const statsById = new Map(shaped.map((character, index) => [character.id, computeCharacterStats(character, levelParty.level, index + 1)]));
    const attack = (item: Item, character: Character) => attackScore(item, statsById.get(character.id)!);
    const fills = [greedyGenome(levelModel, input.genome, attack, true, shaped), greedyGenome(levelModel, input.genome, durabilityScore, true, shaped)]
      .filter((genome): genome is Genome => genome !== null);
    const unique = [...new Map(fills.map((genome) => [genomeKey(genome), genome])).values()];
    const candidates = (unique.length > 0 ? unique : [input.genome]).map((genome) => decode(levelModel, genome, random).state);
    let chosen = candidates[0];
    if (candidates.length > 1) {
      // The fill that scores better on the quick runs: more successes for `conquest`, fewer defeats for `farming`.
      let bestScore = -Infinity;
      for (const candidate of candidates) {
        if (outOfTime()) break;
        const measured = await measureAt(candidate, input.quickRuns, input.quickSeed);
        const score = conquest ? measured.rate : -measured.rate;
        if (score > bestScore) { bestScore = score; chosen = candidate; }
      }
    }
    if (outOfTime()) { truncated = true; break; }
    const measured = await measureAt(chosen, input.confirmRuns, input.verifySeed);
    const filledSlots = chosen.parties[partyIndex].characters.reduce((sum, character) => {
      if (!targetOf(model, character.id)?.components.equipment) return sum;
      const before = computeCharacterStats(character, party.level).maxEquipSlots;
      return sum + character.equipment.slice(before).filter((item) => item !== null).length;
    }, 0);
    points.push(point(level, filledSlots, measured));
    if (meets(measured)) { levelNeeded = level; break; }
  }
  return {
    build: input.applied ? 'best' : 'current',
    purpose: probe.purpose,
    goal,
    target: goal ? { runBudget: probe.runBudget, requiredRate: round2(requiredRateForBudget(goal.required, goal.current, probe.runBudget) * 100) } : { maxDefeat: probe.maxDefeat },
    fromLevel: party.level,
    steps: probe.steps,
    points,
    levelNeeded,
    truncated,
  };
}

// ---------------- applyBuildChanges ----------------

// SpecRef: 9.1.3 | Commit | 3-3-2 party/{p}/applyBuildChanges
export const BUILD_APPLY_WARNING_KEY = 'api.warning.applyBuildChanges.unconfirmedImprovement';

/** The endpoints `changes` may use: the 9.1.3 `changeSummary` order list. */
const CHANGE_ENDPOINT = /^commit\/build\/(?:party\/\d+|character\/\d+\/(?:removeEquipment|changeBuild|equip|jewelRemove|jewelAttach))$/;
const EQUIPMENT_ENDPOINT = /^commit\/build\/character\/(\d+)\/(removeEquipment|equip|jewelRemove|jewelAttach)$/;
const CHARACTER_ENDPOINT = /^commit\/build\/character\/(\d+)\//;

/** Validates `changes` (Spec 9.1.4.9): a non-empty list of allowed Commit API calls; `expectedRevision` in an entry is dropped. */
function parseChanges(value: unknown): GaChangeEntry[] {
  if (!Array.isArray(value) || value.length === 0) invalid('changes');
  return value.map((entry, index) => {
    if (!isRecord(entry)) invalid(`changes[${index}]`);
    const extra = Object.keys(entry).find((key) => key !== 'endpoint' && key !== 'parameters');
    if (extra !== undefined) invalid(`changes[${index}].${extra}.unknown_member`);
    if (typeof entry.endpoint !== 'string' || !CHANGE_ENDPOINT.test(entry.endpoint)) invalid(`changes[${index}].endpoint`);
    const raw = entry.parameters === undefined ? {} : entry.parameters;
    if (!isRecord(raw)) invalid(`changes[${index}].parameters`);
    const { expectedRevision: _ignored, ...parameters } = raw;
    return { endpoint: entry.endpoint, parameters };
  });
}

/**
 * Applies a list of Commit API calls (normally a `gaSearch`, `directedBuild`, or `stagedEquipmentTuning` `changeSummary`)
 * to party `{p}` as one transaction: every entry runs through the Commit API handler in order, the characters with an
 * equipment entry get the requested Auto Equipment mode, and each character whose equipment state changed gets exactly one
 * Undo step (its state before this operation). Nothing is kept on the server: a given `basis` is recomputed from `changes`
 * and the current save, and a given `verdict` can reject the request (`noChange`) or require confirmation (`noisy`, `worse`).
 */
export function applyBuildChanges(state: GameState, partyNumber: number, parameters: Record<string, unknown>, context: ApiV1CommitContext): { state: GameState; data: Record<string, unknown> } {
  const allowed = new Set(['changes', 'basis', 'verdict', 'autoEquipmentMode', 'simulation', 'confirmation']);
  const unknown = Object.keys(parameters).find((key) => !allowed.has(key));
  if (unknown !== undefined) invalid(`${unknown}.unknown_member`);
  const { basis, verdict, simulation, confirmation } = parameters;
  const changes = parseChanges(parameters.changes);
  if (basis !== undefined && (typeof basis !== 'string' || basis.length === 0)) invalid('basis');
  if (verdict !== undefined && (typeof verdict !== 'string' || !(GA_VERDICTS as readonly string[]).includes(verdict))) invalid('verdict');
  const mode = parameters.autoEquipmentMode === undefined ? 'SEMI' : parameters.autoEquipmentMode;
  if (mode !== 'SEMI' && mode !== 'OFF') invalid('autoEquipmentMode');
  if (typeof simulation !== 'boolean') invalid('simulation');
  if (confirmation !== undefined && confirmation !== 'yes' && confirmation !== 'no') invalid('confirmation');
  if (simulation && confirmation !== undefined) invalid('confirmation_with_simulation');
  const partyIndex = state.parties.findIndex((party) => party.id === partyNumber);
  if (partyIndex < 0) throw new Error('not_found');

  if (verdict === 'noChange') throw new Error('illegal_action:build_no_change');
  if (basis !== undefined && buildBasis(state, partyIndex, changes) !== basis) throw new Error('illegal_action:build_basis_stale');

  const confirmationRequired = verdict === 'worse' || verdict === 'noisy';
  const warnings = confirmationRequired ? [{ key: BUILD_APPLY_WARNING_KEY, args: { verdict: verdict as string } }] : [];
  const changedIds = [...new Set(changes.map((entry) => Number(entry.endpoint.match(CHARACTER_ENDPOINT)?.[1])).filter((id) => Number.isInteger(id) && id > 0))];
  const equipmentIds = new Set(changes.map((entry) => Number(entry.endpoint.match(EQUIPMENT_ENDPOINT)?.[1])).filter((id) => Number.isInteger(id) && id > 0));

  // `considerItemsScope: global` results also change characters of other parties, so each character is looked up on its own party.
  const partyOf = (source: GameState, characterId: number) => source.parties.findIndex((entry) => entry.characters.some((character) => character.id === characterId));
  // Every entry runs against a private history bag: the internal steps record nothing (Spec 9.1.3, 3-3-2 Undo and Redo).
  const run = (source: GameState): GameState => {
    let next = source;
    for (const entry of changes) next = applyApiV1Commit(entry.endpoint, next, entry.parameters, { ...context, equipmentHistory: {} }).state;
    for (const id of equipmentIds) {
      next = gameReducer(next, { type: 'UPDATE_CHARACTER', partyIndex: partyOf(next, id), characterId: id, updates: { autoEquipmentMode: mode === 'SEMI' ? 1 : 0 } });
    }
    return next;
  };
  const statusOf = (source: GameState) => changedIds.map((characterId) => {
    const party = source.parties[partyOf(source, characterId)];
    const index = party.characters.findIndex((entry) => entry.id === characterId);
    return { characterId, calculatedStatus: buildCalculatedStatus(party.characters[index], computePartyStats(party).characterStats[index], party.level) };
  });
  const report = (applied: GaChangeEntry[], source: GameState) => ({ applied, confirmationRequired, warnings, calculatedStatus: statusOf(source) });

  if (simulation) return { state, data: report(changes, run(state)) };
  if (confirmation === 'no') return { state, data: report([], state) };
  if (confirmationRequired && confirmation !== 'yes') invalid('confirmation_required');
  const next = run(state);
  for (const characterId of changedIds) {
    const before = state.parties[partyOf(state, characterId)].characters.find((entry) => entry.id === characterId)!;
    const after = next.parties[partyOf(next, characterId)].characters.find((entry) => entry.id === characterId)!;
    const snapshot = snapshotCharacterEquipment(before, context.simulatedAt);
    if (sameEquipmentSnapshot(snapshot, snapshotCharacterEquipment(after, context.simulatedAt))) continue;
    context.equipmentHistory[String(characterId)] = recordEquipmentState(context.equipmentHistory[String(characterId)] ?? { undo: [], redo: [] }, snapshot);
  }
  return { state: next, data: report(changes, next) };
}
