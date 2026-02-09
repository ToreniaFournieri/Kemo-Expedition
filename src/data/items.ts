import { ItemDef, EnhancementTitle, SuperRareTitle, ItemCategory } from '../types';

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

// Base power per tier (8 tiers)
const TIER_BASE_POWER = [8, 20, 38, 62, 92, 128, 170, 218];

// Rarity amplifiers per item type
// Format: [common, uncommon, rare, mythic]
const RARITY_AMPLIFIERS: Record<ItemCategory, [number, number, number, number]> = {
  armor:    [1.0, 1.2, 1.5, 2.0],
  robe:     [1.0, 1.2, 1.5, 2.0],
  shield:   [0.5, 0.6, 0.75, 1.0], // HP focused, lower defense
  sword:    [1.0, 1.2, 1.5, 2.0],
  katana:   [1.3, 1.56, 1.95, 2.6], // Higher attack, fewer hits
  gauntlet: [0.3, 0.4, 0.5, 0.6],  // NoA items have different scaling
  arrow:    [0.8, 1.0, 1.2, 1.6],
  bolt:     [1.0, 1.2, 1.5, 2.0],
  archery:  [0.3, 0.4, 0.5, 0.6],  // NoA items
  wand:     [1.0, 1.2, 1.5, 2.0],
  grimoire: [1.2, 1.44, 1.8, 2.4],
  catalyst: [0.3, 0.4, 0.5, 0.6],  // NoA items
};

// HP multiplier for shields (per tier)
const SHIELD_HP_MULTIPLIERS = [10, 25, 50, 80, 120, 165, 220, 280];

// ID scheme: TRCC where T=tier(1-8), R=rarity(1-4), CC=item number(01-24)
// Common: 01-12, Uncommon: 01-24, Rare: 01-12, Mythic: 01-03

type Rarity = 'common' | 'uncommon' | 'rare' | 'mythic';

interface ItemTemplate {
  category: ItemCategory;
  baseName: string;
  variants?: string[]; // For uncommon (2 variants)
  rareName?: string;
  mythicName?: string;
  // Special modifiers for uncommon variants
  variant1Mod?: Partial<ItemDef>;
  variant2Mod?: Partial<ItemDef>;
}

// Tier name prefixes
const TIER_PREFIXES = [
  '',           // Tier 1: no prefix (basic)
  '鍛えた',      // Tier 2: Forged
  '上質な',      // Tier 3: Fine
  '精巧な',      // Tier 4: Elaborate
  '高貴な',      // Tier 5: Noble
  '英雄の',      // Tier 6: Hero's
  '伝説の',      // Tier 7: Legendary
  '神話級',      // Tier 8: Mythical
];

// Item templates for each category
const ITEM_TEMPLATES: ItemTemplate[] = [
  // Armor (鎧) - physical defense
  {
    category: 'armor',
    baseName: '鎧',
    variants: ['重装鎧', '軽装鎧'],
    rareName: '騎士の鎧',
    mythicName: '竜鱗の鎧',
    variant1Mod: { partyHP: 5 }, // Heavy: +HP
    variant2Mod: {}, // Light: standard
  },
  // Robe (法衣) - magical defense
  {
    category: 'robe',
    baseName: 'ローブ',
    variants: ['魔導ローブ', '祈りのローブ'],
    rareName: '大魔導師のローブ',
    mythicName: '星詠みのローブ',
    variant1Mod: { magicalAttack: 3 }, // Magic: +minor magic attack
    variant2Mod: { partyHP: 3 }, // Prayer: +minor HP
  },
  // Shield (盾) - HP + physical defense
  {
    category: 'shield',
    baseName: '盾',
    variants: ['大盾', '円盾'],
    rareName: '守護盾',
    mythicName: '神盾アイギス',
    variant1Mod: {}, // Tower: more HP focus (default)
    variant2Mod: { physicalDefense: 2 }, // Round: more defense
  },
  // Sword (剣) - melee attack
  {
    category: 'sword',
    baseName: '剣',
    variants: ['長剣', '闘剣'],
    rareName: 'ブレイドソード',
    mythicName: '聖剣エクスカリバー',
    variant1Mod: {}, // Long: standard
    variant2Mod: { meleeNoA: 0.5 }, // Battle: minor NoA boost
  },
  // Katana (刀) - high melee attack, -NoA
  {
    category: 'katana',
    baseName: '刀',
    variants: ['太刀', '野太刀'],
    rareName: '妖刀',
    mythicName: '天叢雲剣',
    variant1Mod: { meleeNoA: -1 }, // Tachi: -1 NoA
    variant2Mod: { meleeNoA: -2 }, // Nodachi: -2 NoA, higher damage implied
  },
  // Gauntlet (籠手) - melee NoA
  {
    category: 'gauntlet',
    baseName: '籠手',
    variants: ['戦士の籠手', '闘士の籠手'],
    rareName: '英雄の籠手',
    mythicName: '無双の籠手',
    variant1Mod: { meleeAttack: 2 }, // Warrior: +minor attack
    variant2Mod: {}, // Fighter: standard
  },
  // Arrow (矢) - ranged attack
  {
    category: 'arrow',
    baseName: '矢',
    variants: ['炎矢', '氷矢'],
    rareName: '雷矢',
    mythicName: '流星矢',
    variant1Mod: { elementalOffense: 'fire' },
    variant2Mod: { elementalOffense: 'ice' },
  },
  // Bolt (ボルト) - ranged attack
  {
    category: 'bolt',
    baseName: 'ボルト',
    variants: ['炎ボルト', '氷ボルト'],
    rareName: '雷ボルト',
    mythicName: '神雷ボルト',
    variant1Mod: { elementalOffense: 'fire' },
    variant2Mod: { elementalOffense: 'ice' },
  },
  // Archery (弓) - ranged NoA
  {
    category: 'archery',
    baseName: '弓',
    variants: ['長弓', '複合弓'],
    rareName: '精霊弓',
    mythicName: '神弓アルテミス',
    variant1Mod: {}, // Long: standard
    variant2Mod: { rangedAttack: 2 }, // Composite: +minor attack
  },
  // Wand (ワンド) - magical attack
  {
    category: 'wand',
    baseName: 'ワンド',
    variants: ['魔杖', '賢者の杖'],
    rareName: '大魔導の杖',
    mythicName: '神杖カドゥケウス',
    variant1Mod: {}, // Magic wand: standard
    variant2Mod: { magicalNoA: 0.3 }, // Sage staff: minor NoA
  },
  // Grimoire (魔道書) - magical attack
  {
    category: 'grimoire',
    baseName: '魔道書',
    variants: ['炎の魔道書', '氷の魔道書'],
    rareName: '雷の魔道書',
    mythicName: '禁断の魔道書',
    variant1Mod: { elementalOffense: 'fire' },
    variant2Mod: { elementalOffense: 'ice' },
  },
  // Catalyst (霊媒) - magical NoA
  {
    category: 'catalyst',
    baseName: '霊媒',
    variants: ['精霊石', '魔晶石'],
    rareName: '賢者の石',
    mythicName: '神核オリハルコン',
    variant1Mod: {}, // Spirit stone: standard
    variant2Mod: { magicalAttack: 3 }, // Magic crystal: +minor attack
  },
];

function calculateStat(basePower: number, amplifier: number): number {
  return Math.floor(basePower * amplifier);
}

function calculateNoA(basePower: number, amplifier: number): number {
  // NoA items: scale differently, typically 1-6 range
  const base = basePower / 8; // Normalize to tier 1 = 1
  return Math.max(1, Math.floor(base * amplifier + 1));
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
      break;
    case 'robe':
      item.magicalDefense = calculateStat(basePower, amplifier);
      break;
    case 'shield':
      item.partyHP = SHIELD_HP_MULTIPLIERS[tier - 1];
      item.physicalDefense = calculateStat(basePower, amplifier);
      break;
    case 'sword':
      item.meleeAttack = calculateStat(basePower, amplifier);
      break;
    case 'katana':
      item.meleeAttack = calculateStat(basePower, amplifier);
      item.meleeNoA = -1; // Default katana penalty
      break;
    case 'gauntlet':
      item.meleeNoA = calculateNoA(basePower, amplifier);
      break;
    case 'arrow':
      item.rangedAttack = calculateStat(basePower, amplifier);
      break;
    case 'bolt':
      item.rangedAttack = calculateStat(basePower, amplifier);
      break;
    case 'archery':
      item.rangedNoA = calculateNoA(basePower, amplifier);
      break;
    case 'wand':
      item.magicalAttack = calculateStat(basePower, amplifier);
      break;
    case 'grimoire':
      item.magicalAttack = calculateStat(basePower, amplifier);
      break;
    case 'catalyst':
      item.magicalNoA = calculateNoA(basePower, amplifier);
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

// Generate all items
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

    // Mythic items (3 per tier - rotating categories)
    const mythicCategories: number[] = [
      // Rotate through weapon types primarily
      (tier - 1) % 12,
      ((tier - 1) + 4) % 12,
      ((tier - 1) + 8) % 12,
    ];
    for (let i = 0; i < 3; i++) {
      const template = ITEM_TEMPLATES[mythicCategories[i]];
      const id = tier * 1000 + 400 + i + 1; // T4CC format
      items.push(createItem(id, tier, 'mythic', template));
    }
  }

  return items;
}

export const ITEMS: ItemDef[] = generateItems();

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
