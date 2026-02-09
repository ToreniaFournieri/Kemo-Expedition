import { EnemyDef, EnemyType, ElementalOffense } from '../types';

// Base stats per tier (these get multiplied by tier multiplier in dungeons)
// Tier 1 base stats serve as the foundation
const TIER_BASE_STATS = {
  normalHP: 60,
  normalAttack: 12,
  normalDefense: 4,
  eliteHP: 150,
  eliteAttack: 18,
  eliteDefense: 8,
  bossHP: 300,
  bossAttack: 25,
  bossDefense: 12,
};

// Tier scaling multipliers (applied to base stats)
const TIER_STAT_MULTIPLIERS = [1, 2, 4, 8, 16, 32, 64, 128];

// Experience per tier
const TIER_EXP_BASE = [10, 25, 50, 100, 200, 400, 800, 1600];
const ELITE_EXP_MULTIPLIER = 3;
const BOSS_EXP_MULTIPLIER = 10;

// Enemy templates for each expedition
interface EnemyTemplate {
  name: string;
  hpMod: number; // HP modifier (0.5 to 1.5)
  attackType: 'melee' | 'ranged' | 'magical' | 'mixed';
  attackMod: number;
  defenseMod: number;
  element?: ElementalOffense;
  resistances?: Partial<Record<'fire' | 'thunder' | 'ice', number>>;
}

// Expedition 1: 草原の遺跡 (Grassland Ruins) - Basic enemies
const EXPEDITION_1_NORMALS: EnemyTemplate[] = [
  { name: 'ゴブリン', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 0.5 },
  { name: 'スライム', hpMod: 0.7, attackType: 'magical', attackMod: 0.8, defenseMod: 0.3 },
  { name: '野犬', hpMod: 0.8, attackType: 'melee', attackMod: 1.2, defenseMod: 0.4 },
  { name: '大蛇', hpMod: 0.9, attackType: 'mixed', attackMod: 0.9, defenseMod: 0.6 },
  { name: 'コボルト', hpMod: 1.1, attackType: 'melee', attackMod: 1.1, defenseMod: 0.7 },
  { name: '大ネズミ', hpMod: 0.5, attackType: 'melee', attackMod: 0.7, defenseMod: 0.2 },
  { name: 'ホブゴブリン', hpMod: 1.2, attackType: 'melee', attackMod: 1.3, defenseMod: 0.8 },
  { name: '野生の猪', hpMod: 1.3, attackType: 'melee', attackMod: 1.4, defenseMod: 0.6 },
  { name: '毒蛙', hpMod: 0.6, attackType: 'ranged', attackMod: 0.9, defenseMod: 0.3 },
  { name: '骸骨戦士', hpMod: 0.9, attackType: 'melee', attackMod: 1.0, defenseMod: 0.5 },
  { name: 'ゴブリン弓兵', hpMod: 0.7, attackType: 'ranged', attackMod: 1.0, defenseMod: 0.4 },
  { name: 'ゴブリン術師', hpMod: 0.6, attackType: 'magical', attackMod: 1.1, defenseMod: 0.3 },
  { name: '野良猫', hpMod: 0.4, attackType: 'melee', attackMod: 0.6, defenseMod: 0.2 },
  { name: '森蜘蛛', hpMod: 0.7, attackType: 'ranged', attackMod: 0.8, defenseMod: 0.4 },
  { name: '朽ちた兵士', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 0.6 },
  { name: 'マッドスライム', hpMod: 0.8, attackType: 'magical', attackMod: 0.7, defenseMod: 0.5 },
  { name: '遺跡の番人', hpMod: 1.4, attackType: 'melee', attackMod: 1.2, defenseMod: 0.9 },
  { name: 'コボルト斥候', hpMod: 0.8, attackType: 'ranged', attackMod: 1.0, defenseMod: 0.5 },
  { name: 'ゴブリン戦士', hpMod: 1.1, attackType: 'melee', attackMod: 1.2, defenseMod: 0.7 },
  { name: '野生の狼', hpMod: 0.9, attackType: 'melee', attackMod: 1.3, defenseMod: 0.4 },
  { name: '苔むしたゴーレム', hpMod: 1.5, attackType: 'melee', attackMod: 0.9, defenseMod: 1.0 },
  { name: '幽霊', hpMod: 0.5, attackType: 'magical', attackMod: 1.0, defenseMod: 0.2 },
  { name: '蔦の怪物', hpMod: 1.0, attackType: 'melee', attackMod: 0.8, defenseMod: 0.7 },
  { name: 'ゴブリン隊長', hpMod: 1.3, attackType: 'melee', attackMod: 1.4, defenseMod: 0.8 },
  { name: '遺跡の精霊', hpMod: 0.7, attackType: 'magical', attackMod: 1.2, defenseMod: 0.4 },
  { name: '石像の番兵', hpMod: 1.6, attackType: 'melee', attackMod: 1.0, defenseMod: 1.1 },
  { name: '毒蛇', hpMod: 0.6, attackType: 'melee', attackMod: 1.1, defenseMod: 0.3 },
  { name: '野盗', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 0.6 },
  { name: '迷える亡霊', hpMod: 0.6, attackType: 'magical', attackMod: 0.9, defenseMod: 0.3 },
  { name: '遺跡の守護者', hpMod: 1.4, attackType: 'mixed', attackMod: 1.3, defenseMod: 0.9 },
];

const EXPEDITION_1_ELITES: EnemyTemplate[] = [
  { name: 'ゴブリンチャンピオン', hpMod: 1.2, attackType: 'melee', attackMod: 1.3, defenseMod: 1.0 },
  { name: 'キングスライム', hpMod: 1.0, attackType: 'magical', attackMod: 1.2, defenseMod: 0.8 },
  { name: 'オーガ', hpMod: 1.5, attackType: 'melee', attackMod: 1.4, defenseMod: 1.1 },
  { name: '骸骨騎士', hpMod: 1.3, attackType: 'melee', attackMod: 1.3, defenseMod: 1.2 },
  { name: '遺跡の魔術師', hpMod: 0.9, attackType: 'magical', attackMod: 1.5, defenseMod: 0.7 },
];

const EXPEDITION_1_BOSS: EnemyTemplate = {
  name: 'ゴブリンキング',
  hpMod: 1.0,
  attackType: 'mixed',
  attackMod: 1.2,
  defenseMod: 1.0,
};

// Expedition 2: 古代の洞窟 (Ancient Cave) - Cave dwellers
const EXPEDITION_2_NORMALS: EnemyTemplate[] = [
  { name: 'オーク', hpMod: 1.2, attackType: 'melee', attackMod: 1.1, defenseMod: 0.8 },
  { name: 'コウモリの群れ', hpMod: 0.6, attackType: 'ranged', attackMod: 1.0, defenseMod: 0.3 },
  { name: '洞窟トロール', hpMod: 1.5, attackType: 'melee', attackMod: 1.3, defenseMod: 0.9 },
  { name: '岩石魔人', hpMod: 1.4, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.2 },
  { name: 'ダークエルフ', hpMod: 0.9, attackType: 'mixed', attackMod: 1.2, defenseMod: 0.7 },
  { name: '洞窟蜘蛛', hpMod: 0.7, attackType: 'ranged', attackMod: 0.9, defenseMod: 0.4 },
  { name: '地底蟲', hpMod: 0.8, attackType: 'melee', attackMod: 0.8, defenseMod: 0.5 },
  { name: '石化蛇', hpMod: 1.0, attackType: 'magical', attackMod: 1.1, defenseMod: 0.6 },
  { name: 'ダークゴブリン', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 0.6 },
  { name: '洞窟オーク', hpMod: 1.3, attackType: 'melee', attackMod: 1.2, defenseMod: 0.9 },
  { name: '闇の精霊', hpMod: 0.6, attackType: 'magical', attackMod: 1.3, defenseMod: 0.3 },
  { name: '鍾乳石ゴーレム', hpMod: 1.6, attackType: 'melee', attackMod: 0.9, defenseMod: 1.3 },
  { name: '地底蟻', hpMod: 0.5, attackType: 'melee', attackMod: 0.7, defenseMod: 0.4 },
  { name: '洞窟リザード', hpMod: 1.1, attackType: 'melee', attackMod: 1.1, defenseMod: 0.7 },
  { name: '暗黒術師', hpMod: 0.7, attackType: 'magical', attackMod: 1.4, defenseMod: 0.4 },
  { name: '地底の亡者', hpMod: 0.9, attackType: 'melee', attackMod: 1.0, defenseMod: 0.5 },
  { name: '岩蟹', hpMod: 1.2, attackType: 'melee', attackMod: 0.8, defenseMod: 1.1 },
  { name: '地底魚人', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 0.6 },
  { name: 'ダークエルフ弓兵', hpMod: 0.8, attackType: 'ranged', attackMod: 1.2, defenseMod: 0.5 },
  { name: '洞窟蝙蝠王', hpMod: 1.1, attackType: 'ranged', attackMod: 1.1, defenseMod: 0.6 },
  { name: '地底蠍', hpMod: 1.0, attackType: 'melee', attackMod: 1.2, defenseMod: 0.8 },
  { name: '暗闇の使徒', hpMod: 0.8, attackType: 'magical', attackMod: 1.3, defenseMod: 0.5 },
  { name: '岩の精霊', hpMod: 1.3, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '洞窟の番人', hpMod: 1.4, attackType: 'melee', attackMod: 1.1, defenseMod: 1.0 },
  { name: 'ダークドワーフ', hpMod: 1.2, attackType: 'melee', attackMod: 1.0, defenseMod: 1.1 },
  { name: '地底竜', hpMod: 1.5, attackType: 'mixed', attackMod: 1.3, defenseMod: 0.9 },
  { name: '闇の戦士', hpMod: 1.1, attackType: 'melee', attackMod: 1.2, defenseMod: 0.8 },
  { name: '洞窟の主', hpMod: 1.4, attackType: 'melee', attackMod: 1.2, defenseMod: 1.0 },
  { name: '地底の守護者', hpMod: 1.3, attackType: 'mixed', attackMod: 1.1, defenseMod: 0.9 },
  { name: '古代の石像', hpMod: 1.6, attackType: 'melee', attackMod: 1.0, defenseMod: 1.2 },
];

const EXPEDITION_2_ELITES: EnemyTemplate[] = [
  { name: 'オーク戦士長', hpMod: 1.4, attackType: 'melee', attackMod: 1.4, defenseMod: 1.1 },
  { name: 'トロールキング', hpMod: 1.6, attackType: 'melee', attackMod: 1.3, defenseMod: 1.2 },
  { name: 'ダークエルフ将軍', hpMod: 1.1, attackType: 'mixed', attackMod: 1.5, defenseMod: 0.9 },
  { name: '岩石の巨人', hpMod: 1.8, attackType: 'melee', attackMod: 1.2, defenseMod: 1.4 },
  { name: '暗黒魔導師', hpMod: 0.9, attackType: 'magical', attackMod: 1.6, defenseMod: 0.7 },
];

const EXPEDITION_2_BOSS: EnemyTemplate = {
  name: '洞窟の主ドラゴン',
  hpMod: 1.2,
  attackType: 'mixed',
  attackMod: 1.3,
  defenseMod: 1.1,
  element: 'fire',
  resistances: { fire: 0.3, ice: 1.5 },
};

// Expedition 3: 呪われた森 (Cursed Forest) - Dark creatures
const EXPEDITION_3_NORMALS: EnemyTemplate[] = [
  { name: 'トレント', hpMod: 1.4, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0, resistances: { fire: 2.0, ice: 0.7 } },
  { name: '森の精霊', hpMod: 0.7, attackType: 'magical', attackMod: 1.3, defenseMod: 0.5 },
  { name: 'ワーウルフ', hpMod: 1.1, attackType: 'melee', attackMod: 1.4, defenseMod: 0.7 },
  { name: '毒蜘蛛', hpMod: 0.8, attackType: 'ranged', attackMod: 1.1, defenseMod: 0.5 },
  { name: '呪われた騎士', hpMod: 1.3, attackType: 'mixed', attackMod: 1.2, defenseMod: 1.0 },
  { name: '呪いの木', hpMod: 1.5, attackType: 'magical', attackMod: 0.9, defenseMod: 1.1, resistances: { fire: 1.8 } },
  { name: '森の狼', hpMod: 0.9, attackType: 'melee', attackMod: 1.2, defenseMod: 0.5 },
  { name: '毒キノコ', hpMod: 0.5, attackType: 'magical', attackMod: 1.0, defenseMod: 0.3 },
  { name: '呪われた鹿', hpMod: 1.0, attackType: 'melee', attackMod: 1.1, defenseMod: 0.6 },
  { name: '闇の妖精', hpMod: 0.6, attackType: 'magical', attackMod: 1.4, defenseMod: 0.3 },
  { name: 'ゾンビ', hpMod: 1.2, attackType: 'melee', attackMod: 0.9, defenseMod: 0.8 },
  { name: '呪われた熊', hpMod: 1.4, attackType: 'melee', attackMod: 1.3, defenseMod: 0.9 },
  { name: '森の亡霊', hpMod: 0.7, attackType: 'magical', attackMod: 1.2, defenseMod: 0.4 },
  { name: '毒蔦', hpMod: 1.1, attackType: 'melee', attackMod: 0.8, defenseMod: 0.7 },
  { name: 'ダークフェアリー', hpMod: 0.5, attackType: 'magical', attackMod: 1.5, defenseMod: 0.2 },
  { name: '呪われた猪', hpMod: 1.3, attackType: 'melee', attackMod: 1.2, defenseMod: 0.8 },
  { name: '闇の蝶', hpMod: 0.4, attackType: 'magical', attackMod: 1.1, defenseMod: 0.2 },
  { name: 'ワーベア', hpMod: 1.5, attackType: 'melee', attackMod: 1.4, defenseMod: 1.0 },
  { name: '呪われた弓兵', hpMod: 0.9, attackType: 'ranged', attackMod: 1.2, defenseMod: 0.6 },
  { name: '森の魔女', hpMod: 0.8, attackType: 'magical', attackMod: 1.5, defenseMod: 0.5 },
  { name: 'ゾンビナイト', hpMod: 1.3, attackType: 'melee', attackMod: 1.1, defenseMod: 1.0 },
  { name: '呪いの蛇', hpMod: 0.8, attackType: 'mixed', attackMod: 1.1, defenseMod: 0.5 },
  { name: '闇のエルフ', hpMod: 1.0, attackType: 'mixed', attackMod: 1.3, defenseMod: 0.7 },
  { name: '森の怨霊', hpMod: 0.9, attackType: 'magical', attackMod: 1.3, defenseMod: 0.5 },
  { name: '呪われた番人', hpMod: 1.4, attackType: 'melee', attackMod: 1.2, defenseMod: 1.1 },
  { name: 'ダークトレント', hpMod: 1.6, attackType: 'melee', attackMod: 1.1, defenseMod: 1.2, resistances: { fire: 1.5 } },
  { name: '森の死神', hpMod: 1.0, attackType: 'magical', attackMod: 1.4, defenseMod: 0.6 },
  { name: '呪われた巨人', hpMod: 1.7, attackType: 'melee', attackMod: 1.3, defenseMod: 1.0 },
  { name: '闘争の亡霊', hpMod: 1.1, attackType: 'mixed', attackMod: 1.2, defenseMod: 0.7 },
  { name: '呪われた守護者', hpMod: 1.5, attackType: 'mixed', attackMod: 1.2, defenseMod: 1.1 },
];

const EXPEDITION_3_ELITES: EnemyTemplate[] = [
  { name: '大樹の精霊', hpMod: 1.5, attackType: 'magical', attackMod: 1.4, defenseMod: 1.0 },
  { name: 'ワーウルフ王', hpMod: 1.3, attackType: 'melee', attackMod: 1.5, defenseMod: 1.0 },
  { name: '呪われた将軍', hpMod: 1.4, attackType: 'mixed', attackMod: 1.4, defenseMod: 1.2 },
  { name: '森の大魔女', hpMod: 1.0, attackType: 'magical', attackMod: 1.7, defenseMod: 0.8 },
  { name: 'ダークエント', hpMod: 1.8, attackType: 'melee', attackMod: 1.2, defenseMod: 1.3, resistances: { fire: 1.5 } },
];

const EXPEDITION_3_BOSS: EnemyTemplate = {
  name: '森の女王',
  hpMod: 1.3,
  attackType: 'magical',
  attackMod: 1.4,
  defenseMod: 1.0,
  element: 'ice',
  resistances: { fire: 1.5, ice: 0.3 },
};

// Expedition 4: 炎の火山 (Flame Volcano) - Fire creatures
const EXPEDITION_4_NORMALS: EnemyTemplate[] = [
  { name: 'ファイアサラマンダー', hpMod: 1.1, attackType: 'mixed', attackMod: 1.1, defenseMod: 0.8, element: 'fire', resistances: { fire: 0.2, ice: 2.0 } },
  { name: '溶岩ゴーレム', hpMod: 1.6, attackType: 'melee', attackMod: 1.2, defenseMod: 1.2, element: 'fire', resistances: { fire: 0.1, ice: 2.0 } },
  { name: '炎の精霊', hpMod: 0.7, attackType: 'magical', attackMod: 1.5, defenseMod: 0.5, element: 'fire', resistances: { fire: 0.0, ice: 2.0 } },
  { name: '火山蟻', hpMod: 0.8, attackType: 'ranged', attackMod: 1.0, defenseMod: 0.5, element: 'fire', resistances: { fire: 0.3, ice: 1.5 } },
  { name: '炎の騎士', hpMod: 1.3, attackType: 'mixed', attackMod: 1.3, defenseMod: 1.0, element: 'fire', resistances: { fire: 0.2, ice: 1.8 } },
  { name: '溶岩蛇', hpMod: 1.0, attackType: 'melee', attackMod: 1.1, defenseMod: 0.7, element: 'fire', resistances: { fire: 0.2, ice: 1.8 } },
  { name: '火炎鳥', hpMod: 0.8, attackType: 'ranged', attackMod: 1.2, defenseMod: 0.4, element: 'fire', resistances: { fire: 0.1, ice: 2.0 } },
  { name: '炎の犬', hpMod: 0.9, attackType: 'melee', attackMod: 1.3, defenseMod: 0.5, element: 'fire', resistances: { fire: 0.2, ice: 1.8 } },
  { name: '火山トカゲ', hpMod: 1.1, attackType: 'melee', attackMod: 1.0, defenseMod: 0.8, element: 'fire', resistances: { fire: 0.3, ice: 1.7 } },
  { name: '溶岩スライム', hpMod: 0.9, attackType: 'magical', attackMod: 1.0, defenseMod: 0.6, element: 'fire', resistances: { fire: 0.1, ice: 2.0 } },
  { name: '炎の戦士', hpMod: 1.2, attackType: 'melee', attackMod: 1.2, defenseMod: 0.9, element: 'fire', resistances: { fire: 0.3, ice: 1.7 } },
  { name: '火炎魔導師', hpMod: 0.8, attackType: 'magical', attackMod: 1.4, defenseMod: 0.5, element: 'fire', resistances: { fire: 0.2, ice: 1.8 } },
  { name: '溶岩巨人', hpMod: 1.7, attackType: 'melee', attackMod: 1.1, defenseMod: 1.3, element: 'fire', resistances: { fire: 0.1, ice: 2.0 } },
  { name: '火山蝙蝠', hpMod: 0.6, attackType: 'ranged', attackMod: 0.9, defenseMod: 0.3, element: 'fire', resistances: { fire: 0.3, ice: 1.5 } },
  { name: '炎の番人', hpMod: 1.4, attackType: 'melee', attackMod: 1.2, defenseMod: 1.1, element: 'fire', resistances: { fire: 0.2, ice: 1.8 } },
  { name: '溶岩蟹', hpMod: 1.2, attackType: 'melee', attackMod: 0.9, defenseMod: 1.0, element: 'fire', resistances: { fire: 0.2, ice: 1.8 } },
  { name: '火炎の使徒', hpMod: 1.0, attackType: 'magical', attackMod: 1.3, defenseMod: 0.7, element: 'fire', resistances: { fire: 0.1, ice: 2.0 } },
  { name: '炎獣', hpMod: 1.3, attackType: 'melee', attackMod: 1.4, defenseMod: 0.8, element: 'fire', resistances: { fire: 0.2, ice: 1.8 } },
  { name: '火山の亡霊', hpMod: 0.9, attackType: 'magical', attackMod: 1.2, defenseMod: 0.5, element: 'fire', resistances: { fire: 0.2, ice: 1.8 } },
  { name: '溶岩の守護者', hpMod: 1.5, attackType: 'mixed', attackMod: 1.2, defenseMod: 1.2, element: 'fire', resistances: { fire: 0.1, ice: 2.0 } },
  { name: '炎の弓兵', hpMod: 0.9, attackType: 'ranged', attackMod: 1.2, defenseMod: 0.6, element: 'fire', resistances: { fire: 0.3, ice: 1.7 } },
  { name: '火山竜', hpMod: 1.5, attackType: 'mixed', attackMod: 1.3, defenseMod: 1.0, element: 'fire', resistances: { fire: 0.1, ice: 2.0 } },
  { name: '溶岩の精', hpMod: 0.8, attackType: 'magical', attackMod: 1.4, defenseMod: 0.4, element: 'fire', resistances: { fire: 0.0, ice: 2.0 } },
  { name: '炎の鬼', hpMod: 1.4, attackType: 'melee', attackMod: 1.3, defenseMod: 1.0, element: 'fire', resistances: { fire: 0.2, ice: 1.8 } },
  { name: '火山魔人', hpMod: 1.3, attackType: 'mixed', attackMod: 1.2, defenseMod: 1.0, element: 'fire', resistances: { fire: 0.2, ice: 1.8 } },
  { name: '溶岩の主', hpMod: 1.6, attackType: 'melee', attackMod: 1.2, defenseMod: 1.2, element: 'fire', resistances: { fire: 0.1, ice: 2.0 } },
  { name: '炎帝の使い', hpMod: 1.2, attackType: 'magical', attackMod: 1.4, defenseMod: 0.8, element: 'fire', resistances: { fire: 0.1, ice: 2.0 } },
  { name: '火山の番兵', hpMod: 1.4, attackType: 'melee', attackMod: 1.1, defenseMod: 1.1, element: 'fire', resistances: { fire: 0.2, ice: 1.8 } },
  { name: '溶岩の魔導師', hpMod: 0.9, attackType: 'magical', attackMod: 1.5, defenseMod: 0.6, element: 'fire', resistances: { fire: 0.1, ice: 2.0 } },
  { name: '炎の守護者', hpMod: 1.5, attackType: 'mixed', attackMod: 1.3, defenseMod: 1.1, element: 'fire', resistances: { fire: 0.1, ice: 2.0 } },
];

const EXPEDITION_4_ELITES: EnemyTemplate[] = [
  { name: '炎の将軍', hpMod: 1.4, attackType: 'melee', attackMod: 1.5, defenseMod: 1.2, element: 'fire', resistances: { fire: 0.1, ice: 2.0 } },
  { name: '溶岩の王', hpMod: 1.7, attackType: 'melee', attackMod: 1.3, defenseMod: 1.4, element: 'fire', resistances: { fire: 0.0, ice: 2.0 } },
  { name: '炎の大魔導師', hpMod: 1.0, attackType: 'magical', attackMod: 1.7, defenseMod: 0.9, element: 'fire', resistances: { fire: 0.0, ice: 2.0 } },
  { name: '火山竜王', hpMod: 1.6, attackType: 'mixed', attackMod: 1.4, defenseMod: 1.2, element: 'fire', resistances: { fire: 0.1, ice: 2.0 } },
  { name: '炎帝の親衛隊', hpMod: 1.5, attackType: 'mixed', attackMod: 1.4, defenseMod: 1.3, element: 'fire', resistances: { fire: 0.1, ice: 2.0 } },
];

const EXPEDITION_4_BOSS: EnemyTemplate = {
  name: '炎帝イフリート',
  hpMod: 1.4,
  attackType: 'magical',
  attackMod: 1.5,
  defenseMod: 1.2,
  element: 'fire',
  resistances: { fire: 0.0, ice: 2.0 },
};

// Expedition 5: 氷結の峡谷 (Frozen Canyon) - Ice creatures
const EXPEDITION_5_NORMALS: EnemyTemplate[] = [
  { name: '氷の精霊', hpMod: 0.8, attackType: 'magical', attackMod: 1.4, defenseMod: 0.5, element: 'ice', resistances: { ice: 0.0, fire: 2.0 } },
  { name: '氷結ゴーレム', hpMod: 1.5, attackType: 'melee', attackMod: 1.1, defenseMod: 1.2, element: 'ice', resistances: { ice: 0.1, fire: 2.0 } },
  { name: 'フロストサラマンダー', hpMod: 1.1, attackType: 'mixed', attackMod: 1.1, defenseMod: 0.8, element: 'ice', resistances: { ice: 0.2, fire: 1.8 } },
  { name: '氷の狼', hpMod: 0.9, attackType: 'melee', attackMod: 1.3, defenseMod: 0.5, element: 'ice', resistances: { ice: 0.3, fire: 1.7 } },
  { name: '氷結騎士', hpMod: 1.3, attackType: 'melee', attackMod: 1.2, defenseMod: 1.1, element: 'ice', resistances: { ice: 0.2, fire: 1.8 } },
  { name: 'フロストワーム', hpMod: 1.2, attackType: 'melee', attackMod: 1.0, defenseMod: 0.9, element: 'ice', resistances: { ice: 0.2, fire: 1.8 } },
  { name: '氷の巨人', hpMod: 1.6, attackType: 'melee', attackMod: 1.2, defenseMod: 1.3, element: 'ice', resistances: { ice: 0.1, fire: 2.0 } },
  { name: 'アイスバード', hpMod: 0.7, attackType: 'ranged', attackMod: 1.2, defenseMod: 0.4, element: 'ice', resistances: { ice: 0.1, fire: 2.0 } },
  { name: '氷の魔術師', hpMod: 0.8, attackType: 'magical', attackMod: 1.5, defenseMod: 0.5, element: 'ice', resistances: { ice: 0.1, fire: 2.0 } },
  { name: 'フロストベア', hpMod: 1.4, attackType: 'melee', attackMod: 1.3, defenseMod: 1.0, element: 'ice', resistances: { ice: 0.2, fire: 1.8 } },
  { name: '氷結蜘蛛', hpMod: 0.9, attackType: 'ranged', attackMod: 1.1, defenseMod: 0.6, element: 'ice', resistances: { ice: 0.3, fire: 1.7 } },
  { name: 'アイスドレイク', hpMod: 1.3, attackType: 'mixed', attackMod: 1.2, defenseMod: 0.9, element: 'ice', resistances: { ice: 0.2, fire: 1.8 } },
  { name: '氷の亡霊', hpMod: 0.8, attackType: 'magical', attackMod: 1.3, defenseMod: 0.5, element: 'ice', resistances: { ice: 0.2, fire: 1.8 } },
  { name: 'フロストオーガ', hpMod: 1.5, attackType: 'melee', attackMod: 1.3, defenseMod: 1.1, element: 'ice', resistances: { ice: 0.2, fire: 1.8 } },
  { name: '氷の番人', hpMod: 1.4, attackType: 'melee', attackMod: 1.1, defenseMod: 1.2, element: 'ice', resistances: { ice: 0.2, fire: 1.8 } },
  { name: 'アイススネーク', hpMod: 0.9, attackType: 'melee', attackMod: 1.1, defenseMod: 0.6, element: 'ice', resistances: { ice: 0.3, fire: 1.7 } },
  { name: '氷結の使徒', hpMod: 1.0, attackType: 'magical', attackMod: 1.4, defenseMod: 0.7, element: 'ice', resistances: { ice: 0.1, fire: 2.0 } },
  { name: 'フロストトロール', hpMod: 1.5, attackType: 'melee', attackMod: 1.2, defenseMod: 1.1, element: 'ice', resistances: { ice: 0.2, fire: 1.8 } },
  { name: '氷の射手', hpMod: 0.8, attackType: 'ranged', attackMod: 1.3, defenseMod: 0.5, element: 'ice', resistances: { ice: 0.3, fire: 1.7 } },
  { name: 'アイスエレメンタル', hpMod: 0.9, attackType: 'magical', attackMod: 1.5, defenseMod: 0.6, element: 'ice', resistances: { ice: 0.0, fire: 2.0 } },
  { name: '氷結の戦士', hpMod: 1.2, attackType: 'melee', attackMod: 1.2, defenseMod: 1.0, element: 'ice', resistances: { ice: 0.2, fire: 1.8 } },
  { name: 'フロストワイバーン', hpMod: 1.3, attackType: 'mixed', attackMod: 1.3, defenseMod: 0.9, element: 'ice', resistances: { ice: 0.2, fire: 1.8 } },
  { name: '氷の魔人', hpMod: 1.2, attackType: 'magical', attackMod: 1.4, defenseMod: 0.8, element: 'ice', resistances: { ice: 0.1, fire: 2.0 } },
  { name: 'アイスゴブリン', hpMod: 0.9, attackType: 'melee', attackMod: 1.0, defenseMod: 0.7, element: 'ice', resistances: { ice: 0.3, fire: 1.7 } },
  { name: '氷結の守護者', hpMod: 1.5, attackType: 'mixed', attackMod: 1.2, defenseMod: 1.2, element: 'ice', resistances: { ice: 0.1, fire: 2.0 } },
  { name: 'フロストスピリット', hpMod: 0.7, attackType: 'magical', attackMod: 1.5, defenseMod: 0.4, element: 'ice', resistances: { ice: 0.0, fire: 2.0 } },
  { name: '氷の鬼', hpMod: 1.4, attackType: 'melee', attackMod: 1.3, defenseMod: 1.0, element: 'ice', resistances: { ice: 0.2, fire: 1.8 } },
  { name: 'アイスナイト', hpMod: 1.3, attackType: 'melee', attackMod: 1.2, defenseMod: 1.1, element: 'ice', resistances: { ice: 0.2, fire: 1.8 } },
  { name: '氷結の魔導師', hpMod: 0.9, attackType: 'magical', attackMod: 1.6, defenseMod: 0.6, element: 'ice', resistances: { ice: 0.1, fire: 2.0 } },
  { name: 'フロストガーディアン', hpMod: 1.6, attackType: 'melee', attackMod: 1.2, defenseMod: 1.3, element: 'ice', resistances: { ice: 0.1, fire: 2.0 } },
];

const EXPEDITION_5_ELITES: EnemyTemplate[] = [
  { name: '氷の将軍', hpMod: 1.4, attackType: 'melee', attackMod: 1.5, defenseMod: 1.2, element: 'ice', resistances: { ice: 0.1, fire: 2.0 } },
  { name: 'フロストキング', hpMod: 1.6, attackType: 'melee', attackMod: 1.3, defenseMod: 1.4, element: 'ice', resistances: { ice: 0.0, fire: 2.0 } },
  { name: '氷の大魔導師', hpMod: 1.0, attackType: 'magical', attackMod: 1.7, defenseMod: 0.9, element: 'ice', resistances: { ice: 0.0, fire: 2.0 } },
  { name: 'アイスドラゴン', hpMod: 1.6, attackType: 'mixed', attackMod: 1.4, defenseMod: 1.2, element: 'ice', resistances: { ice: 0.1, fire: 2.0 } },
  { name: '氷帝の親衛隊', hpMod: 1.5, attackType: 'mixed', attackMod: 1.4, defenseMod: 1.3, element: 'ice', resistances: { ice: 0.1, fire: 2.0 } },
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

// Expedition 6: 雷鳴の塔 (Tower of Thunder) - Thunder creatures
const EXPEDITION_6_NORMALS: EnemyTemplate[] = [
  { name: 'サンダーバード', hpMod: 0.9, attackType: 'ranged', attackMod: 1.3, defenseMod: 0.5, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: '雷のゴーレム', hpMod: 1.5, attackType: 'melee', attackMod: 1.1, defenseMod: 1.2, element: 'thunder', resistances: { thunder: 0.0 } },
  { name: '嵐の精霊', hpMod: 0.7, attackType: 'magical', attackMod: 1.5, defenseMod: 0.4, element: 'thunder', resistances: { thunder: 0.0 } },
  { name: '電撃蛇', hpMod: 1.0, attackType: 'mixed', attackMod: 1.2, defenseMod: 0.7, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '雷鳴の騎士', hpMod: 1.3, attackType: 'mixed', attackMod: 1.3, defenseMod: 1.1, element: 'thunder', resistances: { thunder: 0.3 } },
  { name: 'ライトニングウルフ', hpMod: 0.9, attackType: 'melee', attackMod: 1.4, defenseMod: 0.5, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '雷の巨人', hpMod: 1.6, attackType: 'melee', attackMod: 1.2, defenseMod: 1.3, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: 'サンダースピリット', hpMod: 0.6, attackType: 'magical', attackMod: 1.6, defenseMod: 0.3, element: 'thunder', resistances: { thunder: 0.0 } },
  { name: '電撃蟲', hpMod: 0.7, attackType: 'ranged', attackMod: 1.1, defenseMod: 0.4, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '雷の魔術師', hpMod: 0.8, attackType: 'magical', attackMod: 1.5, defenseMod: 0.5, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: 'ライトニングドラゴン', hpMod: 1.4, attackType: 'mixed', attackMod: 1.3, defenseMod: 1.0, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: '雷の番人', hpMod: 1.4, attackType: 'melee', attackMod: 1.1, defenseMod: 1.2, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: 'サンダーエレメンタル', hpMod: 0.8, attackType: 'magical', attackMod: 1.5, defenseMod: 0.5, element: 'thunder', resistances: { thunder: 0.0 } },
  { name: '電撃の使徒', hpMod: 1.0, attackType: 'magical', attackMod: 1.4, defenseMod: 0.7, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: '雷の戦士', hpMod: 1.2, attackType: 'melee', attackMod: 1.2, defenseMod: 1.0, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: 'ライトニングゴブリン', hpMod: 0.9, attackType: 'melee', attackMod: 1.1, defenseMod: 0.7, element: 'thunder', resistances: { thunder: 0.3 } },
  { name: '雷の射手', hpMod: 0.8, attackType: 'ranged', attackMod: 1.3, defenseMod: 0.5, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: 'サンダートロール', hpMod: 1.5, attackType: 'melee', attackMod: 1.2, defenseMod: 1.1, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '電撃の鬼', hpMod: 1.3, attackType: 'melee', attackMod: 1.3, defenseMod: 0.9, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '雷の亡霊', hpMod: 0.8, attackType: 'magical', attackMod: 1.3, defenseMod: 0.5, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: 'ライトニングスネーク', hpMod: 0.9, attackType: 'melee', attackMod: 1.2, defenseMod: 0.6, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '雷の魔人', hpMod: 1.2, attackType: 'magical', attackMod: 1.4, defenseMod: 0.8, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: 'サンダーナイト', hpMod: 1.3, attackType: 'melee', attackMod: 1.2, defenseMod: 1.1, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '電撃の守護者', hpMod: 1.5, attackType: 'mixed', attackMod: 1.2, defenseMod: 1.2, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: '雷鳴の使者', hpMod: 1.1, attackType: 'magical', attackMod: 1.4, defenseMod: 0.8, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: 'ライトニングベア', hpMod: 1.4, attackType: 'melee', attackMod: 1.3, defenseMod: 1.0, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '雷の精', hpMod: 0.7, attackType: 'magical', attackMod: 1.5, defenseMod: 0.4, element: 'thunder', resistances: { thunder: 0.0 } },
  { name: 'サンダーワイバーン', hpMod: 1.3, attackType: 'mixed', attackMod: 1.3, defenseMod: 0.9, element: 'thunder', resistances: { thunder: 0.2 } },
  { name: '電撃の魔導師', hpMod: 0.9, attackType: 'magical', attackMod: 1.6, defenseMod: 0.6, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: '雷のガーディアン', hpMod: 1.6, attackType: 'melee', attackMod: 1.2, defenseMod: 1.3, element: 'thunder', resistances: { thunder: 0.1 } },
];

const EXPEDITION_6_ELITES: EnemyTemplate[] = [
  { name: '雷の将軍', hpMod: 1.4, attackType: 'melee', attackMod: 1.5, defenseMod: 1.2, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: 'サンダーキング', hpMod: 1.6, attackType: 'melee', attackMod: 1.3, defenseMod: 1.4, element: 'thunder', resistances: { thunder: 0.0 } },
  { name: '雷の大魔導師', hpMod: 1.0, attackType: 'magical', attackMod: 1.7, defenseMod: 0.9, element: 'thunder', resistances: { thunder: 0.0 } },
  { name: 'ライトニングドラゴン王', hpMod: 1.6, attackType: 'mixed', attackMod: 1.4, defenseMod: 1.2, element: 'thunder', resistances: { thunder: 0.1 } },
  { name: '雷神の親衛隊', hpMod: 1.5, attackType: 'mixed', attackMod: 1.4, defenseMod: 1.3, element: 'thunder', resistances: { thunder: 0.1 } },
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

// Expedition 7: 冥界の門 (Gate of the Underworld) - Undead/Demonic
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

// Expedition 8: 天空の神殿 (Celestial Temple) - Divine beings
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

// All expedition data
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

// Helper to create attack stats based on type
function createAttackStats(
  type: 'melee' | 'ranged' | 'magical' | 'mixed',
  baseAttack: number,
  tier: number
): {
  rangedAttack: number;
  rangedNoA: number;
  magicalAttack: number;
  magicalNoA: number;
  meleeAttack: number;
  meleeNoA: number;
} {
  const tierNoA = Math.min(1 + Math.floor(tier / 2), 4);

  switch (type) {
    case 'melee':
      return {
        rangedAttack: 0, rangedNoA: 0,
        magicalAttack: 0, magicalNoA: 0,
        meleeAttack: baseAttack, meleeNoA: tierNoA,
      };
    case 'ranged':
      return {
        rangedAttack: baseAttack, rangedNoA: tierNoA,
        magicalAttack: 0, magicalNoA: 0,
        meleeAttack: Math.floor(baseAttack * 0.5), meleeNoA: 1,
      };
    case 'magical':
      return {
        rangedAttack: 0, rangedNoA: 0,
        magicalAttack: baseAttack, magicalNoA: tierNoA,
        meleeAttack: Math.floor(baseAttack * 0.3), meleeNoA: 1,
      };
    case 'mixed':
      return {
        rangedAttack: Math.floor(baseAttack * 0.6), rangedNoA: Math.max(1, tierNoA - 1),
        magicalAttack: Math.floor(baseAttack * 0.7), magicalNoA: Math.max(1, tierNoA - 1),
        meleeAttack: baseAttack, meleeNoA: tierNoA,
      };
  }
}

// Generate enemy from template
function createEnemyFromTemplate(
  id: number,
  template: EnemyTemplate,
  tier: number,
  type: EnemyType,
  poolId: number
): EnemyDef {
  const tierMult = TIER_STAT_MULTIPLIERS[tier - 1];

  // Get base stats for type
  let baseHP: number;
  let baseAttack: number;
  let baseDefense: number;
  let expBase: number;

  switch (type) {
    case 'normal':
      baseHP = TIER_BASE_STATS.normalHP;
      baseAttack = TIER_BASE_STATS.normalAttack;
      baseDefense = TIER_BASE_STATS.normalDefense;
      expBase = TIER_EXP_BASE[tier - 1];
      break;
    case 'elite':
      baseHP = TIER_BASE_STATS.eliteHP;
      baseAttack = TIER_BASE_STATS.eliteAttack;
      baseDefense = TIER_BASE_STATS.eliteDefense;
      expBase = TIER_EXP_BASE[tier - 1] * ELITE_EXP_MULTIPLIER;
      break;
    case 'boss':
      baseHP = TIER_BASE_STATS.bossHP;
      baseAttack = TIER_BASE_STATS.bossAttack;
      baseDefense = TIER_BASE_STATS.bossDefense;
      expBase = TIER_EXP_BASE[tier - 1] * BOSS_EXP_MULTIPLIER;
      break;
  }

  // Apply tier multiplier and template modifiers
  const hp = Math.floor(baseHP * tierMult * template.hpMod);
  const attack = Math.floor(baseAttack * tierMult * template.attackMod);
  const defense = Math.floor(baseDefense * tierMult * template.defenseMod);

  const attackStats = createAttackStats(template.attackType, attack, tier);

  // Calculate drop item ID (tier-based common items)
  // Drop items from this tier's common pool
  const dropItemId = tier * 1000 + 100 + (id % 12) + 1;

  return {
    id,
    type,
    poolId,
    name: template.name,
    hp,
    ...attackStats,
    rangedAttackAmplifier: 1.0,
    magicalAttackAmplifier: type === 'boss' ? 1.3 : 1.0,
    meleeAttackAmplifier: type === 'boss' ? 1.2 : 1.0,
    physicalDefense: defense,
    magicalDefense: Math.floor(defense * 0.8),
    elementalOffense: template.element || 'none',
    elementalResistance: {
      fire: template.resistances?.fire ?? 1.0,
      thunder: template.resistances?.thunder ?? 1.0,
      ice: template.resistances?.ice ?? 1.0,
    },
    experience: Math.floor(expBase * template.hpMod),
    dropItemId,
  };
}

// Generate all enemies
function generateEnemies(): EnemyDef[] {
  const enemies: EnemyDef[] = [];

  for (let tier = 1; tier <= 8; tier++) {
    const data = EXPEDITION_DATA[tier - 1];
    const poolId = tier;

    // Normal enemies (30 per tier)
    // ID format: tier * 1000 + index (1-30)
    for (let i = 0; i < 30; i++) {
      const template = data.normals[i];
      const id = tier * 1000 + i + 1;
      enemies.push(createEnemyFromTemplate(id, template, tier, 'normal', poolId));
    }

    // Elite enemies (5 per tier)
    // ID format: tier * 1000 + 50 + index (51-55)
    for (let i = 0; i < 5; i++) {
      const template = data.elites[i];
      const id = tier * 1000 + 50 + i + 1;
      enemies.push(createEnemyFromTemplate(id, template, tier, 'elite', poolId));
    }

    // Boss enemy (1 per tier)
    // ID format: tier * 100 + 1 (101, 201, etc. - matching dungeon bossId)
    const bossId = tier * 100 + 1;
    enemies.push(createEnemyFromTemplate(bossId, data.boss, tier, 'boss', 0));
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
