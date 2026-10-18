import type { CharacterGender, RaceId } from '../types';

// SpecRef: 2.2.1 | Potential default name for player side characters | Trigger: when race is changed.
// SpecRef: 8.2.3 | Character Edit Mode (selected member) | Default Name Assignment
// Shared by the Party editor and `changeBuild`, so a race change names the character the same way in both.

export type GenderedNamePool = { male: string[]; female: string[] };
export type DefaultNamePools = Record<number, Partial<Record<RaceId, GenderedNamePool>>>;

const ALL_RACES: readonly RaceId[] = ['lupinian', 'vulpinian', 'felidian', 'caninian', 'ursan', 'procyonian', 'leporian', 'cervin', 'murid'];
/** The races each PT's Potential Default Name Table lists (PT1 has no Procyonian names). */
const DEFAULT_NAME_RACES_BY_PT: Record<number, readonly RaceId[]> = {
  1: ['caninian', 'lupinian', 'vulpinian', 'ursan', 'felidian', 'leporian', 'cervin', 'murid'],
  2: ALL_RACES, 3: ALL_RACES, 4: ALL_RACES, 5: ALL_RACES, 6: ALL_RACES,
};

/** Builds every PT's pools through `lookup` (an i18n key -> `A|B|C` list); the first half of a list is male, the rest female. */
export function buildDefaultNamePools(lookup: (key: string) => string): DefaultNamePools {
  const pools: DefaultNamePools = {};
  for (const [pt, races] of Object.entries(DEFAULT_NAME_RACES_BY_PT)) {
    const byRace: Partial<Record<RaceId, GenderedNamePool>> = {};
    for (const raceId of races) {
      const names = lookup(`home.defaultNames.${`pt${pt}`}.${raceId}`).split('|').map((name) => name.trim()).filter(Boolean);
      const pivot = Math.ceil(names.length / 2);
      byRace[raceId] = { male: names.slice(0, pivot), female: names.slice(pivot) };
    }
    pools[Number(pt)] = byRace;
  }
  return pools;
}

/**
 * A default name for `raceId`/`gender` in PT `partyId`, avoiding `usedNames` while an unused candidate remains.
 * When the PT has no names for that race (PT1 Procyonian), the same race and gender of the other PTs are used.
 * Returns undefined when no candidate exists (Mimorian, unique-only races).
 */
export function pickDefaultName(
  pools: DefaultNamePools, partyId: number, raceId: RaceId, gender: CharacterGender,
  usedNames: ReadonlySet<string>, random: () => number,
): string | undefined {
  const ptCandidates = pools[partyId]?.[raceId]?.[gender] ?? [];
  const candidates = ptCandidates.length > 0
    ? ptCandidates
    : [...new Set(Object.values(pools).flatMap((byRace) => byRace[raceId]?.[gender] ?? []))];
  if (candidates.length === 0) return undefined;
  const unused = candidates.filter((candidate) => !usedNames.has(candidate));
  const pool = unused.length > 0 ? unused : candidates;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

/** A fixed [0, 1) value for `key` (FNV-1a), for callers that must not consume the gameplay random stream. */
export function stableUnitRandom(key: string): () => number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return () => hash / 0x100000000;
}
