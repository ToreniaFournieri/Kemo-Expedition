import type { GameState } from '../../types';
import { serializeGameState } from '../../game/saveCodec';
import { encodePersistedState } from '../../game/storageCompression';
import { createApiRandom, withGameplayRandomSource } from '../../game/gameplayRandom';
import { createFreshGameState } from '../../hooks/useGameState';
import { decodeApiSavePayload } from './commitOperations';
import { stageApiV1ElapsedProgression } from './elapsedProgression';
import { recoverInterruptedDeliveries } from './deliveries';
import { accountDebugSettingsOf, accountTimeScale } from './debugSettings';
import { getGameplayDebugOverride, setGameplayDebugOverride } from '../../game/debugSettings';
import { setColosseumEnemySettingsOverride } from '../../game/colosseum';
import { accountEnemyEditSettingsOf } from './enemyEditPane';
import { ensureLanguageLoaded } from '../../i18n/index.ts';
import { appendApiV1PopupEvents, normalizeApiV1PopupEvents, planApiV1PopupCandidates } from './popupEvents';

// SpecRef: 9.1.3.2 | API requirement fundamental | signUp / logIn / logOut
// SpecRef: 9.1.4.16 | Admitted work, disconnection, and shutdown | Durable hand-back before releasing authority

export type ApiV1SessionFailure = { ok: false; status: number; code: string; message: string; details?: Record<string, unknown> };

export interface ApiV1SessionPorts {
  /** Desktop account store (durable, generation-based). */
  accounts: {
    create: (identity: DesktopApiAccountIdentity, savePayload: string) => Promise<DesktopApiAccountIdentity>;
    load: (identity: DesktopApiAccountIdentity) => Promise<DesktopApiAccountRecord | null>;
    commit: (identity: DesktopApiAccountIdentity, savePayload: string, control: DesktopApiControlMetadata) => Promise<boolean>;
  };
  /** The player's own save, which must survive an API session and be restored on logout or restart. */
  player: {
    flushSave: () => Promise<void>;
    exportPayload: () => Promise<string>;
    returnPayload: { get: () => string | null; set: (payload: string) => void; clear: () => void };
  };
  /** Replaces the live runtime state; resolves `state: null` with an error log when the state cannot be hydrated. */
  importGameState: (state: GameState) => Promise<{ state: GameState | null; errorLog: string | null }>;
  /** Persists the current authoritative runtime state under the active account. */
  exportActiveAccountPayload: () => Promise<string>;
  now: () => number;
  /** Catch-up collaborators; none of them may read React state directly. */
  catchUp: {
    maximumElapsedMs: number;
    applyAutoEquipment: (state: GameState, partyIndex: number, characterId: number | undefined, forceFull: boolean) => GameState;
    yieldBetweenChunks: () => Promise<void>;
    randomSeed: () => number;
  };
}

export interface ApiV1ActiveSession {
  identity: DesktopApiAccountIdentity;
  control: DesktopApiControlMetadata;
  state: GameState;
  simulatedAt: number;
}

const LANGUAGES = ['ja', 'en', 'zh-CN', 'zh-TW', 'ko'] as const;
const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,16}$/;

function fail(status: number, code: string, message: string, details?: Record<string, unknown>): ApiV1SessionFailure {
  return { ok: false, status, code, message, ...(details ? { details } : {}) };
}

function parseIdentity(request: Record<string, unknown>, defaultOrcaOffset: boolean): DesktopApiAccountIdentity {
  return {
    userId: String(request.userId ?? ''),
    environment: String(request.environment ?? '') as DesktopApiAccountIdentity['environment'],
    gameMode: String(request.gameMode ?? '') as DesktopApiAccountIdentity['gameMode'],
    ...(request.levelOffsetForOrca === undefined
      ? (defaultOrcaOffset ? { levelOffsetForOrca: 5 } : {})
      : { levelOffsetForOrca: Number(request.levelOffsetForOrca) }),
  };
}

export async function signUpApiAccount(request: Record<string, unknown>, ports: ApiV1SessionPorts): Promise<{ ok: true; identity: DesktopApiAccountIdentity } | ApiV1SessionFailure> {
  const identity = parseIdentity(request, true);
  if (!USER_ID_PATTERN.test(identity.userId)) return fail(400, 'invalid_request', 'userId is invalid.', { field: 'userId' });
  try {
    const language = (LANGUAGES as readonly string[]).includes(String(request.language)) ? String(request.language) as GameState['global']['language'] : 'ja';
    const savePayload = encodePersistedState(JSON.stringify(serializeGameState(createFreshGameState(language))));
    await ports.accounts.create(identity, savePayload);
    return { ok: true, identity };
  } catch (error) {
    const exists = String(error).includes('already_exists');
    return fail(exists ? 409 : 400, exists ? 'already_exists' : 'invalid_request', 'The API user could not be created.');
  }
}

/**
 * Loads the account, stages login catch-up privately, durably commits it, and only then swaps the live runtime state.
 * Any failure before the swap leaves the player's runtime state untouched and clears the pending return payload.
 */
export async function logInApiAccount(request: Record<string, unknown>, activeSession: ApiV1ActiveSession | null, ports: ApiV1SessionPorts): Promise<{ ok: true; session: ApiV1ActiveSession } | ApiV1SessionFailure> {
  if (activeSession) return fail(409, 'control_unavailable', 'Another API account is active.');
  const identity = parseIdentity(request, false);
  let returnPayloadWritten = false;
  let swapped = false;
  try {
    const account = await ports.accounts.load(identity);
    if (!account) return fail(404, 'not_found', 'The API user was not found.');
    await ports.player.flushSave();
    ports.player.returnPayload.set(await ports.player.exportPayload());
    returnPayloadWritten = true;

    let accountState = decodeApiSavePayload(account.savePayload);
    // The runtime only preloads the player's own language; the account's save may use another one (e.g. `en`), and
    // rendering it with an unloaded dictionary throws. Load it before anything is committed or swapped.
    await ensureLanguageLoaded(accountState.global.language);
    const control = structuredClone(account.control);
    control.popupEvents = normalizeApiV1PopupEvents(control.popupEvents);
    const realNow = ports.now();
    // SpecRef: 9.1.4.15 | A process restart while sending cannot know the remote outcome: those jobs become `unknown`.
    if (control.deliveries?.some((record) => record.status === 'sending')) control.deliveries = recoverInterruptedDeliveries(control.deliveries, realNow);
    const previousInGameTime = Number.isFinite(control.inGameTime) ? Number(control.inGameTime) : realNow;
    const catchUpMs = Math.min(ports.catchUp.maximumElapsedMs, Math.max(0, realNow - previousInGameTime));
    if (catchUpMs >= 60_000) {
      const beforeCatchUp = accountState;
      const apiRandom = createApiRandom(control.rngState ?? ports.catchUp.randomSeed());
      let randomDrawCount = 0;
      // The catch-up runs under the account's own debug settings: its Speed of Time and its gameplay Debug rules.
      const previousOverride = getGameplayDebugOverride();
      setGameplayDebugOverride(accountDebugSettingsOf(control.settings));
      setColosseumEnemySettingsOverride(accountEnemyEditSettingsOf(control.settings));
      let catchUp;
      try {
        catchUp = await stageApiV1ElapsedProgression(accountState, { calculateToRealTime: true }, {
          simulatedAt: previousInGameTime,
          realNow,
          gameMode: identity.gameMode === 'orca' ? 'mode.orca' : 'mode.normal',
          enemyLevelOffset: identity.levelOffsetForOrca ?? 5,
          cycleDurationScale: accountTimeScale(control.settings),
          applyAutoEquipment: ports.catchUp.applyAutoEquipment,
          runWithRandom: operation => withGameplayRandomSource(() => { randomDrawCount += 1; return apiRandom.next(); }, operation),
          yieldBetweenChunks: ports.catchUp.yieldBetweenChunks,
          maximumElapsedSeconds: Math.floor(ports.catchUp.maximumElapsedMs / 1_000),
          allowExtendedElapsedSeconds: true,
        });
      } finally {
        // The application API installs the account's overrides for the session once the login succeeds.
        setGameplayDebugOverride(previousOverride);
        setColosseumEnemySettingsOverride(null);
      }
      accountState = catchUp.state;
      if (randomDrawCount > 0) control.rngState = apiRandom.state;
      const revision = control.revisionHighWater + 1;
      control.popupEvents = appendApiV1PopupEvents(
        control.popupEvents,
        planApiV1PopupCandidates('commit/progress/elapsed', beforeCatchUp, accountState, catchUp.data),
        revision,
        new Date(realNow).toISOString(),
      );
      control.revisionHighWater = revision;
    }
    control.inGameTime = Math.max(previousInGameTime, realNow);
    await ports.accounts.commit(account.identity, encodePersistedState(JSON.stringify(serializeGameState(accountState))), control);
    const imported = await ports.importGameState(accountState);
    if (!imported.state) throw new Error(imported.errorLog ?? 'account_load_failed');
    swapped = true;
    return { ok: true, session: { identity: account.identity, control, state: imported.state, simulatedAt: control.inGameTime } };
  } catch (error) {
    if (returnPayloadWritten && !swapped) ports.player.returnPayload.clear();
    return fail(500, 'save_failed', 'The API account could not be loaded.', { reason: String(error) });
  }
}

/**
 * Durably persists the account, then restores the player's own save. A failure at either step keeps the session active
 * (the caller must not release control) and never discards the pending return payload.
 */
export async function logOutApiAccount(session: ApiV1ActiveSession | null, ports: ApiV1SessionPorts): Promise<{ ok: true; finalRevision: number; restoredState: GameState } | ApiV1SessionFailure> {
  if (!session) return fail(401, 'login_required', 'No API account is active.');
  try {
    await ports.accounts.commit(session.identity, await ports.exportActiveAccountPayload(), session.control);
    const finalRevision = session.control.revisionHighWater;
    const playerPayload = ports.player.returnPayload.get();
    if (!playerPayload) throw new Error('player_return_save_missing');
    const restored = await ports.importGameState(decodeApiSavePayload(playerPayload));
    if (!restored.state) throw new Error(restored.errorLog ?? 'player_restore_failed');
    ports.player.returnPayload.clear();
    return { ok: true, finalRevision, restoredState: restored.state };
  } catch (error) {
    return fail(500, 'save_failed', 'Logout could not durably restore the player save.', { reason: String(error) });
  }
}
