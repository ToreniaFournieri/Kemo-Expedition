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
// Expedition 1: ケイナイアン平原(Caninian Plains)
// ============================================================
const EXPEDITION_1_NORMALS: EnemyTemplate[] = [
  { name: '原野のイノシシ', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '石投げサル', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '泥まみれキノコ妖', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '骨札の獣人', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '草影コヨーテ', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '木登りヤマネコ', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '牙折りオオカミ', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '苔角シカ', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '爪裂きヒョウ', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '群れのボスオス', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '丸太押しバイソン', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '棘針ヤマアラシ', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '霧呼びホタル妖', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '縄張りの王サル', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '巨牙マンモス', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '影跳びキツネ', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '盗みカラス', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '根読みフクロウ', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '跳ね牙カンガルー', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '土鈴の巡り獣', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '石甲カメ', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '枝矢ウサギ', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '黒炭トカゲ妖', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '群れ統べグマ', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '岩砕きサイ', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '疾走イタチ', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '夜盗ジャッカル', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '古樹のシカ長', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '裂爪ライオン', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '獣骨の祈り手', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
];

const EXPEDITION_1_ELITES: EnemyTemplate[] = [
  { name: '木柵破りの牙鼠', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '丸太鎧の大猪', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '岩上の狙い鷲', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '二枚爪の黒豹', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '毒霧の沼キノコ王', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
];

const EXPEDITION_1_BOSS: EnemyTemplate = {
  name: '原初の巨獣グラントゥスク',
  hpMod: 1.0,
  attackType: 'melee',
  attackMod: 1.0,
  defenseMod: 1.0,
};

// ============================================================
// Expedition 2: ルピニアンの断崖(Lupinian Crag)
// ============================================================
const EXPEDITION_2_NORMALS: EnemyTemplate[] = [
  { name: '石槌のクマ戦士', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '投石の崖猿', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '霧刻みの石霊', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '石紋の巡礼獣', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '崖影の狩猟犬', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '岩跳びの山猫', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '削岩刃の灰狼', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '風読の岩角鹿', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '断崖の二枚牙グマ', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '石座の群長グマ', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '巨石担ぎの岩グマ', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '骨矢の崖射手', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '霧岩の刻紋術師', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '縄張りの石王', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '磨刃の断崖剣士', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '裂風の岩忍', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '石刃の奪掠者', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '風紋刻む石賢者', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '砕牙の岩熊闘士', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '石祈の巡り獣', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '岩鎧の巨熊', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '断崖の投石名手', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '岩霧の祭司', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '群れ統べる石王熊', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '研ぎ刃の灰狼', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '崖駆けの風影', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '石牙の夜襲犬', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '断崖の古岩賢老', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '裂岩の双牙熊', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '風紋の祈り手', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
];

const EXPEDITION_2_ELITES: EnemyTemplate[] = [
  { name: '石門破りの山犬', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '断崖の岩鎧熊将', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '風裂きの崖狙撃手', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '双石刃の断崖闘将', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '霧刻の岩祭司長', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
];

const EXPEDITION_2_BOSS: EnemyTemplate = {
  name: '風哭きの断崖王グリムクラッグ',
  hpMod: 1.0,
  attackType: 'mixed',
  attackMod: 1.0,
  defenseMod: 1.0,
};

// ============================================================
// Expedition 3: ヴァルピニアンの樹林帯(Vulpinian Taiga)
// ============================================================
const EXPEDITION_3_NORMALS: EnemyTemplate[] = [
  { name: '青銅槍の狐兵', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '霧射ちの狐弓兵', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '幻霧の狐術師', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '樹霧の巡礼狐', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '葉影の狐盗賊', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '樹間を駆ける狐影', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '青銅刃の狐剣士', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '霧文の狐賢者', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '二刃の狐闘士', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '森境の狐領主', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '青銅盾の狐守兵', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '迷彩の狐狙撃手', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '幻惑の狐呪術師', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '樹林の狐族長', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '霧断ちの狐侍', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '霧歩きの狐忍', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '樹影の狐奪掠者', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '樹霊の狐司書', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '双青銅刃の狐闘将', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '霧祈の狐巡礼', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '青銅鎧の狐重兵', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '連射の狐射手', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '森幻の狐大術師', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '霧林を統べる狐公', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '青銅居合の狐剣豪', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '幻歩の狐影将', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '霧裂きの狐暗殺者', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '森奥の狐賢老', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '連刃の狐剣鬼', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '樹霧の狐祈り手', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
];

const EXPEDITION_3_ELITES: EnemyTemplate[] = [
  { name: '霧門破りの狐盗賊長', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '青銅壁の狐守将', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '幻林の狐狙撃長', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '双刃将の狐剣闘長', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '幻霧結界の狐大術師', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
];

const EXPEDITION_3_BOSS: EnemyTemplate = {
  name: '幻樹の大賢狐ミストレイル',
  hpMod: 1.0,
  attackType: 'magical',
  attackMod: 1.0,
  defenseMod: 1.0,
};

// ============================================================
// Expedition 4: ウルサンの霊峰(Ursan Peaks)
// ============================================================
const EXPEDITION_4_NORMALS: EnemyTemplate[] = [
  { name: '鉄鎚の熊戦士', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '熔岩射ちの熊射手', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '溶岩炉の熊術師', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '炉祈の熊巡礼', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '火影の熊奪掠者', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '熔岩跳びの熊影', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '鉄刀の熊剣士', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '鍛炉の熊賢者', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '鉄爪の熊闘士', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '炉座の熊領主', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '溶岩盾の熊守兵', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '火花散らす熊狙撃手', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '熔鉄の熊呪術師', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '霊峰を統べる熊公', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '灼鉄居合の熊侍', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '火走りの熊忍', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '炉影の熊盗賊', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '霊峰の熊司書', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '双鉄刃の熊闘将', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '溶岩祈の熊巡礼', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '鉄殻の熊重兵', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '熔弓の熊射手長', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '霊炉の熊大術師', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '溶岩鍛冶王熊', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '霊峰流・鉄刀熊剣豪', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '熔走の熊影将', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '溶鉄裂きの熊暗殺者', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '古炉の熊賢老', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '連鉄刃の熊剣鬼', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '炉魂の熊祈り手', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
];

const EXPEDITION_4_ELITES: EnemyTemplate[] = [
  { name: '炉門破りの熊奪掠将', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '鉄壁の熊守将', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '火山の熊狙撃長', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '双鉄刃の熊闘将長', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '霊炉結界の熊大術師長', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
];

const EXPEDITION_4_BOSS: EnemyTemplate = {
  name: '霊峰の鉄王クガネオウ',
  hpMod: 1.0,
  attackType: 'magical',
  attackMod: 1.0,
  defenseMod: 1.0,
};

// ============================================================
// Expedition 5: フェリディアンの茂み(Felidian Grove)
// ============================================================
const EXPEDITION_5_NORMALS: EnemyTemplate[] = [
  { name: '月光鎧の猫兵', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '光苔射ちの猫射手', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '燐光の猫術師', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '聖茂の猫巡礼', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '葉影の猫盗賊', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '月影跳びの猫影', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '月刃の猫剣士', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '光苔文の猫賢者', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '双月刃の猫闘士', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '聖域の猫領主', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '月光盾の猫守兵', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '燐弾連射の猫狙撃手', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '月幻の猫呪術師', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '古遺跡の猫族長', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '月断ちの猫侍', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '燐歩きの猫忍', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '茂影の猫奪掠者', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '遺跡司書の猫賢者', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '連月刃の猫闘将', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '月祈の猫巡礼', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '聖域重装の猫衛士', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '閃撃の猫射手長', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '月輝の猫大術師', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '月庭を統べる猫公', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '月影居合の猫剣豪', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '閃走の猫影将', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '燐裂きの猫暗殺者', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '聖茂の猫賢老', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '双月連刃の猫剣鬼', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '聖域の猫祈り手', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
];

const EXPEDITION_5_ELITES: EnemyTemplate[] = [
  { name: '月門破りの猫奪掠将', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '聖茂の月光守将', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '燐弾嵐の猫狙撃長', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '双月刃の猫剣闘長', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '月輝結界の猫大術師長', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
];

const EXPEDITION_5_BOSS: EnemyTemplate = {
  name: '月影の聖域王ルミナリス',
  hpMod: 1.0,
  attackType: 'mixed',
  attackMod: 1.0,
  defenseMod: 1.0,
};

// ============================================================
// Expedition 6: マステリドの巣穴(Mustelid Burrow)
// ============================================================
const EXPEDITION_6_NORMALS: EnemyTemplate[] = [
  { name: '銅歯車の鼬兵', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '蒸気狙いの鼬射手', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '毒蒸気の鼬術師', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '換気祈の鼬巡礼', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '歯車影の鼬奪掠者', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '配管跳びの鼬影', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '銅刃の鼬剣士', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '配線読の鼬賢者', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '双銅刃の鼬闘士', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '迷宮工匠の鼬領主', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '装甲配管の鼬守兵', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '歯車連射の鼬狙撃手', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '腐食霧の鼬呪術師', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '銅迷宮の鼬族長', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '配管斬りの鼬侍', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '蒸気走りの鼬忍', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '毒歯の鼬盗賊', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '炉心配線の鼬司書', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '連銅刃の鼬闘将', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '浄化煙の鼬巡礼', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '重装配管の鼬重兵', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '精密照準の鼬射手長', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '触媒核の鼬大術師', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '銅迷宮を統べる鼬公', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '合金居合の鼬剣豪', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '高速配管の鼬影将', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '腐蝕刃の鼬暗殺者', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '深層迷宮の鼬賢老', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '双合金刃の鼬剣鬼', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '毒気浄化の鼬祈り手', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
];

const EXPEDITION_6_ELITES: EnemyTemplate[] = [
  { name: '通風路破りの鼬奪掠将', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '銅壁の鼬守将', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '蒸気狙撃の鼬狙撃長', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '双合金刃の鼬闘将長', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '触媒結界の鼬大術師長', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
];

const EXPEDITION_6_BOSS: EnemyTemplate = {
  name: '銅迷宮の主機核アルケミトロン',
  hpMod: 1.0,
  attackType: 'magical',
  attackMod: 1.0,
  defenseMod: 1.0,
};

// ============================================================
// Expedition 7: レポリアンの庭園(Leporian Garden)
// ============================================================
const EXPEDITION_7_NORMALS: EnemyTemplate[] = [
  { name: '風護りの兎兵', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '雲狙いの兎射手', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '浮雲の兎術師', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '天空祈の兎巡礼', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '風影の兎奪掠者', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '気流跳びの兎影', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '天刃の兎剣士', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '風路読みの兎賢者', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '双天刃の兎闘士', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '浮島の兎領主', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '雲盾の兎守兵', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '旋風連射の兎狙撃手', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '高天の兎呪術師', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '天庭を統べる兎公', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '風断ちの兎侍', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '空走りの兎忍', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '雲影の兎盗賊', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '天文の兎司書', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '連天刃の兎闘将', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '天空巡礼の兎祈り手', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '重雲鎧の兎重兵', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '風刃嵐の兎射手長', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '天輝の兎大術師', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '高天を治める兎王侯', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '天翔居合の兎剣豪', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '風裂走の兎影将', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '雲裂きの兎暗殺者', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '浮島の兎賢老', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '双天連刃の兎剣鬼', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '風祈の兎祈り手', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
];

const EXPEDITION_7_ELITES: EnemyTemplate[] = [
  { name: '天門破りの兎奪掠将', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '風壁の兎守将', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '旋風狙撃の兎狙撃長', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '双天刃の兎闘将長', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '天輝結界の兎大術師長', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
];

const EXPEDITION_7_BOSS: EnemyTemplate = {
  name: '高天統治者エアリオン',
  hpMod: 1.0,
  attackType: 'magical',
  attackMod: 1.0,
  defenseMod: 1.0,
};

// ============================================================
// Expedition 8: セルヴィンの谷(Cervin Vale)
// ============================================================
const EXPEDITION_8_NORMALS: EnemyTemplate[] = [
  { name: '結晶装甲の鹿兵', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '時層を射抜く鹿射手', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '時晶の鹿術師', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '無音巡礼の鹿祈り手', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '鏡影の鹿暗盗', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '瞬歩の鹿影', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '時断ちの鹿剣士', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '結界刻む鹿賢者', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '双晶刃の鹿闘士', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '静寂の鹿領主', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '時壁の鹿守兵', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '層界狙撃の鹿狙撃手', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '無音結界の鹿呪術師', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '玻璃界を統べる鹿公', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '結晶居合の鹿侍', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '鏡界走りの鹿忍', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '時裂きの鹿奪掠者', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '時層司書の鹿賢者', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '連晶刃の鹿闘将', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '無音祈の鹿巡礼', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '結晶重装の鹿衛士', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '次元貫きの鹿射手長', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '玻璃界の鹿大術師', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '時界を治める鹿王侯', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '時空居合の鹿剣豪', hpMod: 1.0, attackType: 'ranged', attackMod: 1.0, defenseMod: 1.0 },
  { name: '瞬断の鹿影将', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '鏡裂きの鹿暗殺者', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '無限層の鹿賢老', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '双晶連刃の鹿剣鬼', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '静謐の鹿祈り手', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
];

const EXPEDITION_8_ELITES: EnemyTemplate[] = [
  { name: '玻璃門破りの鹿奪掠将', hpMod: 1.0, attackType: 'melee', attackMod: 1.0, defenseMod: 1.0 },
  { name: '時壁の鹿守将', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '次元狙撃の鹿狙撃長', hpMod: 1.0, attackType: 'magical', attackMod: 1.0, defenseMod: 1.0 },
  { name: '双晶刃の鹿闘将長', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
  { name: '玻璃結界の鹿大術師長', hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
];

const EXPEDITION_8_BOSS: EnemyTemplate = {
  name: '終焉剣聖・時玻璃ノ剣鹿',
  hpMod: 1.0,
  attackType: 'magical',
  attackMod: 1.0,
  defenseMod: 1.0,
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
  fighter: { hp: 75, abilities: [], accuracyBonus: 0.0, evasionBonus: 0.02, rangedAttack: 0, rangedNoA: 0, magicalAttack: 0, magicalNoA: 0, meleeAttack: 16, meleeNoA: 2, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0, physicalDefense: 16, magicalDefense: 10, experience: 10 },
  duelist: { hp: 50, abilities: ['counter'], accuracyBonus: 0.01, evasionBonus: 0.01, rangedAttack: 0, rangedNoA: 0, magicalAttack: 0, magicalNoA: 0, meleeAttack: 20, meleeNoA: 4, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.2, physicalDefense: 10, magicalDefense: 10, experience: 10 },
  ninja: { hp: 47, abilities: ['re_attack'], accuracyBonus: 0.0, evasionBonus: 0.04, rangedAttack: 10, rangedNoA: 2, magicalAttack: 0, magicalNoA: 0, meleeAttack: 14, meleeNoA: 2, rangedAttackAmplifier: 1.1, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.1, physicalDefense: 10, magicalDefense: 10, experience: 14 },
  samurai: { hp: 40, abilities: [], accuracyBonus: -0.05, evasionBonus: -0.01, rangedAttack: 0, rangedNoA: 0, magicalAttack: 0, magicalNoA: 0, meleeAttack: 40, meleeNoA: 2, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.3, physicalDefense: 8, magicalDefense: 8, experience: 12 },
  lord: { hp: 60, abilities: [], accuracyBonus: 0.0, evasionBonus: 0.0, rangedAttack: 0, rangedNoA: 0, magicalAttack: 0, magicalNoA: 0, meleeAttack: 18, meleeNoA: 4, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.1, physicalDefense: 14, magicalDefense: 14, experience: 20 },
  ranger: { hp: 38, abilities: [], accuracyBonus: 0.03, evasionBonus: 0.01, rangedAttack: 14, rangedNoA: 4, magicalAttack: 0, magicalNoA: 0, meleeAttack: 0, meleeNoA: 0, rangedAttackAmplifier: 1.2, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0, physicalDefense: 8, magicalDefense: 8, experience: 12 },
  wizard: { hp: 32, abilities: [], accuracyBonus: 0.0, evasionBonus: 0.0, rangedAttack: 0, rangedNoA: 0, magicalAttack: 20, magicalNoA: 2, meleeAttack: 0, meleeNoA: 0, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.2, meleeAttackAmplifier: 1.0, physicalDefense: 6, magicalDefense: 14, experience: 10 },
  sage: { hp: 38, abilities: [], accuracyBonus: 0.0, evasionBonus: 0.0, rangedAttack: 0, rangedNoA: 0, magicalAttack: 10, magicalNoA: 4, meleeAttack: 0, meleeNoA: 0, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.2, meleeAttackAmplifier: 1.0, physicalDefense: 8, magicalDefense: 20, experience: 10 },
  rogue: { hp: 30, abilities: [], accuracyBonus: 0.06, evasionBonus: 0.06, rangedAttack: 10, rangedNoA: 4, magicalAttack: 0, magicalNoA: 0, meleeAttack: 10, meleeNoA: 4, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.2, meleeAttackAmplifier: 1.0, physicalDefense: 8, magicalDefense: 8, experience: 8 },
  pilgrim: { hp: 66, abilities: ['null_counter'], accuracyBonus: 0.0, evasionBonus: 0.02, rangedAttack: 0, rangedNoA: 0, magicalAttack: 10, magicalNoA: 2, meleeAttack: 16, meleeNoA: 2, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.2, meleeAttackAmplifier: 1.2, physicalDefense: 12, magicalDefense: 12, experience: 16 },
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
  const classBase = ENEMY_CLASS_BASES[enemyClass];
  const enemyTypeExpMult = type === 'elite' ? 2.0 : type === 'boss' ? 5.0 : 1.0;

  // Master enemy data (before expedition/floor multipliers)
  const hp = Math.floor(classBase.hp * template.hpMod);
  const attackScale = template.attackMod;
  const defenseScale = template.defenseMod;

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
    rangedNoA: classBase.rangedNoA,
    magicalAttack: Math.floor(classBase.magicalAttack * attackScale),
    magicalNoA: classBase.magicalNoA,
    meleeAttack: Math.floor(classBase.meleeAttack * attackScale),
    meleeNoA: classBase.meleeNoA,
    // f.offense_amplifier scales by floor multiplier only (no exp/tier multiplier)
    rangedAttackAmplifier: classBase.rangedAttackAmplifier,
    magicalAttackAmplifier: classBase.magicalAttackAmplifier,
    meleeAttackAmplifier: classBase.meleeAttackAmplifier,
    physicalDefense: Math.floor(classBase.physicalDefense * defenseScale),
    magicalDefense: Math.floor(classBase.magicalDefense * defenseScale),
    elementalOffense: template.element || 'none',
    elementalResistance: {
      fire: template.resistances?.fire ?? 1.0,
      thunder: template.resistances?.thunder ?? 1.0,
      ice: template.resistances?.ice ?? 1.0,
    },
    defenseAmplifier: 1.0,
    experience: Math.floor(classBase.experience * template.hpMod * enemyTypeExpMult),
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
