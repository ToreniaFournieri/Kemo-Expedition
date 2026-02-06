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
    rangedAttack: 70, rangedNoA: 4,
    magicalAttack: 110, magicalNoA: 5,
    meleeAttack: 105, meleeNoA: 3,
    rangedAttackAmplifier: 1.3, magicalAttackAmplifier: 1.5, meleeAttackAmplifier: 1.2,
    physicalDefense: 39, magicalDefense: 49,  // Tier 5 weapons needed (sword 40, wand 50)
    elementalOffense: 'thunder',
    elementalResistance: { fire: 1.0, thunder: 0.0, ice: 1.0 },
    experience: 500, dropItemId: 14,  // 妖刀
  },
];

export const getEnemyById = (id: number): EnemyDef | undefined =>
  ENEMIES.find(e => e.id === id);

export const getEnemiesByPool = (poolId: number): EnemyDef[] =>
  ENEMIES.filter(e => e.poolId === poolId);

export const getBossEnemy = (id: number): EnemyDef | undefined =>
  ENEMIES.find(e => e.id === id && e.type === 'boss');
