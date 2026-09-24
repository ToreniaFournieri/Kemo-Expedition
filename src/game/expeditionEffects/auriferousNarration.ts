import type { BattleLogEntry } from '../../types/index.ts';
import { t } from '../../i18n/index.ts';
import type { AuriferousNarrationFact } from './auriferousEffect.ts';

const AURIFEROUS_LOGS = [
  'battleFlavor.auriferous.1',
  'battleFlavor.auriferous.2',
  'battleFlavor.auriferous.3',
  'battleFlavor.auriferous.4',
  'battleFlavor.auriferous.5',
  'battleFlavor.auriferous.6',
  'battleFlavor.auriferous.7',
  'battleFlavor.auriferous.8',
  'battleFlavor.auriferous.9',
  'battleFlavor.auriferous.10',
] as const;

export function buildAuriferousLogEntry(fact: AuriferousNarrationFact): BattleLogEntry {
  const flavorText = t(AURIFEROUS_LOGS[fact.flavorIndex]
    ?? 'battleFlavor.auriferous.10');
  return {
    phase: 'end',
    actor: 'effect',
    action: flavorText.replace('{actor}', fact.actorName),
    note: t('game.log.auriferousBonus', {
      totalHits: fact.totalHitsReceived,
      bonusRolls: fact.bonusRolls,
    }),
  };
}
