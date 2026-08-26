# Expedition 8 automatic-equipment attribution — 2026/08/26

## Decision

Build 56 batches each automatic-equipment run into one reducer transaction and caches the preceding party Max HP across its ordered equipment/Jewel actions. The action sequence and reducer semantics are unchanged: every measured optimized result is compared byte-for-byte with the former sequential reducer path, and both the ordered action sequence and canonical final state have pinned SHA-256 hashes.

The isolated profiler also closes two build-55 diagnostics gaps: unavailable AFK transfer sizes remain `null`, and the startup concurrency profiler now throws on pinned one-party or six-party deterministic-hash mismatch.

## Method

Environment: Electron 37.10.3 / Chromium 138, hidden sandboxed production renderer, six logical processors, 8 GiB reported device memory. The fixture is the six-party Expedition 8 save. Each workload uses two warm-ups and twenty measured samples with nearest-rank percentiles.

The production callback plans actions against a disposable workload state. The optimized batch is applied through the authoritative reducer, then the former sequential action path is run as a correctness oracle. Canonical serialized states must be byte-identical. The profiler does not mutate the live save.

## Result

Values are p50 / p95 / maximum milliseconds for the complete optimized planning plus reducer transaction.

| Workload | Complete optimized run | Actions | Inventory entries visited | Result |
|---|---:|---:|---:|---|
| No-op | 0.5 / 0.6 / 0.6 | 0 | 0 | No material overhead |
| Upgrade-heavy | 403.2 / 469.3 / 474.3 | 492 | 738,990 | Reducer remains dominant |
| FULL rebuild | 919.9 / 1,090.6 / 1,130.0 | 848 | 1,408,279 | Reducer plus repeated inventory scans |
| Locked equipment | 56.4 / 63.3 / 63.5 | 197 | 0 | Jewel reducer work |
| Jewel priority | 27.9 / 35.7 / 43.4 | 63 | 0 | Below 50 ms in all samples |
| Maximum inventory stress | 1,171.5 / 1,421.8 / 1,429.7 | 821 | 2,307,060 | Reducer and inventory scans both material |

### Reducer optimization

| Workload | Former sequential reducer p50 | Batched reducer p50 | Median improvement |
|---|---:|---:|---:|
| Upgrade-heavy | 405.5 | 296.2 | 27.0% |
| FULL rebuild | 750.4 | 576.2 | 23.2% |
| Locked equipment | 95.2 | 53.1 | 44.2% |
| Jewel priority | 47.0 | 27.1 | 42.3% |
| Maximum inventory stress | 826.6 | 633.9 | 23.3% |

The batch preserves the exact action order while avoiding one React reducer dispatch per equipment/Jewel mutation and reusing the already-computed prior Max HP within each party. It still computes the next authoritative Max HP after every action, retaining the existing damaged-HP and clamping semantics.

## Deterministic gates

| Workload | Action sequence SHA-256 | Canonical final state SHA-256 |
|---|---|---|
| No-op | `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` | `ea2fac27529c3ebde4a18f0316f6218a821397f16465715984f36307ed8ecb6b` |
| Upgrade-heavy | `c5badfd789d306d422dd1d8f6a9b8b64eb4d8a1fd149557b8b24df85152ef558` | `c6f3a08ec5750202f9a87ee2f89a9dc863a948ecdf7af217f6d234d6ce8bd560` |
| FULL rebuild | `28c2be26d1ad2467a45ece7ee9abae3fd343f5a3e15d9c15e310231ad10cfd5c` | `9de40f57b6e3073a0d5ff234d8c0789873f60afe52231bbae7e93bc0184ee0d8` |
| Locked equipment | `ec7c4963dd2a5c721fe4eaf99f841312349e15571baef6837417a82909690dd4` | `a5ebb3d28cf350027346b4d6b58906c4f6d3f267f161ccd9aa636d98aee5fd00` |
| Jewel priority | `b053201d08a20b6f15600b9ac0bb12d9fa3b4a7fdef448c115e59bcbef4f7c5d` | `f85a79bb7696ee54ecba0a678a554e54bf96d35e7933e155ed0b57cb8643274f` |
| Maximum inventory | `ce0c0d895099d202866b9f29b9287b60e293fd7bd105a43a3064189e6d1ddbd2` | `ee2fb639e67ce4497c6ac5d5af4fd5478df28ecd2d7e3ffbaa52a63ab19d759f` |

## Scope and next milestone

The six-party workloads deliberately exceed the normal AFK boundary, which invokes automatic equipment for one committed party at a time. They expose worst-case scaling and make attribution stable, but their complete-run wall times must not be interpreted as a normal single-party AFK pause.

The batch reduces the dominant reducer cost without changing results. FULL and maximum-inventory stress remain expensive. The next isolated milestone should index inventory candidates by item ID and category, then measure a party-scoped profile before considering any deeper equipment-state transaction redesign.

The reported verification-window delay is intentionally excluded from production conclusions because it also contains the former sequential oracle, canonical serialization, and SHA-256 hashing.
