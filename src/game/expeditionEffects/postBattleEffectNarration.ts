import type { BattleLogEntry } from '../../types/index.ts';
import { t } from '../../i18n/index.ts';
import type { PostBattleEffectNarrationFact } from './postBattleEffects.ts';

function flavor(prefix: string, index: number, params?: Record<string, string | number>): string {
  return t(`${prefix}.${index}`, params);
}

export function buildPostBattleEffectLogs(
  facts: readonly PostBattleEffectNarrationFact[],
): BattleLogEntry[] {
  return facts.map((fact): BattleLogEntry => {
    switch (fact.type) {
      case 'deity-restoration':
        return {
          phase: 'end', actor: 'effect', action: t('auto.jp.b871f82e74'),
          note: t('game.log.hpHeal', { amount: fact.amount }),
        };
      case 'deity-attrition':
        return {
          phase: 'end', actor: 'effect', action: t('auto.jp.f8c08c2728'),
          note: t('game.log.hpAttrition', { amount: fact.amount }),
        };
      case 'first-aid':
        return {
          phase: 'end', actor: 'effect',
          action: flavor('battleFlavor.passive.firstAid', fact.flavorIndex, { actor: fact.actorName }),
          note: t('game.log.hpHeal', { amount: fact.amount }),
        };
      case 'terrain-rejuvenation':
        return {
          phase: 'end', actor: 'effect',
          action: flavor('battleFlavor.environment.regeneration', fact.flavorIndex, { actor: fact.actorName }),
          note: t('game.log.hpHeal', { amount: fact.amount }),
        };
      case 'terrain-abundant':
        return {
          phase: 'end', actor: 'effect',
          action: flavor('battleFlavor.environment.abundant', fact.flavorIndex),
          note: t('game.log.hpHeal', { amount: fact.amount }),
        };
      case 'terrain-rotwood':
        return {
          phase: 'end', actor: 'effect',
          action: flavor('battleFlavor.environment.decayBlocked', fact.flavorIndex),
        };
      case 'terrain-leakage':
        return {
          phase: 'end', actor: 'effect',
          action: flavor('battleFlavor.environment.shock', fact.flavorIndex, { target: fact.targetName }),
          note: t('game.log.hpThunderDamage', { amount: fact.amount }),
        };
      case 'terrain-heatwave':
        return {
          phase: 'end', actor: 'effect', effectKind: 'terrain',
          action: flavor('battleFlavor.environment.heatwave', fact.flavorIndex, { actor: fact.actorName }),
          note: t('game.log.hpDamage', { amount: fact.amount }),
        };
      case 'terrain-decay':
        return {
          phase: 'end', actor: 'effect',
          action: flavor('battleFlavor.environment.decay', fact.flavorIndex),
          note: t('game.log.hpDamage', { amount: fact.amount }),
        };
    }
  });
}
