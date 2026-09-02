import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { BONUS_ABILITY_GLOSSARY_ENTRIES } from '../../src/data/bonusAbilityGlossary.ts';
import { TERRAIN_EFFECT_GLOSSARY_SECTION } from '../../src/data/glossary.ts';
import {
  normalizeRevealedGlossaryAbilityIds,
  normalizeRevealedGlossaryTerrainKeys,
  planGlossaryRevealFromEncounter,
} from '../../src/game/glossaryDisclosure.ts';
import type { GameState, TerrainEffectKey } from '../../src/types/index.ts';

test('glossary save normalization filters invalid IDs, deduplicates, and preserves order', () => {
  const firstAbility = BONUS_ABILITY_GLOSSARY_ENTRIES[0].abilityId;
  const secondAbility = BONUS_ABILITY_GLOSSARY_ENTRIES[1].abilityId;
  const firstTerrain = TERRAIN_EFFECT_GLOSSARY_SECTION.entries[0].key as TerrainEffectKey;
  const secondTerrain = TERRAIN_EFFECT_GLOSSARY_SECTION.entries[1].key as TerrainEffectKey;

  assert.deepEqual(
    normalizeRevealedGlossaryAbilityIds([
      secondAbility,
      'invalid',
      firstAbility,
      secondAbility,
      null,
    ]),
    [secondAbility, firstAbility],
  );
  assert.deepEqual(
    normalizeRevealedGlossaryTerrainKeys([
      secondTerrain,
      'terrain.invalid',
      firstTerrain,
      secondTerrain,
      1,
    ]),
    [secondTerrain, firstTerrain],
  );
  assert.deepEqual(normalizeRevealedGlossaryAbilityIds(null), []);
  assert.deepEqual(normalizeRevealedGlossaryTerrainKeys({}), []);
});

test('encounter disclosure appends only known IDs without mutating saved arrays', () => {
  const existingAbility = BONUS_ABILITY_GLOSSARY_ENTRIES[0].abilityId;
  const nextAbility = BONUS_ABILITY_GLOSSARY_ENTRIES[1].abilityId;
  const existingTerrain = TERRAIN_EFFECT_GLOSSARY_SECTION.entries[0].key as TerrainEffectKey;
  const nextTerrain = TERRAIN_EFFECT_GLOSSARY_SECTION.entries[1].key as TerrainEffectKey;
  const global = {
    revealedGlossaryAbilityIds: [existingAbility],
    revealedGlossaryTerrainKeys: [existingTerrain],
  } as Pick<
    GameState['global'],
    'revealedGlossaryAbilityIds' | 'revealedGlossaryTerrainKeys'
  >;

  const result = planGlossaryRevealFromEncounter({
    global,
    abilityIds: [nextAbility, existingAbility, 'invalid', nextAbility],
    terrainEffect: nextTerrain,
  });

  assert.deepEqual(result.revealedGlossaryAbilityIds, [existingAbility, nextAbility]);
  assert.deepEqual(result.revealedGlossaryTerrainKeys, [existingTerrain, nextTerrain]);
  assert.deepEqual(global.revealedGlossaryAbilityIds, [existingAbility]);
  assert.deepEqual(global.revealedGlossaryTerrainKeys, [existingTerrain]);
  assert.deepEqual(
    planGlossaryRevealFromEncounter({ global, abilityIds: [], terrainEffect: 'none' }),
    global,
  );
});

test('React reducer delegates glossary normalization and has no glossary validation sets', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/game/glossaryDisclosure.ts'), 'utf8');
  const hookSource = readFileSync(resolve(process.cwd(), 'src/hooks/useGameState.ts'), 'utf8');
  const commitSource = readFileSync(resolve(process.cwd(), 'src/game/expeditionCommit.ts'), 'utf8');

  assert.match(hookSource, /normalizeRevealedGlossaryAbilityIds\(/);
  assert.match(hookSource, /normalizeRevealedGlossaryTerrainKeys\(/);
  assert.doesNotMatch(
    hookSource,
    /VALID_GLOSSARY_ABILITY_IDS|VALID_GLOSSARY_TERRAIN_KEYS|function revealGlossaryFromEncounter/,
  );
  assert.match(commitSource, /planGlossaryRevealFromEncounter\(/);
  assert.doesNotMatch(commitSource, /resolveRevealedGlossaryAbilityIds/);
  assert.doesNotMatch(source, /gameplayRandom|Math\.random|Date\.now|React|useGameState/);
});
