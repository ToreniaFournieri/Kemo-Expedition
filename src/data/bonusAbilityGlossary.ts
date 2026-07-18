import { t } from '../i18n';
import type { AbilityId } from '../types';

export type BonusAbilityGlossarySubcategoryId = 'passive' | 'expedition' | 'reactive' | 'timed';

type BonusAbilityGlossaryEntry = {
  abilityId: AbilityId;
  levelScale: string[];
  subcategory: BonusAbilityGlossarySubcategoryId;
  phase?: 'START' | 'LONG' | 'MID' | 'CLOSE' | 'END';
  priority?: number;
};

type LocalizedBonusAbilityGlossaryEntry = BonusAbilityGlossaryEntry & {
  label: string;
  description: string;
};

export const BONUS_ABILITY_GLOSSARY_ENTRIES: BonusAbilityGlossaryEntry[] = [
  { abilityId: 'iaigiri', levelScale: ['Lv1: x1.6', 'Lv2: x1.8', 'Lv3: x2.0'], subcategory: 'passive' },
  { abilityId: 'heavy_strike', levelScale: ['Lv1: +1%/回', 'Lv2: +1.5%/回'], subcategory: 'passive' },
  { abilityId: 'arcane_stability', levelScale: ['Lv1: 55%', 'Lv2: 60%'], subcategory: 'passive' },
  { abilityId: 'arc_magic', levelScale: ['Lv1: 3', 'Lv2: 3.6', 'Lv3: 4.2'], subcategory: 'passive' },
  { abilityId: 'melee_conversion', levelScale: ['Lv1: 30%・30%', 'Lv2: 40%・40%'], subcategory: 'passive' },
  { abilityId: 'hunter', levelScale: ['Lv1: 15%→10%', 'Lv2: 15%→7%', 'Lv3: 15%→5%'], subcategory: 'passive' },
  { abilityId: 'seeker', levelScale: ['Lv1: +0.50%', 'Lv2: +0.75%'], subcategory: 'passive' },
  { abilityId: 'cyborgization', levelScale: ['Lv1: 命中+30・回避-20', 'Lv2: 命中+40・回避-15'], subcategory: 'passive' },
  { abilityId: 'composure', levelScale: ['Lv1: +10%', 'Lv2: +13%'], subcategory: 'passive' },
  { abilityId: 'focus', levelScale: ['Lv1: x1.2', 'Lv2: x1.3'], subcategory: 'passive' },
  { abilityId: 'colossal', levelScale: [], subcategory: 'passive' },
  { abilityId: 'null_antagonism', levelScale: [], subcategory: 'passive' },
  { abilityId: 'equation_breaker', levelScale: [], subcategory: 'passive' },
  { abilityId: 'domain_breaker', levelScale: [], subcategory: 'passive' },
  { abilityId: 'wind_rider', levelScale: [], subcategory: 'passive' },
  { abilityId: 'siege', levelScale: [], subcategory: 'passive' },
  { abilityId: 'coldproof', levelScale: [], subcategory: 'passive' },
  { abilityId: 'dryproof', levelScale: [], subcategory: 'passive' },
  { abilityId: 'vine_cutter', levelScale: [], subcategory: 'passive' },
  { abilityId: 'mana_ward', levelScale: [], subcategory: 'passive' },
  { abilityId: 'defiance', levelScale: [], subcategory: 'passive' },
  { abilityId: 'fire_protect_breaker', levelScale: [], subcategory: 'passive' },
  { abilityId: 'ice_protect_breaker', levelScale: [], subcategory: 'passive' },
  { abilityId: 'thunder_protect_breaker', levelScale: [], subcategory: 'passive' },
  { abilityId: 'm_barrier_breaker', levelScale: [], subcategory: 'passive' },
  { abilityId: 'unforgettable', levelScale: [], subcategory: 'passive' },
  { abilityId: 'null_shock', levelScale: [], subcategory: 'passive' },
  { abilityId: 'anti_ambush', levelScale: [], subcategory: 'passive' },
  { abilityId: 'anti_overwatch', levelScale: [], subcategory: 'passive' },
  { abilityId: 'rage_breaker', levelScale: [], subcategory: 'passive' },
  { abilityId: 'momentum_breaker', levelScale: [], subcategory: 'passive' },
  { abilityId: 'execution_null', levelScale: [], subcategory: 'passive' },
  { abilityId: 'null_corrode', levelScale: [], subcategory: 'passive' },
  { abilityId: 'null_life_drain', levelScale: [], subcategory: 'passive' },
  { abilityId: 'null_death_touch', levelScale: [], subcategory: 'passive' },
  { abilityId: 'null_burn', levelScale: [], subcategory: 'passive' },
  { abilityId: 'null_bind', levelScale: [], subcategory: 'passive' },
  { abilityId: 'null_requiem', levelScale: [], subcategory: 'passive' },
  { abilityId: 'upgrade_all_abilities', levelScale: ['Lv1: +1', 'Lv2: +2', 'Lv3: +3', 'Lv4: +4'], subcategory: 'passive' },

  { abilityId: 'tithe', levelScale: ['Lv1: +10%', 'Lv2: +15%'], subcategory: 'expedition' },
  { abilityId: 'squander', levelScale: ['Lv1: x1.3', 'Lv2: x1.5'], subcategory: 'expedition' },
  { abilityId: 'prophecy', levelScale: ['Lv1: 可視化', 'Lv2: 可視化＋リセット'], subcategory: 'expedition' },
  { abilityId: 'cunning', levelScale: ['Lv1: x1.2', 'Lv2: x1.3'], subcategory: 'expedition' },
  { abilityId: 'peddler', levelScale: ['Lv1: x2/3', 'Lv2: x3/5'], subcategory: 'expedition' },

  { abilityId: 'resonance', levelScale: ['Lv1: +4%', 'Lv2: +7%', 'Lv3: +9%', 'Lv4: +11%', 'Lv5: +12%'], subcategory: 'reactive' },
  { abilityId: 'ambush', levelScale: ['Lv1: x1.3', 'Lv2: x1.5', 'Lv3: x1.6', 'Lv4: x1.65', 'Lv5: x1.68'], subcategory: 'reactive' },
  { abilityId: 'overwatch', levelScale: ['Lv1: x1.3', 'Lv2: x1.5', 'Lv3: x1.6', 'Lv4: x1.65', 'Lv5: x1.68'], subcategory: 'reactive' },
  { abilityId: 'execution', levelScale: ['Lv1: 40%・x1.5', 'Lv2: 50%・x1.8'], subcategory: 'reactive' },
  { abilityId: 'rage', levelScale: ['Lv1: +0.5%', 'Lv2: +0.6%'], subcategory: 'reactive' },
  { abilityId: 'momentum', levelScale: ['Lv1: -0.5%', 'Lv2: -0.4%'], subcategory: 'reactive' },
  { abilityId: 'no_offense', levelScale: [], subcategory: 'reactive' },
  { abilityId: 'swarm', levelScale: ['Lv1: 失ったHP1%につき0.5%'], subcategory: 'reactive' },
  { abilityId: 'stealth', levelScale: ['Lv1: 24%', 'Lv2: 29%'], subcategory: 'reactive' },
  { abilityId: 'illusion', levelScale: ['Lv1: 自身', 'Lv2: パーティー全体'], subcategory: 'reactive' },
  // SpecRef: 1.1 | CONSTANTS_GLOSSARY | a.flying
  { abilityId: 'flying', levelScale: ['Lv1: 40', 'Lv2: 45', 'Lv3: 50'], subcategory: 'timed', phase: 'CLOSE', priority: 9 },
  { abilityId: 'bulwark', levelScale: ['Lv1: 遠距離', 'Lv2: 遠距離＋近距離'], subcategory: 'reactive' },
  { abilityId: 'shock', levelScale: [], subcategory: 'reactive' },
  { abilityId: 're_attack', levelScale: ['Lv1: x0.5', 'Lv2: x0.7', 'Lv3: x1.0'], subcategory: 'reactive' },
  { abilityId: 'corrode', levelScale: ['Lv1: x6/7', 'Lv2: x5/7', 'Lv3: x4/7', 'Lv4: x3/7', 'Lv5: x2/7'], subcategory: 'reactive' },
  { abilityId: 'life_drain', levelScale: ['Lv1: 0.1%', 'Lv2: 0.3%', 'Lv3: 1%', 'Lv4: 3%', 'Lv5: 10%', 'Lv6: 30%', 'Lv7: 100%'], subcategory: 'reactive' },
  { abilityId: 'death_touch', levelScale: ['Lv1: 2/256', 'Lv2: 3/256', 'Lv3: 4/256', 'Lv4: 5/256', 'Lv5: 6/256'], subcategory: 'reactive' },
  { abilityId: 'burn', levelScale: ['Lv1: 0.5%', 'Lv2: 0.9%', 'Lv3: 1.2%', 'Lv4: 1.4%', 'Lv5: 1.5%'], subcategory: 'reactive' },
  { abilityId: 'bind', levelScale: ['Lv1: 2/64', 'Lv2: 3/64', 'Lv3: 4/64', 'Lv4: 5/64', 'Lv5: 6/64'], subcategory: 'reactive' },
  { abilityId: 'counter', levelScale: ['Lv1: x0.5', 'Lv2: x1.0', 'Lv3: x2.0'], subcategory: 'reactive' },
  { abilityId: 'magical_counter', levelScale: ['Lv1: x0.5', 'Lv2: x1.0'], subcategory: 'reactive' },
  { abilityId: 'resurrect', levelScale: ['Lv1: 1', 'Lv2: 1%'], subcategory: 'reactive' },
  { abilityId: 'reanimate', levelScale: ['Lv1: 20%', 'Lv2: 26%', 'Lv3: 31%', 'Lv4: 35%', 'Lv5: 38%'], subcategory: 'reactive' },
  { abilityId: 'requiem', levelScale: [], subcategory: 'reactive' },
  { abilityId: 're_counter', levelScale: ['Lv1: x0.5', 'Lv2: x1.0'], subcategory: 'reactive' },
  { abilityId: 'null_counter', levelScale: ['Lv1: 1', 'Lv2: 2', 'Lv3: 3'], subcategory: 'reactive' },
  { abilityId: 'covering_fire', levelScale: ['Lv1: x0.5', 'Lv2: x1.0'], subcategory: 'reactive' },

  { abilityId: 'oblivion', levelScale: [], subcategory: 'timed' },
  { abilityId: 'fading_memory', levelScale: [], subcategory: 'timed', phase: 'START', priority: 8 },
  { abilityId: 'mimic', levelScale: [], subcategory: 'timed' },
  { abilityId: 'defender', levelScale: ['Lv1: x2/3', 'Lv2: x3/5', 'Lv3: x1/2'], subcategory: 'timed' },
  { abilityId: 'command', levelScale: ['Lv1: x1.4', 'Lv2: x1.5', 'Lv3: x1.6'], subcategory: 'timed' },
  { abilityId: 'm_barrier', levelScale: ['Lv1: x2/3', 'Lv2: x3/5', 'Lv3: x1/2'], subcategory: 'timed' },
  { abilityId: 'ice_absorb', levelScale: ['Lv1: 1/10', 'Lv2: 3/10', 'Lv3: 5/10', 'Lv4: 7/10', 'Lv5: 100%'], subcategory: 'timed' },
  { abilityId: 'fire_absorb', levelScale: ['Lv1: 1/10', 'Lv2: 3/10', 'Lv3: 5/10', 'Lv4: 7/10', 'Lv5: 100%'], subcategory: 'timed' },
  { abilityId: 'thunder_absorb', levelScale: ['Lv1: 1/10', 'Lv2: 3/10', 'Lv3: 5/10', 'Lv4: 7/10', 'Lv5: 100%'], subcategory: 'timed' },
  { abilityId: 'magical_absorb', levelScale: ['Lv1: 1/10', 'Lv2: 3/10', 'Lv3: 5/10', 'Lv4: 7/10', 'Lv5: 100%'], subcategory: 'timed' },
  { abilityId: 'ice_null', levelScale: [], subcategory: 'timed' },
  { abilityId: 'fire_null', levelScale: [], subcategory: 'timed' },
  { abilityId: 'thunder_null', levelScale: [], subcategory: 'timed' },
  { abilityId: 'magical_null', levelScale: [], subcategory: 'timed' },
  { abilityId: 'ranged_null', levelScale: [], subcategory: 'timed' },
  { abilityId: 'melee_null', levelScale: [], subcategory: 'timed' },
  { abilityId: 'ice_reflect', levelScale: ['Lv1: 反射5%・被弾95%', 'Lv2: 反射10%・被弾90%', 'Lv3: 反射20%・被弾80%', 'Lv4: 反射35%・被弾65%', 'Lv5: 反射50%・被弾50%'], subcategory: 'timed' },
  { abilityId: 'fire_reflect', levelScale: ['Lv1: 反射5%・被弾95%', 'Lv2: 反射10%・被弾90%', 'Lv3: 反射20%・被弾80%', 'Lv4: 反射35%・被弾65%', 'Lv5: 反射50%・被弾50%'], subcategory: 'timed' },
  { abilityId: 'thunder_reflect', levelScale: ['Lv1: 反射5%・被弾95%', 'Lv2: 反射10%・被弾90%', 'Lv3: 反射20%・被弾80%', 'Lv4: 反射35%・被弾65%', 'Lv5: 反射50%・被弾50%'], subcategory: 'timed' },
  { abilityId: 'magical_reflect', levelScale: ['Lv1: 反射5%・被弾95%', 'Lv2: 反射10%・被弾90%', 'Lv3: 反射20%・被弾80%', 'Lv4: 反射35%・被弾65%', 'Lv5: 反射50%・被弾50%'], subcategory: 'timed' },
  { abilityId: 'ranged_reflect', levelScale: ['Lv1: 反射5%・被弾95%', 'Lv2: 反射10%・被弾90%', 'Lv3: 反射20%・被弾80%', 'Lv4: 反射35%・被弾65%', 'Lv5: 反射50%・被弾50%'], subcategory: 'timed' },
  { abilityId: 'melee_reflect', levelScale: ['Lv1: 反射5%・被弾95%', 'Lv2: 反射10%・被弾90%', 'Lv3: 反射20%・被弾80%', 'Lv4: 反射35%・被弾65%', 'Lv5: 反射50%・被弾50%'], subcategory: 'timed' },
  { abilityId: 'deflection', levelScale: ['Lv1: -10%', 'Lv2: -15%'], subcategory: 'timed' },
  { abilityId: 'mutual_magic_amplify', levelScale: ['Lv1: x1.3', 'Lv2: x1.5', 'Lv3: x1.6', 'Lv4: x1.65', 'Lv5: x1.68'], subcategory: 'timed' },
  { abilityId: 'mutual_magic_restraint', levelScale: ['Lv1: x0.77', 'Lv2: x0.67', 'Lv3: x0.63', 'Lv4: x0.61', 'Lv5: x0.59'], subcategory: 'timed' },
  { abilityId: 'mutual_physical_amplify', levelScale: ['Lv1: x1.3', 'Lv2: x1.5', 'Lv3: x1.6', 'Lv4: x1.65', 'Lv5: x1.68'], subcategory: 'timed' },
  { abilityId: 'mutual_physical_restraint', levelScale: ['Lv1: x0.77', 'Lv2: x0.67', 'Lv3: x0.63', 'Lv4: x0.61', 'Lv5: x0.59'], subcategory: 'timed' },
  { abilityId: 'magic_seal', levelScale: [], subcategory: 'timed' },
  { abilityId: 'first_strike', levelScale: ['Lv1: 少し(2~6)', 'Lv2: とても(3~9)', 'Lv3: 極めて(4~9)'], subcategory: 'timed' },
  { abilityId: 'slow', levelScale: ['Lv1: -1', 'Lv2: -2', 'Lv3: -3'], subcategory: 'timed' },
  { abilityId: 'boost', levelScale: ['Lv1: 1', 'Lv2: 2', 'Lv3: 3'], subcategory: 'timed' },
  { abilityId: 'frostbite', levelScale: ['Lv1: -1'], subcategory: 'timed' },
  { abilityId: 'howl', levelScale: ['Lv1: LONG2・x5/7', 'Lv2: LONG2・x4/7', 'Lv3: LONG2・x3/7', 'Lv4: LONG2・x2/7', 'Lv5: LONG2・x1/7'], subcategory: 'timed' },
  { abilityId: 'ranged_confusion', levelScale: ['Lv1: LONG1・1/32', 'Lv2: LONG1・3/32', 'Lv3: LONG2・3/32', 'Lv4: LONG2・5/32', 'Lv5: LONG2・7/32'], subcategory: 'timed' },
  { abilityId: 'magic_confusion', levelScale: ['Lv1: MID1・1/32', 'Lv2: MID1・3/32', 'Lv3: MID2・3/32', 'Lv4: MID2・5/32', 'Lv5: MID2・7/32'], subcategory: 'timed' },
  { abilityId: 'melee_confusion', levelScale: ['Lv1: CLOSE1・1/32', 'Lv2: CLOSE1・3/32', 'Lv3: CLOSE2・3/32', 'Lv4: CLOSE2・5/32', 'Lv5: CLOSE2・7/32'], subcategory: 'timed' },
  { abilityId: 'unstable_core', levelScale: ['Lv1: LONG0/MID0・30%', 'Lv2: LONG0/MID0・24%', 'Lv3: LONG0/MID0・19%', 'Lv4: LONG0/MID0・15%', 'Lv5: LONG0/MID0・12%'], subcategory: 'timed' },
  { abilityId: 'soul_reap', levelScale: ['Lv1: 10%', 'Lv2: 14%', 'Lv3: 17%', 'Lv4: 19%', 'Lv5: 20%'], subcategory: 'timed' },
  { abilityId: 'regeneration', levelScale: ['Lv1: 10%', 'Lv2: 15%', 'Lv3: 19%', 'Lv4: 22%', 'Lv5: 24%'], subcategory: 'timed' },
  { abilityId: 'predator_sense', levelScale: ['Lv1: 30%', 'Lv2: 38%', 'Lv3: 44%', 'Lv4: 48%', 'Lv5: 50%'], subcategory: 'timed' },
  { abilityId: 'decompose', levelScale: ['Lv1: CLOSE2・x6/7', 'Lv2: CLOSE2・x5/7', 'Lv3: CLOSE2・x4/7', 'Lv4: CLOSE2・x3/7', 'Lv5: CLOSE2・x2/7'], subcategory: 'timed' },
  { abilityId: 'self_destruct', levelScale: ['Lv1: CLOSE2・1/10', 'Lv2: CLOSE2・3/10', 'Lv3: CLOSE2・5/10', 'Lv4: CLOSE2・7/10', 'Lv5: CLOSE2・100%'], subcategory: 'timed' },
  { abilityId: 'free', levelScale: ['Lv1: CLOSE1', 'Lv2: CLOSE2', 'Lv3: CLOSE3', 'Lv4: MID1', 'Lv5: MID2'], subcategory: 'timed' },
  { abilityId: 'auriferous', levelScale: [], subcategory: 'timed' },
  { abilityId: 'first_aid', levelScale: ['Lv1: 2%', 'Lv2: 3%', 'Lv3: 4%', 'Lv4: 5%', 'Lv5: 6%'], subcategory: 'timed', phase: 'END', priority: 4 },
];


function bonusAbilityTranslationKey(abilityId: AbilityId, field: 'label' | 'description'): string {
  return `ability.${abilityId}.${field}`;
}

export function getBonusAbilityLabel(abilityId: AbilityId): string {
  return t(bonusAbilityTranslationKey(abilityId, 'label'));
}

export function getBonusAbilityDescription(abilityId: AbilityId): string {
  return t(bonusAbilityTranslationKey(abilityId, 'description'));
}

export const LOCALIZED_BONUS_ABILITY_GLOSSARY_ENTRIES: LocalizedBonusAbilityGlossaryEntry[] = BONUS_ABILITY_GLOSSARY_ENTRIES.map((entry) => ({
  ...entry,
  get label() {
    return getBonusAbilityLabel(entry.abilityId);
  },
  get description() {
    return getBonusAbilityDescription(entry.abilityId);
  },
}));

export const BONUS_ABILITY_GLOSSARY_ENTRY_BY_ABILITY_ID = new Map(
  LOCALIZED_BONUS_ABILITY_GLOSSARY_ENTRIES.map((entry) => [entry.abilityId, entry]),
);

