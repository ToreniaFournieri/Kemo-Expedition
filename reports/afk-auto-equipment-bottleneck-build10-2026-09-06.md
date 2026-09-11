# AFK automatic-equipment bottleneck review — 2026/09/06

Reviewed v0.9.6 build 10, commit `5437ce9d`. Report only: no runtime changes, build increment, or changelog entry.

## Finding

The strongest current regression suspect is **inventory availability revision tracking introduced with the automatic-equipment dirty check**, rather than the FULL candidate planner itself. The revision wrapper performs whole-inventory scans inside worker profit processing, even for actions that do not change inventory. Current profiling places most worker time in that profit-processing phase.

Direct equipment planning remains a secondary optimization target. It blocks the synchronous FIFO coordinator transaction and therefore delays the affected party's next dispatch, but its measured cost is substantially smaller than in the earlier build-8 profile.

## Fresh measurements

Command: `npm run performance:afk-live -- --hours=162 --environment=orca --mode=timing --samples=3 --warmups=1`.

Used the existing fixture, production-authority path and worker-count policy, one warm-up and three measured fresh Electron processes with isolated temporary user-data directories. The initial sandboxed launch aborted with SIGABRT; the authorized run outside the filesystem sandbox completed. Player saves were not accessed.

| Metric | Current build 10 median | Historical build 8 median |
|---|---:|---:|
| Recovery wall time | 16,255.1 ms | 12,352.6 ms |
| Aggregate worker simulation | 24,073.1 ms | 8,636.2 ms |
| Worker profit processing | 13,912.2 ms | 47.6 ms |
| Equipment planning | 732.0 ms | 3,132.9 ms |
| Equipment reducer application | 30.2 ms | 1,889.1 ms |
| Coordinator transactions | 1,070.0 ms | 5,247.9 ms |

Current recovery range: 14,622.3–16,284.4 ms. Largest coordinator transaction across the three runs: 29.9 ms. Final state matched persisted state semantically in all three runs.

These historical and fresh samples are not an alternating before/after experiment. Gameplay changed in builds 9–10, and shared-host load is uncontrolled. The table establishes a strong attribution lead, not a proven causal regression percentage. Worker totals overlap across parallel workers; nested phases and coordinator totals cannot be added to reconstruct recovery wall time. With only three samples, reported p95 is the sample maximum.

The heartbeat maximum reached 415.4 ms, while the median run's heartbeat p95 was 17.2 ms. The coordinator transaction maximum alone therefore does not establish complete lifecycle responsiveness. This review did not attribute those heartbeat outliers or perform physical sleep/wake testing.

## Ranked bottlenecks

### 1. Repeated availability scans in worker profit processing — highest priority

`src/hooks/useGameState.ts:2352–2379` implements `hasNewAvailability` and `applyInventoryAvailabilityRevisions`. For every changed top-level state, the wrapper calls `Object.keys(nextInventory).some(...)` and checks Jewels too. It has no inventory-reference equality short circuit.

`processAfkCycleProfit` (`:2144`) calls `gameReducer` for spending and prayer profit, and conditionally for side quests. The wrapper at `:4255` consequently scans inventory for these actions even though spending/prayer do not change it. No newly available item means a full scan, rather than an early exit.

During optimized worker simulation, inventory is an `AfkInventoryOverlay` Proxy (`:812`). Enumeration invokes its `ownKeys`, filtering, property descriptors and repeated lookups. Thus ostensibly cheap profit actions repeatedly traverse the global inventory through a Proxy, across recovered Cycles. This is consistent with the measured 13.9 seconds in worker profit processing, versus 47.6 ms in the historical profile.

The profiler does not separately time this wrapper, so the full 13.9 seconds must not be attributed exclusively to revision tracking without a controlled experiment. First follow-up: add diagnostic wrapper call/key counts and durations, then screen a bypass for known inventory-neutral actions. For inventory-mutating operations, derive availability changes from committed deltas. A generic identity-only shortcut needs special care because the worker overlay can mutate in place.

### 2. Repeated per-slot candidate enumeration — secondary

`src/components/HomeScreen.tsx:1674` searches a category bucket for each replaceable slot; `:1819` can try additional categories when no eligible candidate exists. Each attempt filters candidates, checks duplicate item/bonus constraints, allocates ranking arrays, and computes selection values.

Fresh median planning phases: scanning 287.2 ms; index construction 45.0 ms; native ranking 14.2 ms. Transaction-local indexes and item-fact/category-multiplier caches already exist. Further native ranking optimization is lower priority than avoiding repeated enumeration.

`src/game/autoEquipmentInventoryIndex.ts:33` also copies category buckets and merges/sorts multi-category buckets for stable inventory order. That preparation occurs before the inventoryScan timer, so the scan bucket does not capture the whole search cost. Any reuse must preserve inventory order, changing availability, and character-specific duplicate-bonus rules.

### 3. Work performed before FULL dirty-check skips

The planner clones global inventory at `HomeScreen.tsx:1355`, before determining whether any character needs processing. That alone totals a median 156.4 ms across recovery.

The party-wide empty-slot check at `:1773` computes character stats before checking individual OFF/SEMI/FULL modes; active characters can then compute stats again. An empty slot in any member keeps the party FULL condition true, including slots that remain unfillable. A global equipment revision can also invalidate multiple parties. These triggers follow the current specification; do not remove them as an optimization.

Potential improvement: postpone scratch inventory creation until a planning branch actually needs it, and reuse slot-count calculations within a transaction. The current statComputation phase does not include the preceding empty-slot checks. Total unclassified planning work is 205.7 ms; this is not all attributable to stats.

### 4. Revision/stamp ordering deserves a focused audit

The AFK transaction merges a Chunk and plans equipment inside `reduceGameState` (`useGameState.ts:3952`), then the outer `gameReducer` updates availability revisions. The stamp normalization at `:4265` runs only for a top-level `APPLY_AUTO_EQUIPMENT_ACTIONS`, not a top-level `COMMIT_AFK_PARTY_TRANSACTION` containing that batch.

Consequently, the planner can observe pre-update revisions and an AFK FULL stamp can lag the final transaction revision. This is a potential source of deferred dirty detection or redundant follow-up planning, not a measured explanation for the dominant worker cost. Test newly available items and post-transaction stamps explicitly before changing ordering.

## Recommended next action

Investigate and measure revision tracking first. The current equipment planner is about 0.73 seconds of aggregate work; worker profit processing is about 13.9 seconds. Optimizing notification formatting, Jewel assignment, or native equipment ranking first is unlikely to address the observed slowdown (their fresh medians are approximately 0, 2.9 and 14.2 ms respectively).

Keep the specification's per-Chunk equipment boundary, sequential character decisions, authoritative inventory and FIFO commit semantics. Disabling auto equipment is not a matched performance control because it changes future equipment and battles.

No fixes or broad regression suite were run for this report. The fresh benchmark built the profiling bundle and checked recovery/persistence equality. Numeric results are in `afk-auto-equipment-bottleneck-build10-2026-09-06.json`; historical data is in `afk-next-optimization-review-2026-09-06.json`. Trace-derived action/no-op counts were not used to infer dirty-check effectiveness because bounded event retention can make detail counts incomplete.
