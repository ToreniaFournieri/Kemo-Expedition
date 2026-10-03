# API performance plan: heavy repeated calls (party / equipment / commits)

Status: items 1c, 1b-equivalent (segmented transfer), and part of 3 are done (builds 6-8, see changelog). Remaining: read cache, receipt journal, 2a, 4. Results so far on the 490-call D8 workflow: 13.0 s -> 3.8 s; mutating commit 95 -> 18 ms.

Findings since the plan: expedition logs are ~95% of the D8 save and keep object identity, so they are stringified/transferred/compressed once (done). The profile also showed per-slot whole-inventory copies in equipment Undo/Redo evaluation (done). The receipt list is already capped at 4,096, so its cost saturates (~12-15 ms per no-op at 2.6 MB) rather than growing without bound. Numbers come from `tests/performance/` runs on 2026-10-03 (Desktop, D8 save, 7.7 MB JSON, 400-call workflow unless noted).

## Where time goes (measured)

| Call type | Cost | Notes |
|---|---|---|
| Same-revision read | 0.4-1.3 ms | Not a problem. |
| Read right after a commit | `read/build/party/{p}` ~38 ms, `character/equipment` ~9 ms, `observation/party` ~3 ms | Cold derived data after each revision. |
| Mutating commit (D8) | 85-110 ms | ~15 stringify + ~20 IPC transfer + ~32 compress + ~2 disk + ~15 operation/detection. |
| Mutating commit (fresh save) | ~3.6 ms | Dominated by IPC/control write (~1.9 ms). |
| No-op commit | 5-10 ms | Control file rewritten; grows ~0.4 MB per 1,000 receipts. |
| Receipt replay | 0.3-0.4 ms | Fine. |
| `loadEquipmentSet` | ~33 ms | Fast because the save isn't rewritten: the proof that persistence is the cost. |

Conclusion: for a large save, ~75% of a mutating call is persisting the whole save. The operation itself is small. Reads are cheap except the first read after a revision.

## Ideas, ranked by expected value / risk

### 1. Cheaper persistence for small edits (biggest win)
- **1a. Coalesced durable writes.** Acknowledge a commit after the in-memory authority + control receipt are durable, and write the full save at most every N ms / on logout / before delivery. Needs a spec decision: 9.1.4 currently requires the complete final state in each durable commit. A write-ahead journal of receipts (small, append-only) plus a periodic snapshot keeps crash recovery exact. Expected: D8 mutating commit 90 ms -> ~5-10 ms (10x for edit bursts). Risk: highest; touches durability rules, recovery, tests.
- **1b. Sectioned save.** Split the save container into sections (party/characters, inventory, logs/history). Re-encode only changed sections (equipment edits touch party + inventory, not 7 MB of logs). Needs reliable section dirty tracking (immutable object identity already exists) and a loader that joins sections. Expected: 3-5x on D8 edits. Risk: medium-high; format change with migration/compat.
- **1c. Find what makes the D8 JSON 7.7 MB.** Profile by top-level key. If logs/history dominate, 1b becomes mostly "don't rewrite logs", or the save may hold redundancy that can be dropped (spec-owned decision). Cheap, do first.

### 2. Cut fixed per-call costs (low risk, small each)
- **2a. Stringify once per revision** and cache the string on the snapshot; no-op/replay paths don't need it, but delivery/logout reuse it. ~15 ms saved where the same state is persisted twice (login, logout, completion).
- **2b. Control file growth.** Rewrite is O(receipts). Options: append-only receipt journal with periodic compaction (no spec change), or retention limit (spec change). Removes the no-op slope (5.8 s -> 13 s over 1,000 commits at 2.3k -> 3.3k receipts).
- **2c. IPC.** Share the save string without cloning (MessagePort / SharedArrayBuffer-backed transfer) or skip the transfer by compressing in a utility process. Measured: bytes vs string gave only ~7%; not worth it unless 1a/1b land.
- **2d. Lower deflate level 1** saves ~3 ms but grows saves; skip.

### 3. Warm derived reads after a commit (low risk)
- Cache computed party stats keyed by the immutable party/character objects (the Coder's earlier candidate). Targets the ~38 ms `read/build/party/{p}` and ~9 ms equipment read after each revision. Expected 2-5x on read-after-write loops; unchanged parties stay hot across revisions.
- Pre-warm stats for the edited character only (dirty-set) instead of the whole party.

### 4. Auto-equipment / simulation (long progression calls)
- Earlier measurement (12 h progress): simulation 218 ms, auto-equipment 54 ms, save ~56 ms. Tuning already shipped for Chunk caches (-24%). Next: profile `AutoEquipment` candidate enumeration per chunk (skip when inventory/party signature unchanged since last chunk), then battle kernel hot paths.

## Proposed order
1. 1c (profile save contents) and 3 (derived-read cache): cheap, independent.
2. 2b (receipt journal): removes the growth slope without spec change.
3. Spec discussion for 1a vs 1b (human-owned spec); implement the chosen one.
4. 2a, then 4.

## Measurement protocol
Use `node tests/performance/apiV1Benchmark.mjs --party-throughput --fixtures=d8 --reads=100 --cycles=10 --noops=100 --replays=100` against a git-worktree baseline; compare per-operation medians, state/persisted hashes, receipt replay and renderer gap. Large decisions use the full 4,900-call run.

## Open questions for the spec owner
- May a commit be acknowledged before the full save is rewritten (1a), provided crash recovery reproduces identical state?
- Is a receipt retention limit acceptable (2b alternative)?
- Is a sectioned save container (1b) acceptable, with old single-blob saves still loadable?
