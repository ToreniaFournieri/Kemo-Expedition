# AFK Non-Battle Attribution — 2026/09/04

## Decision

Keep the production expedition adapter construction unchanged. The first measured optimization attempt—reusing one adapter bundle for each thirty-Cycle worker Chunk—regressed both end-to-end and worker timing and was removed.

Retain the new attribution only in the opt-in AFK live profiler. Production builds do not construct the attribution accumulator and omit every added phase field from worker messages.

## Initial 162-hour attribution

The clean fresh-process candidate run used the promoted compact battle path, two workers, six Parties, seventy Chunks, 2,100 Cycles, and 32,429 battles.

| Worker phase | Time |
|-|-:|
| Complete worker simulation | 6,114.5 ms |
| Expedition application, inclusive of battle | 5,523.4 ms |
| Battle total | 2,544.5 ms |
| Expedition application outside measured battle | 2,978.9 ms |
| Side-quest and destination automation | 224.7 ms |
| Party-status snapshot | 116.7 ms |
| HP recovery | 78.4 ms |
| Inventory-delta projection | 43.8 ms |
| Diary finalization | 41.7 ms |
| Worker progress callbacks | 39.6 ms |
| Profit processing | 23.7 ms |
| Chunk finalization | 0.4 ms |

Automatic-equipment planning consumed 818.1 ms in the initial sample. All seventy transactions produced actions (9,309 actions total), so a no-op planning skip is not useful for this fixture. Across the subsequent baseline and attempted-candidate sets, the no-op count remained only zero or one of seventy.

## Rejected adapter-reuse attempt

The attempt cached the stable adapter bundle against the existing worker Chunk context, reusing its inventory overlay and encounter cache across the Chunk's expeditions. Online and non-AFK construction remained unchanged. The comparison used immediately consecutive clean fresh-process sets with one warm-up and three measured 162-hour samples each.

| Metric | Existing construction p50 | Per-Chunk reuse p50 | Change |
|-|-:|-:|-:|
| Recovery wall | 6,144.4 ms | 6,670.0 ms | +8.6% |
| Worker simulation | 5,335.5 ms | 5,669.3 ms | +6.3% |
| Expedition application | 4,803.8 ms | 5,131.7 ms | +6.8% |
| Heartbeat p95 | 74.2 ms | 84.7 ms | +14.2% |
| React commit p95 | 28.0 ms | 35.9 ms | +28.2% |

Every measured run persisted a state semantically identical to its final in-memory state. Whole-run hashes can vary between fresh processes because the specification intentionally commits completed worker results in worker-arrival FIFO order.

## Next target

Completed in Build 60. The deeper profile identified expedition service as the dominant stage, and the accepted indexed enemy-pool candidate is documented in `afk-enemy-pool-index-2026-09-04.md`.
