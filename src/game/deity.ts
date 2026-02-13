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

const DONATION_THRESHOLDS = [0, 500, 1200, 2200, 3600, 5500, 8000, 11000, 14500, 18500, 23000] as const;

const DEITY_NAME_MAP: Record<DeityKey, string> = DEITY_OPTIONS.reduce((acc, deity) => {
  acc[deity.key] = deity.name;
  return acc;
}, {} as Record<DeityKey, string>);

const DEITY_KEY_BY_NAME: Record<string, DeityKey> = DEITY_OPTIONS.reduce((acc, deity) => {
  acc[deity.key] = deity.key;
  acc[deity.name] = deity.key;
  return acc;
}, {} as Record<string, DeityKey>);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getDonationTier(totalDonatedGold: number): number {
  const safeDonation = Math.max(0, totalDonatedGold);
  let tier = 0;
  for (let i = 0; i < DONATION_THRESHOLDS.length; i++) {
    if (safeDonation >= DONATION_THRESHOLDS[i]) {
      tier = i;
    }
  }
  return tier;
}

export function getDeityRank(totalDonatedGold: number): number {
  return getDonationTier(totalDonatedGold) + 1;
}

export function getNextDonationThreshold(totalDonatedGold: number): number | null {
  const safeDonation = Math.max(0, totalDonatedGold);
  const nextThreshold = DONATION_THRESHOLDS.find((threshold) => threshold > safeDonation);
  return nextThreshold ?? null;
}

export function getEffectiveDeityTier(totalDonatedGold: number): number {
  return Math.min(getDonationTier(totalDonatedGold), 10);
}

export function normalizeDeityName(name: string): string {
  return DEITY_KEY_BY_NAME[name] ? DEITY_NAME_MAP[DEITY_KEY_BY_NAME[name]] : name;
}

export function getDeityKey(name: string): DeityKey | null {
  return DEITY_KEY_BY_NAME[name] ?? null;
}

function upgradeResonanceAbility(abilities: Ability[], upgradeTiers: number): Ability[] {
  return abilities.map((ability) => {
    if (ability.id !== 'resonance') {
      return ability;
    }

    const nextLevel = Math.min(3, ability.level + upgradeTiers);
    const perNoA = nextLevel === 3 ? '11' : nextLevel === 2 ? '8' : '5';
    return {
      ...ability,
      level: nextLevel,
      description: `全攻撃ヒット毎に魔攻撃回数×${perNoA}%の追加補正`,
    };
  });
}

export function getDeityEffectDescription(name: string, totalDonatedGold = 0): string {
  const deityKey = getDeityKey(name);
  const effectiveTier = getEffectiveDeityTier(totalDonatedGold);
  switch (deityKey) {
    case 'God of Restoration': {
      const healMissingPct = clamp(0.2 + 0.005 * effectiveTier, 0.2, 0.3);
      return `4部屋毎に減少HPの${Math.round(healMissingPct * 100)}%を回復する`;
    }
    case 'God of Attrition': {
      const attackBonus = 20 + 0.5 * effectiveTier;
      const hpLossPct = Math.max(0.05 - 0.001 * effectiveTier, 0.03);
      return `全員の与ダメージ補正+${attackBonus.toFixed(1)}%。4部屋毎に残りHPの${(hpLossPct * 100).toFixed(1)}%を失う`;
    }
    case 'God of Fortification': {
      const defenseBonus = clamp(10 + 0.2 * effectiveTier, 10, 20);
      return `全員の被ダメージ補正-${defenseBonus.toFixed(1)}%（物理/魔法）`;
    }
    case 'God of Precision': {
      const accuracyBonus = clamp(0.02 + 0.0005 * effectiveTier, 0.02, 0.035);
      const evasionPenalty = clamp(-0.005 - 0.0002 * effectiveTier, -0.01, -0.005);
      return `全員の[命中+${(accuracyBonus * 1000).toFixed(1)}]、[回避${(evasionPenalty * 1000).toFixed(1)}]`;
    }
    case 'God of Evasion': {
      const evasionBonus = clamp(0.015 + 0.0006 * effectiveTier, 0.015, 0.03);
      return `全員の[回避+${(evasionBonus * 1000).toFixed(1)}]`;
    }
    case 'God of Resonance': {
      const resonanceUpgradeTiers = 1 + Math.floor(effectiveTier / 5);
      const magicalDefensePenalty = clamp(-5 + effectiveTier, -5, 0);
      return `全員の共鳴を${resonanceUpgradeTiers}段階強化し、魔法被ダメージ補正${magicalDefensePenalty.toFixed(1)}%`;
    }
    default:
      return '効果なし';
  }
}

export function applyDeityCharacterModifiers(
  party: Party,
  characterStats: ComputedCharacterStats[]
): ComputedCharacterStats[] {
  const deityKey = getDeityKey(party.deity.name);
  if (!deityKey) {
    return characterStats;
  }

  const effectiveTier = getEffectiveDeityTier(party.deityGold ?? 0);

  return characterStats.map((stats) => {
    switch (deityKey) {
      case 'God of Attrition':
        return {
          ...stats,
          deityOffenseAmplifierBonus: stats.deityOffenseAmplifierBonus + (20 + 0.5 * effectiveTier) / 100,
        };
      case 'God of Fortification': {
        const defenseBonus = clamp(10 + 0.2 * effectiveTier, 10, 20) / 100;
        return {
          ...stats,
          deityDefenseAmplifierBonus: {
            physical: stats.deityDefenseAmplifierBonus.physical - defenseBonus,
            magical: stats.deityDefenseAmplifierBonus.magical - defenseBonus,
          },
        };
      }
      case 'God of Precision':
        return {
          ...stats,
          accuracyBonus: stats.accuracyBonus + clamp(0.02 + 0.0005 * effectiveTier, 0.02, 0.035),
          evasionBonus: stats.evasionBonus + clamp(-0.005 - 0.0002 * effectiveTier, -0.01, -0.005),
        };
      case 'God of Evasion':
        return {
          ...stats,
          evasionBonus: stats.evasionBonus + clamp(0.015 + 0.0006 * effectiveTier, 0.015, 0.03),
        };
      case 'God of Resonance':
        return {
          ...stats,
          deityDefenseAmplifierBonus: {
            physical: stats.deityDefenseAmplifierBonus.physical,
            magical: stats.deityDefenseAmplifierBonus.magical - clamp(-5 + effectiveTier, -5, 0) / 100,
          },
          abilities: upgradeResonanceAbility(stats.abilities, 1 + Math.floor(effectiveTier / 5)),
        };
      default:
        return stats;
    }
  });
}
