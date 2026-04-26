import { BonusType, ItemCategory, JewelAttachment, JewelInventory, JewelKey } from '../types';

interface JewelDef {
  key: JewelKey;
  name: string;
  displayName: string;
  short: string;
  cBonusType: BonusType;
  dBaseBonuses: Array<{ stat: JewelDStat; base: number }>;
}

type JewelDStat = 'meleeAttack' | 'rangedAttack' | 'magicalAttack' | 'physicalDefense' | 'magicalDefense' | 'partyHP';

export const JEWEL_DEFS: Record<JewelKey, JewelDef> = {
  might: {
    key: 'might', name: '剛力の結晶', displayName: '剛力', short: '剛', cBonusType: 'physical_attack',
    dBaseBonuses: [{ stat: 'meleeAttack', base: 12 }, { stat: 'rangedAttack', base: 9 }],
  },
  arcana: {
    key: 'arcana', name: '魔導の結晶', displayName: '魔導', short: '魔', cBonusType: 'magical_attack',
    dBaseBonuses: [{ stat: 'magicalAttack', base: 6 }, { stat: 'partyHP', base: 3 }],
  },
  fort: {
    key: 'fort', name: '堅牢の結晶', displayName: '堅牢', short: '堅', cBonusType: 'physical_defense',
    dBaseBonuses: [{ stat: 'physicalDefense', base: 6 }, { stat: 'partyHP', base: 6 }],
  },
  ward: {
    key: 'ward', name: '障壁の結晶', displayName: '障壁', short: '障', cBonusType: 'magical_defense',
    dBaseBonuses: [{ stat: 'magicalDefense', base: 6 }, { stat: 'partyHP', base: 6 }],
  },
  shade: {
    key: 'shade', name: '影走の結晶', displayName: '影走', short: '影', cBonusType: 'evasion',
    dBaseBonuses: [{ stat: 'magicalDefense', base: 4 }, { stat: 'partyHP', base: 4 }],
  },
  focus: {
    key: 'focus', name: '精密の結晶', displayName: '精密', short: '精', cBonusType: 'accuracy',
    dBaseBonuses: [{ stat: 'physicalDefense', base: 4 }, { stat: 'partyHP', base: 3 }],
  },
};

const C_ATTACK_BY_RANK = [22, 21, 19, 18, 17, 16, 15, 14] as const;
const C_DEFENSE_BY_RANK = [13, 12, 11, 9, 8, 7, 6, 5] as const;
const C_SUBTLE_BY_RANK = [8, 7, 6, 5, 4, 3, 2, 1] as const;
const JEWEL_TIER_NAME_BY_RANK = ['素晶', '良晶', '雅晶', '煌晶', '碧晶', '紫晶', '金晶', '王晶'] as const;

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
export function getJewelNameByRank(key: JewelKey, rank: number): string {
  const idx = Math.max(0, Math.min(7, rank - 1));
  return `${JEWEL_DEFS[key].displayName}の${JEWEL_TIER_NAME_BY_RANK[idx]}`;
}

export function getJewelOwnedCount(inv: JewelInventory, key: JewelKey, rank: number): number {
  return inv[getJewelInventoryKey(key, rank)] ?? 0;
}

export function addJewelToInventory(inv: JewelInventory, key: JewelKey, rank: number, count: number = 1): JewelInventory {
  const k = getJewelInventoryKey(key, rank);
  return { ...inv, [k]: (inv[k] ?? 0) + count };
}

export function removeJewelFromInventory(inv: JewelInventory, key: JewelKey, rank: number): JewelInventory {
  const k = getJewelInventoryKey(key, rank);
  const next = { ...inv };
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

// SpecRef: 3.1.7 | Jewel (結晶) | Display
export function jewelLabel(attachment: JewelAttachment | null | undefined): string {
  if (!attachment) return '';
  return `[${JEWEL_DEFS[attachment.key].short}${attachment.rank}]`;
}
