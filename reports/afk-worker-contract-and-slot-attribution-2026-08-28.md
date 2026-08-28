# AFK worker contract hardening and slot attribution — 2026/08/28

## Decision

Build 64 hardens AFK transfer schema v2 and improves production worker-pool attribution without changing gameplay, save data, canonical commit order, or the two-worker runtime policy.

Hydration now validates the transfer schema, Party identity, Party index, Diary retention bound, every renderer-owned Diary index, and the latest-expedition reference before reconstructing a complete Chunk result. Invalid results fail the complete Chunk instead of silently dropping retained Diary entries or substituting `null`. The renderer routes hydration failures through the same worker termination, ownership release, active-job cleanup, trace, and rescheduling path used by worker execution failures.

The wire type now represents the transferred target Party accurately: `diaryLogs` is empty and `lastExpeditionLog` is `null` until strict hydration restores them.

## Runtime attribution

Dev/beta AFK trace metadata now includes a stable worker-slot ID, slot dispatch gap, hydration duration, and renderer-observed job wall time. Cross-realm worker creation and queue timestamps use `performance.timeOrigin + performance.now()` in both renderer and worker, avoiding invalid comparisons between realm-local monotonic clocks.

The canonical renderer profile now separates:

- ideal two-worker CPU split;
- longest actual worker-slot execution sum;
- fixed non-preemptive slot imbalance above the ideal split; and
- non-compute critical-path wall time above the longest slot execution.

Its former wall-above-ideal value remains for continuity but is no longer treated as a directly recoverable attribution bucket.

## Twenty-sample corrected canonical profile

Environment: Electron 37.10.3 / Chromium 138, six logical processors, 8 GiB reported device memory, production compact worker input and output, two warm-ups, and twenty measured samples.

| Metric | p50 | p95 | maximum |
|---|---:|---:|---:|
| Six-party asynchronous wall | 483.6 ms | 505.9 ms | 518.2 ms |
| Six-party worker CPU sum | 708.4 ms | 734.0 ms | 743.9 ms |
| Wall above ideal two-worker CPU split | 129.2 ms | 138.9 ms | 146.3 ms |
| Longest actual slot execution sum | 366.7 ms | 388.2 ms | 397.9 ms |
| Non-preemptive slot imbalance above ideal split | 15.6 ms | 21.2 ms | 26.0 ms |
| Non-compute wall above longest slot execution | 116.9 ms | 124.9 ms | 125.6 ms |
| Coordinator commit sum | 3.5 ms | 4.2 ms | 4.4 ms |
| Save-surrounding renderer delay | 25.4 ms | 28.1 ms | 28.9 ms |

The independent percentile rows are not algebraically additive. The important result is that only approximately 15.6 ms p50 is explained by the fixed two-slot job imbalance; the former approximately 129 ms remainder is not a scheduling opportunity of that size.

A final short post-correction check confirmed nonzero coherent cross-realm telemetry. Worker-startup six-party sum was 113.4 / 119.7 ms p50 / p95, and cumulative per-job dispatch-to-receipt queue latency was 172.7 / 182.6 ms. The queue sum is a cumulative job metric and is not additive to wall time.

Every canonical sample preserved the deterministic final-state SHA-256 `11fb8356c53d5087d8f220408a92c3c8b12ef276abf2898e9a7e19e7b88bfebc`, the canonical save round trip, and byte-identical persistence-worker encoding.

## Three-worker screening

The startup diagnostic now includes deterministic production-compact two-worker and three-worker candidates. One warm-up and five measured samples produced:

| Metric | Two workers | Three workers | Decision |
|---|---:|---:|---|
| Six-party wall p50 | 497.5 ms | 488.7 ms | 1.8% improvement; below promotion gate |
| Six-party wall p95 | 505.8 ms | 494.3 ms | 2.3% improvement |
| Heartbeat delay p95 / max | 9.1 ms | 12.5 ms | Regressed |
| Peak renderer heap maximum | 59.2 MB | 84.5 MB | Increased |

Both candidates retained the pinned deterministic hash. Three workers were not promoted because the wall gain was below the 8–10% threshold while responsiveness tail and memory worsened. The runtime therefore retains one worker on up to three logical processors and two workers otherwise.

## Verification

- `npm test`: 233/233 passed.
- TypeScript production build and ESLint passed.
- Production bundle and locale gates passed.
- AFK worker: 1,082,249 bytes / 221,014 gzip bytes, below both gates, without React runtime and with one initial locale preload.
- Memory smoke passed idle, normal play, x100, 24-hour AFK, repeated simulation, and pane-switching workloads without a regression.
- Strict schema, base-reference, Diary-reference, explicit-worker latest-log, Party identity, and retention-bound tests passed.
- `git diff --check` passed.

## Next boundary

Do not change scheduling order or extend the Diary delta into worker input from this evidence. A future throughput proposal should measure warm persistent-worker multi-Chunk recovery separately from the cold six-party wave and must demonstrate at least an 8–10% wall improvement with unchanged canonical state, renderer responsiveness, and memory behavior.
