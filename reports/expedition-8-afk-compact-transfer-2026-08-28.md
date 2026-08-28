# Expedition 8 compact AFK worker transfer — 2026/08/28

## Decision

Build 62 promotes a compact party-scoped AFK worker transfer contract. Each worker still receives the complete target Party and complete authoritative global state. Only `diaryLogs` and `lastExpeditionLog` are removed from inactive Parties, which the party-scoped worker cannot advance. The renderer retains the complete base Party snapshot already present in authoritative state, so workers no longer echo that duplicate snapshot in their result envelope.

The renderer rehydrates the compact worker result before canonical ordering, pending-setting detection, coordinator commit, automatic equipment, persistence, or tracing. Hydrated results remain byte-identical to the former complete result envelope.

Build 62 also repairs the canonical renderer profile to accept build 61's presentation-only `progress` worker messages. The ordinary regression suite now guards that worker protocol.

## Size attribution

The six-party Expedition 8 fixture contains 8,108,828 UTF-8 JSON bytes. Retained Party history accounts for most of that input: the `parties` array is 7,472,351 bytes, primarily `diaryLogs` and `lastExpeditionLog`; authoritative global state is 629,416 bytes.

| Party worker | Complete input bytes | Compact input bytes | Reduction |
|---:|---:|---:|---:|
| PT1 | 8,108,828 | 2,904,628 | 64.2% |
| PT2 | 8,108,828 | 2,504,234 | 69.1% |
| PT3 | 8,108,828 | 913,788 | 88.7% |
| PT4 | 8,108,828 | 2,079,885 | 74.4% |
| PT5 | 8,108,828 | 2,034,051 | 74.9% |
| PT6 | 8,108,828 | 1,598,327 | 80.3% |

The six complete worker results total 15,173,469 bytes. Omitting the renderer-retained base Party reduces the combined result transfer to 7,701,047 bytes, a 49.2% reduction.

## Paired Electron decision profile

Environment: Electron 37.10.3 / Chromium 138, hidden sandboxed renderer, two-worker production pool, six logical processors, and 8 GiB reported device memory. The focused profile alternates complete and compact candidates within each sample, uses two warm-ups and twenty measured samples, and reports nearest-rank p50 / p95 / maximum milliseconds.

| Metric | Complete contract | Compact production contract |
|---|---:|---:|
| Renderer heartbeat delay | 31.6 / 41.4 / 42.8 | 5.8 / 13.9 / 14.7 |
| Six-party asynchronous wall | 555.7 / 603.3 / 753.7 | 440.9 / 463.2 / 470.5 |
| Renderer `postMessage` sum | 95.8 / 105.8 / 107.2 | 26.4 / 28.4 / 28.5 |
| Longest result delivery | 15.9 / 26.5 / 28.0 | 7.3 / 11.9 / 13.3 |
| Six-party worker computation | 609.1 / 701.2 / 926.6 | 618.8 / 663.3 / 669.0 |

Paired p50 improvement is 20.2% for asynchronous wall time and 76.6% for renderer heartbeat delay. Every measured pair improved: the minimum paired improvements were 14.3% and 50.3%, respectively. Worker computation is materially unchanged, attributing the promoted improvement to the smaller structured-clone envelopes rather than altered simulation.

## Deterministic and contract gates

- Every complete and compact hydrated result is byte-identical in every measured sample.
- Complete and compact six-party workflows retain canonical final-state SHA-256 `11fb8356c53d5087d8f220408a92c3c8b12ef276abf2898e9a7e19e7b88bfebc`.
- The compact input keeps the complete target Party, including its Diary retention history, characters, bags, automation, side quest, Clear-Gates, expedition configuration, and computed-status inputs.
- Renderer-owned base Party hydration preserves pending-setting cutoff semantics and the exact former result property order.
- Source state and inactive Party histories remain immutable in the renderer.

## Verification

- `npm test`: 229/229 passed, including focused unit, runtime-wiring, save-backed differential, byte-attribution, and compact hydration coverage.
- Lint, the production build, bundle gates, and `git diff --check` passed.
- The AFK worker bundle is 1,081,594 bytes / 220,766 gzip, contains no React runtime, and the startup bundle retains one locale preload.
- The paired Electron transfer profile passed two warm-ups and twenty measured samples with byte-identical hydrated results in every pair.
- The canonical production renderer profile retained its canonical round trip, byte-identical worker encoding, and deterministic final hash. Its measured event-loop delay was 20.6 / 22.4 / 22.9 ms p50 / p95 / maximum; six-party asynchronous worker wall time was 544.8 / 584.5 / 593.0 ms.
- The separate startup attribution matrix deliberately retains complete payloads so its variants remain comparable with the historical diagnostic. Its production-concurrency exact-sizing variant retained the deterministic final hash, reported no four-second-class stall, and measured 66.5 / 87.9 / 89.4 ms event-loop delay.

## Next target

Do not remove target-Party Diary history without a separate retained-history dependency audit and delta protocol. The remaining worker computation is unchanged and no coordinator phase is dominant. Further optimization should begin with another end-to-end AFK or interaction profile rather than extending this transfer contract speculatively.
