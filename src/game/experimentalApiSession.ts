import type { GameState } from '../types';

// SpecRef: 12.1.1 | AI Play Regulation | End condition
export const AI_PLAY_API_CALL_LIMIT = 20_000;
export const AI_PLAY_REGULATION_VERSION = 2;
export const AI_PLAY_RULES_ID = "ai-play-v2-calls20000-score10-sortie1-penalty100000-exactbatch";

export type ApiResponse = Record<string, unknown>;
export type Evaluation = {
  evaluationId: string; concept: string; version: string; build: number; regulationVersion: 1 | 2; mode?: "normal" | "orca"; rulesId?: string;
  winningOperation?: { call: number; firstWinningSortie: number; sortie: unknown; outcomes: unknown };
  status: 'active' | 'succeeded' | 'failed'; countedApiCalls: number; actualSorties: number;
  goalAchieved: boolean; firstWinningSortie: number | null; startedAt: number;
  ledger: Array<{ call: number; operation: string; actualSorties: number; error: string | null; commandType?: string }>;
};
export type ApiRuntime = {
  revision: number; randomState: number; autoRun: boolean; simulatedAt: number;
  evaluation?: Evaluation;
  receipts: Record<string, { fingerprint: string; response: ApiResponse }>;
};
export const apiError = (code: string, message: string, status = 400): ApiResponse => ({
  status, error: { code, message, retryable: false },
});
export function evaluationSummary(e?: Evaluation) {
  if (!e) return null;
  const scoreSoFar = e.countedApiCalls * 10 + e.actualSorties;
  const status = e.status === 'active' && e.countedApiCalls >= AI_PLAY_API_CALL_LIMIT ? 'failed' : e.status;
  const { ledger: _ledger, ...summary } = e;
  return { ...summary, status, remainingApiCalls: Math.max(0, AI_PLAY_API_CALL_LIMIT - e.countedApiCalls), scoreSoFar,
    finalScore: status === 'active' ? null : scoreSoFar + (e.goalAchieved ? 0 : 100_000) };
}
export function createApiRuntime(): ApiRuntime {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return { revision: 0, randomState: bytes[0] || 1, autoRun: false, simulatedAt: Date.now(), receipts: {} };
}
export function createEvaluation(evaluationId: string, concept: string, version: string, build: number, mode: "normal" | "orca" = "orca"): Evaluation {
  return { evaluationId, concept, version, build, mode, rulesId: AI_PLAY_RULES_ID, regulationVersion: AI_PLAY_REGULATION_VERSION, status: 'active',
    countedApiCalls: 0, actualSorties: 0, goalAchieved: false, firstWinningSortie: null,
    startedAt: Date.now(), ledger: [] };
}
export function canonicalRequest(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalRequest).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + canonicalRequest(v)).join(',') + '}';
  return JSON.stringify(value) ?? 'null';
}
export type ApiStage = { state: GameState; response: ApiResponse; actualSorties?: number; firstWinningSortie?: number };

// SpecRef: 9.1.3 | Experimental AI API | Evaluation transactions
// Reserve the call durably first. Gameplay and its replay receipt are persisted together.
export async function transactApiRequest(options: {
  state: GameState; operation: string; payload: unknown; idempotencyKey?: string;
  persist: (state: GameState) => Promise<void>;
  execute: (state: GameState) => Promise<ApiStage>;
}): Promise<ApiResponse> {
  const { operation, payload, persist, execute, idempotencyKey } = options;
  const runtime = structuredClone(options.state.apiRuntime ?? createApiRuntime());
  const evaluation = runtime.evaluation;
  if (evaluation && (evaluation.status !== 'active' || evaluation.countedApiCalls >= AI_PLAY_API_CALL_LIMIT)) return { ...apiError('evaluation_finished', 'This evaluation has ended.', 409), evaluation: evaluationSummary(evaluation) };
  if (evaluation) {
    evaluation.countedApiCalls += 1;
    evaluation.ledger.push({ call: evaluation.countedApiCalls, operation, actualSorties: 0, error: 'operation_interrupted' });
  }
  const reserved = { ...options.state, apiRuntime: runtime };
  // A persisted reservation remains a counted call even if the process stops mid-operation.
  try { if (evaluation) await persist(reserved); } catch { return apiError('persistence_failed', 'Could not reserve this operation.', 503); }
  const fingerprint = canonicalRequest({ operation, payload });
  let staged: ApiStage;
  const receipt = idempotencyKey && Object.prototype.hasOwnProperty.call(runtime.receipts, idempotencyKey) ? runtime.receipts[idempotencyKey] : undefined;
  try {
    if (idempotencyKey !== undefined && !/^[A-Za-z0-9_-]{1,128}$/.test(idempotencyKey)) {
      staged = { state: reserved, response: apiError('invalid_request', 'Invalid Idempotency-Key.') };
    } else if (receipt) {
      staged = { state: reserved, response: receipt.fingerprint === fingerprint
        ? { ...receipt.response, replayed: true }
        : apiError('idempotency_conflict', 'This key belongs to a different request.', 409) };
    } else if (evaluation && operation === 'command' && (payload as { command?: { type?: string } })?.command?.type === 'god_battle') {
      staged = { state: reserved, response: apiError('illegal_action', 'Gods Battles are prohibited during evaluation.', 422) };
    } else {
      staged = await execute(structuredClone(reserved));
    }
  } catch (error) {
    staged = { state: reserved, response: error instanceof ApiValidationError ? error.response : apiError('operation_failed', 'The operation failed without committing gameplay.', 500) };
  }
  const finalEvaluation = evaluation ? structuredClone(evaluation) : undefined;
  const finalRuntime = { ...(staged.state.apiRuntime ?? runtime), evaluation: finalEvaluation, receipts: { ...runtime.receipts } };
  const added = staged.actualSorties ?? 0;
  if (finalEvaluation) {
    if (staged.firstWinningSortie !== undefined) {
      finalEvaluation.firstWinningSortie ??= finalEvaluation.actualSorties + staged.firstWinningSortie;
      finalEvaluation.winningOperation ??= { call: finalEvaluation.countedApiCalls, firstWinningSortie: finalEvaluation.firstWinningSortie, sortie: staged.response.sortie ?? null, outcomes: staged.response.outcomes ?? null };
    }
    finalEvaluation.actualSorties += added;
    finalEvaluation.goalAchieved = staged.state.parties.some(p => Boolean(p.defeatedBossExpeditions[1]));
    if (finalEvaluation.goalAchieved) finalEvaluation.status = 'succeeded';
    else if (finalEvaluation.countedApiCalls >= AI_PLAY_API_CALL_LIMIT) finalEvaluation.status = 'failed';
    const err = staged.response.error as { code?: string } | undefined;
    finalEvaluation.ledger[finalEvaluation.ledger.length - 1] = { call: finalEvaluation.countedApiCalls, operation, actualSorties: added, error: err?.code ?? null, ...(!err && operation === 'command' ? { commandType: String((staged.response.command as { type?: string })?.type ?? 'unknown') } : {}) };
  }
  if (finalEvaluation && finalEvaluation.status !== 'active' && staged.response.observation) {
    staged.response = { ...staged.response, observation: { ...freezeEvaluationObservation(staged.response.observation as Record<string, unknown>) } };
  }
  const response: ApiResponse = { ...staged.response, evaluation: evaluationSummary(finalEvaluation) };
  if (idempotencyKey && !receipt && !response.error) {
    finalRuntime.receipts = { ...finalRuntime.receipts, [idempotencyKey]: { fingerprint, response: staged.response } };
    if (!evaluation) {
      const keys = Object.keys(finalRuntime.receipts);
      for (const key of keys.slice(0, Math.max(0, keys.length - 32))) delete finalRuntime.receipts[key];
    }
  }
  try { if (evaluation || (['command', 'sortie'].includes(operation) && !response.error && !response.replayed)) await persist({ ...staged.state, apiRuntime: finalRuntime }); }
  catch {
    // The reservation is already durable; gameplay, RNG and receipts remain at that baseline.
    const failedEvaluation = runtime.evaluation ? structuredClone(runtime.evaluation) : undefined;
    if (failedEvaluation && failedEvaluation.countedApiCalls >= AI_PLAY_API_CALL_LIMIT) failedEvaluation.status = 'failed';

    return { ...apiError('persistence_failed', 'Gameplay was not committed.', 503), evaluation: evaluationSummary(failedEvaluation) };
  }
  return response;
}
export class ApiValidationError extends Error {
  constructor(public response: ApiResponse) { super(String((response.error as { message: string }).message)); }
}
export function requireApi(condition: unknown, code: string, message: string, status = 422, details?: Record<string, unknown>): asserts condition {
  if (!condition) {
    const response = apiError(code, message, status);
    if (details) (response.error as Record<string, unknown>).details = details;
    throw new ApiValidationError(response);
  }
}

export function freezeEvaluationObservation(observation: Record<string, unknown>) {
  return { ...observation, legalActions: [], parties: (observation.parties as Array<Record<string, unknown>> | undefined)?.map(p => ({ ...p, expedition: { ...p.expedition as Record<string, unknown>, normalSortieAvailable: false, godBattleAvailable: false } })) ?? [] };
}

// Exempt reads must never evaluate strategic projections during an active run.
export function readEvaluation(state: GameState, operation: string, snapshot: () => Record<string, unknown>): ApiResponse {
  const evaluation = evaluationSummary(state.apiRuntime?.evaluation);
  if (operation === 'evaluation') return { evaluation };
  if (operation === 'evaluation-ledger') return { ledger: state.apiRuntime?.evaluation?.ledger ?? null };
  if (!evaluation) return { report: null };
  if (evaluation.finalScore == null) return apiError('evaluation_active', 'The final report is available after termination.', 409);
  return { report: { evaluation, ledger: state.apiRuntime!.evaluation!.ledger, ...snapshot() } };
}
