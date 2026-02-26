import { AbilityId, EnemyClassId, ItemCategory } from '../types';

export type GodMythicDrop = {
  dropBy: string;
  tier: number;
  category: ItemCategory;
  name: string;
};

export type GodEnemyProfile = {
  tier: number;
  name: string;
  title: string;
  displayName: string;
  enemyClass: EnemyClassId;
  representFor: string;
  abilities: Array<{ id: AbilityId; level: number }>;
  dropItemTier: number;
  dropItemCategories: [ItemCategory, ItemCategory];
};

export const GOD_ENEMY_PROFILES: GodEnemyProfile[] = [
  { tier: 3, name: 'Seiran', title: 'God of Restoration', displayName: 'セイラン 再生の神', enemyClass: 'pilgrim', representFor: 'Caninian', abilities: [{ id: 'resurrect', level: 2 }], dropItemTier: 3, dropItemCategories: ['grimoire', 'robe'] },
  { tier: 4, name: 'Garv', title: 'God of Attrition', displayName: 'ガーヴ 消耗の神', enemyClass: 'samurai', representFor: 'Lupinian', abilities: [{ id: 'rage', level: 2 }, { id: 're_counter', level: 2 }], dropItemTier: 4, dropItemCategories: ['katana', 'shield'] },
  { tier: 5, name: 'Kyōen', title: 'God of Cunning', displayName: 'キョウエン 狡猾の神', enemyClass: 'rogue', representFor: 'Vulpinian', abilities: [{ id: 'momentum', level: 2 }], dropItemTier: 5, dropItemCategories: ['archery', 'bolt'] },
  { tier: 6, name: 'Dolvar', title: 'God of Fortification', displayName: 'ドルヴァ 防備の神', enemyClass: 'fighter', representFor: 'Ursan', abilities: [{ id: 'cyborgization', level: 2 }], dropItemTier: 6, dropItemCategories: ['armor', 'gauntlet'] },
  { tier: 7, name: 'Miora', title: 'Goddess of Fertility', displayName: 'ミオラ 豊穣の女神', enemyClass: 'sage', representFor: 'Felidian', abilities: [{ id: 'first_strike', level: 2 }], dropItemTier: 7, dropItemCategories: ['sword', 'catalyst'] },
  { tier: 7, name: 'Rondel', title: 'God of Resonance', displayName: 'ロンデル 共鳴の神', enemyClass: 'wizard', representFor: 'Mustelid', abilities: [{ id: 'resonance', level: 4 }], dropItemTier: 7, dropItemCategories: ['wand', 'arrow'] },
  { tier: 8, name: 'Lira', title: 'Goddess of Precision', displayName: 'リラ 精密の女神', enemyClass: 'ranger', representFor: 'Leporian', abilities: [{ id: 'composure', level: 2 }], dropItemTier: 8, dropItemCategories: ['arrow', 'archery'] },
  { tier: 8, name: 'Forne', title: 'God of Fate', displayName: 'フォルネ 運命の神', enemyClass: 'lord', representFor: 'Cervin', abilities: [{ id: 'focus', level: 2 }], dropItemTier: 8, dropItemCategories: ['armor', 'robe'] },
  { tier: 8, name: 'Skuva', title: 'God of Dusk', displayName: 'スクヴァ 黄昏の神', enemyClass: 'ninja', representFor: 'Murid', abilities: [{ id: 'stealth', level: 1 }], dropItemTier: 8, dropItemCategories: ['shield', 'catalyst'] },
  { tier: 8, name: 'Tanue', title: 'Goddess of Mirage', displayName: 'タヌエ 幻影の神', enemyClass: 'duelist', representFor: 'Procyonian', abilities: [{ id: 'illusion', level: 1 }], dropItemTier: 8, dropItemCategories: ['sword', 'gauntlet'] },
  { tier: 8, name: 'Noctyra', title: 'God of Oblivion', displayName: 'ノクティラ 忘却されし神', enemyClass: 'samurai', representFor: '-', abilities: [{ id: 'rage', level: 2 }, { id: 'first_strike', level: 2 }], dropItemTier: 8, dropItemCategories: ['bolt', 'katana'] },
  { tier: 8, name: 'Eris', title: 'Goddess of Discord', displayName: 'エリス 不和の神', enemyClass: 'pilgrim', representFor: '-', abilities: [{ id: 'momentum', level: 2 }, { id: 'resonance', level: 4 }, { id: 'stealth', level: 1 }], dropItemTier: 8, dropItemCategories: ['grimoire', 'wand'] },
];

export const MYTHIC_DROP_POOLS: Record<number, ItemCategory[]> = {
  1: ['sword', 'grimoire'],
  2: ['armor', 'arrow'],
  3: ['wand', 'robe'],
  4: ['katana', 'shield'],
  5: ['bolt', 'archery'],
  6: ['armor', 'catalyst'],
  7: ['sword', 'wand'],
  8: ['katana', 'bolt', 'grimoire'],
};

export const GOD_MYTHIC_DROPS: GodMythicDrop[] = [
  { dropBy: 'Seiran', tier: 3, category: 'grimoire', name: '再生の聖典' },
  { dropBy: 'Seiran', tier: 3, category: 'robe', name: '甦生の法衣' },
  { dropBy: 'Garv', tier: 4, category: 'katana', name: '血脈断ちの刀' },
  { dropBy: 'Garv', tier: 4, category: 'shield', name: '堅忍の護盾' },
  { dropBy: 'Kyōen', tier: 5, category: 'archery', name: '狡猾なる長弓' },
  { dropBy: 'Kyōen', tier: 5, category: 'bolt', name: '虚影貫きの矢' },
  { dropBy: 'Dolvar', tier: 6, category: 'armor', name: '不壊の重装' },
  { dropBy: 'Dolvar', tier: 6, category: 'gauntlet', name: '鉄城の篭手' },
  { dropBy: 'Miora', tier: 7, category: 'sword', name: '芽吹きの剣' },
  { dropBy: 'Miora', tier: 7, category: 'catalyst', name: '生命循環の触媒' },
  { dropBy: 'Rondel', tier: 7, category: 'wand', name: '共鳴導く魔杖' },
  { dropBy: 'Rondel', tier: 7, category: 'arrow', name: '反響する魔矢' },
  { dropBy: 'Lira', tier: 8, category: 'arrow', name: '精密射の矢' },
  { dropBy: 'Lira', tier: 8, category: 'archery', name: '千里照準の弓' },
  { dropBy: 'Forne', tier: 8, category: 'armor', name: '宿命纏いの鎧' },
  { dropBy: 'Forne', tier: 8, category: 'robe', name: '運命編みの外套' },
  { dropBy: 'Skuva', tier: 8, category: 'shield', name: '夕闇の円盾' },
  { dropBy: 'Skuva', tier: 8, category: 'catalyst', name: '薄暮の触媒' },
  { dropBy: 'Tanue', tier: 8, category: 'sword', name: '幻映の剣' },
  { dropBy: 'Tanue', tier: 8, category: 'gauntlet', name: '迷彩の篭手' },
  { dropBy: 'Noctyra', tier: 8, category: 'bolt', name: '虚無穿つ矢' },
  { dropBy: 'Noctyra', tier: 8, category: 'katana', name: '絶滅の刀' },
  { dropBy: 'Eris', tier: 8, category: 'grimoire', name: '争乱の書' },
  { dropBy: 'Eris', tier: 8, category: 'wand', name: '乱調の魔杖' },
];
