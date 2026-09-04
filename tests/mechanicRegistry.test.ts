import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import en from '../src/i18n/en.ts';
import ja from '../src/i18n/ja.ts';
import zhCN from '../src/i18n/zh-CN.ts';
import zhTW from '../src/i18n/zh-TW.ts';
import { BATTLE_ABILITY_OWNERSHIP } from '../src/game/battleAbilityOwnership.ts';
import { BATTLE_ABILITY_IDS, BATTLE_TERRAIN_IDS } from '../src/game/generated/battleProtocol.generated.ts';
import { CORE_MECHANIC_DEFINITIONS } from '../src/game/mechanics/coreMechanics.ts';
import { CORE_MECHANIC_REGISTRY, MechanicRegistry } from '../src/game/mechanics/mechanicRegistry.ts';

test('core mechanic registry exactly covers append-only ability and terrain IDs', () => {
  const definitions = CORE_MECHANIC_REGISTRY.list();
  const abilities = definitions.filter((entry) => entry.kind === 'ability');
  const terrains = definitions.filter((entry) => entry.kind === 'terrain');
  assert.equal(abilities.length, Object.keys(BATTLE_ABILITY_IDS).length);
  assert.equal(terrains.length, Object.keys(BATTLE_TERRAIN_IDS).length);
  assert.deepEqual(abilities.map((entry) => entry.wireId), Object.values(BATTLE_ABILITY_IDS));
  assert.deepEqual(terrains.map((entry) => entry.wireId), Object.values(BATTLE_TERRAIN_IDS));
  abilities.forEach((entry) => assert.equal(entry.battleOwnership, BATTLE_ABILITY_OWNERSHIP[entry.runtimeId]));
});

test('core mechanic definitions and nested registry metadata are immutable', () => {
  assert.ok(Object.isFrozen(CORE_MECHANIC_DEFINITIONS));
  assert.ok(Object.isFrozen(CORE_MECHANIC_REGISTRY.list()));
  for (const definition of CORE_MECHANIC_REGISTRY.list()) {
    assert.ok(Object.isFrozen(definition));
    assert.ok(Object.isFrozen(definition.bindings));
    assert.ok(Object.isFrozen(definition.presentation));
    definition.bindings.forEach((binding) => {
      assert.ok(Object.isFrozen(binding));
      assert.ok(Object.isFrozen(binding.implementationFiles));
      assert.ok(Object.isFrozen(binding.testFiles));
    });
  }
});

test('registry rejects duplicate mechanic definitions', () => {
  const first = CORE_MECHANIC_DEFINITIONS[0];
  assert.ok(first);
  assert.throws(() => new MechanicRegistry([first, first]), /Duplicate mechanic key/u);
});

test('known cross-scope and externally owned mechanics have explicit bindings', () => {
  const momentum = CORE_MECHANIC_REGISTRY.require('core:momentum');
  assert.deepEqual(momentum.bindings.map((binding) => binding.scope), ['battle', 'expedition']);
  const firstAid = CORE_MECHANIC_REGISTRY.require('core:first_aid');
  assert.deepEqual(firstAid.bindings.map((binding) => binding.authority), ['expedition-domain']);
  const chill = CORE_MECHANIC_REGISTRY.require('core:terrain.chill');
  assert.deepEqual(chill.bindings.map((binding) => binding.authority), ['expedition-domain']);
  const gehenna = CORE_MECHANIC_REGISTRY.require('core:terrain.gehenna');
  assert.deepEqual(gehenna.bindings.map((binding) => binding.scope), ['battle', 'expedition']);
});

test('expedition mechanics identify their actual implementation boundaries', () => {
  const expeditionBinding = (key: Parameters<typeof CORE_MECHANIC_REGISTRY.require>[0]) => {
    const binding = CORE_MECHANIC_REGISTRY.require(key).bindings.find((candidate) => candidate.scope === 'expedition');
    assert.ok(binding, `${key} is missing its expedition binding`);
    return binding;
  };

  assert.deepEqual(expeditionBinding('core:first_aid').implementationFiles, [
    'src/game/expeditionRunContext.ts',
    'src/game/expeditionRoomVictory.ts',
    'src/game/events/orderedExpeditionPipeline.ts',
    'src/game/expeditionEffects/postBattleEffects.ts',
    'src/game/expeditionEffects/postBattleEffectNarration.ts',
    'src/hooks/useGameState.ts',
  ]);
  assert.deepEqual(expeditionBinding('core:auriferous').implementationFiles, [
    'src/game/events/orderedExpeditionPipeline.ts',
    'src/game/expeditionEffects/auriferousEffect.ts',
    'src/game/expeditionEffects/auriferousNarration.ts',
    'src/game/expeditionRoomVictory.ts',
    'src/hooks/useGameState.ts',
  ]);
  assert.deepEqual(expeditionBinding('core:peddler').implementationFiles, [
    'src/components/HomeScreen.tsx',
    'src/game/expeditionAbilityPolicies.ts',
  ]);
  assert.deepEqual(expeditionBinding('core:prophecy').implementationFiles, [
    'src/components/home/tabs/SettingTab.tsx',
    'src/game/expeditionAbilityPolicies.ts',
    'src/hooks/useGameState.ts',
  ]);
  assert.deepEqual(expeditionBinding('core:terrain.chill').implementationFiles, [
    'src/components/HomeScreen.tsx',
    'src/game/afkScheduler.ts',
    'src/game/expeditionRunContext.ts',
    'src/game/expeditionBattleRoom.ts',
  ]);
  assert.deepEqual(expeditionBinding('core:terrain.rotwood').implementationFiles, [
    'src/game/expeditionRunContext.ts',
    'src/game/expeditionBattleRoom.ts',
    'src/game/expeditionRoomVictory.ts',
    'src/game/events/orderedExpeditionPipeline.ts',
    'src/game/expeditionEffects/postBattleEffects.ts',
    'src/game/expeditionEffects/postBattleEffectNarration.ts',
    'src/hooks/useGameState.ts',
  ]);
  assert.deepEqual(expeditionBinding('core:unlock').implementationFiles, [
    'src/game/expeditionRunContext.ts',
    'src/game/expeditionRewardContext.ts',
    'src/game/expeditionEffects/rewardDrops.ts',
    'src/game/expeditionRoomVictory.ts',
    'src/hooks/useGameState.ts',
  ]);
});

test('every mechanic binding points to checked-in implementation and test files', () => {
  for (const definition of CORE_MECHANIC_REGISTRY.list()) {
    for (const binding of definition.bindings) {
      for (const path of [...binding.implementationFiles, ...binding.testFiles]) {
        assert.equal(existsSync(path), true, `${definition.key} references missing ${path}`);
      }
    }
  }
});

test('every core mechanic presentation key exists in all supported dictionaries', () => {
  const dictionaries = { ja, en, 'zh-CN': zhCN, 'zh-TW': zhTW } as const;
  for (const definition of CORE_MECHANIC_REGISTRY.list()) {
    const keys = Object.values(definition.presentation).filter((key): key is string => typeof key === 'string');
    for (const [language, dictionary] of Object.entries(dictionaries)) {
      for (const key of keys) assert.ok(key in dictionary, `${definition.key} is missing ${language}:${key}`);
    }
  }
});

test('every existing glossary mechanic reference resolves through the core registry', () => {
  const abilitySource = readFileSync(new URL('../src/data/bonusAbilityGlossary.ts', import.meta.url), 'utf8');
  const abilityIds = [...abilitySource.matchAll(/abilityId: '([^']+)'/gu)].map((match) => match[1]);
  abilityIds.forEach((id) => assert.ok(CORE_MECHANIC_REGISTRY.get(`core:${id}` as Parameters<typeof CORE_MECHANIC_REGISTRY.get>[0])));

  const terrainSource = readFileSync(new URL('../src/data/glossary.ts', import.meta.url), 'utf8');
  const terrainIds = [...terrainSource.matchAll(/"key": "(terrain\.[^"]+)"/gu)].map((match) => match[1]);
  terrainIds.forEach((id) => assert.ok(CORE_MECHANIC_REGISTRY.get(`core:${id}` as Parameters<typeof CORE_MECHANIC_REGISTRY.get>[0])));
});

test('generated core mechanic inventory is current', () => {
  assert.doesNotThrow(() => execFileSync(
    process.execPath,
    ['--experimental-strip-types', 'scripts/generate-mechanic-inventory.mjs', '--check'],
    { cwd: process.cwd(), stdio: 'pipe' },
  ));
});
