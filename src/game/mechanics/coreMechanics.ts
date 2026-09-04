import type { AbilityId, TerrainEffectKey } from '../../types/index.ts';
import { BATTLE_ABILITY_OWNERSHIP } from '../battleAbilityOwnership.ts';
import {
  BATTLE_ABILITY_IDS,
  BATTLE_TERRAIN_IDS,
} from '../generated/battleProtocol.generated.ts';
import type {
  CoreAbilityMechanicDefinition,
  CoreMechanicDefinition,
  CoreTerrainMechanicDefinition,
  MechanicCategory,
  MechanicExecutionBinding,
  MechanicTiming,
} from './mechanicTypes.ts';

const categorized = <T extends readonly AbilityId[]>(...ids: T): T => ids;

const ABILITY_CATEGORY_IDS = {
  passive: categorized(
    'iaigiri', 'heavy_strike', 'arcane_stability', 'arc_magic', 'gravity_well', 'armor_break',
    'mana_break', 'melee_conversion', 'hunter', 'seeker', 'cyborgization', 'composure', 'focus',
    'colossal', 'null_antagonism', 'equation_breaker', 'domain_breaker', 'wind_rider', 'siege',
    'coldproof', 'dryproof', 'vine_cutter', 'mana_ward', 'defiance', 'fire_protect_breaker',
    'ice_protect_breaker', 'thunder_protect_breaker', 'm_barrier_breaker', 'unforgettable',
    'null_shock', 'anti_ambush', 'anti_overwatch', 'rage_breaker', 'momentum_breaker',
    'execution_null', 'null_corrode', 'null_life_drain', 'null_death_touch', 'null_burn',
    'null_bind', 'null_requiem', 'upgrade_all_abilities', 'base_status_cap_at_15', 'true_sight',
    'output_stabilizer', 'illusion_breaker', 'bulwark_breaker', 'unlock',
  ),
  expedition: categorized('tithe', 'squander', 'prophecy', 'cunning', 'peddler'),
  reactive: categorized(
    'resonance', 'ambush', 'overwatch', 'execution', 'rage', 'momentum', 'no_offense', 'swarm',
    'stealth', 'illusion', 'bulwark', 'shock', 're_attack', 'corrode', 'life_drain', 'death_touch',
    'burn', 'bind', 'counter', 'magical_counter', 'resurrect', 'reanimate', 'requiem',
    're_counter', 'null_counter', 'covering_fire',
  ),
  timed: categorized(
    'flying', 'oblivion', 'fading_memory', 'mimic', 'defender', 'command', 'm_barrier',
    'ice_absorb', 'fire_absorb', 'thunder_absorb', 'magical_absorb', 'ice_null', 'fire_null',
    'thunder_null', 'magical_null', 'ranged_null', 'melee_null', 'ice_reflect', 'fire_reflect',
    'thunder_reflect', 'magical_reflect', 'ranged_reflect', 'melee_reflect', 'deflection',
    'mutual_magic_amplify', 'mutual_magic_restraint', 'mutual_physical_amplify',
    'mutual_physical_restraint', 'magic_seal', 'first_strike', 'slow', 'boost', 'frostbite',
    'howl', 'ranged_confusion', 'magic_confusion', 'melee_confusion', 'unstable_core',
    'soul_reap', 'regeneration', 'predator_sense', 'decompose', 'self_destruct', 'free',
    'auriferous', 'first_aid', 'pursuit',
  ),
} as const satisfies Record<MechanicCategory, readonly AbilityId[]>;

const ABILITY_CATEGORY_BY_ID = Object.fromEntries(
  Object.entries(ABILITY_CATEGORY_IDS).flatMap(([category, ids]) =>
    ids.map((id) => [id, category as MechanicCategory]),
  ),
) as Record<AbilityId, MechanicCategory>;

const ABILITY_MAX_LEVELS: Partial<Record<AbilityId, number>> = {
  iaigiri: 3, heavy_strike: 2, arcane_stability: 2, arc_magic: 3, melee_conversion: 2,
  hunter: 3, seeker: 2, cyborgization: 2, composure: 2, focus: 2,
  upgrade_all_abilities: 4, tithe: 2, squander: 2, prophecy: 2, cunning: 2, peddler: 2,
  resonance: 5, ambush: 5, overwatch: 5, execution: 2, rage: 2, momentum: 2, stealth: 2,
  illusion: 2, flying: 3, bulwark: 2, re_attack: 3, corrode: 5, life_drain: 7,
  death_touch: 5, burn: 5, bind: 5, counter: 3, magical_counter: 2, resurrect: 2,
  reanimate: 5, re_counter: 2, null_counter: 3, covering_fire: 2, defender: 3, command: 3,
  m_barrier: 3, ice_absorb: 5, fire_absorb: 5, thunder_absorb: 5, magical_absorb: 5,
  ice_reflect: 5, fire_reflect: 5, thunder_reflect: 5, magical_reflect: 5, ranged_reflect: 5,
  melee_reflect: 5, deflection: 2, mutual_magic_amplify: 5, mutual_magic_restraint: 5,
  mutual_physical_amplify: 5, mutual_physical_restraint: 5, first_strike: 3, slow: 3,
  boost: 3, howl: 5, ranged_confusion: 5, magic_confusion: 5, melee_confusion: 5,
  unstable_core: 5, soul_reap: 5, regeneration: 5, predator_sense: 5, decompose: 5,
  self_destruct: 5, free: 5, first_aid: 5,
};

const ABILITY_TIMINGS: Partial<Record<AbilityId, MechanicTiming>> = {
  flying: { phase: 'COMBAT', priority: 3 },
  fading_memory: { phase: 'START', priority: 8 },
  howl: { phase: 'COMBAT', priority: 2 },
  ranged_confusion: { phase: 'COMBAT', priority: 2 },
  magic_confusion: { phase: 'COMBAT', priority: 2 },
  melee_confusion: { phase: 'COMBAT', priority: 2 },
  unstable_core: { phase: 'COMBAT', priority: 3 },
  soul_reap: { phase: 'COMBAT', priority: 3 },
  regeneration: { phase: 'COMBAT', priority: 3 },
  predator_sense: { phase: 'COMBAT', priority: 3 },
  decompose: { phase: 'COMBAT', priority: 2 },
  self_destruct: { phase: 'COMBAT', priority: 2 },
  free: { phase: 'COMBAT', priority: 1 },
  first_aid: { phase: 'END', priority: 4 },
};

const EXPEDITION_ABILITY_IDS = new Set<AbilityId>([
  'first_aid', 'squander', 'tithe', 'cunning', 'peddler', 'prophecy', 'auriferous', 'momentum',
  'unlock',
]);

const ABILITIES_WITHOUT_GLOSSARY_LABEL = new Set<AbilityId>([
  'true_sight', 'output_stabilizer', 'pursuit', 'illusion_breaker', 'bulwark_breaker', 'unlock',
]);

const EXPEDITION_TERRAIN_IDS = new Set<TerrainEffectKey>([
  'terrain.rejuvenation', 'terrain.chill', 'terrain.rotwood', 'terrain.abundant',
  'terrain.looping-path', 'terrain.heatwave', 'terrain.leakage', 'terrain.decay', 'terrain.gehenna',
]);

const DUAL_SCOPE_TERRAIN_IDS = new Set<TerrainEffectKey>(['terrain.gehenna']);

interface ExpeditionBindingLocations {
  readonly implementationFiles: readonly string[];
  readonly testFiles: readonly string[];
}

const POST_BATTLE_IMPLEMENTATION_FILES = [
  'src/game/expeditionRunContext.ts',
  'src/game/expeditionRoomVictory.ts',
  'src/game/events/orderedExpeditionPipeline.ts',
  'src/game/expeditionEffects/postBattleEffects.ts',
  'src/game/expeditionEffects/postBattleEffectNarration.ts',
  'src/hooks/useGameState.ts',
] as const;

const POST_BATTLE_TEST_FILES = [
  'tests/expeditionRunContext.test.cjs',
  'tests/expeditionRoomVictory.test.cjs',
  'tests/orderedExpeditionPipeline.test.ts',
  'tests/postBattleEffects.test.ts',
  'tests/expeditionSimulation.test.ts',
] as const;

const POST_BATTLE_TERRAIN_IMPLEMENTATION_FILES = [
  'src/game/expeditionRunContext.ts',
  'src/game/expeditionBattleRoom.ts',
  'src/game/expeditionRoomVictory.ts',
  'src/game/events/orderedExpeditionPipeline.ts',
  'src/game/expeditionEffects/postBattleEffects.ts',
  'src/game/expeditionEffects/postBattleEffectNarration.ts',
  'src/hooks/useGameState.ts',
] as const;

const POST_BATTLE_TERRAIN_TEST_FILES = [
  'tests/expeditionRunContext.test.cjs',
  'tests/expeditionBattleRoom.test.cjs',
  'tests/expeditionRoomVictory.test.cjs',
  'tests/orderedExpeditionPipeline.test.ts',
  'tests/postBattleEffects.test.ts',
  'tests/expeditionSimulation.test.ts',
] as const;

const EXPEDITION_ABILITY_BINDING_LOCATIONS: Partial<Record<AbilityId, ExpeditionBindingLocations>> = {
  first_aid: {
    implementationFiles: POST_BATTLE_IMPLEMENTATION_FILES,
    testFiles: POST_BATTLE_TEST_FILES,
  },
  auriferous: {
    implementationFiles: [
      'src/game/events/orderedExpeditionPipeline.ts',
      'src/game/expeditionEffects/auriferousEffect.ts',
      'src/game/expeditionEffects/auriferousNarration.ts',
      'src/game/expeditionRoomVictory.ts',
      'src/hooks/useGameState.ts',
    ],
    testFiles: [
      'tests/orderedExpeditionPipeline.test.ts',
      'tests/auriferousEffect.test.ts',
      'tests/rewardDrops.test.ts',
      'tests/expeditionRoomVictory.test.cjs',
      'tests/expeditionSimulation.test.ts',
    ],
  },
  cunning: {
    implementationFiles: [
      'src/game/expeditionRunContext.ts',
      'src/game/expeditionRewardContext.ts',
      'src/game/expeditionRoomVictory.ts',
      'src/hooks/useGameState.ts',
    ],
    testFiles: [
      'tests/expeditionRunContext.test.cjs',
      'tests/expeditionRewardContext.test.cjs',
      'tests/expeditionRoomVictory.test.cjs',
      'tests/expeditionSimulation.test.ts',
    ],
  },
  momentum: {
    implementationFiles: [
      'src/game/expeditionRunContext.ts',
      'src/game/expeditionRewardContext.ts',
      'src/game/expeditionRoomVictory.ts',
      'src/hooks/useGameState.ts',
    ],
    testFiles: [
      'tests/expeditionRunContext.test.cjs',
      'tests/expeditionRewardContext.test.cjs',
      'tests/afkScheduler.test.ts',
      'tests/expeditionRoomVictory.test.cjs',
      'tests/expeditionSimulation.test.ts',
    ],
  },
  squander: {
    implementationFiles: ['src/hooks/useGameState.ts'],
    testFiles: ['tests/afkScheduler.test.ts', 'tests/expeditionSimulation.test.ts'],
  },
  tithe: {
    implementationFiles: ['src/hooks/useGameState.ts'],
    testFiles: ['tests/afkScheduler.test.ts', 'tests/expeditionSimulation.test.ts'],
  },
  peddler: {
    implementationFiles: ['src/components/HomeScreen.tsx', 'src/game/expeditionAbilityPolicies.ts'],
    testFiles: ['tests/expeditionAbilityPolicies.test.ts', 'tests/mechanicRegistry.test.ts'],
  },
  prophecy: {
    implementationFiles: [
      'src/components/home/tabs/SettingTab.tsx',
      'src/game/expeditionAbilityPolicies.ts',
      'src/hooks/useGameState.ts',
    ],
    testFiles: ['tests/expeditionAbilityPolicies.test.ts', 'tests/mechanicRegistry.test.ts'],
  },
  unlock: {
    implementationFiles: [
      'src/game/expeditionRunContext.ts',
      'src/game/expeditionRewardContext.ts',
      'src/game/expeditionEffects/rewardDrops.ts',
      'src/game/expeditionRoomVictory.ts',
      'src/hooks/useGameState.ts',
    ],
    testFiles: [
      'tests/expeditionRunContext.test.cjs',
      'tests/expeditionRewardContext.test.cjs',
      'tests/rewardDrops.test.ts',
      'tests/expeditionRoomVictory.test.cjs',
      'tests/expeditionSimulation.test.ts',
    ],
  },
};

const EXPEDITION_TERRAIN_BINDING_LOCATIONS: Partial<Record<TerrainEffectKey, ExpeditionBindingLocations>> = {
  'terrain.rejuvenation': {
    implementationFiles: POST_BATTLE_TERRAIN_IMPLEMENTATION_FILES,
    testFiles: POST_BATTLE_TERRAIN_TEST_FILES,
  },
  'terrain.rotwood': {
    implementationFiles: POST_BATTLE_TERRAIN_IMPLEMENTATION_FILES,
    testFiles: POST_BATTLE_TERRAIN_TEST_FILES,
  },
  'terrain.abundant': {
    implementationFiles: POST_BATTLE_TERRAIN_IMPLEMENTATION_FILES,
    testFiles: POST_BATTLE_TERRAIN_TEST_FILES,
  },
  'terrain.heatwave': {
    implementationFiles: POST_BATTLE_TERRAIN_IMPLEMENTATION_FILES,
    testFiles: POST_BATTLE_TERRAIN_TEST_FILES,
  },
  'terrain.leakage': {
    implementationFiles: POST_BATTLE_TERRAIN_IMPLEMENTATION_FILES,
    testFiles: POST_BATTLE_TERRAIN_TEST_FILES,
  },
  'terrain.decay': {
    implementationFiles: POST_BATTLE_TERRAIN_IMPLEMENTATION_FILES,
    testFiles: POST_BATTLE_TERRAIN_TEST_FILES,
  },
  'terrain.chill': {
    implementationFiles: [
      'src/components/HomeScreen.tsx',
      'src/game/afkScheduler.ts',
      'src/game/expeditionRunContext.ts',
      'src/game/expeditionBattleRoom.ts',
    ],
    testFiles: [
      'tests/afkScheduler.test.ts',
      'tests/expeditionRunContext.test.cjs',
      'tests/expeditionBattleRoom.test.cjs',
      'tests/mechanicRegistry.test.ts',
    ],
  },
  'terrain.looping-path': {
    implementationFiles: [
      'src/components/HomeScreen.tsx',
      'src/game/afkScheduler.ts',
      'src/game/expeditionRunContext.ts',
      'src/game/expeditionBattleRoom.ts',
    ],
    testFiles: [
      'tests/afkScheduler.test.ts',
      'tests/expeditionRunContext.test.cjs',
      'tests/expeditionBattleRoom.test.cjs',
      'tests/mechanicRegistry.test.ts',
    ],
  },
  'terrain.gehenna': {
    implementationFiles: [
      'src/game/expeditionRunContext.ts',
      'src/game/expeditionBattleRoom.ts',
      'src/game/expeditionRoomVictory.ts',
      'src/game/expeditionEffects/postBattleEffects.ts',
      'src/game/expeditionEffects/rewardDrops.ts',
      'src/hooks/useGameState.ts',
    ],
    testFiles: [
      'tests/expeditionRunContext.test.cjs',
      'tests/expeditionBattleRoom.test.cjs',
      'tests/expeditionRoomVictory.test.cjs',
      'tests/postBattleEffects.test.ts',
      'tests/rewardDrops.test.ts',
      'tests/expeditionSimulation.test.ts',
    ],
  },
};

function freezeBinding(binding: MechanicExecutionBinding): MechanicExecutionBinding {
  return Object.freeze({
    ...binding,
    implementationFiles: Object.freeze([...binding.implementationFiles]),
    testFiles: Object.freeze([...binding.testFiles]),
  });
}

function kernelBinding(): MechanicExecutionBinding {
  return freezeBinding({
    scope: 'battle',
    authority: 'kernel-native',
    randomness: 'kernel-rng',
    implementationFiles: ['native/battle_protocol.cpp', 'native/battle_rules.cpp'],
    testFiles: ['tests/battleProtocol.test.ts', 'tests/battleGolden.test.cjs'],
  });
}

function expeditionBinding(locations: ExpeditionBindingLocations): MechanicExecutionBinding {
  return freezeBinding({
    scope: 'expedition',
    authority: 'expedition-domain',
    randomness: 'gameplay-rng',
    implementationFiles: locations.implementationFiles,
    testFiles: locations.testFiles,
  });
}

function metadataBinding(kind: 'ability' | 'terrain'): MechanicExecutionBinding {
  return freezeBinding({
    scope: 'projection',
    authority: 'metadata-only',
    randomness: 'none',
    implementationFiles: kind === 'terrain'
      ? ['src/data/glossary.ts', 'src/data/dungeons.ts']
      : ['src/game/characterComputation.ts', 'src/data/abilityNames.ts'],
    testFiles: kind === 'terrain'
      ? ['tests/battleProtocolGeneration.test.cjs']
      : ['tests/classes.test.ts', 'tests/battleProtocolGeneration.test.cjs'],
  });
}

function abilityBindings(id: AbilityId): readonly MechanicExecutionBinding[] {
  const ownership = BATTLE_ABILITY_OWNERSHIP[id];
  const bindings: MechanicExecutionBinding[] = [];
  if (ownership !== 'external_post_battle' && ownership !== 'inert_metadata') bindings.push(kernelBinding());
  if (EXPEDITION_ABILITY_IDS.has(id)) {
    const locations = EXPEDITION_ABILITY_BINDING_LOCATIONS[id];
    if (!locations) throw new Error(`Missing expedition ability binding locations: ${id}`);
    bindings.push(expeditionBinding(locations));
  }
  if (bindings.length === 0) bindings.push(metadataBinding('ability'));
  return Object.freeze(bindings);
}

function terrainBindings(id: TerrainEffectKey): readonly MechanicExecutionBinding[] {
  const bindings: MechanicExecutionBinding[] = [];
  if (!EXPEDITION_TERRAIN_IDS.has(id) || DUAL_SCOPE_TERRAIN_IDS.has(id)) bindings.push(kernelBinding());
  if (EXPEDITION_TERRAIN_IDS.has(id)) {
    const locations = EXPEDITION_TERRAIN_BINDING_LOCATIONS[id];
    if (!locations) throw new Error(`Missing expedition terrain binding locations: ${id}`);
    bindings.push(expeditionBinding(locations));
  }
  if (bindings.length === 0) bindings.push(metadataBinding('terrain'));
  return Object.freeze(bindings);
}

function createAbilityDefinition(runtimeId: AbilityId, wireId: number): CoreAbilityMechanicDefinition {
  const timing = ABILITY_TIMINGS[runtimeId];
  return Object.freeze({
    key: `core:${runtimeId}`,
    kind: 'ability',
    runtimeId,
    wireId,
    category: ABILITY_CATEGORY_BY_ID[runtimeId],
    battleOwnership: BATTLE_ABILITY_OWNERSHIP[runtimeId],
    maxLevel: ABILITY_MAX_LEVELS[runtimeId] ?? 1,
    ...(timing ? { timing: Object.freeze({ ...timing }) } : {}),
    presentation: Object.freeze({
      nameKey: `masterData.ability.${runtimeId}.name`,
      ...(!ABILITIES_WITHOUT_GLOSSARY_LABEL.has(runtimeId)
        ? { labelKey: `ability.${runtimeId}.label` }
        : {}),
      descriptionKey: `ability.${runtimeId}.description`,
    }),
    bindings: abilityBindings(runtimeId),
  });
}

function terrainPresentationKeys(wireId: number): { labelKey: string; descriptionKey: string } {
  const prefix = wireId === 1 ? 'data.glossary.2_1_10' : `data.glossary.${137 + wireId}`;
  return { labelKey: `${prefix}.label`, descriptionKey: `${prefix}.description` };
}

function createTerrainDefinition(runtimeId: TerrainEffectKey, wireId: number): CoreTerrainMechanicDefinition {
  return Object.freeze({
    key: `core:${runtimeId}`,
    kind: 'terrain',
    runtimeId,
    wireId,
    presentation: Object.freeze(terrainPresentationKeys(wireId)),
    bindings: terrainBindings(runtimeId),
  });
}

const abilityDefinitions = Object.entries(BATTLE_ABILITY_IDS)
  .sort((left, right) => left[1] - right[1])
  .map(([runtimeId, wireId]) => createAbilityDefinition(runtimeId as AbilityId, wireId));

const terrainDefinitions = Object.entries(BATTLE_TERRAIN_IDS)
  .sort((left, right) => left[1] - right[1])
  .map(([runtimeId, wireId]) => createTerrainDefinition(runtimeId as TerrainEffectKey, wireId));

export const CORE_MECHANIC_DEFINITIONS: readonly CoreMechanicDefinition[] = Object.freeze([
  ...abilityDefinitions,
  ...terrainDefinitions,
]);
