# Expedition 8 AFK retained-history result delta — 2026/08/28

## Decision

Build 63 promotes AFK worker transfer schema v2. The worker still receives the complete target Party required by Diary retention, but its result no longer returns the complete reconstructed 24-entry target Diary. Unchanged retained entries are represented by bounded indices into the renderer-owned base Party, while new or changed entries remain worker-owned literals. `lastExpeditionLog` references the reconstructed Diary entry when identical and falls back to an explicit value when no Diary entry contains it.

Hydration occurs before canonical ordering, pending-setting detection, commit, automatic equipment, persistence, or tracing. The complete hydrated result retains the exact former property order and is byte-identical to the complete worker result.

Each party-scoped worker now also computes the authoritative Chunk-start status only for its target Party. The retained all-party calculation remains an opt-in attribution counterfactual. This matches the worker operation window, which cannot advance inactive Parties.

## Transfer size

The build-62 compact results total 7,701,047 UTF-8 JSON bytes across all six Parties. Transfer schema v2 reduces the actual six-party worker output to 1,346,606 bytes, an additional 82.5% reduction. The former complete result contract totals 15,173,469 bytes, making the build-63 output 91.1% smaller than that original envelope.

| Party | Build-62 output bytes | Build-63 output bytes | Reduction |
|---:|---:|---:|---:|
| PT1 | 2,192,107 | 340,524 | 84.5% |
| PT2 | 1,855,177 | 219,439 | 88.2% |
| PT3 | 144,626 | 69,272 | 52.1% |
| PT4 | 1,274,471 | 205,519 | 83.9% |
| PT5 | 1,303,072 | 247,660 | 81.0% |
| PT6 | 931,594 | 264,192 | 71.6% |

## Paired Electron transfer profile

Environment: Electron 37.10.3 / Chromium 138, hidden sandboxed renderer, two-worker production pool, six logical processors, and 8 GiB reported device memory. The profile rotates the original complete contract, exact build-62 compact contract, and build-63 production contract within every sample, with two warm-ups and twenty measured samples.

| Metric | Build 62 p50 / p95 / max | Build 63 p50 / p95 / max | p50 change |
|---|---:|---:|---:|
| Renderer heartbeat delay | 8.9 / 18.8 / 23.8 ms | 3.0 / 4.6 / 5.6 ms | -66.3% |
| Six-party asynchronous wall | 498.7 / 543.8 / 558.3 ms | 497.9 / 519.6 / 522.7 ms | -0.2% distribution; -3.4% paired |
| Renderer `postMessage` sum | 32.3 / 34.4 / 34.9 ms | 30.4 / 34.6 / 34.7 ms | -5.9% |
| Worker result-post sum | 21.8 / 24.0 / 24.6 ms | 4.2 / 5.1 / 6.0 ms | -80.7% |
| Longest result delivery | 9.5 / 16.9 / 17.7 ms | 1.1 / 2.4 / 3.7 ms | -88.4% |
| Six-party worker computation | 699.7 / 785.1 / 802.3 ms | 718.3 / 766.3 / 769.4 ms | host/order noise; no promoted CPU claim |

Every measured pair retained byte-identical hydrated results and deterministic final-state SHA-256 `11fb8356c53d5087d8f220408a92c3c8b12ef276abf2898e9a7e19e7b88bfebc`. Paired wall improvement p50 was 3.4%; renderer heartbeat improvement p50 was 68.9% in the paired calculation.

## Chunk-status attribution

The alternating all-party-versus-target-only Node profile used two warm-ups and twenty measured samples. Target-only status computation retained byte-identical serialized worker states in every pair. Its paired six-party CPU-sum p50 improvement was 3.7%; slowest-party p50 changed by 0.4%. This is retained as a small allocation/CPU reduction, not presented as the primary build-63 performance gain.

## Repaired canonical renderer profile

The canonical profile now submits `createAfkPartyChunkWorkerState(...)` to every asynchronous production worker instead of the complete state. It also reports per-party execution plus startup, queue, and wall-above-ideal-CPU-split attribution.

With two warm-ups and twenty measured samples, the repaired profile passed canonical save round-trip, byte-identical persistence-worker encoding, hydrated AFK parity, and the deterministic final hash. Six-party AFK asynchronous wall time was 454.1 / 485.9 / 513.5 ms p50 / p95 / maximum; worker CPU sum was 659.3 / 723.7 / 747.9 ms; coordinator commit sum was 3.0 / 4.3 / 4.5 ms. Save-surrounding renderer event-loop delay was 22.2 / 25.2 / 28.2 ms.

The synchronous deterministic oracle remains after measured work and is profile-only. Its 855.4 ms interval and matching 861 ms Long Task do not execute in production.

## Correctness and boundaries

- Retained-history references are bounded by the existing 24-entry Party Diary limit.
- Identity lookup is used only as a compactness opportunity. Entries that cannot reference the captured base Diary are transferred explicitly.
- `lastExpeditionLog` falls back to an explicit worker-owned value when it cannot reference the base or reconstructed Diary.
- Hydration rejects no valid production case and ignores no worker-owned entry.
- Source state, renderer-owned base history, and inactive Parties remain immutable.
- Canonical simulated-time/Party-ID ordering and transaction cutoff behavior are unchanged.
- Save format, environment isolation, gameplay random consumption, rewards, logs, and final state are unchanged.

## Verification

- `npm test`: 231/231 passed, including focused coordinator, compact-transfer, Chunk-status, and save-backed parity coverage.
- Alternating twenty-sample Chunk-status attribution passed exact serialized-state parity.
- Rotating twenty-sample Electron transfer attribution passed exact hydrated-result and final-state parity.
- Repaired canonical twenty-sample Electron renderer profile passed round-trip, encoding, and deterministic gates.
- Startup attribution retained the deterministic hash, reported no four-second-class stall, and measured a 98.8 ms maximum event-loop delay in the deliberately complete-payload, exact-sizing production-concurrency diagnostic.
- Lint, production build, bundle gates, memory smoke, and whitespace checks passed.
- AFK worker: 1,082,222 bytes / 221,002 gzip bytes, below both gates, with no React runtime and one initial locale preload.
- Memory smoke reported no regression for idle, normal play, x100, 24-hour AFK, repeated simulation, or pane switching.

## Next target

Do not extend the Diary delta into the worker input without a separate dependency and retention audit. The canonical profile still shows approximately 125 ms p50 wall time above the ideal two-worker CPU split, but neither coordinator work nor build-63 result transfer explains it. Any next optimization should attribute worker contention and per-party tail scheduling in the actual multi-Chunk UI recovery path while preserving the complete canonical commit frontier.
