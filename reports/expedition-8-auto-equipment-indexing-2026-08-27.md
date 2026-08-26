# Expedition 8 automatic-equipment candidate indexing — 2026/08/27

## Decision

Build 57 adds a lazy, transaction-local simulated-inventory index by item category and item ID. The index preserves the global `Object.entries` insertion order used by the former planner, including deletion and reinsertion, and is created only when an inventory candidate query occurs.

The production profile retains the former full-scan planner as a per-sample oracle. Indexed and legacy planning must produce byte-identical ordered actions and run summaries. The authoritative batched result must also remain byte-identical to the sequential reducer result, and the existing six-party pinned hashes remain fail-closed.

Canonical hash input normalizes only the application `buildNumber` metadata field to the established build-56 attribution baseline. This prevents the required build increment from invalidating gameplay hashes; complete unnormalized indexed and sequential serialized states are still compared byte-for-byte before hashing.

## Method

Environment: Electron 37.10.3 / Chromium 138, hidden sandboxed production renderer, six logical processors, 8 GiB reported device memory. The fixture is the six-party Expedition 8 save. The decision and result matrices target PT1's six characters, matching the normal one-party AFK automatic-equipment boundary. Each matrix uses two warm-ups and twenty measured samples with nearest-rank percentiles.

The pre-change party baseline was recorded after adding scope and reducer attribution but before adding the runtime index. The post-change measurement uses the same fixture, scope, workloads, sampling, reducer, and canonical serialization.

## Decision gate

The accepted gate required party-scoped inventory scanning to consume at least 10 ms or 15% of total p50. FULL rebuild measured 29.5 ms / 17.6%; maximum inventory measured 48.0 ms / 23.9%. Indexing was therefore justified. Upgrade-heavy scanning measured only 2.8 ms, so it is retained primarily as a regression workload.

## Party-scoped result

Values are p50 / p95 / maximum milliseconds for complete indexed planning plus the authoritative batched reducer.

| Workload | Baseline total | Indexed total | p50 improvement | Candidate visits before → after |
|---|---:|---:|---:|---:|
| Upgrade-heavy | 77.7 / 92.0 / 92.2 | 63.1 / 70.2 / 70.8 | 18.8% | 105,570 → 532 |
| FULL rebuild | 167.8 / 200.7 / 204.8 | 126.3 / 167.0 / 171.0 | 24.7% | 204,014 → 12,740 |
| Maximum inventory | 201.2 / 207.3 / 209.0 | 152.9 / 162.1 / 180.5 | 24.0% | 329,580 → 19,984 |

### Inventory phases

| Workload | Baseline scan p50 | Index build p50 | Indexed candidate scan p50 |
|---|---:|---:|---:|
| Upgrade-heavy | 2.8 | 0.8 | 0.1 |
| FULL rebuild | 29.5 | 0.8 | 20.1 |
| Maximum inventory | 48.0 | 1.3 | 34.4 |

The remaining indexed scan time is candidate evaluation, including antagonism, C-bonus, and character-specific selection-value checks. It is not a repeated complete-inventory traversal.

### Reducer attribution

| Workload | Party-stat p50 / calls | Inventory mutation p50 | Structural/control p50 |
|---|---:|---:|---:|
| Upgrade-heavy | 31.1 / 90 | 13.4 | 15.0 |
| FULL rebuild | 49.7 / 154 | 27.4 | 26.4 |
| Maximum inventory | 51.1 / 150 | 20.1 | 42.7 |

Party-stat recomputation is the largest isolated reducer subphase and is the recommended subject of a future measurement-only milestone. Build 57 does not change its frequency or semantics.

## Deterministic gates

| Party-scoped workload | Action sequence SHA-256 | Canonical final state SHA-256 |
|---|---|---|
| Upgrade-heavy | `068e53072dd493b12c463f225e74b9c56aaf5f679f38a0b820a7dc064218fc90` | `6cd78c08fea8cfaadedac1ac234b0d9725da42a2df5c2f149981e797435af9b8` |
| FULL rebuild | `d53d956e73463a25c888510bec33c434b2058c9c5f26bd467abb51d4b30f931d` | `c0c8fb8d51943d8ae4f991d28dde7694140a13268eae3951741b1555f90bf2ea` |
| Maximum inventory | `e0ee222af0eb8aabaa3300731e315353d6145ffc55255984a11727dfb74f6a70` | `9553c84665e39144c825c018809cc5e50203d16f2e6edb2a13372b4f97e360b9` |

All six existing all-party workload hashes also pass unchanged. Every measured indexed sample passes the legacy full-scan action/summary oracle and the sequential reducer canonical-state oracle.

## Non-scan paths

The lazy index is not constructed for no-op, locked-equipment, or Jewel-priority party workloads. Their standard p50 totals are 0.5 ms, 23.1 ms, and 25.1 ms respectively; `inventoryIndexBuild`, inventory visits, and ranking candidates remain zero.

## Verification

- `npm test`: 225/225 passed, including mixed inventory/equipment/Jewel batch parity and index merge/reinsertion order.
- `npm run lint`: passed.
- `npm run performance:bundle`: passed; the AFK worker remains below both byte limits and contains no React runtime, and initial locale preloads remain within the one-locale limit.
- `npm run build`: passed.
- Standard party-scoped automatic-equipment profiles: two warm-ups and twenty samples for all six workloads; indexed-vs-legacy planning and batched-vs-sequential reducer parity passed every sample.
- All-party automatic-equipment smoke matrix: all six existing pinned action and final-state hashes passed unchanged.
- Expedition 8 startup diagnostics: pinned one-party and six-party deterministic hashes passed; no four-second-class stall; production-concurrency-full event-loop delay maximum 47.8 ms.
- Expedition 8 production renderer profile: canonical round-trip, byte-identical worker encoding, and deterministic AFK final-state hash passed; two warm-ups and twenty measured samples; maximum measured event-loop delay 26.9 ms.
- `git diff --check`: passed.
