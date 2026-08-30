# AFK adaptive worker pool — 2026/08/31

## Decision

Replace the fixed one-or-two-worker AFK policy with a conservative logical-processor staircase:

| Logical processors | Maximum workers |
|-:|-:|
| 1–3 | 1 |
| 4–7 | 2 |
| 8–9 | 3 |
| 10–11 | 4 |
| 12–13 | 5 |
| 14+ | 6 |

The runtime always caps this value by the number of unlocked Parties. Dispatch still requires remaining AFK backlog and no outstanding Party transaction, so the scheduler does not invent work for inactive or locked Parties. Missing or invalid hardware-concurrency information retains the two-worker fallback.

The wider tiers deliberately start at eight logical processors. Electron's renderer, main process, persistence worker, and operating system retain capacity, and the six-Party game limit prevents useful widths above six.

## Profile support

The authentic fresh-process AFK profiler accepts `--workers=1` through `--workers=6`, or `--workers=0` for the production policy. The override passes through the same one-to-six and Party-count caps as production. Each result records the requested effective override so profiles from different widths remain attributable.

## Six-logical-processor screening

Environment: Electron 37.10.3 on the current six-logical-processor development machine. Each width used one warm-up and three fresh-process 162-hour timing samples with the optimized production worker strategy.

| Metric | 2 workers | 3 workers |
|-|-:|-:|
| Recovery wall p50 | 10,375.5 ms | 18,229.0 ms |
| Recovery wall p95 | 11,229.2 ms | 18,470.4 ms |
| Heartbeat delay p95 p50 | 77.2 ms | 90.2 ms |
| Maximum heartbeat delay p50 | 459.2 ms | 567.9 ms |
| Longest Long Task p50 | 416 ms | 511 ms |
| FIFO commit wait p50 | 417.8 ms | 1,071.9 ms |
| Renderer transaction boundary p50 | 3,677.0 ms | 5,148.7 ms |

Three workers were decisively slower on this host and worsened every listed responsiveness or serialized-boundary metric. This confirms that the 4–7 processor tier must remain at two workers after the build-12 worker-kernel optimization.

Every measured run produced a final in-memory state semantically identical to its reloaded persisted state. Whole-recovery hashes varied between fresh processes as permitted by Specification 5.1 worker-arrival FIFO semantics.

## Verification boundary

The current host cannot validate the 8+ logical-processor tiers directly. The profile override exists so those tiers can be measured on matching hardware without modifying production code. Regression coverage pins every tier boundary, the six-worker ceiling, missing/invalid hardware fallback, profile-override bounds, and the unlocked-Party cap.
