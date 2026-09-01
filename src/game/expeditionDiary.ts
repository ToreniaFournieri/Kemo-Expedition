import type { DiaryLog, ExpeditionLog } from '../types/index.ts';

export interface PlanPendingExpeditionDiaryLogInput {
  readonly log: ExpeditionLog;
  readonly triggers: DiaryLog['triggers'];
  readonly createdAt: number;
  readonly idToken: string | null;
}

/**
 * Deterministic application adapter for the pending expedition Diary record.
 * Timestamp selection and random-token consumption remain caller-owned.
 */
export function planPendingExpeditionDiaryLog(
  input: PlanPendingExpeditionDiaryLogInput,
): DiaryLog | null {
  if (input.triggers.length === 0) return null;
  if (input.idToken === null) {
    throw new Error('A Diary ID token is required when expedition triggers are present');
  }

  return {
    id: `${input.createdAt}-${input.idToken}`,
    expeditionLog: input.log,
    triggers: input.triggers,
    createdAt: input.createdAt,
    isRead: false,
  };
}
