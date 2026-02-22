const SHOP_BASE_PRICE = 100;
export const SHOP_REFRESH_PRICE = 1000;

export function getShopHourKey(now: Date): string {
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}`;
}

export function getShopLineupSeed(now: Date, refreshCount: number): number {
  const hourSeed = Number(getShopHourKey(now));
  return hourSeed + (Math.max(0, refreshCount) * 997);
}

export function getShopStockKey(now: Date, refreshCount: number): string {
  return `${getShopHourKey(now)}-${Math.max(0, refreshCount)}`;
}

export function getShopItemPrice(itemId: number): number {
  const tier = Math.max(1, Math.floor(itemId / 1000));
  return SHOP_BASE_PRICE * (2 ** (tier - 1));
}
