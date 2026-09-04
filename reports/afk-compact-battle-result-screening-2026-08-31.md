# AFK Compact Battle Result Screening — 2026/08/31

## Current decision — 2026/09/04

Promote compact result-only battle execution to the production AFK runtime in v0.9.5 Build 58. The original Build 15 rejection below was re-evaluated after the competing BoKemo instance that contaminated the first current-code spot-check was stopped. A clean-machine three-sample screen showed a 10.3% wall-p50 improvement, and the promotion-grade confirmation plus memory gate passed.

The final confirmation used one warm-up and five alternating measured pairs in fresh Electron processes. Compact output reduced wall p50 from 5,909.0 ms to 5,317.7 ms (-10.0%), wall p95 from 6,115.4 ms to 5,460.9 ms (-10.7%), worker-simulation p50 from 5,808.5 ms to 4,519.7 ms (-22.2%), battle p50 from 3,090.5 ms to 1,917.8 ms (-37.9%), and battle output from 123,909,568 to 18,448,512 bytes (-85.1%). Heartbeat p95 moved from 57.5 to 59.2 ms, React-commit p95 from 23.2 to 23.4 ms, and Long Task maximum p95 from 355 to 358 ms; these bounded changes remained within the responsiveness guardrail. Cumulative FIFO wait increased from 106.7 to 184.0 ms p50, but correct FIFO ordering, Party barriers, end-to-end speed, and persisted semantic equality were preserved.

The three-pair fresh-process memory gate reduced peak application working set by 7.8%, peak renderer working set by 11.4%, peak renderer heap by 5.3%, settled application working set by 10.0%, and settled renderer working set by 12.9%. Every timing and memory run produced a final in-memory state semantically identical to its reloaded persisted state.

Production now enables the compact path by default. The live-profile `renderer-memo` variant retains the former complete result-only battle output as the paired baseline, while `candidate` represents the promoted compact path.

## Historical Build 15 decision — 2026/08/31

Do not promote the compact battle candidate to production. Keep the current Build 14 AFK battle path as the production path and retain this candidate only inside the live A/B profiler.

The candidate materially reduces worker and whole-recovery time, but it makes completed worker jobs arrive at the renderer faster than the coordinator can publish them. Its five-pair FIFO-wait regression exceeds the accepted 10% promotion gate. Two bounded backpressure experiments did not correct that regression without losing the wall-time improvement or creating another latency regression.

## Nested attribution

The initial authentic 162-hour profile processed 36,656 battles across two persistent workers:

| Phase | Time | Share of worker execution |
|-|-:|-:|
| Worker execution | 6,930.6 ms | 100.0% |
| Battle total | 3,777.5 ms | 54.5% |
| Battle preparation | 654.3 ms | 9.4% |
| Arena input writing | 1,304.7 ms | 18.8% |
| Native execution | 1,105.8 ms | 16.0% |
| Borrowed-output validation | 108.9 ms | 1.6% |
| Output consumption | 490.6 ms | 7.1% |

The battles wrote 106.3 MB of protocol input and exposed 123.1 MB of native output. Battle work was therefore large enough to pass the contribution gate. Arena writing and result materialization were better targets than native combat rules.

## Candidate

The profile-only candidate adds two compatible optimizations:

- A protocol flag asks the native kernel to preserve complete internal semantic generation, capacity checks, outcome, HP, hit count, RNG state, and threat bags while omitting serialized semantic-event records from result-only output. The internal generated-event count remains available in the output header.
- A weakly keyed worker-local prepared-input cache encodes each immutable Party/status/enemy/terrain/bag-shape combination once. Subsequent battles patch only Party HP, seed, RNG version, and threat-bag IDs/tickets before one bounded arena copy.

Full narration, online play, Gods Battle, the Experimental API, persisted data, and the production AFK path are unchanged.

## Five-pair fresh-process screen

One warm-up and five measured pairs ran in alternating order. Every run used a fresh Electron process, two workers, the authentic six-Party 162-hour recovery, and the current optimized Build 14 worker as its baseline.

| Metric | Baseline p50 | Candidate p50 | Change |
|-|-:|-:|-:|
| Recovery wall | 8,048.3 ms | 6,812.2 ms | **15.4% lower** |
| Worker execution sum | 7,611.3 ms | 5,702.3 ms | **25.1% lower** |
| Battle total | 4,067.0 ms | 2,514.9 ms | **38.2% lower** |
| Battle preparation | 723.7 ms | 237.3 ms | **67.2% lower** |
| Arena input writing | 1,391.1 ms | 263.5 ms | **81.1% lower** |
| Native execution | 1,210.2 ms | 1,105.9 ms | 8.6% lower |
| Battle output bytes | 123,455,744 | 18,119,296 | **85.3% lower** |
| Heartbeat maximum | 432.9 ms | 428.9 ms | 0.9% lower |
| Heartbeat p95 | 95.6 ms | 102.6 ms | 7.3% higher |
| React commits | 89 | 79 | 11.2% lower |
| React commit p95 | 45.1 ms | 43.4 ms | 3.8% lower |
| Long Task maximum | 396 ms | 391 ms | 1.3% lower |
| Renderer boundary | 4,304.6 ms | 4,069.3 ms | 5.5% lower |
| FIFO wait | 486.3 ms | 873.8 ms | **79.7% higher** |

Wall p95 improved from 8,630.6 ms to 7,326.5 ms. FIFO-wait p95 worsened from 880.9 ms to 1,192.6 ms. Every run produced a final in-memory state semantically identical to its reloaded persisted state; whole-run hashes may differ because Specification 5.1 intentionally defines worker-arrival FIFO ordering.

## Backpressure screens

Two deliberately small coordinator policies were tested and removed:

1. Reducing the active pool to one worker while any transaction or completed queue entry existed eliminated FIFO wait, but candidate wall time regressed 2.8% and maximum heartbeat delay regressed 11.9%.
2. Pausing dispatch only while a completed FIFO result waited initially looked promising, but the five-pair screen improved wall p50 by only 1.7%, regressed wall p95 by 8.0%, and still regressed FIFO p50 by 36.8%.

Neither policy met the accepted promotion gates.

## Retained implementation and next boundary

Build 15 retains the nested attribution, compact protocol seam, semantic/capacity regression tests, and prepared-input candidate for reproducible profiling. A source guard limits candidate activation to `__AFK_LIVE_PROFILE_ENABLED__` with the candidate A/B variant.

The result moves the next tuning boundary from worker battle computation to renderer coordination. Before reconsidering faster worker completion, the next plan should attribute and reduce the FIFO-to-authoritative-publication path—especially transaction scheduling, renderer boundary serialization, and main-thread contention—without changing arrival FIFO, the Party barrier, or authoritative state semantics.

## Verification

- `npm test`: 262 passed, 0 failed.
- `npm run lint`: passed.
- `npm run battle:protocol:check`: generated TypeScript/C++ protocol definitions are current.
- `npm run build`: production TypeScript and Vite build passed.
- `npm run performance:bundle`: worker, startup-locale, shared-locale, React-exclusion, and 500 kB chunk gates passed.
- `git diff --check`: passed.
