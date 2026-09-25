import assert from 'node:assert/strict';
import {
  logInApiAccount,
  logOutApiAccount,
  signUpApiAccount,
  type ApiV1ActiveSession,
  type ApiV1SessionPorts,
} from '../../src/api/v1/sessionLifecycle';
import { createFreshGameState } from '../../src/hooks/useGameState';
import { serializeGameState } from '../../src/game/saveCodec';
import { encodePersistedState } from '../../src/game/storageCompression';
import type { GameState } from '../../src/types';
import { setLanguage } from '../../src/i18n/index.ts';

// SpecRef: 9.1.3.2 | API requirement fundamental | signUp / logIn / logOut
// Isolated, transport-neutral behavioral coverage for the account/session boundary: no React, Electron, or HTTP.

const fixedNow = Date.parse('2026-01-01T00:00:00.000Z');

function accountPayload(state: GameState): string {
  return encodePersistedState(JSON.stringify(serializeGameState(state)));
}

function ports(overrides: Partial<ApiV1SessionPorts> = {}): {
  value: ApiV1SessionPorts;
  accountsCreated: Array<{ identity: DesktopApiAccountIdentity; savePayload: string }>;
  accountsCommitted: Array<{ identity: DesktopApiAccountIdentity; savePayload: string; control: DesktopApiControlMetadata }>;
  imported: GameState[];
  returnStore: { value: string | null };
} {
  const accountsCreated: Array<{ identity: DesktopApiAccountIdentity; savePayload: string }> = [];
  const accountsCommitted: Array<{ identity: DesktopApiAccountIdentity; savePayload: string; control: DesktopApiControlMetadata }> = [];
  const imported: GameState[] = [];
  const returnStore: { value: string | null } = { value: null };
  const account: DesktopApiAccountRecord = {
    identity: { userId: 'Taro', environment: 'desktop', gameMode: 'normal' },
    savePayload: accountPayload(createFreshGameState('ja', fixedNow - 30_000)),
    control: { revisionHighWater: 5, inGameTime: fixedNow - 30_000, receipts: [], tombstones: [], popupEvents: [], deliveries: [] },
  };
  const value: ApiV1SessionPorts = {
    accounts: {
      create: async (identity, savePayload) => { accountsCreated.push({ identity, savePayload }); return identity; },
      load: async () => account,
      commit: async (identity, savePayload, control) => { accountsCommitted.push({ identity, savePayload, control }); return true; },
    },
    player: {
      flushSave: async () => undefined,
      exportPayload: async () => accountPayload(createFreshGameState('ja', fixedNow)),
      returnPayload: {
        get: () => returnStore.value,
        set: (payload) => { returnStore.value = payload; },
        clear: () => { returnStore.value = null; },
      },
    },
    importGameState: async (state) => { imported.push(state); return { state, errorLog: null }; },
    exportActiveAccountPayload: async () => accountPayload(createFreshGameState('ja', fixedNow)),
    now: () => fixedNow,
    catchUp: {
      maximumElapsedMs: 12 * 3_600_000,
      applyAutoEquipment: (state) => state,
      yieldBetweenChunks: async () => undefined,
      randomSeed: () => 0xa91f_0028,
    },
    ...overrides,
  };
  return { value, accountsCreated, accountsCommitted, imported, returnStore };
}

// 1. signUp rejects an invalid userId without touching the account store.
{
  const p = ports();
  const result = await signUpApiAccount({ userId: 'not valid!', environment: 'desktop', gameMode: 'normal' }, p.value);
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('expected invalid_request');
  assert.equal(result.code, 'invalid_request');
  assert.equal(p.accountsCreated.length, 0);
}

// 2. signUp creates a fresh save under the requested identity.
{
  const p = ports();
  const result = await signUpApiAccount({ userId: 'Taro', environment: 'desktop', gameMode: 'normal', language: 'en' }, p.value);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.code);
  assert.equal(result.identity.userId, 'Taro');
  assert.equal(p.accountsCreated.length, 1);
}

// 3. logIn rejects a second login while a session is already active, without touching the account store.
{
  const p = ports();
  const existing: ApiV1ActiveSession = {
    identity: { userId: 'Someone', environment: 'desktop', gameMode: 'normal' },
    control: { revisionHighWater: 0, receipts: [], tombstones: [], popupEvents: [], deliveries: [] },
    state: createFreshGameState('ja', fixedNow),
    simulatedAt: fixedNow,
  };
  const result = await logInApiAccount({ userId: 'Taro', environment: 'desktop', gameMode: 'normal' }, existing, p.value);
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('expected control_unavailable');
  assert.equal(result.code, 'control_unavailable');
}

// 4. logIn returns not_found for an unknown account and does not stage the player return payload.
{
  const p = ports({ accounts: { create: async (i) => i, load: async () => null, commit: async () => true } });
  const result = await logInApiAccount({ userId: 'Ghost', environment: 'desktop', gameMode: 'normal' }, null, p.value);
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('expected not_found');
  assert.equal(result.code, 'not_found');
  assert.equal(p.returnStore.value, null, 'no player return payload is written before the account is confirmed to exist');
}

// 5. logIn below the 60s catch-up threshold hydrates the account without running elapsed progression, stages the
// player's own save for later logout, durably commits the account, and swaps the live runtime state.
{
  const p = ports();
  const result = await logInApiAccount({ userId: 'Taro', environment: 'desktop', gameMode: 'normal' }, null, {
    ...p.value,
    now: () => fixedNow - 30_000 + 10_000, // 10s since the account's saved inGameTime: below the 60s catch-up floor
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.code);
  assert.equal(result.session.identity.userId, 'Taro');
  assert.equal(p.accountsCommitted.length, 1, 'login always durably commits the advanced inGameTime, even with no catch-up');
  assert.equal(p.imported.length, 1);
  assert.ok(p.returnStore.value, 'the player return payload is staged before the runtime state is swapped');
}

// 6. Login catch-up uses the same popup transaction boundary: grouped AFK events are in the account commit that advances
// the revision and are already present when the runtime snapshot is swapped.
{
  const p = ports();
  const catchUpState = createFreshGameState('ja', fixedNow - 180_000);
  const account: DesktopApiAccountRecord = {
    identity: { userId: 'Taro', environment: 'desktop', gameMode: 'normal' },
    savePayload: accountPayload(catchUpState),
    // The catch-up runs at the account's own debug Speed of Time (x100), never the player's runtime speed.
    control: { revisionHighWater: 5, inGameTime: fixedNow - 180_000, receipts: [], tombstones: [], popupEvents: [], deliveries: [], settings: { debug: { speedOfTime: 'x100' } } },
  };
  p.value.accounts.load = async () => account;
  p.value.catchUp.applyAutoEquipment = (state, partyIndex) => ({
    ...state,
    parties: state.parties.map((party, index) => index === partyIndex ? {
      ...party,
      expeditionStats: { ...party.expeditionStats, Clear: party.expeditionStats.Clear + 1 },
    } : party),
  });
  const location = globalThis as { location?: { pathname: string } };
  const previousLocation = location.location;
  location.location = { pathname: '/dev/' };
  let result;
  try {
    result = await logInApiAccount({ userId: 'Taro', environment: 'desktop', gameMode: 'normal' }, null, p.value);
  } finally {
    location.location = previousLocation;
  }
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result));
  if (!result.ok) throw new Error(result.code);
  assert.equal(result.session.control.revisionHighWater, 6);
  assert.ok(result.session.control.popupEvents?.some((event) => event.eventKey === 'popup.afkSummary'));
  assert.deepEqual(p.accountsCommitted[0].control.popupEvents, result.session.control.popupEvents, 'catch-up events are durable before publication');
}

// 7. logOut restores the exact staged player return payload and clears it, and reports the durable final revision.
{
  const p = ports();
  const stagedPlayerState = createFreshGameState('en', fixedNow);
  p.returnStore.value = accountPayload(stagedPlayerState);
  const session: ApiV1ActiveSession = {
    identity: { userId: 'Taro', environment: 'desktop', gameMode: 'normal' },
    control: { revisionHighWater: 7, receipts: [], tombstones: [], popupEvents: [], deliveries: [] },
    state: createFreshGameState('ja', fixedNow),
    simulatedAt: fixedNow,
  };
  const result = await logOutApiAccount(session, p.value);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.code);
  assert.equal(result.finalRevision, 7);
  assert.equal(result.restoredState.global.language, 'en', 'the restored state is the staged player save, not the account state');
  assert.equal(p.returnStore.value, null, 'the staged return payload is consumed exactly once');
  assert.equal(p.accountsCommitted.length, 1, 'the account is durably persisted before the player save is restored');
}

// 8. logOut without an active session is login_required.
{
  const p = ports();
  const result = await logOutApiAccount(null, p.value);
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('expected login_required');
  assert.equal(result.code, 'login_required');
}

// 9. logOut fails safely (and never clears the return payload) when no player return payload was staged, e.g. after a
// crash between login's account swap and a later logout in the same process.
{
  const p = ports();
  p.returnStore.value = null;
  const session: ApiV1ActiveSession = {
    identity: { userId: 'Taro', environment: 'desktop', gameMode: 'normal' },
    control: { revisionHighWater: 1, receipts: [], tombstones: [], popupEvents: [], deliveries: [] },
    state: createFreshGameState('ja', fixedNow),
    simulatedAt: fixedNow,
  };
  const result = await logOutApiAccount(session, p.value);
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('expected save_failed');
  assert.equal(result.code, 'save_failed');
}

// 10. logIn to an account saved in a language the runtime has not loaded yet (only `ja` is bundled) loads that
// dictionary before the swap, so rendering the swapped state with `setLanguage(state.global.language)` cannot throw.
{
  const p = ports();
  const englishAccount: DesktopApiAccountRecord = {
    identity: { userId: 'Taro', environment: 'desktop', gameMode: 'normal' },
    savePayload: accountPayload(createFreshGameState('en', fixedNow - 30_000)),
    control: { revisionHighWater: 5, inGameTime: fixedNow - 30_000, receipts: [], tombstones: [], popupEvents: [], deliveries: [] },
  };
  assert.throws(() => setLanguage('en'), /Language dictionary is not loaded: en/, 'precondition: en is not preloaded');
  const result = await logInApiAccount({ userId: 'Taro', environment: 'desktop', gameMode: 'normal' }, null, {
    ...p.value,
    accounts: { ...p.value.accounts, load: async () => englishAccount },
    importGameState: async (state) => { setLanguage(state.global.language); return { state, errorLog: null }; },
  });
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result));
  if (!result.ok) throw new Error(result.code);
  assert.equal(result.session.state.global.language, 'en');
  setLanguage('ja');
}

console.log('apiV1SessionLifecycle profile ok');
