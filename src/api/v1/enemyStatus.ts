import { getEnemyDropCandidates } from '../../data/enemies.ts';
import type { EnemyDef } from '../../types/index.ts';
import { describeBonuses } from './itemDetails.ts';
import { roundRatio } from './numericPrecision.ts';

// SpecRef: 8.6 | UI_SETTING | Bestiary (敵キャラクター図鑑)
// SpecRef: 9.1.3 | Read | 2-2-2 {p}/latestBattleLog (bottleneckEnemies)
// The public status of one enemy as the Bestiary bubble shows it: raw numeric facts (never localized text), so any client
// formats them in its own language. Used by the retained battle log and, later, the Bestiary resource.

export interface EnemyStatusFact { key: string; value: number; unit: 'number' | 'ratio' }

export interface EnemyStatus {
  enemyId: number;
  /** The canonical name (a proper noun, kept as authored) and its translation key when one exists. */
  name: string;
  nameKey: string | null;
  /** Effective enemy level for the room the enemy was met in; null when it cannot be derived (a legacy record). */
  level: number | null;
  enemyType: string;
  tier: 'normal' | 'elite' | 'boss' | 'divine';
  mainClass: string;
  /** `null` when the enemy has no sub class; equal to `mainClass` for a master class. */
  subClass: string | null;
  hp: number;
  magicStyle: string | null;
  stats: EnemyStatusFact[];
  abilities: { abilityId: string; level: number }[];
  ability: string[];
  cBonus: string[];
  otherBonus: string[];
  /** Item IDs the enemy can drop (Spec 4.2.2), in master-data order. */
  dropItemIds: number[];
}

export function buildEnemyStatus(enemy: EnemyDef, level: number | null): EnemyStatus {
  const stats: EnemyStatusFact[] = [];
  // SpecRef: 9.1.4.14 | Numeric precision | ratio stats at the Bestiary bubble's precision (`x0.64`, not `0.6400000000000001`)
  const add = (key: string, value: number, unit: EnemyStatusFact['unit'] = 'number') => stats.push({ key, value: unit === 'ratio' ? roundRatio(key, value) : value, unit });
  add('d.ranged_attack', enemy.rangedAttack); add('d.ranged_NoA', enemy.rangedNoA); add('d.ranged_attack_amplifier', enemy.rangedAttackAmplifier, 'ratio');
  add('d.magical_attack', enemy.magicalAttack); add('d.magical_NoA', enemy.magicalNoA); add('d.magical_attack_amplifier', enemy.magicalAttackAmplifier, 'ratio');
  add('d.melee_attack', enemy.meleeAttack); add('d.melee_NoA', enemy.meleeNoA); add('d.melee_attack_amplifier', enemy.meleeAttackAmplifier, 'ratio');
  add('d.physical_defense', enemy.physicalDefense); add('d.magical_defense', enemy.magicalDefense);
  add('f.physical_defense_amplifier', enemy.physicalDefenseAmplifier, 'ratio'); add('f.magical_defense_amplifier', enemy.magicalDefenseAmplifier, 'ratio');
  add('c.accuracy', enemy.accuracyBonus, 'ratio'); add('c.evasion', enemy.evasionBonus, 'ratio');
  add(`e.${enemy.elementalOffense}`, enemy.elementalOffenseValue, 'ratio');
  add('r.fire', enemy.elementalResistance.fire, 'ratio'); add('r.ice', enemy.elementalResistance.ice, 'ratio'); add('r.thunder', enemy.elementalResistance.thunder, 'ratio');
  add('d.experience', enemy.experience);
  const details = describeBonuses(enemy.bonuses ?? []);
  const subClass = enemy.enemySubClass && enemy.enemySubClass !== 'none' ? enemy.enemySubClass : null;
  return {
    enemyId: enemy.id,
    name: enemy.name,
    nameKey: enemy.nameKey ?? null,
    level,
    enemyType: enemy.enemyType,
    tier: enemy.isGodEnemy ? 'divine' : enemy.type,
    mainClass: enemy.enemyClass,
    subClass,
    hp: enemy.hp,
    magicStyle: enemy.magicStyle ?? null,
    stats,
    abilities: enemy.abilities.filter((ability) => ability.level >= 1).map((ability) => ({ abilityId: `a.${ability.id.replace(/_/g, '-')}`, level: ability.level })),
    ability: details.ability,
    cBonus: details.cBonus,
    otherBonus: details.otherBonus,
    // An older retained snapshot may predate `itemIds`; it then has no drop candidates.
    dropItemIds: getEnemyDropCandidates({ ...enemy, itemIds: enemy.itemIds ?? [] }).map((item) => item.id),
  };
}

const ENEMY_SNAPSHOT_KEYS = [
  'id', 'type', 'enemyType', 'spawnTier', 'spawnPool', 'poolId', 'name', 'nameKey', 'enemyClass', 'enemySubClass', 'abilities', 'bonuses', 'accuracyBonus', 'evasionBonus', 'hp',
  'rangedAttack', 'rangedNoA', 'magicalAttack', 'magicalNoA', 'magicStyle', 'meleeAttack', 'meleeNoA', 'rangedAttackAmplifier', 'magicalAttackAmplifier', 'meleeAttackAmplifier',
  'physicalDefense', 'magicalDefense', 'elementalOffense', 'elementalOffenseValue', 'elementalResistance', 'physicalDefenseAmplifier', 'magicalDefenseAmplifier', 'experience',
  'itemIds', 'isGodEnemy', 'image_path',
] as const;

const SNAPSHOT_RATIO_KEYS: [string, string][] = [
  ['rangedAttackAmplifier', 'd.ranged_attack_amplifier'], ['magicalAttackAmplifier', 'd.magical_attack_amplifier'], ['meleeAttackAmplifier', 'd.melee_attack_amplifier'],
  ['physicalDefenseAmplifier', 'f.physical_defense_amplifier'], ['magicalDefenseAmplifier', 'f.magical_defense_amplifier'],
  ['accuracyBonus', 'c.accuracy'], ['evasionBonus', 'c.evasion'], ['elementalOffenseValue', 'e.value'],
];

/**
 * The enemy as it was met, in the public shape the Bestiary bubble renders from (Spec 9.1.3, 2-2-2 `resources`). Only the
 * documented members are published: an older retained snapshot may carry members that no longer exist, and they are dropped.
 */
export function publicEnemySnapshot(enemy: EnemyDef): EnemyDef {
  const source = enemy as unknown as Record<string, unknown>;
  const snapshot = Object.fromEntries(ENEMY_SNAPSHOT_KEYS.filter((key) => source[key] !== undefined).map((key) => [key, source[key]])) as Record<string, unknown>;
  // The scaled ratio members are published at the Bestiary bubble's precision, like `EnemyStatus.stats`.
  for (const [member, key] of SNAPSHOT_RATIO_KEYS) {
    if (typeof snapshot[member] === 'number') snapshot[member] = roundRatio(key, snapshot[member] as number);
  }
  const resistance = snapshot.elementalResistance as Record<string, number> | undefined;
  if (resistance) snapshot.elementalResistance = Object.fromEntries(Object.entries(resistance).map(([element, value]) => [element, typeof value === 'number' ? roundRatio(`r.${element}`, value) : value]));
  return snapshot as unknown as EnemyDef;
}
