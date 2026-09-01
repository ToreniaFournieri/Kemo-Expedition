import type { AbilityId, TerrainEffectKey } from '../../types/index.ts';
import type { BattleAbilityOwnership } from '../battleAbilityOwnership.ts';

export type MechanicExecutionAuthority = 'kernel-native' | 'expedition-domain' | 'metadata-only';
export type MechanicRandomnessAuthority = 'kernel-rng' | 'gameplay-rng' | 'none';
export type MechanicScope = 'battle' | 'expedition' | 'projection';
export type MechanicPhase = 'START' | 'COMBAT' | 'END';
export type MechanicCategory = 'passive' | 'expedition' | 'reactive' | 'timed';
export type CoreMechanicKey = `core:${AbilityId | TerrainEffectKey}`;

export interface MechanicExecutionBinding {
  readonly scope: MechanicScope;
  readonly authority: MechanicExecutionAuthority;
  readonly randomness: MechanicRandomnessAuthority;
  readonly implementationFiles: readonly string[];
  readonly testFiles: readonly string[];
}

export interface MechanicTiming {
  readonly phase: MechanicPhase;
  readonly priority: number;
}

interface CoreMechanicDefinitionBase {
  readonly key: CoreMechanicKey;
  readonly wireId: number;
  readonly bindings: readonly MechanicExecutionBinding[];
}

export interface CoreAbilityMechanicDefinition extends CoreMechanicDefinitionBase {
  readonly kind: 'ability';
  readonly runtimeId: AbilityId;
  readonly category: MechanicCategory;
  readonly battleOwnership: BattleAbilityOwnership;
  readonly maxLevel: number;
  readonly timing?: MechanicTiming;
  readonly presentation: {
    readonly nameKey: string;
    readonly labelKey?: string;
    readonly descriptionKey: string;
  };
}

export interface CoreTerrainMechanicDefinition extends CoreMechanicDefinitionBase {
  readonly kind: 'terrain';
  readonly runtimeId: TerrainEffectKey;
  readonly presentation: {
    readonly labelKey: string;
    readonly descriptionKey: string;
  };
}

export type CoreMechanicDefinition = CoreAbilityMechanicDefinition | CoreTerrainMechanicDefinition;
