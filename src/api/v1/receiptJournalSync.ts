import type { ApiV1Receipt } from './authority';

// SpecRef: 9.1.4.12 | API account storage | Receipt journal
// Retained receipts are immutable and change only by appending at the end and evicting from the front. Instead of
// re-sending (and the host re-writing) up to 4,096 receipts on every commit, the renderer describes the change against
// the receipts the host last confirmed holding; the host appends to a journal file and reports a mismatch if its own
// durable picture differs, which triggers one full resend.

export interface ApiReceiptSync {
  /** True replaces the whole journal with `appended`. */
  full?: true;
  /** Receipts the host must hold before this commit. */
  baseCount: number;
  /** Receipts to drop from the front. */
  evicted: number;
  /** JSON of the receipts to add at the end. */
  appended: string[];
}

export const RECEIPT_JOURNAL_MISMATCH = 'receipt_journal_mismatch';

export class ApiReceiptJournalTracker {
  private readonly confirmed = new Map<string, readonly ApiV1Receipt[]>();

  /** `receiptJson` returns the (cached) JSON of one immutable receipt. */
  constructor(private readonly receiptJson: (receipt: ApiV1Receipt) => string) {}

  plan(accountKey: string, receipts: readonly ApiV1Receipt[], forceFull = false): ApiReceiptSync {
    const held = forceFull ? undefined : this.confirmed.get(accountKey);
    if (held) {
      const evicted = receipts.length === 0 ? held.length : held.indexOf(receipts[0]);
      if (evicted >= 0) {
        const overlap = held.length - evicted;
        let continuous = overlap <= receipts.length;
        for (let index = 0; continuous && index < overlap; index += 1) continuous = held[evicted + index] === receipts[index];
        if (continuous) return { baseCount: held.length, evicted, appended: receipts.slice(overlap).map(this.receiptJson) };
      }
    }
    return { full: true, baseCount: 0, evicted: 0, appended: receipts.map(this.receiptJson) };
  }

  confirm(accountKey: string, receipts: readonly ApiV1Receipt[]): void {
    this.confirmed.set(accountKey, [...receipts]);
  }

  forget(accountKey: string): void {
    this.confirmed.delete(accountKey);
  }
}
