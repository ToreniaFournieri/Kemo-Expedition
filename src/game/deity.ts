import { SUPPORTED_LANGUAGES, t, translate } from '../i18n';
import { ComputedCharacterStats, Party } from '../types';

type DeityOptionKey =
  | 'None'
  | 'Goddess of Restoration'
  | 'God of Attrition'
  | 'God of Cunning'
  | 'God of Fortification'
  | 'Goddess of Fertility'
  | 'God of Resonance'
  | 'Goddess of Precision'
  | 'God of Fate'
  | 'God of Dusk'
  | 'Goddess of Mirage'
  | 'God of Oblivion'
  | 'Goddess of Discord';

type DeityOption = {
  key: DeityOptionKey;
  nameKey: string;
  readonly name: string;
};

function createDeityOption(key: DeityOptionKey, nameKey: string): DeityOption {
  return {
    key,
    nameKey,
    get name() {
      return t(nameKey);
    },
  };
}

export const DEITY_OPTIONS = [
  createDeityOption('None', 'deity.name.None'),
  createDeityOption('Goddess of Restoration', 'deity.name.GoddessOfRestoration'),
  createDeityOption('God of Attrition', 'deity.name.GodOfAttrition'),
  createDeityOption('God of Cunning', 'deity.name.GodOfCunning'),
  createDeityOption('God of Fortification', 'deity.name.GodOfFortification'),
  createDeityOption('Goddess of Fertility', 'deity.name.GoddessOfFertility'),
  createDeityOption('God of Resonance', 'deity.name.GodOfResonance'),
  createDeityOption('Goddess of Precision', 'deity.name.GoddessOfPrecision'),
  createDeityOption('God of Fate', 'deity.name.GodOfFate'),
  createDeityOption('God of Dusk', 'deity.name.GodOfDusk'),
  createDeityOption('Goddess of Mirage', 'deity.name.GoddessOfMirage'),
  createDeityOption('God of Oblivion', 'deity.name.GodOfOblivion'),
  createDeityOption('Goddess of Discord', 'deity.name.GoddessOfDiscord'),
] as const;

const NO_FAITH_DEITY_NAME_KEY = 'deity.name.None';
const NO_FAITH_DEITY_ALIASES = new Set(['None', 'none']);

type DeityKey = typeof DEITY_OPTIONS[number]['key'];

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

const DEITY_NAME_KEY_MAP: Record<DeityKey, string> = DEITY_OPTIONS.reduce((acc, deity) => {
  acc[deity.key] = deity.nameKey;
  return acc;
}, {} as Record<DeityKey, string>);

const DEITY_KEY_BY_NAME: Record<string, DeityKey> = DEITY_OPTIONS.reduce((acc, deity) => {
  acc[deity.key] = deity.key;
  SUPPORTED_LANGUAGES.forEach((language) => {
    acc[translate(language, deity.nameKey)] = deity.key;
  });
  return acc;
}, {} as Record<string, DeityKey>);

// Backward compatibility for older save data.
SUPPORTED_LANGUAGES.forEach((language) => {
  DEITY_KEY_BY_NAME[translate(language, 'deity.legacyName.echoGod')] = 'God of Resonance';
  DEITY_KEY_BY_NAME[translate(language, 'deity.legacyName.restorationGod')] = 'Goddess of Restoration';
  DEITY_KEY_BY_NAME[translate(language, 'deity.legacyName.accuracyGod')] = 'Goddess of Precision';
  DEITY_KEY_BY_NAME[translate(language, 'deity.legacyName.evasionGod')] = 'God of Dusk';
});
DEITY_KEY_BY_NAME['God of Restoration'] = 'Goddess of Restoration';
DEITY_KEY_BY_NAME['God of Precision'] = 'Goddess of Precision';
DEITY_KEY_BY_NAME['God of Evasion'] = 'God of Dusk';


// SpecRef: 8.6 | UI_DIVINE_BUREAU | Donation Scaling (Divine Bureau)
function getDonationTier(totalDonatedGold: number): number {
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
function getEffectiveDeityTier(totalDonatedGold: number): number {
  return Math.min(getDonationTier(totalDonatedGold), MAX_DEITY_RANK);
}

// SpecRef: 2.1.3 | Religions lists | normalizeDeityName
export function normalizeDeityName(name: string): string {
  const deityKey = getDeityKey(name);
  return deityKey ? t(DEITY_NAME_KEY_MAP[deityKey]) : name;
}

export function isNoFaithDeity(name: string): boolean {
  return getDeityKey(name) === 'None';
}

// SpecRef: 2.1.3 | Religions lists | getDeityKey
export function getDeityKey(name: string): DeityKey | null {
  if (NO_FAITH_DEITY_ALIASES.has(name) || name === t(NO_FAITH_DEITY_NAME_KEY)) {
    return 'None';
  }

  const mappedKey = DEITY_KEY_BY_NAME[name];
  if (mappedKey) return mappedKey;

  return DEITY_OPTIONS.find((deity) => deity.name === name)?.key ?? null;
}

// SpecRef: 8.6 | UI_DIVINE_BUREAU | God scaling
export function getDeityEffectDescription(name: string, totalDonatedGold = 0): string {
  const deityKey = getDeityKey(name);
  const effectiveTier = getEffectiveDeityTier(totalDonatedGold);
  switch (deityKey) {
    case 'Goddess of Restoration': {
      const healMissingPct = 0.2 + 0.001 * effectiveTier;
      return t('deity.effect.GoddessOfRestoration', { healMissingPercent: Math.round(healMissingPct * 100) });
    }
    case 'God of Attrition': {
      const attackMult = 1.2 + 0.01 * effectiveTier;
      return t('deity.effect.GodOfAttrition', { attackMultiplier: attackMult.toFixed(2) });
    }
    case 'God of Cunning': {
      const autoSellMultiplier = Math.min(1, 0.5 + 0.01 * effectiveTier);
      return t('deity.effect.GodOfCunning', { autoSellMultiplier: autoSellMultiplier.toFixed(2) });
    }
    case 'God of Fortification': {
      return t('deity.effect.GodOfFortification');
    }
    case 'Goddess of Fertility': {
      return t('deity.effect.GoddessOfFertility');
    }
    case 'Goddess of Precision': {
      const accuracyBonus = 0.015 + 0.001 * effectiveTier;
      return t('deity.effect.GoddessOfPrecision', { accuracyBonus: (accuracyBonus * 1000).toFixed(0) });
    }
    case 'God of Fate': {
      return t('deity.effect.GodOfFate');
    }
    case 'God of Dusk': {
      const evasionBonus = 0.015 + 0.001 * effectiveTier;
      return t('deity.effect.GodOfDusk', { evasionBonus: (evasionBonus * 1000).toFixed(0) });
    }
    case 'Goddess of Mirage': {
      const magicalAttack = 1.2 + 0.01 * effectiveTier;
      return t('deity.effect.GoddessOfMirage', { magicalAttackMultiplier: magicalAttack.toFixed(2) });
    }
    case 'God of Resonance': {
      const hpMultiplier = 0.9 + 0.002 * effectiveTier;
      return t('deity.effect.GodOfResonance', { hpMultiplier: hpMultiplier.toFixed(2) });
    }
    case 'God of Oblivion': {
      return t('deity.effect.GodOfOblivion');
    }
    case 'Goddess of Discord': {
      return t('deity.effect.GoddessOfDiscord');
    }
    default:
      return t('deity.effect.none');
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
            magical: stats.deityDefenseAmplifierBonus.magical * (2 / 3),
          },
        };
      case 'God of Fortification':
        return {
          ...stats,
          deityDefenseAmplifierBonus: {
            physical: stats.deityDefenseAmplifierBonus.physical * (2 / 3),
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
            magical: stats.deityDefenseAmplifierBonus.magical * 1.1,
          },
        };
      case 'God of Resonance':
        return {
          ...stats,
          deityDefenseAmplifierBonus: {
            physical: stats.deityDefenseAmplifierBonus.physical,
            magical: stats.deityDefenseAmplifierBonus.magical * 1.1,
          },
        };
      case 'Goddess of Mirage':
        return {
          ...stats,
          deityOffenseAmplifierBonus: stats.deityOffenseAmplifierBonus + (1.2 + 0.01 * effectiveTier) - 1,
          deityDefenseAmplifierBonus: {
            physical: stats.deityDefenseAmplifierBonus.physical * 1.1,
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
export function getDeityStateDurationMultiplier(name: string, totalDonatedGold = 0, state: 'rest' | 'sell' | 'free_action' | 'sound_sleep' | 'pray' | 'explore'): number {
  const deityKey = getDeityKey(name);
  void totalDonatedGold;
  if (!deityKey) return 1;

  if (state === 'rest' && deityKey === 'God of Fortification') return 2;
  if (state === 'sell' && deityKey === 'God of Dusk') return 2;
  if (state === 'free_action' && deityKey === 'Goddess of Fertility') return 2;
  if (state === 'sound_sleep' && deityKey === 'Goddess of Restoration') return 2;
  if (state === 'pray' && deityKey === 'God of Fate') return 2;
  if (state === 'explore' && deityKey === 'Goddess of Precision') return 1.2;
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
