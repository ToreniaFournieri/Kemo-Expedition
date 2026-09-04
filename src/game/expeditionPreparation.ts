import type {
  Dungeon,
  GameBags,
  GameState,
  Party,
  TerrainEffectKey,
} from '../types/index.ts';
import {
  createExpeditionRunContext,
  type ExpeditionRunContext,
} from './expeditionRunContext.ts';
import type { CreateExpeditionTransactionInput } from './expeditionTransaction.ts';
import {
  computePartyStats,
  type ComputedPartyStatus,
} from './partyComputation.ts';
import { normalizeOrcaEnemyLevelOffset, type RuntimeGameMode } from './runtimeGameMode.ts';

export interface ExpeditionPartyStatusAuthority {
  readonly party: Party;
  readonly computed: ComputedPartyStatus;
}

export interface PrepareExpeditionRunInput {
  readonly currentParty: Party;
  readonly global: Pick<
    GameState['global'],
    | 'deityDonations'
    | 'enemyBattleStats'
    | 'revealedItemCompendiumItemIds'
    | 'revealedGlossaryAbilityIds'
    | 'revealedGlossaryTerrainKeys'
  >;
  readonly triggerGodsBattle?: boolean;
  readonly gameMode?: RuntimeGameMode;
  readonly enemyLevelOffset?: number;
  readonly chunkPartyStatus?: ExpeditionPartyStatusAuthority;
  readonly authoritativePartyStatus?: ExpeditionPartyStatusAuthority;
  readonly normalizeBags: (bags: Party['bags']) => GameBags;
  readonly getDungeon: (dungeonId: number) => Dungeon | undefined;
  readonly getTerrainOverride: (dungeon: Dungeon) => TerrainEffectKey | undefined;
  readonly isGodsBattleAvailable: (party: Party, dungeonId: number) => boolean;
}

export type ExpeditionRunPreparation =
  | { readonly status: 'dungeon-unavailable' }
  | {
      readonly status: 'party-hp-ineligible';
      readonly statusAuthoritySupplied: boolean;
    }
  | {
      readonly status: 'prepared';
      readonly statusAuthoritySupplied: boolean;
      readonly dungeon: Dungeon;
      readonly isGodsBattle: boolean;
      readonly statusParty: Party;
      readonly partyStatus: ComputedPartyStatus;
      readonly context: ExpeditionRunContext;
      readonly transaction: CreateExpeditionTransactionInput;
    };

/**
 * Application preflight for one authoritative expedition invocation. It owns
 * no diagnostics, random draws, inventory mutation, presentation, or state publication.
 */
export function prepareExpeditionRun(
  input: PrepareExpeditionRunInput,
): ExpeditionRunPreparation {
  const dungeon = input.getDungeon(input.currentParty.selectedDungeonId);
  if (!dungeon) return { status: 'dungeon-unavailable' };

  const isGodsBattle = input.triggerGodsBattle === true
    && input.isGodsBattleAvailable(input.currentParty, dungeon.id);
  const suppliedPartyStatus = input.chunkPartyStatus ?? input.authoritativePartyStatus;
  const statusParty = suppliedPartyStatus?.party ?? input.currentParty;
  const partyStatus = suppliedPartyStatus?.computed ?? computePartyStats(statusParty);
  const statusAuthoritySupplied = suppliedPartyStatus !== undefined;
  const persistedCurrentHp = input.currentParty.currentHp ?? partyStatus.partyStats.hp;
  if (persistedCurrentHp <= 0 || partyStatus.partyStats.hp <= 0) {
    return { status: 'party-hp-ineligible', statusAuthoritySupplied };
  }

  const terrainOverride = input.getTerrainOverride(dungeon);
  const context = createExpeditionRunContext({
    currentParty: input.currentParty,
    statusParty,
    partyStatus,
    dungeon,
    deityDonations: input.global.deityDonations,
    gameMode: input.gameMode ?? 'mode.normal',
    enemyLevelOffset: normalizeOrcaEnemyLevelOffset(input.enemyLevelOffset),
    ...(terrainOverride !== undefined ? { terrainOverride } : {}),
  });

  return {
    status: 'prepared',
    statusAuthoritySupplied,
    dungeon,
    isGodsBattle,
    statusParty,
    partyStatus,
    context,
    transaction: {
      initialHp: context.partyStats.hp,
      bags: input.normalizeBags(input.currentParty.bags),
      enemyBattleStats: input.global.enemyBattleStats,
      revealedItemIds: input.global.revealedItemCompendiumItemIds,
      revealedAbilityIds: [
        ...input.global.revealedGlossaryAbilityIds,
        ...context.characterStats.flatMap((stats) => (
          stats.abilities.map((ability) => ability.id)
        )),
      ],
      revealedTerrainKeys: input.global.revealedGlossaryTerrainKeys,
    },
  };
}
