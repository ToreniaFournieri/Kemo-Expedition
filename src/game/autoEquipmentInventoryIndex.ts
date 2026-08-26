import type { InventoryRecord, InventoryVariant, ItemCategory } from '../types';

/**
 * Ephemeral index for one automatic-equipment planning transaction.
 * Bucket order mirrors Object.entries(inventory), including delete-and-reinsert order.
 */
export class AutoEquipmentInventoryIndex {
  private readonly keysByCategory = new Map<ItemCategory, string[]>();
  private readonly keysByItemId = new Map<number, string[]>();
  private readonly orderByKey = new Map<string, number>();
  private nextOrder = 0;

  constructor(inventory: InventoryRecord) {
    Object.entries(inventory).forEach(([key, variant]) => this.insert(key, variant));
  }

  addIfAbsent(key: string, variant: InventoryVariant): void {
    if (this.orderByKey.has(key)) return;
    this.insert(key, variant);
  }

  remove(key: string, variant: InventoryVariant): void {
    if (!this.orderByKey.delete(key)) return;
    this.removeFromBucket(this.keysByCategory.get(variant.item.category), key);
    this.removeFromBucket(this.keysByItemId.get(variant.item.id), key);
  }

  keysForItemId(itemId: number): readonly string[] {
    return this.keysByItemId.get(itemId) ?? [];
  }

  keysForCategories(categories: readonly ItemCategory[]): string[] {
    const uniqueCategories = [...new Set(categories)];
    if (uniqueCategories.length === 0) return [];
    if (uniqueCategories.length === 1) return [...(this.keysByCategory.get(uniqueCategories[0]) ?? [])];

    return uniqueCategories
      .flatMap((category) => this.keysByCategory.get(category) ?? [])
      .sort((a, b) => (this.orderByKey.get(a) ?? Number.MAX_SAFE_INTEGER) - (this.orderByKey.get(b) ?? Number.MAX_SAFE_INTEGER));
  }

  private insert(key: string, variant: InventoryVariant): void {
    this.orderByKey.set(key, this.nextOrder);
    this.nextOrder += 1;
    this.appendToBucket(this.keysByCategory, variant.item.category, key);
    this.appendToBucket(this.keysByItemId, variant.item.id, key);
  }

  private appendToBucket<K>(buckets: Map<K, string[]>, bucketKey: K, key: string): void {
    const bucket = buckets.get(bucketKey);
    if (bucket) {
      bucket.push(key);
    } else {
      buckets.set(bucketKey, [key]);
    }
  }

  private removeFromBucket(bucket: string[] | undefined, key: string): void {
    if (!bucket) return;
    const index = bucket.indexOf(key);
    if (index >= 0) bucket.splice(index, 1);
  }
}
