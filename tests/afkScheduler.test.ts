import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  AFK_MAX_EFFECTIVE_ELAPSED_MS,
  AFK_MAX_REAL_ELAPSED_MS,
  createAfkSchedulerProfile,
  getAdaptiveAfkOperationCount,
  getAfkBatchBudgetMs,
  getEffectiveAfkElapsedMs,
  getAfkOperationWindow,
  normalizePersistedAfkChunkCursor,
  observeAfkRecoveryBacklog,
  recordAfkSchedulerBatch,
  shouldPauseOnlineProgressForAfk,
} from '../src/game/afkSchedulerCore.ts';

const hookSource = readFileSync(new URL('../src/hooks/useGameState.ts', import.meta.url), 'utf8');
const battleCandidateSource = readFileSync(new URL('../src/game/battleCandidate.ts', import.meta.url), 'utf8');
const homeSource = readFileSync(new URL('../src/components/HomeScreen.tsx', import.meta.url), 'utf8');
const liveProfileSource = readFileSync(new URL('../src/game/afkLiveProfile.ts', import.meta.url), 'utf8');
const rendererProfileSource = readFileSync(
  new URL('./support/expedition8RendererBaseline.profile.ts', import.meta.url),
  'utf8',
);
const HOUR_MS = 60 * 60 * 1000;

test('AFK elapsed time uses the specified progressive efficiency bands', () => {
  const cases = [
    [0, 0],
    [9, 9],
    [18, 15],
    [30, 21],
    [48, 27],
    [72, 33],
    [108, 39],
    [162, 45],
  ] as const;

  cases.forEach(([elapsedHours, effectiveHours]) => {
    assert.equal(getEffectiveAfkElapsedMs(elapsedHours * HOUR_MS), effectiveHours * HOUR_MS);
  });
  assert.equal(AFK_MAX_REAL_ELAPSED_MS, 162 * HOUR_MS);
  assert.equal(AFK_MAX_EFFECTIVE_ELAPSED_MS, 45 * HOUR_MS);
});

test('AFK efficiency is continuous inside bands and ignores time beyond 162 hours', () => {
  assert.equal(getEffectiveAfkElapsedMs(12 * HOUR_MS), 11 * HOUR_MS);
  assert.equal(getEffectiveAfkElapsedMs(24 * HOUR_MS), 18 * HOUR_MS);
  assert.equal(getEffectiveAfkElapsedMs(200 * HOUR_MS), 45 * HOUR_MS);
  assert.equal(getEffectiveAfkElapsedMs(Number.POSITIVE_INFINITY), 0);
});

test('a logical AFK Chunk retains thirty Cycles per equal-duration party', () => {
  const durationMs = 450_000;
  const operations = getAfkOperationWindow(
    [durationMs, durationMs],
    durationMs * 30,
    0,
    Number.MAX_SAFE_INTEGER,
  );

  assert.equal(operations.length, 60);
  assert.equal(operations.at(-1)?.runIndex, 29);
});

test('partitioned operation windows preserve the unsliced chronological order', () => {
  const durations = [100, 150, 240];
  const elapsedMs = 1_200;
  const complete = getAfkOperationWindow(durations, elapsedMs, 0, Number.MAX_SAFE_INTEGER);
  const partitioned = [
    ...getAfkOperationWindow(durations, elapsedMs, 0, 3),
    ...getAfkOperationWindow(durations, elapsedMs, 3, 5),
    ...getAfkOperationWindow(durations, elapsedMs, 8, complete.length),
  ];

  assert.deepEqual(partitioned, complete);
  assert.deepEqual(complete.slice(0, 6).map(({ runIndex, partyIndex }) => [runIndex, partyIndex]), [
    [0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2],
  ]);
});

test('adaptive batches start conservatively and remain within the requested budget', () => {
  assert.equal(getAdaptiveAfkOperationCount(100, null, 16), 1);
  assert.equal(getAdaptiveAfkOperationCount(100, 2, 10), 4);
  assert.equal(getAdaptiveAfkOperationCount(2, 0.1, 20), 2);
  assert.equal(getAfkBatchBudgetMs({ hardwareConcurrency: 8 }), 16);
  assert.equal(getAfkBatchBudgetMs({ hardwareConcurrency: 4 }), 10);
  assert.equal(getAfkBatchBudgetMs({ hardwareConcurrency: 8, saveData: true }), 6);
});

test('persisted mid-Chunk cursors are normalized without advancing their operation offset', () => {
  const cursor = normalizePersistedAfkChunkCursor({
    elapsedMs: 5_400_000,
    simulatedEndAt: 10_000_000,
    cycleDurationScale: 1,
    cycleDurationByParty: [450_000, 900_000],
    operationCount: 18,
    operationCursor: 7,
  }, 2);

  assert.ok(cursor);
  assert.equal(cursor.operationCursor, 7);
  assert.equal(cursor.operationCount, 18);
  assert.equal(normalizePersistedAfkChunkCursor({ operationCursor: 1 }, 2), null);
});

test('AFK reconstruction requires an observed positive backlog followed by zero', () => {
  const initialZero = observeAfkRecoveryBacklog(0, false);
  assert.deepEqual(initialZero, {
    hasObservedActiveRecovery: false,
    didCompleteRecovery: false,
  });

  const active = observeAfkRecoveryBacklog(5_400_000, initialZero.hasObservedActiveRecovery);
  assert.deepEqual(active, {
    hasObservedActiveRecovery: true,
    didCompleteRecovery: false,
  });

  const completed = observeAfkRecoveryBacklog(0, active.hasObservedActiveRecovery);
  assert.deepEqual(completed, {
    hasObservedActiveRecovery: false,
    didCompleteRecovery: true,
  });

  const settled = observeAfkRecoveryBacklog(0, completed.hasObservedActiveRecovery);
  assert.equal(settled.didCompleteRecovery, false);
});

test('online progression stays paused for every active AFK recovery boundary', () => {
  const unlocked = {
    isHydrating: false,
    pendingAfkMs: 0,
    hasChunkCursor: false,
    shouldRebuildAfterRecovery: false,
  };
  assert.equal(shouldPauseOnlineProgressForAfk(unlocked), false);
  assert.equal(shouldPauseOnlineProgressForAfk({ ...unlocked, isHydrating: true }), true);
  assert.equal(shouldPauseOnlineProgressForAfk({ ...unlocked, pendingAfkMs: 1 }), true);
  assert.equal(shouldPauseOnlineProgressForAfk({ ...unlocked, hasChunkCursor: true }), true);
  assert.equal(shouldPauseOnlineProgressForAfk({ ...unlocked, shouldRebuildAfterRecovery: true }), true);
});

test('profiling aggregates batches in memory without per-Cycle output', () => {
  const initial = createAfkSchedulerProfile(100);
  const first = recordAfkSchedulerBatch(initial, 12, 4, 3);
  const second = recordAfkSchedulerBatch(first, 8, 5, 7);

  assert.equal(second.batches, 2);
  assert.equal(second.cyclePartyOperations, 9);
  assert.equal(second.totalBatchDurationMs, 20);
  assert.equal(second.longestBatchDurationMs, 12);
  assert.equal(second.longestEventLoopDelayMs, 7);
});

test('runtime assigns full or terminal partial thirty-Cycle Chunks with per-Cycle presentation progress', () => {
  assert.match(hookSource, /options\.operationCount \?\? AFK_CHUNK_CYCLE_COUNT/);
  assert.match(hookSource, /options\.onProgress\?\.\(operationIndex \+ 1, operationCount\)/);
  assert.match(hookSource, /partyIndex === options\.partyIndex \? cycleDurationMs : inactiveDurationMs/);
  assert.match(homeSource, /const operationCount = getAfkChunkOperationCount\(remainingMs, cycleDurationMs\)/);
  assert.match(homeSource, /const chunkElapsedMs = cycleDurationMs \* operationCount/);
  assert.match(homeSource, /operationCount,\s*baseState: createAfkPartyChunkWorkerState/);
  assert.match(homeSource, /afkActiveChunkJobsRef\.current\.has\(partyIndex\)[\s\S]{0,120}afkPartyTransactionLocksRef\.current\.has\(partyIndex\)/);
  assert.match(homeSource, /new Worker\(new URL\('\.\.\/workers\/afkChunkWorker\.ts'/);
  assert.match(homeSource, /baseState: createAfkPartyChunkWorkerState\(dispatchState, partyIndex\)/);
  assert.match(homeSource, /hydrateAfkPartyChunkInventoryResult\(event\.data\.result, active\.baseParty, inventoryJob\)/);
  assert.match(homeSource, /createAfkPartyChunkInventoryContinuationWorkerJob/);
  assert.match(homeSource, /now - afkLastProgressRenderAtRef\.current >= 100/);
  assert.match(homeSource, /afkPresentedRemainingByParty\.reduce[\s\S]{0,160}afkPresentedRemainingByParty\.length/);
  assert.match(homeSource, /\.sort\(compareAfkPartyDispatchCandidates\)/);
  assert.match(homeSource, /takeNextAfkFifoResult\(afkCompletedChunkResultsRef\.current\)/);
  assert.match(homeSource, /const arrivalSequence = \+\+afkWorkerResultArrivalSequenceRef\.current/);
  assert.match(homeSource, /afkAuthoritativeDispatchStateRef\.current = afkLiveProfileStateRef\.current/);
  assert.match(homeSource, /afkActiveCommitTransactionRef\.current = \{/);
  assert.match(homeSource, /actions\.commitAfkPartyChunk\(completedResult\)/);
  assert.match(homeSource, /actions\.commitAfkPartyTransaction\([\s\S]{0,500}\(committedState\) =>/);
  assert.match(hookSource, /const committedState = commitAfkPartyChunk\(state, action\.result\)[\s\S]{0,500}action\.autoEquipment\(committedState\)/);
  assert.match(homeSource, /transaction\.stage === 'auto_equipment_dispatched'/);
  assert.match(homeSource, /actions\.applyAutoEquipmentActions\(plan\.actions\)/);
  assert.match(homeSource, /transaction\.stage = 'auto_equipment_dispatched'[\s\S]{0,500}return;/);
  assert.match(homeSource, /afkPartyTransactionLocksRef\.current\.delete\(result\.partyIndex\)[\s\S]{0,160}afkActiveCommitTransactionRef\.current = null/);
  assert.match(homeSource, /const hasOutstandingCoordinatorWork = pendingAfkMs > 0[\s\S]{0,350}afkWorkerPoolRef\.current\.length > 0/);
  assert.match(homeSource, /window\.setTimeout\(\(\) => afkCoordinatorPumpRef\.current\?\.\(\), 0\)/);
  assert.doesNotMatch(homeSource, /afkCoordinatorVersion|setAfkCoordinatorVersion/);
  assert.doesNotMatch(homeSource, /setPendingAfkMs\(pendingAfkMsRef\.current\)/);
  assert.match(homeSource, /afkFinalRemainingMsByPartyRef\.current = \{ \.\.\.afkRemainingMsByPartyRef\.current \}/);
  assert.match(homeSource, /afkFinalRemainingMsByPartyRef\.current\[partyIndex\] \?\? 0/);
  assert.doesNotMatch(homeSource, /mutationCount === 0/);
  assert.doesNotMatch(homeSource, /previousPendingAfkMs <= pendingAfkMs[\s\S]{0,120}runAutoEquipment/);
  assert.match(hookSource, /workerOptimization === 'optimized'[\s\S]{0,600}operationCount,[\s\S]{0,300}onOperationComplete: options\.onProgress/);
  assert.match(hookSource, /optimizedAbilityLevels \?\? getProfitAbilityLevels\(party\)/);
  assert.match(hookSource, /profitAbilityCache\.get\(postFinalizeParty\.id\)/);
  assert.match(hookSource, /hpBaseCache\.get\(postCycleParty\.id\)/);
  assert.match(hookSource, /battleOutputMode: action\.workerOptimization === 'optimized'[\s\S]{0,120}\? 'result-only'/);
  assert.match(hookSource, /shouldRetainCompleteNarration[\s\S]{0,800}executeBattleWithSeed/);
});

test('the canonical renderer profile accepts presentation-only worker progress', () => {
  assert.match(rendererProfileSource, /type: 'progress'; jobId: string; partyIndex: number/);
  assert.match(rendererProfileSource, /event\.data\.type === 'started' \|\| event\.data\.type === 'progress'/);
  assert.match(rendererProfileSource, /baseState: workerState/);
  assert.match(rendererProfileSource, /const workerState = createAfkPartyChunkWorkerState\(baseState, partyIndex\)/);
});

test('the atomic renderer boundary includes planning without double-counting it', () => {
  assert.match(liveProfileSource, /atomicTransactionReactVisibilityMs > 0[\s\S]{0,300}\? atomicTransactionReactVisibilityMs/);
  assert.doesNotMatch(liveProfileSource, /\? autoEquipmentMs \+ atomicTransactionReactVisibilityMs/);
});

test('compact battle output remains isolated to the live-profile candidate', () => {
  assert.match(liveProfileSource, /useAfkWorkerSimulationCandidate\(\): boolean \{\s*return true;/);
  assert.match(
    liveProfileSource,
    /useAfkCompactBattleResultCandidate\(\): boolean \{[\s\S]{0,240}return __AFK_LIVE_PROFILE_ENABLED__ && runtime\?\.variant === 'candidate';/,
  );
});

test('renderer Party-status memoization is production-on and independently profileable', () => {
  assert.match(
    liveProfileSource,
    /useAfkRendererPartyStatsMemo\(\): boolean \{\s*return !__AFK_LIVE_PROFILE_ENABLED__[\s\S]{0,160}runtime\?\.variant === 'renderer-memo'[\s\S]{0,80}runtime\?\.variant === 'candidate';/,
  );
  assert.match(homeSource, /shouldOptimizeAfkRenderer = useAfkRendererPartyStatsMemo\(\)[\s\S]{0,160}computePresentationPartyStats = shouldOptimizeAfkRenderer[\s\S]{0,80}computeRendererPartyStats/);
  assert.match(homeSource, /computePartyStatus=\{computePresentationPartyStats\}/);
  assert.match(homeSource, /afkPresentationVersion=\{afkProgressPresentationVersion\}/);
  assert.match(homeSource, /throttleAfkPublications=\{shouldOptimizeAfkRenderer\}/);
});

test('AFK Chunk party status is calculated once and reused by all thirty Cycles', () => {
  assert.match(hookSource, /const chunkPartyStatus = action\.chunkPartyStatus \?\? state\.parties\.map\(\(party\) => \(\{\s*party,\s*computed: computePartyStats\(party\),\s*\}\)\);/);
  assert.match(hookSource, /chunkPartyStatus\[options\.partyIndex\] = \{\s*party,\s*computed: computePartyStats\(party\),\s*\};/);
  assert.match(hookSource, /for \(const \{ runIndex, partyIndex, partyCycleDurationMs \} of operationWindow\)[\s\S]*chunkPartyStatus: chunkPartyStatus\[partyIndex\]/);
  assert.match(hookSource, /const suppliedPartyStatus = action\.chunkPartyStatus \?\? action\.authoritativePartyStatus/);
  assert.match(hookSource, /const partyStatus = suppliedPartyStatus\?\.computed \?\? computePartyStats\(statusParty\)/);
  assert.match(hookSource, /executeBattle\(statusParty, enemy, bags, roomStartHp, \{[\s\S]{0,160}partyStatus,/);
  assert.match(battleCandidateSource, /environment\.partyStatus \?\? computePartyStats\(party\)/);
});

test('AFK condition and automatic Gods Battle decisions use the thirty-Cycle boundary', () => {
  assert.match(hookSource, /const chunkStartParty = chunkPartyStatus\[partyIndex\]\?\.party \?\? partyForAfkChunk/);
  assert.match(hookSource, /runIndex === 0\s*&& normalizePartyCondition\(chunkStartParty\.condition\) >= 251/);
  assert.match(hookSource, /shouldAutoAdvanceExpeditionDestination\(\{\s*\.\.\.postFinalizeParty,\s*condition: chunkStartParty\?\.condition \?\? postFinalizeParty\.condition/);
  assert.doesNotMatch(hookSource, /normalizePartyCondition\(partyForAfkChunk\.condition\) >= 251/);
});

test('AFK recovery pauses the next slice for live user input without cancelling the event', () => {
  assert.match(homeSource, /afkInteractionPausedRef\.current = true/);
  assert.match(homeSource, /if \(!hasOutstandingCoordinatorWork\) return;[\s\S]{0,120}if \(afkInteractionPausedRef\.current\)/);
  assert.match(homeSource, /afkActiveChunkJobsRef\.current\.has\(partyIndex\)/);
  assert.match(homeSource, /afkInteractionPausedRef\.current = false/);
  assert.doesNotMatch(homeSource, /event\.preventDefault\(\);\s*event\.stopPropagation\(\);/);
});

test('AFK-to-online reconstruction uses the emulated anchor for Diary timestamps', () => {
  assert.match(homeSource, /pendingAfkMsRef\.current > 0[\s\S]*!hasObservedActiveAfkRecoveryRef\.current/);
  assert.match(homeSource, /const emulatedNow = afkSimulationAnchorRef\.current \?\? runtimeNow/);
  assert.match(homeSource, /const simulatedExpeditionStartedAt = emulatedNow - exploreElapsedMs/);
  assert.match(homeSource, /simulatedAt: simulatedExpeditionStartedAt/);
  assert.match(homeSource, /stateStartedAt: runtimeExpeditionStartedAt/);
});

test('the online checkpoint timer cannot mutate gameplay during AFK recovery', () => {
  assert.match(homeSource, /if \(shouldPauseOnlineProgressForAfk\(\{[\s\S]*pendingAfkMs: pendingAfkMsRef\.current[\s\S]*shouldRebuildAfterRecovery: shouldRebuildPartyCyclesAfterAfkRef\.current[\s\S]*lastCheckpointAtRef\.current = now;[\s\S]*return;/);
});
