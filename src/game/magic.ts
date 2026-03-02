import { ElementalOffense } from '../types';

export type MagicStyle = 'multi-hit' | 'area_burst' | 'percentage_damage';

export interface MagicProfile {
  key: string;
  style: MagicStyle;
  spellName: string;
  description: string;
}

interface ResolveMagicProfileParams {
  style?: MagicStyle;
  elementalOffense: ElementalOffense;
  elementalOffenseValue?: number;
  magicalNoA?: number;
}

// SpecRef: 3.3.2 | Multiplier and Functions | resolveMagicProfile
export function resolveMagicProfile({
  style = 'multi-hit',
  elementalOffense,
  elementalOffenseValue = 1.0,
  magicalNoA = 0,
}: ResolveMagicProfileParams): MagicProfile {
  if (style === 'percentage_damage') {
    return {
      key: 'gravity_well',
      style,
      spellName: 'グラビティウェル',
      description: magicalNoA >= 20
        ? '魔法攻撃回数が20回以上の場合発動。相手の残HPの2/5固定ダメージ'
        : '魔法攻撃回数が20回以上で発動可能な固定割合ダメージ魔法',
    };
  }

  if (style === 'area_burst') {
    if (elementalOffense === 'fire') {
      return { key: 'pyroclasm', style, spellName: 'パイロクラスム', description: '火属性範囲魔法攻撃(ヒット数は1固定)' };
    }
    if (elementalOffense === 'ice') {
      return { key: 'glacial_burst', style, spellName: 'グレイシャルバースト', description: '氷属性範囲魔法攻撃(ヒット数は1固定)' };
    }
    if (elementalOffense === 'thunder') {
      return { key: 'tempest_nova', style, spellName: 'テンペストノヴァ', description: '雷属性範囲魔法攻撃(ヒット数は1固定)' };
    }

    return { key: 'astral_flare', style, spellName: 'アストラルフレア', description: '無属性範囲魔法攻撃(ヒット数は1固定)' };
  }

  if (elementalOffense === 'fire') {
    return elementalOffenseValue >= 1.5
      ? { key: 'hellfire_volley', style, spellName: 'ヘルファイア', description: '火属性上位魔法(火属性50%以上)' }
      : { key: 'fire_lance', style, spellName: 'ファイアランス', description: '火属性基本魔法(火属性50%未満)' };
  }

  if (elementalOffense === 'ice') {
    return elementalOffenseValue >= 1.5
      ? { key: 'blizzard', style, spellName: 'ブリザード', description: '氷属性上位魔法(氷属性50%以上)' }
      : { key: 'frost_needles', style, spellName: 'フロストニードル', description: '氷属性基本魔法(氷属性50%未満)' };
  }

  if (elementalOffense === 'thunder') {
    return elementalOffenseValue >= 1.5
      ? { key: 'lightning_barrage', style, spellName: 'ライトニングバラージ', description: '雷属性上位魔法(雷属性50%以上)' }
      : { key: 'thunder_bolts', style, spellName: 'サンダーボルト', description: '雷属性基本魔法(雷属性50%未満)' };
  }

  return { key: 'arcane_arrows', style, spellName: 'アルカナアロー', description: '無属性の基本魔法攻撃' };
}
