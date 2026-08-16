export const REST_HEAL_MIN_HP = 200;
export const REST_HEAL_MAX_HP_RATIO = 0.02;

// SpecRef: 5.1.1 | Party State Machine | state.rest
export function getRestHealPerStep(maxHp: number): number {
  const normalizedMaxHp = Math.max(1, Math.floor(maxHp));
  return Math.max(REST_HEAL_MIN_HP, Math.ceil(normalizedMaxHp * REST_HEAL_MAX_HP_RATIO));
}

// SpecRef: 5.1.1 | Step Progress behavior by state | state.rest
export function getRestInitialTotalSteps(currentHp: number, maxHp: number): number {
  const normalizedMaxHp = Math.max(1, Math.floor(maxHp));
  const normalizedCurrentHp = Math.max(0, Math.floor(currentHp));
  const missingHp = Math.max(0, normalizedMaxHp - normalizedCurrentHp);
  if (missingHp <= 0) return 1;
  return Math.max(1, Math.ceil(missingHp / getRestHealPerStep(normalizedMaxHp)));
}
