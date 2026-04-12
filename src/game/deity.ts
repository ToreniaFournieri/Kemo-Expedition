import { ComputedCharacterStats, Party } from '../types';

export const DEITY_OPTIONS = [
  { key: 'None', name: '信仰なし' },
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

export const NO_FAITH_DEITY_NAME = '信仰なし';
const NO_FAITH_DEITY_ALIASES = new Set([NO_FAITH_DEITY_NAME, 'None', 'none']);

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

    const nextDonation = Math.round((3.0 - 0.1 * rank) * previousDonation);
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


// SpecRef: 8.6 | UI_DIVINE_BUREAU | Donation Scaling (Divine Bureau)
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

// SpecRef: 8.6 | UI_DIVINE_BUREAU | Donation Scaling (Divine Bureau)
export function getDeityRank(totalDonatedGold: number): number {
  return Math.min(MAX_DEITY_RANK, getDonationTier(totalDonatedGold) + 1);
}

// SpecRef: 8.6 | UI_DIVINE_BUREAU | Donation Scaling (Divine Bureau)
export function getNextRankDonationRequirement(totalDonatedGold: number): number | null {
  const safeDonation = Math.max(0, totalDonatedGold);
  const currentTier = getDonationTier(safeDonation);
  const nextThreshold = DONATION_THRESHOLDS[currentTier + 1];
  if (nextThreshold === undefined) {
    return null;
  }

  return nextThreshold;
}

// SpecRef: 8.6 | UI_DIVINE_BUREAU | Donation Scaling (Divine Bureau)
export function getEffectiveDeityTier(totalDonatedGold: number): number {
  return Math.min(getDonationTier(totalDonatedGold), MAX_DEITY_RANK);
}

// SpecRef: 2.1.3 | Religions lists | normalizeDeityName
export function normalizeDeityName(name: string): string {
  if (NO_FAITH_DEITY_ALIASES.has(name)) {
    return NO_FAITH_DEITY_NAME;
  }
  return DEITY_KEY_BY_NAME[name] ? DEITY_NAME_MAP[DEITY_KEY_BY_NAME[name]] : name;
}

export function isNoFaithDeity(name: string): boolean {
  return normalizeDeityName(name) === NO_FAITH_DEITY_NAME;
}

// SpecRef: 2.1.3 | Religions lists | getDeityKey
export function getDeityKey(name: string): DeityKey | null {
  return DEITY_KEY_BY_NAME[name] ?? null;
}

// SpecRef: 8.6 | UI_DIVINE_BUREAU | God scaling
export function getDeityEffectDescription(name: string, totalDonatedGold = 0): string {
  const deityKey = getDeityKey(name);
  const effectiveTier = getEffectiveDeityTier(totalDonatedGold);
  switch (deityKey) {
    case 'Goddess of Restoration': {
      const healMissingPct = 0.2 + 0.001 * effectiveTier;
      return `4部屋毎に減少HPの${Math.round(healMissingPct * 100)}%を回復する。睡眠時間2倍。氷属性に弱い(1.5倍ダメージ増)`;
    }
    case 'God of Attrition': {
      const attackMult = 1.2 + 0.01 * effectiveTier;
      return `全員に物理攻撃倍率${attackMult.toFixed(2)}倍。4部屋毎に残りHPの5%を失う。`;
    }
    case 'God of Cunning': {
      const autoSellMultiplier = Math.min(1, 0.5 + 0.01 * effectiveTier);
      return `全員に魔法防御倍率2/3倍。貯金額${autoSellMultiplier.toFixed(2)}倍(着服する)。`;
    }
    case 'God of Fortification': {
      return '全員に物理防御倍率2/3倍。休息時間2倍。雷属性に弱い(1.5倍ダメージ増)';
    }
    case 'Goddess of Fertility': {
      return '全員に先制+1。宴会時間2倍。火属性に弱い(1.5倍ダメージ増)';
    }
    case 'Goddess of Precision': {
      const accuracyBonus = 0.015 + 0.001 * effectiveTier;
      return `全員の命中+${(accuracyBonus * 1000).toFixed(0)}、回避-5。探索時間2倍`;
    }
    case 'God of Fate': {
      return '未来改変。祈り時間2倍。';
    }
    case 'God of Dusk': {
      const evasionBonus = 0.015 + 0.001 * effectiveTier;
      return `全員の回避+${(evasionBonus * 1000).toFixed(0)}、魔法防御倍率1.10倍。売却時間1.5倍。`;
    }
    case 'Goddess of Mirage': {
      const magicalAttack = 1.2 + 0.01 * effectiveTier;
      return `全員に魔法攻撃倍率${magicalAttack.toFixed(2)}倍、物理防御倍率1.10倍。`;
    }
    case 'God of Resonance': {
      const hpMultiplier = 0.9 + 0.002 * effectiveTier;
      return `全員の共鳴を1+α段階強化。共鳴は魔法攻撃だけでなく、遠距離攻撃にも適用。魔法防御倍率1.10倍、HP${hpMultiplier.toFixed(2)}倍。`;
    }
    case 'God of Oblivion': {
      return effectiveTier >= 10 ? 'なし。追加報酬抽選+1回' : 'なし。';
    }
    case 'Goddess of Discord': {
      return '戦闘開始時、ランダムな1名を⚠️敵対させる。追加報酬抽選+1回。';
    }
    default:
      return '効果なし';
  }
}

// SpecRef: 8.6 | UI_DIVINE_BUREAU | God scaling
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
      case 'Goddess of Restoration':
        return {
          ...stats,
          elementalDefenseMultipliers: {
            ...stats.elementalDefenseMultipliers,
            ice: stats.elementalDefenseMultipliers.ice * 1.5,
          },
        };
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
          elementalDefenseMultipliers: {
            ...stats.elementalDefenseMultipliers,
            thunder: stats.elementalDefenseMultipliers.thunder * 1.5,
          },
        };
      case 'Goddess of Fertility': {
        return {
          ...stats,
          elementalDefenseMultipliers: {
            ...stats.elementalDefenseMultipliers,
            fire: stats.elementalDefenseMultipliers.fire * 1.5,
          },
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

// SpecRef: 8.6 | UI_DIVINE_BUREAU | God scaling
// SpecRef: 5.1.1 | Party State Machine | Durration modifilier
export function getDeityStateDurationMultiplier(name: string, totalDonatedGold = 0, state: 'rest' | 'sell' | 'feast' | 'sound_sleep' | 'nap_sleep' | 'outfit' | 'pray' | 'explore'): number {
  const deityKey = getDeityKey(name);
  void totalDonatedGold;
  if (!deityKey) return 1;

  if ((state === 'sound_sleep' || state === 'nap_sleep') && deityKey === 'Goddess of Restoration') return 2;
  if (state === 'rest' && deityKey === 'God of Fortification') return 2;
  if (state === 'sell' && deityKey === 'God of Dusk') return 2;
  if (state === 'feast' && deityKey === 'Goddess of Fertility') return 2;
  if (state === 'pray' && deityKey === 'God of Fate') return 2;
  if (state === 'explore' && deityKey === 'Goddess of Precision') return 2;
  return 1;
}

// SpecRef: 8.6 | UI_DIVINE_BUREAU | God scaling
export function getDeityPartyHpMultiplier(name: string, totalDonatedGold = 0): number {
  const deityKey = getDeityKey(name);
  if (deityKey !== 'God of Resonance') return 1;
  const effectiveTier = getEffectiveDeityTier(totalDonatedGold);
  return 0.9 + 0.002 * effectiveTier;
}

// SpecRef: 8.6 | UI_DIVINE_BUREAU | God scaling
export function getDeityElementalResistanceModifier(name: string): { fire: number; thunder: number; ice: number } {
  const deityKey = getDeityKey(name);
  if (deityKey === 'Goddess of Restoration') return { fire: 1, thunder: 1, ice: 1.5 };
  if (deityKey === 'God of Fortification') return { fire: 1, thunder: 1.5, ice: 1 };
  if (deityKey === 'Goddess of Fertility') return { fire: 1.5, thunder: 1, ice: 1 };
  return { fire: 1, thunder: 1, ice: 1 };
}
