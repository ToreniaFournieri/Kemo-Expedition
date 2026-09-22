// SpecRef: 8.1.2 | Header | Speed of Time
// SpecRef: 9.1.4.7 | Observation projections | overview
// Mirrors the wire shape of `read/observation/overview`'s `headerInfo` (src/api/v1/readModels.ts, overviewProjection).

export interface HeaderProjection {
  readonly gameMode: 'mode.normal' | 'mode.orca';
  readonly inGameTime: string;
  readonly gold: number;
  readonly prana: number;
  readonly environment: string;
  readonly unreadDiary: number;
  readonly speedOfTime: {
    readonly base: 'real' | 'x1.2' | 'x5' | 'x20' | 'x100' | 'unlimited';
    readonly scale: number;
    readonly bonusActive: boolean;
    readonly bonusUntil: string | null;
  } | null;
  readonly autoRepeat: boolean | null;
  readonly progressReportInfo: { readonly available: boolean; readonly bonusActive: boolean };
}

export interface HeaderView {
  readonly gold: number;
  readonly speedOfTimeSymbol: string;
  /** `null` when the label has no mode-speed suffix (only a hour count, or nothing). */
  readonly speedOfTimeModeLabel: 'x5' | 'x6' | null;
  readonly speedOfTimeUnlimited: boolean;
  /** Hours remaining in the Report Progress bonus, or `null` when no bonus is active. Format with `formatNumber`. */
  readonly remainingBonusHours: number | null;
  readonly autoRepeatPaused: boolean;
}

/**
 * Ports the header's existing Speed-of-Time symbol/label logic verbatim (previously derived from local debug-settings
 * refs), re-keyed to the projected facts so the visible label/symbol, including the orca-mode `x5`→`x6` bonus case,
 * is unchanged. Returns the label's ingredients rather than a formatted string, so the caller applies `formatNumber`
 * (a display helper, not API-layer logic) to the hour count.
 */
export function buildHeaderView(header: HeaderProjection | null, nowMs: number): HeaderView {
  const speedOfTime = header?.speedOfTime ?? null;
  const bonusActive = speedOfTime?.bonusActive ?? false;
  const bonusUntilMs = speedOfTime?.bonusUntil ? Date.parse(speedOfTime.bonusUntil) : null;
  const remainingBonusHours = bonusActive && bonusUntilMs !== null
    ? Math.max(0, Math.ceil((bonusUntilMs - nowMs) / (60 * 60 * 1000)))
    : null;

  const speedOfTimeSymbol = !bonusActive && speedOfTime?.base !== 'x1.2' && speedOfTime?.base !== 'unlimited' ? '▷' : '▶︎';
  const speedOfTimeModeLabel = header?.gameMode === 'mode.orca' && speedOfTime?.base === 'x5' ? (bonusActive ? 'x6' : 'x5') : null;

  return {
    gold: header?.gold ?? 0,
    speedOfTimeSymbol,
    speedOfTimeModeLabel,
    speedOfTimeUnlimited: speedOfTime?.base === 'unlimited',
    remainingBonusHours,
    autoRepeatPaused: header?.autoRepeat === false,
  };
}
