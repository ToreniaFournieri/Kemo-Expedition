# Expedition 8 save/compression baseline — 2026/08/26

## Milestone 2 result (build 54)

The unchanged `encodePersistedState` codec now runs in a dedicated module worker behind a single-flight coordinator. Canonical compaction and `JSON.stringify` remain renderer-owned, and the final `localStorage.setItem` remains in the renderer. The build-53 diagnostic was confirmed: 13 synchronous saves consumed 15,634.0 ms, compression consumed 15,227.6 ms (97.4%), and the 38 recorded event-loop stalls included a still-unclassified initial 4,101.6 ms stall before the first measured save.

The same hidden Electron fixture, two warm-ups, 20 measured samples, and nearest-rank method produced:

| Metric | Build 53 p50 / p95 / max | Build 54 p50 / p95 / max |
|---|---:|---:|
| Canonical snapshot | 1.5 / 1.9 / 2.1 | 1.1 / 1.3 / 1.4 |
| Renderer `JSON.stringify` | 25.7 / 30.1 / 31.5 | 18.4 / 20.2 / 20.5 |
| Renderer worker submission | not measured | 1.2 / 1.3 / 1.4 |
| Worker queue latency | not measured | 2.3 / 2.8 / 2.9 |
| Worker compression | 1,211.4 / 1,647.9 / 2,143.4 (renderer) | 925.6 / 963.2 / 973.0 (worker) |
| Worker result delivery | not measured | 2.3 / 4.3 / 4.4 |
| Chromium storage write | 2.8 / 5.3 / 5.6 | 0.7 / 1.3 / 2.3 |
| End-to-end durability | 1,242.0 / 1,682.1 / 2,180.5 synchronous | 952.3 / 988.3 / 1,000.9 asynchronous |
| Save-surrounding renderer event-loop delay | 1,262.3 / 1,702.1 / 2,211.5 | 21.1 / 23.2 / 23.5 |

No measured renderer persistence task exceeded 50 ms. The async durability latency still includes worker compression and is not renderer blocking time. The payload remained exactly 6,944,587 JSON characters and 409,974 encoded characters; the actual persistence-worker output was byte-identical to the retained synchronous-codec fixture. Canonical round-trip passed, and the deterministic six-party Expedition 8 AFK SHA-256 remained `11fb8356c53d5087d8f220408a92c3c8b12ef276abf2898e9a7e19e7b88bfebc`.

Follow-up scope remains intentionally unchanged: measure and then reduce full-state AFK structured cloning, investigate the initial 4.1-second startup stall, and separately profile automatic equipment. Codec replacement, checkpoint-frequency changes, AFK message redesign, and auto-equipment optimization were not part of Milestone 2.

## Scope

This is the Milestone 1 measurement baseline. It does not change the save format, codec, checkpoint frequency, AFK scheduling, worker/coordinator ordering, or gameplay behavior.

The primary profile runs in a hidden, sandboxed Electron renderer and uses the production persistence functions and production AFK module worker. Save phases run exactly once per sample in this order:

1. `serializeGameState` canonical snapshot/compaction;
2. `JSON.stringify`;
3. the existing synchronous `encodePersistedState` UTF-16 codec;
4. Chromium `localStorage.setItem`;
5. end-to-end completion.

The phase durations are independent. End-to-end latency and timer drift are aggregate responsiveness metrics and must not be added to the phase durations.

## Reproduction

Install dependencies, then run:

```sh
npm run performance:exp8 -- --samples=20 --warmups=2
```

The command prints a versioned JSON report to stdout. `npm run performance:exp8:node -- --samples=20 --warmups=2` is a labeled Node fallback that uses a synchronous temporary-file persistence adapter; it is not the canonical renderer/localStorage baseline.

Ordinary `npm test` runs fixture, round-trip, and deterministic AFK regression coverage without timing ceilings. The multi-sample command is opt-in and currently reports measurements only; no machine-dependent wall-clock threshold is enforced in CI.

## Fixture identity and validation

- File: `sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz`
- SHA-256: `87c837fda20d7159d87a68cfc5877d95722aae5719b10e860775dd3ed221662f`
- Envelope: `Kemo-Expedition`, `v0.9.3`, `dev`, `compressed-v1`
- Saved build: 9
- Parties: six, IDs 1–6, names PT1–PT6
- Selected dungeon: Expedition 8 for all six parties
- Characters: six per party
- Inventory variants: 2,308
- Canonical compressed round trip: passed
- Seeded deterministic six-party AFK final-state SHA-256: `11fb8356c53d5087d8f220408a92c3c8b12ef276abf2898e9a7e19e7b88bfebc`

## Environment and sampling

- Electron 37.10.3 / Chromium 138.0.7204.251
- macOS renderer (`MacIntel` user-agent platform), six logical processors, 8 GiB reported device memory
- Hidden renderer with context isolation and sandboxing; no Node integration
- Monotonic high-resolution renderer `performance.now()` clock
- Chromium `localStorage.setItem`
- Two warm-ups followed by 20 measured samples
- Nearest-rank percentiles

Warm-up 1 was visibly cold: save/compression was 1,989.4/1,957.3 ms, worker CPU sum was 1,981.3 ms, and worker pool wall time was 1,073.5 ms. Warm-up 2 fell to 1,199.6/1,171.0 ms, 1,220.9 ms, and 781.4 ms respectively. Warm-ups are excluded from the distributions below.

## Baseline

All timing values are milliseconds.

| Metric | Samples | p50 | p95 | Maximum |
|---|---:|---:|---:|---:|
| Canonical snapshot/compaction | 20 | 1.5 | 1.9 | 2.1 |
| `JSON.stringify` | 20 | 25.7 | 30.1 | 31.5 |
| Compression/encoding | 20 | 1,211.4 | 1,647.9 | 2,143.4 |
| Chromium persistence write | 20 | 2.8 | 5.3 | 5.6 |
| End-to-end synchronous save | 20 | 1,242.0 | 1,682.1 | 2,180.5 |
| Save-surrounding event-loop delay | 20 | 1,262.3 | 1,702.1 | 2,211.5 |
| AFK worker execution, six-party CPU sum | 20 | 1,117.8 | 2,032.8 | 2,062.1 |
| AFK worker execution, slowest individual worker | 20 | 332.1 | 563.0 | 673.8 |
| AFK worker pool asynchronous wall time | 20 | 715.9 | 1,069.1 | 1,250.3 |
| Coordinator commits, six-party sum | 20 | 4.1 | 5.3 | 5.8 |
| Coordinator commit, longest single commit | 20 | 1.0 | 1.1 | 1.2 |

The event-loop-delay sample is timer drift around the synchronous save. It is the closest repeatable proxy in this harness for the longest save-related renderer task; it is not a browser Long Tasks API entry.

## Payload

| Representation | Characters | UTF-8 bytes | UTF-16 bytes |
|---|---:|---:|---:|
| Uncompressed canonical JSON | 6,944,587 | 7,724,662 | 13,889,174 |
| Encoded persisted payload | 409,974 | 1,204,239 | 819,948 |

The like-for-like UTF-16 compression ratio is 0.0590 (5.90% of the uncompressed UTF-16 footprint). The UTF-8 export-size ratio is approximately 0.1559 (15.59%).

## Interpretation

Compression is the dominant synchronous save phase on this host: p50 compression is 1,211.4 ms of a 1,242.0 ms end-to-end save (approximately 97.5%), while canonical compaction, stringify, and the storage write are small by comparison. The measured event-loop delay tracks save latency closely, supporting the renderer-blocking diagnosis.

The previously observed approximately six-second save/compression result was not reproduced on this host. The maximum measured save was 2,180.5 ms and maximum compression was 2,143.4 ms. The discrepancy is plausibly host/runtime-dependent, but this profile does not identify its cause. The supplied observation remains valid evidence for its original environment; it should not be generalized to this Electron/Chromium host without a matching rerun.

The profile does not indicate a coordinator-timeout problem: pure canonical commits were 4.1 ms p50 for all six parties and 1.2 ms at the longest single-commit maximum. This does not include React dispatch-to-visibility or automatic-equipment follow-up time.

## Measurement limitations

- Worker execution comes from production worker telemetry. Pool wall time includes module-worker startup, structured-clone transfer, language readiness, queueing, execution, and the production-sized pool, but the reported execution CPU sum excludes the other components.
- The slowest-worker value is not pool wall time and should not be added to it.
- Coordinator timing covers `commitAfkPartyChunk`, not React commit visibility or automatic equipment.
- Event-loop delay is timer drift, not a Long Tasks API entry, and may include renderer scheduling overhead.
- The hidden harness avoids application rendering noise. A visible app with active React work, OS contention, browser extensions, thermal throttling, or a different browser may produce different results.
- Twenty samples support a useful local p95 but do not establish a cross-machine service-level objective.

## Milestone 2 recommendations

1. Move the existing codec unchanged into a dedicated persistence module worker first, retaining the current prefix, encoded bytes, legacy decode path, and renderer-owned storage write.
2. Keep canonical state ownership and commit ordering in the renderer. Measure structured-clone/postMessage blocking explicitly; a worker cannot use renderer `localStorage`, so return only the encoded payload for the short renderer write.
3. Add single-flight coordination with one in-flight encode and one replaceable pending snapshot. The pending slot should be latest-state-wins, with success/failure acknowledgements tied to state revisions so an older completion cannot clear newer pending work.
4. Preserve the current retry and load-failure safeguards. Do not acknowledge a save until the renderer storage write succeeds.
5. Carry the phase schema from this profile into Milestone 2 and compare worker queue/startup, transfer, encode, renderer write, end-to-end acknowledgement, and renderer event-loop delay against this baseline.
6. Defer codec replacement, checkpoint-frequency changes, redundant-save reduction, and AFK tuning until the worker/single-flight change has round-trip, legacy-import, failure-retry, and deterministic AFK parity.
