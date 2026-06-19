import { ItemDef, EnhancementTitle, SuperRareTitle, ItemCategory, ElementalOffense, Bonus } from '../types';
import { GOD_MYTHIC_DROPS } from './dropTables';
import { getMasterItemCategoriesByRarity, getMasterItemNames } from './masterSpecData';

const GOD_MYTHIC_DROP_TIER_BY_ID = new Map<number, number>();

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
  { value: 0, title: '', tickets: 409918, multiplier: 1.0, bonuses: [] },
  { value: 1, title: '世界を征する', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'growth_xV', value: 1.6 }, { type: 'evasion', value: -0.005 }] },
  { value: 2, title: '天に選ばれし', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'growth_xV', value: 1.3 }, { type: 'evasion', value: 0.01 }] },
  { value: 3, title: '千里を見通す', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'growth_xV', value: 1.3 }, { type: 'accuracy', value: 0.01 }] },
  { value: 4, title: '天を穿つ', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'growth_xV', value: 1.2 }, { type: 'physical_offense_multiplier_xV', value: 1.3 }] },
  { value: 5, title: '星を詠む', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'growth_xV', value: 1.2 }, { type: 'magical_offense_multiplier_xV', value: 1.3 }] },
  { value: 6, title: '轟きし', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'growth_xV', value: 1.2 }, { type: 'thunder_defense_multiplier_xV', value: 3 / 5 }] },
  { value: 7, title: '魔を拒む', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'growth_xV', value: 1.1 }, { type: 'magical_defense_multiplier_xV', value: 3 / 5 }] },
  { value: 8, title: '鉄壁な', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'growth_xV', value: 1.1 }, { type: 'physical_defense_multiplier_xV', value: 3 / 5 }] },
  { value: 9, title: '闘争を求めし', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'growth_xV', value: 1.1 }, { type: 'physical_attack', value: 0.2 }] },
  { value: 10, title: '魔力が奔る', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'growth_xV', value: 1.1 }, { type: 'magical_attack', value: 0.2 }] },
  { value: 11, title: '執着し', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'counter' }, { type: 'evasion', value: 0.01 }] },
  { value: 12, title: '煌めく', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'unimplemented_bonus', value: 0, unimplementedLabel: '剣士2アビリティ強化-未実装' }, { type: 'magical_attack', value: 0.3 }] },
  { value: 13, title: '抜刀の', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'iaigiri' }, { type: 'intelligence', value: 1 }] },
  { value: 14, title: '一太刀を制す', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'unimplemented_bonus', value: 0, unimplementedLabel: '侍2アビリティ強化-未実装' }, { type: 'magical_defense_multiplier_xV', value: 3 / 5 }] },
  { value: 15, title: '華麗なる', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 're_attack' }, { type: 'mind', value: 1 }] },
  { value: 16, title: '健美な', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'unimplemented_bonus', value: 0, unimplementedLabel: '剣聖2アビリティ強化-未実装' }, { type: 'accuracy', value: 0.015 }] },
  { value: 17, title: '狙いし', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'hunter' }, { type: 'magical_attack', value: 0.1 }] },
  { value: 18, title: '獲物を追う', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'unimplemented_bonus', value: 0, unimplementedLabel: '狩人2アビリティ強化-未実装' }, { type: 'evasion', value: 0.015 }] },
  { value: 19, title: '一撃必殺', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'heavy_strike' }, { type: 'magical_offense_multiplier_xV', value: 1.1 }] },
  { value: 20, title: '獲物を追う', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'unimplemented_bonus', value: 0, unimplementedLabel: '弩手2アビリティ強化-未実装' }, { type: 'penet', value: 0.06 }] },
  { value: 21, title: '虚を突きし', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'first_strike' }, { type: 'magical_attack', value: 0.2 }] },
  { value: 22, title: '闇駆ける', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'unimplemented_bonus', value: 0, unimplementedLabel: '忍者2アビリティ強化-未実装' }, { type: 'magical_attack', value: 0.3 }] },
  { value: 23, title: '響き渡る', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'resonance' }, { type: 'vitality', value: 1 }] },
  { value: 24, title: '唱えし', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'unimplemented_bonus', value: 0, unimplementedLabel: '魔法使い2アビリティ強化-未実装' }, { type: 'magical_defense', value: 0.1 }] },
  { value: 25, title: '偉大なる', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'arc_magic' }, { type: 'strength', value: 1 }] },
  { value: 26, title: '理の', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'unimplemented_bonus', value: 0, unimplementedLabel: '賢者2アビリティ強化-未実装' }, { type: 'physical_defense_multiplier_xV', value: 3 / 5 }] },
  { value: 27, title: '精錬されし', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'arcane_stability' }, { type: 'vitality', value: 1 }] },
  { value: 28, title: '変換された', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'unimplemented_bonus', value: 0, unimplementedLabel: '錬金術2アビリティ強化-未実装' }, { type: 'physical_attack', value: 0.2 }] },
  { value: 29, title: '守護の', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'defender' }, { type: 'physical_attack', value: 0.1 }] },
  { value: 30, title: '前線を貫く', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'unimplemented_bonus', value: 0, unimplementedLabel: '防人2アビリティ強化-未実装' }, { type: 'penet', value: 0.04 }] },
  { value: 31, title: '障壁の', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'm_barrier' }, { type: 'strength', value: 1 }] },
  { value: 32, title: '祈りし', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'unimplemented_bonus', value: 0, unimplementedLabel: '巡礼者2アビリティ強化-未実装' }, { type: 'physical_attack', value: 0.3 }] },
  { value: 33, title: '鼓舞し', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'command' }, { type: 'magical_attack', value: 0.1 }] },
  { value: 34, title: '王道なる', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'unimplemented_bonus', value: 0, unimplementedLabel: '君主2アビリティ強化-未実装' }, { type: 'penet', value: 0.08 }] },
  { value: 35, title: '一気呵成', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'rage' }, { type: 'fire_offense', value: 0.1 }] },
  { value: 36, title: '起き上がる', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 're_counter' }, { type: 'magical_defense', value: 0.1 }] },
  { value: 37, title: '始まりの', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'momentum' }, { type: 'accuracy', value: 0.015 }] },
  { value: 38, title: '狡知を巡らす', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'cunning' }, { type: 'penet', value: 0.04 }] },
  { value: 39, title: '先を行く', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'first_strike' }, { type: 'thunder_offense', value: 0.1 }] },
  { value: 40, title: '連携し', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'covering_fire' }, { type: 'magical_attack', value: 0.2 }] },
  { value: 41, title: '探し求めた', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'seeker' }, { type: 'penet', value: 0.04 }] },
  { value: 42, title: '修復されし', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'resurrect' }, { type: 'physical_attack', value: 0.2 }] },
  { value: 43, title: '背を預ける', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'bulwark' }, { type: 'penet', value: 0.08 }] },
  { value: 44, title: '機械化し', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'cyborgization' }, { type: 'physical_defense', value: 0.1 }] },
  { value: 45, title: '共感し', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'resonance' }, { type: 'physical_attack', value: 0.1 }] },
  { value: 46, title: '化けた', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'illusion' }, { type: 'evasion', value: 0.01 }] },
  { value: 47, title: '冷酷なる', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'composure' }, { type: 'ice_offense', value: 0.1 }] },
  { value: 48, title: '反射する', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'magical_counter' }, { type: 'physical_attack', value: 0.2 }] },
  { value: 49, title: '研ぎ澄ます', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'focus' }, { type: 'magical_attack', value: 0.2 }] },
  { value: 50, title: '未来を変える', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'prophecy' }, { type: 'physical_attack', value: 0.1 }] },
  { value: 51, title: '影に消える', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ability_upgrade', value: 1, abilityId: 'stealth' }, { type: 'evasion', value: 0.015 }] },
  { value: 52, title: '駆け巡る', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'unimplemented_bonus', value: 0, unimplementedLabel: 'ミュリッド2アビリティ強化-未実装' }, { type: 'accuracy', value: 0.015 }] },
  { value: 53, title: '火焔の', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'fire_offense', value: 0.3 }, { type: 'accuracy', value: 0.01 }] },
  { value: 54, title: '氷晶纏いし', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ice_offense', value: 0.3 }, { type: 'physical_defense', value: 0.1 }] },
  { value: 55, title: '電光帯びし', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'thunder_offense', value: 0.3 }, { type: 'magical_defense', value: 0.1 }] },
  { value: 56, title: '炎を躱す', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'fire_defense_multiplier_xV', value: 3 / 5 }, { type: 'evasion', value: 0.01 }] },
  { value: 57, title: '氷結砕きし', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ice_defense_multiplier_xV', value: 3 / 5 }, { type: 'magical_attack', value: 0.1 }] },
  { value: 58, title: '電光いなす', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'thunder_defense_multiplier_xV', value: 3 / 5 }, { type: 'physical_attack', value: 0.1 }] },
  { value: 59, title: '灼熱なる', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'fire_offense', value: 0.2 }, { type: 'ice_defense_multiplier_xV', value: 3 / 5 }] },
  { value: 60, title: '冷徹なる', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ice_offense', value: 0.2 }, { type: 'thunder_defense_multiplier_xV', value: 3 / 5 }] },
  { value: 61, title: '天衝く', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'thunder_offense', value: 0.2 }, { type: 'fire_defense_multiplier_xV', value: 3 / 5 }] },
  { value: 62, title: '氷炎踊る', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'ice_defense_multiplier_xV', value: 3 / 5 }, { type: 'fire_defense_multiplier_xV', value: 3 / 5 }] },
  { value: 63, title: '護られし', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'armor_multiplier', value: 1.1 }, { type: 'accuracy', value: 0.01 }] },
  { value: 64, title: '舞い踊る', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'robe_multiplier', value: 1.1 }, { type: 'magical_defense', value: 0.1 }] },
  { value: 65, title: '盾影に射る', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'shield_multiplier', value: 1.1 }, { type: 'physical_attack', value: 0.2 }] },
  { value: 66, title: '剣影に舞う', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'sword_multiplier', value: 1.1 }, { type: 'evasion', value: 0.01 }] },
  { value: 67, title: '一閃に至る', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'katana_multiplier', value: 1.1 }, { type: 'physical_defense', value: 0.1 }] },
  { value: 68, title: '慟哭し', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'gauntlet_multiplier', value: 1.1 }, { type: 'magical_attack', value: 0.2 }] },
  { value: 69, title: '矢で導く', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'arrow_multiplier', value: 1.1 }, { type: 'magical_attack', value: 0.2 }] },
  { value: 70, title: '弩級の', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'bolt_multiplier', value: 1.1 }, { type: 'physical_defense', value: 0.1 }] },
  { value: 71, title: '仇なす', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'archery_multiplier', value: 1.1 }, { type: 'accuracy', value: 0.01 }] },
  { value: 72, title: '妖護りし', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'wand_multiplier', value: 1.1 }, { type: 'magical_defense', value: 0.1 }] },
  { value: 73, title: '秘められし', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'grimoire_multiplier', value: 1.1 }, { type: 'physical_defense', value: 0.1 }] },
  { value: 74, title: '許されぬ', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'catalyst_multiplier', value: 1.1 }, { type: 'physical_attack', value: 0.2 }] },
  { value: 75, title: '討ち抜く', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'physical_offense_multiplier_xV', value: 1.4 }, { type: 'evasion', value: -0.005 }] },
  { value: 76, title: '魔極めし', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'magical_offense_multiplier_xV', value: 1.4 }, { type: 'accuracy', value: -0.005 }] },
  { value: 77, title: '牙剝く', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'physical_offense_multiplier_xV', value: 1.2 }, { type: 'magical_offense_multiplier_xV', value: 1.2 }] },
  { value: 78, title: '深淵を覗く', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'magical_attack', value: 0.4 }, { type: 'physical_attack', value: 0.1 }] },
  { value: 79, title: '疾風の如く', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'physical_attack', value: 0.4 }, { type: 'evasion', value: 0.01 }] },
  { value: 80, title: '祝福されし', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'physical_defense_multiplier_xV', value: 3 / 5 }, { type: 'magical_defense_multiplier_xV', value: 3 / 5 }] },
  { value: 81, title: '災いもたらす', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'growth_xV', value: 0.9 }, { type: 'magical_offense_multiplier_xV', value: 1.5 }] },
  { value: 82, title: '呪われし', tickets: 1, multiplier: 2.0, bonuses: [{ type: 'antagonism', value: 1 }, { type: 'growth_xV', value: 1.8 }] },
];

export function getSuperRareBonuses(value: number): Bonus[] {
  return SUPER_RARE_TITLES.find((title) => title.value === value)?.bonuses ?? [];
}

// ============================================================
// Item generation types
// ============================================================
type Rarity = 'common' | 'uncommon' | 'eliteRare' | 'bossRare' | 'mythicRare';
type EliteSource = 'A' | 'B' | 'C';

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
  meleeNoABonus?: number;
  rangedNoABonus?: number;
  magicalNoABonus?: number;
  accuracyBonus?: number;
  evasionBonus?: number;
  vitalityBonus?: number;
  strengthBonus?: number;
  intelligenceBonus?: number;
  mindBonus?: number;
  penetBonus?: number;
};

type ItemTemplate = {
  category: ItemCategory;
  variant1Mod?: ItemVariantMod;
  variant2Mod?: ItemVariantMod;
  variant3Mod?: ItemVariantMod;
  mythicBonusMod?: ItemVariantMod;
};

// ============================================================
// Item generation constants
// ============================================================

// Base power per tier (updated item scale)
const TIER_BASE_POWER = [12, 18, 26, 35, 45, 60, 80, 100, 130, 160];
const TIER_NOA_BASE_POWER = [0.8, 0.7, 0.6, 0.5, 0.4, 0.4, 0.3, 0.3, 0.2, 0.2];
const TIER_F_BONUS = [0.13, 0.12, 0.11, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03];
const TIER_G_BONUS = [0.013, 0.012, 0.011, 0.009, 0.008, 0.007, 0.006, 0.005, 0.004, 0.003];
const TIER_H_BONUS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const TIER_J_PENALTY = [-0.001, -0.002, -0.003, -0.004, -0.005, -0.006, -0.007, -0.008, -0.009, -0.01];
const TIER_K_PENALTY = [-1.0, -1.2, -1.4, -1.6, -1.8, -2.0, -2.2, -2.4, -2.6, -2.8];
const TIER_L_BONUS = [0.15, 0.14, 0.13, 0.12, 0.11, 0.10, 0.09, 0.08, 0.07, 0.06];
const TIER_M_RESIST_PENALTY = [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1];
const TIER_N_BONUS = [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.011];
const TIER_P_BONUS = [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.11];
const TIER_Q_BONUS = [0.23, 0.22, 0.21, 0.20, 0.19, 0.18, 0.17, 0.16, 0.15, 0.14];

// SpecRef: 3.1.2 | Item list | type.amplifier of base_power
const TYPE_AMPLIFIERS: Record<ItemCategory, number> = {
  armor: 1.4,
  robe: 1.15,
  shield: 1.6,
  sword: 1.1,
  katana: 1.43,
  gauntlet: 1.0,
  arrow: 0.85,
  bolt: 1.11,
  archery: 1.0,
  wand: 0.75,
  grimoire: 0.98,
  catalyst: 1.0,
};

const RARITY_AMPLIFIERS: Record<Rarity, number> = {
  common: 1.0,
  uncommon: 1.35,
  eliteRare: 1.67,
  bossRare: 2.0,
  mythicRare: 2.4,
};

const ITEM_ADDITIONAL_BONUS_BY_NAME: Record<string, Bonus[]> = {
  'アイギスの盾': [{ type: 'physical_defense_multiplier_xV', value: 2 / 3 }],
  '銀鏡の盾': [{ type: 'magical_defense_multiplier_xV', value: 2 / 3 }],
  '氷牙の防盾': [{ type: 'ice_defense_multiplier_xV', value: 2 / 3 }],
  '雷電の防盾': [{ type: 'thunder_defense_multiplier_xV', value: 2 / 3 }],
  '紅の防盾': [{ type: 'fire_defense_multiplier_xV', value: 2 / 3 }],
  '霧払': [{ type: 'ability', value: 1, abilityId: 'true_sight', abilityLevel: 1 }],
  '甲鎧': [{ type: 'ability', value: 1, abilityId: 'null_death_touch', abilityLevel: 1 }],
  '白霜牙の剣': [{ type: 'ice_offense', value: 0.02 }],
  '氷霜の矢': [{ type: 'ice_offense', value: 0.02 }],
  '氷霜の太刀': [{ type: 'ice_offense', value: 0.02 }],
  'シトロネラの衣': [{ type: 'ability', value: 1, abilityId: 'null_life_drain', abilityLevel: 1 }],
  'ファーストエイド': [{ type: 'ability', value: 1, abilityId: 'first_aid', abilityLevel: 1 }],
  '粘膜覆': [{ type: 'ability', value: 1, abilityId: 'null_corrode', abilityLevel: 1 }],
  '硫酸刺': [{ type: 'ability', value: 1, abilityId: 'corrode', abilityLevel: 1 }],
  '小刀': [{ type: 'ability', value: 1, abilityId: 'vine_cutter', abilityLevel: 1 }],
  '蒼き護符': [{ type: 'ability', value: 1, abilityId: 'mana_ward', abilityLevel: 1 }],
  '雷式': [{ type: 'thunder_offense', value: 0.03 }, { type: 'strength', value: 1 }],
  '矢払盾': [{ type: 'ability', value: 1, abilityId: 'deflection', abilityLevel: 1 }],
  '崩壊核': [{ type: 'ability', value: 1, abilityId: 'decompose', abilityLevel: 1 }],
  'スケールメイル': [{ type: 'ability', value: 1, abilityId: 'null_burn', abilityLevel: 1 }],
  '火鼠の皮衣': [{ type: 'fire_defense_multiplier_xV', value: 3 / 5 }],
  'ドラグスレイブ': [{ type: 'fire_offense', value: 0.03 }],
  '演式核': [{ type: 'ability', value: 1, abilityId: 'equation_breaker', abilityLevel: 1 }],
  '絶縁体': [{ type: 'ability', value: 1, abilityId: 'null_shock', abilityLevel: 1 }],
  '大鎌': [{ type: 'ability', value: 1, abilityId: 'soul_reap', abilityLevel: 1 }, { type: 'fire_defense_multiplier_xV', value: 1.3 }],
  '冥府の矢': [{ type: 'ability', value: 1, abilityId: 'life_drain', abilityLevel: 1 }, { type: 'fire_defense_multiplier_xV', value: 1.3 }],
  '冥府の剣': [{ type: 'ability', value: 1, abilityId: 'life_drain', abilityLevel: 1 }, { type: 'fire_defense_multiplier_xV', value: 1.3 }],
  '刻憶の書': [{ type: 'ability', value: 1, abilityId: 'unforgettable', abilityLevel: 1 }],
  '魔封晶': [{ type: 'ability', value: 1, abilityId: 'magic_seal', abilityLevel: 1 }],
  '風羽衣': [{ type: 'ability', value: 1, abilityId: 'wind_rider', abilityLevel: 1 }],
  '毛皮衣': [{ type: 'ability', value: 1, abilityId: 'coldproof', abilityLevel: 1 }],
  '破城槌': [{ type: 'ability', value: 1, abilityId: 'siege', abilityLevel: 1 }],
  '焔断': [{ type: 'ability', value: 1, abilityId: 'fire_protect_breaker', abilityLevel: 1 }],
  '雷切': [{ type: 'ability', value: 1, abilityId: 'thunder_protect_breaker', abilityLevel: 1 }],
  '白妙': [{ type: 'ability', value: 1, abilityId: 'ice_protect_breaker', abilityLevel: 1 }],
  '祓詞': [{ type: 'ability', value: 1, abilityId: 'm_barrier_breaker', abilityLevel: 1 }],
  '境断': [{ type: 'ability', value: 1, abilityId: 'domain_breaker', abilityLevel: 1 }],
  '鮫肌の鎧': [{ type: 'ability', value: 1, abilityId: 'execution_null', abilityLevel: 1 }],
  '狐假虎威': [{ type: 'ability', value: 1, abilityId: 'rage_breaker', abilityLevel: 1 }],
  '乾風衣': [{ type: 'ability', value: 1, abilityId: 'dryproof', abilityLevel: 1 }],
  '追跡の鎌': [{ type: 'ability', value: 1, abilityId: 'pursuit', abilityLevel: 1 }],
  '鉄礫': [{ type: 'ability', value: 1, abilityId: 'illusion_breaker', abilityLevel: 1 }],
  '破壊腕': [{ type: 'ability', value: 1, abilityId: 'bulwark_breaker', abilityLevel: 1 }],
  'サバイバル入門書': [{ type: 'ability', value: 1, abilityId: 'anti_ambush', abilityLevel: 1 }],
  '影衣': [{ type: 'ability', value: 1, abilityId: 'anti_overwatch', abilityLevel: 1 }],
  '俊敏の弓': [
    { type: 'ability', value: 1, abilityId: 'boost', abilityLevel: 1 },
    { type: 'physical_defense_multiplier_xV', value: 1.1 },
  ],
  'はやぶさの剣': [
    { type: 'ability', value: 1, abilityId: 'boost', abilityLevel: 1 },
    { type: 'physical_defense_multiplier_xV', value: 1.1 },
  ],
  'ホーリーソード': [{ type: 'ability', value: 1, abilityId: 'requiem', abilityLevel: 1 }],
  'ホーリーアロー': [{ type: 'ability', value: 1, abilityId: 'requiem', abilityLevel: 1 }],
  '灰色の石': [{ type: 'ability', value: 1, abilityId: 'slow', abilityLevel: 1 }],
  '忘却の書': [
    { type: 'ability', value: 1, abilityId: 'fading_memory', abilityLevel: 1 },
    { type: 'ice_defense_multiplier_xV', value: 3.0 },
    { type: 'ice_defense_multiplier_xV', value: 2.0 },
    { type: 'thunder_defense_multiplier_xV', value: 2.0 },
  ],
  '反乱の手引': [{ type: 'ability', value: 1, abilityId: 'defiance', abilityLevel: 1 }],
};

const ITEM_CORE_CONCEPT_KEYS: Record<ItemCategory, Array<keyof ItemDef>> = {
  armor: ['physicalDefense'],
  robe: ['magicalDefense'],
  shield: ['partyHP'],
  sword: ['meleeAttack'],
  katana: ['meleeAttack'],
  gauntlet: ['meleeNoA', 'physicalDefense'],
  arrow: ['rangedAttack'],
  bolt: ['rangedAttack'],
  archery: ['rangedNoA', 'partyHP'],
  wand: ['magicalAttack'],
  grimoire: ['magicalAttack'],
  catalyst: ['magicalNoA', 'partyHP'],
};

type ItemStatKey = Exclude<keyof ItemDef, 'id' | 'category' | 'name' | 'bonuses' | 'baseMultiplier'>;

function stripItemToCoreConcept(item: ItemDef): void {
  const allowedKeys = new Set<ItemStatKey>(ITEM_CORE_CONCEPT_KEYS[item.category] as ItemStatKey[]);
  const itemStatKeys: ItemStatKey[] = [
    'meleeAttack', 'meleeNoA', 'meleeNoABonus',
    'rangedAttack', 'rangedNoA', 'rangedNoABonus',
    'magicalAttack', 'magicalNoA', 'magicalNoABonus',
    'partyHP', 'physicalDefense', 'magicalDefense',
    'elementalOffense', 'elementalOffenseBonus',
    'accuracyBonus', 'evasionBonus',
    'vitalityBonus', 'strengthBonus', 'intelligenceBonus', 'mindBonus',
    'penetBonus',
  ];
  for (const key of itemStatKeys) {
    if (!allowedKeys.has(key)) item[key] = undefined;
  }
}

// SpecRef: 3.2.1 | Item drop | Special Bonus Override
function applyAdditionalItemBonus(item: ItemDef): void {
  const additionalBonuses = ITEM_ADDITIONAL_BONUS_BY_NAME[item.name];
  if (!additionalBonuses || additionalBonuses.length === 0) return;

  // Special items only keep their core concept plus the special-bonus.
  stripItemToCoreConcept(item);
  item.bonuses = [...additionalBonuses];
}

function getMasterItemName(tier: number, rarity: Rarity, category: ItemCategory, variantIndex?: number): string | undefined {
  if (rarity === 'mythicRare') return undefined;
  const names = getMasterItemNames(tier, rarity, category);
  if (!names || names.length === 0) return undefined;
  const index = Math.max(0, variantIndex ?? 0);
  return names[index];
}
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
    category: 'armor',
    variant1Mod: { partyHP: 3 },
    variant2Mod: { magicalDefense: 2 },
    variant3Mod: { physicalDefense: 2},
    mythicBonusMod: { vitalityBonus: 1 },
  },
  // Index 1: robe (法衣) - +magicalDefense
  {
    category: 'robe',
    variant1Mod: { partyHP: 3 },
    variant2Mod: { evasionBonus: 0.01 },
    variant3Mod: { magicalDefense: 2 },
    mythicBonusMod: { intelligenceBonus: 1 },
  },
  // Index 2: shield (盾) - +HP, +physicalDefense
  {
    category: 'shield',
    variant1Mod: { physicalDefense: 1 },
    variant2Mod: { meleeAttack: 1 },
    variant3Mod: { partyHP: 2 },
    mythicBonusMod: { mindBonus: 1 },
  },
  // Index 3: sword (剣) - +meleeAttack
  {
    category: 'sword',
    variant1Mod: { physicalDefense: 2 },
    variant2Mod: { partyHP: 1 },
    variant3Mod: { meleeAttack: 2 },
    mythicBonusMod: { strengthBonus: 1 },
  },
  // Index 4: katana (刀) - +meleeAttack, -meleeNoA
  {
    category: 'katana',
    variant1Mod: { penetBonus: 0.01 },
    variant2Mod: { penetBonus: 0.02 },
    variant3Mod: { meleeAttack: 2 },
    mythicBonusMod: { mindBonus: 1 },
  },
  // Index 5: gauntlet (籠手) - +meleeNoA
  {
    category: 'gauntlet',
    variant1Mod: { partyHP: 2 },
    variant2Mod: { physicalDefense: 1 },
    variant3Mod: { meleeAttack: 1 },
    mythicBonusMod: { vitalityBonus: 1 },
  },
  // Index 6: arrow (矢) - +rangedAttack
  {
    category: 'arrow',
    variant1Mod: { elementalOffense: 'fire' },
    variant2Mod: { elementalOffense: 'ice' },
    variant3Mod: { rangedAttack: 1 },
    mythicBonusMod: { strengthBonus: 1 },
  },
  // Index 7: bolt (ボルト) - +rangedAttack, -rangedNoA
  {
    category: 'bolt',
    variant1Mod: { rangedAttack: 1 },
    variant2Mod: { elementalOffense: 'thunder' },
    variant3Mod: { rangedAttack: 1 },
    mythicBonusMod: { vitalityBonus: 1 },
  },
  // Index 8: archery (弓) - +rangedNoA
  {
    category: 'archery',
    variant1Mod: { accuracyBonus: 0.01 },
    variant2Mod: { partyHP: 2 },
    variant3Mod: { evasionBonus: 0.01 },
    mythicBonusMod: { strengthBonus: 1 },
  },
  // Index 9: wand (ワンド) - +magicalAttack
  {
    category: 'wand',
    variant1Mod: { magicalDefense: 2 },
    variant2Mod: { magicalAttack: 1 },
    variant3Mod: { magicalAttack: 1 },
    mythicBonusMod: { intelligenceBonus: 1 },
  },
  // Index 10: grimoire (魔導書) - +magicalAttack, -magicalNoA
  {
    category: 'grimoire',
    variant1Mod: { magicalAttack: 1 },
    variant2Mod: { magicalDefense: 1 },
    variant3Mod: { magicalAttack: 1 },
    mythicBonusMod: { mindBonus: 1 },
  },
  // Index 11: catalyst (触媒) - +magicalNoA
  {
    category: 'catalyst',
    variant1Mod: { magicalDefense: 1 },
    variant2Mod: { elementalOffense: 'fire' },
    variant3Mod: { elementalOffense: 'thunder' },
    mythicBonusMod: { intelligenceBonus: 1 },
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
  return Math.ceil(basePower * amplifier);
}

function calculateNoA(basePower: number, amplifier: number): number {
  return Number((basePower * amplifier).toFixed(2));
}

function getTierIndex(tier: number): number {
  return Math.max(0, Math.min(tier - 1, TIER_BASE_POWER.length - 1));
}

function getBonusTier(baseTier: number, rarity: Rarity, column: 'F' | 'G' | 'H' | 'J' | 'K' | 'L' | 'M' | 'N' | 'P' | 'Q'): number {
  if (column === 'J' || column === 'K') return baseTier;
  if (rarity === 'uncommon') return Math.min(baseTier + 1, 10);
  if (rarity === 'eliteRare') return Math.min(baseTier + 2, 10);
  return baseTier;
}

function getExpeditionElementByTier(tier: number): ElementalOffense {
  // SpecRef: 3.1.2 | Item list | Elemental by expedition
  const table: Record<number, ElementalOffense> = {
    1: 'none',
    2: 'ice',
    3: 'thunder',
    4: 'fire',
    5: 'fire',
    6: 'thunder',
    7: 'ice',
    8: 'none',
  };
  return table[tier] ?? 'none';
}

function addElementalResistancePenalty(item: ItemDef, tier: number, element: ElementalOffense): void {
  if (element === 'none') return;
  const resistPenalty = TIER_M_RESIST_PENALTY[getTierIndex(tier)];
  const resistPercent = Math.max(0, Math.abs(resistPenalty));
  const bonuses = item.bonuses ?? [];
  if (element === 'fire') bonuses.push({ type: 'fire_defense', value: resistPercent });
  if (element === 'ice') bonuses.push({ type: 'ice_defense', value: resistPercent });
  if (element === 'thunder') bonuses.push({ type: 'thunder_defense', value: resistPercent });
  item.bonuses = bonuses;
}
function addRarityCBonus(item: ItemDef, template: ItemTemplate, bonusTierN: number, bonusTierP: number): void {
  const cTierN = getTierIndex(bonusTierN);
  const cTierP = getTierIndex(bonusTierP);
  if (template.category === 'robe' || template.category === 'arrow') {
    item.evasionBonus = (item.evasionBonus || 0) + TIER_N_BONUS[cTierN];
  }
  if (template.category === 'sword' || template.category === 'archery') {
    item.accuracyBonus = (item.accuracyBonus || 0) + TIER_N_BONUS[cTierN];
  }
  if (template.category === 'katana' || template.category === 'bolt' || template.category === 'grimoire') {
    item.penetBonus = (item.penetBonus || 0) + TIER_P_BONUS[cTierP];
  }
  if (template.category === 'gauntlet') {
    item.bonuses = [...(item.bonuses ?? []), { type: 'physical_defense', value: TIER_P_BONUS[cTierP] }];
  }
  if (template.category === 'catalyst') {
    item.bonuses = [...(item.bonuses ?? []), { type: 'magical_defense', value: TIER_P_BONUS[cTierP] }];
  }
}

function createItem(
  id: number,
  tier: number,
  rarity: Rarity,
  template: ItemTemplate,
  variantIndex?: number,
  forcedName?: string,
  eliteSource: EliteSource = 'A'
): ItemDef | null {
  // SpecRef: 3.1.2 | Item list | Rarity base
  const basePower = TIER_BASE_POWER[getTierIndex(tier)];
  const typeAmplifier = TYPE_AMPLIFIERS[template.category];
  const rarityAmplifier = RARITY_AMPLIFIERS[rarity];
  const amplifier = typeAmplifier * rarityAmplifier;
  const noaBasePower = TIER_NOA_BASE_POWER[getTierIndex(tier)];
  const bonusTierF = getBonusTier(tier, rarity, 'F');
  const bonusTierG = getBonusTier(tier, rarity, 'G');
  const bonusTierH = getBonusTier(tier, rarity, 'H');
  const bonusTierL = getBonusTier(tier, rarity, 'L');
  const bonusTierM = getBonusTier(tier, rarity, 'M');
  const bonusTierN = getBonusTier(tier, rarity, 'N');
  const bonusTierP = getBonusTier(tier, rarity, 'P');
  const bonusTierQ = getBonusTier(tier, rarity, 'Q');
  const bonusTierJ = getBonusTier(tier, rarity, 'J');
  const bonusTierK = getBonusTier(tier, rarity, 'K');
  const expeditionElement = getExpeditionElementByTier(tier);
  const hasBaseBonus = rarity !== 'bossRare' && rarity !== 'mythicRare';
  const hasE =
    rarity === 'uncommon'
    || (rarity === 'eliteRare' && eliteSource === 'A');
  const hasX =
    rarity === 'bossRare'
    || rarity === 'mythicRare'
    || (rarity === 'eliteRare' && (eliteSource === 'A' || eliteSource === 'B'));
  const hasY =
    rarity === 'mythicRare'
    || (rarity === 'eliteRare' && (eliteSource === 'B' || eliteSource === 'C'));
  const hasC =
    rarity === 'bossRare'
    || rarity === 'mythicRare'
    || (rarity === 'eliteRare' && eliteSource === 'C');

  const masterName = forcedName ?? getMasterItemName(tier, rarity, template.category, variantIndex);
  const name = masterName;
  if (!name) return null;

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
      if (hasX) item.partyHP = calculateStat(basePower, amplifier * 0.6);
      if (hasY) item.magicalDefense = calculateStat(basePower, amplifier * 0.3);
      break;
    case 'robe':
      item.magicalDefense = calculateStat(basePower, amplifier);
      if (hasX) item.partyHP = calculateStat(basePower, amplifier * 0.6);
      if (hasY) item.physicalDefense = calculateStat(basePower, amplifier * 0.3);
      break;
    case 'shield':
      item.partyHP = calculateStat(basePower, amplifier);
      if (hasX) item.physicalDefense = calculateStat(basePower, amplifier * 0.2);
      if (hasY) item.magicalDefense = calculateStat(basePower, amplifier * 0.2);
      break;
    case 'sword':
      item.meleeAttack = calculateStat(basePower, amplifier);
      if (hasX) item.physicalDefense = calculateStat(basePower, amplifier * 0.25);
      if (hasY) item.partyHP = calculateStat(basePower, amplifier * 0.85);
      break;
    case 'katana':
      item.meleeAttack = calculateStat(basePower, amplifier);
      if (hasBaseBonus) {
        item.meleeNoABonus = TIER_K_PENALTY[getTierIndex(bonusTierK)];
        item.evasionBonus = TIER_J_PENALTY[getTierIndex(bonusTierJ)];
      }
      if (hasX) item.partyHP = calculateStat(basePower, amplifier * 0.55);
      if (hasY) {
        item.magicalDefense = calculateStat(basePower, amplifier * 0.3);
      }
      break;
    case 'gauntlet':
      item.meleeNoA = calculateNoA(noaBasePower, amplifier);
      if (hasX) item.physicalDefense = calculateStat(basePower, amplifier * 0.3);
      if (hasBaseBonus) item.meleeNoABonus = TIER_H_BONUS[getTierIndex(bonusTierH)];
      break;
    case 'arrow':
      item.rangedAttack = calculateStat(basePower, amplifier);
      if (hasX) item.partyHP = calculateStat(basePower, amplifier * 0.55);
      if (hasY) {
        item.physicalDefense = calculateStat(basePower, amplifier * 0.32);
      }
      break;
    case 'bolt':
      item.rangedAttack = calculateStat(basePower, amplifier);
      if (hasBaseBonus) {
        item.rangedNoABonus = TIER_K_PENALTY[getTierIndex(bonusTierK)];
        item.evasionBonus = TIER_J_PENALTY[getTierIndex(bonusTierJ)];
      }
      if (hasX) item.magicalDefense = calculateStat(basePower, amplifier * 0.28);
      if (hasY) {
        item.partyHP = calculateStat(basePower, amplifier * 0.7);
      }
      break;
    case 'archery':
      item.rangedNoA = calculateNoA(noaBasePower, amplifier);
      if (hasBaseBonus) item.rangedNoABonus = TIER_H_BONUS[getTierIndex(bonusTierH)];
      if (hasX) item.partyHP = calculateStat(basePower, amplifier * 0.52);
      break;
    case 'wand':
      item.magicalAttack = calculateStat(basePower, amplifier);
      if (hasX) item.magicalDefense = calculateStat(basePower, amplifier * 0.3);
      if (hasY) {
        item.partyHP = calculateStat(basePower, amplifier * 0.55);
      }
      break;
    case 'grimoire':
      item.magicalAttack = calculateStat(basePower, amplifier);
      if (hasBaseBonus) {
        item.magicalNoABonus = TIER_K_PENALTY[getTierIndex(bonusTierK)];
        item.evasionBonus = TIER_J_PENALTY[getTierIndex(bonusTierJ)];
      }
      if (hasX) item.physicalDefense = calculateStat(basePower, amplifier * 0.22);
      if (hasY) {
        item.magicalDefense = calculateStat(basePower, amplifier * 0.26);
      }
      break;
    case 'catalyst':
      item.magicalNoA = calculateNoA(noaBasePower, amplifier);
      if (hasBaseBonus) item.magicalNoABonus = TIER_H_BONUS[getTierIndex(bonusTierH)];
      if (hasX) item.partyHP = calculateStat(basePower, amplifier * 0.52);
      break;
  }
  if (hasE) {
    if (template.category === 'sword' && expeditionElement === 'fire') {
      item.elementalOffense = 'fire';
      item.elementalOffenseBonus = TIER_L_BONUS[getTierIndex(bonusTierL)];
    }
    if (template.category === 'arrow' || template.category === 'bolt' || template.category === 'catalyst') {
      if (expeditionElement !== 'none') {
        item.elementalOffense = expeditionElement;
        item.elementalOffenseBonus = TIER_L_BONUS[getTierIndex(bonusTierL)];
      }
    }
    if (template.category === 'grimoire' && (expeditionElement === 'ice' || expeditionElement === 'thunder')) {
      item.elementalOffense = expeditionElement;
      item.elementalOffenseBonus = TIER_L_BONUS[getTierIndex(bonusTierL)];
    }
    const expeditionElementResistanceCategories = new Set<ItemCategory>([
      'armor',
      'robe',
      'shield',
      'katana',
      'wand',
    ]);
    if (expeditionElementResistanceCategories.has(template.category) && expeditionElement !== 'none') {
      addElementalResistancePenalty(item, bonusTierM, expeditionElement);
    }
  }

  // SpecRef: 3.1.2 | Item list | Y-bonus
  if (hasY && template.category === 'archery' && expeditionElement !== 'none') {
    addElementalResistancePenalty(item, bonusTierM, expeditionElement);
  }

  if (hasBaseBonus) {
    const bonusTierFIndex = getTierIndex(bonusTierF);
    const bonusTierQIndex = getTierIndex(bonusTierQ);
    const addCBonus = (
      type: 'physical_defense' | 'magical_defense' | 'melee_attack' | 'ranged_attack' | 'magical_attack',
      value: number
    ): void => {
      item.bonuses = [...(item.bonuses ?? []), { type, value }];
    };

    if (template.category === 'armor') addCBonus('physical_defense', TIER_F_BONUS[bonusTierFIndex]);
    if (template.category === 'robe') addCBonus('magical_defense', TIER_F_BONUS[bonusTierFIndex]);
    if (template.category === 'sword') addCBonus('melee_attack', TIER_Q_BONUS[bonusTierQIndex]);
    if (template.category === 'katana') addCBonus('melee_attack', TIER_F_BONUS[bonusTierFIndex]);
    if (template.category === 'arrow') addCBonus('ranged_attack', TIER_Q_BONUS[bonusTierQIndex]);
    if (template.category === 'bolt') addCBonus('ranged_attack', TIER_F_BONUS[bonusTierFIndex]);
    if (template.category === 'wand') addCBonus('magical_attack', TIER_Q_BONUS[bonusTierQIndex]);
    if (template.category === 'grimoire') addCBonus('magical_attack', TIER_F_BONUS[bonusTierFIndex]);
    if (template.category === 'shield') item.evasionBonus = (item.evasionBonus || 0) + TIER_G_BONUS[getTierIndex(bonusTierG)];
    if (template.category === 'sword') item.accuracyBonus = (item.accuracyBonus || 0) + TIER_N_BONUS[getTierIndex(bonusTierN)];
    if (template.category === 'archery') item.accuracyBonus = (item.accuracyBonus || 0) + TIER_N_BONUS[getTierIndex(bonusTierN)];
  }

  if (item.elementalOffense && item.elementalOffense !== expeditionElement) {
    item.elementalOffense = 'none';
    item.elementalOffenseBonus = undefined;
  }

  if (hasC) {
    addRarityCBonus(item, template, bonusTierN, bonusTierP);
  }

  if (rarity === 'bossRare' || rarity === 'mythicRare') {
    if (template.category === 'armor' || template.category === 'gauntlet') item.vitalityBonus = 1;
    if (template.category === 'robe' || template.category === 'wand' || template.category === 'catalyst') item.intelligenceBonus = 1;
    if (template.category === 'shield' || template.category === 'katana' || template.category === 'grimoire') item.mindBonus = 1;
    if (template.category === 'sword' || template.category === 'arrow' || template.category === 'archery') item.strengthBonus = 1;
  }

  applyAdditionalItemBonus(item);

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
      const item = createItem(id, tier, 'common', template);
      if (item) items.push(item);
    }

    // Uncommon items (24 per tier - two of each type)
    for (let i = 0; i < ITEM_TEMPLATES.length; i++) {
      const template = ITEM_TEMPLATES[i];
      // Variant 1
      const id1 = tier * 1000 + 200 + i * 2 + 1; // T2CC format
      const item1 = createItem(id1, tier, 'uncommon', template, 0);
      if (item1) items.push(item1);
      // Variant 2
      const id2 = tier * 1000 + 200 + i * 2 + 2;
      const item2 = createItem(id2, tier, 'uncommon', template, 1);
      if (item2) items.push(item2);
    }

    // Elite rare items (master-spec driven variants per category)
    let eliteRareOffset = 1;
    for (let i = 0; i < ITEM_TEMPLATES.length; i++) {
      const template = ITEM_TEMPLATES[i];
      const names = getMasterItemNames(tier, 'eliteRare', template.category);
      for (let variantIndex = 0; variantIndex < names.length; variantIndex++) {
        const id = tier * 1000 + 300 + eliteRareOffset; // T3CC format
        const eliteSource = (['A', 'B', 'C'][variantIndex] ?? 'C') as EliteSource;
        const item = createItem(id, tier, 'eliteRare', template, variantIndex, undefined, eliteSource);
        if (item) items.push(item);
        eliteRareOffset += 1;
      }
    }

    // Boss rare items (master-spec driven categories per tier)
    const bossRareCategories = getMasterItemCategoriesByRarity(tier, 'bossRare');
    bossRareCategories.forEach((category, index) => {
      const template = ITEM_TEMPLATE_BY_CATEGORY[category];
      if (!template) return;
      const id = tier * 1000 + 400 + index + 1; // T4CC format
      const item = createItem(id, tier, 'bossRare', template);
      if (item) items.push(item);
    });
  }

  // Mythic rare items from gods (2.2)
  GOD_MYTHIC_DROPS.forEach((drop, index) => {
    const template = ITEM_TEMPLATE_BY_CATEGORY[drop.category];
    const id = 8500 + index + 1;
    const item = createItem(id, drop.tier, 'mythicRare', template, undefined, drop.name);
    if (item) {
      if (drop.bonuses) {
        item.bonuses = drop.bonuses;
      }
      items.push(item);
      GOD_MYTHIC_DROP_TIER_BY_ID.set(item.id, drop.tier);
    }
  });

  return items;
}

export const ITEMS: ItemDef[] = generateItems();

// ============================================================
// Item lookup helpers
// ============================================================

// Item lookup by tier and rarity
export function getItemsByTierAndRarity(tier: number, rarity: Rarity): ItemDef[] {
  if (rarity === 'mythicRare') {
    return ITEMS.filter((item) => GOD_MYTHIC_DROP_TIER_BY_ID.get(item.id) === tier);
  }

  const tierBase = tier * 1000;
  const rarityBase = { common: 100, uncommon: 200, eliteRare: 300, bossRare: 400, mythicRare: 500 }[rarity];
  return ITEMS.filter(i => i.id >= tierBase + rarityBase && i.id < tierBase + rarityBase + 100);
}

export const getItemById = (id: number): ItemDef | undefined =>
  ITEMS.find(i => i.id === id);
