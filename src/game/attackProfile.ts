import type { AttackType } from '../types';

export type AttackRollProfile = Readonly<{
  diceCount: number;
  dieSize: number;
  minimum: number;
  maximum: number;
}>;

export type AttackRollProfiles = Readonly<Record<AttackType, Readonly<{ diceCount: number; dieSize: number }>>>;

const ATTACK_ROLL_DICE: AttackRollProfiles = {
  ranged: { diceCount: 4, dieSize: 3 },
  magical: { diceCount: 3, dieSize: 3 },
  melee: { diceCount: 1, dieSize: 3 },
};

// SpecRef: 6.1.1.2 | Combat phase | Speed & Turn Order (Rolling Dice Rule)
export function getAttackRollProfile(
  attackType: AttackType,
  profiles: AttackRollProfiles = ATTACK_ROLL_DICE,
): AttackRollProfile {
  const { diceCount, dieSize } = profiles[attackType];
  return {
    diceCount,
    dieSize,
    minimum: diceCount,
    maximum: diceCount * dieSize,
  };
}

export function rollAttackSpeedDice(
  profile: Pick<AttackRollProfile, 'diceCount' | 'dieSize'>,
  random: () => number = Math.random,
  extraDiceCount = 0,
): number {
  let total = 0;
  for (let i = 0; i < profile.diceCount + extraDiceCount; i++) {
    total += Math.floor(random() * profile.dieSize) + 1;
  }
  return total;
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

// SpecRef: 8.2.2 | Party member details | Status pane attack-speed help
export function formatAttackSpeedHelp(
  attackType: AttackType,
  translate: Translate,
  profiles: AttackRollProfiles = ATTACK_ROLL_DICE,
): string {
  const profile = getAttackRollProfile(attackType, profiles);
  return translate('combat.attackSpeed.template', {
    label: translate(`combat.attackSpeed.${attackType}`),
    minimum: profile.minimum,
    maximum: profile.maximum,
    diceCount: profile.diceCount,
    dieSize: profile.dieSize,
  });
}
