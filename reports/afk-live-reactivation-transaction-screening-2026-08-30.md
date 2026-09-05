# Live AFK reactivation and atomic transaction screening — 2026/08/30

## Decision

Do not promote the atomic Chunk/equipment transaction candidate. The candidate reduced the measured two-stage transaction boundary substantially, but the authoritative final maximum-backlog matrix measured a 1.91% regression in 162-hour wall p50. The production path therefore remains the existing two-stage commit with two workers, twelve-Cycle Chunks, schema-v4 inventory reconciliation, Diary placeholders, sparse inventory overlays, indexed item lookup, segmented saves, canonical ordering, and five-second durable checkpoints.

Retain the new live profiler and the candidate behind its profile-only selector. The production recovery selector does not change, but the normal automatic-equipment caller now uses the extracted shared state-input planner; the repository runtime-change rule therefore records this work as v0.9.5 Build 8.

## Live profiler

`npm run performance:afk-live` builds a profile-only production renderer and launches a fresh hidden Electron process per sample with isolated `userData`. It mounts the real application, loads the six-Party Expedition 8 fixture, creates a durable AFK-runtime checkpoint, advances the raw absence by 9, 24, or 162 hours, and lets the normal recovery coordinator, worker pool, reducers, React effects, automatic equipment, and segmented persistence finish.

Timing and memory are separate modes. Timing captures worker construction/submission/execution/hydration, canonical waits, Chunk and equipment transactions, React render/visibility samples, persistence/checkpoint work, a 10 ms heartbeat, and Long Tasks. Memory runs sample Electron process metrics and renderer heap through a context-isolated bridge, retain peak/completion samples, and force GC before the settled sample. Heap/allocation profiles are deliberately outside measured runs.

Each run emits canonical component and complete-state SHA-256 values, a persisted-state SHA-256, the bounded event trace, and exclusive sampled critical-path shares. The fixture and gameplay/battle random sources are fixed only in the profile build; normal application behavior is unchanged.

## Milestone 1 attribution gate

The existing Chunk-visible → automatic-equipment → equipment-visible sequence is materially dominant and therefore qualified for candidate screening.

| Workload | Baseline two-stage boundary p50 | Share of wall p50 |
|-|-:|-:|
| 9 hours | 2,143.4 ms | 38.9% |
| 24 hours | 4,504.7 ms | 51.1% |
| 162 hours | 11,391.9 ms | 60.8% |

The 162-hour gate exceeds the required 10% by a wide margin. Worker execution remains the other dominant component: summed two-worker execution was 14,965.6 ms p50, overlapped by renderer work.

## Milestone 2 timing decision

The promotion workload used two warm-ups followed by twenty alternating baseline/candidate timing pairs. After extracting the shared state-input planner, the complete matrix was repeated against the final implementation; the following is that authoritative rerun.

| 162-hour metric | Baseline | Atomic candidate | Change |
|-|-:|-:|-:|
| Reactivation wall p50 | 15,243.4 ms | 15,533.8 ms | **1.91% slower** |
| Reactivation wall p95 | 29,474.7 ms | 28,438.4 ms | 3.52% faster |
| HomeScreen render/visibility p95 p50 | — | — | 2.88% faster |
| Maximum heartbeat delay p50 | — | — | 1.14% lower |
| Candidate transaction boundary p50 | — | 5,637.2 ms | 35.93% of candidate wall |
| Candidate equipment planning p50 | — | 1,560.8 ms | separately attributed |
| Candidate Chunk/equipment reducer p50 | — | 104.3 / 813.2 ms | separately attributed |

The boundary reduction did not translate to end-to-end speed. The shared pure planner is now used by normal gameplay and AFK screening, but the profile-only candidate still constructs a committed Chunk projection for planning and then applies the Chunk again inside the atomic reducer. It moves work before dispatch without removing enough coordinator/React cadence. With speed as the primary objective, the wall-p50 regression is decisive even though p95 and heartbeat tail improved.

Shorter scaling checks agree. Three alternating pairs per workload measured 9-hour wall p50 at 5,509.0 ms baseline versus 5,471.9 ms candidate (0.67% faster, but p95 8.42% slower), and 24-hour wall p50 at 8,820.3 ms versus 8,842.9 ms (0.26% slower). Neither shows a promotable speed benefit.

## Memory screening

Ten alternating fresh-process memory pairs used the 162-hour workload. Binary MiB values below derive from the recorded byte counts.

| Metric p50 | Baseline | Atomic candidate | Change |
|-|-:|-:|-:|
| Peak application working set | 965.8 MiB | 954.8 MiB | 1.14% lower |
| Peak renderer working set | 688.6 MiB | 679.1 MiB | 1.38% lower |
| Peak renderer heap | 129.0 MiB | 123.4 MiB | 4.39% lower |
| Completion application working set | 957.4 MiB | 930.4 MiB | 2.82% lower |
| Forced-GC settled application working set | 933.0 MiB | 901.1 MiB | 3.42% lower |
| Forced-GC settled renderer working set | 664.7 MiB | 637.3 MiB | 4.11% lower |

The candidate modestly improves memory, but not by 10%, and memory-run wall p50 still regressed by 0.21%. The later speed-first policy permits some memory regression; it does not change this decision because there is no wall-time gain to trade for memory.

## Correctness and diagnostic findings

- The reducer parity suite byte-compares the existing two-stage oracle with the atomic action for no-op, upgrade-heavy, FULL equipment, Defeat rollback, Party unlock, pending-setting cutoff, worker retry, and recovery completion cases.
- The candidate preserves the existing captured-setting cutoff: automatic equipment is skipped when Party settings changed after the worker snapshot.
- The coordinator releases the transaction only after the authoritative combined state is React-visible. Persistence sees only that combined candidate state in profile mode; normal durability cadence and recovery format are unchanged.
- Fixed-seed live runs did **not** produce one repeated complete-state hash at 24 and 162 hours. The 162-hour timing matrix produced twenty distinct hashes for each variant, while the 9-hour candidate was stable across its three scaling samples. Component hashes localize the divergence to Party state; global, bag, and shell hashes remained stable. Final versus reloaded segmented hashes also differed in Party components. This exposes scheduling/cutoff-dependent state in the authentic recovery path and independently blocks promotion. The profiler preserves every run hash rather than masking the failure.
- Production React does not invoke development Profiler callbacks. The report therefore uses HomeScreen render-to-effect visibility duration as the live commit proxy. Its observed p95 exceeds the 8 ms target and must not be described as a passing React-commit gate. Long Tasks and heartbeat tails include fresh-process application startup as well as recovery.

## Speed-first next proposal

1. Move the now-pure state-input automatic-equipment planner to a reducer-safe module, then invoke it once inside a single transaction reducer after the Chunk merge. This removes the candidate's duplicate Chunk projection and keeps exact ordered actions and phase attribution.
2. Move the coordinator pump and completed-result bookkeeping to refs plus a scheduled pump, sampling only display progress into React. The current candidate changes the semantic transaction boundary but leaves approximately the same HomeScreen commit count; the next candidate must eliminate real renders.
3. Attribute the worker simulation kernel below the current job-level timing. Worker execution is now the largest remaining compute total. Preserve two workers, twelve-Cycle Chunks, schemas, RNG semantics, and canonical ordering while looking for repeated battle-state construction or ranking work that can be removed.
4. Treat live deterministic divergence as a correctness investigation before any promotion. Capture and compare per-Party canonical job/result sequences and setting-cutoff decisions to distinguish legitimate wall-time inputs from race-dependent ownership or equipment decisions.

For the next speed-first promotion screen, require at least 10% paired 162-hour wall p50 improvement, no more than 3% wall p95 regression, unchanged deterministic output, and no material heartbeat-tail regression. Memory can use a wider regression guardrail because speed is now primary, but it must still be reported from fresh processes.

## Verification

- `npm test`: 254/254 passed, including exact atomic/two-stage reducer parity, refresh/AFK scheduler, Diary retention, inventory reconciliation/order, HP, notification, persistence retry, and segmented-save round-trip coverage.
- `npm run lint`, `npm run build`, `npm run desktop:pack`, and `git diff --check` passed. The unsigned arm64 development application packaged successfully; signing/notarization was skipped because local credentials are absent.
- `npm run performance:bundle` passed: the AFK worker is 431,066 bytes / 101,340 gzip bytes, has no React runtime, the largest production chunk remains below 500,000 bytes, and initial locale preloads remain one.
- `npm run memory:smoke` passed idle, normal-play, x100, AFK-24h, simulation-100, and pane-switching gates with no reported regression.
- The maximum-backlog decision matrix completed two timing warm-ups, twenty alternating measured timing pairs, and ten alternating fresh-process memory pairs. The 9/24-hour scaling matrix completed three alternating pairs per workload.
