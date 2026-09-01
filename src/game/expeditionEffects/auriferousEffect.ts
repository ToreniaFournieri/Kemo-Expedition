export interface AuriferousAbility {
  readonly id: string;
  readonly level: number;
}

export interface AuriferousRewardEffect {
  readonly actorName: string;
  readonly totalHitsReceived: number;
  readonly bonusRolls: number;
}

export interface AuriferousNarrationFact extends AuriferousRewardEffect {
  readonly flavorIndex: number;
}

const AURIFEROUS_LOG_COUNT = 10;

type AuriferousRewardEvent = 'reward:prepare';

export interface ResolveAuriferousRewardEffectInput {
  readonly actorName: string;
  readonly abilities: readonly AuriferousAbility[];
  readonly totalHitsReceived: number;
}

export function getAuriferousLevel(abilities: readonly AuriferousAbility[]): number {
  return abilities
    .filter((ability) => ability.id === 'auriferous')
    .reduce((maximum, ability) => Math.max(maximum, ability.level), 0);
}

const auriferousRewardPipeline = createOrderedExpeditionPipeline<
  AuriferousRewardEvent,
  AuriferousRewardEffect | null,
  ResolveAuriferousRewardEffectInput
>([
  {
    id: 'core:auriferous',
    event: 'reward:prepare',
    priority: 10,
    sourceOrder: 0,
    apply(state, input) {
      if (!(getAuriferousLevel(input.abilities) > 0)) return state;
      return {
        actorName: input.actorName,
        totalHitsReceived: input.totalHitsReceived,
        bonusRolls: Math.floor(input.totalHitsReceived / 10),
      };
    },
  },
]);

export const AURIFEROUS_REWARD_HANDLER_ORDER = auriferousRewardPipeline.handlerIdsFor('reward:prepare');

export function resolveAuriferousRewardEffect(
  input: ResolveAuriferousRewardEffectInput,
): AuriferousRewardEffect | null {
  return auriferousRewardPipeline.run('reward:prepare', null, input);
}

export function drawAuriferousNarrationFact(
  effect: AuriferousRewardEffect,
  random: () => number,
): AuriferousNarrationFact {
  return {
    ...effect,
    flavorIndex: Math.floor(random() * AURIFEROUS_LOG_COUNT),
  };
}
import { createOrderedExpeditionPipeline } from '../events/orderedExpeditionPipeline.ts';
