import type { BattleLogEntry } from '../../types/index.ts';
import { t } from '../../i18n/index.ts';
import type { AuriferousNarrationFact } from './auriferousEffect.ts';

const AURIFEROUS_LOGS = [
  'auto.jp.6210566513',
  'auto.jp.fe83eae722',
  'auto.jp.ca50cc6a99',
  'auto.jp.24a6922d44',
  'auto.jp.cd3b6f0501',
  'auto.jp.daafdc6596',
  'auto.jp.9932e8fabf',
  'auto.jp.8a3caa810b',
  'auto.jp.01bba62abd',
  'auto.jp.dc0d0cd51a',
] as const;

export function buildAuriferousLogEntry(fact: AuriferousNarrationFact): BattleLogEntry {
  const flavorText = t(AURIFEROUS_LOGS[fact.flavorIndex]
    ?? 'auto.jp.dc0d0cd51a');
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
