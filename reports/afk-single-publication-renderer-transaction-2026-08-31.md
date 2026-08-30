# AFK single-publication renderer transaction — 2026/08/31

## Outcome

Promote the single-publication AFK transaction to production. Each completed FIFO Chunk now performs its Chunk merge, pending-setting overlay, automatic-equipment planning, and ordered equipment application before React receives one final authoritative state. The Party transaction barrier remains held until that state is React-visible.

The live-profile build retains the former two-stage route as `baseline`; production and the profile `candidate` use the new transaction.

## Implementation

- The reducer first calls the canonical `commitAfkPartyChunk`, including the pending Party-setting overlay.
- When no captured setting change exists, the reducer invokes the pure planner against that committed state and applies the returned ordered actions before returning.
- A captured setting change still skips automatic equipment for that transaction.
- The coordinator publishes no intermediate Chunk-only state and no longer projects the Chunk once for planning and a second time for commit.
- Planner, Chunk reducer, equipment reducer, and combined render-to-effect visibility remain separately observable. The combined boundary timer already contains planning, so the report no longer adds planner time twice.

## Fresh-process 162-hour A/B

One warm-up and three measured samples per variant ran in alternating order. Every sample used a new hidden Electron process and isolated user data, replaying 2,100 Cycles in 70 FIFO worker jobs.

| Metric | Legacy baseline p50 | Single publication p50 | Change |
|-|-:|-:|-:|
| Complete renderer transaction boundary | 4,293.1 ms | 2,765.8 ms | **35.6% lower** |
| Boundary share of recovery wall | 43.76% | 28.18% | 15.58 points lower |
| React commit count | 240 | 198 | **17.5% lower** |
| FIFO commit wait | 932.0 ms | 545.4 ms | **41.5% lower** |
| Reactivation wall p50 | 9,809.9 ms | 9,810.2 ms | neutral (+0.003%) |
| Reactivation wall p95 | 10,322.1 ms | 9,854.3 ms | 4.5% lower |
| React visibility p95 p50 | 24.0 ms | 24.5 ms | 2.1% higher |
| Maximum heartbeat delay p50 | 403.4 ms | 386.4 ms | 4.2% lower |
| Summed worker execution | 13,108.0 ms | 13,153.4 ms | 0.35% higher |

The earlier five-sample screen on a slower machine state showed the same direction: about 32% lower representative transaction completion, 40 fewer React commits, 4.2% lower wall p50, and 6.0% lower wall p95. The corrected three-sample matrix above is the authoritative boundary result because it does not double-count planning.

## Correctness

- Direct reducer coverage proves the planner receives exactly the canonical committed Chunk state and the combined result is byte-identical to the former Chunk-then-equipment oracle.
- Existing named parity cases continue to cover no-op, upgrade-heavy, full equipment, Defeat rollback, Party unlock, pending-setting cutoff, worker retry, and recovery completion.
- Every measured live run produced a final renderer hash identical to its reloaded persisted hash.
- Whole-recovery hashes vary between processes because worker-completion arrival FIFO is intentionally timing-dependent under Specification 5.1; this is observational and is not a single-publication regression.

## Remaining bottleneck

The complete renderer boundary is no longer the majority cost it was. Summed worker execution is now approximately 13.15 seconds across two overlapping workers, while end-to-end wall p50 is approximately 9.81 seconds. The next useful target is therefore worker-side simulation cost and critical-path load balance, not further automatic-equipment micro-optimization. Renderer work remains material at 28.18% of wall and its per-commit p95 remains about 24.5 ms, but removing the second publication did not reduce wall p50 because worker completion became the limiting cadence.

## Verification

- Full test suite passed after the transaction implementation.
- Focused scheduler and automatic-equipment transaction suites passed after the final attribution correction.
- Production TypeScript and Vite build passed.
- `git diff --check` passed.
