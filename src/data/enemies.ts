import { EnemyDef } from '../types';

// Enemy balance design:
// - 2x tier-N armor/robe = full protection from stage N enemies
// - Boss defense requires same-tier weapons to deal significant damage
// - Stage 1 is easier for farming starter items

// Tier defense targets (2x armor):
// Tier 1: 16, Tier 2: 32, Tier 3: 52, Tier 4: 76, Tier 5: 104

// Weapon attack values:
// Sword: 8/15/22/30/40, Wand: 8/15/24/35/50

export const ENEMIES: EnemyDef[] = [
  // ==========================================
  // Dungeon 1 - 草原の遺跡 (Grassland Ruins) - Pool 1
  // Easy stage for farming tier 1 items
  // Enemy attack ~10-14 (beatable with 1-2 tier 1 armor)
  // ==========================================
  {
    id: 1, type: 'normal', poolId: 1,
    name: 'ゴブリン',
    hp: 60,
    rangedAttack: 0, rangedNoA: 0,
    magicalAttack: 0, magicalNoA: 0,
    meleeAttack: 10, meleeNoA: 1,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 2, magicalDefense: 1,
    elementalOffense: 'none',
    elementalResistance: { fire: 1.0, thunder: 1.0, ice: 1.0 },
    experience: 10, dropItemId: 1,  // ショートソード
  },
  {
    id: 2, type: 'normal', poolId: 1,
    name: 'スライム',
    hp: 40,
    rangedAttack: 0, rangedNoA: 0,
    magicalAttack: 8, magicalNoA: 1,
    meleeAttack: 6, meleeNoA: 1,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 3, magicalDefense: 0,
    elementalOffense: 'none',
    elementalResistance: { fire: 1.5, thunder: 1.0, ice: 0.5 },
    experience: 8, dropItemId: 60,  // 見習いのローブ
  },
  {
    id: 3, type: 'normal', poolId: 1,
    name: '野犬',
    hp: 50,
    rangedAttack: 0, rangedNoA: 0,
    magicalAttack: 0, magicalNoA: 0,
    meleeAttack: 12, meleeNoA: 2,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 1, magicalDefense: 1,
    elementalOffense: 'none',
    elementalResistance: { fire: 1.0, thunder: 1.0, ice: 1.0 },
    experience: 12, dropItemId: 40,  // 革の籠手
  },
  {
    id: 4, type: 'normal', poolId: 1,
    name: '大蛇',
    hp: 55,
    rangedAttack: 8, rangedNoA: 1,
    magicalAttack: 0, magicalNoA: 0,
    meleeAttack: 10, meleeNoA: 1,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 2, magicalDefense: 2,
    elementalOffense: 'none',
    elementalResistance: { fire: 1.0, thunder: 1.0, ice: 1.5 },
    experience: 14, dropItemId: 80,  // 木盾
  },
  {
    id: 5, type: 'normal', poolId: 1,
    name: 'コボルト',
    hp: 70,
    rangedAttack: 6, rangedNoA: 1,
    magicalAttack: 0, magicalNoA: 0,
    meleeAttack: 14, meleeNoA: 1,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 3, magicalDefense: 2,
    elementalOffense: 'none',
    elementalResistance: { fire: 1.0, thunder: 1.0, ice: 1.0 },
    experience: 16, dropItemId: 30,  // レザーアーマー
  },
  {
    id: 6, type: 'boss', poolId: 0,
    name: 'ゴブリンキング',
    hp: 200,
    rangedAttack: 12, rangedNoA: 2,
    magicalAttack: 0, magicalNoA: 0,
    meleeAttack: 18, meleeNoA: 2,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.2,
    physicalDefense: 7, magicalDefense: 7,  // Tier 1 weapons needed (sword 8, wand 8)
    elementalOffense: 'none',
    elementalResistance: { fire: 1.0, thunder: 1.0, ice: 1.0 },
    experience: 50, dropItemId: 2,  // ロングソード
  },

  // ==========================================
  // Dungeon 2 - 古代の洞窟 (Ancient Cave) - Pool 2
  // Enemy attack ~28-32 (need 2x tier 2 armor = 32 defense)
  // ==========================================
  {
    id: 10, type: 'normal', poolId: 2,
    name: 'オーク',
    hp: 120,
    rangedAttack: 0, rangedNoA: 0,
    magicalAttack: 0, magicalNoA: 0,
    meleeAttack: 28, meleeNoA: 1,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 10, magicalDefense: 4,
    elementalOffense: 'none',
    elementalResistance: { fire: 1.0, thunder: 1.0, ice: 1.0 },
    experience: 25, dropItemId: 31,  // チェインメイル
  },
  {
    id: 11, type: 'normal', poolId: 2,
    name: 'コウモリの群れ',
    hp: 80,
    rangedAttack: 15, rangedNoA: 2,
    magicalAttack: 0, magicalNoA: 0,
    meleeAttack: 10, meleeNoA: 3,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 5, magicalDefense: 6,
    elementalOffense: 'none',
    elementalResistance: { fire: 1.5, thunder: 1.0, ice: 1.0 },
    experience: 22, dropItemId: 81,  // 鉄盾
  },
  {
    id: 12, type: 'normal', poolId: 2,
    name: '洞窟トロール',
    hp: 150,
    rangedAttack: 0, rangedNoA: 0,
    magicalAttack: 0, magicalNoA: 0,
    meleeAttack: 32, meleeNoA: 1,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 14, magicalDefense: 5,
    elementalOffense: 'none',
    elementalResistance: { fire: 1.5, thunder: 1.0, ice: 1.0 },
    experience: 30, dropItemId: 41,  // 鋼の籠手
  },
  {
    id: 13, type: 'normal', poolId: 2,
    name: '岩石魔人',
    hp: 180,
    rangedAttack: 0, rangedNoA: 0,
    magicalAttack: 25, magicalNoA: 1,
    meleeAttack: 28, meleeNoA: 1,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 18, magicalDefense: 8,
    elementalOffense: 'none',
    elementalResistance: { fire: 0.5, thunder: 1.0, ice: 1.0 },
    experience: 35, dropItemId: 61,  // 魔法使いのローブ
  },
  {
    id: 14, type: 'normal', poolId: 2,
    name: 'ダークエルフ',
    hp: 100,
    rangedAttack: 20, rangedNoA: 2,
    magicalAttack: 26, magicalNoA: 1,
    meleeAttack: 15, meleeNoA: 1,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 8, magicalDefense: 12,
    elementalOffense: 'none',
    elementalResistance: { fire: 1.0, thunder: 1.0, ice: 0.7 },
    experience: 32, dropItemId: 21,  // ロングボウ
  },
  {
    id: 15, type: 'boss', poolId: 0,
    name: '洞窟の主ドラゴン',
    hp: 400,
    rangedAttack: 0, rangedNoA: 0,
    magicalAttack: 40, magicalNoA: 2,
    meleeAttack: 45, meleeNoA: 2,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.2, meleeAttackAmplifier: 1.0,
    physicalDefense: 14, magicalDefense: 14,  // Tier 2 weapons needed (sword 15, wand 15)
    elementalOffense: 'fire',
    elementalResistance: { fire: 0.3, thunder: 1.0, ice: 1.5 },
    experience: 120, dropItemId: 11,  // 太刀
  },

  // ==========================================
  // Dungeon 3 - 呪われた森 (Cursed Forest) - Pool 3
  // Enemy attack ~48-52 (need 2x tier 3 armor = 52 defense)
  // ==========================================
  {
    id: 20, type: 'normal', poolId: 3,
    name: 'トレント',
    hp: 200,
    rangedAttack: 0, rangedNoA: 0,
    magicalAttack: 0, magicalNoA: 0,
    meleeAttack: 48, meleeNoA: 1,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 18, magicalDefense: 10,
    elementalOffense: 'none',
    elementalResistance: { fire: 2.0, thunder: 1.0, ice: 0.7 },
    experience: 45, dropItemId: 32,  // スケイルメイル
  },
  {
    id: 21, type: 'normal', poolId: 3,
    name: '森の精霊',
    hp: 120,
    rangedAttack: 25, rangedNoA: 2,
    magicalAttack: 45, magicalNoA: 2,
    meleeAttack: 0, meleeNoA: 0,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 8, magicalDefense: 22,
    elementalOffense: 'none',
    elementalResistance: { fire: 1.5, thunder: 1.0, ice: 0.5 },
    experience: 50, dropItemId: 51,  // 魔法のワンド
  },
  {
    id: 22, type: 'normal', poolId: 3,
    name: 'ワーウルフ',
    hp: 160,
    rangedAttack: 0, rangedNoA: 0,
    magicalAttack: 0, magicalNoA: 0,
    meleeAttack: 35, meleeNoA: 3,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 15, magicalDefense: 12,
    elementalOffense: 'none',
    elementalResistance: { fire: 1.2, thunder: 1.0, ice: 1.0 },
    experience: 55, dropItemId: 42,  // 戦士の籠手
  },
  {
    id: 23, type: 'normal', poolId: 3,
    name: '毒蜘蛛',
    hp: 100,
    rangedAttack: 30, rangedNoA: 3,
    magicalAttack: 0, magicalNoA: 0,
    meleeAttack: 25, meleeNoA: 2,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 10, magicalDefense: 8,
    elementalOffense: 'none',
    elementalResistance: { fire: 1.5, thunder: 1.0, ice: 1.0 },
    experience: 52, dropItemId: 82,  // 騎士盾
  },
  {
    id: 24, type: 'normal', poolId: 3,
    name: '呪われた騎士',
    hp: 180,
    rangedAttack: 0, rangedNoA: 0,
    magicalAttack: 30, magicalNoA: 1,
    meleeAttack: 50, meleeNoA: 2,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 22, magicalDefense: 18,
    elementalOffense: 'none',
    elementalResistance: { fire: 1.0, thunder: 1.0, ice: 1.0 },
    experience: 58, dropItemId: 3,  // ブロードソード
  },
  {
    id: 25, type: 'boss', poolId: 0,
    name: '森の女王',
    hp: 600,
    rangedAttack: 35, rangedNoA: 3,
    magicalAttack: 60, magicalNoA: 3,
    meleeAttack: 50, meleeNoA: 2,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.3, meleeAttackAmplifier: 1.0,
    physicalDefense: 21, magicalDefense: 23,  // Tier 3 weapons needed (sword 22, wand 24)
    elementalOffense: 'ice',
    elementalResistance: { fire: 1.5, thunder: 1.0, ice: 0.3 },
    experience: 200, dropItemId: 52,  // ルーンワンド
  },

  // ==========================================
  // Dungeon 4 - 炎の火山 (Volcano of Fire) - Pool 4
  // Enemy attack ~70-76 (need 2x tier 4 armor = 76 defense)
  // ==========================================
  {
    id: 30, type: 'normal', poolId: 4,
    name: 'ファイアサラマンダー',
    hp: 200,
    rangedAttack: 35, rangedNoA: 2,
    magicalAttack: 0, magicalNoA: 0,
    meleeAttack: 40, meleeNoA: 2,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 20, magicalDefense: 22,
    elementalOffense: 'fire',
    elementalResistance: { fire: 0.2, thunder: 1.0, ice: 2.0 },
    experience: 70, dropItemId: 122,  // 炎の矢
  },
  {
    id: 31, type: 'normal', poolId: 4,
    name: '溶岩ゴーレム',
    hp: 300,
    rangedAttack: 0, rangedNoA: 0,
    magicalAttack: 50, magicalNoA: 1,
    meleeAttack: 70, meleeNoA: 1,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 28, magicalDefense: 18,
    elementalOffense: 'fire',
    elementalResistance: { fire: 0.1, thunder: 1.0, ice: 2.0 },
    experience: 80, dropItemId: 33,  // プレートメイル
  },
  {
    id: 32, type: 'normal', poolId: 4,
    name: '炎の精霊',
    hp: 150,
    rangedAttack: 0, rangedNoA: 0,
    magicalAttack: 65, magicalNoA: 3,
    meleeAttack: 0, meleeNoA: 0,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.2, meleeAttackAmplifier: 1.0,
    physicalDefense: 10, magicalDefense: 30,
    elementalOffense: 'fire',
    elementalResistance: { fire: 0.0, thunder: 1.0, ice: 2.0 },
    experience: 85, dropItemId: 53,  // 賢者の杖
  },
  {
    id: 33, type: 'normal', poolId: 4,
    name: '火山蟻',
    hp: 140,
    rangedAttack: 30, rangedNoA: 4,
    magicalAttack: 0, magicalNoA: 0,
    meleeAttack: 35, meleeNoA: 4,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 16, magicalDefense: 12,
    elementalOffense: 'fire',
    elementalResistance: { fire: 0.3, thunder: 1.0, ice: 1.5 },
    experience: 75, dropItemId: 43,  // 英雄の籠手
  },
  {
    id: 34, type: 'normal', poolId: 4,
    name: '炎の騎士',
    hp: 250,
    rangedAttack: 0, rangedNoA: 0,
    magicalAttack: 45, magicalNoA: 2,
    meleeAttack: 75, meleeNoA: 2,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 25, magicalDefense: 22,
    elementalOffense: 'fire',
    elementalResistance: { fire: 0.2, thunder: 1.0, ice: 1.8 },
    experience: 90, dropItemId: 4,  // バスタードソード
  },
  {
    id: 35, type: 'boss', poolId: 0,
    name: '炎帝イフリート',
    hp: 800,
    rangedAttack: 50, rangedNoA: 3,
    magicalAttack: 85, magicalNoA: 4,
    meleeAttack: 80, meleeNoA: 3,
    rangedAttackAmplifier: 1.2, magicalAttackAmplifier: 1.4, meleeAttackAmplifier: 1.2,
    physicalDefense: 29, magicalDefense: 34,  // Tier 4 weapons needed (sword 30, wand 35)
    elementalOffense: 'fire',
    elementalResistance: { fire: 0.0, thunder: 1.0, ice: 2.0 },
    experience: 350, dropItemId: 13,  // 大太刀
  },

  // ==========================================
  // Dungeon 5 - 雷鳴の塔 (Tower of Thunder) - Pool 5
  // Enemy attack ~95-104 (need 2x tier 5 armor = 104 defense)
  // ==========================================
  {
    id: 40, type: 'normal', poolId: 5,
    name: 'サンダーバード',
    hp: 220,
    rangedAttack: 55, rangedNoA: 3,
    magicalAttack: 60, magicalNoA: 2,
    meleeAttack: 0, meleeNoA: 0,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 18, magicalDefense: 30,
    elementalOffense: 'thunder',
    elementalResistance: { fire: 1.0, thunder: 0.1, ice: 1.0 },
    experience: 100, dropItemId: 84,  // 聖盾
  },
  {
    id: 41, type: 'normal', poolId: 5,
    name: '雷のゴーレム',
    hp: 350,
    rangedAttack: 0, rangedNoA: 0,
    magicalAttack: 75, magicalNoA: 2,
    meleeAttack: 95, meleeNoA: 1,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 35, magicalDefense: 28,
    elementalOffense: 'thunder',
    elementalResistance: { fire: 1.0, thunder: 0.0, ice: 1.0 },
    experience: 110, dropItemId: 34,  // 騎士の鎧
  },
  {
    id: 42, type: 'normal', poolId: 5,
    name: '嵐の精霊',
    hp: 180,
    rangedAttack: 45, rangedNoA: 2,
    magicalAttack: 90, magicalNoA: 3,
    meleeAttack: 0, meleeNoA: 0,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.3, meleeAttackAmplifier: 1.0,
    physicalDefense: 12, magicalDefense: 38,
    elementalOffense: 'thunder',
    elementalResistance: { fire: 1.0, thunder: 0.0, ice: 1.0 },
    experience: 115, dropItemId: 63,  // 大魔導師のローブ
  },
  {
    id: 43, type: 'normal', poolId: 5,
    name: '電撃蛇',
    hp: 180,
    rangedAttack: 50, rangedNoA: 4,
    magicalAttack: 0, magicalNoA: 0,
    meleeAttack: 60, meleeNoA: 3,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 22, magicalDefense: 20,
    elementalOffense: 'thunder',
    elementalResistance: { fire: 1.0, thunder: 0.2, ice: 1.0 },
    experience: 105, dropItemId: 44,  // 伝説の籠手
  },
  {
    id: 44, type: 'normal', poolId: 5,
    name: '雷鳴の騎士',
    hp: 300,
    rangedAttack: 40, rangedNoA: 2,
    magicalAttack: 65, magicalNoA: 2,
    meleeAttack: 100, meleeNoA: 2,
    rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0,
    physicalDefense: 32, magicalDefense: 28,
    elementalOffense: 'thunder',
    elementalResistance: { fire: 1.0, thunder: 0.3, ice: 1.0 },
    experience: 120, dropItemId: 5,  // クレイモア
  },
  {
    id: 45, type: 'boss', poolId: 0,
    name: '雷神ラミエル',
    hp: 1200,
    rangedAttack: 120, rangedNoA: 10,
    magicalAttack: 200, magicalNoA: 7,
    meleeAttack: 280, meleeNoA: 16,
    rangedAttackAmplifier: 1.3, magicalAttackAmplifier: 1.5, meleeAttackAmplifier: 1.2,
    physicalDefense: 39, magicalDefense: 49,  // Tier 5 weapons needed (sword 40, wand 50)
    elementalOffense: 'thunder',
    elementalResistance: { fire: 1.0, thunder: 0.0, ice: 1.0 },
    experience: 500, dropItemId: 14,  // 妖刀
  },
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
