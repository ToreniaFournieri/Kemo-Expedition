# AFK availability-revision optimization — 2026/09/06

## Retained change

v0.9.6 build 11 removes redundant inventory enumeration from availability revision tracking. An identical previous/next inventory record cannot expose a count transition, so the check returns immediately. This also applies to inventory-neutral profit and side-quest actions that share the same AFK inventory overlay Proxy. Changed overlays remain compared with their distinct base at the Chunk boundary.

AFK commits now check only keys in the committed equipment/Jewel delta, against the current authoritative inventory. Availability revisions are installed before equipment planning. The equipment batch then updates its own revisions and FULL stamps, and the outer transaction does not increment the same revisions again. A regression test reproduced the prior planner seeing revision 10 instead of 11 after a newly available drop; the corrected test passes. Another test verifies that returned equipment updates the final FULL stamp.

The planner now shares its immutable source inventory for reads and allocates a scratch record only on its first simulated inventory mutation. Empty-slot checks and equipment processing reuse transaction-local slot counts, and an already-dirty FULL run avoids an unnecessary empty-slot scan.

No specification change was required. Chunk size, terminal partial Chunks, FIFO transaction order, authoritative dispatch, character priority, FULL triggers, locks, Super Rare rules, Jewel priorities, equipment ranking and save formats are preserved. Correcting revision ordering can make a newly available item eligible at the intended current Chunk boundary instead of detecting it later; whole-recovery results are therefore not required to match the former ordering bug.

## Verification

- Complete repository suite: 378 tests passed, including AFK transfer/Chunk parity, coordinator, scheduler, persistence, equipment, and desktop/API regressions. The suite ran with localhost binding available.
- After repairing the diagnostic sequential oracle, all 14 focused attribution/reducer tests passed again. The oracle previously omitted final FULL stamp normalization and failed the maximum-inventory workload even on the original build-10 control. The same diagnostic-only repair was applied to the temporary control used for planner comparison; it does not change its production reducer or planner.
- Actual Electron planner comparisons covered six first-party fixture workloads: no-op, upgrade-heavy, FULL, locked-equipment, Jewel priority and maximum inventory. All six produced identical ordered-action and final-state hashes between original and optimized planners. The profiler also checks alternate planner/reducer strategies and source isolation. Old hard-coded hashes were disabled explicitly because they predate the current equipment rules; direct control/candidate equality was required instead.
- New tests cover equipment and Jewel availability transitions, unchanged records without enumeration, changed-key-only enumeration, mutable AFK overlay/base comparisons, newly committed availability before planning, already-available items from another FIFO transaction, and final FULL stamps after equipment changes.
- TypeScript/production build, ESLint, generated battle protocol check and performance bundle gates passed. Final production artifact names/sizes remained unchanged by the diagnostic-only oracle repair. No C++ or WASM source changed.
- Node memory smoke passed all workloads without a reported growth regression. No new persistent cache or save field was added.
- Build number incremented once, 10 to 11; English changelog entry inserted at the top.

The first broad test attempt found a stale source assertion and a test-only TypeScript import path error. Both were corrected before the successful complete run. The first isolated planner check exposed the obsolete diagnostic oracle described above; it was corrected and the comparison rerun.

## Measurement method and limits

The final screen uses separate temporary control and candidate source snapshots, the standard production-authority live profiler, Orca, 162 raw AFK hours, the repository fixture and production worker-count policy. Each variant has one warm-up and three measured fresh Electron processes, with alternating pair order. No tests or other benchmark workloads were deliberately run concurrently during the final screen. Electron user-data and build directories are temporary; player saves are untouched.

Each source snapshot runs:

`npm run performance:afk-live -- --hours=162 --environment=orca --mode=timing --samples=1 --warmups=0 --include-runs`

The preliminary identity-short-circuit screen isolated the dominant cause: worker profit processing fell from approximately 16 seconds to 50–60 milliseconds of aggregate time. This exploratory screen is not the final release comparison; a development test overlapped an early sample. Final results below are from a separate clean screen of the complete change.

Aggregate worker durations overlap across workers and contain nested phases. They must not be added to recovery wall time. Three-sample p95 is the sample maximum, and OS scheduling/thermal state remain uncontrolled. Per-run persistence equality is required; independent parallel recovery hashes can legitimately differ with FIFO arrival order. The tests and profiler do not constitute physical macOS sleep/wake or manual interaction testing.

## Remaining work

Repeated per-slot category searches remain a possible secondary target. They were not redesigned: the measured primary regression can be removed without changing ranking or adding a persistent candidate cache. General online mutations still use a complete scan when their inventory record changes and no authoritative changed-key set is available. Further optimization should be driven by a new profile rather than expanding this patch.

## Final Orca comparison

| Metric | Build-10 control | Build-11 candidate |
|---|---:|---:|
| Recovery median | 20,299.4 ms | 10,805.2 ms |
| Recovery p95 / maximum of three | 21,120.7 ms | 12,028.7 ms |
| Aggregate worker profit-processing median | 17,572.9 ms | 63.2 ms |
| Aggregate worker simulation median | 30,262.9 ms | 11,240.6 ms |
| Equipment-planning median | 1,044.8 ms | 559.5 ms |
| Equipment reducer median | 40.4 ms | 34.5 ms |
| Aggregate coordinator-transaction median | 1,540.9 ms | 931.5 ms |
| Largest coordinator transaction | 35.3 ms | 34.7 ms |
| Median of each run's heartbeat p95 | 26.4 ms | 31.0 ms |
| Largest heartbeat delay | 484.4 ms | 479.3 ms |
| Final/persisted semantic equality | 3/3 | 3/3 |

Recovery median decreased **46.8%**, or approximately **9.5 seconds**. Every paired candidate run was faster. Recovery maximum improved, and coordinator transactions stayed below 50 ms. Heartbeat p95 increased modestly, so this result is not a claim that every responsiveness metric improved; the larger approximately 480 ms lifecycle delays remain unattributed. Native macOS sleep/wake was not tested.

Equipment candidate scanning remains approximately 262.5 ms of aggregate work in the candidate. Inventory cloning fell from a 234.0 ms control median to zero in this recovery fixture; mutation-heavy standalone planner workloads still clone once when required. Stat-computation attribution now includes empty-slot checks, moving work formerly reported as unclassified into that bucket. Its before/after phase values must not be interpreted as a standalone stat-computation regression.

Raw final samples: `afk-revision-optimization-final-2026-09-06.json`. Exact standalone planner comparison: `afk-revision-planner-parity-2026-09-06.json`. The control uses the original build-10 production source at commit `5437ce9d`; only its profile-only sequential oracle was repaired for the separate planner correctness check. The final timing candidate includes every retained runtime change.

## Final normal-mode smoke checks

| Raw absence | Recovery wall time | Persisted equality |
|---|---:|---|
| 9 hours | 2,649.2 ms | Pass |
| 24 hours | 3,130.4 ms | Pass |
| 162 hours | 4,832.7 ms | Pass |

These are single-run candidate smoke checks, not comparative timing claims. Raw results: `afk-revision-normal-smoke-2026-09-06.json`.
