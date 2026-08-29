# Expedition 8 automatic-equipment prepared candidate cache — 2026/08/28

## Decision

Build 60 promotes combined transaction-local caching for automatic-equipment candidate evaluation. Immutable item facts are computed at most once per item object when an indexed fill scan needs them, and character category multipliers are computed at most once per character/category pair. Mutable inventory ownership, count, insertion order, deletion, and reinsertion remain authoritative in the simulated inventory and its existing index.

The exact build-59 indexed planner, multiplier-only cache, item-facts-only cache, combined cache, and legacy complete-inventory planner remain profile candidates. Every planner must emit byte-identical ordered actions and summaries before any reducer candidate is executed.

## Method

Environment: Electron 37.10.3 / Chromium 138, hidden sandboxed production renderer, six logical processors, 8 GiB reported device memory. The fixture is the six-party Expedition 8 save. The standard decision matrix targets PT1's six characters, uses two warm-ups and twenty measured samples, and reports nearest-rank percentiles.

Profile schema 5 rotates the four planner candidates and five reducer candidates independently using the sample offset. Planner counterfactual totals are calculated per sample as `production total - combined planning + candidate planning` before percentile aggregation. The legacy complete-inventory planner remains an additional exact parity oracle.

## Candidate decision

Values are p50 milliseconds. Improvement is the paired per-sample production improvement versus the exact build-59 indexed planner.

| Workload | Build-59 indexed planning | Multiplier memo | Item-facts memo | Combined production planning | Build-59 paired total | Production total | Improvement |
|---|---:|---:|---:|---:|---:|---:|---:|
| Upgrade-heavy | 1.6 | 1.5 | 1.7 | 1.7 | 5.1 | 5.1 | no material change |
| FULL rebuild | 19.1 | 10.0 | 15.7 | 6.3 | 23.7 | 10.8 | 54.4% |
| Maximum inventory | 33.1 | 15.0 | 27.0 | 10.0 | 38.1 | 14.9 | 61.0% |

Multiplier memoization supplies the largest independent improvement. Item-facts memoization is smaller independently but provides a second additive reduction when combined with multiplier memoization. The combined candidate clears the promotion gate for both FULL rebuild and maximum inventory without a material absolute regression in the smaller workloads.

## Production distributions

Values are p50 / p95 / maximum milliseconds.

| Workload | Complete total | Inventory scan | Index build | Reducer |
|---|---:|---:|---:|---:|
| No-op | 0.3 / 0.5 / 0.6 | 0.0 / 0.0 / 0.0 | 0.0 / 0.0 / 0.0 | 0.0 / 0.1 / 0.1 |
| Upgrade-heavy | 5.1 / 7.4 / 7.6 | 0.1 / 0.2 / 0.3 | 0.6 / 0.8 / 1.1 | 3.6 / 5.2 / 5.2 |
| FULL rebuild | 10.8 / 12.6 / 14.5 | 3.9 / 5.6 / 6.2 | 0.6 / 0.8 / 0.8 | 4.2 / 5.0 / 6.0 |
| Locked equipment | 2.9 / 3.8 / 4.8 | 0.0 / 0.0 / 0.0 | 0.0 / 0.0 / 0.0 | 1.9 / 2.9 / 4.1 |
| Jewel priority | 3.0 / 4.7 / 4.9 | 0.0 / 0.0 / 0.0 | 0.0 / 0.0 / 0.0 | 2.5 / 4.2 / 4.5 |
| Maximum inventory | 14.9 / 17.2 / 18.3 | 6.1 / 7.6 / 8.6 | 1.0 / 1.2 / 1.4 | 4.9 / 5.7 / 5.9 |

The former dominant maximum-inventory scan falls from the exact build-59 candidate's 33.1 ms planning p50 to 10.0 ms complete planning p50. Native ranking remains below one millisecond and is not changed.

## Cache attribution

| Workload | Item fact computations / hits | Character-category multiplier computations / hits |
|---|---:|---:|
| No-op | 0 / 0 | 0 / 0 |
| Upgrade-heavy | 0 / 0 | 0 / 0 |
| FULL rebuild | 1,997 / 9,112 | 26 / 10,061 |
| Locked equipment | 0 / 0 | 0 / 0 |
| Jewel priority | 0 / 0 | 0 / 0 |
| Maximum inventory | 3,265 / 15,364 | 26 / 17,371 |

Cache objects are created lazily. No-op, locked-equipment, Jewel-priority, and the retained upgrade-heavy fixture perform no item-fact or multiplier-cache work. Item facts never cache mutable inventory status or counts.

## Deterministic gates

The retained party-scoped action and final-state hashes remain unchanged:

| Workload | Action sequence SHA-256 | Canonical final state SHA-256 |
|---|---|---|
| Upgrade-heavy | `068e53072dd493b12c463f225e74b9c56aaf5f679f38a0b820a7dc064218fc90` | `6cd78c08fea8cfaadedac1ac234b0d9725da42a2df5c2f149981e797435af9b8` |
| FULL rebuild | `d53d956e73463a25c888510bec33c434b2058c9c5f26bd467abb51d4b30f931d` | `c0c8fb8d51943d8ae4f991d28dde7694140a13268eae3951741b1555f90bf2ea` |
| Maximum inventory | `e0ee222af0eb8aabaa3300731e315353d6145ffc55255984a11727dfb74f6a70` | `9553c84665e39144c825c018809cc5e50203d16f2e6edb2a13372b4f97e360b9` |

All six retained all-party action and final-state hashes also pass. Every planner candidate matches the combined planner's ordered actions and summary; every reducer candidate and the sequential reducer remain byte-identical.

## Verification

- `npm test`: 225/225 passed.
- `npm run lint`, production build, bundle gates, and `git diff --check` passed.
- AFK worker: 1,081,096 bytes / 220,631 gzip bytes, below both gates, with no React runtime and one initial locale preload.
- Party-scoped standard profile: two warm-ups and twenty measured samples across all six workloads; every planner, reducer, legacy planner, sequential reducer, canonical state, and pinned hash passed every sample.
- All-party smoke: all six retained action and final-state hashes passed with exact planner/reducer parity.
- Expedition 8 startup diagnostics retained deterministic SHA-256 `11fb8356c53d5087d8f220408a92c3c8b12ef276abf2898e9a7e19e7b88bfebc`, reported no four-second-class stall, and recorded a maximum 65.9 ms event-loop delay in the deliberately exact-sized production-concurrency diagnostic.
- Expedition 8 production renderer profile passed canonical round-trip, byte-identical worker encoding, and deterministic AFK final-state validation; two warm-ups and twenty measured samples recorded a maximum 19.8 ms event-loop delay.

## Next target

Do not add a pre-ranked candidate cursor without new evidence. Maximum-inventory production total is now 14.9 ms p50 and no isolated phase exceeds 6.1 ms p50. Future optimization should begin with a fresh end-to-end AFK or interaction profile rather than continuing to optimize automatic equipment speculatively.
