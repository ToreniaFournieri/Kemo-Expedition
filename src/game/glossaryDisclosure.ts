import { BONUS_ABILITY_GLOSSARY_ENTRIES } from '../data/bonusAbilityGlossary.ts';
import { TERRAIN_EFFECT_GLOSSARY_SECTION } from '../data/glossary.ts';
import type { GameState, TerrainEffectKey } from '../types/index.ts';

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
