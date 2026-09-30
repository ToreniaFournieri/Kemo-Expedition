import { BONUS_ABILITY_GLOSSARY_ENTRIES } from '../data/bonusAbilityGlossary.ts';
import { TERRAIN_EFFECT_GLOSSARY_SECTION } from '../data/glossary.ts';
import { getItemById, getSuperRareBonuses } from '../data/items.ts';
import type { Bonus, GameState, InventoryRecord, Item, Party, TerrainEffectKey } from '../types/index.ts';

const VALID_GLOSSARY_ABILITY_IDS = new Set(
  BONUS_ABILITY_GLOSSARY_ENTRIES.map((entry) => entry.abilityId),
);
const VALID_GLOSSARY_TERRAIN_KEYS = new Set(
  (TERRAIN_EFFECT_GLOSSARY_SECTION?.entries ?? []).map((entry) => entry.key as TerrainEffectKey),
);

// SpecRef: 1.0.3 | Glossary Reveal Rule | revealed
export function normalizeRevealedGlossaryAbilityIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value.filter((abilityId): abilityId is string => (
      typeof abilityId === 'string'
      && VALID_GLOSSARY_ABILITY_IDS.has(
        abilityId as typeof BONUS_ABILITY_GLOSSARY_ENTRIES[number]['abilityId'],
      )
    )),
  ));
}

// SpecRef: 1.0.3 | Glossary Reveal Rule | revealed
export function normalizeRevealedGlossaryTerrainKeys(value: unknown): TerrainEffectKey[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value.filter((terrainKey): terrainKey is TerrainEffectKey => (
      typeof terrainKey === 'string'
      && VALID_GLOSSARY_TERRAIN_KEYS.has(terrainKey as TerrainEffectKey)
    )),
  ));
}

export interface PlanGlossaryRevealFromEncounterInput {
  readonly global: Pick<
    GameState['global'],
    'revealedGlossaryAbilityIds' | 'revealedGlossaryTerrainKeys'
  >;
  readonly abilityIds: Iterable<string>;
  readonly terrainEffect?: TerrainEffectKey | 'none';
}

/** Pure, insertion-order-preserving encounter disclosure projection. */
export function planGlossaryRevealFromEncounter(
  input: PlanGlossaryRevealFromEncounterInput,
): Pick<GameState['global'], 'revealedGlossaryAbilityIds' | 'revealedGlossaryTerrainKeys'> {
  const nextAbilityIds = new Set(input.global.revealedGlossaryAbilityIds);
  const nextTerrainKeys = new Set(input.global.revealedGlossaryTerrainKeys);

  for (const abilityId of input.abilityIds) {
    if (VALID_GLOSSARY_ABILITY_IDS.has(
      abilityId as typeof BONUS_ABILITY_GLOSSARY_ENTRIES[number]['abilityId'],
    )) {
      nextAbilityIds.add(abilityId);
    }
  }
  if (
    input.terrainEffect
    && input.terrainEffect !== 'none'
    && VALID_GLOSSARY_TERRAIN_KEYS.has(input.terrainEffect)
  ) {
    nextTerrainKeys.add(input.terrainEffect);
  }

  return {
    revealedGlossaryAbilityIds: Array.from(nextAbilityIds),
    revealedGlossaryTerrainKeys: Array.from(nextTerrainKeys),
  };
}

const itemAbilityIdCache = new Map<string, readonly string[]>();

/** Glossary ability IDs an item variant shows the player: its own ability bonuses plus its Super Rare title's. */
export function getItemGlossaryAbilityIds(item: Pick<Item, 'id' | 'superRare'>): readonly string[] {
  const cacheKey = `${item.id}/${item.superRare}`;
  const cached = itemAbilityIdCache.get(cacheKey);
  if (cached) return cached;
  const bonuses: Bonus[] = [...(getItemById(item.id)?.bonuses ?? []), ...getSuperRareBonuses(item.superRare)];
  const abilityIds = Array.from(new Set(bonuses.flatMap((bonus) => (
    bonus.abilityId && VALID_GLOSSARY_ABILITY_IDS.has(bonus.abilityId as typeof BONUS_ABILITY_GLOSSARY_ENTRIES[number]['abilityId'])
      ? [bonus.abilityId]
      : []
  ))));
  itemAbilityIdCache.set(cacheKey, abilityIds);
  return abilityIds;
}

// SpecRef: 1.0.3 | Glossary Reveal Rule | revealed when shown to the player for the first time
// An owned item shows its abilities in the Inventory and Party panes, so owning (or wearing) it reveals them. Returns
// the input array itself when nothing new is revealed.
export function revealOwnedItemGlossaryAbilities(
  revealedAbilityIds: string[],
  inventory: InventoryRecord,
  parties: readonly Party[] = [],
): string[] {
  const known = new Set(revealedAbilityIds);
  const additions: string[] = [];
  const reveal = (item: Pick<Item, 'id' | 'superRare'> | null | undefined) => {
    if (!item) return;
    for (const abilityId of getItemGlossaryAbilityIds(item)) {
      if (known.has(abilityId)) continue;
      known.add(abilityId);
      additions.push(abilityId);
    }
  };
  for (const variant of Object.values(inventory)) {
    if (variant?.status === 'owned' && variant.count > 0) reveal(variant.item);
  }
  for (const party of parties) for (const character of party.characters) character.equipment.forEach(reveal);
  return additions.length > 0 ? [...revealedAbilityIds, ...additions] : revealedAbilityIds;
}
