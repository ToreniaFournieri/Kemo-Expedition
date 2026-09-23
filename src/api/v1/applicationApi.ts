import type { ExpeditionLog, GameState } from '../../types';
import { buildApiV1ReadData, type ApiV1ReadContext } from './readModels';
import { SerializedApplicationApiAuthority, type ApiV1CommitAuthorityDependencies, type ApiV1ControlMetadata, type ApiV1InternalTransactionDependencies } from './authority';
import { normalizeApiV1PopupEvents } from './popupEvents';
import { serializeGameState } from '../../game/saveCodec';
import { encodePersistedState } from '../../game/storageCompression';
import { logInApiAccount, logOutApiAccount, signUpApiAccount, type ApiV1SessionPorts } from './sessionLifecycle';
import { accountDebugSettingsOf, accountTimeScale } from './debugSettings';
import { setGameplayDebugOverride } from '../../game/debugSettings';
import { setColosseumEnemySettingsOverride } from '../../game/colosseum';
import { accountEnemyEditSettingsOf } from './enemyEditPane';
import { claimNextDelivery, settleDelivery, type ApiV1DeliveryOutcome, type ApiV1DeliveryRecord } from './deliveries';
import { completeDeliveredBenefit } from './deliveryCompletion';

// SpecRef: 9.1.4.13 | Adapter and contract-test requirements | One transport-neutral Application API
// SpecRef: 9.1.3 | API | React UI, Desktop, and AI/CUI HTTP adapters share these handlers

/** A handler result. Failures carry `error` plus an HTTP-compatible `status`; successes carry `data` and a commit envelope. */
export type ApiV1ApplicationResponse = Record<string, unknown>;

export interface ApplicationApiPorts {
  /** Account store, player save, and login catch-up collaborators. */
  session: ApiV1SessionPorts;
  /** False when the trusted desktop account services are unavailable (browser builds). */
  desktopAvailable: () => boolean;
  runtime: {
    readiness: () => unknown;
    versionBuild: () => string;
    environment: () => string;
    gameMode: () => 'mode.normal' | 'mode.orca';
    enemyLevelOffset: () => number;
    cycleDurationScale: () => number;
    applyAutoEquipment: ApiV1CommitAuthorityDependencies['applyAutoEquipment'];
    /** Private, non-persisted forecast simulation; must not touch the live game state or RNG. */
    simulate: (state: GameState, partyIndex: number, count: number) => Promise<unknown>;
    /** Durably persists a trusted in-process player's state before it is published. */
    persistPlayer: (state: GameState) => Promise<void>;
    /** SpecRef: 9.1.4.15 | Used instead of `persistPlayer` only for `commit/setting/backup/import`/`reset`: the new
     *  state is unrelated to the current one, so it needs a full-replacement durable write, not an ordinary/
     *  incremental one (see `persistApiStateReplacement` in `homeShared.tsx` for why). Falls back to `persistPlayer`
     *  when omitted (every existing test harness; only the desktop app's real wiring needs to supply this). */
    persistPlayerReplacement?: (state: GameState) => Promise<void>;
    /** Publishes an already-durable committed state to the running renderer. */
    publish: (state: GameState) => Promise<void>;
    /** Notifies the transport layer that a changed commit is durable, so it can push open popup-event streams immediately. */
    notifyPopupActivity?: () => void;
    yieldBetweenChunks: () => Promise<void>;
    createOpaqueId: () => string;
    createRandomSeed: () => number;
    now: () => number;
    onPublicationFailure?: (error: unknown) => void;
    /** The live party cycle of a party (by index), for the ordinary player's runtime. */
    partyCycle?: ApiV1CommitAuthorityDependencies['partyCycle'];
    /** The expedition log the UI has disclosed for a party (hidden while exploring); see `ApiV1ReadContext.disclosedLog`. */
    disclosedExpeditionLog?: (partyIndex: number) => ExpeditionLog | null | undefined;
    /** The runtime's Colosseum Debug setting (the ordinary player only). */
    colosseumEnabled?: () => boolean;
    /** Header facts the runtime owns outside the save (Speed of Time, auto-repeat); see `ApiV1ReadContext.headerRuntime`. */
    headerRuntime?: ApiV1ReadContext['headerRuntime'];
    /** Duration of `state.rest` for a party, as the UI computes it. */
    restDurationMs?: ApiV1CommitAuthorityDependencies['restDurationMs'];
    /** Applies a sortie's party-cycle reset to the running runtime (called after the commit is durable). */
    applyPartyCycleWrites?: ApiV1CommitAuthorityDependencies['applyPartyCycleWrites'];
    /** The ordinary player's display settings (dark mode, theme, statistics, auto-repeat), stored outside the save. */
    displaySettings?: ApiV1CommitAuthorityDependencies['displaySettings'];
    /** Applies a `commit/setting/modeSelect` display-setting change to the running runtime (after the commit is durable). */
    applyDisplaySettings?: ApiV1CommitAuthorityDependencies['applyDisplaySettings'];
    /** The ordinary player's real Debug settings (Debug pane), stored outside the save. */
    debugSettings?: ApiV1CommitAuthorityDependencies['debugSettings'];
    /** Applies a `commit/setting/debug` change to the running runtime (after the commit is durable). */
    applyDebugSettings?: ApiV1CommitAuthorityDependencies['applyDebugSettings'];
    /** The ordinary player's real Enemy Edit pane settings (stored on the device). */
    enemyEditSettings?: ApiV1CommitAuthorityDependencies['enemyEditSettings'];
    /** Applies a `commit/setting/enemyEditPane` change to the running runtime (after the commit is durable). */
    applyEnemyEditSettings?: ApiV1CommitAuthorityDependencies['applyEnemyEditSettings'];
  };
  help: { requirements: string; detail: string };
  /** Notifies the UI that an exclusive API session started or ended (it disables state-mutating controls). */
  onSessionActive: (active: boolean) => void;
  /** SpecRef: 9.1.4.15 | The actual network send for a claimed delivery job; never called more than once per claim. */
  delivery: { send: (record: ApiV1DeliveryRecord) => Promise<ApiV1DeliveryOutcome> };
}

/** The trusted in-process adapter API: it supplies revision and idempotency metadata on the caller's behalf. */
export interface InProcessApiAdapter {
  read: (operation: string, input?: { pathParameters?: Record<string, unknown>; parameters?: Record<string, unknown> }) => Promise<ApiV1ApplicationResponse>;
  /** `uploadedFiles` is for the rare trusted caller of a multipart operation (e.g. `commit/setting/backup/import`
   *  from the Settings UI); every other caller omits it, matching today's always-empty behavior. */
  commit: (operation: string, input?: { pathParameters?: Record<string, unknown>; parameters?: Record<string, unknown>; confirmed?: boolean; uploadedFiles?: Record<string, Record<string, unknown>> }) => Promise<ApiV1ApplicationResponse>;
  /**
   * Calls the listener after each successful commit has been fully installed in the authority (state, control metadata
   * such as the equipment history, and receipt). A projection re-read triggered by a game-state change alone can run
   * before that, so a read that depends on control metadata must also re-read on this signal. Returns an unsubscribe.
   */
  subscribe: (listener: () => void) => () => void;
}

export interface ApplicationApi {
  /** The single entry point every adapter (HTTP via desktop IPC, trusted in-process) calls. */
  handle: (templateOperation: string, raw: unknown) => Promise<ApiV1ApplicationResponse>;
  /** Keeps the authoritative snapshot aligned with the player's live state while no API session is active. */
  syncIdleState: (state: GameState) => void;
  isSessionActive: () => boolean;
  authority: SerializedApplicationApiAuthority;
  createInProcessAdapter: (options?: { restrictDuringSession?: boolean }) => InProcessApiAdapter;
  /**
   * SpecRef: 9.1.4.15 | Runs one claim/send/settle/(complete) cycle for the delivery sender; a safe no-op when
   * there is nothing to do. Exposed directly (not only via the interval below) so a caller — or a test — can nudge
   * it deterministically instead of waiting for the next poll tick.
   */
  pumpDeliveries: () => Promise<void>;
  /** Starts the delivery sender's poll loop (a resilience backstop; pumps also run right after a commit that
   *  queues a job). Idempotent to call more than once. Returns a stop function. */
  startDeliveryPump: () => () => void;
}

const SERIALIZED_OPERATIONS = new Set(['fundamental/signUp', 'fundamental/logIn', 'fundamental/logOut']);
const CONFLICT_CODES = new Set(['stale_revision', 'idempotency_conflict', 'idempotency_expired', 'operation_in_progress', 'confirmation_required', 'confirmation_invalid', 'illegal_action']);

function emptyControl(): ApiV1ControlMetadata {
  return { revisionHighWater: 0, receipts: [], tombstones: [], popupEvents: [], deliveries: [] };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function resolveOperation(template: string, pathParameters: Record<string, unknown>): string {
  return template
    .replace('{p}', String(pathParameters.p ?? ''))
    .replace('{characterId}', String(pathParameters.characterId ?? ''))
    .replace('{diaryEntryId}', String(pathParameters.diaryEntryId ?? ''))
    .replace('{deliveryId}', String(pathParameters.deliveryId ?? ''));
}

export function createApplicationApi(ports: ApplicationApiPorts, initialState: GameState): ApplicationApi {
  const authority = new SerializedApplicationApiAuthority({ state: initialState, control: emptyControl(), simulatedAt: ports.runtime.now() });
  let activeIdentity: DesktopApiAccountIdentity | null = null;
  let idleSimulatedAt = ports.runtime.now();

  const failure = (status: number, code: string, message: string, details?: Record<string, unknown>): ApiV1ApplicationResponse => ({
    status,
    revision: authority.getSnapshot().control.revisionHighWater,
    error: { code, message, ...(details ? { details } : {}) },
  });

  const activeSession = () => activeIdentity ? { identity: activeIdentity, ...authority.getSnapshot() } : null;

  // SpecRef: 9.1.4.14 | debug | An API account's own debug settings take effect while it holds control: its Speed of Time
  // scales its own clocks, and the gameplay rules that read Debug settings follow its values, not the device's Debug pane.
  // Its own Enemy Edit pane defines the Colosseum enemy in the same way.
  const syncAccountDebugOverride = () => {
    const settings = authority.getSnapshot().control.settings;
    setGameplayDebugOverride(activeIdentity ? accountDebugSettingsOf(settings) : null);
    setColosseumEnemySettingsOverride(activeIdentity ? accountEnemyEditSettingsOf(settings) : null);
  };

  // SpecRef: 9.1.4.15 | External delivery and rewards | Claim → send → settle → complete
  // Runs entirely through `authority.runInternalTransaction`, so it is serialized against every client commit and
  // against itself; the network send (`ports.delivery.send`) happens outside that lock, so it never blocks other
  // commits, but nothing else can claim a second job while one is `sending` (the state machine itself enforces that).
  let pumpingDeliveries = false;
  let pendingDeliverySettlement: { deliveryId: string; outcome: ApiV1DeliveryOutcome } | null = null;

  function deliveryTransactionDependencies(identity: DesktopApiAccountIdentity | null): ApiV1InternalTransactionDependencies & { now: () => number } {
    return {
      now: ports.runtime.now,
      persist: async (snapshot, control) => {
        if (identity) await ports.session.accounts.commit(identity, encodePersistedState(JSON.stringify(serializeGameState(snapshot))), control as DesktopApiControlMetadata);
        else await ports.runtime.persistPlayer(snapshot);
      },
      publish: ports.runtime.publish,
      onPublicationFailure: ports.runtime.onPublicationFailure,
    };
  }

  /** Applies the delivered benefit exactly once; safe to call repeatedly (a no-op once `completionApplied`), which
   *  is how a completion-persist failure is retried — simply by being reconsidered on the next pump tick. */
  async function completeDeliveryBenefit(identity: DesktopApiAccountIdentity | null, deliveryId: string): Promise<void> {
    const deps = deliveryTransactionDependencies(identity);
    await authority.runInternalTransaction((state, control) => {
      const record = (control.deliveries ?? []).find((entry) => entry.deliveryId === deliveryId);
      if (!record || record.status !== 'delivered' || record.completionApplied) return null;
      const feedbackReward = control.feedbackReward ?? { hasLegacySubmission: false, lastSuccessfulSubmissionAt: null };
      const completion = completeDeliveredBenefit(state, control.deliveries ?? [], feedbackReward, deliveryId, deps.now());
      return { state: completion.state, control: { ...control, deliveries: completion.deliveries, feedbackReward: completion.feedbackReward }, stateChanged: completion.stateChanged, controlChanged: true };
    }, deps);
  }

  /** Persists an already-final network outcome. If persistence fails, the in-memory snapshot is left untouched (the
   *  job still reads `sending`), so the caller remembers the outcome in `pendingDeliverySettlement` and retries
   *  persisting it — never the send itself — on the next tick (9.1.4.15: "retry local completion, never the remote
   *  send"). */
  async function settleClaimedDelivery(identity: DesktopApiAccountIdentity | null, deliveryId: string, outcome: ApiV1DeliveryOutcome): Promise<void> {
    const deps = deliveryTransactionDependencies(identity);
    const after = await authority.runInternalTransaction((state, control) => {
      const record = (control.deliveries ?? []).find((entry) => entry.deliveryId === deliveryId);
      if (!record || record.status !== 'sending') return null;
      const deliveries = settleDelivery(control.deliveries ?? [], deliveryId, outcome, deps.now());
      return { state, control: { ...control, deliveries }, stateChanged: false, controlChanged: true };
    }, deps);
    const settled = after.control.deliveries?.find((entry) => entry.deliveryId === deliveryId);
    if (settled && settled.status === 'sending') {
      pendingDeliverySettlement = { deliveryId, outcome };
      return;
    }
    pendingDeliverySettlement = null;
    if (settled?.status === 'delivered') await completeDeliveryBenefit(identity, deliveryId);
  }

  async function pumpDeliveriesOnce(): Promise<void> {
    if (pumpingDeliveries) return;
    pumpingDeliveries = true;
    try {
      // Pinned for this whole tick: an identity change (logout) mid-send is a narrow edge case this does not fully
      // solve, but every step of one tick stays internally consistent about which account it is acting for.
      const identity = activeIdentity;
      if (pendingDeliverySettlement) {
        await settleClaimedDelivery(identity, pendingDeliverySettlement.deliveryId, pendingDeliverySettlement.outcome);
        if (pendingDeliverySettlement) return;
      }
      const deliveredUnapplied = authority.getSnapshot().control.deliveries?.find((entry) => entry.status === 'delivered' && !entry.completionApplied);
      if (deliveredUnapplied) await completeDeliveryBenefit(identity, deliveredUnapplied.deliveryId);

      const deps = deliveryTransactionDependencies(identity);
      const claimResult = await authority.runInternalTransaction((state, control) => {
        const { deliveries, claimed } = claimNextDelivery(control.deliveries ?? [], deps.now());
        if (!claimed) return null;
        return { state, control: { ...control, deliveries }, stateChanged: false, controlChanged: true };
      }, deps);
      const claimed = claimResult.control.deliveries?.find((entry) => entry.status === 'sending');
      if (!claimed) return;
      if (!claimed.payload) {
        await settleClaimedDelivery(identity, claimed.deliveryId, { kind: 'rejected', reason: 'missing_payload' });
        return;
      }
      const outcome = await ports.delivery.send(claimed);
      await settleClaimedDelivery(identity, claimed.deliveryId, outcome);
    } finally {
      pumpingDeliveries = false;
    }
  }

  function startDeliveryPump(): () => void {
    void pumpDeliveriesOnce();
    const interval = setInterval(() => { void pumpDeliveriesOnce(); }, 5_000);
    return () => clearInterval(interval);
  }

  async function handleUnserialized(templateOperation: string, raw: unknown, trustedInProcess = false): Promise<ApiV1ApplicationResponse> {
    const request = asRecord(raw);
    const operation = resolveOperation(templateOperation, asRecord(request.pathParameters));

    if (operation === 'fundamental/status') {
      return { data: { systemStatus: ports.runtime.readiness(), versionBuild: ports.runtime.versionBuild(), environment: ports.runtime.environment() } };
    }
    if (operation === 'help/overview') {
      return { data: { endpoints: (await import('./generatedOperationCatalog')).API_V1_OPERATIONS.map((entry) => ({ method: entry.method, path: entry.path, access: entry.access, purpose: entry.purpose })) } };
    }
    if (operation === 'help/endpoints') {
      return { data: { requirements: ports.help.requirements, detail: ports.help.detail, schemaVersion: 1 } };
    }
    if (!trustedInProcess && !ports.desktopAvailable()) return failure(503, 'runtime_unavailable', 'Desktop API services are unavailable.');

    if (operation === 'fundamental/signUp') {
      const created = await signUpApiAccount(request, ports.session);
      if (!created.ok) return failure(created.status, created.code, created.message, created.details);
      return { revision: 0, data: { ...created.identity, revision: 0 } };
    }

    if (operation === 'fundamental/logIn') {
      const login = await logInApiAccount(request, activeSession(), ports.session);
      if (!login.ok) return failure(login.status, login.code, login.message, login.details);
      const { session } = login;
      activeIdentity = session.identity;
      authority.replaceSnapshot({ state: session.state, control: session.control as ApiV1ControlMetadata, simulatedAt: session.simulatedAt });
      syncAccountDebugOverride();
      ports.onSessionActive(true);
      return { revision: session.control.revisionHighWater, identity: session.identity, data: { ...session.identity } };
    }

    if (operation === 'fundamental/logOut') {
      const session = activeSession();
      const logout = await logOutApiAccount(session ? { ...session, control: session.control as DesktopApiControlMetadata } : null, ports.session);
      if (!logout.ok) return failure(logout.status, logout.code, logout.message, logout.details);
      activeIdentity = null;
      idleSimulatedAt = ports.runtime.now();
      authority.replaceSnapshot({ state: logout.restoredState, control: emptyControl(), simulatedAt: idleSimulatedAt });
      syncAccountDebugOverride();
      ports.onSessionActive(false);
      return { revision: logout.finalRevision, data: { finalPersistedRevision: logout.finalRevision } };
    }

    if (!activeIdentity && !trustedInProcess) return failure(401, 'login_required', 'A logged-in API account is required.');
    const parameters = asRecord(request.parameters);

    if (operation === 'read/observation/popupEventStream') {
      const transport = asRecord(request.transport);
      const lastEventId = typeof transport.lastEventId === 'string' ? transport.lastEventId : null;
      const snapshot = authority.getSnapshot();
      const events = normalizeApiV1PopupEvents(snapshot.control.popupEvents);
      // No cursor means "from the beginning of the retained buffer": the transport layer (which alone knows whether
      // this is a fresh connect or a push/poll tick) decides what to actually deliver to the client from that.
      const start = lastEventId ? events.findIndex((event) => event.eventId === lastEventId) : -1;
      if (lastEventId && start < 0) return failure(400, 'invalid_cursor', 'The popup replay cursor is unavailable.');
      return { revision: snapshot.control.revisionHighWater, data: { events: events.slice(start + 1) } };
    }

    if (operation.startsWith('read/') || operation.startsWith('resources/')) {
      const snapshot = authority.getSnapshot();
      if (operation.endsWith('/simulationRun') && request.expectedRevision !== undefined && Number(request.expectedRevision) !== snapshot.control.revisionHighWater) {
        return failure(409, 'stale_revision', 'The supplied revision is stale.', { currentRevision: snapshot.control.revisionHighWater });
      }
      try {
        const data = await buildApiV1ReadData(operation, snapshot.state, parameters, {
          revision: snapshot.control.revisionHighWater,
          environment: ports.runtime.environment(),
          gameMode: ports.runtime.gameMode(),
          enemyLevelOffset: ports.runtime.enemyLevelOffset(),
          // The player's in-game time is the wall clock of the request; an API account's is its own clock.
          inGameTime: activeIdentity ? snapshot.simulatedAt : ports.runtime.now(),
          simulation: (partyIndex, count) => ports.runtime.simulate(snapshot.state, partyIndex, count),
          control: snapshot.control,
          // The live cycle and the disclosed logs belong to the ordinary player's runtime; an API account has neither, and its
          // charge clock runs at its own debug Speed of Time.
          ...(activeIdentity ? { chargeDurationScale: accountTimeScale(snapshot.control.settings) } : {
            partyCycle: ports.runtime.partyCycle,
            disclosedLog: ports.runtime.disclosedExpeditionLog,
            headerRuntime: ports.runtime.headerRuntime,
            displaySettings: ports.runtime.displaySettings,
            debugSettings: ports.runtime.debugSettings,
            enemyEditSettings: ports.runtime.enemyEditSettings,
            colosseumEnabled: ports.runtime.colosseumEnabled?.(),
            chargeDurationScale: ports.runtime.cycleDurationScale(),
          }),
        });
        return { revision: snapshot.control.revisionHighWater, data };
      } catch (error) {
        const missing = String(error).includes('not_found');
        // SpecRef: 9.1.4.3 | A cursor from another route, filter set, or revision is `invalid_cursor`.
        if (!missing && /\binvalid_cursor\b/.test(String(error))) return failure(400, 'invalid_cursor', 'The cursor does not match this list.');
        return failure(missing ? 404 : 400, missing ? 'not_found' : 'invalid_request', 'The requested projection is unavailable.');
      }
    }

    if (!operation.startsWith('commit/')) return failure(404, 'not_found', 'The operation does not exist.');
    const transport = asRecord(request.transport);
    const identity = activeIdentity;
    const result = await authority.executeCommit({
      operation,
      expectedRevision: Number(request.expectedRevision),
      idempotencyKey: String(request.idempotencyKey ?? ''),
      confirmationToken: typeof request.confirmationToken === 'string' ? request.confirmationToken : null,
      requestId: String(transport.requestId ?? ports.runtime.createOpaqueId()),
      parameters,
      uploadedFiles: asRecord(request.uploadedFiles) as Record<string, Record<string, unknown>>,
    }, {
      gameMode: ports.runtime.gameMode(),
      enemyLevelOffset: ports.runtime.enemyLevelOffset(),
      // An API account's clocks run at its own debug Speed of Time; the player's runtime speed never leaks into it.
      cycleDurationScale: identity ? accountTimeScale(authority.getSnapshot().control.settings) : ports.runtime.cycleDurationScale(),
      ...(identity ? { chargeDurationScale: accountTimeScale(authority.getSnapshot().control.settings) } : {}),
      applyAutoEquipment: ports.runtime.applyAutoEquipment,
      createOpaqueId: ports.runtime.createOpaqueId,
      createRandomSeed: ports.runtime.createRandomSeed,
      now: ports.runtime.now,
      notifyPopupActivity: ports.runtime.notifyPopupActivity,
      persist: async (snapshot, control) => {
        if (identity) await ports.session.accounts.commit(identity, encodePersistedState(JSON.stringify(serializeGameState(snapshot))), control as DesktopApiControlMetadata);
        else if ((operation === 'commit/setting/backup/import' || operation === 'commit/setting/backup/reset') && ports.runtime.persistPlayerReplacement) await ports.runtime.persistPlayerReplacement(snapshot);
        else await ports.runtime.persistPlayer(snapshot);
      },
      publish: ports.runtime.publish,
      // The live party cycle belongs to the ordinary player's runtime; an API account has none, so a sortie for it
      // neither reads nor writes one.
      ...(identity ? {} : {
        playerClock: ports.runtime.now,
        chargeDurationScale: ports.runtime.cycleDurationScale(),
        colosseumEnabled: ports.runtime.colosseumEnabled,
        partyCycle: ports.runtime.partyCycle,
        restDurationMs: ports.runtime.restDurationMs,
        applyPartyCycleWrites: ports.runtime.applyPartyCycleWrites,
        displaySettings: ports.runtime.displaySettings,
        applyDisplaySettings: ports.runtime.applyDisplaySettings,
        debugSettings: ports.runtime.debugSettings,
        applyDebugSettings: ports.runtime.applyDebugSettings,
        enemyEditSettings: ports.runtime.enemyEditSettings,
        applyEnemyEditSettings: ports.runtime.applyEnemyEditSettings,
      }),
      onPublicationFailure: ports.runtime.onPublicationFailure,
      yieldBetweenChunks: ports.runtime.yieldBetweenChunks,
    });
    if (identity) syncAccountDebugOverride();
    if (!result.ok) {
      const status = result.error.code === 'not_found' ? 404 : result.error.code === 'save_failed' ? 500 : CONFLICT_CODES.has(result.error.code) ? 409 : 400;
      return failure(status, result.error.code, result.error.message, result.error.details);
    }
    // A successful progressReport/feedback commit may have just queued a job; nudge the sender immediately instead
    // of waiting for the next poll tick. Fire-and-forget: the commit itself already returned `queued`, not delivered.
    if (operation === 'commit/progress/progressReport' || operation === 'commit/setting/feedback') void pumpDeliveriesOnce();
    return result.response as unknown as ApiV1ApplicationResponse;
  }

  function handle(templateOperation: string, raw: unknown): Promise<ApiV1ApplicationResponse> {
    return SERIALIZED_OPERATIONS.has(templateOperation)
      ? authority.runExclusive(() => handleUnserialized(templateOperation, raw))
      : handleUnserialized(templateOperation, raw);
  }

  function createInProcessAdapter(options?: { restrictDuringSession?: boolean }): InProcessApiAdapter {
    const listeners = new Set<() => void>();
    const notifyCommitted = (response: ApiV1ApplicationResponse) => {
      if (response.error) return;
      for (const listener of [...listeners]) listener();
    };
    const read = (operation: string, input: { pathParameters?: Record<string, unknown>; parameters?: Record<string, unknown> } | undefined) => handleUnserialized(operation, {
      pathParameters: input?.pathParameters ?? {}, parameters: input?.parameters ?? {}, uploadedFiles: {}, transport: { requestId: ports.runtime.createOpaqueId() },
    }, true);
    const commit: InProcessApiAdapter['commit'] = async (operation, input) => {
      // The renderer may keep reading and navigating while an external API client owns the save.
      // Guard effects as well as clicks: some views acknowledge displayed items when mounted.
      if (options?.restrictDuringSession && activeIdentity) {
        return failure(409, 'apiControlActive', 'API control is active.');
      }
      const request = {
        pathParameters: input?.pathParameters ?? {}, parameters: input?.parameters ?? {}, uploadedFiles: input?.uploadedFiles ?? {},
        transport: { requestId: ports.runtime.createOpaqueId() },
        expectedRevision: authority.getSnapshot().control.revisionHighWater,
        idempotencyKey: ports.runtime.createOpaqueId(),
      };
      const first = await handleUnserialized(operation, request, true);
      const error = asRecord(first.error);
      const details = asRecord(error.details);
      if (input?.confirmed === true && error.code === 'confirmation_required' && typeof details.confirmationToken === 'string') {
        const confirmed = await handleUnserialized(operation, { ...request, confirmationToken: details.confirmationToken }, true);
        notifyCommitted(confirmed);
        return confirmed;
      }
      notifyCommitted(first);
      return first;
    };
    const subscribe: InProcessApiAdapter['subscribe'] = (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    };
    return { read, commit, subscribe };
  }

  return {
    handle,
    syncIdleState: (state) => {
      if (activeIdentity) return;
      authority.replaceSnapshot({ state, control: authority.getSnapshot().control, simulatedAt: idleSimulatedAt });
    },
    isSessionActive: () => activeIdentity !== null,
    authority,
    createInProcessAdapter,
    pumpDeliveries: pumpDeliveriesOnce,
    startDeliveryPump,
  };
}
