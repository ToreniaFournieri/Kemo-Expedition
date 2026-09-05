export interface ProphecyControlAccess {
  readonly isVisible: boolean;
  readonly canResetBags: boolean;
}

// SpecRef: 5.1.1 | Party State Machine | Peddler travel duration modifier.
export function getPeddlerTravelDurationMs(baseDurationMs: number, peddlerLevel: number): number {
  const multiplier = peddlerLevel >= 2 ? 3 / 5 : peddlerLevel >= 1 ? 2 / 3 : 1;
  return Math.max(100, Math.ceil(baseDurationMs * multiplier));
}

// SpecRef: 8.6 | UI_SETTING | Prophecy/Clairvoyance access.
export function getProphecyControlAccess(
  prophecyLevel: number,
  debugOverride: boolean,
): ProphecyControlAccess {
  return {
    isVisible: debugOverride || prophecyLevel >= 1,
    canResetBags: debugOverride || prophecyLevel >= 2,
  };
}
