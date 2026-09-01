import type { ExpeditionLog, Item } from '../../types/index.ts';
import { getRewardRarityByItemId } from './rewardDrops.ts';

export type SideQuestProgressDecision =
  | { readonly type: 'advance'; readonly amount: number }
  | { readonly type: 'set'; readonly progress: number };

export interface ResolveSideQuestOutcomeInput {
  readonly sideQuestType: string;
  readonly finalOutcome: ExpeditionLog['finalOutcome'];
  readonly rewards: readonly Item[];
}

export function resolveSideQuestOutcome(
  input: ResolveSideQuestOutcomeInput,
): SideQuestProgressDecision | null {
  switch (input.sideQuestType) {
    case 'q.treasure_super_rare':
    case 'q.treasure-super-rare': {
      const amount = input.rewards.filter((item) => item.superRare > 0).length;
      return amount > 0 ? { type: 'advance', amount } : null;
    }
    case 'q.treasure_boss_rare':
    case 'q.treasure-boss-rare': {
      const amount = input.rewards
        .filter((item) => getRewardRarityByItemId(item.id) === 'bossRare')
        .length;
      return amount > 0 ? { type: 'advance', amount } : null;
    }
    case 'q.poor_kid':
    case 'q.poor-kid':
      return input.rewards.length === 0 ? { type: 'advance', amount: 1 } : null;
    case 'q.consecutive_wins':
    case 'q.consecutive-wins':
      return input.finalOutcome === 'Clear'
        ? { type: 'advance', amount: 1 }
        : { type: 'set', progress: 0 };
    case 'q.losers':
      return input.finalOutcome === 'Defeat' ? { type: 'advance', amount: 1 } : null;
    default:
      return null;
  }
}
