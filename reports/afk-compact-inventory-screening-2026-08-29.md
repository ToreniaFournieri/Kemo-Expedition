# AFK compact inventory input screening — 2026/08/29

## Decision

Do not promote compact inventory item references to the AFK runtime. Retain the build-72 worker input, transfer schema v2 result, sparse inventory overlay, two-worker limit, twelve-Cycle Chunks, target-only Chunk status, deterministic RNG, canonical commit order, save behavior, and progress presentation.

The test-only candidate removed immutable item-master fields from every inventory variant before worker submission and restored complete variants only in emitted inventory deltas. It preserved byte-identical hydrated worker results and final state, but the renderer-side compaction and resulting object graph shifted cost into allocation, worker computation, and garbage collection. The candidate reduced input bytes without improving speed or measured memory.

Build 2 retains the rejected candidate only in bundled profile support. Ordinary runtime callers continue to submit the exact build-72 input representation.

## Correctness and profiler hardening

- Preserve optional item-property presence for both save-hydrated variants and newly created runtime variants.
- Add direct sparse-overlay coverage for repeated same-key mutations, new-key rollback on Defeat, and successful-checkpoint journal release.
- Add an exact build-72 counterfactual and a two-candidate alternating promotion mode to the Electron profile.
- Correct the renderer profile to pass the sparse inventory delta through the intended fifth `createAfkPartyChunkResult` argument instead of the worker-telemetry argument.
- Add isolated memory profiling with one fresh Electron process per candidate per pair and alternating candidate order.

## Focused twenty-sample result

Environment: Node.js on macOS arm64, pinned six-Party Expedition 8 save with 2,308 inventory variants, two warm-ups, twenty measured rotating samples, and three sequential twelve-Cycle waves.

| Paired change versus build 72 | p50 | p95 | Range |
|-|-:|-:|-:|
| Input bytes | 38.62% lower | 38.62% lower | 38.62% to 38.62% lower |
| Worker CPU | 2.67% slower | 8.04% faster | 32.88% slower to 19.61% faster |
| Slowest Party | 2.66% slower | 13.80% faster | 55.26% slower to 34.79% faster |

Three-wave six-Party input fell from 14,118,097 to 8,665,399 UTF-8 JSON bytes. Every sample retained byte-identical hydrated results and byte-identical final state.

## Electron promotion result

Environment: Electron 37.10.3 / Chromium 138 on macOS arm64, hidden renderer, two persistent worker slots, two warm-ups, twenty measured alternating build-72/candidate pairs, six Parties, and three backlog waves.

| Paired change versus build 72 | p50 | p95 | Range |
|-|-:|-:|-:|
| Recovery wall | 3.96% slower | 15.83% faster | 35.10% slower to 45.44% faster |
| Renderer heartbeat delay | 12.28% worse | 41.08% better | 76.14% worse to 50.00% better |
| Worker computation | 5.53% slower | 17.26% faster | 39.49% slower to 46.33% faster |

All twenty pairs retained byte-identical hydrated results and final-state SHA-256 `61e67b7f22e49753a52926f76caca56f31444bd5682731364d66a3d57a8f4423`. The balanced medians fail the 8–10% promotion gate and regress every timed metric.

## Fresh-process memory result

Five alternating pairs ran each candidate in a fresh Electron process with one warm-up and one measured recovery per process.

| Metric p50 | Build 72 | Compact candidate | Change |
|-|-:|-:|-:|
| Peak application working set | 582,926,336 B | 597,032,960 B | 2.42% worse |
| Peak renderer working set | 359,907,328 B | 369,721,344 B | 2.73% worse |
| Settled application working set | 507,510,784 B | 510,263,296 B | 0.54% worse |
| Settled renderer working set | 300,957,696 B | 302,399,488 B | 0.48% worse |
| Peak renderer JavaScript heap | 23,100,000 B | 31,200,000 B | 35.06% worse |

Every isolated process retained the same final-state hash. The candidate supplies no measured working-set benefit, and its renderer heap cost confirms that eager per-job compact-object construction is the wrong tradeoff.

## Next boundary

Do not promote eager inventory compaction, increase the worker count, or revive stateful continuation from this evidence. The next AFK investigation should first attribute the complete live reactivation boundary, including renderer job construction, dynamic slot dispatch, React commit visibility, automatic equipment, and durable checkpoint phases. A runtime candidate should target a measured dominant phase without rebuilding the complete inventory object graph on every submission.

## Verification

- `npm test`: 246/246 passed.
- Focused AFK coordinator, save-backed parity, transfer attribution, compact-input, and Defeat rollback tests passed.
- Twenty-sample focused candidate attribution passed exact hydrated-result and final-state parity.
- Twenty-pair Electron promotion profile passed exact hydrated-result and final-state parity.
- Five-pair fresh-process Electron memory profile passed final-state parity.
- TypeScript and Vite production build passed.
- ESLint, production bundle limits, and `git diff --check` passed.
