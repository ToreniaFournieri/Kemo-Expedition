const CONDITION_MIN = -400;
const CONDITION_MAX = 400;

export const FREE_ACTION_BASE_STEP_COUNT = 40;

// SpecRef: 5.1.1 | Step Progress behavior by state | state.free_action
// SpecRef: 7.1.2 | AUTO progress logic | condition
export function getFreeActionStepCount(condition: number): number {
  const normalizedCondition = Number.isFinite(condition)
    ? Math.max(CONDITION_MIN, Math.min(CONDITION_MAX, condition))
    : 0;

  return FREE_ACTION_BASE_STEP_COUNT + Math.round(normalizedCondition / 10);
}
