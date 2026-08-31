# AFK Coordinator Authority and React Publication Plan — 2026/08/31

## Objective

Remove React commit latency from the AFK FIFO transaction acknowledgement path while preserving every coordinator transaction, immutable snapshot, setting cutoff, automatic-equipment decision, Party barrier, worker-dispatch rule, replay identity, persistence guarantee, and user-interaction boundary required by Specification 5.1.

The current Build 16 path uses the React reducer state as both authoritative game state and presentation. `HomeScreen` releases a Party transaction only from an effect that observes the final Chunk/settings/equipment state. The next candidate will synchronously install and version authoritative state independently of React, then publish only the newest acknowledged version to React at the existing 100 ms presentation cadence.

## Target architecture

```text
worker result
    -> FIFO coordinator transaction
    -> reduce against authoritative version N
    -> synchronously install immutable version N+1
    -> acknowledge transaction and release Party barrier
    -> dispatch eligible work from version N+1
    -> process another FIFO entry while the scheduler budget remains
    -> publish the newest acknowledged version to React at the presentation boundary
```

React presentation is not an authoritative transaction boundary. A live UI or API mutation pauses AFK scheduling, reduces against the newest authoritative version, installs its own next version, and publishes immediately so stale rendered state cannot overwrite hidden AFK progress.

## Staged implementation

1. Add a profile-only `coordinator-authority` variant and retain the current React-acknowledged implementation as the exact baseline.
2. Introduce an instance-local authoritative state controller in `useGameState` with immutable monotonically versioned snapshots, synchronous reducer application, explicit presentation publication, and authoritative persistence reads.
3. Route normal UI/API actions through the same authoritative reducer boundary. Normal actions publish immediately; AFK transactions may defer presentation.
4. Replace the candidate's effect-based AFK completion acknowledgement with the receipt returned by synchronous authoritative installation.
5. Process sequential FIFO transactions only while the coordinator scheduler deadline remains available. Each transaction receives a distinct version and acknowledgement before the next begins.
6. Coalesce acknowledged versions into at most one React presentation every 100 ms, with immediate publication for interaction, completion, cancellation, errors, and attention-requiring transitions.
7. Keep Build 16 Expedition rendering memoization during the initial candidate so the measurement isolates authority/presentation separation.
8. After promotion, screen the existing compact battle-result candidate again as a separate follow-up; do not combine promotion decisions.

## Attribution

The live profiler will record authoritative transaction/version count, React publication count, transactions per publication, coordinator reducer duration, authoritative-to-presentation delay, maximum scheduler-slice duration, dispatch source version, checkpoint source version, and stale-version rejection count. Existing wall, heartbeat, Long Task, reducer, FIFO, worker, persistence, and semantic-equivalence measurements remain mandatory.

## Correctness gates

- Exactly one monotonically increasing authoritative version and acknowledgement per accepted FIFO result.
- Recorded FIFO replay produces the same canonical final state as the baseline.
- Automatic equipment consumes the immediately preceding authoritative inventory.
- Captured Party setting changes retain the existing transaction cutoff and skip behavior.
- A Party cannot dispatch its next Chunk before its prior authority acknowledgement.
- Several acknowledged versions may map to one React publication without losing transaction identities.
- React and scheduled publications can never roll authority or presentation backward.
- Pointer, keyboard, and API mutations consume the newest authority and publish immediately.
- Durable game state and AFK cursor checkpoints describe compatible authoritative versions.
- Refresh, cancellation, completion, save failure, and load-failure protections remain unchanged.
- Final in-memory and reloaded persisted states remain semantically equal.

## Performance gates

The exact Build 16 five-pair 162-hour baseline is wall p50 5,629.0 ms, renderer transaction-boundary p50 2,311.6 ms, FIFO-wait p50 121.4 ms, heartbeat p95 53.8 ms, 92 React commits, render-to-effect p95 23.0 ms, and worker-simulation p50 5,310.4 ms.

Promotion requires all correctness gates, every coordinator slice below 50 ms, React publication at no more than 10 times per second, no FIFO regression beyond 10%, no wall p95 regression beyond 5%, no heartbeat/Long Task tail regression beyond 10%, no peak or settled memory regression beyond 10%, and semantic persistence equivalence in every run. The candidate must additionally reduce the renderer/coordinator boundary p50 by at least 25% and either improve wall p50 by at least 5% or improve heartbeat p95 by at least 10% without a material wall regression.

The final matrix uses five alternating fresh-process pairs at 162 hours, three-pair timing checks at 9 and 24 hours, a three-pair 162-hour memory gate, the complete automated test suite, lint, production build, battle-protocol check, and bundle checks.

## Execution status

Implemented as the profile-only `coordinator-authority` candidate. The authority, acknowledgement, persistence, UI-mutation, interaction, presentation, and attribution stages are complete. Profiling showed no FIFO wait after synchronous acknowledgement, so the candidate deliberately retains one transaction per event-loop scheduler turn instead of adding a same-turn FIFO loop; this preserves the responsiveness budget while still allowing several acknowledged versions behind one React presentation.

Production promotion is blocked by the plan's wall-time gate. See `reports/afk-coordinator-authority-result-2026-08-31.md` for the measurements and follow-up direction.
