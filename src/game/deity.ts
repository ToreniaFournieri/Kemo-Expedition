import { Ability, ComputedCharacterStats, Party } from '../types';

export const DEITY_OPTIONS = [
  { key: 'God of Restoration', name: '再生の神' },
  { key: 'God of Attrition', name: '消耗の神' },
  { key: 'God of Fortification', name: '防備の神' },
  { key: 'God of Precision', name: '命中の神' },
  { key: 'God of Evasion', name: '回避の神' },
  { key: 'God of Resonance', name: '反響の神' },
] as const;

export type DeityKey = typeof DEITY_OPTIONS[number]['key'];

const DEITY_NAME_MAP: Record<DeityKey, string> = DEITY_OPTIONS.reduce((acc, deity) => {
  acc[deity.key] = deity.name;
  return acc;
}, {} as Record<DeityKey, string>);

const DEITY_KEY_BY_NAME: Record<string, DeityKey> = DEITY_OPTIONS.reduce((acc, deity) => {
  acc[deity.key] = deity.key;
  acc[deity.name] = deity.key;
  return acc;
}, {} as Record<string, DeityKey>);

export function normalizeDeityName(name: string): string {
  return DEITY_KEY_BY_NAME[name] ? DEITY_NAME_MAP[DEITY_KEY_BY_NAME[name]] : name;
}

export function getDeityKey(name: string): DeityKey | null {
  return DEITY_KEY_BY_NAME[name] ?? null;
}

function upgradeResonanceAbility(abilities: Ability[]): Ability[] {
  return abilities.map((ability) => {
    if (ability.id !== 'resonance') {
      return ability;
    }

    const nextLevel = Math.min(3, ability.level + 1);
    const perNoA = nextLevel === 3 ? '11' : nextLevel === 2 ? '8' : '5';
    return {
      ...ability,
      level: nextLevel,
      description: `全攻撃ヒット毎に魔攻撃回数×${perNoA}%の追加補正`,
    };
  });
}

export function applyDeityCharacterModifiers(
  party: Party,
  characterStats: ComputedCharacterStats[]
): ComputedCharacterStats[] {
  const deityKey = getDeityKey(party.deity.name);
  if (!deityKey) {
    return characterStats;
  }

  return characterStats.map((stats) => {
    switch (deityKey) {
      case 'God of Attrition':
        return {
          ...stats,
          meleeAttack: stats.meleeAttack + 20,
          rangedAttack: stats.rangedAttack + 20,
          magicalAttack: stats.magicalAttack + 20,
        };
      case 'God of Fortification':
        return {
          ...stats,
          physicalDefense: stats.physicalDefense + 10,
          magicalDefense: stats.magicalDefense + 10,
        };
      case 'God of Precision':
        return {
          ...stats,
          accuracyBonus: stats.accuracyBonus + 0.02,
          evasionBonus: stats.evasionBonus - 0.005,
        };
      case 'God of Evasion':
        return {
          ...stats,
          evasionBonus: stats.evasionBonus + 0.015,
        };
      case 'God of Resonance':
        return {
          ...stats,
          magicalDefense: stats.magicalDefense - 5,
          abilities: upgradeResonanceAbility(stats.abilities),
        };
      default:
        return stats;
    }
  });
}
