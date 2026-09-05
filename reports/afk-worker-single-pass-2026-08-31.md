# AFK worker single-pass optimization — 2026/08/31

## Outcome

Promote the optimized AFK worker strategy to production. The 162-hour isolated worker matrix reduced summed worker execution p50 by 37.9% and end-to-end recovery wall p50 by 29.5%, while retaining exact save-backed legacy/optimized output parity.

Production keeps the 30-Cycle logical Chunk, two-worker pool, worker-arrival FIFO, Party-local transaction barrier, current single-publication renderer transaction, per-Cycle progress messages, inventory reconciliation, and persistence behavior.

## Attribution and implementation

The worker previously called the AFK reducer once for every Cycle in a Chunk. Each call rebuilt the capped duration, per-Party cycle counts, operation window, simulation timestamps, and Chunk-finalization conditions even though the same worker owned one fixed 30-Cycle target-Party Chunk. The optimized path submits all operations through one reducer traversal and invokes the existing progress callback after each completed Cycle.

The per-Cycle profit transaction also recalculated complete six-character Party status separately for Squander, Tithe, and Momentum. Free-action spending changes only pending profit before prayer; it does not change level, equipment, deity, or ability inputs. The optimized path therefore calculates those ability levels once and reuses them for the complete Cycle profit transaction.

Finally, post-Cycle AFK healing previously calculated complete Party status to obtain Max HP and then dispatched `HEAL_PARTY_HP`, which calculated the same complete status again. The optimized worker calculates the canonical exact Max HP once and publishes that value directly when healing is required. Parties already above Max HP retain the former behavior.

The former per-Cycle reducer and repeated-projection route remains available only as the live-profile `baseline`. Both live variants use the same production single-publication renderer, so the matrix isolates worker behavior.

## Fresh-process 162-hour A/B

One warm-up and five measured samples per strategy ran in alternating order, with a new hidden Electron process and isolated user data for every sample. Each recovery executed 2,100 Cycles in 70 FIFO jobs across two workers.

| Metric | Legacy worker p50 | Optimized worker p50 | Change |
|-|-:|-:|-:|
| Summed worker execution | 25,648.7 ms | 15,927.8 ms | **37.9% lower** |
| Reactivation wall p50 | 17,421.5 ms | 12,277.3 ms | **29.5% lower** |
| Reactivation wall p95 | 22,418.4 ms | 13,265.5 ms | **40.8% lower** |
| React commit count | 236 | 178 | **24.6% lower** |
| Maximum heartbeat delay | 588.7 ms | 494.7 ms | **16.0% lower** |
| Longest Long Task | 534 ms | 450 ms | 15.7% lower |
| FIFO commit wait | 622.9 ms | 556.2 ms | 10.7% lower |
| Complete renderer boundary | 4,666.0 ms | 4,108.5 ms | 11.9% lower |
| React visibility p95 | 47.6 ms | 47.2 ms | 0.8% lower |

Fresh-process timing varied with machine load, especially in the legacy samples, but the alternating matrix showed large improvements in both p50 and p95. The worker-execution reduction is substantially larger than the observed renderer and submission differences and directly matches the changed code path.

## Correctness

- The save-backed Expedition 8 workflow executes all six Parties through both worker strategies with fixed gameplay and battle random sources, then byte-compares the serialized final states.
- The comparison covers the canonical worker result, inventory overlay, rewards, Diary retention, Party leveling, HP, condition, side quests, profit distribution, Chunk merge, and global deltas.
- The normal worker still emits one progress event after every completed Cycle; events remain presentation-only and do not affect simulation order.
- Every live sample produced a final renderer state semantically identical to its reloaded persisted state.
- Complete recovery hashes may vary between processes because Specification 5.1 intentionally defines live ordering by worker completion arrival. This remains observational rather than a regression.

## Remaining bottleneck

After this change, worker execution remains the largest summed compute category at approximately 15.93 seconds across two overlapping workers, but the renderer transaction is again a material serialized boundary at approximately 4.11 seconds. The next investigation should split worker execution into battle protocol/projection, expedition log and reward construction, Party computation, and inventory-delta finalization before selecting another change. Load balancing should be evaluated using per-slot critical-path totals rather than summed two-worker CPU alone.

## Verification

- Save-backed optimized/legacy worker parity passed.
- Scheduler wiring and 30-Cycle progress regressions passed.
- Full test suite passed.
- Production TypeScript and Vite build passed.
- `git diff --check` passed.
