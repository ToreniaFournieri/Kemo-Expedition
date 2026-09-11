import { t } from '../i18n';
import { BonusType, Character, ItemCategory, JewelAttachment, JewelInventory, JewelKey } from '../types';

interface JewelDef {
  key: JewelKey;
  nameKey: string;
  displayNameKey: string;
  shortKey: string;
  cBonusType: BonusType;
  dBaseBonuses: Array<{ stat: JewelDStat; base: number }>;
}

type JewelDStat = 'meleeAttack' | 'rangedAttack' | 'magicalAttack' | 'physicalDefense' | 'magicalDefense' | 'partyHP';

export const JEWEL_DEFS: Record<JewelKey, JewelDef> = {
  might: {
    key: 'might', nameKey: 'jewel.might.name', displayNameKey: 'jewel.might.displayName', shortKey: 'jewel.might.short', cBonusType: 'physical_attack',
    dBaseBonuses: [{ stat: 'meleeAttack', base: 12 }, { stat: 'rangedAttack', base: 9 }],
  },
  arcana: {
    key: 'arcana', nameKey: 'jewel.arcana.name', displayNameKey: 'jewel.arcana.displayName', shortKey: 'jewel.arcana.short', cBonusType: 'magical_attack',
    dBaseBonuses: [{ stat: 'magicalAttack', base: 6 }, { stat: 'partyHP', base: 3 }],
  },
  fort: {
    key: 'fort', nameKey: 'jewel.fort.name', displayNameKey: 'jewel.fort.displayName', shortKey: 'jewel.fort.short', cBonusType: 'physical_defense',
    dBaseBonuses: [{ stat: 'physicalDefense', base: 6 }, { stat: 'partyHP', base: 6 }],
  },
  ward: {
    key: 'ward', nameKey: 'jewel.ward.name', displayNameKey: 'jewel.ward.displayName', shortKey: 'jewel.ward.short', cBonusType: 'magical_defense',
    dBaseBonuses: [{ stat: 'magicalDefense', base: 6 }, { stat: 'partyHP', base: 6 }],
  },
  shade: {
    key: 'shade', nameKey: 'jewel.shade.name', displayNameKey: 'jewel.shade.displayName', shortKey: 'jewel.shade.short', cBonusType: 'evasion',
    dBaseBonuses: [{ stat: 'magicalDefense', base: 4 }, { stat: 'partyHP', base: 4 }],
  },
  focus: {
    key: 'focus', nameKey: 'jewel.focus.name', displayNameKey: 'jewel.focus.displayName', shortKey: 'jewel.focus.short', cBonusType: 'accuracy',
    dBaseBonuses: [{ stat: 'physicalDefense', base: 4 }, { stat: 'partyHP', base: 3 }],
  },
};

const C_ATTACK_BY_RANK = [22, 21, 19, 18, 17, 16, 15, 14] as const;
const C_DEFENSE_BY_RANK = [13, 12, 11, 9, 8, 7, 6, 5] as const;
const C_SUBTLE_BY_RANK = [8, 7, 6, 5, 4, 3, 2, 1] as const;
const JEWEL_TIER_KEY_BY_RANK = [
  'jewel.tier.1',
  'jewel.tier.2',
  'jewel.tier.3',
  'jewel.tier.4',
  'jewel.tier.5',
  'jewel.tier.6',
  'jewel.tier.7',
  'jewel.tier.8',
] as const;

export const JEWELS_BY_ITEM_CATEGORY: Record<ItemCategory, JewelKey[]> = {
  armor: ['fort', 'ward', 'shade'],
  robe: ['fort', 'ward', 'focus'],
  shield: ['fort', 'ward', 'shade'],
  sword: ['might', 'fort', 'shade'],
  katana: ['might', 'ward', 'focus'],
  gauntlet: ['fort', 'ward', 'focus'],
  arrow: ['might', 'ward', 'shade'],
  bolt: ['might', 'fort', 'ward'],
  archery: ['fort', 'shade', 'focus'],
  wand: ['arcana', 'ward', 'shade'],
  grimoire: ['arcana', 'fort', 'focus'],
  catalyst: ['fort', 'ward', 'focus'],
};

export const AUTO_JEWEL_KEY_BY_ITEM_CATEGORY: Partial<Record<ItemCategory, JewelKey>> = {
  armor: 'fort',
  robe: 'ward',
  shield: 'shade',
  sword: 'might',
  katana: 'focus',
  gauntlet: 'fort',
  arrow: 'shade',
  bolt: 'might',
  archery: 'focus',
  wand: 'arcana',
  grimoire: 'arcana',
  catalyst: 'ward',
};

const AUTO_JEWEL_ASSIGNMENT_CATEGORY_ORDER: ItemCategory[] = [
  'armor',
  'robe',
  'shield',
  'sword',
  'katana',
  'gauntlet',
  'arrow',
  'bolt',
  'archery',
  'wand',
  'grimoire',
  'catalyst',
];

// SpecRef: 3.1.7 | Jewel (結晶) | Rule
export function getJewelDRankValue(base: number, rank: number): number {
  if (rank <= 1) return base;
  let value = base;
  for (let n = 2; n <= rank; n++) value = Math.round(value * (1.4 - 0.03 * n));
  return value;
}

// SpecRef: 3.1.7 | Jewel (結晶) | Rank
export function getJewelCBonusValue(key: JewelKey, rank: number): number {
  const idx = Math.max(0, Math.min(7, rank - 1));
  if (key === 'might' || key === 'arcana') return C_ATTACK_BY_RANK[idx] / 100;
  if (key === 'fort' || key === 'ward') return C_DEFENSE_BY_RANK[idx] / 100;
  return C_SUBTLE_BY_RANK[idx] / 1000;
}

export function getJewelDRankBonus(attachment: JewelAttachment | null | undefined, stat: JewelDStat): number {
  if (!attachment) return 0;
  const d = JEWEL_DEFS[attachment.key].dBaseBonuses.find((bonus) => bonus.stat === stat);
  return d ? getJewelDRankValue(d.base, attachment.rank) : 0;
}

function getJewelInventoryKey(key: JewelKey, rank: number): string {
  return `${key}:${rank}`;
}

// SpecRef: 3.1.7 | Jewel (結晶) | Tier Name
export function getJewelDisplayName(key: JewelKey): string {
  return t(JEWEL_DEFS[key].displayNameKey);
}

export function getJewelShortLabel(key: JewelKey): string {
  return t(JEWEL_DEFS[key].shortKey);
}

export function getJewelNameByRank(key: JewelKey, rank: number): string {
  const idx = Math.max(0, Math.min(7, rank - 1));
  return t('jewel.nameByRank', { jewel: getJewelDisplayName(key), tier: t(JEWEL_TIER_KEY_BY_RANK[idx]) });
}

export function getJewelOwnedCount(inv: JewelInventory, key: JewelKey, rank: number): number {
  return inv[getJewelInventoryKey(key, rank)] ?? 0;
}

export function addJewelToInventory(
  inv: JewelInventory,
  key: JewelKey,
  rank: number,
  count: number = 1,
  mutateInventory: boolean = false,
): JewelInventory {
  const k = getJewelInventoryKey(key, rank);
  const next = mutateInventory ? inv : { ...inv };
  next[k] = (next[k] ?? 0) + count;
  return next;
}

export function removeJewelFromInventory(
  inv: JewelInventory,
  key: JewelKey,
  rank: number,
  mutateInventory: boolean = false,
): JewelInventory {
  const k = getJewelInventoryKey(key, rank);
  const next = mutateInventory ? inv : { ...inv };
  const current = next[k] ?? 0;
  if (current <= 1) delete next[k]; else next[k] = current - 1;
  return next;
}

// SpecRef: 3.1.7 | Jewel (結晶) | Item Type → Available Jewel
export function isJewelAllowedForCategory(category: ItemCategory, key: JewelKey): boolean {
  return JEWELS_BY_ITEM_CATEGORY[category].includes(key);
}

export function createStarterJewelInventory(): JewelInventory {
  return {};
}

type AutoJewelAssignment = {
  slotIndex: number;
  key: JewelKey;
  rank: number;
};

// SpecRef: 7.1.3.1 | Auto Assignment Order | 1-4
export function planAutoJewelAssignmentsForCharacter(
  character: Character,
  jewelInventory: JewelInventory,
): AutoJewelAssignment[] {
  // SpecRef: 7.1.2.2 | Evaluate jewel allocation | 8-2
  // Jewels in Inventory and jewels already equipped by this character form one
  // candidate pool.  In particular, an equipped top-rank jewel must remain a
  // candidate for its current slot; excluding it here caused repeated FULL
  // auto-equipment runs to alternate between two allocations.
  const candidateCountByJewelKeyAndRank: Record<JewelKey, number[]> = {
    might: Array.from({ length: 8 }, (_, i) => getJewelOwnedCount(jewelInventory, 'might', i + 1)),
    arcana: Array.from({ length: 8 }, (_, i) => getJewelOwnedCount(jewelInventory, 'arcana', i + 1)),
    fort: Array.from({ length: 8 }, (_, i) => getJewelOwnedCount(jewelInventory, 'fort', i + 1)),
    ward: Array.from({ length: 8 }, (_, i) => getJewelOwnedCount(jewelInventory, 'ward', i + 1)),
    shade: Array.from({ length: 8 }, (_, i) => getJewelOwnedCount(jewelInventory, 'shade', i + 1)),
    focus: Array.from({ length: 8 }, (_, i) => getJewelOwnedCount(jewelInventory, 'focus', i + 1)),
  };

  character.equipment.forEach((item) => {
    if (!item?.jewel) return;
    candidateCountByJewelKeyAndRank[item.jewel.key][item.jewel.rank - 1] += 1;
  });

  const assignments: AutoJewelAssignment[] = [];
  const memoryJewelSet = new Set<string>();

  AUTO_JEWEL_ASSIGNMENT_CATEGORY_ORDER.forEach((category) => {
    const targetJewelKey = AUTO_JEWEL_KEY_BY_ITEM_CATEGORY[category];
    if (!targetJewelKey) return;

    character.equipment.forEach((item, slotIndex) => {
      if (!item || item.category !== category) return;

      let selectedRank: number | null = null;
      for (let rank = 8; rank >= 1; rank -= 1) {
        const jewelId = `${targetJewelKey}:${rank}`;
        if (
          candidateCountByJewelKeyAndRank[targetJewelKey][rank - 1] > 0
          && !memoryJewelSet.has(jewelId)
        ) {
          selectedRank = rank;
          break;
        }
      }
      if (selectedRank == null) return;

      // Memory J prevents a second assignment of the same jewel type/rank for
      // this character, including when Inventory contains duplicate copies.
      memoryJewelSet.add(`${targetJewelKey}:${selectedRank}`);
      if (item.jewel && item.jewel.key === targetJewelKey && item.jewel.rank === selectedRank) return;
      assignments.push({ slotIndex, key: targetJewelKey, rank: selectedRank });
    });
  });

  return assignments;
}

// SpecRef: 3.1.7 | Jewel (結晶) | Display
export function jewelLabel(attachment: JewelAttachment | null | undefined): string {
  if (!attachment) return '';
  return `[${getJewelShortLabel(attachment.key)}${attachment.rank}]`;
}
