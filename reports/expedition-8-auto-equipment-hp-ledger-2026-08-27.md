# Expedition 8 automatic-equipment Max-HP ledger — 2026/08/27

## Decision

Build 58 replaces repeated complete `computePartyStats` calls inside one batched automatic-equipment reducer transaction with a transaction-local Max-HP ledger per affected party. The ledger initializes the canonical HP contribution of each party member once, then recalculates only the character changed by the current equipment or Jewel action. Every intermediate Max-HP and damaged-HP synchronization boundary is retained.

The former build-57 full Party-status path and a narrower whole-party Max-HP path remain available only to the opt-in production profile as per-sample candidates. All three batched strategies and the sequential reducer must produce byte-identical serialized states. Unexpected party-wide HP input changes rebuild the ledger from the next authoritative Party state.

## Method

Environment: Electron 37.10.3 / Chromium 138, hidden sandboxed production renderer, six logical processors, 8 GiB reported device memory. The fixture is the six-party Expedition 8 save. The standard decision matrix targets PT1's six characters, uses two warm-ups and twenty measured samples, and reports nearest-rank percentiles.

Each measured sample plans indexed actions once, applies the production incremental reducer, then verifies profile-only legacy full-Party and whole-party Max-HP reducers, the sequential reducer, the legacy full-scan planner, canonical serialization, and pinned hashes. Because host load moved between build-57 and build-58 runs, the acceptance gate uses the paired same-sample legacy reducer counterfactual. Historical build-57 totals are reported separately and are not used as the paired decision denominator.

## Candidate decision

Values are p50 milliseconds. Paired total legacy is the measured production total with its incremental reducer replaced by the same-sample legacy reducer: `incremental total + legacy reducer - incremental reducer`.

| Workload | Legacy full-stat subphase | Whole-party Max-HP subphase | Incremental subphase | Paired legacy total → incremental total | Paired total improvement |
|---|---:|---:|---:|---:|---:|
| Upgrade-heavy | 26.0 | 15.4 | 3.2 | 53.4 → 31.1 | 41.8% |
| FULL rebuild | 47.8 | 31.0 | 5.6 | 120.3 → 83.2 | 30.8% |
| Maximum inventory | 64.5 | 43.0 | 8.0 | 186.0 → 139.0 | 25.3% |

The incremental candidate reduces the isolated stat subphase by 87.7%, 88.3%, and 87.6%. It also reduces reducer p50 relative to the whole-party Max-HP candidate by 10.4 ms, 20.5 ms, and 25.8 ms, clearing the promotion rule for the more targeted strategy.

For reference only, the historical build-57 production totals were 63.1 ms, 126.3 ms, and 152.9 ms. The build-58 totals measured in this run were 31.1 ms, 83.2 ms, and 139.0 ms. The paired comparison above controls for the substantial cross-run timing drift visible in maximum inventory.

## Computation counts

| Workload | Dispatched actions | Legacy character-stat computations | Incremental character-stat computations | Reduction | Ledger initialization / updates / rebuilds |
|---|---:|---:|---:|---:|---:|
| Upgrade-heavy | 89 | 1,080 | 95 | 91.2% | 1 / 89 / 0 |
| FULL rebuild | 155 | 1,848 | 159 | 91.4% | 1 / 153 / 0 |
| Maximum inventory | 151 | 1,800 | 155 | 91.4% | 1 / 149 / 0 |

Some planned actions are valid ordered no-ops by the time they reach the reducer, so dispatched action count can exceed HP-ledger update count. Those actions remain in the ordered action hash and sequential parity oracle.

## Standard distributions

Values are p50 / p95 / maximum milliseconds for complete production indexed planning plus the incremental reducer.

| Workload | Total | Reducer | Incremental HP subphase |
|---|---:|---:|---:|
| No-op | 0.4 / 0.5 / 0.5 | 0.0 / 0.1 / 0.1 | 0.0 / 0.0 / 0.0 |
| Upgrade-heavy | 31.1 / 72.0 / 91.1 | 28.7 / 69.6 / 88.7 | 3.2 / 12.5 / 17.3 |
| FULL rebuild | 83.2 / 99.5 / 101.2 | 61.1 / 73.3 / 74.2 | 5.6 / 6.8 / 6.8 |
| Locked equipment | 3.9 / 4.5 / 4.7 | 2.5 / 2.8 / 2.9 | 2.2 / 2.5 / 2.5 |
| Jewel priority | 4.8 / 5.7 / 5.7 | 4.1 / 4.8 / 4.8 | 3.6 / 4.4 / 4.5 |
| Maximum inventory | 139.0 / 148.8 / 156.3 | 89.8 / 96.9 / 99.7 | 8.0 / 9.0 / 9.7 |

No-op performs zero ledger initialization or updates. No-op, locked-equipment, and Jewel-priority workloads retain zero inventory-index builds, inventory visits, and ranking candidates.

## Deterministic gates

The three party-scoped active-workload hashes remain:

| Workload | Action sequence SHA-256 | Canonical final state SHA-256 |
|---|---|---|
| Upgrade-heavy | `068e53072dd493b12c463f225e74b9c56aaf5f679f38a0b820a7dc064218fc90` | `6cd78c08fea8cfaadedac1ac234b0d9725da42a2df5c2f149981e797435af9b8` |
| FULL rebuild | `d53d956e73463a25c888510bec33c434b2058c9c5f26bd467abb51d4b30f931d` | `c0c8fb8d51943d8ae4f991d28dde7694140a13268eae3951741b1555f90bf2ea` |
| Maximum inventory | `e0ee222af0eb8aabaa3300731e315353d6145ffc55255984a11727dfb74f6a70` | `9553c84665e39144c825c018809cc5e50203d16f2e6edb2a13372b4f97e360b9` |

All six retained all-party action and final-state hashes also pass. The all-party smoke initializes six ledgers and records zero rebuilds.

## Correctness coverage

- Whole-party Max HP equals complete Party-status Max HP for every save-backed party.
- Legacy full-stat, whole-party Max-HP, incremental, and sequential reducers are byte-identical.
- Damaged-party intermediate states are compared after every prefix of a mixed Jewel/equipment action sequence, including the one-HP clamp.
- Party level changes force a safe ledger rebuild whose Max HP equals complete Party-status computation.
- Mixed inventory, equipment, and Jewel reducer semantics remain covered.
- The profile reports exact full-stat, Max-HP, character-stat, contribution, ledger initialization, update, and rebuild counts.

## Verification

- `npm test`: 225/225 passed after adding seven bundled automatic-equipment attribution tests.
- `npm run lint` and the production build passed.
- The production AFK worker bundle is 1,079,174 bytes / 220,225 gzip bytes, below the 1.2 MB / 300 KB gates, contains no React runtime, and initial locale preloads remain one.
- Party-scoped standard profile: two warm-ups and twenty measured samples for all six workloads; all three reducer strategies, sequential reducer, legacy planner, canonical states, and pinned hashes passed every sample.
- All-party automatic-equipment smoke: all six retained action and final-state hashes passed.
- Expedition 8 startup diagnostics retained deterministic SHA-256 `11fb8356c53d5087d8f220408a92c3c8b12ef276abf2898e9a7e19e7b88bfebc` and reported no four-second-class stall. The deliberately exact-sized production-concurrency diagnostic recorded a maximum 79.5 ms event-loop delay on this run.
- Expedition 8 production renderer profile passed canonical round-trip, byte-identical worker encoding, and deterministic AFK final-state validation; two warm-ups and twenty measured samples recorded a maximum 28.8 ms event-loop delay.
- `git diff --check` passed.

The startup diagnostic's exact-sizing and full-payload submission costs are retained diagnostic work and are outside the automatic-equipment transaction changed by this build.
