import type { GameState, SavedEquipmentSet } from '../../types';
import { serializeGameState } from '../../game/saveCodec';
import { createApiRandom, withGameplayRandomSource } from '../../game/gameplayRandom';
import { applyApiV1Commit, type ApiV1CommitContext, type ApiV1PartyCycleWrite } from './commitOperations';
import { stageApiV1ElapsedProgression } from './elapsedProgression';
import { resolveConfirmationPolicy } from './confirmationPolicy';
import { prepareSaveReplacement, type ApiV1DeliveryRecord } from './deliveries';
import type { FeedbackRewardState } from '../../game/feedbackRewards';

// SpecRef: 9.1.4.4 | Commit, revision, and idempotency contract | Serialized transaction authority

export interface ApiV1Receipt {
  key: string;
  operation: string;
  canonical: string;
  response: ApiV1CommitResponse;
}

export interface ApiV1Confirmation {
  token: string;
  key: string;
  operation: string;
  canonical: string;
  revision: number;
  expiresAt: number;
}

export interface ApiV1ControlMetadata {
  revisionHighWater: number;
  inGameTime?: number;
  receipts: ApiV1Receipt[];
  tombstones: string[];
  confirmations?: ApiV1Confirmation[];
  popupEvents?: Array<Record<string, unknown>>;
  deliveries?: ApiV1DeliveryRecord[];
  /** Server-owned feedback cooldown for this API account; excluded from backups like every other control member. */
  feedbackReward?: FeedbackRewardState;
  equipmentHistory?: Record<string, { undo: SavedEquipmentSet[]; redo: SavedEquipmentSet[] }>;
  settings?: Record<string, unknown>;
  rngState?: number;
}

export interface ApiV1CommitResponse {
  requestId: string;
  previousRevision: number;
  revision: number;
  data: Record<string, unknown>;
  effects: Array<{ key: string; args: Record<string, string | number | boolean> }>;
  changedResources: string[];
  committedAt: string;
}

export interface ApiV1AuthorityError {
  code: 'confirmation_invalid' | 'confirmation_required' | 'idempotency_conflict' | 'idempotency_expired' | 'illegal_action' | 'invalid_request' | 'not_found' | 'operation_in_progress' | 'save_failed' | 'stale_revision';
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiV1CommitAuthorityInput {
  operation: string;
  expectedRevision: number;
  idempotencyKey: string;
  confirmationToken?: string | null;
  requestId: string;
  parameters: Record<string, unknown>;
  uploadedFiles: Record<string, Record<string, unknown>>;
  state: GameState;
  simulatedAt: number;
  control: ApiV1ControlMetadata;
}

export interface ApiV1CommitAuthorityDependencies {
  gameMode: ApiV1CommitContext['gameMode'];
  enemyLevelOffset: number;
  cycleDurationScale: number;
  applyAutoEquipment: ApiV1CommitContext['applyAutoEquipment'];
  persist: (state: GameState, control: ApiV1ControlMetadata) => Promise<void>;
  publish: (state: GameState) => Promise<void>;
  /** The Instant Expedition charge clock scale (the current Speed of Time). */
  chargeDurationScale?: number;
  /** The runtime's Colosseum Debug setting (the ordinary player only). */
  colosseumEnabled?: () => boolean;
  /**
   * The wall clock, for the ordinary player only: the player's in-game time is the real time of each request, exactly as the UI
   * uses it. An API account has its own in-game clock, which only its own progression advances.
   */
  playerClock?: () => number;
  /** Live party-cycle access for the ordinary player's runtime; omitted for an API account, which has no live cycle. */
  partyCycle?: ApiV1CommitContext['partyCycle'];
  restDurationMs?: ApiV1CommitContext['restDurationMs'];
  /** Applies live party-cycle changes right before the committed state is published (after it is durable). */
  applyPartyCycleWrites?: (writes: ApiV1PartyCycleWrite[]) => void;
  createOpaqueId: () => string;
  createRandomSeed: () => number;
  now: () => number;
  onPublicationFailure?: (error: unknown) => void;
  yieldBetweenChunks?: () => Promise<void>;
  afterElapsedChunk?: (completedChunks: number, totalChunks: number, stagedState: GameState) => void | Promise<void>;
}

export type ApiV1CommitAuthorityResult =
  | { ok: true; response: ApiV1CommitResponse; state: GameState; control: ApiV1ControlMetadata; simulatedAt: number; stateChanged: boolean; published: boolean }
  | { ok: false; error: ApiV1AuthorityError; durableControl?: ApiV1ControlMetadata };

export function canonicalizeApiValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalizeApiValue).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalizeApiValue(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function canonicalizeApiV1Request(operation: string, parameters: Record<string, unknown>, uploadedFiles: Record<string, Record<string, unknown>>): string {
  const files = Object.fromEntries(Object.entries(uploadedFiles).map(([name, file]) => [name, {
    mediaType: file.mediaType,
    byteLength: file.byteLength,
    sha256: file.sha256,
  }]));
  return canonicalizeApiValue({ operation, parameters, files });
}

function failure(code: ApiV1AuthorityError['code'], message: string, details?: Record<string, unknown>): ApiV1CommitAuthorityResult {
  return { ok: false, error: { code, message, ...(details ? { details } : {}) } };
}

function changedResourcesFor(operation: string, changed: boolean): string[] {
  if (!changed) return [];
  if (operation.startsWith('commit/progress/')) return ['read/observation/overview', 'read/observation/expedition', 'read/observation/base', 'read/observation/diary'];
  if (operation.startsWith('commit/expedition/')) return ['read/observation/overview', 'read/observation/expedition', 'read/observation/base', 'read/observation/diary'];
  if (operation.startsWith('commit/build/')) return ['read/observation/party', 'read/observation/base'];
  if (operation.startsWith('commit/base/')) return ['read/observation/overview', 'read/observation/base'];
  if (operation.startsWith('commit/diary/')) return ['read/observation/overview', 'read/observation/diary'];
  return ['read/observation/overview', 'read/observation/setting'];
}

function classifyCommitError(error: unknown): ApiV1AuthorityError {
  const reason = String(error);
  if (reason.includes('not_found')) return { code: 'not_found', message: 'The requested resource was not found.', details: { reason } };
  if (reason.includes('illegal_action')) return { code: 'illegal_action', message: 'The action is unavailable.', details: { reason } };
  return { code: 'invalid_request', message: 'The commit could not be applied.', details: { reason } };
}

/**
 * Resolves one already-admitted commit against an immutable snapshot. Persistence is completed before publication.
 * Once persistence succeeds, a publication failure cannot turn the durable success into a rollback response.
 */
export async function executeApiV1CommitTransaction(
  input: ApiV1CommitAuthorityInput,
  dependencies: ApiV1CommitAuthorityDependencies,
): Promise<ApiV1CommitAuthorityResult> {
  if (!Number.isSafeInteger(input.expectedRevision) || input.idempotencyKey.length < 16 || input.idempotencyKey.length > 128) {
    return failure('invalid_request', 'A valid expectedRevision and idempotencyKey are required.');
  }

  const canonicalFiles = Object.fromEntries(Object.entries(input.uploadedFiles).map(([name, file]) => [name, {
    mediaType: file.mediaType,
    byteLength: file.byteLength,
    sha256: file.sha256,
  }]));
  const canonical = canonicalizeApiV1Request(input.operation, input.parameters, input.uploadedFiles);
  const retainedReceipt = input.control.receipts.find((entry) => entry.key === input.idempotencyKey);
  if (retainedReceipt) {
    return retainedReceipt.canonical === canonical
      ? { ok: true, response: retainedReceipt.response, state: input.state, control: input.control, simulatedAt: input.simulatedAt, stateChanged: false, published: false }
      : failure('idempotency_conflict', 'The idempotency key belongs to a different request.');
  }
  if (input.control.tombstones.includes(input.idempotencyKey)) return failure('idempotency_expired', 'The successful receipt has expired.');
  if (input.expectedRevision !== input.control.revisionHighWater) return failure('stale_revision', 'The supplied revision is stale.', { currentRevision: input.control.revisionHighWater });

  const stagedControl = structuredClone(input.control);
  const policy = resolveConfirmationPolicy(input.operation, input.state, input.parameters);
  const confirmationRequired = policy !== null;
  if (policy) {
    // A challenge reserves the base parameters (without the caller's choice) so the confirmed retry may add exactly
    // the declared choice; the successful receipt below records the complete parameters including that choice.
    const baseParameters = policy.choiceField ? Object.fromEntries(Object.entries(input.parameters).filter(([name]) => name !== policy.choiceField)) : input.parameters;
    const baseCanonical = canonicalizeApiV1Request(input.operation, baseParameters, input.uploadedFiles);
    const now = dependencies.now();
    stagedControl.confirmations = (stagedControl.confirmations ?? []).filter((entry) => entry.expiresAt > now);
    const reserved = stagedControl.confirmations.find((entry) => entry.key === input.idempotencyKey);
    if (!input.confirmationToken) {
      if (reserved && (reserved.operation !== input.operation || reserved.canonical !== baseCanonical)) return failure('idempotency_conflict', 'The idempotency key is reserved for different parameters.');
      const challenge = reserved ?? {
        token: dependencies.createOpaqueId(), key: input.idempotencyKey, operation: input.operation,
        canonical: baseCanonical, revision: input.expectedRevision, expiresAt: now + 300_000,
      };
      if (!reserved) stagedControl.confirmations.push(challenge);
      try {
        await dependencies.persist(input.state, stagedControl);
      } catch {
        return failure('save_failed', 'The confirmation reservation could not be persisted.');
      }
      return {
        ok: false,
        durableControl: stagedControl,
        error: {
          code: 'confirmation_required', message: 'Confirmation is required.',
          details: {
            confirmationToken: challenge.token, warningKey: policy.warningKey, warningArgs: policy.warningArgs,
            expiresAt: new Date(challenge.expiresAt).toISOString(), allowedChoices: policy.allowedChoices,
            ...(policy.choiceField ? { choiceField: policy.choiceField } : {}),
          },
        },
      };
    }
    if (!reserved || reserved.token !== input.confirmationToken || reserved.operation !== input.operation || reserved.canonical !== baseCanonical || reserved.revision !== input.expectedRevision || reserved.expiresAt <= now) {
      return failure('confirmation_invalid', 'The confirmation token is invalid.');
    }
    if (policy.choiceField && !policy.allowedChoices.includes(String(input.parameters[policy.choiceField]))) {
      return failure('confirmation_invalid', 'The confirmation requires one of the offered choices.', { choiceField: policy.choiceField, allowedChoices: policy.allowedChoices });
    }
  }

  let outcome;
  const settingsBefore = structuredClone(stagedControl.settings ?? {});
  const equipmentHistoryBefore = structuredClone(stagedControl.equipmentHistory ?? {});
  const apiRandom = createApiRandom(stagedControl.rngState ?? dependencies.createRandomSeed());
  let randomDrawCount = 0;
  const runWithRandom = <T>(operation: () => T): T => withGameplayRandomSource(() => {
    randomDrawCount += 1;
    return apiRandom.next();
  }, operation);
  try {
    if (input.operation === 'commit/progress/elapsed') {
      const elapsed = await stageApiV1ElapsedProgression(input.state, input.parameters, {
        simulatedAt: input.simulatedAt,
        realNow: dependencies.now(),
        gameMode: dependencies.gameMode,
        enemyLevelOffset: dependencies.enemyLevelOffset,
        cycleDurationScale: dependencies.cycleDurationScale,
        applyAutoEquipment: dependencies.applyAutoEquipment,
        yieldBetweenChunks: dependencies.yieldBetweenChunks,
        afterChunk: dependencies.afterElapsedChunk,
        runWithRandom,
      });
      outcome = {
        state: elapsed.state,
        data: elapsed.data,
        simulatedAt: elapsed.simulatedAt,
        settings: stagedControl.settings ?? {},
        equipmentHistory: stagedControl.equipmentHistory ?? {},
        resetControlEvents: false,
        delivery: null,
      };
    } else {
      outcome = runWithRandom(() => applyApiV1Commit(input.operation, input.state, input.parameters, {
        simulatedAt: input.simulatedAt,
        gameMode: dependencies.gameMode,
        enemyLevelOffset: dependencies.enemyLevelOffset,
        settings: stagedControl.settings ?? {},
        equipmentHistory: stagedControl.equipmentHistory ?? {},
        uploadedFiles: input.uploadedFiles,
        canonicalFiles,
        applyAutoEquipment: dependencies.applyAutoEquipment,
        createDeliveryId: dependencies.createOpaqueId,
        now: dependencies.now,
        chargeDurationScale: dependencies.chargeDurationScale,
        colosseumEnabled: dependencies.colosseumEnabled?.(),
        partyCycle: dependencies.partyCycle,
        restDurationMs: dependencies.restDurationMs,
      }));
    }
  } catch (error) {
    return { ok: false, error: classifyCommitError(error) };
  }

  if (stagedControl.settings !== undefined || canonicalizeApiValue(outcome.settings) !== canonicalizeApiValue(settingsBefore)) stagedControl.settings = outcome.settings;
  if (stagedControl.equipmentHistory !== undefined || canonicalizeApiValue(outcome.equipmentHistory) !== canonicalizeApiValue(equipmentHistoryBefore)) stagedControl.equipmentHistory = outcome.equipmentHistory;
  if (outcome.resetControlEvents) {
    // SpecRef: 9.1.4.15 | Import/reset cancels queued delivery jobs and is refused while a send is in flight.
    const replacement = prepareSaveReplacement(stagedControl.deliveries ?? [], dependencies.now());
    if (!replacement.ok) return failure('illegal_action', 'A delivery is being sent; the save cannot be replaced yet.', { reason: 'delivery_in_flight' });
    stagedControl.deliveries = replacement.deliveries;
    stagedControl.popupEvents = [];
    stagedControl.confirmations = [];
  }
  if (outcome.delivery) stagedControl.deliveries = [...(stagedControl.deliveries ?? []), outcome.delivery];
  if (randomDrawCount > 0) stagedControl.rngState = apiRandom.state;

  const stateChanged = canonicalizeApiValue(serializeGameState(outcome.state)) !== canonicalizeApiValue(serializeGameState(input.state));
  const metadataChanged = canonicalizeApiValue({ deliveries: stagedControl.deliveries, equipmentHistory: stagedControl.equipmentHistory, popupEvents: stagedControl.popupEvents, rngState: stagedControl.rngState, settings: stagedControl.settings })
    !== canonicalizeApiValue({ deliveries: input.control.deliveries, equipmentHistory: input.control.equipmentHistory, popupEvents: input.control.popupEvents, rngState: input.control.rngState, settings: input.control.settings });
  const clockChanged = outcome.simulatedAt !== input.simulatedAt;
  const changed = stateChanged || metadataChanged || clockChanged;
  const previousRevision = stagedControl.revisionHighWater;
  const revision = changed ? previousRevision + 1 : previousRevision;

  if (changed && /^commit\/expedition\/\d+\/(sortie|godsBattle)$/.test(input.operation)) {
    const popupEvents = stagedControl.popupEvents ??= [];
    const sequence = 1 + popupEvents.filter((event) => event.revision === revision).length;
    popupEvents.push({ revision, sequence, eventId: `${revision}:${sequence}`, eventKey: 'popup.expeditionComplete', args: { outcome: String(outcome.data.outcome ?? '') }, partyNumber: Number(input.operation.split('/')[2]), diaryEntryId: outcome.data.diaryEntryId ?? null, groupKey: null, createdAt: new Date(dependencies.now()).toISOString() });
    const cutoff = dependencies.now() - 300_000;
    const firstRecent = popupEvents.findIndex((event) => Date.parse(String(event.createdAt)) >= cutoff);
    const retainFrom = Math.min(firstRecent < 0 ? popupEvents.length : firstRecent, Math.max(0, popupEvents.length - 256));
    stagedControl.popupEvents = popupEvents.slice(retainFrom);
  }

  const response: ApiV1CommitResponse = {
    requestId: input.requestId,
    previousRevision,
    revision,
    data: outcome.data,
    effects: [],
    changedResources: changedResourcesFor(input.operation, changed),
    committedAt: new Date(dependencies.now()).toISOString(),
  };
  stagedControl.receipts.push({ key: input.idempotencyKey, operation: input.operation, canonical, response });
  stagedControl.revisionHighWater = revision;
  stagedControl.inGameTime = outcome.simulatedAt;
  if (confirmationRequired) stagedControl.confirmations = (stagedControl.confirmations ?? []).filter((entry) => entry.key !== input.idempotencyKey);
  if (stagedControl.receipts.length > 4096) {
    const evicted = stagedControl.receipts.splice(0, stagedControl.receipts.length - 4096);
    stagedControl.tombstones.push(...evicted.map((entry) => entry.key));
  }

  try {
    await dependencies.persist(outcome.state, stagedControl);
  } catch {
    return failure('save_failed', 'The previous account manifest remains authoritative.');
  }

  let published = !stateChanged;
  if (stateChanged) {
    try {
      // A sortie's cycle reset is applied in the same tick as the published state, so no tick sees one without the other.
      if (outcome.partyCycleWrites?.length) dependencies.applyPartyCycleWrites?.(outcome.partyCycleWrites);
      await dependencies.publish(outcome.state);
      published = true;
    } catch (error) {
      dependencies.onPublicationFailure?.(error);
    }
  }
  return { ok: true, response, state: outcome.state, control: stagedControl, simulatedAt: outcome.simulatedAt, stateChanged, published };
}

export interface ApiV1AuthoritySnapshot {
  state: GameState;
  control: ApiV1ControlMetadata;
  simulatedAt: number;
}

export type ApiV1QueuedCommitInput = Omit<ApiV1CommitAuthorityInput, 'state' | 'control' | 'simulatedAt'>;

/** Owns one committed snapshot, serialized writes, and admitted-work duplicate detection. */
export class SerializedApplicationApiAuthority {
  private snapshot: ApiV1AuthoritySnapshot;
  private queue: Promise<void> = Promise.resolve();
  private readonly admitted = new Map<string, string>();

  constructor(snapshot: ApiV1AuthoritySnapshot) {
    this.snapshot = snapshot;
  }

  getSnapshot(): Readonly<ApiV1AuthoritySnapshot> {
    return this.snapshot;
  }

  replaceSnapshot(snapshot: ApiV1AuthoritySnapshot): void {
    this.snapshot = snapshot;
  }

  runExclusive<T>(work: () => Promise<T>): Promise<T> {
    const result = this.queue.then(work, work);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  executeCommit(input: ApiV1QueuedCommitInput, dependencies: ApiV1CommitAuthorityDependencies): Promise<ApiV1CommitAuthorityResult> {
    const canonical = canonicalizeApiV1Request(input.operation, input.parameters, input.uploadedFiles);
    const admittedCanonical = this.admitted.get(input.idempotencyKey);
    if (admittedCanonical !== undefined) {
      return Promise.resolve(failure(
        admittedCanonical === canonical ? 'operation_in_progress' : 'idempotency_conflict',
        admittedCanonical === canonical ? 'The operation is already in progress.' : 'The idempotency key belongs to a different request.',
      ));
    }
    this.admitted.set(input.idempotencyKey, canonical);
    const execution = this.runExclusive(async () => {
      const simulatedAt = dependencies.playerClock ? Math.max(this.snapshot.simulatedAt, dependencies.playerClock()) : this.snapshot.simulatedAt;
      const result = await executeApiV1CommitTransaction({ ...input, ...this.snapshot, simulatedAt }, dependencies);
      if (result.ok) this.snapshot = { state: result.state, control: result.control, simulatedAt: result.simulatedAt };
      else if (result.durableControl) this.snapshot = { ...this.snapshot, control: result.durableControl };
      return result;
    });
    return execution.finally(() => {
      if (this.admitted.get(input.idempotencyKey) === canonical) this.admitted.delete(input.idempotencyKey);
    });
  }
}
