# AFK equipment speed screen — 2026/09/05

## Decision

Neither equipment candidate qualified for production promotion. Both were removed. Build 5 retains measurement improvements only: profile-only equipment phase totals, the correct production-authority benchmark default, normal/Orca environment selection, document-load/startup-to-result measurements, and clearer process failure diagnostics. Production equipment decisions, notifications, transaction publication, worker limits, gameplay, and save formats are unchanged.

The numeric evidence is in `afk-equipment-speed-screen-2026-09-05.json`. The requested gate was at least 8% lower recovery median, at most 3% p95 regression, and game-controlled transactions below 50 ms. Memory may increase if bounded, but neither candidate reached the timing gate that would justify promotion and comparative memory evaluation.

## Baseline and launch diagnosis

The sandboxed Electron process aborted in macOS `_RegisterApplication` / `GetCurrentProcess`, before the game window was constructed. Its crash report recorded `SIGABRT` and `abort() called`. The same fresh-process fixture benchmark completed outside the filesystem sandbox, using a temporary Electron user-data directory. No player save was used or modified. There was no need to disable Electron renderer sandboxing or change the application runtime.

The first successful current control recovered 162 raw hours in 5,595 ms and reloaded a semantically identical save. Historical 4,178 ms measurements were not treated as the current baseline. The five-sample confirmation used one warm-up per variant, separate Electron processes, production worker limits, the same built assets, and alternating variant order. No tests or other benchmark workloads were deliberately run concurrently with those samples. Shared-host scheduling and thermal conditions are still uncontrolled.

## Candidate results

| Candidate | Recovery p50 | Recovery p95 | Change in p50 | Median paired change | Maximum authority transaction |
|---|---:|---:|---:|---:|---:|
| Production authority control | 6,513.3 ms | 7,049.1 ms | — | — | 42.3 ms |
| Skip discarded notifications | 6,037.0 ms | 6,099.8 ms | -7.31% | -7.31% | 37.2 ms |
| Stream actions into a private reducer draft | 5,996.2 ms | 7,065.6 ms | -7.94% | +2.52% | 51.3 ms |

Each row contains five measured samples. The median of paired percentage changes is distinct from the percentage change between distribution medians. Streaming was slower in three of the five pairs; its lower overall median is not reliable evidence of a speedup. All 15 measured runs passed final-versus-persisted semantic equality.

Notification suppression avoided the notification map, display-name formatting, localization, FULL-mode notification snapshots and comparisons, and notification materialization. Default notification-enabled behavior was preserved in the prototype. It missed the 8% target and was removed.

The streaming prototype applied ordered actions through the existing reducer using one private copy-once inventory/Jewel context and incremental HP ledger, returning its completed projection instead of replaying the action array at transaction end. It retained the planner's decision view: that view deletes exhausted stacks and uses captured character/Jewel inputs, whereas the authoritative reducer retains status records and applies sequential mutations. Substituting the authoritative draft directly for these planner reads would change established decisions or insertion-order behavior. Thus the tested prototype fused action application, but did not eliminate the semantically distinct planner simulation. It missed both the paired timing and 50 ms gates and was removed.

## Attribution and next target

Median profile totals for the control were:

| Equipment planning phase | Time |
|---|---:|
| Inventory candidate scanning and evaluation | 482.6 ms |
| Inventory index construction | 65.5 ms |
| Inventory cloning | 37.2 ms |
| Character stat computation | 32.0 ms |
| Native ranking | 27.1 ms |
| Notification formatting | 4.2 ms |
| Unclassified planning work | 141.9 ms |

These are phase medians, not an additive decomposition of one particular run. Worker and coordinator work also overlap; local savings are not equal to recovery-wall savings. Notification-only comparisons fall partly outside the formatting bucket. Streaming moved approximately 513 ms into action dispatch rather than removing that work.

Further work should start from candidate scanning/evaluation, retaining the existing transaction-local item-fact and character/category caches and stable insertion order. A new ranking shortcut or shared planner/reducer representation needs its own specification-preserving design and measured screen; neither is silently introduced by this change.

## Correctness and retained instrumentation

Before removal, a separate Electron correctness run exercised no-op, upgrade-heavy, FULL rebuild, locked-equipment, Jewel-priority, and maximum-inventory workloads for the first party with damaged HP. Notification-enabled and disabled planners produced identical ordered actions and summaries. Every streamed action prefix matched the sequential authoritative reducer's serialized state. The original fixture remained unchanged, and recovery persisted semantically identical state. Validation was excluded from timing samples.

The retained collector has a fixed phase allowlist, sums scalar durations without retaining actions or state, returns detached snapshots, and resets at profile initialization. It survives trace-ring eviction. It is allocated only in opt-in profile builds. Startup-to-result includes recovery and profiler completion work; document-loaded time is reported separately and neither is mislabeled as pure simulation time. Existing recovery-finalization, checkpoint, heartbeat, and React measurements remain available.

Physical macOS sleep/wake and forced application termination are not simulated by this fixture harness; existing automated scheduler, coordinator, persistence, and desktop lifecycle regressions provide limited coverage, not a claim of manual OS lifecycle testing.

## Final environment checks

| Environment | Raw absence | Recovery wall time | Document loaded | Persisted equality |
|---|---:|---:|---:|---|
| Normal | 9 hours | 2,960.8 ms | 169.3 ms | Pass |
| Normal | 24 hours | 3,542.1 ms | 136.0 ms | Pass |
| Normal | 162 hours | 5,424.6 ms | 138.7 ms | Pass |
| Orca | 9 hours | 4,331.3 ms | 174.6 ms | Pass |
| Orca | 24 hours | 7,302.3 ms | 141.4 ms | Pass |
| Orca | 162 hours | 13,451.9 ms | 162.3 ms | Pass |

These are single-run smoke measurements of the retained implementation, not a before/after performance claim. Orca loads `/orca/` under the isolated custom protocol, exercising its enforced game mode and offset. The profiler defaults to `authority-production`; use `--environment=orca` to select Orca. Example: `npm run performance:afk-live -- --hours=9,24,162 --environment=orca --mode=timing --samples=1`.

The Node memory smoke suite passed all workloads. No candidate was promoted, so the full comparative Electron memory/release matrix was not run. Production bundle inspection confirmed the new equipment-phase fields and collector call are absent, the worker contains no React runtime, and the initial locale preload count remains one.

## Verification

- Complete repository suite: **364 tests passed**, including existing AFK scheduler/coordinator, persistence, equipment, native battle, runtime-mode, and desktop regressions. The final run used permission to bind the localhost API test.
- New fixed-size attribution tests cover repeated transactions, unknown-phase rejection, invalid timing samples, detached snapshots, and reset.
- TypeScript/production build, ESLint, generated battle protocol check, and performance bundle gates passed.
- Node memory smoke passed every workload under the existing 32 MiB / 20% growth gate.
- An initial Node-only test failure exposed the absent browser compile flag; initialization now uses a `typeof` guard. The corrected complete suite passed.
- Build increased once from 4 to 5; the English changelog entry was prepended for v0.9.6, dated 2026/09/05.
- Unrelated concurrent edits to `Specification_8.1_UI_FOUNDATIONS.md` were preserved.
