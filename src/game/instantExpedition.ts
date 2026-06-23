import type { Party } from '../types';

export const INSTANT_EXPEDITION_MAX_STOCK = 6;

const MINUTE_MS = 60 * 1000;

const INSTANT_EXPEDITION_CHARGE_DURATIONS_BY_CLEAR_TIER_MS = [
  [1 * MINUTE_MS, 2 * MINUTE_MS, 4 * MINUTE_MS],
  [2 * MINUTE_MS, 4 * MINUTE_MS, 8 * MINUTE_MS, 15 * MINUTE_MS],
  [4 * MINUTE_MS, 8 * MINUTE_MS, 15 * MINUTE_MS, 30 * MINUTE_MS, 60 * MINUTE_MS],
  [8 * MINUTE_MS, 16 * MINUTE_MS, 30 * MINUTE_MS, 60 * MINUTE_MS, 120 * MINUTE_MS, 240 * MINUTE_MS],
] as const;

export interface InstantExpeditionChargeState {
  stock: number;
  chargeStartedAt: number | null;
  remainingMs: number;
  nextChargeDurationMs: number | null;
}

export interface InstantExpeditionChargeDisplay {
  cells: string;
  timerText: string;
  label: string;
}

const instantExpeditionMinuteFormatter = new Intl.NumberFormat('ja-JP');

type InstantExpeditionChargeParty = Pick<Party, 'instantExpeditionStock' | 'instantExpeditionChargeStartedAt'>
  & Partial<Pick<Party, 'defeatedBossExpeditions'>>;

function getClearedExpeditionTier(
  defeatedBossExpeditions: Pick<Party, 'defeatedBossExpeditions'>['defeatedBossExpeditions'] | undefined,
): number {
  if (!defeatedBossExpeditions) return 0;
  return [1, 2, 3].reduce((tier, expeditionId) => (defeatedBossExpeditions[expeditionId] ? tier + 1 : tier), 0);
}

function getChargeDurationsMs(
  defeatedBossExpeditions: Pick<Party, 'defeatedBossExpeditions'>['defeatedBossExpeditions'] | undefined,
): readonly number[] {
  const clearedTier = Math.max(0, Math.min(3, getClearedExpeditionTier(defeatedBossExpeditions)));
  return INSTANT_EXPEDITION_CHARGE_DURATIONS_BY_CLEAR_TIER_MS[clearedTier];
}

function normalizeStock(raw: unknown, maxStock: number): number {
  return Math.max(0, Math.min(maxStock, Math.floor(typeof raw === 'number' && Number.isFinite(raw) ? raw : maxStock)));
}

function getChargeDurationMs(stock: number, chargeDurationsMs: readonly number[]): number | null {
  if (stock >= chargeDurationsMs.length) return null;
  return chargeDurationsMs[stock] ?? null;
}

// SpecRef: 8.3 | UI_EXPEDITION | Charge
export function getInstantExpeditionChargeState(
  party: InstantExpeditionChargeParty,
  now: number = Date.now(),
): InstantExpeditionChargeState {
  const chargeDurationsMs = getChargeDurationsMs(party.defeatedBossExpeditions);
  const maxStock = chargeDurationsMs.length;
  let stock = normalizeStock(party.instantExpeditionStock, maxStock);
  let chargeStartedAt = typeof party.instantExpeditionChargeStartedAt === 'number' && Number.isFinite(party.instantExpeditionChargeStartedAt)
    ? party.instantExpeditionChargeStartedAt
    : null;

  if (stock >= maxStock) {
    return {
      stock: maxStock,
      chargeStartedAt: null,
      remainingMs: 0,
      nextChargeDurationMs: null,
    };
  }

  if (chargeStartedAt === null) {
    chargeStartedAt = now;
  }

  let elapsedMs = Math.max(0, now - chargeStartedAt);
  while (stock < maxStock) {
    const durationMs = getChargeDurationMs(stock, chargeDurationsMs) ?? 0;
    if (elapsedMs < durationMs) {
      return {
        stock,
        chargeStartedAt,
        remainingMs: Math.max(0, durationMs - elapsedMs),
        nextChargeDurationMs: durationMs,
      };
    }
    elapsedMs -= durationMs;
    chargeStartedAt += durationMs;
    stock += 1;
  }

  return {
    stock: maxStock,
    chargeStartedAt: null,
    remainingMs: 0,
    nextChargeDurationMs: null,
  };
}

// SpecRef: 8.3 | UI_EXPEDITION | Charge
export function consumeInstantExpeditionStock<T extends InstantExpeditionChargeParty>(
  party: T,
  now: number = Date.now(),
): T & { instantExpeditionStock: number; instantExpeditionChargeStartedAt: number | null } {
  const chargeState = getInstantExpeditionChargeState(party, now);
  if (chargeState.stock <= 0) return {
    ...party,
    instantExpeditionStock: 0,
    instantExpeditionChargeStartedAt: chargeState.chargeStartedAt ?? now,
  };

  const nextStock = chargeState.stock - 1;
  const nextChargeDurationMs = getChargeDurationMs(nextStock, getChargeDurationsMs(party.defeatedBossExpeditions));
  let nextChargeStartedAt: number | null = null;
  if (nextChargeDurationMs !== null) {
    const nextRemainingMs = chargeState.nextChargeDurationMs === null
      ? nextChargeDurationMs
      : Math.min(chargeState.remainingMs, nextChargeDurationMs);
    nextChargeStartedAt = now - Math.max(0, nextChargeDurationMs - nextRemainingMs);
  }

  return {
    ...party,
    instantExpeditionStock: nextStock,
    instantExpeditionChargeStartedAt: nextChargeStartedAt,
  };
}

// SpecRef: 8.3 | UI_EXPEDITION | Charge
export function formatInstantExpeditionChargeDisplay(chargeState: InstantExpeditionChargeState): InstantExpeditionChargeDisplay {
  const cells = Array.from({ length: INSTANT_EXPEDITION_MAX_STOCK }, (_, index) => (
    index < chargeState.stock ? '▰' : '▱'
  )).join('');
  const timerText = chargeState.nextChargeDurationMs === null
    ? 'MAX'
    : instantExpeditionMinuteFormatter.format(Math.max(0, Math.ceil(chargeState.remainingMs / MINUTE_MS)));

  return {
    cells,
    timerText,
    label: `${cells}${timerText}`,
  };
}

// SpecRef: 8.3 | UI_EXPEDITION | Charge
export function formatInstantExpeditionCharge(chargeState: InstantExpeditionChargeState): string {
  return formatInstantExpeditionChargeDisplay(chargeState).label;
}
