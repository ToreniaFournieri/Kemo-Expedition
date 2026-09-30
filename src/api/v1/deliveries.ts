// SpecRef: 9.1.4.15 | External delivery and rewards | Delivery job lifecycle

export type ApiV1DeliveryStatus = 'queued' | 'sending' | 'delivered' | 'failed' | 'unknown' | 'cancelled';

/** One attachment, captured with its real bytes at admission (never regenerated on retry). */
export interface ApiV1DeliveryAttachment {
  name: string;
  mediaType: string;
  contentBase64: string;
}

/** The exact network payload the sender posts, frozen at commit time so every attempt sends identical content. */
export interface ApiV1DeliveryPayload {
  content: string;
  username: string;
  attachments: ApiV1DeliveryAttachment[];
}

export interface ApiV1DeliveryRecord {
  deliveryId: string;
  status: ApiV1DeliveryStatus;
  createdAt: string;
  updatedAt: string;
  failureReason: string | null;
  /** True only when a confirmed delivery actually granted its benefit. */
  rewardApplied: boolean;
  operation: string;
  parameters: Record<string, unknown>;
  files: Record<string, unknown>;
  /**
   * The frozen network payload, present only while a send is still possible (`queued`/`sending`); stripped once the
   * job settles (`delivered`/`failed`/`unknown`), since none of those ever send again and the record is otherwise
   * retained indefinitely as control metadata (persisted on every commit).
   */
  payload?: ApiV1DeliveryPayload;
  /** Internal: number of send attempts started; bounds automatic retry of confirmed pre-send failures. */
  attempts?: number;
  /** Internal: set once the delivered-completion transaction has run, so a benefit can never be applied twice. */
  completionApplied?: boolean;
}

export type ApiV1PublicDelivery = Pick<ApiV1DeliveryRecord, 'deliveryId' | 'status' | 'createdAt' | 'updatedAt' | 'failureReason' | 'rewardApplied'>;

export type ApiV1DeliveryOutcome =
  | { kind: 'delivered' }
  /** Confirmed that nothing reached the recipient; safe to retry automatically up to the attempt limit. */
  | { kind: 'not_sent'; reason: string }
  /** The recipient definitively refused the payload; never retried. */
  | { kind: 'rejected'; reason: string }
  /** The send may or may not have happened. Never resent automatically. */
  | { kind: 'ambiguous'; reason: string };

export const API_V1_DELIVERY_MAX_ATTEMPTS = 3;

export function projectDelivery(record: ApiV1DeliveryRecord): ApiV1PublicDelivery {
  return { deliveryId: record.deliveryId, status: record.status, createdAt: record.createdAt, updatedAt: record.updatedAt, failureReason: record.failureReason, rewardApplied: record.rewardApplied };
}

export function stampDelivery(now: number): string {
  return new Date(now).toISOString();
}

export function replaceDelivery(deliveries: readonly ApiV1DeliveryRecord[], deliveryId: string, update: (record: ApiV1DeliveryRecord) => ApiV1DeliveryRecord): ApiV1DeliveryRecord[] {
  return deliveries.map((record) => record.deliveryId === deliveryId ? update(record) : record);
}

/** Serializes attempts: nothing is claimed while a send is in flight. Returns the claimed job with its post-claim record. */
export function claimNextDelivery(deliveries: readonly ApiV1DeliveryRecord[], now: number): { deliveries: ApiV1DeliveryRecord[]; claimed: ApiV1DeliveryRecord | null } {
  if (deliveries.some((record) => record.status === 'sending')) return { deliveries: [...deliveries], claimed: null };
  const next = deliveries.find((record) => record.status === 'queued');
  if (!next) return { deliveries: [...deliveries], claimed: null };
  const updated = replaceDelivery(deliveries, next.deliveryId, (record) => ({ ...record, status: 'sending', attempts: (record.attempts ?? 0) + 1, updatedAt: stampDelivery(now) }));
  return { deliveries: updated, claimed: updated.find((record) => record.deliveryId === next.deliveryId)! };
}

/** Drops the frozen network payload; called once a job can never send again, to bound persisted control metadata. */
export function stripDeliveryPayload(record: ApiV1DeliveryRecord): ApiV1DeliveryRecord {
  if (record.payload === undefined) return record;
  const { payload: _payload, ...rest } = record;
  return rest;
}

export function settleDelivery(deliveries: readonly ApiV1DeliveryRecord[], deliveryId: string, outcome: ApiV1DeliveryOutcome, now: number): ApiV1DeliveryRecord[] {
  const target = deliveries.find((record) => record.deliveryId === deliveryId);
  if (!target || target.status !== 'sending') throw new Error('illegal_action:delivery_not_sending');
  return replaceDelivery(deliveries, deliveryId, (record) => {
    const base = { ...record, updatedAt: stampDelivery(now) };
    switch (outcome.kind) {
      case 'delivered': return stripDeliveryPayload({ ...base, status: 'delivered', failureReason: null });
      case 'not_sent': return (record.attempts ?? 0) < API_V1_DELIVERY_MAX_ATTEMPTS
        // Still retryable: keep the frozen payload so the retry sends identical content, never re-derived.
        ? { ...base, status: 'queued', failureReason: outcome.reason }
        : stripDeliveryPayload({ ...base, status: 'failed', failureReason: outcome.reason });
      case 'rejected': return stripDeliveryPayload({ ...base, status: 'failed', failureReason: outcome.reason });
      case 'ambiguous': return stripDeliveryPayload({ ...base, status: 'unknown', failureReason: outcome.reason });
    }
  });
}

/** A restart while sending cannot know whether the remote accepted the payload, so the job becomes `unknown`. */
export function recoverInterruptedDeliveries(deliveries: readonly ApiV1DeliveryRecord[], now: number): ApiV1DeliveryRecord[] {
  return deliveries.map((record) => record.status === 'sending'
    ? stripDeliveryPayload({ ...record, status: 'unknown', failureReason: 'interrupted_while_sending', updatedAt: stampDelivery(now) })
    : record);
}

/**
 * Import/reset replaces the save the jobs were created for. Refuse while a send is in flight; otherwise cancel every
 * queued job so it can never be sent for, or reward, the replacement save. Terminal and unknown jobs are retained.
 */
export function prepareSaveReplacement(deliveries: readonly ApiV1DeliveryRecord[], now: number): { ok: true; deliveries: ApiV1DeliveryRecord[] } | { ok: false } {
  if (deliveries.some((record) => record.status === 'sending')) return { ok: false };
  return {
    ok: true,
    deliveries: deliveries.map((record) => record.status === 'queued'
      ? stripDeliveryPayload({ ...record, status: 'cancelled', failureReason: 'save_replaced', updatedAt: stampDelivery(now) })
      : record),
  };
}
