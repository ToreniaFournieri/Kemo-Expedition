# Expedition 8 automatic-equipment copy-once transaction — 2026/08/27

## Decision

Build 59 replaces repeated complete inventory and Jewel record cloning inside one batched automatic-equipment reducer transaction with lazy transaction-local drafts. The inventory draft is created only when an equipment action can mutate inventory; the Jewel draft is created only when an equipment or Jewel action can mutate Jewel ownership. Each draft is copied once from the authoritative source, mutated only inside the synchronous transaction, and returned through the same ordered reducer states. The input state remains unchanged.

The build-58 eager-clone reducer, the intermediate immutable-input reducer, the legacy full-Party HP reducer, and the whole-party Max-HP reducer remain opt-in profile candidates. Every candidate and the sequential reducer must serialize byte-identically to production.

## Method

Environment: Electron 37.10.3 / Chromium 138, hidden sandboxed production renderer, six logical processors, 8 GiB reported device memory. The fixture is the six-party Expedition 8 save. The standard decision matrix targets PT1's six characters, uses two warm-ups and twenty measured samples, and reports nearest-rank percentiles.

Profile schema 4 rotates the five reducer candidates evenly across the twenty samples. For each sample, a candidate counterfactual total is calculated as `production total - production reducer + candidate reducer` before percentile aggregation. Improvement percent is also calculated per sample before aggregation. This avoids combining unrelated medians and controls consistent candidate-order bias.

## Candidate decision

Values are p50 milliseconds. The exact build-58 counterfactual retains both the eager inventory/Jewel pre-clone and the immutable mutation-helper clones. Immutable input reuse removes only the eager pre-clone. Production uses one lazy transaction copy of each mutated record.

| Workload | Build-58 paired total | Immutable-input paired total | Copy-once production total | Improvement vs build 58 | Improvement vs immutable input |
|---|---:|---:|---:|---:|---:|
| Upgrade-heavy | 38.7 | 23.0 | 6.5 | 82.7% | 70.7% |
| FULL rebuild | 93.5 | 61.4 | 31.5 | 66.3% | 49.6% |
| Maximum inventory | 119.1 | 69.4 | 47.8 | 60.8% | 31.1% |

Both candidates cleared the promotion gate. Removing the eager clone first improved paired p50 materially, and replacing the remaining immutable full-record clones with copy-once drafts delivered a second independent improvement.

## Production distributions

Values are p50 / p95 / maximum milliseconds.

| Workload | Complete production total | Reducer | HP ledger | Transaction preparation | Inventory mutation | Jewel mutation | Structural/control |
|---|---:|---:|---:|---:|---:|---:|---:|
| No-op | 0.5 / 0.8 / 0.8 | 0.0 / 0.1 / 0.1 | 0.0 / 0.0 / 0.0 | 0.0 / 0.0 / 0.0 | 0.0 / 0.0 / 0.0 | 0.0 / 0.0 / 0.0 | 0.0 / 0.0 / 0.1 |
| Upgrade-heavy | 6.5 / 10.7 / 11.7 | 4.1 / 7.9 / 8.6 | 3.5 / 4.2 / 7.6 | 0.4 / 0.6 / 0.6 | 0.1 / 0.1 / 0.3 | 0.0 / 0.1 / 0.2 | 0.2 / 0.5 / 3.7 |
| FULL rebuild | 31.5 / 35.9 / 38.0 | 5.4 / 8.1 / 9.4 | 4.7 / 7.1 / 8.1 | 0.4 / 0.6 / 0.8 | 0.0 / 0.1 / 0.1 | 0.0 / 0.2 / 0.3 | 0.2 / 0.5 / 0.5 |
| Locked equipment | 4.0 / 5.3 / 5.6 | 2.5 / 3.0 / 3.4 | 2.4 / 2.9 / 3.2 | 0.0 / 0.0 / 0.0 | 0.0 / 0.0 / 0.0 | 0.0 / 0.1 / 0.1 | 0.1 / 0.2 / 0.3 |
| Jewel priority | 4.4 / 7.3 / 7.4 | 3.7 / 6.5 / 6.7 | 3.4 / 6.3 / 6.4 | 0.0 / 0.0 / 0.1 | 0.0 / 0.0 / 0.0 | 0.0 / 0.1 / 0.2 | 0.2 / 0.3 / 0.5 |
| Maximum inventory | 47.8 / 54.3 / 58.4 | 6.5 / 7.7 / 7.8 | 5.2 / 6.2 / 6.5 | 0.8 / 1.0 / 1.1 | 0.0 / 0.2 / 0.3 | 0.0 / 0.1 / 0.2 | 0.3 / 0.5 / 0.7 |

Maximum-inventory planning is now the dominant production cost: its indexed inventory scan is 32.9 ms p50, while its complete reducer is 6.5 ms p50.

## Clone and action counts

| Workload | Dispatched actions | Applied equipment / Jewel actions | Transaction inventory / Jewel clones | Per-mutation inventory / Jewel clones |
|---|---:|---:|---:|---:|
| No-op | 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| Upgrade-heavy | 89 | 45 / 44 | 1 / 1 | 0 / 0 |
| FULL rebuild | 155 | 92 / 61 | 1 / 1 | 0 / 0 |
| Locked equipment | 63 | 0 / 60 | 0 / 1 | 0 / 0 |
| Jewel priority | 63 | 0 / 63 | 0 / 1 | 0 / 0 |
| Maximum inventory | 151 | 90 / 59 | 1 / 1 | 0 / 0 |

The exact build-58 counterfactual performs 45, 92, and 90 eager inventory clones for the three active workloads and retains the mutation-helper clones. The immutable-input candidate removes the eager clones but still performs 46, 94, and 45 inventory mutation clones and 88, 116, and 113 Jewel mutation clones. Production replaces those with at most one lazy clone per record for the complete transaction.

## Deterministic gates

The party-scoped action and final-state hashes remain unchanged:

| Workload | Action sequence SHA-256 | Canonical final state SHA-256 |
|---|---|---|
| Upgrade-heavy | `068e53072dd493b12c463f225e74b9c56aaf5f679f38a0b820a7dc064218fc90` | `6cd78c08fea8cfaadedac1ac234b0d9725da42a2df5c2f149981e797435af9b8` |
| FULL rebuild | `d53d956e73463a25c888510bec33c434b2058c9c5f26bd467abb51d4b30f931d` | `c0c8fb8d51943d8ae4f991d28dde7694140a13268eae3951741b1555f90bf2ea` |
| Maximum inventory | `e0ee222af0eb8aabaa3300731e315353d6145ffc55255984a11727dfb74f6a70` | `9553c84665e39144c825c018809cc5e50203d16f2e6edb2a13372b4f97e360b9` |

All six retained all-party action and final-state hashes also pass. Active all-party workloads initialize six HP ledgers but only one transaction inventory draft and one transaction Jewel draft for the complete ordered batch.

## Correctness coverage

- Production copy-once, immutable-input, build-58 eager-clone, legacy full-Party HP, whole-party Max-HP, and sequential reducers serialize byte-identically.
- Mixed inventory, equipment, and Jewel actions leave the source state byte-identical.
- Damaged-party states are compared after every prefix of the retained mixed Jewel/equipment sequence.
- Lazy drafts preserve ordered inventory counts, auto-sell Gold, Jewel returns, key insertion/deletion order, equipment state, and current/max HP semantics.
- Empty batches perform zero reducer allocation work.
- Schema-4 profiles rotate every reducer candidate evenly and aggregate paired totals only after calculating each sample's counterfactual.

## Verification

- `npm test`: 225/225 passed; the focused automatic-equipment attribution suite contains eight passing cases.
- `npm run lint`, the production build, and `git diff --check` passed.
- The production AFK worker bundle is 1,081,096 bytes / 220,631 gzip bytes, below the 1.2 MB / 300 KB gates, contains no React runtime, and initial locale preloads remain one.
- Party-scoped standard profile: two warm-ups and twenty measured samples across all six workloads; every candidate, sequential reducer, legacy planner, canonical state, and pinned hash passed every sample.
- All-party smoke: all six retained action and final-state hashes passed; active runs created at most one inventory and one Jewel transaction draft.
- Expedition 8 startup diagnostics retained deterministic SHA-256 `11fb8356c53d5087d8f220408a92c3c8b12ef276abf2898e9a7e19e7b88bfebc`, reported no four-second-class stall, and recorded a maximum 79.6 ms event-loop delay in the deliberately exact-sized production-concurrency diagnostic.
- The Expedition 8 production renderer profile passed canonical round-trip, byte-identical worker encoding, and deterministic AFK final-state validation; two warm-ups and twenty measured samples recorded a maximum 36.1 ms event-loop delay.

## Next target

Do not optimize the reducer further without new evidence. Maximum-inventory total p50 is 47.8 ms and its reducer is only 6.5 ms; indexed candidate evaluation in `inventoryScan` is now the largest isolated production phase at 32.9 ms p50. The next milestone should attribute antagonism, C-bonus, and character-specific selection-value checks inside that indexed scan before changing ranking semantics.
