import { AbilityId, ElementalOffense, MagicStyle } from '../types';
import { t } from '../i18n';

interface MagicProfile {
  key: string;
  style: MagicStyle;
  spellName: string;
  description: string;
}

interface ResolveMagicProfileParams {
  style?: MagicStyle;
  specialMagic?: SpecialMagicKey | null;
  elementalOffense: ElementalOffense;
  elementalOffenseValue?: number;
  magicalNoA?: number;
}

export type SpecialMagicKey = 'gravity_well' | 'armor_break' | 'mana_break';

const MAGIC_STYLE_LABEL_KEYS: Record<MagicStyle, string> = {
  'multi-hit': 'magic.style.multiHit',
  'arc-magic': 'ability.arc_magic.label',
  percentage_damage: 'magic.style.percentageDamage',
  debuff: 'magic.style.debuff',
};

export function getMagicStyleLabel(style: MagicStyle): string {
  return t(MAGIC_STYLE_LABEL_KEYS[style]);
}

const SPECIAL_MAGIC_THRESHOLDS: Readonly<Record<SpecialMagicKey, number>> = {
  gravity_well: 20,
  armor_break: 12,
  mana_break: 10,
};

export function isSpecialMagicCastable(specialMagic: SpecialMagicKey, magicalNoA: number): boolean {
  return magicalNoA >= SPECIAL_MAGIC_THRESHOLDS[specialMagic];
}

// SpecRef: 6.1.4.1 | Special attack | Priority
export function resolveSpecialMagicFromAbilities(
  abilities: ReadonlyArray<{ id: AbilityId; level: number }>,
  magicalNoA: number,
): SpecialMagicKey | null {
  if (isSpecialMagicCastable('gravity_well', magicalNoA)
    && abilities.some((ability) => ability.id === 'gravity_well' && ability.level > 0)) return 'gravity_well';
  if (isSpecialMagicCastable('armor_break', magicalNoA)
    && abilities.some((ability) => ability.id === 'armor_break' && ability.level > 0)) return 'armor_break';
  if (isSpecialMagicCastable('mana_break', magicalNoA)
    && abilities.some((ability) => ability.id === 'mana_break' && ability.level > 0)) return 'mana_break';
  return null;
}

// SpecRef: 2.1.1.2 | Multiplier and Functions | resolveMagicProfile
export function resolveMagicProfile({
  style = 'multi-hit',
  specialMagic = null,
  elementalOffense,
  elementalOffenseValue = 1.0,
  magicalNoA = 0,
}: ResolveMagicProfileParams): MagicProfile {
  if (specialMagic === 'gravity_well' || style === 'percentage_damage') {
    return {
      key: 'gravity_well',
      style,
      spellName: t('magic.gravityWell.name'),
      description: magicalNoA >= 20
        ? t('magic.gravityWell.description')
        : t('magic.gravityWell.lockedDescription'),
    };
  }

  if (specialMagic === 'armor_break') {
    return {
      key: 'armor_break',
      style: 'debuff',
      spellName: t('magic.armorBreak.name'),
      description: t('magic.armorBreak.description'),
    };
  }

  if (specialMagic === 'mana_break') {
    return {
      key: 'mana_break',
      style: 'debuff',
      spellName: t('magic.manaBreak.name'),
      description: t('magic.manaBreak.description'),
    };
  }

  if (style === 'arc-magic') {
    if (elementalOffense === 'fire') {
      return { key: 'pyroclasm', style, spellName: t('magic.pyroclasm.name'), description: t('magic.pyroclasm.description') };
    }
    if (elementalOffense === 'ice') {
      return { key: 'glacial-burst', style, spellName: t('magic.glacialBurst.name'), description: t('magic.glacialBurst.description') };
    }
    if (elementalOffense === 'thunder') {
      return { key: 'tempest-nova', style, spellName: t('magic.tempestNova.name'), description: t('magic.tempestNova.description') };
    }

    return { key: 'astral-flare', style, spellName: t('magic.astralFlare.name'), description: t('magic.astralFlare.description') };
  }

  if (elementalOffense === 'fire') {
    return elementalOffenseValue >= 1.5
      ? { key: 'hellfire-volley', style, spellName: t('magic.hellfire.name'), description: t('magic.hellfire.description') }
      : { key: 'fire-lance', style, spellName: t('magic.fireLance.name'), description: t('magic.fireLance.description') };
  }

  if (elementalOffense === 'ice') {
    return elementalOffenseValue >= 1.5
      ? { key: 'blizzard', style, spellName: t('magic.blizzard.name'), description: t('magic.blizzard.description') }
      : { key: 'frost-needles', style, spellName: t('magic.frostNeedle.name'), description: t('magic.frostNeedle.description') };
  }

  if (elementalOffense === 'thunder') {
    return elementalOffenseValue >= 1.5
      ? { key: 'lightning-barrage', style, spellName: t('magic.lightningBarrage.name'), description: t('magic.lightningBarrage.description') }
      : { key: 'thunder-bolts', style, spellName: t('magic.thunderbolt.name'), description: t('magic.thunderbolt.description') };
  }

  return { key: 'arcane-arrows', style, spellName: t('magic.arcanaArrow.name'), description: t('magic.arcanaArrow.description') };
}
