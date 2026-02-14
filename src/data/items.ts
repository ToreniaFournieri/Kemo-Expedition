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
  baseName: string;
  variants?: [string, string];
  rareName?: string;
  mythicName?: string;
  variant1Mod?: ItemVariantMod;
  variant2Mod?: ItemVariantMod;
  variant3Mod?: ItemVariantMod;
  mythicBonusMod?: ItemVariantMod;
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

type MasterItemNameTable = Record<number, Partial<Record<Rarity, Partial<Record<ItemCategory, string[]>>>>>;

const MASTER_ITEM_NAMES: MasterItemNameTable = {
  1: {
    common: {
      archery: ['木の短弓'],
      armor: ['木の胸当て', '獣皮の鎧'],
      arrow: ['石の矢', '骨の矢'],
      catalyst: ['火打ち石の触媒'],
      grimoire: ['樹皮の符帳'],
      robe: ['草編みの法衣', '獣毛の外套'],
      shield: ['木の盾', '樹皮の盾'],
      sword: ['木の棒', '尖らせた木杭', '骨のこん棒'],
      wand: ['枝の杖', '焦げ木の杖'],
    },
    uncommon: {
      archery: ['つる巻き弓'],
      armor: ['硬革の鎧'],
      arrow: ['黒曜石の炎矢', '黒曜石の氷矢'],
      catalyst: ['琥珀粉の触媒'],
      grimoire: ['洞窟壁画の呪頁'],
      robe: ['苔縫いの法衣'],
      shield: ['骨枠の盾'],
      sword: ['黒曜石の短剣', '牙のナイフ'],
      wand: ['精霊樹の杖'],
    },
    rare: {
      archery: ['古代樹の長弓'],
      armor: ['角骨の鎧'],
      arrow: ['雷打ち石の矢'],
      catalyst: ['三色灰の触媒'],
      grimoire: ['獣血の呪典'],
      robe: ['月苔の法衣'],
      shield: ['巨木の円盾'],
      sword: ['原始の石剣'],
      wand: ['星木の杖'],
    },
    mythic: {
      grimoire: ['原初契約の石板'],
      shield: ['大地の心臓殻盾'],
      sword: ['始まりの牙剣'],
    },
  },
  2: {
    common: {
      archery: ['角骨の弓'],
      armor: ['石板縫いの鎧', '骨留めの革鎧'],
      arrow: ['剥片石の矢', '尖頭石の矢'],
      catalyst: ['砕石粉の触媒'],
      grimoire: ['岩壁刻文の呪頁'],
      robe: ['石粉まみれの法衣', '風紋の獣皮衣'],
      shield: ['石板の盾', '岩皮の円盾'],
      sword: ['石刃の短剣', '欠け石の石剣', '削片の石斧'],
      wand: ['刻紋石の杖', '風穴石の杖'],
    },
    uncommon: {
      archery: ['岩角の長弓'],
      armor: ['磨石板の鎧'],
      arrow: ['黒曜尖石の炎矢', '黒曜尖石の氷矢'],
      catalyst: ['磁石砂の触媒'],
      grimoire: ['断崖壁画の呪典'],
      robe: ['霧染みの法衣'],
      shield: ['黒岩の重盾'],
      sword: ['黒曜石の石刃', '磨石の石剣'],
      wand: ['風刻みの石杖'],
    },
    rare: {
      archery: ['断崖狩人の戦弓'],
      armor: ['岩王の石甲'],
      arrow: ['風哭きの石矢'],
      catalyst: ['嵐灰の触媒'],
      grimoire: ['風刻岩の秘呪書'],
      robe: ['断崖司祭の法衣'],
      shield: ['断崖守護の巨盾'],
      sword: ['裂風の黒曜石剣'],
      wand: ['嵐紋の霊石杖'],
    },
    mythic: {
      archery: ['天裂きの断崖戦弓'],
      armor: ['風哭きの岩王鎧'],
      sword: ['断崖王の黒曜大剣'],
    },
  },
  3: {
    common: {
      archery: ['青銅留めの弓'],
      armor: ['青銅縫いの鎧', '革下地の青銅鎧'],
      arrow: ['青銅鏃の矢', '霧研ぎの青銅矢'],
      catalyst: ['霧結晶の触媒'],
      grimoire: ['幻林の呪頁'],
      robe: ['霧染みの法衣', '樹皮織りの法衣'],
      shield: ['青銅縁の木盾', '青銅円盾'],
      sword: ['青銅の短剣', '青銅の片刃剣', '青銅の直剣'],
      wand: ['霧晶の青銅杖', '樹霊刻みの杖'],
    },
    uncommon: {
      archery: ['狐狩人の戦弓'],
      armor: ['狐族戦士の青銅鎧'],
      arrow: ['幻裂きの青銅炎矢', '幻裂きの青銅氷矢'],
      catalyst: ['霧精粉の触媒'],
      grimoire: ['幻霧の秘呪書'],
      robe: ['幻術師の法衣'],
      shield: ['霧払いの青銅盾'],
      sword: ['狐紋の青銅剣', '霧鍛えの青銅剣'],
      wand: ['幻導の青銅杖'],
    },
    rare: {
      archery: ['霧裂きの戦弓'],
      armor: ['樹霧守護の青銅鎧'],
      arrow: ['幻貫の青銅矢'],
      catalyst: ['幻晶核の触媒'],
      grimoire: ['樹霧幻術大全'],
      robe: ['霧林司祭の法衣'],
      shield: ['幻樹の青銅大盾'],
      sword: ['幻断の青銅剣'],
      wand: ['幻導の青銅霊杖'],
    },
    mythic: {
      grimoire: ['森幻王の禁呪書'],
      robe: ['霧界支配の法衣'],
      sword: ['幻樹王の青銅剣'],
    },
  },
  4: {
    common: {
      archery: ['鉄留めの戦弓'],
      armor: ['鉄縫いの鎧', '熔岩煤の鉄鎧'],
      arrow: ['鉄鏃の矢', '焼入れ鉄矢'],
      catalyst: ['炉滓結晶の触媒'],
      grimoire: ['炉壁刻文の呪頁'],
      robe: ['炉灰染みの法衣', '耐熱布の法衣'],
      shield: ['鉄縁の盾', '熔岩煤の鉄盾'],
      sword: ['鉄の短剣', '鍛鉄の片刃剣', '粗鍛えの鉄剣'],
      wand: ['炉心鉄の杖', '熔岩核の鉄杖'],
    },
    uncommon: {
      archery: ['熊狩人の戦弓'],
      armor: ['霊峰鍛冶の鉄鎧'],
      arrow: ['火花裂きの鉄炎矢', '火花裂きの鉄氷矢'],
      catalyst: ['熔核粉の触媒'],
      grimoire: ['鍛炉秘伝の呪典'],
      robe: ['炉祈司の法衣'],
      shield: ['熔鉄守護の大盾'],
      sword: ['鍛冶師の鉄剣', '火入れの鉄刃'],
      wand: ['霊炉導きの鉄杖'],
    },
    rare: {
      archery: ['火山連射の戦弓'],
      armor: ['火山守護の鉄甲'],
      arrow: ['溶鉄穿ちの矢'],
      catalyst: ['火成核の触媒'],
      grimoire: ['霊峰鍛呪大全'],
      robe: ['炉霊司祭の法衣'],
      shield: ['霊峰の溶鉄大盾'],
      sword: ['霊峰鍛えの鉄剣'],
      wand: ['霊炉核の鉄霊杖'],
    },
    mythic: {
      armor: ['鉄王の霊峰鎧'],
      katana: ['霊峰秘伝・溶鉄ノ太刀'],
      shield: ['溶岩心臓の王盾'],
    },
  },
  5: {
    common: {
      archery: ['月鋼留めの戦弓'],
      armor: ['月鋼縫いの鎧', '古遺跡鋼の鎧'],
      arrow: ['月鋼鏃の矢', '燐鋼の矢'],
      catalyst: ['燐核結晶の触媒'],
      grimoire: ['聖域遺文の呪頁'],
      robe: ['燐布の法衣', '月苔織りの法衣'],
      shield: ['月鋼縁の円盾', '遺跡鋼の盾'],
      sword: ['月鋼の短剣', '燐鋼の片刃剣', '遺跡鋼の直剣'],
      wand: ['燐晶核の杖', '月輝鋼の魔杖'],
    },
    uncommon: {
      archery: ['聖茂狩人の戦弓'],
      armor: ['聖域守護の月鋼鎧'],
      arrow: ['閃撃の月鋼炎矢', '閃撃の月鋼氷矢'],
      catalyst: ['燐精核の触媒'],
      grimoire: ['月影秘儀書'],
      robe: ['燐光司祭の法衣'],
      shield: ['月輝守護の大盾'],
      sword: ['月鋼細工の剣', '聖域鍛えの剣'],
      wand: ['月導の霊杖'],
    },
    rare: {
      archery: ['光苔嵐の戦弓'],
      armor: ['月庭守護の霊鎧'],
      arrow: ['瞬撃の月鋼矢'],
      catalyst: ['燐界核の触媒'],
      grimoire: ['聖茂幻術大全'],
      robe: ['燐界司祭の聖衣'],
      shield: ['月影の聖域大盾'],
      sword: ['聖月王の光剣'],
      wand: ['月輝霊核の魔杖'],
    },
    mythic: {
      archery: ['聖域王の光速弓'],
      bolt: ['月光閃雷の神速弩矢'],
      robe: ['月界支配の聖衣'],
    },
  },
  6: {
    common: {
      archery: ['滑車式の連射弓'],
      armor: ['銅板リベット鎧', '配管補強の軽鎧'],
      arrow: ['鋼芯の銅矢', '貫通加工の銅矢'],
      catalyst: ['中和触媒の核'],
      grimoire: ['配線式呪頁'],
      robe: ['耐毒繊維の法衣', '蒸気防護の法衣'],
      shield: ['銅枠の機械盾', '歯車縁の小盾'],
      sword: ['銅合金の短剣', '蒸気焼入れの短剣', '歯車刃の小剣'],
      wand: ['触媒導管の魔杖', '蒸気核の導魔杖'],
    },
    uncommon: {
      archery: ['歯車補助の戦弓'],
      armor: ['耐圧配管の機甲'],
      arrow: ['貫孔加工の精密炎矢', '貫孔加工の精密氷矢'],
      catalyst: ['中和強化触媒'],
      grimoire: ['迷宮制御の秘呪書'],
      robe: ['毒気遮断の法衣'],
      shield: ['蒸気遮断の機械盾'],
      sword: ['合金鍛えの小剣', '歯車刻みの短剣'],
      wand: ['触媒増幅の魔杖'],
    },
    rare: {
      archery: ['自動滑車の連射弓'],
      armor: ['耐毒圧の迷宮機甲'],
      arrow: ['貫壁の精密合金矢'],
      catalyst: ['完全中和の触媒核'],
      grimoire: ['迷宮制御中枢書'],
      robe: ['深層制御の法衣'],
      shield: ['迷宮中枢の機械大盾'],
      sword: ['銅迷宮王の合金剣'],
      wand: ['主機核導きの霊杖'],
    },
    mythic: {
      armor: ['主機核装甲・アルケミトロン'],
      catalyst: ['深層反応炉の原初触媒'],
      grimoire: ['銅迷宮の設計原典'],
    },
  },
  7: {
    common: {
      archery: ['風輪式の戦弓'],
      armor: ['雲鋼縫いの鎧', '風紋刻みの軽鎧'],
      arrow: ['風切りの鋼矢', '雲鋼鏃の矢'],
      catalyst: ['風核結晶の触媒'],
      grimoire: ['天庭律書の呪頁'],
      robe: ['天布の法衣', '雲糸織りの法衣'],
      shield: ['風鋼縁の円盾', '雲鋼の小盾'],
      sword: ['天鋼の短剣', '風鍛えの片刃剣', '雲鋼の直剣'],
      wand: ['天晶核の魔杖', '風導の霊杖'],
    },
    uncommon: {
      archery: ['高天狩人の戦弓'],
      armor: ['浮島守護の天鋼鎧'],
      arrow: ['旋風穿ちの鋼炎矢', '旋風穿ちの鋼氷矢'],
      catalyst: ['高天触媒核'],
      grimoire: ['風律の秘呪書'],
      robe: ['天輝司祭の法衣'],
      shield: ['風護りの大盾'],
      sword: ['天鋼精鍛の剣', '風紋刻みの剣'],
      wand: ['天導の霊杖'],
    },
    rare: {
      archery: ['風輪嵐の戦弓'],
      armor: ['天空守護の天鋼鎧'],
      arrow: ['天裂きの鋼矢'],
      catalyst: ['天空安定の触媒核'],
      grimoire: ['高天律法大全'],
      robe: ['天庭司祭の聖衣'],
      shield: ['雲界守護の王盾'],
      sword: ['高天王の霊剣'],
      wand: ['天輝霊核の魔杖'],
    },
    mythic: {
      armor: ['浮島王の天鋼鎧'],
      grimoire: ['高天統治の禁呪書'],
      sword: ['天界王剣アストレア'],
    },
  },
  8: {
    common: {
      archery: ['層界制御の戦弓'],
      armor: ['玻璃鋼縫いの鎧', '結晶層の軽鎧'],
      arrow: ['時断の結晶矢', '次元鋼鏃の矢'],
      catalyst: ['時層結晶の触媒'],
      grimoire: ['玻璃律書の呪頁'],
      robe: ['無音織りの法衣', '時層布の法衣'],
      shield: ['次元縁の玻璃盾', '結晶層の小盾'],
      sword: ['玻璃鋼の短剣', '時晶鍛えの片刃剣', '次元鋼の直剣'],
      wand: ['時晶核の魔杖', '無音導きの霊杖'],
    },
    uncommon: {
      archery: ['次元狩人の戦弓'],
      armor: ['玻璃界守護の結晶鎧'],
      arrow: ['層界穿ちの結晶炎矢', '層界穿ちの結晶氷矢'],
      catalyst: ['次元安定の触媒核'],
      grimoire: ['終焉律法の秘呪書'],
      robe: ['無音司祭の法衣'],
      shield: ['時壁守護の大盾'],
      sword: ['時玻璃精鍛の剣', '次元紋刻みの剣'],
      wand: ['時導の霊杖'],
    },
    rare: {
      archery: ['層界嵐の戦弓'],
      armor: ['玻璃守護の王鎧'],
      arrow: ['終焉穿ちの結晶矢'],
      catalyst: ['完全安定の触媒核'],
      grimoire: ['時玻璃終章大全'],
      robe: ['無限層司祭の聖衣'],
      shield: ['次元守護の王盾'],
      sword: ['時界王の霊剣'],
      wand: ['時晶霊核の魔杖'],
    },
    mythic: {
      catalyst: ['次元律動の原初触媒'],
      grimoire: ['不死超越の最終魔導書'],
      katana: ['終焉ノ太刀・時玻璃'],
    },
  },
};

function getMasterItemName(tier: number, rarity: Rarity, category: ItemCategory, variantIndex?: number): string | undefined {
  const names = MASTER_ITEM_NAMES[tier]?.[rarity]?.[category];
  if (!names || names.length === 0) return undefined;
  if (rarity === 'uncommon') {
    const index = variantIndex ?? 0;
    return names[index] ?? names[0];
  }
  return names[0];
}
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
    variant3Mod: { magicalDefense: 2 },
    mythicBonusMod: { vitalityBonus: 1 },
  },
  // Index 1: robe (法衣) - +magicalDefense
  {
    category: 'robe', baseName: 'ローブ',
    variants: ['守護のローブ', '聖者のローブ'],
    rareName: '大魔導のローブ', mythicName: '天衣',
    variant1Mod: { magicalDefense: 2 },
    variant2Mod: { partyHP: 3 },
    variant3Mod: { evasionBonus: 0.01 },
    mythicBonusMod: { mindBonus: 1 },
  },
  // Index 2: shield (盾) - +HP, +physicalDefense
  {
    category: 'shield', baseName: '盾',
    variants: ['守りの盾', '闘士の盾'],
    rareName: '守護盾', mythicName: '聖盾',
    variant1Mod: { physicalDefense: 2 },
    variant2Mod: { meleeAttack: 1 },
    variant3Mod: { partyHP: 2 },
    mythicBonusMod: { vitalityBonus: 1 },
  },
  // Index 3: sword (剣) - +meleeAttack
  {
    category: 'sword', baseName: '剣',
    variants: ['鋭利な剣', '堅固な剣'],
    rareName: '騎士剣', mythicName: '聖剣',
    variant1Mod: { meleeAttack: 1 },
    variant2Mod: { physicalDefense: 1 },
    variant3Mod: { partyHP: 2 },
    mythicBonusMod: { strengthBonus: 1 },
  },
  // Index 4: katana (刀) - +meleeAttack, -meleeNoA
  {
    category: 'katana', baseName: '刀',
    variants: ['業物の刀', '名匠の刀'],
    rareName: '銘刀', mythicName: '妖刀',
    variant1Mod: { meleeAttack: 2 },
    variant2Mod: { penetBonus: 0.01 },
    variant3Mod: { penetBonus: 0.02 },
    mythicBonusMod: { mindBonus: 1 },
  },
  // Index 5: gauntlet (籠手) - +meleeNoA
  {
    category: 'gauntlet', baseName: '籠手',
    variants: ['戦士の籠手', '闘士の籠手'],
    rareName: '英雄の籠手', mythicName: '覇王の籠手',
    variant1Mod: { meleeNoA: 0.1 },
    variant2Mod: { physicalDefense: 1 },
    variant3Mod: { meleeAttack: 1 },
    mythicBonusMod: { strengthBonus: 1 },
  },
  // Index 6: arrow (矢) - +rangedAttack
  {
    category: 'arrow', baseName: '矢',
    variants: ['炎の矢', '氷の矢'],
    rareName: '雷の矢', mythicName: '神矢',
    variant1Mod: { elementalOffense: 'fire' },
    variant2Mod: { elementalOffense: 'ice' },
    variant3Mod: { rangedAttack: 1 },
  },
  // Index 7: bolt (ボルト) - +rangedAttack, -rangedNoA
  {
    category: 'bolt', baseName: 'ボルト',
    variants: ['強化ボルト', '雷のボルト'],
    rareName: '炎のボルト', mythicName: '神雷ボルト',
    variant1Mod: { rangedAttack: 1 },
    variant2Mod: { elementalOffense: 'thunder' },
    variant3Mod: { rangedAttack: 1 },
    mythicBonusMod: { strengthBonus: 1 },
  },
  // Index 8: archery (弓) - +rangedNoA
  {
    category: 'archery', baseName: '弓',
    variants: ['狩人の弓', '精密な弓'],
    rareName: '精霊弓', mythicName: '天弓',
    variant1Mod: { accuracyBonus: 0.01 },
    variant2Mod: { partyHP: 2 },
    variant3Mod: { accuracyBonus: 0.02 },
    mythicBonusMod: { strengthBonus: 1 },
  },
  // Index 9: wand (ワンド) - +magicalAttack
  {
    category: 'wand', baseName: 'ワンド',
    variants: ['賢者のワンド', '闇のワンド'],
    rareName: '大魔導の杖', mythicName: '神杖',
    variant1Mod: { magicalAttack: 1 },
    variant2Mod: { magicalDefense: 1 },
    variant3Mod: { magicalAttack: 1 },
    mythicBonusMod: { intelligenceBonus: 1 },
  },
  // Index 10: grimoire (魔導書) - +magicalAttack, -magicalNoA
  {
    category: 'grimoire', baseName: '魔導書',
    variants: ['古の魔導書', '禁断の書'],
    rareName: '神代の書', mythicName: '真理の書',
    variant1Mod: { magicalAttack: 1 },
    variant2Mod: { magicalDefense: 1 },
    variant3Mod: { magicalAttack: 1 },
    mythicBonusMod: { mindBonus: 1 },
  },
  // Index 11: catalyst (触媒) - +magicalNoA
  {
    category: 'catalyst', baseName: '触媒',
    variants: ['精霊の触媒', '炎の触媒'],
    rareName: '賢者の石', mythicName: '神核',
    variant1Mod: { magicalNoA: 0.1 },
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

function getRareSubtleMods(template: ItemTemplate, tier: number): ItemVariantMod[] {
  const subtlePool = [template.variant1Mod, template.variant2Mod, template.variant3Mod].filter(
    (mod): mod is ItemVariantMod => mod !== undefined
  );

  if (subtlePool.length <= 2) {
    return subtlePool;
  }

  // Rare requires two subtle bonuses; rotate the omitted one by tier for deterministic diversity.
  const omitIndex = (tier - 1) % subtlePool.length;
  return subtlePool.filter((_, index) => index !== omitIndex).slice(0, 2);
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

  const masterName = getMasterItemName(tier, rarity, template.category, variantIndex);
  if (masterName) {
    name = masterName;
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
      if (multiplierTier) item.baseMultiplier = targetMultiplier;
      break;
    case 'robe':
      item.magicalDefense = calculateStat(basePower, amplifier);
      if (multiplierTier) item.baseMultiplier = targetMultiplier;
      break;
    case 'shield':
      item.partyHP = SHIELD_HP_MULTIPLIERS[tier - 1];
      item.physicalDefense = calculateStat(basePower, amplifier);
      if (shieldEvasionBonus) item.evasionBonus = shieldEvasionBonus;
      break;
    case 'sword':
      item.meleeAttack = calculateStat(basePower, amplifier);
      if (multiplierTier) item.baseMultiplier = targetMultiplier;
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
      if (multiplierTier) item.baseMultiplier = targetMultiplier;
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
      if (multiplierTier) item.baseMultiplier = targetMultiplier;
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

  const applyVariantMod = (mod?: ItemVariantMod) => {
    if (!mod) return;
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
    if (mod.meleeNoABonus) item.meleeNoABonus = (item.meleeNoABonus || 0) + mod.meleeNoABonus;
    if (mod.rangedNoABonus) item.rangedNoABonus = (item.rangedNoABonus || 0) + mod.rangedNoABonus;
    if (mod.magicalNoABonus) item.magicalNoABonus = (item.magicalNoABonus || 0) + mod.magicalNoABonus;
    if (mod.accuracyBonus) item.accuracyBonus = (item.accuracyBonus || 0) + mod.accuracyBonus;
    if (mod.evasionBonus) item.evasionBonus = (item.evasionBonus || 0) + mod.evasionBonus;
    if (mod.vitalityBonus) item.vitalityBonus = (item.vitalityBonus || 0) + mod.vitalityBonus;
    if (mod.strengthBonus) item.strengthBonus = (item.strengthBonus || 0) + mod.strengthBonus;
    if (mod.intelligenceBonus) item.intelligenceBonus = (item.intelligenceBonus || 0) + mod.intelligenceBonus;
    if (mod.mindBonus) item.mindBonus = (item.mindBonus || 0) + mod.mindBonus;
    if (mod.penetBonus) item.penetBonus = (item.penetBonus || 0) + mod.penetBonus;
  };

  // Apply rarity subtle modifiers
  if (rarity === 'uncommon' && variantIndex !== undefined) {
    applyVariantMod(variantIndex === 0 ? template.variant1Mod : template.variant2Mod);
  }

  if (rarity === 'rare') {
    const rareSubtleMods = getRareSubtleMods(template, tier);
    rareSubtleMods.forEach(applyVariantMod);
  }

  if (rarity === 'mythic') {
    applyVariantMod(template.variant1Mod);
    applyVariantMod(template.variant2Mod);
    applyVariantMod(template.variant3Mod || template.variant1Mod);
    applyVariantMod(template.mythicBonusMod);
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
