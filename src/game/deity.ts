import { Ability, ComputedCharacterStats, Party } from '../types';

export const DEITY_OPTIONS = [
  { key: 'Goddess of Restoration', name: '再生の女神' },
  { key: 'God of Attrition', name: '消耗の神' },
  { key: 'God of Cunning', name: '狡猾の神' },
  { key: 'God of Fortification', name: '防備の神' },
  { key: 'Goddess of Fertility', name: '豊穣の女神' },
  { key: 'God of Resonance', name: '共鳴の神' },
  { key: 'Goddess of Precision', name: '精密の女神' },
  { key: 'God of Fate', name: '運命の神' },
  { key: 'God of Dusk', name: '黄昏の神' },
  { key: 'Goddess of Mirage', name: '幻影の女神' },
  { key: 'God of Oblivion', name: '忘却されし神' },
  { key: 'Goddess of Discord', name: '不和の神' },
] as const;

export type DeityKey = typeof DEITY_OPTIONS[number]['key'];

const MIN_DEITY_RANK = 1;
const MAX_DEITY_RANK = 10;
const FIRST_RANK_UP_DONATION = 1000;

function calculateRankUpDonations(): number[] {
  const rankUpDonations: number[] = [];
  let previousDonation = FIRST_RANK_UP_DONATION;

  for (let rank = MIN_DEITY_RANK; rank < MAX_DEITY_RANK; rank++) {
    if (rank === MIN_DEITY_RANK) {
      rankUpDonations.push(previousDonation);
      continue;
    }

    const nextDonation = Math.round((2.5 - 0.1 * rank) * previousDonation);
    rankUpDonations.push(nextDonation);
    previousDonation = nextDonation;
  }

  return rankUpDonations;
}

const DONATION_THRESHOLDS = [0, ...calculateRankUpDonations().reduce<number[]>((thresholds, donation) => {
  thresholds.push((thresholds[thresholds.length - 1] ?? 0) + donation);
  return thresholds;
}, [])] as const;

const DEITY_NAME_MAP: Record<DeityKey, string> = DEITY_OPTIONS.reduce((acc, deity) => {
  acc[deity.key] = deity.name;
  return acc;
}, {} as Record<DeityKey, string>);

const DEITY_KEY_BY_NAME: Record<string, DeityKey> = DEITY_OPTIONS.reduce((acc, deity) => {
  acc[deity.key] = deity.key;
  acc[deity.name] = deity.key;
  return acc;
}, {} as Record<string, DeityKey>);

// Backward compatibility for older save data.
DEITY_KEY_BY_NAME['反響の神'] = 'God of Resonance';
DEITY_KEY_BY_NAME['再生の神'] = 'Goddess of Restoration';
DEITY_KEY_BY_NAME['命中の神'] = 'Goddess of Precision';
DEITY_KEY_BY_NAME['回避の神'] = 'God of Dusk';
DEITY_KEY_BY_NAME['God of Restoration'] = 'Goddess of Restoration';
DEITY_KEY_BY_NAME['God of Precision'] = 'Goddess of Precision';
DEITY_KEY_BY_NAME['God of Evasion'] = 'God of Dusk';


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
  return Math.min(MAX_DEITY_RANK, getDonationTier(totalDonatedGold) + 1);
}

export function getNextDonationThreshold(totalDonatedGold: number): number | null {
  const safeDonation = Math.max(0, totalDonatedGold);
  const currentTier = getDonationTier(safeDonation);
  const nextThreshold = DONATION_THRESHOLDS[currentTier + 1];
  if (nextThreshold === undefined) {
    return null;
  }

  return Math.max(0, nextThreshold - safeDonation);
}

export function getEffectiveDeityTier(totalDonatedGold: number): number {
  return Math.min(getDonationTier(totalDonatedGold), MAX_DEITY_RANK);
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

    const nextLevel = Math.min(5, ability.level + upgradeTiers);
    const perNoA = nextLevel === 5 ? '15' : nextLevel === 4 ? '13' : nextLevel === 3 ? '11' : nextLevel === 2 ? '8' : '5';
    return {
      ...ability,
      name: `共鳴${nextLevel}`,
      level: nextLevel,
      description: `魔法攻撃1回毎に、全ヒットのダメージが +${perNoA}% 増加する`,
    };
  });
}

export function getDeityEffectDescription(name: string, totalDonatedGold = 0): string {
  const deityKey = getDeityKey(name);
  const effectiveTier = getEffectiveDeityTier(totalDonatedGold);
  switch (deityKey) {
    case 'Goddess of Restoration': {
      const healMissingPct = 0.2 + 0.001 * effectiveTier;
      return `4部屋毎に減少HPの${Math.round(healMissingPct * 100)}%を回復する。睡眠時間x1.50`;
    }
    case 'God of Attrition': {
      const attackMult = 1.2 + 0.01 * effectiveTier;
      return `全員に物理攻撃x${attackMult.toFixed(2)}。4部屋毎に残りHPの5%を失う`;
    }
    case 'God of Cunning': {
      const autoSellMultiplier = Math.min(1, 0.5 + 0.01 * effectiveTier);
      return `全員に魔法防御x2/3。貯金額x${autoSellMultiplier.toFixed(2)}`;
    }
    case 'God of Fortification': {
      return '全員に物理防御x2/3。休憩時間1.5-α倍';
    }
    case 'Goddess of Fertility': {
      const feastDuration = Math.max(1, 1.5 - 0.01 * effectiveTier);
      return `全員に先制+1。宴会時間が延びる(x${feastDuration.toFixed(2)})`;
    }
    case 'Goddess of Precision': {
      const accuracyBonus = 0.015 + 0.001 * effectiveTier;
      return `全員の命中+${(accuracyBonus * 1000).toFixed(1)}、回避-5.0。探索時間x1.50`;
    }
    case 'God of Fate': {
      const prayDuration = Math.max(1, 1.5 - 0.01 * effectiveTier);
      return `祈り時間が延びる(x${prayDuration.toFixed(2)})`;
    }
    case 'God of Dusk': {
      const evasionBonus = 0.015 + 0.001 * effectiveTier;
      const sellDuration = Math.max(1, 1.5 - 0.01 * effectiveTier);
      return `全員の回避+${(evasionBonus * 1000).toFixed(1)}、魔法防御x0.90。売却時間が延びる(x${sellDuration.toFixed(2)})`;
    }
    case 'Goddess of Mirage': {
      const magicalAttack = 1.2 + 0.01 * effectiveTier;
      return `全員に魔法攻撃x${magicalAttack.toFixed(2)}、物理防御x0.90`;
    }
    case 'God of Resonance': {
      const hpMultiplier = 0.9 + 0.002 * effectiveTier;
      return `全員の共鳴を1段階強化。共鳴が遠距離攻撃にも適用。魔法防御x0.90、HPx${hpMultiplier.toFixed(3)}`;
    }
    case 'God of Oblivion': {
      return effectiveTier >= 10 ? 'なし。追加報酬抽選+1回' : 'なし。';
    }
    case 'Goddess of Discord': {
      return '戦闘開始時、ランダム1名に⚠️敵対付与。追加報酬抽選+1回';
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
          deityOffenseAmplifierBonus: stats.deityOffenseAmplifierBonus + (1.2 + 0.01 * effectiveTier) - 1,
        };
      case 'God of Cunning':
        return {
          ...stats,
          deityDefenseAmplifierBonus: {
            physical: stats.deityDefenseAmplifierBonus.physical,
            magical: stats.deityDefenseAmplifierBonus.magical - (1 - 2 / 3),
          },
        };
      case 'God of Fortification':
        return {
          ...stats,
          deityDefenseAmplifierBonus: {
            physical: stats.deityDefenseAmplifierBonus.physical - (1 - 2 / 3),
            magical: stats.deityDefenseAmplifierBonus.magical,
          },
        };
      case 'Goddess of Fertility': {
        const firstStrike = stats.abilities.find((ability) => ability.id === 'first_strike');
        return {
          ...stats,
          abilities: firstStrike
            ? stats.abilities.map((ability) => (
              ability.id === 'first_strike'
                ? { ...ability, level: ability.level + 1, name: `先制攻撃${ability.level + 1}` }
                : ability
            ))
            : [...stats.abilities, { id: 'first_strike', level: 1, name: '先制攻撃1', description: '' }],
        };
      }
      case 'Goddess of Precision':
        return {
          ...stats,
          accuracyBonus: stats.accuracyBonus + (0.015 + 0.001 * effectiveTier),
          evasionBonus: stats.evasionBonus - 0.005,
        };
      case 'God of Dusk':
        return {
          ...stats,
          evasionBonus: stats.evasionBonus + (0.015 + 0.001 * effectiveTier),
          deityDefenseAmplifierBonus: {
            physical: stats.deityDefenseAmplifierBonus.physical,
            magical: stats.deityDefenseAmplifierBonus.magical + 0.1,
          },
        };
      case 'God of Resonance':
        return {
          ...stats,
          deityDefenseAmplifierBonus: {
            physical: stats.deityDefenseAmplifierBonus.physical,
            magical: stats.deityDefenseAmplifierBonus.magical + 0.1,
          },
          abilities: upgradeResonanceAbility(stats.abilities, 1),
        };
      case 'Goddess of Mirage':
        return {
          ...stats,
          deityOffenseAmplifierBonus: stats.deityOffenseAmplifierBonus + (1.2 + 0.01 * effectiveTier) - 1,
          deityDefenseAmplifierBonus: {
            physical: stats.deityDefenseAmplifierBonus.physical + 0.1,
            magical: stats.deityDefenseAmplifierBonus.magical,
          },
        };
      default:
        return stats;
    }
  });
}

export function getDeityStateDurationMultiplier(name: string, totalDonatedGold = 0, state: 'rest' | 'sell' | 'feast' | 'sleep' | 'pray' | 'explore'): number {
  const deityKey = getDeityKey(name);
  const effectiveTier = getEffectiveDeityTier(totalDonatedGold);
  if (!deityKey) return 1;

  if (state === 'sleep' && deityKey === 'Goddess of Restoration') return 1.5;
  if (state === 'rest' && deityKey === 'God of Fortification') return Math.max(1, 1.5 - 0.01 * effectiveTier);
  if (state === 'sell' && deityKey === 'God of Dusk') return Math.max(1, 1.5 - 0.01 * effectiveTier);
  if (state === 'feast' && deityKey === 'Goddess of Fertility') return Math.max(1, 1.5 - 0.01 * effectiveTier);
  if (state === 'pray' && deityKey === 'God of Fate') return Math.max(1, 1.5 - 0.01 * effectiveTier);
  if (state === 'explore' && deityKey === 'Goddess of Precision') return 1.5;
  return 1;
}

export function getDeityPartyHpMultiplier(name: string, totalDonatedGold = 0): number {
  const deityKey = getDeityKey(name);
  if (deityKey !== 'God of Resonance') return 1;
  const effectiveTier = getEffectiveDeityTier(totalDonatedGold);
  return 0.9 + 0.002 * effectiveTier;
}

export function getDeityElementalResistanceModifier(name: string): { fire: number; thunder: number; ice: number } {
  const deityKey = getDeityKey(name);
  if (deityKey === 'Goddess of Restoration') return { fire: 1, thunder: 1, ice: 1.5 };
  if (deityKey === 'God of Fortification') return { fire: 1, thunder: 1.5, ice: 1 };
  if (deityKey === 'Goddess of Fertility') return { fire: 1.5, thunder: 1, ice: 1 };
  return { fire: 1, thunder: 1, ice: 1 };
}
