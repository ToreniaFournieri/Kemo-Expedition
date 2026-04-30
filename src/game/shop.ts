import { getShopItemPrice as getTierShopItemPrice } from './pricing';

const SHOP_REFRESH_BASE_PRICE = 200;
const SHOP_REFRESH_HOURS = [2, 10, 18] as const;

function getRefreshDateAt(base: Date, hour: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, 0, 0, 0);
}

// SpecRef: 8.4.1 | Shop (お店) | getCurrentShopRefreshDate
export function getCurrentShopRefreshDate(now: Date): Date {
  for (let index = SHOP_REFRESH_HOURS.length - 1; index >= 0; index -= 1) {
    const hour = SHOP_REFRESH_HOURS[index];
    const candidate = getRefreshDateAt(now, hour);
    if (now >= candidate) {
      return candidate;
    }
  }

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return getRefreshDateAt(yesterday, SHOP_REFRESH_HOURS[SHOP_REFRESH_HOURS.length - 1]);
}

// SpecRef: 8.4.1 | Shop (お店) | getNextShopRefreshDate
export function getNextShopRefreshDate(now: Date): Date {
  for (const hour of SHOP_REFRESH_HOURS) {
    const candidate = getRefreshDateAt(now, hour);
    if (candidate > now) {
      return candidate;
    }
  }

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return getRefreshDateAt(tomorrow, SHOP_REFRESH_HOURS[0]);
}

// SpecRef: 8.4.1 | Shop (お店) | countElapsedShopRefreshes
export function countElapsedShopRefreshes(fromTimestamp: number, now: Date): number {
  if (!Number.isFinite(fromTimestamp) || fromTimestamp <= 0) return 0;
  const from = new Date(fromTimestamp);
  if (from >= now) return 0;

  let count = 0;
  let cursor = getNextShopRefreshDate(from);
  while (cursor <= now) {
    count += 1;
    cursor = getNextShopRefreshDate(new Date(cursor.getTime() + 1));
  }
  return count;
}

// SpecRef: 8.4.1 | Shop (お店) | getShopHourKey
export function getShopHourKey(now: Date): string {
  const refreshDate = getCurrentShopRefreshDate(now);
  return `${refreshDate.getFullYear()}${String(refreshDate.getMonth() + 1).padStart(2, '0')}${String(refreshDate.getDate()).padStart(2, '0')}${String(refreshDate.getHours()).padStart(2, '0')}`;
}

// SpecRef: 8.4.1 | Shop (お店) | getShopLineupSeed
export function getShopLineupSeed(now: Date, refreshCount: number): number {
  const hourSeed = Number(getShopHourKey(now));
  return hourSeed + (Math.max(0, refreshCount) * 997);
}

// SpecRef: 8.4.1 | Shop (お店) | getShopStockKey
export function getShopStockKey(now: Date, refreshCount: number): string {
  return `${getShopHourKey(now)}-${Math.max(0, refreshCount)}`;
}

// SpecRef: 8.4.1 | Shop (お店) | Paid Refresh (有償洗替)
export function getShopRefreshPrice(refreshCount: number): number {
  return SHOP_REFRESH_BASE_PRICE * (2 ** Math.max(0, refreshCount));
}

// SpecRef: 8.4.1 | Shop (お店) | getShopItemPrice
export function getShopItemPrice(itemId: number): number {
  return getTierShopItemPrice(itemId);
}
