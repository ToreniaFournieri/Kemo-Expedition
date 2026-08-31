# AFK deferred narration and coordinator-pump result — 2026/08/31

## Decision

Promote the optimized worker path. The remaining dominant cost was worker-side simulation, especially complete battle narration for intermediate expedition results that are never retained. Input hydration and locale readiness were each negligible by comparison. The implementation now defers that narration, replays it deterministically only when a Diary or party-unlock result retains the complete log, reuses safe Chunk-local projections, and wakes the coordinator without a React render for every completed transaction.

## Implemented changes

- Resolve non-terminal optimized AFK battles in result-only mode. Keep the terminal operation fully narrated, and deterministically replay any earlier result-only battle whose complete narration is required by a Diary trigger or party unlock. Replay validates outcome, remaining Party HP, and RNG draw count before accepting the log.
- Reuse immutable encounter scaling, profit-ability projections, and character-derived base HP within a worker Chunk. The current deity HP multiplier remains mutation-aware.
- Replace the coordinator-version React state pump with an internal ref pump. React state remains the authoritative publication boundary, while worker completion and transaction cleanup no longer create an extra coordinator-only render.
- Split worker attribution into queue, input hydration, locale readiness, and simulation execution.

## Fresh-process 162-hour result

Alternating baseline/candidate runs used the production six-Party save-backed workload, two workers on the six-logical-processor host, one warm-up, and three measured samples per variant.

| Metric | Baseline p50 | Candidate p50 | Change |
|-|-:|-:|-:|
| Summed worker execution | 12,225.6 ms | 5,328.0 ms | **56.4% lower** |
| Recovery wall time | 9,266.2 ms | 6,013.3 ms | **35.1% lower** |
| Recovery wall p95 | 9,492.7 ms | 6,014.0 ms | **36.6% lower** |
| Maximum heartbeat delay | 369.3 ms | 376.5 ms | 1.9% higher |

Every measured candidate run produced semantically identical final and reloaded persisted state. Candidate attribution measured approximately 513.0 ms of worker input queueing, 3.8 ms of hydration, and 0.7 ms of locale readiness, confirming that the simulation kernel—not transfer preparation—was the actionable bottleneck.

A subsequent fresh-process candidate validation with the ref-based coordinator pump completed in 5,209 ms, used 4,711.7 ms of worker simulation, reduced React commits to 90, held React commit p95 to 21.4 ms, and preserved equal final/persisted hashes. The prior candidate produced 113 commits in the comparison matrix; the baseline produced 196.

## Follow-up opportunity

The next useful optimization target remains battle/result resolution inside the worker. Transfer hydration and locale startup are now too small to justify architectural complexity. Further worker-count increases should remain rejected on this six-logical-processor host because the measured three-worker configuration previously regressed wall time and responsiveness.
