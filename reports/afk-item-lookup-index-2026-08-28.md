# AFK item lookup index screening — 2026/08/28

## Decision

Promote the immutable numeric item-ID index to the production runtime. The candidate clears the agreed 8–10% balanced performance gate in both focused worker CPU and the paired Electron recovery path while preserving exact deterministic output.

Production remains on AFK transfer schema v2, the two-worker limit, twelve-Cycle Party Chunks, and canonical renderer commit ordering. No save, RNG, gameplay, Diary, environment, persistence, or presentation contract changes.

## Implementation

Construct one bounded `Map<number, ItemDef>` after the immutable item master is generated, retaining the first declared item for any duplicate ID so lookup semantics match `Array.find`. Route `getItemById` through the index. Retain a profile-only differential seam that restores the production strategy with `try`/`finally` and is absent from ordinary call sites.

CPU profiling of the Expedition 8 AFK workload identified repeated linear `getItemById` scans among the remaining worker-compute hot paths. Two adjacent alternating counterfactuals were screened first and rejected: resolving a complete Chunk in one reducer window regressed paired CPU p50 by 2.50%, and cloning reward inventory once per expedition regressed paired CPU p50 by 1.51%. Their runtime branches were removed.

## Focused save-backed worker profile

Environment: Node.js on macOS arm64. The profile used the pinned six-Party Expedition 8 save, two warm-ups, twenty measured alternating adjacent linear/indexed pairs, identical deterministic random sources, and exact serialized worker-state comparison after every candidate.

| Metric | Linear | Indexed | Paired improvement |
|-|-:|-:|-:|
| Six-Party worker CPU p50 | 302.64 ms | 277.63 ms | 11.37% p50 / 14.91% p95 |
| Slowest-Party CPU p50 | 84.90 ms | 74.54 ms | 10.74% p50 / 20.92% p95 |

All twenty pairs produced byte-identical serialized worker states.

## Electron worker-path profile

Environment: Electron 37.10.3 / Chromium 138 on macOS arm64. The profile used two warm-ups, twenty measured samples, three sequential twelve-Cycle waves per Party, two persistent worker slots, adjacent alternating linear/indexed execution, renderer heartbeat sampling, process working-set sampling, and canonical commits.

| Paired metric | p50 | p95 | Range |
|-|-:|-:|-:|
| Recovery wall improvement | 10.30% | 23.20% | -25.35% to 51.76% |
| Worker-compute improvement | 14.04% | 27.13% | -23.71% to 55.84% |

Every sample preserved byte-identical hydrated results and the pinned final-state SHA-256 `61e67b7f22e49753a52926f76caca56f31444bd5682731364d66a3d57a8f4423`. The distributions retain host-noise outliers, but both balanced paired medians clear the promotion gate and independently agree with the focused CPU profile.

## Verification

- Focused twenty-pair save-backed differential profile
- Twenty-pair Electron AFK worker-path profile
- Full automated test suite
- ESLint
- TypeScript and Vite production build
- Bundle and 500 kB chunk gates
- Memory smoke suite
- `git diff --check`
