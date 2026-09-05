# AFK 30-Cycle and terminal partial-Chunk runtime — 2026/08/30

## Outcome

Build 9 promotes one unified 30-Cycle logical AFK Chunk. Party-status authority, queued-setting cutoff, canonical coordinator commit, condition and automatic Gods Battle behavior, and automatic equipment now share that boundary.

When less than 30 Cycles remain, every complete Cycle is submitted as one terminal partial Chunk. A 1–29 Cycle partial Chunk uses the same coordinator and automatic-equipment transaction as a full Chunk. Less than one complete Cycle does not create a Chunk or trigger automatic equipment; its exact per-Party elapsed remainder is reconstructed online.

## Implementation

- `AFK_CHUNK_CYCLE_COUNT` is 30.
- The scheduler derives each worker job as `min(30, floor(remainingMs / cycleDurationMs))`.
- Full and partial results share worker hydration, deterministic simulated completion ordering, pending-setting capture, Chunk commit, automatic-equipment planning/application, persistence, progress, and trace paths.
- Automatic Gods Battle is evaluated only for the first Cycle at the Chunk boundary, using the captured Chunk-start condition. Condition-driven destination decisions inside the Chunk retain that same captured condition while outcome adjustments accumulate for boundary publication.
- Final per-Party sub-Cycle remainders are retained before the worker pool is released and are consumed by AFK-to-online reconstruction.
- Progress and Automation specifications now use the same 30-Cycle logical Chunk definition.

## Live timing

The production two-stage transaction path was measured with one warm-up and three fresh hidden Electron samples per workload on the six-Party Expedition 8 fixture. The previous values are the same-environment historical baselines recorded by Build 8; this is a directional historical comparison rather than a paired promotion matrix.

| Raw absence | Previous p50 | Build 9 p50 | Change |
|-|-:|-:|-:|
| 9 hours | 5,509.0 ms | 3,879.4 ms | 29.6% faster |
| 24 hours | 8,820.3 ms | 5,552.2 ms | 37.1% faster |
| 162 hours | 15,243.4 ms | 10,187.3 ms | 33.2% faster |

At 162 hours, the measured renderer Chunk/equipment boundary fell from 11,391.9 ms p50 to 3,476.3 ms p50, a 69.5% reduction. Build 9 used 217 React commits p50 and recorded 19.5 ms React visibility p95 p50. The profile still reproduces the pre-existing scheduling-dependent complete-state and persisted-state hash variation previously documented by Build 8; this change does not claim to resolve it.

## Focused responsiveness and determinism

The one-warm-up, one-sample Expedition 8 startup diagnostic produced the newly pinned deterministic hashes across full, compact, prewarmed, and concurrency variants. The production compact two-worker path measured:

- 631.4 ms wall time for six 30-Cycle Party jobs;
- 3.4 ms maximum measured event-loop delay;
- no four-second-class stall;
- 60,191,319 bytes peak renderer heap in the focused process.

The full and compact transfer paths produced byte-identical hydrated results and final state hash `f6ef7db044508d6e86d359c438c9e6d5f2c3cd318c5c8643da9b0c06242bb795` for the pinned six-Party workload. The pinned one-Party hash is `b69c4cd44b86e998f684d88f29efa7a7bca22610781a95682e0ab0f5728e339c`.

## Verification

- Focused AFK coordinator and scheduler tests passed.
- AFK transfer attribution passed exact compact/full parity and updated reduction gates.
- TypeScript production build and ESLint passed.
- Bundle gate passed: AFK worker 431,189 bytes / 101,384 gzip bytes, no React runtime, largest JavaScript chunk below 500,000 bytes, and one initial locale preload.
- Memory smoke passed idle, normal-play, x100, AFK-24h, simulation-100, and pane-switching with no reported regression.
