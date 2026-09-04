# AFK Reactivation Next-Optimization Screening — 2026/09/05

## Outcome

Build 62 improves the opt-in live profile rather than changing production AFK behavior. It adds exact worker counts for completed expeditions, processed rooms, expeditions that retain complete narration, and deferred battles replayed for retained logs. It also records automatic-equipment planning duration, result summary, and action count on the production coordinator-authority path, where the prior React effect no longer had access to the completed transaction.

A compact non-retained expedition-presentation candidate was implemented behind a profile-only switch, verified against the unchanged thirty-Cycle worker state, measured, rejected, and removed. It reduced its intended local phase but did not produce a stable end-to-end improvement large enough to justify another presentation representation.

## Current 162-hour situation

A representative `authority-production` run processed 1,470 expeditions and 24,086 rooms. Only 171 expeditions (11.6%) retained complete narration, replaying 1,955 deferred battle narrations. Persistence after recovery was semantically identical to the final in-memory state.

| Phase | Time |
|-|-:|
| Complete wall time | 4,178.2 ms |
| Worker simulation | 2,889.0 ms |
| Expedition application | 2,568.9 ms |
| Expedition service | 1,797.2 ms |
| Expedition post-service | 158.8 ms |
| Expedition presentation completion | 340.2 ms |
| Automatic-equipment planning, 70 transactions | 409.7 ms |
| Automatic-equipment reducer, 70 transactions | 270.3 ms |
| Complete coordinator-authority transactions | 714.9 ms |
| Maximum authority transaction | 17.7 ms |
| Heartbeat p95 | 18.0 ms |

The dominant worker cost remains battle-containing expedition service. On the serialized coordinator side, automatic-equipment planning plus authoritative action replay accounts for most of the transaction boundary. The new attribution is especially important because all 70 automatic-equipment runs produced actions: the representative run planned 7,253 ordered actions, so no-op elimination is not available on this fixture.

## Rejected compact-presentation candidate

The candidate determined Diary and unlock retention from completed transaction facts before rendering the localized room presentation. For non-terminal result-only worker operations with no retained narration, it constructed only the minimal private facts needed by the immediately following Diary finalization. Retained narration and the terminal Chunk operation continued through the complete renderer. A deterministic thirty-Cycle control/candidate test produced deeply identical final worker state.

Two adjacent isolated control/candidate pairs were sufficient to reject the idea because the direct phase saving was only about 51–53 ms against a roughly 4.2-second recovery, leaving no path to the 8–10% promotion threshold.

| Metric | Pair 1 control | Pair 1 candidate | Pair 2 control | Pair 2 candidate |
|-|-:|-:|-:|-:|
| Wall time | 4,318.7 ms | 4,312.7 ms (-0.1%) | 4,178.2 ms | 4,204.4 ms (+0.6%) |
| Worker simulation | 3,005.1 ms | 3,006.7 ms (+0.1%) | 2,889.0 ms | 2,836.0 ms (-1.8%) |
| Expedition post-service | 168.6 ms | 115.5 ms (-31.5%) | 158.8 ms | 108.0 ms (-32.0%) |
| Heartbeat p95 | 17.8 ms | 20.3 ms | 18.0 ms | 19.3 ms |
| Heartbeat maximum | 301.6 ms | 305.6 ms | 289.0 ms | 306.9 ms |
| Long Task maximum | 274 ms | 271 ms | 262 ms | 273 ms |
| Maximum authority transaction | 20.4 ms | 21.0 ms | 17.7 ms | 25.3 ms |
| Persisted semantic equality | pass | pass | pass | pass |

Whole-recovery hashes and exact battle counts can differ between independent runs because worker-arrival FIFO order is intentionally nondeterministic. The candidate was therefore evaluated on phase attribution, end-to-end distributions, deterministic single-Chunk parity, and per-run final-versus-persisted semantic equality rather than cross-run whole-state hash identity.

The multi-sample Electron harness also reproduced its known intermittent `SIGABRT` failure. Fresh isolated single-sample processes completed reliably enough for the adjacent screens; the crash occurred outside gameplay correctness validation and affected both profile orchestration attempts rather than one candidate result.

## Next optimization plan

The next investigation should target the measured automatic-equipment transaction boundary, not further expedition-presentation compaction and not the previously rejected pre-ranked candidate cursor.

1. Add profile-only end-to-end aggregation for the existing automatic-equipment phase collector so the 409.7 ms planning total is divided into inventory cloning/index construction, prepared candidate evaluation, notification planning, action materialization, and structural work under the real 70-transaction AFK workload.
2. Screen an AFK-specific notification-free planning mode. Coordinator recovery discards the planner's notification list, so localized notification construction may be skipped while ordered actions and summaries remain exact. Reject immediately if the measured ceiling is small.
3. If duplicate simulation and replay remain material, prototype a profile-only fused planner/application transaction. The planner already maintains disposable simulated inventory and equipment to choose later actions; the candidate should return a detached final projection and install it once instead of materializing and replaying 7,253 actions through a second state transformation. The current action list and copy-once reducer remain exact parity oracles.
4. Require byte-identical ordered action summaries and canonical final state for every transaction prefix, including damaged-HP, Jewel, inventory insertion-order, sold/not-owned, and pending Party-setting cases.
5. Promote only after a clean alternating 162-hour screen reaches at least 8–10% paired wall improvement with no greater than 3% wall-p95 regression, all main-thread transactions below 50 ms, memory/tail changes within 10%, and semantic persistence equality. Run 9-hour, 24-hour, and memory gates only after that screen passes.

## Validation status

- Deterministic thirty-Cycle candidate/control worker state parity passed before candidate removal.
- Focused AFK scheduler, worker contract, runtime trace, persistence, expedition application, post-service, and completed-presentation tests passed.
- The complete repository suite passed: 359 tests.
- ESLint, the generated battle-protocol check, TypeScript, and the production Vite build passed.
- Production bundle gates passed: the AFK worker is 460,966 bytes / 108,856 gzip bytes, contains no React runtime, and the initial locale preload count remains one.
- Every completed live-profile run reported final-versus-persisted semantic equality.
- The rejected candidate is absent from production and profile runtime code.
