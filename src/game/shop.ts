const SHOP_BASE_PRICE = 100;

export function getShopItemPrice(itemId: number): number {
  const tier = Math.max(1, Math.floor(itemId / 1000));
  return SHOP_BASE_PRICE * (2 ** (tier - 1));
}

