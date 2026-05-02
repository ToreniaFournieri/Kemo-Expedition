import { AbilityId, Bonus, EnemyClassId, ItemCategory } from '../types';

type GodMythicDrop = {
  dropBy: string;
  tier: number;
  category: ItemCategory;
  name: string;
  bonuses?: Bonus[];
};

export type GodEnemyProfile = {
  expId: number;
  tier: number;
  level: number;
  name: string;
  title: string;
  displayName: string;
  enemyClass: EnemyClassId;
  representFor: string;
  abilities: Array<{ id: AbilityId; level: number }>;
  dropItemTier: number;
  dropItemCategories: [ItemCategory, ItemCategory];
  expedition: string;
};

export const GOD_ENEMY_PROFILES: GodEnemyProfile[] = [
  { expId: 1, tier: 3, level: 18, name: 'Seiran', title: 'Goddess of Restoration', displayName: 'セイラン 再生の女神', enemyClass: 'pilgrim', representFor: 'Caninian', abilities: [{ id: 'resurrect', level: 2 }], dropItemTier: 3, dropItemCategories: ['grimoire', 'robe'], expedition: 'ケイナイアン平原' },
  { expId: 2, tier: 4, level: 25, name: 'Garv', title: 'God of Attrition', displayName: 'ガーヴ 消耗の神', enemyClass: 'samurai', representFor: 'Lupinian', abilities: [{ id: 'rage', level: 2 }, { id: 're_counter', level: 2 }], dropItemTier: 4, dropItemCategories: ['katana', 'shield'], expedition: 'ルピニアンの亜寒帯' },
  { expId: 3, tier: 5, level: 32, name: 'Kyōen', title: 'God of Cunning', displayName: 'キョウエン 狡猾の神', enemyClass: 'striker', representFor: 'Vulpinian', abilities: [{ id: 'momentum', level: 2 }], dropItemTier: 5, dropItemCategories: ['archery', 'bolt'], expedition: 'ヴァルンの海洋' },
  { expId: 4, tier: 7, level: 39, name: 'Miora', title: 'Goddess of Fertility', displayName: 'ミオラ 豊穣の女神', enemyClass: 'sage', representFor: 'Felidian', abilities: [{ id: 'first_strike', level: 2 }], dropItemTier: 7, dropItemCategories: ['sword', 'catalyst'], expedition: 'フェリディ砂漠' },
  { expId: 5, tier: 6, level: 46, name: 'Dolvar', title: 'God of Fortification', displayName: 'ドルヴァ 防備の神', enemyClass: 'guardian', representFor: 'Ursan', abilities: [{ id: 'cyborgization', level: 2 }], dropItemTier: 6, dropItemCategories: ['armor', 'gauntlet'], expedition: 'ウルサンの炎嶺' },
  { expId: 6, tier: 7, level: 53, name: 'Tanue', title: 'Goddess of Mirage', displayName: 'タヌエ 幻影の女神', enemyClass: 'duelist', representFor: 'Procyonian', abilities: [], dropItemTier: 7, dropItemCategories: ['sword', 'gauntlet'], expedition: 'プロキオン巣穴' },
  { expId: 7, tier: 8, level: 60, name: 'Lira', title: 'Goddess of Precision', displayName: 'リラ 精密の女神', enemyClass: 'ranger', representFor: 'Leporian', abilities: [{ id: 'composure', level: 2 }], dropItemTier: 8, dropItemCategories: ['arrow', 'archery'], expedition: 'レポリアンの月宮' },
  { expId: 8, tier: 8, level: 61, name: 'Forne', title: 'God of Fate', displayName: 'フォルネ 運命の神', enemyClass: 'lord', representFor: 'Cervin', abilities: [{ id: 'focus', level: 2 }], dropItemTier: 8, dropItemCategories: ['armor', 'robe'], expedition: 'セルヴィンの谷' },
  { expId: 9, tier: 8, level: 62, name: 'Skuva', title: 'God of Dusk', displayName: 'スクヴァ 黄昏の神', enemyClass: 'ninja', representFor: 'Murid', abilities: [{ id: 'stealth', level: 1 }], dropItemTier: 8, dropItemCategories: ['shield', 'catalyst'], expedition: '(not yet)' },
  { expId: 10, tier: 7, level: 63, name: 'Rondel', title: 'God of Resonance', displayName: 'ロンデル 共鳴の神', enemyClass: 'wizard', representFor: 'Mustelid', abilities: [{ id: 'resonance', level: 4 }], dropItemTier: 7, dropItemCategories: ['wand', 'arrow'], expedition: '(not yet)' },
  { expId: 11, tier: 8, level: 70, name: 'Noctyra', title: 'God of Oblivion', displayName: 'ノクティラ 忘却されし神', enemyClass: 'samurai', representFor: '-', abilities: [{ id: 'rage', level: 2 }, { id: 'first_strike', level: 2 }], dropItemTier: 8, dropItemCategories: ['bolt', 'katana'], expedition: '(not yet)' },
  { expId: 12, tier: 8, level: 71, name: 'Eris', title: 'Goddess of Discord', displayName: 'エリス 不和の神', enemyClass: 'pilgrim', representFor: '-', abilities: [{ id: 'momentum', level: 2 }, { id: 'resonance', level: 4 }, { id: 'stealth', level: 1 }], dropItemTier: 8, dropItemCategories: ['grimoire', 'wand'], expedition: '(not yet)' },
];

export function getGodProfileForDungeon(dungeonId: number, dungeonName: string): GodEnemyProfile | undefined {
  const byExpId = GOD_ENEMY_PROFILES.find((god) => god.expId === dungeonId);
  if (byExpId) return byExpId;

  const byExpeditionName = GOD_ENEMY_PROFILES.find((god) => god.expedition === dungeonName);
  if (byExpeditionName) return byExpeditionName;

  // Fallback for legacy saves where dungeon names may differ from the latest localized names.
  return GOD_ENEMY_PROFILES[dungeonId - 1];
}

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
  { dropBy: 'Seiran', tier: 3, category: 'grimoire', name: '再生の聖典', bonuses: [{ type: 'unlock_caninian_ability', value: 1 }] },
  { dropBy: 'Seiran', tier: 3, category: 'robe', name: '甦生の法衣', bonuses: [{ type: 'unlock_caninian_ability', value: 1 }] },
  { dropBy: 'Garv', tier: 4, category: 'katana', name: '血脈断ちの刀', bonuses: [{ type: 'unlock_lupinian_ability', value: 1 }] },
  { dropBy: 'Garv', tier: 4, category: 'shield', name: '堅忍の護盾', bonuses: [{ type: 'unlock_lupinian_ability', value: 1 }] },
  { dropBy: 'Kyōen', tier: 5, category: 'archery', name: '狡猾なる長弓', bonuses: [{ type: 'unlock_vulpinian_ability', value: 1 }] },
  { dropBy: 'Kyōen', tier: 5, category: 'bolt', name: '虚影貫きの矢', bonuses: [{ type: 'unlock_vulpinian_ability', value: 1 }] },
  { dropBy: 'Dolvar', tier: 6, category: 'armor', name: '不壊の重装', bonuses: [{ type: 'unlock_ursan_ability', value: 1 }] },
  { dropBy: 'Dolvar', tier: 6, category: 'gauntlet', name: '鉄城の篭手', bonuses: [{ type: 'unlock_ursan_ability', value: 1 }] },
  { dropBy: 'Miora', tier: 7, category: 'sword', name: '芽吹きの剣', bonuses: [{ type: 'unlock_felidian_ability', value: 1 }] },
  { dropBy: 'Miora', tier: 7, category: 'catalyst', name: '生命循環の触媒', bonuses: [{ type: 'unlock_felidian_ability', value: 1 }] },
  { dropBy: 'Rondel', tier: 7, category: 'wand', name: '共鳴導く魔杖', bonuses: [{ type: 'unlock_mustelid_ability', value: 1 }] },
  { dropBy: 'Rondel', tier: 7, category: 'arrow', name: '反響する魔矢', bonuses: [{ type: 'unlock_mustelid_ability', value: 1 }] },
  { dropBy: 'Lira', tier: 8, category: 'arrow', name: '精密射の矢', bonuses: [{ type: 'unlock_leporian_ability', value: 1 }] },
  { dropBy: 'Lira', tier: 8, category: 'archery', name: '千里照準の弓', bonuses: [{ type: 'unlock_leporian_ability', value: 1 }] },
  { dropBy: 'Forne', tier: 8, category: 'armor', name: '宿命纏いの鎧', bonuses: [{ type: 'unlock_cervin_ability', value: 1 }] },
  { dropBy: 'Forne', tier: 8, category: 'robe', name: '運命編みの外套', bonuses: [{ type: 'unlock_cervin_ability', value: 1 }] },
  { dropBy: 'Skuva', tier: 8, category: 'shield', name: '夕闇の円盾', bonuses: [{ type: 'unlock_murid_ability', value: 1 }] },
  { dropBy: 'Skuva', tier: 8, category: 'catalyst', name: '薄暮の触媒', bonuses: [{ type: 'unlock_murid_ability', value: 1 }] },
  { dropBy: 'Tanue', tier: 8, category: 'sword', name: '幻映の剣', bonuses: [{ type: 'unlock_procyonian_ability', value: 1 }] },
  { dropBy: 'Tanue', tier: 8, category: 'gauntlet', name: '迷彩の篭手', bonuses: [{ type: 'unlock_procyonian_ability', value: 1 }] },
  { dropBy: 'Noctyra', tier: 8, category: 'bolt', name: '虚無穿つ矢' },
  { dropBy: 'Noctyra', tier: 8, category: 'katana', name: '絶滅の刀' },
  { dropBy: 'Eris', tier: 8, category: 'grimoire', name: '争乱の書' },
  { dropBy: 'Eris', tier: 8, category: 'wand', name: '乱調の魔杖' },
];
