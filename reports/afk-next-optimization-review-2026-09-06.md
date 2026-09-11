# AFK next optimization review — 2026/09/06

## Decision

Stop optimization for now. The one startup candidate was tested and rejected because coordinator responsiveness regressed repeatedly. All experimental runtime, build-configuration, and harness changes were removed; the original build 8 runtime is unchanged. This is a report-only outcome, so no build-number increment or runtime changelog entry was made.

There is remaining computational work, especially with large inventories, but the investigation did not establish another low-risk change with a convincing one-second end-to-end benefit. This is not a claim that the game is globally optimal.

## Scope and baseline

Reviewed v0.9.6 build 8, including the newer ability tiers and equipment-management changes. The narrow investigation prioritizes macOS, permits bounded memory increases, and screens at most one candidate with a plausible one-second benefit. Existing fixture saves were copied into isolated temporary Electron profiles; player saves were not accessed.

| Maximum recovery workload | Samples after warm-up | Median wall time | Persisted equality |
|---|---:|---:|---|
| Normal, original fixture | 3 | 5,446.4 ms | All pass |
| Orca, original fixture | 3 | 12,352.6 ms | All pass |
| Orca, synthetic large inventory, diagnostic instrumentation | 3 | 27,931.6 ms | All pass |

The stress fixture expands inventory from 2,308 to 3,662 variants, with normal master-data items at enhancement 0–6 and stock 99, while preserving the original party configuration. Increased item availability changes subsequent equipment and battle outcomes; this is a scaling workload, not a matched gameplay comparison against the original save.

## Where time goes

The original Orca baseline's median aggregate worker simulation time was 8,636.2 ms and coordinator transaction time was 5,247.9 ms. Equipment planning consumed 3,132.9 ms, including 1,924 ms of inventory scanning. Native battle execution totaled 1,153.9 ms, battle input preparation 316.6 ms, and result consumption 946.1 ms.

These measurements overlap across workers and contain nested phases. Adding them does not reconstruct wall time. In particular, replay includes native execution and result handling already included in battle totals.

A separate diagnostic run retained all 15,128 trace events, with no dropped events, and timed retained-narration replay explicitly. It recovered in 11,121.6 ms and replay consumed 1,640.1 ms across workers. All 350 accepted jobs committed exactly once and in arrival FIFO order. Between the first worker submission and the last transaction completion:

| Observed interval category | Time |
|---|---:|
| Worker job outstanding, coordinator transaction active | 4,377.7 ms |
| Worker job outstanding, no coordinator transaction active | 4,442.9 ms |
| No worker job outstanding, coordinator transaction active | 376.0 ms |
| Neither outstanding worker job nor active coordinator transaction | 46.3 ms |

“Outstanding” includes queueing and result delivery; these intervals are not CPU-utilization measurements. Accepted-result-to-commit waits totaled 826.2 ms, with a union of 802.3 ms and median 0.3 ms. There is no measured one-second scheduling bubble to remove in this representative run.

The large-inventory runs retain the same 350-job FIFO/exactly-once checks. Median candidate scanning grows to about 4,499 ms, while replay falls to about 487 ms because stronger equipment changes outcomes. A coordinator maximum of about 67 ms in this synthetic stress case is an existing scaling concern, not evidence that ordinary recovery violates its budget in every run.

## The one screened candidate

Code inspection found a fixed 1,200 ms startup timer in `App.tsx`. It prevents the Home screen and its AFK coordinator from mounting even when the initial panel has finished preloading. The loading-message specification does not prescribe a minimum display duration.

The candidate releases loading when the initial panel is ready. Its final helper preserves the existing 1,200 ms deadline as a fallback for a stalled import, handles rejected and synchronously throwing loaders, and suppresses obsolete callbacks after unmount/StrictMode cleanup. It changes cold launch/reload latency, not the AFK simulation in an already-open application.

The first five alternating Orca pairs used the same build and production-authority worker path:

| Metric | Fixed-delay control | Readiness candidate |
|---|---:|---:|
| Recovery median | 12,888.2 ms | 11,934.5 ms |
| Recovery p95 / maximum of five | 14,005.8 ms | 13,451.8 ms |
| Median first-worker submission from navigation | 1,815.1 ms | 606.7 ms |
| Maximum coordinator transaction | 41.9 ms | 56.7 ms |
| Final/persisted equality | 5/5 | 5/5 |

All five paired recoveries were faster. Median paired saving was 915.7 ms; the difference between distribution medians was 953.7 ms. First-worker submission moved about 1,208 ms earlier. However, two candidate runs exceeded 50 ms for an authority transaction (56.7 and 54.2 ms), and responsiveness required a targeted confirmation rather than immediate promotion. The first timing build did not yet include the stalled-import deadline; the confirmation uses that final helper.

Five executable helper tests passed: actual readiness, asynchronous/synchronous failures, StrictMode remount, unmount cancellation, and stalled-import fallback completing exactly once.

## Measurement limits

All runs were sequential fresh Electron processes on the shared host. OS scheduling and thermal conditions remain uncontrolled. Three/five-sample p95 is the sample maximum, not a robust estimate of a population tail. Complete-trace runs temporarily enlarged the trace cap and added a replay timer, so their wall times are attribution observations rather than matched performance controls. These diagnostic patches are removed after the investigation.

No physical sleep/wake cycle or manual browser interaction was performed. Fixture persistence equality and recorded FIFO checks do not replace those lifecycle tests.

## Targeted confirmation and rejection

The final helper was measured in three further alternating pairs after a warm-up:

| Metric | Fixed-delay control | Readiness candidate |
|---|---:|---:|
| Recovery median | 14,206.8 ms | 14,189.1 ms |
| Recovery p95 / maximum of three | 15,134.5 ms | 14,231.5 ms |
| Maximum coordinator transaction | 46.2 ms | 57.0 ms |
| Median of each run's heartbeat p95 | 53.9 ms | 64.5 ms |
| Final/persisted equality | 3/3 | 3/3 |

Paired recovery savings were 17.7, 903.0, and 2,033.4 ms, illustrating substantial shared-host variation. Starting the first worker earlier remained consistent, but two candidate transactions again exceeded 50 ms (57.0 and 56.4 ms). Across both screens, four of eight candidate runs exceeded that transaction limit; no control run did. The data does not isolate whether startup/JIT/other concurrent work caused those delays, so no particular cause is asserted. It is sufficient to withhold promotion.

The five transient helper tests passed before candidate removal. After restoring the original sources, all 47 focused AFK regression checks passed. A source/configuration diff confirmed that the original runtime and benchmark harness were restored exactly. No optimization was promoted, so an additional release build and comparative memory matrix were not necessary. Existing player saves, worker-count policy, FIFO rules, battle code, and save formats are unchanged.

Numeric measurements, overlap analysis, timing distributions, per-run validation, and fixture parameters are retained in `afk-next-optimization-review-2026-09-06.json`.
