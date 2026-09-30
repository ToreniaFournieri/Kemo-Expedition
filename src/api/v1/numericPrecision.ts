// SpecRef: 9.1.4.14 | Numeric precision | ratios are published at the precision the UI shows them, without float tails
// Most ratios show as `x0.00` or a whole percent (2 decimals); accuracy and evasion show in thousandths (`+15`, `92.3%`).
const THOUSANDTHS = new Set(['f.c_accuracy', 'f.accuracy_decay', 'c.accuracy', 'c.evasion']);

/** A ratio fact or bonus, rounded to the precision the status pane or Bestiary bubble shows for `key`. */
export function roundRatio(key: string, value: number): number {
  const scale = THOUSANDTHS.has(key) ? 1000 : 100;
  return Math.round(value * scale) / scale;
}

/** A battle-event value: integers pass through, a fractional value (e.g. Howl's 5/7) is rounded to 3 decimals. */
export function roundEventValue(value: number): number {
  return Number.isInteger(value) ? value : Math.round(value * 1000) / 1000;
}
