import { ElementalOffense, MagicStyle } from '../types';
import { t } from '../i18n';

interface MagicProfile {
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

// SpecRef: 2.1.1.2 | Multiplier and Functions | resolveMagicProfile
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
      spellName: t('auto.jp.76fefcdce9'),
      description: magicalNoA >= 20
        ? t('auto.jp.42c56b8aae')
        : t('auto.jp.47712a2460'),
    };
  }

  if (style === 'arc-magic') {
    if (elementalOffense === 'fire') {
      return { key: 'pyroclasm', style, spellName: t('auto.jp.19007f48b4'), description: t('auto.jp.1a93bf7ef6') };
    }
    if (elementalOffense === 'ice') {
      return { key: 'glacial-burst', style, spellName: t('auto.jp.aba5a6f432'), description: t('auto.jp.89077a98ea') };
    }
    if (elementalOffense === 'thunder') {
      return { key: 'tempest-nova', style, spellName: t('auto.jp.68b56c6c08'), description: t('auto.jp.ca4a78f01b') };
    }

    return { key: 'astral-flare', style, spellName: t('auto.jp.2806705bb2'), description: t('auto.jp.9ad999c153') };
  }

  if (elementalOffense === 'fire') {
    return elementalOffenseValue >= 1.5
      ? { key: 'hellfire-volley', style, spellName: t('auto.jp.60c93cd371'), description: t('auto.jp.220c05256a') }
      : { key: 'fire-lance', style, spellName: t('auto.jp.c90ba3384d'), description: t('auto.jp.8ad205522b') };
  }

  if (elementalOffense === 'ice') {
    return elementalOffenseValue >= 1.5
      ? { key: 'blizzard', style, spellName: t('auto.jp.3f85e740d9'), description: t('auto.jp.2a56475b1a') }
      : { key: 'frost-needles', style, spellName: t('auto.jp.d2e94d10a7'), description: t('auto.jp.bb1fa11a42') };
  }

  if (elementalOffense === 'thunder') {
    return elementalOffenseValue >= 1.5
      ? { key: 'lightning-barrage', style, spellName: t('auto.jp.015779cc22'), description: t('auto.jp.239f512dae') }
      : { key: 'thunder-bolts', style, spellName: t('auto.jp.3a0709bb4d'), description: t('auto.jp.2792a5ac98') };
  }

  return { key: 'arcane-arrows', style, spellName: t('auto.jp.92bf5f54c3'), description: t('auto.jp.2f8efe880d') };
}
