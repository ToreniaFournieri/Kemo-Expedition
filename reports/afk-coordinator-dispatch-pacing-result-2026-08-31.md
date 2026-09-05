# AFK Coordinator Dispatch Pacing Result — 2026/08/31

## Outcome

The revised post-acknowledgement dispatch-pacing plan is implemented as the profile-only `coordinator-paced` variant. It is not enabled in production because pacing did not improve end-to-end AFK recovery time.

The candidate retains the Build 17 coordinator-authority contract. After synchronously installing and acknowledging a complete transaction version, it yields replacement worker dispatch by exactly one MessageChannel scheduler turn when another AFK worker remains active. It does not delay acknowledgement, hold the Party barrier, alter FIFO order, combine transactions, or make React authoritative.

## Added attribution

- Total bounded post-acknowledgement scheduler-yield time.
- Authority acknowledgement to the first following worker post.
- Worker-slot release to reuse idle time.
- Existing worker queue, execution, battle, authority transaction, React publication, heartbeat, Long Task, wall, persistence, and memory fields remain available.

## Screens

A nominal 4 ms timer was rejected first because Chromium scheduled it at roughly 15 ms under load, accumulating about 1.04 seconds across the recovery. It improved authority wall p50 only 1.5% and worsened wall p95.

The final three-pair 162-hour screen used MessageChannel to remove timer clamping:

| Metric (p50) | Unpaced authority | One-turn paced authority | Change |
|-|-:|-:|-:|
| Wall time | 5,907.7 ms | 5,979.1 ms | +1.2% |
| Heartbeat p95 | 29.2 ms | 26.5 ms | -9.2% |
| Worker execution sum | 5,226.3 ms | 5,154.8 ms | -1.4% |
| Authority transaction total | 1,132.3 ms | 1,131.4 ms | -0.1% |
| Authority ack to worker post | 61.1 ms | 105.2 ms | +72.2% |
| Worker-slot idle before dispatch | 1,199.2 ms | 1,469.0 ms | +22.5% |
| Added scheduler-yield time | 0 ms | 296.2 ms | — |

FIFO wait remained zero, the maximum paced authority transaction was 27.8 ms, and final in-memory state was semantically equal to persisted/reloaded state in every run.

## Decision

Reject post-acknowledgement dispatch pacing for production. The added idle interval costs more wall time than it recovers from reduced contention. Build 16 remains the production AFK path; `coordinator-authority` and `coordinator-paced` remain isolated profiler variants for future investigation.

The measurements shift the next investigation away from artificial dispatch delay. A future experiment should use recorded/replayed FIFO inputs or matched per-Chunk work identities to reduce worker-arrival variance, then attribute why synchronous authority changes wall completion despite reducing measured renderer transaction work. No further scheduling mutation should be promoted without that matched-work comparison.
