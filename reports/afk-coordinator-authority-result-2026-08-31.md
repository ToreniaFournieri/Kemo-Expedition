# AFK Coordinator Authority Result — 2026/08/31

> Update (2026/09/04): Build 61 promoted coordinator-owned authority after a production-equivalent screen combined it with the compact battle-result and renderer optimizations that now ship. The earlier result below remains the historical Build 16/18 decision. See `reports/afk-coordinator-authority-production-promotion-2026-09-04.md` for the current result.

## Outcome

The coordinator-owned authority design is implemented and correctness-validated as the profile-only `coordinator-authority` variant. It is not enabled as the production default because the 162-hour wall-time promotion gate failed.

The candidate synchronously reduces every accepted FIFO transaction against the newest authoritative snapshot, installs one immutable monotonically increasing version, acknowledges and releases the Party barrier without waiting for React, and lets persistence, API actions, worker dispatch, and live UI mutations consume the authoritative root. React presents only the newest published version and can skip intermediate acknowledged versions.

## Promotion measurements

The initial five-pair fresh-process 162-hour matrix compared the exact Build 16 `renderer-memo` baseline with the authority candidate:

| Metric (p50 unless noted) | Baseline | Candidate | Change |
|-|-:|-:|-:|
| Renderer/coordinator transaction boundary | 3,264.6 ms | 1,406.7 ms | -56.9% |
| FIFO commit wait | 159.8 ms | 0 ms | -100% |
| Heartbeat p95 | 72.0 ms | 47.7 ms | -33.8% |
| Long Task maximum | 392 ms | 400 ms | +2.0% |
| Wall time | 6,867.5 ms | 7,428.0 ms | +8.2% |
| Wall p95 | 6,971.7 ms | 8,063.8 ms | +15.7% |
| Maximum authority transaction | — | 39.8 ms | below 50 ms |
| Authority versions / React publications | — | 70 / 44 | 1.59 versions/publication |

Every timing and memory run reported semantic equality between final in-memory state and the successfully persisted/reloaded state. Independent parallel runs are intentionally not required to share one final hash because their valid FIFO worker-arrival order can differ.

The final exact-code three-pair 162-hour memory gate passed after removing the dormant candidate React state root: peak application working set was +3.4%, peak renderer working set +4.7%, peak renderer heap -2.8%, settled application working set +3.0%, and settled renderer working set +2.6% versus baseline. All are within the 10% bound.

The short timing checks also passed their responsiveness and wall-p95 bounds:

- 9 hours: transaction boundary -52.7%, FIFO wait -100%, heartbeat p95 -37.1%, wall p50 +3.1%.
- 24 hours: transaction boundary -52.3%, FIFO wait -100%, heartbeat p95 -41.2%, wall p95 +2.5%.

## Follow-up screens

Ordinary React state publication was screened in place of synchronous external-store notification, then authority publication was aligned with the existing 100 ms AFK progress boundary. The latter reduced candidate React commits from approximately 96 to 64. It did not remove the 162-hour wall regression: the current-code three-pair screen measured 8,185.1 ms candidate wall p50 versus 7,318.6 ms baseline while preserving zero FIFO wait and improving heartbeat p95 from 80.4 ms to 40.1 ms. Because this screen already failed the wall gate, another five-pair promotion run was not justified.

## Decision and next tuning idea

Retain the implementation only behind the live-profile variant. The authority split is correct and materially improves main-thread responsiveness, but accelerating coordinator acknowledgement changes the overlap between renderer transactions, worker execution, and React presentation enough to worsen end-to-end completion on this host.

The next experiment should add explicit critical-path and CPU-contention attribution around authority acknowledgement: record worker runnable/execution intervals, main-thread transaction intervals, presentation intervals, worker-slot idle time, and the delay from acknowledgement to next worker start. Then screen bounded post-acknowledgement dispatch pacing independently of authority semantics. The goal is to retain zero React/FIFO acknowledgement dependency while preventing newly eligible work from competing with active workers and presentation at an unfavorable point. Do not combine this with the compact battle-result candidate until the scheduling regression is isolated.

This follow-up was completed in Build 18. See `reports/afk-coordinator-dispatch-pacing-result-2026-08-31.md`; bounded pacing was rejected because it increased wall time and worker-slot idle time.
