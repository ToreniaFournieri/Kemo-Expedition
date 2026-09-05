import type { BattleLogEntry } from '../../types/index.ts';
import { t } from '../../i18n/index.ts';
import type { AuriferousNarrationFact } from './auriferousEffect.ts';

const AURIFEROUS_LOGS = [
  t('auto.jp.6210566513'),
  t('auto.jp.fe83eae722'),
  t('auto.jp.ca50cc6a99'),
  t('auto.jp.24a6922d44'),
  t('auto.jp.cd3b6f0501'),
  t('auto.jp.daafdc6596'),
  t('auto.jp.9932e8fabf'),
  t('auto.jp.8a3caa810b'),
  t('auto.jp.01bba62abd'),
  t('auto.jp.dc0d0cd51a'),
] as const;

export function buildAuriferousLogEntry(fact: AuriferousNarrationFact): BattleLogEntry {
  const flavorText = AURIFEROUS_LOGS[fact.flavorIndex]
    ?? t('auto.jp.dc0d0cd51a');
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
