import type { Party } from '../types';

export const INSTANT_EXPEDITION_MAX_STOCK = 6;

const INSTANT_EXPEDITION_CHARGE_DURATIONS_MS = [
  8 * 60 * 1000,
  15 * 60 * 1000,
  30 * 60 * 1000,
  60 * 60 * 1000,
  2 * 60 * 60 * 1000,
  4 * 60 * 60 * 1000,
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

function normalizeStock(raw: unknown): number {
  return Math.max(0, Math.min(INSTANT_EXPEDITION_MAX_STOCK, Math.floor(typeof raw === 'number' && Number.isFinite(raw) ? raw : INSTANT_EXPEDITION_MAX_STOCK)));
}

function getChargeDurationMs(stock: number): number | null {
  if (stock >= INSTANT_EXPEDITION_MAX_STOCK) return null;
  return INSTANT_EXPEDITION_CHARGE_DURATIONS_MS[stock] ?? INSTANT_EXPEDITION_CHARGE_DURATIONS_MS[INSTANT_EXPEDITION_CHARGE_DURATIONS_MS.length - 1];
}

// SpecRef: 8.3 | UI_EXPEDITION | Charge
export function getInstantExpeditionChargeState(
  party: Pick<Party, 'instantExpeditionStock' | 'instantExpeditionChargeStartedAt'>,
  now: number = Date.now(),
): InstantExpeditionChargeState {
  let stock = normalizeStock(party.instantExpeditionStock);
  let chargeStartedAt = typeof party.instantExpeditionChargeStartedAt === 'number' && Number.isFinite(party.instantExpeditionChargeStartedAt)
    ? party.instantExpeditionChargeStartedAt
    : null;

  if (stock >= INSTANT_EXPEDITION_MAX_STOCK) {
    return {
      stock: INSTANT_EXPEDITION_MAX_STOCK,
      chargeStartedAt: null,
      remainingMs: 0,
      nextChargeDurationMs: null,
    };
  }

  if (chargeStartedAt === null) {
    chargeStartedAt = now;
  }

  let elapsedMs = Math.max(0, now - chargeStartedAt);
  while (stock < INSTANT_EXPEDITION_MAX_STOCK) {
    const durationMs = getChargeDurationMs(stock) ?? 0;
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
    stock: INSTANT_EXPEDITION_MAX_STOCK,
    chargeStartedAt: null,
    remainingMs: 0,
    nextChargeDurationMs: null,
  };
}

// SpecRef: 8.3 | UI_EXPEDITION | Charge
export function consumeInstantExpeditionStock<T extends Pick<Party, 'instantExpeditionStock' | 'instantExpeditionChargeStartedAt'>>(
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
  return {
    ...party,
    instantExpeditionStock: nextStock,
    instantExpeditionChargeStartedAt: nextStock >= INSTANT_EXPEDITION_MAX_STOCK ? null : (chargeState.chargeStartedAt ?? now),
  };
}

// SpecRef: 8.3 | UI_EXPEDITION | Charge
export function formatInstantExpeditionChargeDisplay(chargeState: InstantExpeditionChargeState): InstantExpeditionChargeDisplay {
  const cells = Array.from({ length: INSTANT_EXPEDITION_MAX_STOCK }, (_, index) => (
    index < chargeState.stock ? '▰' : '▱'
  )).join('');
  const timerText = chargeState.stock >= INSTANT_EXPEDITION_MAX_STOCK
    ? 'MAX'
    : instantExpeditionMinuteFormatter.format(Math.max(0, Math.ceil(chargeState.remainingMs / (60 * 1000))));

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
