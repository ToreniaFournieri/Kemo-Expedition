# AFK stateless Diary journal and inventory overlay — 2026/08/29

## Decision

Build 72 promotes two bounded worker-local changes to AFK reactivation: retained target-Party Diary bodies are represented by renderer-owned index placeholders in worker inputs, and reward inventory changes use a sparse copy-on-write overlay instead of repeatedly copying the complete inventory record.

The renderer restores authoritative Diary bodies before canonical commit. The overlay retains only changed variants, supports exact per-expedition rollback on Defeat, and emits the existing compact inventory delta directly. Production keeps transfer schema v2, two workers, twelve-Cycle Party Chunks, target-only Chunk status, indexed item lookup, canonical result order, deterministic RNG, progress presentation, and save formats.

## Implementation

- Target-Party worker input keeps each retained Diary entry's `id`, `createdAt`, `isRead`, and authoritative base index. Large expedition bodies and the duplicated latest expedition are not cloned into the worker.
- New worker Diary entries remain complete. Schema-v2 result creation emits renderer-owned references for placeholders and complete values only for new entries; hydration validates every index and restores the original objects.
- The AFK-only inventory proxy reads unchanged variants from the captured Chunk input and stores only writes. A mutation journal rolls back the current expedition exactly when it ends in Defeat.
- Direct delta generation preserves the former base-key/new-key insertion order and `isNew` semantics. The ordinary reducer path remains immutable and unchanged.
- Profile-only `full`/`placeholders` history and `immutable`/`overlay` seams retain exact counterfactuals and are not used by ordinary runtime callers.

## Focused three-wave attribution

Environment: Node.js on macOS arm64, pinned six-Party Expedition 8 save with 2,308 inventory variants, two warm-ups, twenty measured rotating samples, and three sequential twelve-Cycle waves.

| Candidate | Worker CPU p50 | Slowest Party p50 | Input bytes | Paired CPU p50 | Paired slowest p50 |
|-|-:|-:|-:|-:|-:|
| Build-71 behavior | 543.14 ms | 51.26 ms | 36,161,680 | — | — |
| Diary journal only | 549.69 ms | 52.05 ms | 14,118,097 | -0.77% | -1.23% |
| Inventory overlay only | 520.46 ms | 47.18 ms | 36,161,680 | 4.78% | 6.25% |
| Combined production | 521.96 ms | 47.66 ms | 14,118,097 | 4.05% | 8.42% |

The Diary journal reduces worker input by 60.96%. Its value is structured-clone time and bounded transfer memory, not Node compute. The sparse overlay supplies the focused compute reduction and avoids repeated full-record inventory copies. Every candidate produced byte-identical hydrated results and byte-identical final state in every sample.

## Exact build-71 Electron comparison

Environment: Electron 37.10.3 / Chromium 138 on macOS arm64, hidden renderer, production two-worker pool, two warm-ups, twenty measured samples, rotating candidate order, six Parties, and three backlog waves.

The build-71 counterfactual uses the same schema-v2 compact result, indexed item lookup, target-only Chunk status, worker limit, Chunk size, and coordinator as production. Only Diary input placeholders and the inventory overlay are disabled.

| Paired improvement versus build 71 | p50 | p95 | Range |
|-|-:|-:|-:|
| Recovery wall time | 12.99% | 19.78% | 1.20% to 28.70% |
| Renderer heartbeat delay | 67.79% | 76.23% | 60.67% to 77.24% |

Input transfer falls from 36,285,030 bytes to 14,124,257 bytes per three-wave six-Party sample, a 61.08% reduction. This directly reduces the data simultaneously retained by the renderer message, structured clone, and worker input. Process working-set samples are intentionally not used as a promotion claim because all counterfactuals share one long-lived Electron process and therefore include candidate-order and garbage-collection carryover.

All twenty samples produced byte-identical hydrated results and retained final-state SHA-256 `61e67b7f22e49753a52926f76caca56f31444bd5682731364d66a3d57a8f4423`.

## Verification

- `npm test`: 246/246 passed.
- Focused Node attribution: two warm-ups and twenty measured samples; exact hydrated-result and final-state parity across four candidates.
- Electron promotion profile: two warm-ups and twenty measured samples; exact schema-v2 hydration and pinned final-state hash across six candidates.
- TypeScript and Vite production build passed.
- ESLint, performance bundle gates, and `git diff --check` passed.
