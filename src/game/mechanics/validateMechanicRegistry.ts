import { BATTLE_ABILITY_OWNERSHIP } from '../battleAbilityOwnership.ts';
import { BATTLE_ABILITY_IDS, BATTLE_TERRAIN_IDS } from '../generated/battleProtocol.generated.ts';
import type { CoreMechanicDefinition } from './mechanicTypes.ts';

function equalSorted(left: readonly string[], right: readonly string[]): boolean {
  return [...left].sort().join('\u0000') === [...right].sort().join('\u0000');
}

export function validateMechanicDefinitions(definitions: readonly CoreMechanicDefinition[]): void {
  const keys = new Set<string>();
  const runtimeIds = new Set<string>();
  const wireIdsByKind = new Map<string, Set<number>>();

  for (const definition of definitions) {
    if (keys.has(definition.key)) throw new Error(`Duplicate mechanic key: ${definition.key}`);
    keys.add(definition.key);
    const runtimeKey = `${definition.kind}:${definition.runtimeId}`;
    if (runtimeIds.has(runtimeKey)) throw new Error(`Duplicate mechanic runtime ID: ${runtimeKey}`);
    runtimeIds.add(runtimeKey);

    if (!Number.isSafeInteger(definition.wireId) || definition.wireId <= 0) {
      throw new Error(`Invalid mechanic wire ID for ${definition.key}`);
    }
    const wireIds = wireIdsByKind.get(definition.kind) ?? new Set<number>();
    if (wireIds.has(definition.wireId)) {
      throw new Error(`Duplicate ${definition.kind} wire ID: ${definition.wireId}`);
    }
    wireIds.add(definition.wireId);
    wireIdsByKind.set(definition.kind, wireIds);

    if (definition.bindings.length === 0) throw new Error(`Mechanic has no execution binding: ${definition.key}`);
    const scopes = new Set<string>();
    for (const binding of definition.bindings) {
      if (scopes.has(binding.scope)) throw new Error(`Duplicate ${binding.scope} binding: ${definition.key}`);
      scopes.add(binding.scope);
      if (binding.implementationFiles.length === 0) throw new Error(`Missing implementation location: ${definition.key}`);
      if (binding.testFiles.length === 0) throw new Error(`Missing test location: ${definition.key}`);
    }

    if (definition.kind === 'ability') {
      if (!definition.category) throw new Error(`Missing ability category: ${definition.key}`);
      if (!Number.isSafeInteger(definition.maxLevel) || definition.maxLevel <= 0) {
        throw new Error(`Invalid maximum level: ${definition.key}`);
      }
      if (definition.timing && (!Number.isSafeInteger(definition.timing.priority) || definition.timing.priority < 0)) {
        throw new Error(`Invalid timing priority: ${definition.key}`);
      }
    }
  }
}

export function validateCoreMechanicCoverage(definitions: readonly CoreMechanicDefinition[]): void {
  validateMechanicDefinitions(definitions);
  const abilities = definitions.filter((entry) => entry.kind === 'ability');
  const terrains = definitions.filter((entry) => entry.kind === 'terrain');
  if (!equalSorted(abilities.map((entry) => entry.runtimeId), Object.keys(BATTLE_ABILITY_IDS))) {
    throw new Error('Core mechanic registry does not exactly cover the append-only ability IDs');
  }
  if (!equalSorted(terrains.map((entry) => entry.runtimeId), Object.keys(BATTLE_TERRAIN_IDS))) {
    throw new Error('Core mechanic registry does not exactly cover the append-only terrain IDs');
  }
  for (const ability of abilities) {
    if (ability.wireId !== BATTLE_ABILITY_IDS[ability.runtimeId]) {
      throw new Error(`Ability wire ID mismatch: ${ability.runtimeId}`);
    }
    if (ability.battleOwnership !== BATTLE_ABILITY_OWNERSHIP[ability.runtimeId]) {
      throw new Error(`Ability ownership mismatch: ${ability.runtimeId}`);
    }
  }
  for (const terrain of terrains) {
    if (terrain.wireId !== BATTLE_TERRAIN_IDS[terrain.runtimeId as keyof typeof BATTLE_TERRAIN_IDS]) {
      throw new Error(`Terrain wire ID mismatch: ${terrain.runtimeId}`);
    }
  }
}
