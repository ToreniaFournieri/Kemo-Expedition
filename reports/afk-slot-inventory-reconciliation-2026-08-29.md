# AFK slot-local inventory reconciliation — 2026-08-29

## Outcome

Promoted for BOKEMO v0.9.5 build 3.

The rejected build-2 candidate proved that rebuilding every inventory variant into a compact object graph reduced bytes but added too much renderer allocation and worker reconstruction work. Build 3 instead keeps the existing inventory objects and makes transfer stateful only for the lifetime of each of the two AFK worker slots.

Each slot receives one complete authoritative inventory on its first job. Later jobs omit that inventory and carry only variants whose object identity changed since the slot's acknowledged snapshot, plus explicit deletions. The worker validates a monotonic token and revision before mutating its retained inventory record. Its result acknowledges both values. Any protocol, hydration, or worker failure follows the existing termination path, discards the slot-local cache, and reschedules from a cold complete snapshot. Recovery completion and component teardown terminate the workers and release the retained inventories.

The implementation does not change the worker count, twelve-Cycle Chunk size, sparse copy-on-write simulation overlay, Defeat rollback, result delta, Diary hydration, deterministic RNG, canonical commit ordering, saves, or progress behavior.

## Paired Electron promotion profile

Command:

```sh
node scripts/run-afk-transfer-renderer-profile.mjs --samples=20 --warmups=2 --promotion
```

The profile alternated exact build-2 inputs and schema-v4 inventory reconciliation within one Electron process. Every sample ran six parties through three waves (18 jobs), using two persistent workers. The schema-v4 candidate used two cold jobs and sixteen continuation jobs per sample.

| Metric | Build 2 p50 | Build 3 p50 | Change |
|-|-:|-:|-:|
| Total worker input | 14,124,257 bytes | 4,432,549 bytes | 68.61% lower |
| AFK wall time | 1,710.9 ms | 1,606.9 ms | 8.42% paired improvement |
| UI heartbeat delay | 20.1 ms | 12.2 ms | 42.36% paired improvement |
| Worker compute sum | 2,731.3 ms | 2,745.5 ms | 0.52% higher raw p50; 1.48% paired-improvement p50 |
| Renderer `postMessage` sum | 65.7 ms | 23.3 ms | 64.54% lower |

All 20 pairs preserved byte-identical hydrated results and final-state SHA-256 `61e67b7f22e49753a52926f76caca56f31444bd5682731364d66a3d57a8f4423`.

## Fresh-process memory profile

Command:

```sh
node scripts/run-afk-transfer-isolated-memory.mjs --samples=10 --warmups=1
```

Each candidate ran in a fresh Electron process, with alternating order.

| Metric | Build 2 p50 | Build 3 p50 | Change |
|-|-:|-:|-:|
| Peak application working set | 675,938,304 bytes | 643,694,592 bytes | 4.77% lower |
| Peak renderer working set | 448,544,768 bytes | 405,913,600 bytes | 9.50% lower |
| Settled application working set | 547,897,344 bytes | 534,822,912 bytes | 2.39% lower |
| Settled renderer working set | 305,971,200 bytes | 293,683,200 bytes | 4.02% lower |
| Peak renderer JavaScript heap | 23,100,000 bytes | 23,100,000 bytes | unchanged |

Both candidates preserved the same pinned final-state hash in every fresh process. Electron working-set values include shared pages and process-level sampling noise; the alternating isolated design reduces, but does not eliminate, that limitation.

## Safety and verification

- Cold, continuation, changed-variant, deletion, stale-token, stale-revision, and acknowledgement-replay behavior are covered by coordinator tests.
- A worker cache is bounded to one inventory record per worker and two workers per recovery.
- Tokens advance only after a validated successful result; failure destroys the worker and its cache.
- Worker termination at recovery completion or component teardown releases retained records.
- The ordinary test suite, ESLint, production build, bundle limits, and `git diff --check` are the final release gates.
