import { EnemyDef, EnemyType, EnemyClassId, ElementalOffense, ElementalResistance, ItemDef, AbilityId, ItemCategory } from '../types';
import { MYTHIC_DROP_POOLS } from './dropTables';
import { getItemsByTierAndRarity } from './items';

// ============================================================
// EnemyTemplate type - compact format for defining enemies
// ============================================================
type EnemyTemplate = {
  name: string;
  hpMod: number;
  attackType: 'melee' | 'ranged' | 'magical' | 'mixed';
  attackMod: number;
  defenseMod: number;
  element?: ElementalOffense;
  resistances?: Partial<Record<ElementalResistance, number>>;
};

function getBossMythicDropId(tier: number, seed: number): number {
  const categories = MYTHIC_DROP_POOLS[tier] ?? [];
  const mythicItems = getItemsByTierAndRarity(tier, 'mythic');
  const options = categories.flatMap(category => mythicItems.filter(item => item.category === category));

  if (options.length === 0) {
    return mythicItems[seed % mythicItems.length]?.id ?? tier * 1000 + 300 + 1;
  }

  return options[seed % options.length].id;
}

// ============================================================
// Tier scaling constants
// ============================================================

// Stat multiplier per tier (applied to base stats)
const TIER_STAT_MULTIPLIERS = [1.0, 2.0, 3.0, 4.5, 6.5, 9.0, 12.0, 16.0];

// ============================================================
// Expedition 1: 草原の遺跡 (Grassland Ruins) - Beasts/Goblins
// ============================================================
const EXPEDITION_1_NORMALS: EnemyTemplate[] = [
  { name: 'ゴブリン', hpMod: 1.0, attackType: 'melee', attackMod: 0.8, defenseMod: 0.5 },
  { name: 'スライム', hpMod: 0.7, attackType: 'magical', attackMod: 0.7, defenseMod: 0.8 },
  { name: '野犬', hpMod: 0.8, attackType: 'melee', attackMod: 1.0, defenseMod: 0.3 },
  { name: '大蛇', hpMod: 0.9, attackType: 'ranged', attackMod: 0.8, defenseMod: 0.5 },
  { name: 'コボルト', hpMod: 1.2, attackType: 'melee', attackMod: 1.1, defenseMod: 0.7 },
  { name: '草原ネズミ', hpMod: 0.6, attackType: 'melee', attackMod: 0.7, defenseMod: 0.3 },
  { name: 'ゴブリン弓兵', hpMod: 0.8, attackType: 'ranged', attackMod: 0.9, defenseMod: 0.4 },
  { name: '毒キノコ', hpMod: 0.5, attackType: 'magical', attackMod: 0.9, defenseMod: 0.6 },
  { name: '草原の狼', hpMod: 0.9, attackType: 'melee', attackMod: 1.0, defenseMod: 0.4 },
  { name: 'ゴブリン呪術師', hpMod: 0.7, attackType: 'magical', attackMod: 1.0, defenseMod: 0.3 },
  { name: '野生イノシシ', hpMod: 1.3, attackType: 'melee', attackMod: 0.9, defenseMod: 0.6 },
  { name: '遺跡コウモリ', hpMod: 0.5, attackType: 'ranged', attackMod: 0.8, defenseMod: 0.3 },
  { name: 'ゴブリン戦士', hpMod: 1.1, attackType: 'melee', attackMod: 1.0, defenseMod: 0.6 },
  { name: '草原スライム', hpMod: 0.6, attackType: 'magical', attackMod: 0.7, defenseMod: 0.7 },
  { name: '野良犬の群れ', hpMod: 1.0, attackType: 'melee', attackMod: 0.9, defenseMod: 0.3 },
  { name: '遺跡の蜥蜴', hpMod: 0.8, attackType: 'melee', attackMod: 0.8, defenseMod: 0.5 },
  { name: 'ゴブリン盗賊', hpMod: 0.9, attackType: 'mixed', attackMod: 0.9, defenseMod: 0.4 },
  { name: '草原の鷹', hpMod: 0.6, attackType: 'ranged', attackMod: 1.0, defenseMod: 0.3 },
  { name: '遺跡の亡霊', hpMod: 0.7, attackType: 'magical', attackMod: 1.0, defenseMod: 0.4 },
  { name: 'ゴブリン偵察兵', hpMod: 0.8, attackType: 'ranged', attackMod: 0.8, defenseMod: 0.4 },
  { name: '草原のサソリ', hpMod: 0.7, attackType: 'melee', attackMod: 0.9, defenseMod: 0.6 },
  { name: '遺跡の石像', hpMod: 1.4, attackType: 'melee', attackMod: 0.7, defenseMod: 1.0 },
  { name: 'コボルト弓兵', hpMod: 0.9, attackType: 'ranged', attackMod: 0.9, defenseMod: 0.5 },
  { name: '草原の蜂群', hpMod: 0.5, attackType: 'ranged', attackMod: 1.0, defenseMod: 0.2 },
  { name: '泥スライム', hpMod: 0.8, attackType: 'magical', attackMod: 0.6, defenseMod: 0.9 },
  { name: 'ゴブリン見張り', hpMod: 1.0, attackType: 'melee', attackMod: 0.8, defenseMod: 0.5 },
  { name: '遺跡の蛇', hpMod: 0.7, attackType: 'melee', attackMod: 0.9, defenseMod: 0.3 },
  { name: '草原ガエル', hpMod: 0.6, attackType: 'magical', attackMod: 0.7, defenseMod: 0.4 },
  { name: 'コボルト戦士', hpMod: 1.1, attackType: 'melee', attackMod: 1.0, defenseMod: 0.6 },
  { name: '遺跡のガーゴイル', hpMod: 1.3, attackType: 'mixed', attackMod: 0.9, defenseMod: 0.8 },
];

const EXPEDITION_1_ELITES: EnemyTemplate[] = [
  { name: 'ゴブリンリーダー', hpMod: 1.4, attackType: 'melee', attackMod: 1.2, defenseMod: 0.9 },
  { name: 'キングスライム', hpMod: 1.2, attackType: 'magical', attackMod: 1.1, defenseMod: 1.0 },
  { name: 'オオカミのボス', hpMod: 1.3, attackType: 'melee', attackMod: 1.3, defenseMod: 0.7 },
  { name: '遺跡の守護者', hpMod: 1.5, attackType: 'mixed', attackMod: 1.1, defenseMod: 1.1 },
  { name: 'コボルトの長', hpMod: 1.4, attackType: 'melee', attackMod: 1.2, defenseMod: 0.8 },
];

const EXPEDITION_1_BOSS: EnemyTemplate = {
  name: 'ゴブリンキング',
  hpMod: 1.0,
  attackType: 'melee',
  attackMod: 1.0,
  defenseMod: 1.0,
};

// ============================================================
// Expedition 2: 古代の洞窟 (Ancient Cave) - Cave creatures
// ============================================================
const EXPEDITION_2_NORMALS: EnemyTemplate[] = [
  { name: 'オーク', hpMod: 1.2, attackType: 'melee', attackMod: 1.2, defenseMod: 0.8 },
  { name: 'コウモリの群れ', hpMod: 0.7, attackType: 'ranged', attackMod: 1.0, defenseMod: 0.5 },
  { name: '洞窟トロール', hpMod: 1.5, attackType: 'melee', attackMod: 1.3, defenseMod: 1.0 },
  { name: '岩石魔人', hpMod: 1.4, attackType: 'magical', attackMod: 1.1, defenseMod: 0.9 },
  { name: 'ダークエルフ', hpMod: 0.8, attackType: 'mixed', attackMod: 1.2, defenseMod: 0.7 },
  { name: '洞窟蜘蛛', hpMod: 0.9, attackType: 'ranged', attackMod: 1.0, defenseMod: 0.5 },
  { name: 'オーク戦士', hpMod: 1.3, attackType: 'melee', attackMod: 1.2, defenseMod: 0.9 },
  { name: '鍾乳石の精霊', hpMod: 0.8, attackType: 'magical', attackMod: 1.2, defenseMod: 0.6 },
  { name: '洞窟ネズミ', hpMod: 0.6, attackType: 'melee', attackMod: 0.9, defenseMod: 0.3 },
  { name: '地底ワーム', hpMod: 1.1, attackType: 'melee', attackMod: 1.1, defenseMod: 0.7 },
  { name: 'ダークエルフ弓兵', hpMod: 0.8, attackType: 'ranged', attackMod: 1.2, defenseMod: 0.5 },
  { name: '洞窟の亡者', hpMod: 0.9, attackType: 'magical', attackMod: 1.1, defenseMod: 0.6 },
  { name: 'オーク呪術師', hpMod: 0.9, attackType: 'magical', attackMod: 1.3, defenseMod: 0.5 },
  { name: '岩石蟹', hpMod: 1.3, attackType: 'melee', attackMod: 0.9, defenseMod: 1.2 },
  { name: '洞窟の蝙蝠王', hpMod: 0.8, attackType: 'ranged', attackMod: 1.1, defenseMod: 0.4 },
  { name: '地底のサソリ', hpMod: 1.0, attackType: 'melee', attackMod: 1.1, defenseMod: 0.6 },
  { name: 'オーク狂戦士', hpMod: 1.2, attackType: 'melee', attackMod: 1.4, defenseMod: 0.5 },
  { name: '洞窟の精霊', hpMod: 0.7, attackType: 'magical', attackMod: 1.2, defenseMod: 0.4 },
  { name: '石のゴーレム', hpMod: 1.6, attackType: 'melee', attackMod: 1.0, defenseMod: 1.3 },
  { name: 'ダークエルフ魔術師', hpMod: 0.7, attackType: 'magical', attackMod: 1.3, defenseMod: 0.4 },
  { name: '地底蛇', hpMod: 0.9, attackType: 'melee', attackMod: 1.0, defenseMod: 0.5 },
  { name: '洞窟のキノコ怪', hpMod: 0.8, attackType: 'magical', attackMod: 1.0, defenseMod: 0.7 },
  { name: 'オーク弓兵', hpMod: 1.0, attackType: 'ranged', attackMod: 1.1, defenseMod: 0.6 },
  { name: '暗闇の蜥蜴', hpMod: 0.9, attackType: 'melee', attackMod: 1.0, defenseMod: 0.6 },
  { name: '洞窟の骸骨', hpMod: 0.8, attackType: 'melee', attackMod: 1.0, defenseMod: 0.7 },
  { name: '地底ムカデ', hpMod: 1.1, attackType: 'melee', attackMod: 1.1, defenseMod: 0.6 },
  { name: 'オーク番兵', hpMod: 1.2, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '暗闇のスライム', hpMod: 0.7, attackType: 'magical', attackMod: 0.9, defenseMod: 0.8 },
  { name: '洞窟コウモリ大', hpMod: 0.9, attackType: 'ranged', attackMod: 1.1, defenseMod: 0.4 },
  { name: '地底の石像', hpMod: 1.5, attackType: 'mixed', attackMod: 0.9, defenseMod: 1.1 },
];

const EXPEDITION_2_ELITES: EnemyTemplate[] = [
  { name: 'オークの首領', hpMod: 1.5, attackType: 'melee', attackMod: 1.4, defenseMod: 1.0 },
  { name: 'ダークエルフの長', hpMod: 1.2, attackType: 'mixed', attackMod: 1.5, defenseMod: 0.9 },
  { name: '洞窟の大蜘蛛', hpMod: 1.4, attackType: 'ranged', attackMod: 1.3, defenseMod: 0.8 },
  { name: '岩石の巨人', hpMod: 1.7, attackType: 'melee', attackMod: 1.2, defenseMod: 1.3 },
  { name: '古代の番人', hpMod: 1.5, attackType: 'mixed', attackMod: 1.3, defenseMod: 1.1 },
];

const EXPEDITION_2_BOSS: EnemyTemplate = {
  name: '洞窟の主ドラゴン',
  hpMod: 1.2,
  attackType: 'mixed',
  attackMod: 1.3,
  defenseMod: 1.0,
  element: 'fire',
  resistances: { fire: 0.3, ice: 1.5 },
};

// ============================================================
// Expedition 3: 呪われた森 (Cursed Forest) - Forest creatures
// ============================================================
const EXPEDITION_3_NORMALS: EnemyTemplate[] = [
  { name: 'トレント', hpMod: 1.4, attackType: 'melee', attackMod: 1.1, defenseMod: 1.0 },
  { name: '森の精霊', hpMod: 0.7, attackType: 'magical', attackMod: 1.4, defenseMod: 0.5 },
  { name: 'ワーウルフ', hpMod: 1.1, attackType: 'melee', attackMod: 1.3, defenseMod: 0.7 },
  { name: '毒蜘蛛', hpMod: 0.8, attackType: 'ranged', attackMod: 1.2, defenseMod: 0.5 },
  { name: '呪われた騎士', hpMod: 1.3, attackType: 'melee', attackMod: 1.3, defenseMod: 1.0 },
  { name: '森のゴブリン', hpMod: 0.9, attackType: 'melee', attackMod: 1.0, defenseMod: 0.6 },
  { name: '毒キノコの群れ', hpMod: 0.6, attackType: 'magical', attackMod: 1.2, defenseMod: 0.4 },
  { name: '森の狼', hpMod: 1.0, attackType: 'melee', attackMod: 1.2, defenseMod: 0.5 },
  { name: '呪われた木人', hpMod: 1.5, attackType: 'melee', attackMod: 0.9, defenseMod: 1.2 },
  { name: '闇の射手', hpMod: 0.8, attackType: 'ranged', attackMod: 1.3, defenseMod: 0.4 },
  { name: '森のオーガ', hpMod: 1.4, attackType: 'melee', attackMod: 1.2, defenseMod: 0.8 },
  { name: '呪いの蛇', hpMod: 0.9, attackType: 'magical', attackMod: 1.1, defenseMod: 0.5 },
  { name: 'ダークフェアリー', hpMod: 0.5, attackType: 'magical', attackMod: 1.4, defenseMod: 0.3 },
  { name: '森のトロール', hpMod: 1.4, attackType: 'melee', attackMod: 1.1, defenseMod: 0.9 },
  { name: '呪われた鹿', hpMod: 1.0, attackType: 'melee', attackMod: 1.1, defenseMod: 0.7 },
  { name: '毒蔦の怪物', hpMod: 1.2, attackType: 'ranged', attackMod: 1.0, defenseMod: 0.8 },
  { name: '森の亡霊', hpMod: 0.7, attackType: 'magical', attackMod: 1.3, defenseMod: 0.4 },
  { name: 'ワーベア', hpMod: 1.5, attackType: 'melee', attackMod: 1.2, defenseMod: 0.9 },
  { name: '呪われた蜘蛛', hpMod: 0.9, attackType: 'ranged', attackMod: 1.1, defenseMod: 0.6 },
  { name: '森の魔術師', hpMod: 0.7, attackType: 'magical', attackMod: 1.4, defenseMod: 0.4 },
  { name: '闇のワーム', hpMod: 1.1, attackType: 'melee', attackMod: 1.0, defenseMod: 0.7 },
  { name: '呪われた猿', hpMod: 0.9, attackType: 'melee', attackMod: 1.2, defenseMod: 0.5 },
  { name: '森の巨大蟻', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 0.8 },
  { name: '闇の精霊', hpMod: 0.6, attackType: 'magical', attackMod: 1.5, defenseMod: 0.3 },
  { name: '呪われた騎馬兵', hpMod: 1.3, attackType: 'mixed', attackMod: 1.2, defenseMod: 0.9 },
  { name: '森の大蜘蛛', hpMod: 1.1, attackType: 'ranged', attackMod: 1.1, defenseMod: 0.7 },
  { name: '毒沼の怪物', hpMod: 1.2, attackType: 'magical', attackMod: 1.1, defenseMod: 0.8 },
  { name: '闇のケンタウロス', hpMod: 1.3, attackType: 'mixed', attackMod: 1.2, defenseMod: 0.8 },
  { name: '呪われた兵士', hpMod: 1.1, attackType: 'melee', attackMod: 1.1, defenseMod: 0.8 },
  { name: '森の番人', hpMod: 1.4, attackType: 'mixed', attackMod: 1.1, defenseMod: 1.0 },
];

const EXPEDITION_3_ELITES: EnemyTemplate[] = [
  { name: 'エルダートレント', hpMod: 1.6, attackType: 'melee', attackMod: 1.3, defenseMod: 1.2 },
  { name: '森の大精霊', hpMod: 1.1, attackType: 'magical', attackMod: 1.6, defenseMod: 0.8 },
  { name: 'ワーウルフの長', hpMod: 1.4, attackType: 'melee', attackMod: 1.5, defenseMod: 0.9 },
  { name: '呪われた将軍', hpMod: 1.5, attackType: 'mixed', attackMod: 1.4, defenseMod: 1.1 },
  { name: '闇の大魔術師', hpMod: 1.1, attackType: 'magical', attackMod: 1.6, defenseMod: 0.7 },
];

const EXPEDITION_3_BOSS: EnemyTemplate = {
  name: '森の女王',
  hpMod: 1.3,
  attackType: 'magical',
  attackMod: 1.4,
  defenseMod: 1.1,
  element: 'ice',
  resistances: { ice: 0.3, fire: 1.5 },
};

// ============================================================
// Expedition 4: 炎の火山 (Flame Volcano) - Fire creatures
// ============================================================
const EXPEDITION_4_NORMALS: EnemyTemplate[] = [
  { name: 'ファイアサラマンダー', hpMod: 1.0, attackType: 'mixed', attackMod: 1.2, defenseMod: 0.8, element: 'fire', resistances: { fire: 0.2, ice: 2.0 } },
  { name: '溶岩ゴーレム', hpMod: 1.6, attackType: 'melee', attackMod: 1.3, defenseMod: 1.2, element: 'fire', resistances: { fire: 0.1, ice: 2.0 } },
  { name: '炎の精霊', hpMod: 0.7, attackType: 'magical', attackMod: 1.5, defenseMod: 0.5, element: 'fire', resistances: { fire: 0.0, ice: 2.0 } },
  { name: '火山蟻', hpMod: 0.9, attackType: 'melee', attackMod: 1.1, defenseMod: 0.6, element: 'fire', resistances: { fire: 0.3, ice: 1.5 } },
  { name: '炎の騎士', hpMod: 1.3, attackType: 'melee', attackMod: 1.3, defenseMod: 1.0, element: 'fire', resistances: { fire: 0.2, ice: 1.8 } },
  { name: '溶岩蛇', hpMod: 0.9, attackType: 'melee', attackMod: 1.2, defenseMod: 0.5, element: 'fire', resistances: { fire: 0.2, ice: 1.8 } },
  { name: '火山コウモリ', hpMod: 0.6, attackType: 'ranged', attackMod: 1.1, defenseMod: 0.3, element: 'fire', resistances: { fire: 0.3 } },
  { name: '炎の魔術師', hpMod: 0.8, attackType: 'magical', attackMod: 1.4, defenseMod: 0.4, element: 'fire', resistances: { fire: 0.1, ice: 1.8 } },
  { name: '溶岩の巨人', hpMod: 1.7, attackType: 'melee', attackMod: 1.1, defenseMod: 1.3, element: 'fire', resistances: { fire: 0.0, ice: 2.0 } },
  { name: '火山蜥蜴', hpMod: 0.8, attackType: 'melee', attackMod: 1.0, defenseMod: 0.6, element: 'fire', resistances: { fire: 0.3 } },
  { name: '炎のオーガ', hpMod: 1.4, attackType: 'melee', attackMod: 1.2, defenseMod: 0.9, element: 'fire', resistances: { fire: 0.2 } },
  { name: '火炎スライム', hpMod: 0.6, attackType: 'magical', attackMod: 1.1, defenseMod: 0.7, element: 'fire', resistances: { fire: 0.0, ice: 2.0 } },
  { name: '溶岩の番人', hpMod: 1.4, attackType: 'mixed', attackMod: 1.1, defenseMod: 1.1, element: 'fire', resistances: { fire: 0.1 } },
  { name: '火山の鬼', hpMod: 1.3, attackType: 'melee', attackMod: 1.3, defenseMod: 0.8, element: 'fire', resistances: { fire: 0.2 } },
  { name: '炎の射手', hpMod: 0.8, attackType: 'ranged', attackMod: 1.3, defenseMod: 0.4, element: 'fire', resistances: { fire: 0.2 } },
  { name: '溶岩ワーム', hpMod: 1.2, attackType: 'melee', attackMod: 1.1, defenseMod: 0.8, element: 'fire', resistances: { fire: 0.1, ice: 1.8 } },
  { name: '火の鳥', hpMod: 0.7, attackType: 'ranged', attackMod: 1.3, defenseMod: 0.3, element: 'fire', resistances: { fire: 0.0 } },
  { name: '炎の狼', hpMod: 1.0, attackType: 'melee', attackMod: 1.3, defenseMod: 0.5, element: 'fire', resistances: { fire: 0.2 } },
  { name: '火山の骸骨', hpMod: 0.9, attackType: 'melee', attackMod: 1.0, defenseMod: 0.7, element: 'fire', resistances: { fire: 0.3 } },
  { name: '溶岩の魔人', hpMod: 1.1, attackType: 'magical', attackMod: 1.3, defenseMod: 0.7, element: 'fire', resistances: { fire: 0.1, ice: 1.8 } },
  { name: '炎の蛇', hpMod: 0.8, attackType: 'mixed', attackMod: 1.1, defenseMod: 0.5, element: 'fire', resistances: { fire: 0.2 } },
  { name: '火山の戦士', hpMod: 1.2, attackType: 'melee', attackMod: 1.2, defenseMod: 0.9, element: 'fire', resistances: { fire: 0.2 } },
  { name: '溶岩のトカゲ', hpMod: 0.9, attackType: 'melee', attackMod: 1.0, defenseMod: 0.7, element: 'fire', resistances: { fire: 0.2 } },
  { name: '炎の使い魔', hpMod: 0.6, attackType: 'magical', attackMod: 1.3, defenseMod: 0.3, element: 'fire', resistances: { fire: 0.0 } },
  { name: '火山ガニ', hpMod: 1.3, attackType: 'melee', attackMod: 0.9, defenseMod: 1.2, element: 'fire', resistances: { fire: 0.3 } },
  { name: '炎の亡霊', hpMod: 0.7, attackType: 'magical', attackMod: 1.4, defenseMod: 0.3, element: 'fire', resistances: { fire: 0.0 } },
  { name: '溶岩の守護者', hpMod: 1.5, attackType: 'mixed', attackMod: 1.1, defenseMod: 1.2, element: 'fire', resistances: { fire: 0.1 } },
  { name: '火山の魔導師', hpMod: 0.8, attackType: 'magical', attackMod: 1.4, defenseMod: 0.4, element: 'fire', resistances: { fire: 0.1 } },
  { name: '炎の巨蟲', hpMod: 1.1, attackType: 'melee', attackMod: 1.1, defenseMod: 0.7, element: 'fire', resistances: { fire: 0.2 } },
  { name: '溶岩のガーゴイル', hpMod: 1.3, attackType: 'mixed', attackMod: 1.2, defenseMod: 1.0, element: 'fire', resistances: { fire: 0.1, ice: 1.8 } },
];

const EXPEDITION_4_ELITES: EnemyTemplate[] = [
  { name: '炎帝の親衛隊', hpMod: 1.5, attackType: 'melee', attackMod: 1.4, defenseMod: 1.2, element: 'fire', resistances: { fire: 0.1, ice: 2.0 } },
  { name: '溶岩の大巨人', hpMod: 1.7, attackType: 'melee', attackMod: 1.3, defenseMod: 1.4, element: 'fire', resistances: { fire: 0.0, ice: 2.0 } },
  { name: '炎の大精霊', hpMod: 1.1, attackType: 'magical', attackMod: 1.7, defenseMod: 0.8, element: 'fire', resistances: { fire: 0.0, ice: 2.0 } },
  { name: '火山のドレイク', hpMod: 1.5, attackType: 'mixed', attackMod: 1.5, defenseMod: 1.1, element: 'fire', resistances: { fire: 0.1, ice: 1.8 } },
  { name: '炎の将軍', hpMod: 1.4, attackType: 'mixed', attackMod: 1.5, defenseMod: 1.0, element: 'fire', resistances: { fire: 0.1, ice: 1.8 } },
];

const EXPEDITION_4_BOSS: EnemyTemplate = {
  name: '炎帝イフリート',
  hpMod: 1.3,
  attackType: 'magical',
  attackMod: 1.5,
  defenseMod: 1.2,
  element: 'fire',
  resistances: { fire: 0.0, ice: 2.0 },
};

// ============================================================
// Expedition 5: 氷結の峡谷 (Frozen Canyon) - Ice creatures
// ============================================================
const EXPEDITION_5_NORMALS: EnemyTemplate[] = [
  { name: '氷の精霊', hpMod: 0.7, attackType: 'magical', attackMod: 1.4, defenseMod: 0.5, element: 'ice', resistances: { ice: 0.0, fire: 2.0 } },
  { name: 'フロストゴーレム', hpMod: 1.6, attackType: 'melee', attackMod: 1.2, defenseMod: 1.3, element: 'ice', resistances: { ice: 0.1, fire: 2.0 } },
  { name: '氷結の騎士', hpMod: 1.3, attackType: 'melee', attackMod: 1.3, defenseMod: 1.0, element: 'ice', resistances: { ice: 0.2, fire: 1.8 } },
  { name: '雪狼', hpMod: 1.0, attackType: 'melee', attackMod: 1.3, defenseMod: 0.5, element: 'ice', resistances: { ice: 0.3 } },
  { name: '氷の魔術師', hpMod: 0.8, attackType: 'magical', attackMod: 1.5, defenseMod: 0.4, element: 'ice', resistances: { ice: 0.1, fire: 1.8 } },
  { name: 'フロストワーム', hpMod: 1.2, attackType: 'melee', attackMod: 1.1, defenseMod: 0.8, element: 'ice', resistances: { ice: 0.2 } },
  { name: '氷結の番人', hpMod: 1.4, attackType: 'melee', attackMod: 1.1, defenseMod: 1.1, element: 'ice', resistances: { ice: 0.2 } },
  { name: '雪の射手', hpMod: 0.8, attackType: 'ranged', attackMod: 1.3, defenseMod: 0.4, element: 'ice', resistances: { ice: 0.3 } },
  { name: '氷のトロール', hpMod: 1.5, attackType: 'melee', attackMod: 1.2, defenseMod: 1.0, element: 'ice', resistances: { ice: 0.2, fire: 1.8 } },
  { name: 'フロストバット', hpMod: 0.6, attackType: 'ranged', attackMod: 1.1, defenseMod: 0.3, element: 'ice', resistances: { ice: 0.2 } },
  { name: '氷の戦士', hpMod: 1.2, attackType: 'melee', attackMod: 1.2, defenseMod: 0.9, element: 'ice', resistances: { ice: 0.2 } },
  { name: '雪の亡霊', hpMod: 0.7, attackType: 'magical', attackMod: 1.3, defenseMod: 0.4, element: 'ice', resistances: { ice: 0.1 } },
  { name: 'フロストスパイダー', hpMod: 0.9, attackType: 'ranged', attackMod: 1.1, defenseMod: 0.6, element: 'ice', resistances: { ice: 0.3 } },
  { name: '氷結の巨人', hpMod: 1.7, attackType: 'melee', attackMod: 1.1, defenseMod: 1.3, element: 'ice', resistances: { ice: 0.1, fire: 2.0 } },
  { name: '雪の魔人', hpMod: 1.0, attackType: 'magical', attackMod: 1.3, defenseMod: 0.7, element: 'ice', resistances: { ice: 0.1 } },
  { name: '氷のサソリ', hpMod: 1.0, attackType: 'melee', attackMod: 1.1, defenseMod: 0.7, element: 'ice', resistances: { ice: 0.3 } },
  { name: 'フロストエルフ', hpMod: 0.8, attackType: 'mixed', attackMod: 1.2, defenseMod: 0.6, element: 'ice', resistances: { ice: 0.2 } },
  { name: '氷の蛇', hpMod: 0.9, attackType: 'melee', attackMod: 1.1, defenseMod: 0.5, element: 'ice', resistances: { ice: 0.2 } },
  { name: '雪のオーガ', hpMod: 1.4, attackType: 'melee', attackMod: 1.2, defenseMod: 0.9, element: 'ice', resistances: { ice: 0.2 } },
  { name: 'フロストウィッチ', hpMod: 0.7, attackType: 'magical', attackMod: 1.5, defenseMod: 0.3, element: 'ice', resistances: { ice: 0.0, fire: 1.8 } },
  { name: '氷結の狼', hpMod: 1.0, attackType: 'melee', attackMod: 1.3, defenseMod: 0.5, element: 'ice', resistances: { ice: 0.2 } },
  { name: '雪の守護者', hpMod: 1.4, attackType: 'mixed', attackMod: 1.1, defenseMod: 1.1, element: 'ice', resistances: { ice: 0.2 } },
  { name: 'フロストドレイク', hpMod: 1.3, attackType: 'mixed', attackMod: 1.3, defenseMod: 0.9, element: 'ice', resistances: { ice: 0.1, fire: 1.8 } },
  { name: '氷の使い魔', hpMod: 0.6, attackType: 'magical', attackMod: 1.3, defenseMod: 0.3, element: 'ice', resistances: { ice: 0.0 } },
  { name: '雪原の熊', hpMod: 1.5, attackType: 'melee', attackMod: 1.2, defenseMod: 0.9, element: 'ice', resistances: { ice: 0.3 } },
  { name: 'フロストリザード', hpMod: 0.9, attackType: 'melee', attackMod: 1.1, defenseMod: 0.7, element: 'ice', resistances: { ice: 0.2 } },
  { name: '氷の鬼', hpMod: 1.3, attackType: 'melee', attackMod: 1.3, defenseMod: 0.8, element: 'ice', resistances: { ice: 0.2 } },
  { name: '雪の魔導師', hpMod: 0.8, attackType: 'magical', attackMod: 1.4, defenseMod: 0.4, element: 'ice', resistances: { ice: 0.1 } },
  { name: 'フロストナイト', hpMod: 1.3, attackType: 'melee', attackMod: 1.2, defenseMod: 1.0, element: 'ice', resistances: { ice: 0.2 } },
  { name: '氷結のガーゴイル', hpMod: 1.3, attackType: 'mixed', attackMod: 1.2, defenseMod: 1.0, element: 'ice', resistances: { ice: 0.1, fire: 1.8 } },
];

const EXPEDITION_5_ELITES: EnemyTemplate[] = [
  { name: '氷結の将軍', hpMod: 1.5, attackType: 'melee', attackMod: 1.5, defenseMod: 1.2, element: 'ice', resistances: { ice: 0.1, fire: 2.0 } },
  { name: 'フロストドラゴン', hpMod: 1.6, attackType: 'mixed', attackMod: 1.5, defenseMod: 1.2, element: 'ice', resistances: { ice: 0.0, fire: 2.0 } },
  { name: '氷の大精霊', hpMod: 1.1, attackType: 'magical', attackMod: 1.7, defenseMod: 0.8, element: 'ice', resistances: { ice: 0.0, fire: 2.0 } },
  { name: '雪原の大巨人', hpMod: 1.7, attackType: 'melee', attackMod: 1.3, defenseMod: 1.4, element: 'ice', resistances: { ice: 0.1, fire: 2.0 } },
  { name: '氷結の守護竜', hpMod: 1.5, attackType: 'mixed', attackMod: 1.5, defenseMod: 1.3, element: 'ice', resistances: { ice: 0.0, fire: 2.0 } },
];

const EXPEDITION_5_BOSS: EnemyTemplate = {
  name: '氷帝フェンリル',
  hpMod: 1.4,
  attackType: 'mixed',
  attackMod: 1.5,
  defenseMod: 1.2,
  element: 'ice',
  resistances: { ice: 0.0, fire: 2.0 },
};

// ============================================================
// Expedition 6: 雷鳴の塔 (Tower of Thunder) - Thunder creatures
// ============================================================
const EXPEDITION_6_NORMALS: EnemyTemplate[] = [
  { name: 'サンダーバード', hpMod: 0.8, attackType: 'ranged', attackMod: 1.3, defenseMod: 0.5, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: '雷のゴーレム', hpMod: 1.6, attackType: 'melee', attackMod: 1.2, defenseMod: 1.2, element: 'thunder', resistances: { thunder: 0.0 } },
  { name: '嵐の精霊', hpMod: 0.7, attackType: 'magical', attackMod: 1.5, defenseMod: 0.4, element: 'thunder', resistances: { thunder: 0.0 } },
  { name: '電撃蛇', hpMod: 0.9, attackType: 'ranged', attackMod: 1.2, defenseMod: 0.5, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '雷鳴の騎士', hpMod: 1.3, attackType: 'melee', attackMod: 1.3, defenseMod: 1.0, element: 'thunder', resistances: { thunder: 0.3 } },
  { name: '雷のスライム', hpMod: 0.6, attackType: 'magical', attackMod: 1.1, defenseMod: 0.7, element: 'thunder', resistances: { thunder: 0.0 } },
  { name: '嵐の射手', hpMod: 0.8, attackType: 'ranged', attackMod: 1.3, defenseMod: 0.4, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '雷の魔術師', hpMod: 0.8, attackType: 'magical', attackMod: 1.5, defenseMod: 0.4, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: '電撃の巨人', hpMod: 1.7, attackType: 'melee', attackMod: 1.1, defenseMod: 1.3, element: 'thunder', resistances: { thunder: 0.0 } },
  { name: '嵐の狼', hpMod: 1.0, attackType: 'melee', attackMod: 1.3, defenseMod: 0.5, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '雷の戦士', hpMod: 1.2, attackType: 'melee', attackMod: 1.2, defenseMod: 0.9, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '電撃のコウモリ', hpMod: 0.6, attackType: 'ranged', attackMod: 1.1, defenseMod: 0.3, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: '嵐の鬼', hpMod: 1.3, attackType: 'melee', attackMod: 1.3, defenseMod: 0.8, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '雷鳴の番人', hpMod: 1.4, attackType: 'mixed', attackMod: 1.1, defenseMod: 1.1, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: '電撃の精霊', hpMod: 0.7, attackType: 'magical', attackMod: 1.4, defenseMod: 0.4, element: 'thunder', resistances: { thunder: 0.0 } },
  { name: '嵐のトロール', hpMod: 1.5, attackType: 'melee', attackMod: 1.2, defenseMod: 1.0, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '雷の亡霊', hpMod: 0.7, attackType: 'magical', attackMod: 1.3, defenseMod: 0.4, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: '電撃の騎馬兵', hpMod: 1.2, attackType: 'mixed', attackMod: 1.2, defenseMod: 0.8, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '嵐の魔人', hpMod: 1.1, attackType: 'magical', attackMod: 1.3, defenseMod: 0.7, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: '雷鳴のドレイク', hpMod: 1.3, attackType: 'mixed', attackMod: 1.3, defenseMod: 0.9, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: '電撃の使い魔', hpMod: 0.6, attackType: 'magical', attackMod: 1.3, defenseMod: 0.3, element: 'thunder', resistances: { thunder: 0.0 } },
  { name: '嵐の巨蟲', hpMod: 1.1, attackType: 'melee', attackMod: 1.1, defenseMod: 0.7, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '雷の守護者', hpMod: 1.4, attackType: 'mixed', attackMod: 1.1, defenseMod: 1.2, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: '電撃のオーガ', hpMod: 1.4, attackType: 'melee', attackMod: 1.2, defenseMod: 0.9, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '嵐のワーム', hpMod: 1.1, attackType: 'melee', attackMod: 1.0, defenseMod: 0.7, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '雷鳴の魔導師', hpMod: 0.8, attackType: 'magical', attackMod: 1.5, defenseMod: 0.4, element: 'thunder', resistances: { thunder: 0.0 } },
  { name: '電撃の番兵', hpMod: 1.2, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '嵐のサソリ', hpMod: 1.0, attackType: 'melee', attackMod: 1.1, defenseMod: 0.7, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '雷の鳥人', hpMod: 0.9, attackType: 'ranged', attackMod: 1.3, defenseMod: 0.5, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: '嵐のガーゴイル', hpMod: 1.3, attackType: 'mixed', attackMod: 1.2, defenseMod: 1.0, element: 'thunder', resistances: { thunder: 0.1 } },
];

const EXPEDITION_6_ELITES: EnemyTemplate[] = [
  { name: '雷鳴の将軍', hpMod: 1.5, attackType: 'melee', attackMod: 1.5, defenseMod: 1.2, element: 'thunder', resistances: { thunder: 0.0 } },
  { name: '嵐の大精霊', hpMod: 1.1, attackType: 'magical', attackMod: 1.7, defenseMod: 0.8, element: 'thunder', resistances: { thunder: 0.0 } },
  { name: '雷のドラゴン', hpMod: 1.6, attackType: 'mixed', attackMod: 1.5, defenseMod: 1.2, element: 'thunder', resistances: { thunder: 0.0 } },
  { name: '電撃の大巨人', hpMod: 1.7, attackType: 'melee', attackMod: 1.3, defenseMod: 1.4, element: 'thunder', resistances: { thunder: 0.0 } },
  { name: '雷神の親衛隊', hpMod: 1.5, attackType: 'mixed', attackMod: 1.5, defenseMod: 1.3, element: 'thunder', resistances: { thunder: 0.0 } },
];

const EXPEDITION_6_BOSS: EnemyTemplate = {
  name: '雷神ラミエル',
  hpMod: 1.4,
  attackType: 'magical',
  attackMod: 1.6,
  defenseMod: 1.2,
  element: 'thunder',
  resistances: { thunder: 0.0 },
};

// ============================================================
// Expedition 7: 冥界の門 (Gate of the Underworld) - Undead/Demonic
// ============================================================
const EXPEDITION_7_NORMALS: EnemyTemplate[] = [
  { name: '死霊', hpMod: 0.8, attackType: 'magical', attackMod: 1.4, defenseMod: 0.5 },
  { name: '骸骨将軍', hpMod: 1.3, attackType: 'melee', attackMod: 1.2, defenseMod: 1.0 },
  { name: '地獄の番犬', hpMod: 1.1, attackType: 'melee', attackMod: 1.4, defenseMod: 0.7, element: 'fire' },
  { name: '悪魔の使い', hpMod: 1.0, attackType: 'magical', attackMod: 1.3, defenseMod: 0.8 },
  { name: '冥界の騎士', hpMod: 1.4, attackType: 'melee', attackMod: 1.3, defenseMod: 1.2 },
  { name: 'リッチ', hpMod: 0.9, attackType: 'magical', attackMod: 1.6, defenseMod: 0.6 },
  { name: '地獄の戦士', hpMod: 1.3, attackType: 'melee', attackMod: 1.3, defenseMod: 1.0 },
  { name: '堕天使', hpMod: 1.0, attackType: 'mixed', attackMod: 1.4, defenseMod: 0.8 },
  { name: '亡者の群れ', hpMod: 1.5, attackType: 'melee', attackMod: 1.0, defenseMod: 0.9 },
  { name: '冥界の魔術師', hpMod: 0.8, attackType: 'magical', attackMod: 1.5, defenseMod: 0.5 },
  { name: 'デーモン', hpMod: 1.4, attackType: 'melee', attackMod: 1.4, defenseMod: 1.0 },
  { name: '死神の使い', hpMod: 1.1, attackType: 'magical', attackMod: 1.4, defenseMod: 0.7 },
  { name: '地獄の射手', hpMod: 0.9, attackType: 'ranged', attackMod: 1.3, defenseMod: 0.6 },
  { name: '冥界の番人', hpMod: 1.5, attackType: 'melee', attackMod: 1.2, defenseMod: 1.2 },
  { name: 'バンシー', hpMod: 0.7, attackType: 'magical', attackMod: 1.5, defenseMod: 0.4 },
  { name: '地獄の巨人', hpMod: 1.7, attackType: 'melee', attackMod: 1.2, defenseMod: 1.3 },
  { name: '死霊術師', hpMod: 0.8, attackType: 'magical', attackMod: 1.6, defenseMod: 0.5 },
  { name: 'デーモンナイト', hpMod: 1.4, attackType: 'melee', attackMod: 1.3, defenseMod: 1.1 },
  { name: '冥界の精霊', hpMod: 0.7, attackType: 'magical', attackMod: 1.5, defenseMod: 0.4 },
  { name: '地獄の蛇', hpMod: 1.0, attackType: 'mixed', attackMod: 1.2, defenseMod: 0.7 },
  { name: '死の騎士', hpMod: 1.3, attackType: 'melee', attackMod: 1.3, defenseMod: 1.1 },
  { name: 'デーモンロード', hpMod: 1.5, attackType: 'mixed', attackMod: 1.4, defenseMod: 1.1 },
  { name: '冥界の狼', hpMod: 1.0, attackType: 'melee', attackMod: 1.4, defenseMod: 0.6 },
  { name: '地獄の魔人', hpMod: 1.3, attackType: 'magical', attackMod: 1.4, defenseMod: 0.9 },
  { name: '死の使徒', hpMod: 1.1, attackType: 'magical', attackMod: 1.4, defenseMod: 0.8 },
  { name: 'デーモンウィザード', hpMod: 0.9, attackType: 'magical', attackMod: 1.6, defenseMod: 0.6 },
  { name: '冥界の守護者', hpMod: 1.6, attackType: 'melee', attackMod: 1.2, defenseMod: 1.3 },
  { name: '地獄の鬼', hpMod: 1.4, attackType: 'melee', attackMod: 1.3, defenseMod: 1.0 },
  { name: '死の魔導師', hpMod: 0.9, attackType: 'magical', attackMod: 1.6, defenseMod: 0.6 },
  { name: '冥界のガーディアン', hpMod: 1.6, attackType: 'mixed', attackMod: 1.3, defenseMod: 1.3 },
];

const EXPEDITION_7_ELITES: EnemyTemplate[] = [
  { name: '冥界の将軍', hpMod: 1.5, attackType: 'melee', attackMod: 1.5, defenseMod: 1.3 },
  { name: 'アークデーモン', hpMod: 1.6, attackType: 'mixed', attackMod: 1.5, defenseMod: 1.2 },
  { name: '死霊王', hpMod: 1.1, attackType: 'magical', attackMod: 1.8, defenseMod: 0.9 },
  { name: '地獄の竜', hpMod: 1.7, attackType: 'mixed', attackMod: 1.4, defenseMod: 1.3, element: 'fire' },
  { name: '冥王の親衛隊', hpMod: 1.5, attackType: 'mixed', attackMod: 1.5, defenseMod: 1.4 },
];

const EXPEDITION_7_BOSS: EnemyTemplate = {
  name: '冥王ハデス',
  hpMod: 1.5,
  attackType: 'magical',
  attackMod: 1.6,
  defenseMod: 1.3,
};

// ============================================================
// Expedition 8: 天空の神殿 (Celestial Temple) - Divine beings
// ============================================================
const EXPEDITION_8_NORMALS: EnemyTemplate[] = [
  { name: '天使', hpMod: 1.0, attackType: 'magical', attackMod: 1.3, defenseMod: 0.8 },
  { name: '神殿の守護者', hpMod: 1.5, attackType: 'melee', attackMod: 1.2, defenseMod: 1.3 },
  { name: '聖なる騎士', hpMod: 1.3, attackType: 'melee', attackMod: 1.3, defenseMod: 1.1 },
  { name: '光の精霊', hpMod: 0.7, attackType: 'magical', attackMod: 1.5, defenseMod: 0.4 },
  { name: '天空の戦士', hpMod: 1.2, attackType: 'melee', attackMod: 1.3, defenseMod: 1.0 },
  { name: 'セラフィム', hpMod: 1.0, attackType: 'magical', attackMod: 1.5, defenseMod: 0.8 },
  { name: '神殿の巨人', hpMod: 1.7, attackType: 'melee', attackMod: 1.2, defenseMod: 1.4 },
  { name: '聖なる射手', hpMod: 0.9, attackType: 'ranged', attackMod: 1.4, defenseMod: 0.6 },
  { name: '天空の魔術師', hpMod: 0.8, attackType: 'magical', attackMod: 1.6, defenseMod: 0.5 },
  { name: '光の戦士', hpMod: 1.2, attackType: 'melee', attackMod: 1.3, defenseMod: 1.0 },
  { name: '神殿の番人', hpMod: 1.4, attackType: 'melee', attackMod: 1.2, defenseMod: 1.2 },
  { name: '聖天使', hpMod: 1.1, attackType: 'mixed', attackMod: 1.4, defenseMod: 0.9 },
  { name: '天空のドラゴン', hpMod: 1.5, attackType: 'mixed', attackMod: 1.4, defenseMod: 1.1 },
  { name: '光の魔導師', hpMod: 0.8, attackType: 'magical', attackMod: 1.6, defenseMod: 0.5 },
  { name: '神殿の騎士', hpMod: 1.3, attackType: 'melee', attackMod: 1.3, defenseMod: 1.1 },
  { name: '聖なる巨人', hpMod: 1.6, attackType: 'melee', attackMod: 1.2, defenseMod: 1.3 },
  { name: '天空の精霊', hpMod: 0.8, attackType: 'magical', attackMod: 1.5, defenseMod: 0.5 },
  { name: '光の番人', hpMod: 1.4, attackType: 'melee', attackMod: 1.2, defenseMod: 1.2 },
  { name: '神殿の魔人', hpMod: 1.2, attackType: 'magical', attackMod: 1.4, defenseMod: 0.9 },
  { name: '聖なる使徒', hpMod: 1.1, attackType: 'magical', attackMod: 1.4, defenseMod: 0.8 },
  { name: '天空の鬼神', hpMod: 1.4, attackType: 'melee', attackMod: 1.4, defenseMod: 1.0 },
  { name: '光の使者', hpMod: 1.0, attackType: 'magical', attackMod: 1.4, defenseMod: 0.8 },
  { name: '神殿の狼', hpMod: 1.0, attackType: 'melee', attackMod: 1.4, defenseMod: 0.7 },
  { name: '聖なる守護者', hpMod: 1.5, attackType: 'mixed', attackMod: 1.3, defenseMod: 1.2 },
  { name: '天空の射手', hpMod: 0.9, attackType: 'ranged', attackMod: 1.4, defenseMod: 0.6 },
  { name: '光の騎士', hpMod: 1.3, attackType: 'melee', attackMod: 1.3, defenseMod: 1.1 },
  { name: '神殿の蛇', hpMod: 1.0, attackType: 'mixed', attackMod: 1.2, defenseMod: 0.8 },
  { name: '聖天使長', hpMod: 1.3, attackType: 'mixed', attackMod: 1.4, defenseMod: 1.0 },
  { name: '天空の魔導師', hpMod: 0.9, attackType: 'magical', attackMod: 1.6, defenseMod: 0.6 },
  { name: '神殿のガーディアン', hpMod: 1.6, attackType: 'melee', attackMod: 1.3, defenseMod: 1.4 },
];

const EXPEDITION_8_ELITES: EnemyTemplate[] = [
  { name: '天空の将軍', hpMod: 1.5, attackType: 'melee', attackMod: 1.5, defenseMod: 1.3 },
  { name: 'アークエンジェル', hpMod: 1.4, attackType: 'mixed', attackMod: 1.6, defenseMod: 1.1 },
  { name: '光の大魔導師', hpMod: 1.1, attackType: 'magical', attackMod: 1.8, defenseMod: 0.9 },
  { name: '神殿の竜王', hpMod: 1.7, attackType: 'mixed', attackMod: 1.5, defenseMod: 1.3 },
  { name: '神々の親衛隊', hpMod: 1.6, attackType: 'mixed', attackMod: 1.5, defenseMod: 1.4 },
];

const EXPEDITION_8_BOSS: EnemyTemplate = {
  name: '天帝ゼウス',
  hpMod: 1.6,
  attackType: 'magical',
  attackMod: 1.7,
  defenseMod: 1.4,
  element: 'thunder',
  resistances: { thunder: 0.0 },
};

// ============================================================
// All expedition data
// ============================================================
const EXPEDITION_DATA: {
  normals: EnemyTemplate[];
  elites: EnemyTemplate[];
  boss: EnemyTemplate;
}[] = [
  { normals: EXPEDITION_1_NORMALS, elites: EXPEDITION_1_ELITES, boss: EXPEDITION_1_BOSS },
  { normals: EXPEDITION_2_NORMALS, elites: EXPEDITION_2_ELITES, boss: EXPEDITION_2_BOSS },
  { normals: EXPEDITION_3_NORMALS, elites: EXPEDITION_3_ELITES, boss: EXPEDITION_3_BOSS },
  { normals: EXPEDITION_4_NORMALS, elites: EXPEDITION_4_ELITES, boss: EXPEDITION_4_BOSS },
  { normals: EXPEDITION_5_NORMALS, elites: EXPEDITION_5_ELITES, boss: EXPEDITION_5_BOSS },
  { normals: EXPEDITION_6_NORMALS, elites: EXPEDITION_6_ELITES, boss: EXPEDITION_6_BOSS },
  { normals: EXPEDITION_7_NORMALS, elites: EXPEDITION_7_ELITES, boss: EXPEDITION_7_BOSS },
  { normals: EXPEDITION_8_NORMALS, elites: EXPEDITION_8_ELITES, boss: EXPEDITION_8_BOSS },
];

// ============================================================
// Helper to create stats from class base structure
// ============================================================
type EnemyClassBase = {
  hp: number;
  abilities: AbilityId[];
  accuracyBonus: number;
  evasionBonus: number;
  rangedAttack: number;
  rangedNoA: number;
  magicalAttack: number;
  magicalNoA: number;
  meleeAttack: number;
  meleeNoA: number;
  rangedAttackAmplifier: number;
  magicalAttackAmplifier: number;
  meleeAttackAmplifier: number;
  physicalDefense: number;
  magicalDefense: number;
  experience: number;
};

const ENEMY_CLASS_BASES: Record<EnemyClassId, EnemyClassBase> = {
  fighter: { hp: 75, abilities: [], accuracyBonus: 0.0, evasionBonus: 0.02, rangedAttack: 0, rangedNoA: 0, magicalAttack: 0, magicalNoA: 0, meleeAttack: 16, meleeNoA: 1, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0, physicalDefense: 16, magicalDefense: 10, experience: 10 },
  duelist: { hp: 50, abilities: ['counter'], accuracyBonus: 0.01, evasionBonus: 0.01, rangedAttack: 0, rangedNoA: 0, magicalAttack: 0, magicalNoA: 0, meleeAttack: 20, meleeNoA: 2, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.2, physicalDefense: 10, magicalDefense: 10, experience: 10 },
  ninja: { hp: 47, abilities: ['re_attack'], accuracyBonus: 0.0, evasionBonus: 0.04, rangedAttack: 10, rangedNoA: 1, magicalAttack: 0, magicalNoA: 0, meleeAttack: 14, meleeNoA: 1, rangedAttackAmplifier: 1.1, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.1, physicalDefense: 10, magicalDefense: 10, experience: 14 },
  samurai: { hp: 40, abilities: [], accuracyBonus: -0.05, evasionBonus: -0.01, rangedAttack: 0, rangedNoA: 0, magicalAttack: 0, magicalNoA: 0, meleeAttack: 40, meleeNoA: 1, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.3, physicalDefense: 8, magicalDefense: 8, experience: 12 },
  lord: { hp: 60, abilities: [], accuracyBonus: 0.0, evasionBonus: 0.0, rangedAttack: 0, rangedNoA: 0, magicalAttack: 0, magicalNoA: 0, meleeAttack: 18, meleeNoA: 2, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.1, physicalDefense: 14, magicalDefense: 14, experience: 20 },
  ranger: { hp: 38, abilities: [], accuracyBonus: 0.03, evasionBonus: 0.01, rangedAttack: 14, rangedNoA: 2, magicalAttack: 0, magicalNoA: 0, meleeAttack: 0, meleeNoA: 0, rangedAttackAmplifier: 1.2, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0, physicalDefense: 8, magicalDefense: 8, experience: 12 },
  wizard: { hp: 32, abilities: [], accuracyBonus: 0.0, evasionBonus: 0.0, rangedAttack: 0, rangedNoA: 0, magicalAttack: 20, magicalNoA: 1, meleeAttack: 0, meleeNoA: 0, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.2, meleeAttackAmplifier: 1.0, physicalDefense: 6, magicalDefense: 14, experience: 10 },
  sage: { hp: 38, abilities: [], accuracyBonus: 0.0, evasionBonus: 0.0, rangedAttack: 0, rangedNoA: 0, magicalAttack: 10, magicalNoA: 2, meleeAttack: 0, meleeNoA: 0, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.2, meleeAttackAmplifier: 1.0, physicalDefense: 8, magicalDefense: 20, experience: 10 },
  rogue: { hp: 30, abilities: [], accuracyBonus: 0.06, evasionBonus: 0.06, rangedAttack: 10, rangedNoA: 2, magicalAttack: 0, magicalNoA: 0, meleeAttack: 10, meleeNoA: 2, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.2, meleeAttackAmplifier: 1.0, physicalDefense: 8, magicalDefense: 8, experience: 8 },
  pilgrim: { hp: 66, abilities: ['null_counter'], accuracyBonus: 0.0, evasionBonus: 0.02, rangedAttack: 0, rangedNoA: 0, magicalAttack: 10, magicalNoA: 1, meleeAttack: 16, meleeNoA: 1, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.2, meleeAttackAmplifier: 1.2, physicalDefense: 12, magicalDefense: 12, experience: 16 },
};

// ============================================================
// Generate enemy from template
// ============================================================
function createEnemyFromTemplate(
  id: number,
  template: EnemyTemplate,
  tier: number,
  type: EnemyType,
  poolId: number,
  enemyClass: EnemyClassId,
  spawnPool: number
): EnemyDef {
  const tierMult = TIER_STAT_MULTIPLIERS[tier - 1];
  const classBase = ENEMY_CLASS_BASES[enemyClass];
  const enemyTypeExpMult = type === 'elite' ? 2.0 : type === 'boss' ? 5.0 : 1.0;

  // Apply tier multiplier and template modifiers on top of class base
  const hp = Math.floor(classBase.hp * tierMult * template.hpMod);
  const attackScale = tierMult * template.attackMod;
  const defenseScale = tierMult * template.defenseMod;

  // Calculate drop item ID based on enemy type
  // Normal enemies drop uncommon items, elite drop rare, boss drop rare
  let dropItemId: number;
  if (type === 'normal') {
    // Uncommon items: tier*1000 + 200 + (1..24), 24 per tier
    dropItemId = tier * 1000 + 200 + (id % 24) + 1;
  } else if (type === 'elite') {
    // Rare items: tier*1000 + 300 + (1..12), 12 per tier
    dropItemId = tier * 1000 + 300 + (id % 12) + 1;
  } else {
    // Boss: mythic items (per boss drop tables)
    dropItemId = getBossMythicDropId(tier, id);
  }

  return {
    id,
    type,
    spawnTier: tier,
    spawnPool,
    poolId,
    name: template.name,
    enemyClass,
    abilities: classBase.abilities,
    accuracyBonus: classBase.accuracyBonus,
    evasionBonus: classBase.evasionBonus,
    hp,
    rangedAttack: Math.floor(classBase.rangedAttack * attackScale),
    rangedNoA: Math.floor(classBase.rangedNoA * tierMult),
    magicalAttack: Math.floor(classBase.magicalAttack * attackScale),
    magicalNoA: Math.floor(classBase.magicalNoA * tierMult),
    meleeAttack: Math.floor(classBase.meleeAttack * attackScale),
    meleeNoA: Math.floor(classBase.meleeNoA * tierMult),
    rangedAttackAmplifier: classBase.rangedAttackAmplifier * tierMult,
    magicalAttackAmplifier: classBase.magicalAttackAmplifier * tierMult,
    meleeAttackAmplifier: classBase.meleeAttackAmplifier * tierMult,
    physicalDefense: Math.floor(classBase.physicalDefense * defenseScale),
    magicalDefense: Math.floor(classBase.magicalDefense * defenseScale),
    elementalOffense: template.element || 'none',
    elementalResistance: {
      fire: template.resistances?.fire ?? 1.0,
      thunder: template.resistances?.thunder ?? 1.0,
      ice: template.resistances?.ice ?? 1.0,
    },
    experience: Math.floor(classBase.experience * tierMult * template.hpMod * enemyTypeExpMult),
    dropItemId,
  };
}

// ============================================================
// Generate all enemies
// ============================================================
function generateEnemies(): EnemyDef[] {
  const enemies: EnemyDef[] = [];

  const normalClassByPool: Record<number, EnemyClassId[]> = {
    1: ['fighter', 'ranger', 'wizard', 'pilgrim', 'rogue'],
    2: ['ninja', 'samurai', 'sage', 'duelist', 'lord'],
    3: ['fighter', 'ranger', 'wizard', 'lord', 'samurai'],
    4: ['ninja', 'rogue', 'sage', 'duelist', 'pilgrim'],
    5: ['fighter', 'ranger', 'wizard', 'lord', 'samurai'],
    6: ['ninja', 'rogue', 'sage', 'duelist', 'pilgrim'],
  };
  const eliteClassByFloor: EnemyClassId[] = ['rogue', 'fighter', 'ranger', 'duelist', 'wizard'];
  const bossClassByTier: Record<number, EnemyClassId> = {
    1: 'fighter',
    2: 'ranger',
    3: 'wizard',
    4: 'samurai',
    5: 'ranger',
    6: 'sage',
    7: 'lord',
    8: 'ninja',
  };

  for (let tier = 1; tier <= 8; tier++) {
    const data = EXPEDITION_DATA[tier - 1];
    const poolId = tier;

    // Normal enemies (30 per tier)
    // ID format: tier * 1000 + index (1-30)
    for (let i = 0; i < 30; i++) {
      const template = data.normals[i];
      const id = tier * 1000 + i + 1;
      const floorPool = Math.floor(i / 5) + 1;
      const classInPool = i % 5;
      const enemyClass = normalClassByPool[floorPool][classInPool];
      enemies.push(createEnemyFromTemplate(id, template, tier, 'normal', poolId, enemyClass, floorPool));
    }

    // Elite enemies (5 per tier)
    // ID format: tier * 1000 + 50 + index (51-55)
    for (let i = 0; i < 5; i++) {
      const template = data.elites[i];
      const id = tier * 1000 + 50 + i + 1;
      const enemyClass = eliteClassByFloor[i] ?? 'fighter';
      enemies.push(createEnemyFromTemplate(id, template, tier, 'elite', poolId, enemyClass, 0));
    }

    // Boss enemy (1 per tier)
    // ID format: tier * 100 + 1 (101, 201, etc. - matching dungeon bossId)
    const bossId = tier * 100 + 1;
    enemies.push(createEnemyFromTemplate(bossId, data.boss, tier, 'boss', 0, bossClassByTier[tier] ?? 'lord', 0));
  }

  return enemies;
}

export const ENEMIES: EnemyDef[] = generateEnemies();

export const getEnemyById = (id: number): EnemyDef | undefined =>
  ENEMIES.find(e => e.id === id);

export const getEnemiesByPool = (poolId: number): EnemyDef[] =>
  ENEMIES.filter(e => e.poolId === poolId && e.type === 'normal');

export const getElitesByPool = (poolId: number): EnemyDef[] =>
  ENEMIES.filter(e => e.poolId === poolId && e.type === 'elite');

export const getBossEnemy = (id: number): EnemyDef | undefined =>
  ENEMIES.find(e => e.id === id && e.type === 'boss');

function getTierFromEnemy(enemyId: number): number {
  if (enemyId >= 1000) return Math.floor(enemyId / 1000);
  return Math.floor(enemyId / 100);
}

function pickItems(pool: ItemDef[], count: number, seed: number): ItemDef[] {
  if (pool.length === 0) return [];

  const picked: ItemDef[] = [];
  for (let i = 0; i < count; i++) {
    const index = (seed + i * 7) % pool.length;
    picked.push(pool[index]);
  }

  return picked;
}

export function getEnemyDropCandidates(enemy: EnemyDef): ItemDef[] {
  const tier = enemy.spawnTier || getTierFromEnemy(enemy.id);
  const common = getItemsByTierAndRarity(tier, 'common');
  const uncommon = getItemsByTierAndRarity(tier, 'uncommon');
  const rare = getItemsByTierAndRarity(tier, 'rare');
  const mythic = getItemsByTierAndRarity(tier, 'mythic');

  const classUncommonCategories: Record<EnemyClassId, [ItemCategory, ItemCategory]> = {
    fighter: ['sword', 'gauntlet'],
    ranger: ['arrow', 'archery'],
    wizard: ['wand', 'catalyst'],
    pilgrim: ['sword', 'wand'],
    rogue: ['bolt', 'shield'],
    ninja: ['katana', 'armor'],
    samurai: ['katana', 'bolt'],
    sage: ['grimoire', 'robe'],
    duelist: ['sword', 'arrow'],
    lord: ['shield', 'robe'],
  };

  const eliteRareByFloor: Record<number, ItemCategory[]> = {
    1: ['sword', 'armor'],
    2: ['shield', 'robe'],
    3: ['arrow', 'bolt', 'archery'],
    4: ['armor', 'katana'],
    5: ['wand', 'grimoire', 'catalyst'],
  };

  const bossMythicByTier: Record<number, ItemCategory[]> = {
    1: ['sword', 'grimoire'],
    2: ['armor', 'arrow'],
    3: ['wand', 'robe'],
    4: ['katana', 'shield'],
    5: ['bolt', 'archery'],
    6: ['armor', 'catalyst'],
    7: ['sword', 'wand'],
    8: ['katana', 'bolt', 'grimoire'],
  };

  const pickByCategory = (pool: ItemDef[], category: ItemCategory, seed: number): ItemDef | undefined => {
    const candidates = pool.filter(item => item.category === category);
    if (candidates.length === 0) return undefined;
    return candidates[Math.abs(seed) % candidates.length];
  };

  const pickAny = (pool: ItemDef[], count: number, seed: number): ItemDef[] =>
    pickItems(pool, count, seed);

  if (enemy.type === 'normal') {
    const drops: ItemDef[] = [];
    const uncommonCats = classUncommonCategories[enemy.enemyClass] ?? ['sword', 'gauntlet'];
    const uncommon1 = pickByCategory(uncommon, uncommonCats[0], enemy.id);
    const uncommon2 = pickByCategory(uncommon, uncommonCats[1], enemy.id + 1);
    if (uncommon1) drops.push(uncommon1);
    if (uncommon2) drops.push(uncommon2);

    drops.push(...pickAny(common, 3, enemy.id + 2));
    return drops.slice(0, 5);
  }

  if (enemy.type === 'elite') {
    const drops: ItemDef[] = [];
    const floor = Math.max(1, Math.min(5, (enemy.id % 1000) - 50));
    const rareCats = eliteRareByFloor[floor] ?? ['sword', 'armor'];
    const rare1 = pickByCategory(rare, rareCats[0], enemy.id);
    const rare2 = pickByCategory(rare, rareCats[1] ?? rareCats[0], enemy.id + 1);
    if (rare1) drops.push(rare1);
    if (rare2) drops.push(rare2);

    const uncommonPick = pickByCategory(uncommon, rareCats[0], enemy.id + 2) ?? pickAny(uncommon, 1, enemy.id + 2)[0];
    if (uncommonPick) drops.push(uncommonPick);

    drops.push(...pickAny(common, 2, enemy.id + 3));
    return drops.slice(0, 5);
  }

  const drops: ItemDef[] = [];
  const mythicCats = bossMythicByTier[tier] ?? ['sword', 'grimoire'];
  const mythic1 = pickByCategory(mythic, mythicCats[0], enemy.id);
  const mythic2 = pickByCategory(mythic, mythicCats[1] ?? mythicCats[0], enemy.id + 1);
  if (mythic1) drops.push(mythic1);
  if (mythic2) drops.push(mythic2);

  const rare1 = pickByCategory(rare, mythicCats[0], enemy.id + 2) ?? pickAny(rare, 1, enemy.id + 2)[0];
  const rare2 = pickByCategory(rare, mythicCats[1] ?? mythicCats[0], enemy.id + 3) ?? pickAny(rare, 1, enemy.id + 3)[0];
  if (rare1) drops.push(rare1);
  if (rare2) drops.push(rare2);

  drops.push(...pickAny(common, 1, enemy.id + 4));
  return drops.slice(0, 5);
}

// Get random normal enemy from pool
export function getRandomNormalEnemy(poolId: number): EnemyDef {
  const pool = getEnemiesByPool(poolId);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Get random elite enemy from pool
export function getRandomEliteEnemy(poolId: number): EnemyDef {
  const pool = getElitesByPool(poolId);
  return pool[Math.floor(Math.random() * pool.length)];
}
