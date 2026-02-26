import { ItemCategory } from '../types';

export type GodMythicDrop = {
  dropBy: string;
  category: ItemCategory;
  name: string;
};

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
  { dropBy: 'Seiran', category: 'grimoire', name: '再生の聖典' },
  { dropBy: 'Seiran', category: 'robe', name: '甦生の法衣' },
  { dropBy: 'Garv', category: 'katana', name: '血脈断ちの刀' },
  { dropBy: 'Garv', category: 'shield', name: '堅忍の護盾' },
  { dropBy: 'Kyōen', category: 'archery', name: '狡猾なる長弓' },
  { dropBy: 'Kyōen', category: 'bolt', name: '虚影貫きの矢' },
  { dropBy: 'Dolvar', category: 'armor', name: '不壊の重装' },
  { dropBy: 'Dolvar', category: 'gauntlet', name: '鉄城の篭手' },
  { dropBy: 'Miora', category: 'sword', name: '芽吹きの剣' },
  { dropBy: 'Miora', category: 'catalyst', name: '生命循環の触媒' },
  { dropBy: 'Rondel', category: 'wand', name: '共鳴導く魔杖' },
  { dropBy: 'Rondel', category: 'arrow', name: '反響する魔矢' },
  { dropBy: 'Lira', category: 'arrow', name: '精密射の矢' },
  { dropBy: 'Lira', category: 'archery', name: '千里照準の弓' },
  { dropBy: 'Forne', category: 'armor', name: '宿命纏いの鎧' },
  { dropBy: 'Forne', category: 'robe', name: '運命編みの外套' },
  { dropBy: 'Skuva', category: 'shield', name: '夕闇の円盾' },
  { dropBy: 'Skuva', category: 'catalyst', name: '薄暮の触媒' },
  { dropBy: 'Tanue', category: 'sword', name: '幻映の剣' },
  { dropBy: 'Tanue', category: 'gauntlet', name: '迷彩の篭手' },
  { dropBy: 'Noctyra', category: 'bolt', name: '虚無穿つ矢' },
  { dropBy: 'Noctyra', category: 'katana', name: '絶滅の刀' },
  { dropBy: 'Eris', category: 'grimoire', name: '争乱の書' },
  { dropBy: 'Eris', category: 'wand', name: '乱調の魔杖' },
];
