# Expedition 8 AFK submission optimization — 2026/08/26

## Decision

Build 55 caps the production AFK worker pool at two workers. On the six-party Expedition 8 fixture, this retains most of the recovery throughput of three workers while giving the renderer substantially more main-thread headroom.

Automatic dev/beta AFK tracing no longer serializes every complete worker job to calculate an exact transfer size. Exact sizing remains in the opt-in startup profiler.

## Corrected comparison

Environment: Electron 37.10.3 / Chromium 138, six logical processors, 8 GiB reported device memory. One warm-up and five measured samples. Values are p50 / p95 / maximum milliseconds.

| Worker cap | Event-loop delay | Wall time | Largest renderer interval | Result |
|---:|---:|---:|---:|---|
| 1 | 14.8 / 17.0 / 17.0 | 763.5 / 769.2 / 769.2 | 16.2 | Responsive, but approximately 38% slower than cap 3 |
| 2 | 26.8 / 34.9 / 34.9 | 583.0 / 594.9 / 594.9 | 27.8 | Selected balance |
| 3 | 37.9 / 46.6 / 46.6 | 552.3 / 568.1 / 568.1 | 46.9 | Less renderer headroom for approximately 6% wall-time gain |
| 4 stress | 58.0 / 58.6 / 58.6 | 604.6 / 628.6 / 628.6 | 60.8 | Exceeds the 50 ms requirement and is slower than cap 3 |

All four variants produced the byte-exact canonical SHA-256 `11fb8356c53d5087d8f220408a92c3c8b12ef276abf2898e9a7e19e7b88bfebc` in every measured sample.

The former production-equivalent three-worker variant with exact diagnostic sizing recorded 94.8 / 109.6 / 109.6 ms event-loop delay and 109.5 / 120.8 / 120.8 ms spent in sizing across six jobs. Removing this work from the automatic trace is therefore a larger responsiveness improvement than the worker-cap change.

## Profiler corrections

- The controlled worker now uses the same seeded battle and gameplay random sources as the retained correctness oracle.
- Determinism requires exact canonical SHA-256 equality instead of merely checking for non-empty serialized output.
- Production concurrency comes from `getAfkWorkerPoolLimit`; caps 1–4 remain explicit comparison/stress variants.
- Simulation pre-warming performs real disposable simulation, reports its cost separately, and excludes it from the following measured workload.
- The synchronous renderer correctness oracle runs after all measured save and AFK samples so it cannot warm or allocate into those measurements.

## Deferred work

A compact party-scoped AFK input contract is not implemented in build 55. The selected cap remains below the 50 ms main-thread limit in this corrected run, while a payload redesign would alter the worker/coordinator contract and require a broader state-dependency and differential-parity audit. Automatic-equipment attribution remains the next independent performance investigation.

## Final renderer verification

The standard two-warm-up, twenty-sample renderer profile passed byte-identical worker encoding, the canonical compressed-save round trip, and the unchanged deterministic AFK hash. Save-surrounding renderer delay was 23.7 / 26.3 / 26.6 ms, and the two-worker six-party AFK wall time was 605.8 / 634.7 / 753.7 ms.
