# Memory management benchmark — 2026-08-25

Environment: macOS arm64, Node v26.7.0, smoke profile, three post-warm-up repetitions. Gate: settled RSS growth must exceed both 32 MiB and 20% to fail. Full raw results are in `reports/memory-smoke-2026-08-25.json`.

## Before / after AFK transfer measurement

The former worker envelope retained and transferred complete `baseState` and `resultState` objects. A save-backed twelve-Cycle Expedition 8 result was serialized through both contracts under the same run:

| Contract | Bytes |
|-|-:|
| Before: two full game states | 16,218,987 |
| After: compact party/global delta | 4,322,058 |
| Reduction | 73.4% |

The legacy runtime had no application-wide memory collector, so comparable historical current/peak/settled process samples do not exist. The side-by-side envelope measurement is retained instead of inventing a historical runtime baseline.

## Post-change smoke results

| Workload | Initial RSS | Peak RSS | Final completion | Final settled | Settled growth | Gate |
|-|-:|-:|-:|-:|-:|-|
| Idle | 82.8 MiB | 82.8 MiB | 82.8 MiB | 82.8 MiB | +0.02% | Pass |
| Normal play | 225.0 MiB | 247.4 MiB | 238.8 MiB | 224.2 MiB | -3.39% | Pass |
| x100 | 253.0 MiB | 283.5 MiB | 283.2 MiB | 268.9 MiB | +2.18% | Pass |
| AFK 24-hour emulation smoke slice | 242.3 MiB | 264.5 MiB | 255.4 MiB | 240.3 MiB | -3.42% | Pass |
| 100-run simulation | 568.2 MiB | 749.0 MiB | 593.5 MiB | 588.0 MiB | -13.18% | Pass |
| Artwork pane-cycle proxy | 82.9 MiB | 85.0 MiB | 85.0 MiB | 85.0 MiB | +0.04% | Pass |

WASM memory remained fixed at 2,883,584 bytes in every workload. The Node smoke suite passed every configured regression gate. The separate Electron renderer benchmark command exercises actual idle and pane switching with renderer, asset, worker, and process metrics; the complete standard-duration profile is intentionally not run as part of this smoke report.

