# AFK Enemy-Pool Index — 2026/09/04

## Decision

Promote indexed enemy selection in v0.9.5 Build 60. Build the canonical first-declaration ID and Boss indexes and ID-sorted Normal and Elite pool views once, then reuse them in expedition room selection. Keep the former fresh-array pool helpers unchanged for other callers.

Rooms without explicit enemy ranges now pass no uniqueness set instead of allocating an unused empty Set. Explicit-range rooms retain the same per-floor uniqueness state and random-selection behavior.

## Expedition-stage attribution

The first clean 162-hour stage profile measured 27,072 battles across seventy Chunks:

| Expedition stage | Time |
|-|-:|
| Complete expedition application | 4,084.9 ms |
| Expedition service | 2,961.5 ms |
| Battle inside service | 1,907.5 ms |
| Service outside measured battle | 1,054.0 ms |
| Presentation completion | 496.8 ms |
| Preparation | 273.4 ms |
| Post-service planning | 235.5 ms |
| Commit projection | 94.2 ms |
| Inventory coordinator construction | 4.4 ms |
| Inventory completion | 2.2 ms |

The service repeatedly filtered the complete enemy catalog and sorted the resulting pool for ordinary rooms. That work was independent of Party state, random state, inventory, and battle state, making static master-data indexes the narrowest safe candidate.

## Three-sample speed screen

The existing and indexed implementations each ran immediately consecutive clean fresh-process sets with one warm-up and three measured 162-hour samples. The indexed set processed slightly more battles at its median, so the measured reduction is not explained by a lighter battle workload.

| Metric | Existing p50 | Indexed p50 | Change |
|-|-:|-:|-:|
| Recovery wall | 5,598.7 ms | 5,171.8 ms | **-7.6%** |
| Worker simulation | 4,869.5 ms | 4,238.6 ms | **-13.0%** |
| Expedition application | 4,400.2 ms | 3,780.1 ms | **-14.1%** |
| Expedition service | 3,175.4 ms | 2,636.6 ms | **-17.0%** |
| Recovery wall p95 | 5,599.2 ms | 5,377.5 ms | **-4.0%** |
| Worker simulation p95 | 5,009.8 ms | 4,428.6 ms | **-11.6%** |
| Heartbeat p95 | 55.1 ms | 56.5 ms | +2.5% |
| Heartbeat maximum | 386.7 ms | 381.1 ms | -1.4% |
| React commit p95 | 22.0 ms | 21.8 ms | -0.9% |
| Long Task maximum | 351 ms | 345 ms | -1.7% |

Every measured run persisted a state semantically identical to its final in-memory state. Whole-run hashes can vary between fresh processes because Specification 5.1 intentionally commits completed results in worker-arrival FIFO order.

## Memory check

Three fresh-process 162-hour memory runs with the promoted implementation measured p50 peak application working set of 1,083,572,224 bytes, peak renderer working set of 699,744,256 bytes, peak renderer heap of 99,117,730 bytes, settled application working set of 1,013,268,480 bytes, and settled renderer working set of 634,912,768 bytes. The indexes retain only canonical enemy references grouped by pool; the observed values remain close to the previous compact-path memory screen and settled renderer memory was effectively unchanged.

## Correctness boundary

Focused parity coverage compares every indexed Normal and Elite pool against the sorted legacy filter result. First-declaration ID lookup preserves explicit-range resolution, Boss lookup preserves the prior first matching Boss, and existing tests retain fixed-Elite draw behavior, Normal-room draw behavior, explicit-range exhaustion, room resolution, service ordering, deferred narration, save-backed AFK behavior, and forecast/full parity.
