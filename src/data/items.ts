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

// 5 items per category as specified
export const ITEMS: ItemDef[] = [
  // Swords (剣) - +melee_attack
  { id: 1, category: 'sword', name: 'ショートソード', meleeAttack: 8 },
  { id: 2, category: 'sword', name: 'ロングソード', meleeAttack: 15 },
  { id: 3, category: 'sword', name: 'ブロードソード', meleeAttack: 22 },
  { id: 4, category: 'sword', name: 'バスタードソード', meleeAttack: 30 },
  { id: 5, category: 'sword', name: 'クレイモア', meleeAttack: 40, partyHP: 10 },

  // Katana (刀) - +melee_attack, -melee_NoA
  { id: 10, category: 'katana', name: '打刀', meleeAttack: 12, meleeNoA: -1 },
  { id: 11, category: 'katana', name: '太刀', meleeAttack: 20, meleeNoA: -1 },
  { id: 12, category: 'katana', name: '野太刀', meleeAttack: 30, meleeNoA: -1 },
  { id: 13, category: 'katana', name: '大太刀', meleeAttack: 42, meleeNoA: -2 },
  { id: 14, category: 'katana', name: '妖刀', meleeAttack: 55, meleeNoA: -2 },

  // Archery (弓) - +ranged_NoA only (bow determines number of attacks)
  { id: 20, category: 'archery', name: 'ショートボウ', rangedNoA: 0.5 },
  { id: 21, category: 'archery', name: 'ロングボウ', rangedNoA: 0.8 },
  { id: 22, category: 'archery', name: 'コンポジットボウ', rangedNoA: 1.2 },
  { id: 23, category: 'archery', name: 'グレートボウ', rangedNoA: 1.5 },
  { id: 24, category: 'archery', name: '精霊弓', rangedNoA: 1.8 },

  // Armor (鎧) - +Party_physical_defense (2 armor = full protection at tier)
  { id: 30, category: 'armor', name: 'レザーアーマー', physicalDefense: 8 },
  { id: 31, category: 'armor', name: 'チェインメイル', physicalDefense: 16 },
  { id: 32, category: 'armor', name: 'スケイルメイル', physicalDefense: 26 },
  { id: 33, category: 'armor', name: 'プレートメイル', physicalDefense: 38 },
  { id: 34, category: 'armor', name: '騎士の鎧', physicalDefense: 52, partyHP: 20 },

  // Gauntlet (籠手) - +melee_NoA
  { id: 40, category: 'gauntlet', name: '革の籠手', meleeNoA: 0.5 },
  { id: 41, category: 'gauntlet', name: '鋼の籠手', meleeNoA: 0.8 },
  { id: 42, category: 'gauntlet', name: '戦士の籠手', meleeNoA: 1.2 },
  { id: 43, category: 'gauntlet', name: '英雄の籠手', meleeNoA: 1.5 },
  { id: 44, category: 'gauntlet', name: '伝説の籠手', meleeNoA: 1.8 },

  // Wand (ワンド) - +magical_attack
  { id: 50, category: 'wand', name: '木のワンド', magicalAttack: 8 },
  { id: 51, category: 'wand', name: '魔法のワンド', magicalAttack: 15 },
  { id: 52, category: 'wand', name: 'ルーンワンド', magicalAttack: 24 },
  { id: 53, category: 'wand', name: '賢者の杖', magicalAttack: 35 },
  { id: 54, category: 'wand', name: '大魔導師の杖', magicalAttack: 50},

  // Robe (法衣) - +Party_magical_defense (2 robe = full protection at tier)
  { id: 60, category: 'robe', name: '見習いのローブ', magicalDefense: 8 },
  { id: 61, category: 'robe', name: '魔法使いのローブ', magicalDefense: 16 },
  { id: 62, category: 'robe', name: '賢者のローブ', magicalDefense: 26 },
  { id: 63, category: 'robe', name: '大魔導師のローブ', magicalDefense: 38 },
  { id: 64, category: 'robe', name: '聖なるローブ', magicalDefense: 52, partyHP: 15 },

  // Shield (盾) - +physicalDefense, +HP
  { id: 80, category: 'shield', name: '木盾', physicalDefense: 1, partyHP: 10 },
  { id: 81, category: 'shield', name: '鉄盾', physicalDefense: 2, partyHP: 20 },
  { id: 82, category: 'shield', name: '騎士盾', physicalDefense: 3, partyHP: 35 },
  { id: 83, category: 'shield', name: '守護盾', physicalDefense: 4, partyHP: 55 },
  { id: 84, category: 'shield', name: '聖盾', physicalDefense: 5, partyHP: 80 },

  // Bolt (ボルト) - +rangedAttack (main ranged damage source)
  { id: 90, category: 'bolt', name: '木ボルト', rangedAttack: 8 },
  { id: 91, category: 'bolt', name: '鉄ボルト', rangedAttack: 15 },
  { id: 92, category: 'bolt', name: '炎ボルト', rangedAttack: 22, elementalOffense: 'fire' },
  { id: 93, category: 'bolt', name: '氷ボルト', rangedAttack: 22, elementalOffense: 'ice' },
  { id: 94, category: 'bolt', name: '雷ボルト', rangedAttack: 22, elementalOffense: 'thunder' },

  // Grimoire (魔道書) - +magicalAttack
  { id: 100, category: 'grimoire', name: '初級魔道書', magicalAttack: 10 },
  { id: 101, category: 'grimoire', name: '中級魔道書', magicalAttack: 18 },
  { id: 102, category: 'grimoire', name: '上級魔道書', magicalAttack: 28 },
  { id: 103, category: 'grimoire', name: '禁断魔道書', magicalAttack: 40 },
  { id: 104, category: 'grimoire', name: '神代魔道書', magicalAttack: 55 },

  // Catalyst (霊媒) - +magicalNoA
  { id: 110, category: 'catalyst', name: '水晶球', magicalNoA: 0.5 },
  { id: 111, category: 'catalyst', name: '精霊石', magicalNoA: 0.8, magicalAttack: 5 },
  { id: 112, category: 'catalyst', name: '賢者の石', magicalNoA: 1.2 },
  { id: 113, category: 'catalyst', name: '精霊核', magicalNoA: 1.5, magicalAttack: 8 },
  { id: 114, category: 'catalyst', name: '神核', magicalNoA: 1.8, magicalAttack: 12 },

  // Arrow (矢) - +rangedAttack (main ranged damage source for bow)
  { id: 120, category: 'arrow', name: '木の矢', rangedAttack: 6 },
  { id: 121, category: 'arrow', name: '鉄の矢', rangedAttack: 12 },
  { id: 122, category: 'arrow', name: '炎の矢', rangedAttack: 18, elementalOffense: 'fire' },
  { id: 123, category: 'arrow', name: '氷の矢', rangedAttack: 18, elementalOffense: 'ice' },
  { id: 124, category: 'arrow', name: '雷の矢', rangedAttack: 18, elementalOffense: 'thunder' },
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
