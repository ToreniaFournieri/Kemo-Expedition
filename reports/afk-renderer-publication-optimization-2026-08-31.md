# AFK Renderer Publication Optimization — 2026/08/31

## Decision

Promote the renderer optimization to production in v0.9.5 Build 16. Keep the compact battle-result candidate profile-only.

The measured AFK reactivation bottleneck was the serialized renderer coordinator boundary after each worker result: FIFO admission, the atomic Chunk plus automatic-equipment reducer, authoritative React publication, and effect acknowledgement. Persistence, hydration, and finalization were negligible. Worker battle execution remains the largest residual CPU cost, but the previous compact battle candidate delivered results faster than the renderer could acknowledge them and therefore amplified FIFO congestion.

## Production change

- Cache renderer-only `computePartyStats` projections in a `WeakMap` keyed by immutable `Party` identity. Canonical simulation and worker code continue to use the uncached computation.
- Memoize the Expedition presentation subtree during active AFK recovery and admit new authoritative props at the existing specification-defined 100 ms presentation cadence.
- Continue publishing and acknowledging every FIFO Chunk transaction through `HomeScreen`; this does not batch, reorder, defer, or skip authoritative state transitions.
- Refresh presentation immediately when AFK completes or a live pointer/keyboard interaction pauses recovery.
- Stabilize the Expedition sortie and simulation callback identities so the memoized subtree is not invalidated by closure churn.
- Extend the live profiler with cache call/hit/miss/computation attribution and an isolated `renderer-memo` counterfactual.

## Final timing gate

Workload: the checked-in six-Party Expedition 8 save, 162 raw absence hours, production two-worker policy, timing mode, one warm-up, five measured alternating pairs, and a fresh Electron process for every run.

| Metric | Exact baseline p50 | Build 16 p50 | Change |
|-|-:|-:|-:|
| Recovery wall | 5,745.8 ms | 5,629.0 ms | -2.0% |
| Renderer transaction boundary | 2,509.5 ms | 2,311.6 ms | -7.9% |
| Renderer boundary share | 42.95% | 40.65% | -2.30 pp |
| FIFO commit wait | 160.1 ms | 121.4 ms | -24.2% |
| Heartbeat p95 | 60.4 ms | 53.8 ms | -10.9% |
| Render-to-effect p95 | 25.5 ms | 23.0 ms | -9.8% |
| Long-task maximum | 334 ms | 328 ms | -1.8% |
| Worker simulation | 5,359.2 ms | 5,310.4 ms | -0.9% |

All measured runs produced a final in-memory state semantically identical to the reloaded persisted state. Whole-recovery hashes vary because worker arrival order is observational under the specified FIFO coordinator and is not a determinism gate.

The optimized runs made a median 452 renderer Party-stat requests: 376 identity hits and 76 misses. The misses consumed 43.7 ms p50, showing that unchanged Party projections were reused while each replaced Party invalidated exactly at its immutable identity boundary.

## Memory gate

Workload: the same 162-hour recovery in memory mode, one warm-up, three alternating fresh-process pairs.

| Metric | Exact baseline p50 | Build 16 p50 | Change |
|-|-:|-:|-:|
| Peak application working set | 1,108,656,128 B | 1,090,781,184 B | -1.6% |
| Peak renderer working set | 717,537,280 B | 699,334,656 B | -2.5% |
| Settled application working set | 1,076,150,272 B | 1,052,884,992 B | -2.2% |
| Settled renderer working set | 682,016,768 B | 659,243,008 B | -3.3% |
| Peak renderer heap p95 | 96,463,576 B | 95,824,637 B | -0.7% |

The peak renderer-heap p50 moved from 88,544,424 B to 94,599,312 B in the three-sample set, while its p95 and both renderer working-set measures improved. The bounded 76-entry live identity set, weak keys, and lower settled working set do not indicate retained-state growth.

## Compact battle follow-up

With both variants using the new renderer path, a three-pair screen compared the full production battle result against the profile-only compact result. Compact output reduced wall p50 from 5,538.1 ms to 4,957.0 ms (-10.5%) and worker execution from 5,272.2 ms to 4,077.3 ms (-22.7%), but FIFO wait rose from 118.8 ms to 175.6 ms (+47.8%), render-to-effect p95 from 20.4 ms to 22.6 ms (+10.8%), and heartbeat p95 from 45.1 ms to 54.3 ms (+20.4%). It remains rejected for production.

## Verification

- `npm test`: 263 passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run performance:bundle`: passed; largest JavaScript chunk 439,257 bytes and no React runtime in the AFK worker.
- Focused renderer memo tests verify strict reuse for an unchanged Party identity, recomputation for a replacement identity, and exact canonical result parity.
