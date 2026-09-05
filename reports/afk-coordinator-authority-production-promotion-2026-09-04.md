# AFK Coordinator Authority Production Promotion — 2026/09/04

## Outcome

Build 61 promotes coordinator-owned state authority for production AFK reactivation. Each accepted FIFO transaction is reduced synchronously against the newest immutable authoritative state, receives an immediate version acknowledgement, and can release its Party barrier without waiting for React. React publishes coalesced presentation snapshots, while persistence, worker dispatch, API actions, checkpoints, and live interactions continue to read or update the authoritative root.

The change implements the authority boundary required by Specification section 5.1 without changing the thirty-Cycle Chunk, worker-arrival FIFO, automatic-equipment, RNG, save, or persistence semantics.

## Why the earlier rejection was revisited

The Build 16/18 authority experiment was compared with an older production composition. After compact result-only battle output and renderer memoization were promoted, the profile-only authority variants still used complete battle output. That made the authority comparison structurally unequal and could not answer whether authority was acceptable on the current production workload.

Build 61 adds `authority-production`, which combines coordinator authority with every currently promoted worker and renderer optimization. The live profiler retains `candidate` as the pre-promotion React-authority control, so future paired runs can continue to measure the promotion directly. The rejected `coordinator-paced` behavior remains profile-only and is not enabled in production.

## 162-hour timing confirmation

Five paired samples per variant were run in fresh alternating Electron processes after one warmup per variant.

| Metric (p50 unless noted) | Current-production control | Authority production | Change |
|-|-:|-:|-:|
| Wall time | 4,696.5 ms | 4,796.3 ms | +2.1% |
| Wall p95 | 4,903.3 ms | 4,812.7 ms | -1.8% |
| Heartbeat p95 | 49.9 ms | 23.2 ms | -53.5% |
| Heartbeat maximum | 339.2 ms | 339.3 ms | flat |
| React commits | 87 | 41 | -52.9% |
| React commit p95 | 19.3 ms | 22.5 ms | +3.2 ms |
| Long Task maximum | 308 ms | 307 ms | flat |
| Worker simulation | 3,715.0 ms | 3,500.2 ms | -5.8% |
| Renderer transaction boundary | 2,043.4 ms | 885.9 ms | -56.6% |
| FIFO commit wait | 140.8 ms | 0 ms | -100% |
| Maximum authority transaction | — | 23.4 ms p50 / 28.7 ms observed max | below 50 ms |

All timing samples reported semantic equality between the final in-memory state and the persisted/reloaded state. Whole-run hashes may differ between independent runs because valid FIFO worker-arrival order is intentionally nondeterministic.

The authority path did increase worker-slot idle attribution because acknowledged work no longer waits for React and publication is deliberately coalesced. This did not create a wall-p95 or long-task regression. Bounded post-acknowledgement pacing remains rejected.

## Short-duration gates

Three paired samples per variant were run at 9 and 24 hours after one warmup.

| Duration | Wall p50 | Heartbeat p95 p50 | React commits p50 | Long Task max p50 |
|-|-:|-:|-:|-:|
| 9h control | 2,631.9 ms | 31.1 ms | 25 | 293 ms |
| 9h authority | 2,596.5 ms (-1.3%) | 20.6 ms (-33.8%) | 14 (-44.0%) | 297 ms (+1.4%) |
| 24h control | 3,194.1 ms | 39.4 ms | 41 | 301 ms |
| 24h authority | 3,180.0 ms (-0.4%) | 19.4 ms (-50.8%) | 20 (-51.2%) | 306 ms (+1.7%) |

Every short-duration sample also preserved persisted semantic equality. Individual React commit p95 was noisier at short durations, but publication count was approximately halved, heartbeat p95 materially improved, and neither wall time nor long-task maximum showed a material regression. Per-commit tail remains the primary metric to watch in future AFK tuning.

## Memory gate

Three paired 162-hour memory samples per variant were run in fresh alternating Electron processes after one warmup.

| Metric (p50) | Control | Authority production | Change |
|-|-:|-:|-:|
| Peak application working set | 1,073.0 MB | 1,081.8 MB | +0.8% |
| Peak renderer working set | 692.1 MB | 697.3 MB | +0.8% |
| Peak renderer heap | 95.9 MB | 95.6 MB | -0.3% |
| Completion application working set | 1,034.7 MB | 1,049.8 MB | +1.5% |
| Settled application working set | 1,020.3 MB | 1,041.8 MB | +2.1% |
| Settled renderer working set | 633.2 MB | 654.4 MB | +3.4% |

All memory deltas remain within the 10% promotion bound, and every sample preserved persisted semantic equality.

## Validation

- Focused AFK scheduler and `GameStateAuthority` tests: 23 passed.
- Full repository test suite: 359 passed.
- ESLint: passed.
- TypeScript and production Vite build: passed.
- Battle protocol generated-source check: passed.
- Production bundle limits and React-free AFK worker check: passed.
- `git diff --check`: passed after documentation finalization.

## Decision

Promote coordinator authority without dispatch pacing. The modest 162-hour wall-p50 variance is offset by an improved wall p95, approximately halved heartbeat delay and React publication count, a 56.6% smaller renderer transaction boundary, zero FIFO commit wait, bounded authority transactions, and passing short-duration, memory, correctness, persistence, build, and bundle gates.
