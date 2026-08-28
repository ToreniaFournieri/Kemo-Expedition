# Stateful AFK worker continuation screening — 2026/08/28

## Decision

Do not promote AFK transfer schema v3 to the production runtime. Retain the existing schema-v2 worker request/result path, two-worker limit, twelve-Cycle Chunk size, and canonical renderer commit order.

The schema-v3 counterfactual is retained in the performance harness and focused tests. It uses a cold compact snapshot for each Party's first Chunk and a token/revision-validated continuation for later Chunks. Continuations resend authoritative mutable state while referencing the worker-retained target-Party Diary history. Invalid state identity, revision, Party identity, or Diary references reject before simulation; a production implementation would have fallen back through worker termination and cold resubmission.

## Standard warm-backlog profile

Environment: Electron 37.10.3 / Chromium 138 on macOS arm64. The profile used two persistent worker slots, six Expedition 8 Parties, three sequential twelve-Cycle waves per Party, two warm-ups, twenty measured alternating samples, explicit garbage collection and settling between candidates, renderer heartbeat sampling, and Electron-wide `app.getAppMetrics()` working-set attribution.

Every full, build-62, production-v2, and continuation-v3 sample preserved byte-identical hydrated full/production/v3 results and the pinned final-state SHA-256 `61e67b7f22e49753a52926f76caca56f31444bd5682731364d66a3d57a8f4423`.

| Metric | Production v2 | Continuation v3 | Decision |
|-|-:|-:|-|
| Input bytes per three-wave recovery | 36,285,030 | 21,424,344 | v3 reduced 41.0% |
| Recovery wall p50 | 1,429.4 ms | 1,333.6 ms | v3 improved 6.7% by independent medians |
| Paired wall improvement p50 / p95 | — | 5.49% / 12.21% | Below 8–10% promotion gate |
| Heartbeat delay p50 | 48.6 ms | 42.9 ms | Improved 11.7% |
| Paired heartbeat improvement p50 | — | 11.69% | Improved |
| Peak application working set p50 / p95 | 934.6 / 1,020.4 MB | 893.4 / 1,020.6 MB | Effectively unchanged tail |
| Peak renderer working set p50 / p95 | 726.2 / 807.4 MB | 700.8 / 830.5 MB | Mixed |
| Settled application working set p50 / p95 | 807.9 / 897.9 MB | 817.9 / 952.6 MB | No settled-memory improvement |
| Cold / continuation jobs | 18 / 0 | 6 / 12 | Expected protocol use |

The paired wall distribution ranged from an 11.15% regression to a 12.63% improvement. The candidate therefore does not provide a stable 8–10% median recovery improvement, and its additional state-token, revision, worker-cache, affinity, and fallback complexity is not justified.

## Retained implementation boundary

- Production `HomeScreen` and `afkChunkWorker` continue to exchange schema-v2 messages only.
- Schema-v3 construction, validation, history reconciliation, worker counterfactual execution, and acknowledgement tests remain tree-shaken profiling/test support.
- The renderer profiler now exercises genuine warm multi-Chunk recovery, records input bytes and cold/continuation counts, bounds its own parity data retention, and samples renderer plus whole-application working sets through a context-isolated read-only bridge.
- No gameplay, save data, RNG, Diary retention, progress presentation, environment isolation, worker limit, or bundle contract changes are accepted.

## Next boundary

Do not revisit stateful worker continuation without a workload containing substantially more than three Chunks per Party or evidence that retained Diary histories are materially larger in real saves. The next tuning investigation should target the remaining worker compute variance or renderer commit/save boundaries; any candidate must retain the same 8–10% balanced promotion gate.
