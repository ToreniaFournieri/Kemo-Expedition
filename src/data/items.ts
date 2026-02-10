import { ItemDef, EnhancementTitle, SuperRareTitle, ItemCategory, ElementalOffense } from '../types';
import { MYTHIC_DROP_POOLS } from './dropTables';

// ============================================================
// Enhancement & Super Rare title tables
// ============================================================
export const ENHANCEMENT_TITLES: EnhancementTitle[] = [
  { value: 0, title: '', tickets: 1390, multiplier: 1.0 },
  { value: 1, title: '名工の', tickets: 350, multiplier: 1.33 },
  { value: 2, title: '魔性の', tickets: 180, multiplier: 1.58 },
  { value: 3, title: '宿った', tickets: 60, multiplier: 2.1 },
  { value: 4, title: '伝説の', tickets: 15, multiplier: 2.75 },
  { value: 5, title: '恐ろしい', tickets: 4, multiplier: 3.5 },
  { value: 6, title: '究極の', tickets: 1, multiplier: 5.0 },
];

export const SUPER_RARE_TITLES: SuperRareTitle[] = [
  { value: 0, title: '', tickets: 24995, multiplier: 1.0 },
  { value: 1, title: '世界を征する', tickets: 1, multiplier: 2.0 },
  { value: 2, title: '天に与えられし', tickets: 1, multiplier: 2.0 },
  { value: 3, title: '混沌の', tickets: 1, multiplier: 2.0 },
  { value: 4, title: '知られざる', tickets: 1, multiplier: 2.0 },
  { value: 5, title: '血に飢えし', tickets: 1, multiplier: 2.0 },
];

// ============================================================
// Item generation types
// ============================================================
type Rarity = 'common' | 'uncommon' | 'rare' | 'mythic';

type ItemVariantMod = {
  partyHP?: number;
  physicalDefense?: number;
  magicalDefense?: number;
  meleeAttack?: number;
  rangedAttack?: number;
  magicalAttack?: number;
  meleeNoA?: number;
  rangedNoA?: number;
  magicalNoA?: number;
  elementalOffense?: ElementalOffense;
};

type ItemTemplate = {
  category: ItemCategory;
  baseName: string;
  variants?: [string, string];
  rareName?: string;
  mythicName?: string;
  variant1Mod?: ItemVariantMod;
  variant2Mod?: ItemVariantMod;
};

// ============================================================
// Item generation constants
// ============================================================

// Base power per tier (from spec 2.4.2)
const TIER_BASE_POWER = [12, 18, 27, 41, 61, 91, 137, 205];
const TIER_NOA_BASE_POWER = [0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
const TIER_TARGET_MULTIPLIERS = [0.13, 0.12, 0.11, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03];
const TIER_SHIELD_EVASION_BONUS = [0.013, 0.012, 0.011, 0.009, 0.008, 0.007, 0.006, 0.005, 0.004, 0.003];
const TIER_NOA_FIXED_BONUS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const TIER_NOA_PENALTIES = [-1.0, -1.2, -1.4, -1.6, -1.8, -2.0, -2.2, -2.4];
const TIER_EVASION_PENALTIES = [-0.001, -0.002, -0.003, -0.004, -0.005, -0.006, -0.007, -0.008];

// Rarity amplifiers per category (from spec 2.4.2)
const RARITY_AMPLIFIERS: Record<ItemCategory, number[]> = {
  armor:    [1.0, 1.2, 1.44, 1.73],
  robe:     [1.0, 1.2, 1.44, 1.73],
  shield:   [1.0, 1.2, 1.44, 1.73],
  sword:    [1.0, 1.2, 1.44, 1.73],
  katana:   [2.0, 2.4, 2.9, 3.46],
  gauntlet: [1.0, 1.2, 1.44, 1.73],
  arrow:    [0.67, 0.80, 0.95, 1.16],
  bolt:     [1.33, 1.60, 1.92, 2.30],
  archery:  [1.0, 1.2, 1.44, 1.73],
  wand:     [0.5, 0.6, 0.72, 0.86],
  grimoire: [1.0, 1.2, 1.44, 1.73],
  catalyst: [1.0, 1.2, 1.44, 1.73],
};

// Tier name prefixes for generated items
const TIER_PREFIXES = ['銅の', '鉄の', '鋼の', 'ミスリルの', 'アダマンの', 'オリハルの', 'エーテルの', '星鉄の'];

const ITEM_NAME_OVERRIDES: Record<number, string> = {
  1401: '黎明の聖剣',
  1402: '秘奥真理の書',
  2401: '白銀英雄の鎧',
  3401: '叡智神杖',
  4401: '月影妖刀',
  5401: '雷牙神雷ボルト',
  6401: '暁星英雄の鎧',
  7401: '天断の聖剣',
  7402: '星詠神杖',
  8401: '終焉妖刀',
  8402: '天罰神雷ボルト',
  8403: '根源真理の書',
};

// Shield HP values per tier
const SHIELD_HP_MULTIPLIERS = [12, 18, 27, 41, 61, 91, 137, 205];

// ============================================================
// Item templates - 12 categories
// Order: armor, robe, shield, sword, katana, gauntlet,
//        arrow, bolt, archery, wand, grimoire, catalyst
// ID mapping: tier*1000 + 100 + (index+1)
//   1101=armor, 1102=robe, 1103=shield, 1104=sword,
//   1105=katana, 1106=gauntlet, 1107=arrow, 1108=bolt,
//   1109=archery, 1110=wand, 1111=grimoire, 1112=catalyst
// ============================================================
const ITEM_TEMPLATES: ItemTemplate[] = [
  // Index 0: armor (鎧) - +physicalDefense
  {
    category: 'armor', baseName: '鎧',
    variants: ['堅守の鎧', '活力の鎧'],
    rareName: '騎士の鎧', mythicName: '英雄の鎧',
    variant1Mod: { physicalDefense: 2 },
    variant2Mod: { partyHP: 3 },
  },
  // Index 1: robe (法衣) - +magicalDefense
  {
    category: 'robe', baseName: 'ローブ',
    variants: ['守護のローブ', '聖者のローブ'],
    rareName: '大魔導のローブ', mythicName: '天衣',
    variant1Mod: { magicalDefense: 2 },
    variant2Mod: { partyHP: 3 },
  },
  // Index 2: shield (盾) - +HP, +physicalDefense
  {
    category: 'shield', baseName: '盾',
    variants: ['守りの盾', '闘士の盾'],
    rareName: '守護盾', mythicName: '聖盾',
    variant1Mod: { physicalDefense: 2 },
    variant2Mod: { meleeAttack: 1 },
  },
  // Index 3: sword (剣) - +meleeAttack
  {
    category: 'sword', baseName: '剣',
    variants: ['鋭利な剣', '堅固な剣'],
    rareName: '騎士剣', mythicName: '聖剣',
    variant1Mod: { meleeAttack: 1 },
    variant2Mod: { physicalDefense: 1 },
  },
  // Index 4: katana (刀) - +meleeAttack, -meleeNoA
  {
    category: 'katana', baseName: '刀',
    variants: ['業物の刀', '名匠の刀'],
    rareName: '銘刀', mythicName: '妖刀',
    variant1Mod: { meleeAttack: 2 },
    variant2Mod: { meleeAttack: 1 },
  },
  // Index 5: gauntlet (籠手) - +meleeNoA
  {
    category: 'gauntlet', baseName: '籠手',
    variants: ['戦士の籠手', '闘士の籠手'],
    rareName: '英雄の籠手', mythicName: '覇王の籠手',
    variant1Mod: { physicalDefense: 1 },
    variant2Mod: { meleeAttack: 1 },
  },
  // Index 6: arrow (矢) - +rangedAttack
  {
    category: 'arrow', baseName: '矢',
    variants: ['炎の矢', '氷の矢'],
    rareName: '雷の矢', mythicName: '神矢',
    variant1Mod: { elementalOffense: 'fire' },
    variant2Mod: { elementalOffense: 'ice' },
  },
  // Index 7: bolt (ボルト) - +rangedAttack, -rangedNoA
  {
    category: 'bolt', baseName: 'ボルト',
    variants: ['強化ボルト', '雷のボルト'],
    rareName: '炎のボルト', mythicName: '神雷ボルト',
    variant1Mod: { rangedAttack: 1 },
    variant2Mod: { elementalOffense: 'thunder' },
  },
  // Index 8: archery (弓) - +rangedNoA
  {
    category: 'archery', baseName: '弓',
    variants: ['狩人の弓', '精密な弓'],
    rareName: '精霊弓', mythicName: '天弓',
    variant1Mod: { rangedAttack: 1 },
    variant2Mod: { partyHP: 2 },
  },
  // Index 9: wand (ワンド) - +magicalAttack
  {
    category: 'wand', baseName: 'ワンド',
    variants: ['賢者のワンド', '闇のワンド'],
    rareName: '大魔導の杖', mythicName: '神杖',
    variant1Mod: { magicalAttack: 1 },
    variant2Mod: { magicalDefense: 1 },
  },
  // Index 10: grimoire (魔導書) - +magicalAttack, -magicalNoA
  {
    category: 'grimoire', baseName: '魔導書',
    variants: ['古の魔導書', '禁断の書'],
    rareName: '神代の書', mythicName: '真理の書',
    variant1Mod: { magicalAttack: 1 },
    variant2Mod: { magicalDefense: 1 },
  },
  // Index 11: catalyst (触媒) - +magicalNoA
  {
    category: 'catalyst', baseName: '触媒',
    variants: ['精霊の触媒', '炎の触媒'],
    rareName: '賢者の石', mythicName: '神核',
    variant1Mod: { magicalAttack: 1 },
    variant2Mod: { elementalOffense: 'fire' },
  },
];

const ITEM_TEMPLATE_BY_CATEGORY: Record<ItemCategory, ItemTemplate> = ITEM_TEMPLATES.reduce(
  (acc, template) => {
    acc[template.category] = template;
    return acc;
  },
  {} as Record<ItemCategory, ItemTemplate>
);

// ============================================================
// Item generation functions
// ============================================================

function calculateStat(basePower: number, amplifier: number): number {
  return Math.floor(basePower * amplifier);
}

function calculateNoA(basePower: number, amplifier: number): number {
  return Number((basePower * amplifier).toFixed(2));
}

function getMultiplierTier(tier: number, rarity: Rarity): number | null {
  if (rarity === 'mythic') return null;
  const bonus = rarity === 'rare' ? 2 : rarity === 'uncommon' ? 1 : 0;
  return Math.min(tier + bonus, TIER_TARGET_MULTIPLIERS.length);
}

function createItem(
  id: number,
  tier: number,
  rarity: Rarity,
  template: ItemTemplate,
  variantIndex?: number
): ItemDef {
  const basePower = TIER_BASE_POWER[tier - 1];
  const rarityIndex = { common: 0, uncommon: 1, rare: 2, mythic: 3 }[rarity];
  const amplifier = RARITY_AMPLIFIERS[template.category][rarityIndex];
  const tierPrefix = TIER_PREFIXES[tier - 1];
  const multiplierTier = getMultiplierTier(tier, rarity);
  const targetMultiplier = multiplierTier ? 1 + TIER_TARGET_MULTIPLIERS[multiplierTier - 1] : 1;
  const shieldEvasionBonus = multiplierTier ? TIER_SHIELD_EVASION_BONUS[multiplierTier - 1] : 0;
  const fixedNoABonus = multiplierTier ? TIER_NOA_FIXED_BONUS[multiplierTier - 1] : 0;
  const noaPenalty = TIER_NOA_PENALTIES[tier - 1];
  const evasionPenalty = TIER_EVASION_PENALTIES[tier - 1];
  const noaBasePower = TIER_NOA_BASE_POWER[tier - 1];

  // Determine name
  let name: string;
  if (rarity === 'common') {
    name = tierPrefix + template.baseName;
  } else if (rarity === 'uncommon' && template.variants && variantIndex !== undefined) {
    name = tierPrefix + template.variants[variantIndex];
  } else if (rarity === 'rare') {
    name = tierPrefix + (template.rareName || template.baseName);
  } else {
    name = template.mythicName || tierPrefix + template.baseName;
  }

  name = ITEM_NAME_OVERRIDES[id] ?? name;

  // Base item
  const item: ItemDef = {
    id,
    category: template.category,
    name,
  };

  // Apply stats based on category
  switch (template.category) {
    case 'armor':
      item.physicalDefense = calculateStat(basePower, amplifier);
      item.baseMultiplier = targetMultiplier;
      break;
    case 'robe':
      item.magicalDefense = calculateStat(basePower, amplifier);
      item.baseMultiplier = targetMultiplier;
      break;
    case 'shield':
      item.partyHP = SHIELD_HP_MULTIPLIERS[tier - 1];
      item.physicalDefense = calculateStat(basePower, amplifier);
      if (shieldEvasionBonus) item.evasionBonus = shieldEvasionBonus;
      break;
    case 'sword':
      item.meleeAttack = calculateStat(basePower, amplifier);
      item.baseMultiplier = targetMultiplier;
      break;
    case 'katana':
      item.meleeAttack = calculateStat(basePower, amplifier);
      item.meleeNoABonus = noaPenalty;
      item.evasionBonus = evasionPenalty;
      break;
    case 'gauntlet':
      item.meleeNoA = calculateNoA(noaBasePower, amplifier);
      item.meleeNoABonus = fixedNoABonus;
      break;
    case 'arrow':
      item.rangedAttack = calculateStat(basePower, amplifier);
      item.baseMultiplier = targetMultiplier;
      break;
    case 'bolt':
      item.rangedAttack = calculateStat(basePower, amplifier);
      item.rangedNoABonus = noaPenalty;
      item.evasionBonus = evasionPenalty;
      break;
    case 'archery':
      item.rangedNoA = calculateNoA(noaBasePower, amplifier);
      item.rangedNoABonus = fixedNoABonus;
      break;
    case 'wand':
      item.magicalAttack = calculateStat(basePower, amplifier);
      item.baseMultiplier = targetMultiplier;
      break;
    case 'grimoire':
      item.magicalAttack = calculateStat(basePower, amplifier);
      item.magicalNoABonus = noaPenalty;
      item.evasionBonus = evasionPenalty;
      break;
    case 'catalyst':
      item.magicalNoA = calculateNoA(noaBasePower, amplifier);
      item.magicalNoABonus = fixedNoABonus;
      break;
  }

  // Apply variant modifiers
  if (rarity === 'uncommon' && variantIndex !== undefined) {
    const mod = variantIndex === 0 ? template.variant1Mod : template.variant2Mod;
    if (mod) {
      if (mod.partyHP) item.partyHP = (item.partyHP || 0) + mod.partyHP * tier;
      if (mod.physicalDefense) item.physicalDefense = (item.physicalDefense || 0) + mod.physicalDefense * tier;
      if (mod.magicalDefense) item.magicalDefense = (item.magicalDefense || 0) + mod.magicalDefense * tier;
      if (mod.meleeAttack) item.meleeAttack = (item.meleeAttack || 0) + mod.meleeAttack * tier;
      if (mod.rangedAttack) item.rangedAttack = (item.rangedAttack || 0) + mod.rangedAttack * tier;
      if (mod.magicalAttack) item.magicalAttack = (item.magicalAttack || 0) + mod.magicalAttack * tier;
      if (mod.meleeNoA) item.meleeNoA = (item.meleeNoA || 0) + mod.meleeNoA;
      if (mod.rangedNoA) item.rangedNoA = (item.rangedNoA || 0) + Math.floor(mod.rangedNoA);
      if (mod.magicalNoA) item.magicalNoA = (item.magicalNoA || 0) + Math.floor(mod.magicalNoA * tier);
      if (mod.elementalOffense) item.elementalOffense = mod.elementalOffense;
    }
  }

  // Apply rare/mythic modifiers (elemental for arrows/bolts/grimoires)
  if (rarity === 'rare') {
    if (template.category === 'arrow' || template.category === 'bolt' || template.category === 'grimoire') {
      item.elementalOffense = 'thunder';
    }
  }

  return item;
}

// ============================================================
// Generate all items
// ============================================================
function generateItems(): ItemDef[] {
  const items: ItemDef[] = [];

  for (let tier = 1; tier <= 8; tier++) {
    // Common items (12 per tier - one of each type)
    for (let i = 0; i < ITEM_TEMPLATES.length; i++) {
      const template = ITEM_TEMPLATES[i];
      const id = tier * 1000 + 100 + i + 1; // T1CC format: 1101-1112 for tier 1 common
      items.push(createItem(id, tier, 'common', template));
    }

    // Uncommon items (24 per tier - two of each type)
    for (let i = 0; i < ITEM_TEMPLATES.length; i++) {
      const template = ITEM_TEMPLATES[i];
      // Variant 1
      const id1 = tier * 1000 + 200 + i * 2 + 1; // T2CC format
      items.push(createItem(id1, tier, 'uncommon', template, 0));
      // Variant 2
      const id2 = tier * 1000 + 200 + i * 2 + 2;
      items.push(createItem(id2, tier, 'uncommon', template, 1));
    }

    // Rare items (12 per tier - one of each type)
    for (let i = 0; i < ITEM_TEMPLATES.length; i++) {
      const template = ITEM_TEMPLATES[i];
      const id = tier * 1000 + 300 + i + 1; // T3CC format
      items.push(createItem(id, tier, 'rare', template));
    }

    // Mythic items (2~3 per tier based on boss drop tables)
    const mythicCategories = MYTHIC_DROP_POOLS[tier] ?? [];
    mythicCategories.forEach((category, index) => {
      const template = ITEM_TEMPLATE_BY_CATEGORY[category];
      const id = tier * 1000 + 400 + index + 1; // T4CC format
      items.push(createItem(id, tier, 'mythic', template));
    });
  }

  return items;
}

export const ITEMS: ItemDef[] = generateItems();

// ============================================================
// Item lookup helpers
// ============================================================

// Item lookup by tier
export function getItemsByTier(tier: number): ItemDef[] {
  const tierBase = tier * 1000;
  return ITEMS.filter(i => i.id >= tierBase && i.id < tierBase + 1000);
}

// Item lookup by tier and rarity
export function getItemsByTierAndRarity(tier: number, rarity: Rarity): ItemDef[] {
  const tierBase = tier * 1000;
  const rarityBase = { common: 100, uncommon: 200, rare: 300, mythic: 400 }[rarity];
  return ITEMS.filter(i => i.id >= tierBase + rarityBase && i.id < tierBase + rarityBase + 100);
}

export const getItemById = (id: number): ItemDef | undefined =>
  ITEMS.find(i => i.id === id);

export const getItemsByCategory = (category: string): ItemDef[] =>
  ITEMS.filter(i => i.category === category);

// Get random item from tier (for rewards)
export function getRandomItemFromTier(tier: number, rarity?: Rarity): ItemDef {
  const pool = rarity ? getItemsByTierAndRarity(tier, rarity) : getItemsByTier(tier);
  return pool[Math.floor(Math.random() * pool.length)];
}
