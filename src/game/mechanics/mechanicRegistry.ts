import { CORE_MECHANIC_DEFINITIONS } from './coreMechanics.ts';
import type { CoreMechanicDefinition, CoreMechanicKey } from './mechanicTypes.ts';
import { validateCoreMechanicCoverage, validateMechanicDefinitions } from './validateMechanicRegistry.ts';

export class MechanicRegistry {
  private readonly definitions: readonly CoreMechanicDefinition[];
  private readonly byKey: ReadonlyMap<CoreMechanicKey, CoreMechanicDefinition>;

  constructor(definitions: readonly CoreMechanicDefinition[], validateCoreCoverage = false) {
    if (validateCoreCoverage) validateCoreMechanicCoverage(definitions);
    else validateMechanicDefinitions(definitions);
    this.definitions = Object.freeze([...definitions]);
    this.byKey = new Map(this.definitions.map((definition) => [definition.key, definition]));
  }

  list(): readonly CoreMechanicDefinition[] {
    return this.definitions;
  }

  get(key: CoreMechanicKey): CoreMechanicDefinition | undefined {
    return this.byKey.get(key);
  }

  require(key: CoreMechanicKey): CoreMechanicDefinition {
    const definition = this.get(key);
    if (!definition) throw new Error(`Unknown mechanic: ${key}`);
    return definition;
  }
}

export const CORE_MECHANIC_REGISTRY = Object.freeze(new MechanicRegistry(CORE_MECHANIC_DEFINITIONS, true));
