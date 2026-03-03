import { BonusType, ItemCategory, JewelAttachment, JewelInventory, JewelKey } from '../types';

export interface JewelDef {
  key: JewelKey;
  name: string;
  short: string;
  cBonusType: BonusType;
  dBaseBonuses: Array<{ stat: 'meleeAttack' | 'rangedAttack' | 'magicalAttack' | 'physicalDefense' | 'magicalDefense' | 'partyHP'; base: number }>;
}

export const JEWEL_DEFS: Record<JewelKey, JewelDef> = {
  might: {
    key: 'might', name: '剛力の結晶', short: '剛', cBonusType: 'physical_attack',
    dBaseBonuses: [{ stat: 'meleeAttack', base: 12 }, { stat: 'rangedAttack', base: 9 }],
  },
  arcana: {
    key: 'arcana', name: '魔導の結晶', short: '魔', cBonusType: 'magical_attack',
    dBaseBonuses: [{ stat: 'magicalAttack', base: 6 }, { stat: 'partyHP', base: 3 }],
  },
  fort: {
    key: 'fort', name: '堅牢の結晶', short: '堅', cBonusType: 'physical_defense',
    dBaseBonuses: [{ stat: 'physicalDefense', base: 6 }, { stat: 'partyHP', base: 6 }],
  },
  ward: {
    key: 'ward', name: '障壁の結晶', short: '障', cBonusType: 'magical_defense',
    dBaseBonuses: [{ stat: 'magicalDefense', base: 6 }, { stat: 'partyHP', base: 6 }],
  },
  shade: {
    key: 'shade', name: '影走の結晶', short: '影', cBonusType: 'evasion',
    dBaseBonuses: [{ stat: 'magicalDefense', base: 4 }, { stat: 'partyHP', base: 4 }],
  },
  focus: {
    key: 'focus', name: '精密の結晶', short: '精', cBonusType: 'accuracy',
    dBaseBonuses: [{ stat: 'physicalDefense', base: 4 }, { stat: 'partyHP', base: 3 }],
  },
};

export const C_ATTACK_BY_RANK = [22, 21, 19, 18, 17, 16, 15, 14] as const;
export const C_DEFENSE_BY_RANK = [13, 12, 11, 9, 8, 7, 6, 5] as const;
export const C_SUBTLE_BY_RANK = [8, 7, 6, 5, 4, 3, 2, 1] as const;

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

export function getJewelDRankValue(base: number, rank: number): number {
  if (rank <= 1) return base;
  let value = base;
  for (let n = 2; n <= rank; n++) value = Math.round(value * (1.4 - 0.03 * n));
  return value;
}

export function getJewelCBonusValue(key: JewelKey, rank: number): number {
  const idx = Math.max(0, Math.min(7, rank - 1));
  if (key === 'might' || key === 'arcana') return C_ATTACK_BY_RANK[idx] / 100;
  if (key === 'fort' || key === 'ward') return C_DEFENSE_BY_RANK[idx] / 100;
  return C_SUBTLE_BY_RANK[idx] / 1000;
}

export function getJewelInventoryKey(key: JewelKey, rank: number): string {
  return `${key}:${rank}`;
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

export function isJewelAllowedForCategory(category: ItemCategory, key: JewelKey): boolean {
  return JEWELS_BY_ITEM_CATEGORY[category].includes(key);
}

export function createStarterJewelInventory(): JewelInventory {
  const inv: JewelInventory = {};
  (Object.keys(JEWEL_DEFS) as JewelKey[]).forEach((key) => {
    inv[getJewelInventoryKey(key, 1)] = 2;
    inv[getJewelInventoryKey(key, 2)] = 1;
  });
  return inv;
}

export function jewelLabel(attachment: JewelAttachment | null | undefined): string {
  if (!attachment) return '';
  return `[${JEWEL_DEFS[attachment.key].short}${attachment.rank}]`;
}
