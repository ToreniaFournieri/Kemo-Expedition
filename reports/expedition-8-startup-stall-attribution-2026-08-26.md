# Expedition 8 startup stall attribution — 2026/08/26

## Conclusion

The 4.1-second stall was attributed to the renderer profile's synchronous deterministic-correctness oracle, but a production implementation was deferred because the blocking sequence is test/profile code and is not executed by the BoKemo runtime.

After two AFK warm-ups and before the first measured save, `expedition8RendererBaseline.profile.ts` synchronously runs all six Expedition 8 party Chunks twice, commits both result sets, canonicalizes both resulting states, and calls `JSON.stringify` twice. The sequence did not previously have a timing span. The new monotonic trace placed the complete gap inside `deterministic_afk_validation_total`:

- named interval: 567.7 ms;
- zero-delay timer drift around the interval: 568.3 ms;
- unexplained remainder: 0.6 ms;
- first six-party workflow: 310.9 ms;
- first serialization: 17.8 ms;
- second six-party workflow: 220.9 ms;
- second serialization: 18.1 ms;
- largest indivisible party simulation on this run: 106.6 ms.

The required final profile (two warm-ups, 20 measured samples) independently closed the same interval at 689.1 ms named time versus 691.4 ms timer drift. Chromium's Long Tasks API recorded a 695 ms `self` task at the matching timestamp. This browser evidence confirms that the sequence is one renderer long task rather than worker deserialization or an asynchronous scheduling gap.

The historical 4,101.6 ms observation occurred at this exact program location: after warm-up AFK worker activity and before the first measured save. The code at that location is unchanged from the build-53 profile. Its duration is host/cold-start dependent, but its renderer task identity is no longer ambiguous.

No React tree is mounted by this hidden profile, so React rendering, effects, and reconciliation cannot cause this gap. Persistence snapshot creation, JSON serialization, worker compression, and storage writes are separately timed; the deterministic oracle precedes the first measured save. The diagnostic worker experiments also rule out worker construction, module readiness, worker deserialization, and any individual structured-clone submission as a four-second event on this host.

## Controlled comparison

Environment: Electron 37.10.3 / Chromium 138, hidden sandboxed renderer, six logical processors, 8 GiB reported device memory. Controlled variants used one warm-up followed by five measured samples and nearest-rank percentiles. Event-loop values are p50 / p95 / maximum milliseconds.

| Variant | Event-loop delay | Largest named renderer interval | Submission / worker / coordinator | Peak heap | 4-second stall | Deterministic |
|---|---:|---|---|---:|---|---|
| A. Existing diagnostic behavior: six full jobs, current concurrency, exact sizing | 125.1 / 133.9 / 133.9 | initial sizing + four-job submission burst; 151.3 ms representative cold run | 84.7 ms six-job submission p50; 938.7 ms worker CPU sum; 2.4 ms commit p50 | 94.6 MB | No | Pass |
| B. Create four workers, submit nothing | 1.3 / 1.8 / 1.8 | worker constructor calls, <=0.4 ms total; readiness is asynchronous | 28.2 ms p50 first-ready latency | 76.4 MB | No | N/A |
| C. One full job | 30.0 / 30.5 / 30.5 | sizing + submission burst, 37.0 ms representative | 13.1 ms submission; 140.1 ms worker compute; 0.5 ms commit p50 | 85.4 MB | No | Pass |
| D. Six full jobs sequentially | 18.5 / 19.9 / 19.9 | individual `postMessage`, about 16 ms representative maximum | 87.6 ms submission total; 422.1 ms worker CPU sum; 2.6 ms commit p50 | 73.0 MB | No | Pass |
| E. Six full jobs, current concurrency (4), no exact sizing | 52.1 / 57.3 / 57.3 | initial four-job submission burst, 66.1 ms representative | 96.4 ms submission total; 1,050.8 ms worker CPU sum; 2.8 ms commit p50 | 74.8 MB | No | Pass |
| F. Small payload, same scheduling, no work | 1.6 / 1.7 / 1.7 | submission, <=0.1 ms | 0.1 ms six-job submission total; no compute/commit | 45.4 MB | No | N/A |
| G. Full payload, no simulation work | 71.0 / 73.9 / 73.9 | initial four-job submission burst, 66.2 ms representative | 91.9 ms submission total; no compute/commit | 46.4 MB | No | N/A |
| H. Pre-warmed workers, full simulation | 59.7 / 61.8 / 61.8 | initial four-job submission burst, 70.7 ms representative | 99.4 ms submission total; 1,086.9 ms worker CPU sum; 3.2 ms commit p50 | 75.7 MB | No | Pass |
| I1. Concurrency cap 1 | 18.5 / 21.0 / 21.0 | individual `postMessage`, 17.3 ms representative maximum | 92.3 ms submission total; 442.0 ms worker CPU sum; 2.7 ms commit p50 | 72.0 MB | No | Pass |
| I2. Concurrency cap 2 | 40.1 / 45.7 / 45.7 | initial two-job submission burst, 37.0 ms representative | 98.5 ms submission total; 621.5 ms worker CPU sum; 3.2 ms commit p50 | 72.8 MB | No | Pass |
| J. Persistence worker disabled control | Same controlled matrix (no persistence worker) | No four-second interval | Compare with the normal profile below | covered above | No | Pass where applicable |

The exact full-job diagnostic representation is 7,304,469 JSON characters / 14,608,938 UTF-16 bytes. Individual full-state `postMessage` calls were approximately 12–19 ms; worker handler entry followed 0–7.1 ms after the renderer call returned. Full payload/no-work versus small payload/no-work confirms a separate structured-clone submission cost, and four back-to-back submissions can exceed the 50 ms renderer-task budget. It does not explain the historical 4.1-second gap. A full-state message redesign remains a separate measured follow-up and was intentionally not started here.

The normal build-54 profile keeps its persistence worker alive after warm-up. With that worker present, the final profile's newly named deterministic validation interval accounted for 689.1 of 691.4 ms, and Chromium recorded the matching 695 ms long task. Disabling persistence in the controlled matrix did not reveal a four-second worker-startup or contention event. Across the final 20 save samples, renderer event-loop delay was 22.9 / 26.3 / 32.6 ms p50 / p95 / maximum; persistence compression remained off-thread at 1,033.6 / 1,083.9 / 1,099.2 ms.

## Hypotheses resolved

- Main-thread structured serialization during AFK `postMessage`: measurable at about 12–19 ms per full job and about 52–74 ms for a concurrent burst without diagnostic sizing; not the 4.1-second interval.
- Worker-side deserialization: handler-entry proxy remained below 7.1 ms; ruled out for the historical stall.
- Repeated complete-state cloning: confirmed as a smaller independent cost; not the historical stall.
- Worker construction/module initialization: constructor calls stayed below 0.4 ms total, first-ready latency was about 28–42 ms asynchronously, and create-only heartbeat drift was at most 1.8 ms; ruled out.
- Allocation/GC from diagnostic sizing: exact sizing added about 118 ms p50 for six jobs and increased peak heap, but no four-second event occurred. It amplifies the submission burst and remains profiling-only.
- React: ruled out because the reproducing harness mounts no React UI.
- Uncovered AFK coordinator work: confirmed. The synchronous deterministic oracle was renderer AFK work outside all prior spans.
- Persistence snapshot/JSON work outside the save window: separately named and far smaller; ruled out for this location.
- JIT/cold start: affects the oracle's duration but is not a different task identity.
- AFK/persistence worker contention: not required to reproduce the named interval and not its cause.

## Decision and scope

No production optimization was made. Changing worker payloads, concurrency, persistence, React, or the save codec would not fix the attributed stall because it belongs to the profiling correctness oracle. The oracle is now explicitly traced so future profiles no longer report it as an unclassified runtime stall. The controlled harness and exact sizing are profile-only and retain no game-state objects after the Electron process exits.

The final 20-sample profile also passed byte-identical worker encoding, canonical compressed-save round trip, and deterministic AFK validation with SHA-256 `11fb8356c53d5087d8f220408a92c3c8b12ef276abf2898e9a7e19e7b88bfebc`.

Build remains 54. `build_number.txt` and `Specification_11.1_CHANGELOG.md` are unchanged because no runtime behavior changed. Codec replacement, save-frequency tuning, and automatic-equipment optimization remain out of scope.
