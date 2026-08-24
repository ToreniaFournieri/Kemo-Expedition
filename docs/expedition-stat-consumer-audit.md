# Expedition Stat Consumer Audit — Build 47

Date: 2026/08/25  
Version/build/commit: 0.9.4 / 47 / `a556fd67`  
Protocol/Wasm ABI: v3 / v8 (unchanged)

## Decision

Recommend exactly one next implementation: thread the `RUN_EXPEDITION` transaction's existing authoritative `ComputedPartyStatus` (or narrower prederived ability levels/unlock actor scalar) through unlock narration and reward/auto-sell multiplier consumers. This is transaction-local reuse, not caching.

The target is provably redundant and clears the decision threshold. It removes 74 of 75 stat computations in the measured online expedition, 71 of 72 in the Gods Battle, 5,292 of 5,688 in the six-party AFK Chunk, and 7,400 of 7,600 in the API count-100 resolver. Its measured theoretical CPU ceiling is 29.5% online, 42.7% Gods Battle, approximately 68.5% AFK after excluding mutable post-Cycle helper work, and 66.7% API count-100. A deliberately conservative projection of half those ceilings remains above 5% for every expedition path (8.6% simulation through 34.2% AFK).

No gameplay or runtime optimization was implemented. Protocol v3, Wasm ABI v8, battle encoding, AFK messages/authority, fixtures, formulas, ordering, observations, and API contracts are unchanged. The only repository changes are this report and profiling-only test/scripts. `build_number.txt` remains 47 and the changelog is unchanged.

## Method and measurement boundary

- The accepted Build 47 save-backed fixtures and deterministic random/seed seams were used after an unmeasured observation warmup.
- Exact calls/stacks were collected from an audit-only esbuild transform that injects a guarded counter into the temporary `/tmp` bundle. Repository runtime source is not modified and ordinary builds contain no counter, timing call, or allocation record.
- CPU uses V8 Inspector sampling; allocation uses V8 heap allocation sampling at 8 KiB. Three fresh processes were run per workload. Percentages use all profiler samples, including runtime/GC, matching the migration report's convention. Allocation values are sampled bytes, not exhaustive allocation totals.
- The API `count=1`/`count=100` profile covers the authoritative resolver used by the serialized endpoint. Static endpoint accounting adds one preflight call, one ending-HP call per result, and one final six-party observation: full endpoint call totals are therefore 84 and 7,707 respectively. These endpoint-only additions were not falsely attributed to the resolver's end-to-end duration.
- V8 sometimes inlines adjacent reward helpers. The profiling-only exact stack counter separates their counts; sampled CPU/allocation is reported at the stable helper-family boundary. Adjacent direct reducer calls that share the same `gameReducer` frame are likewise separated by exact source counters, not presented as independently sampled totals.

## Workload results

Durations are the measured workload interval (median and min–max across three fresh processes). CPU/allocation columns are the total `computePartyStats` family contribution. “Recommended target” excludes the required starting computation and excludes computations after a relevant mutation.

| Workload | Exact calls | Duration ms, median (range) | All stat CPU | All stat sampled alloc. | Recommended-target CPU / alloc. |
|---|---:|---:|---:|---:|---:|
| Online expedition | 75 | 89.4 (73.8–92.9) | 30.3% | 80.2% | 29.5% / 79.2% |
| Simulation, one run | 76 | 220.5 (185.9–229.4) | 18.0% | 46.2% | 17.2% / 44.9% |
| Gods Battle | 72 | 125.9 (110.8–128.6) | 43.5% | 89.3% | 42.7% / 87.9% |
| AFK, six parties × 12 Cycles | 5,688 | 3,661.3 (3,390.1–3,723.8) | 73.7% | 87.8% | ~68.5% / ~81.7% |
| API resolver, count 1 | 76 | 94.7 (90.9–97.1) | 28.6% | 79.1% | 27.5% / 76.8% |
| API resolver, count 100 | 7,600 | 4,075.5 (3,822.0–4,125.9) | 68.4% | 81.8% | 66.7% / 79.7% |
| Observation before + mutating Cycle + after | 88 | 105.2 (101.6–117.2) | 30.2% | 78.9% | Cycle target 22.5% / 62.8%; observations already optimized |

Run-to-run duration spread was 6.6–21.4% for short workloads and 7.5–9.1% for count-100/AFK. The dominant helper allocation shares were stable within about 0.1 percentage point on the long workloads. Exact call counts were deterministic in all runs.

## Measured expedition call-site attribution

| Source/function | Online | Sim. | Gods | AFK | API 1 | API 100 | State/authority and decision |
|---|---:|---:|---:|---:|---:|---:|---|
| `useGameState.ts:3120`, `RUN_EXPEDITION` start | 1 | 1 | 1 | 0 | 0 | 0 | Required for online/simulation/Gods. AFK/API supply the existing authority. |
| `useGameState.ts:4807`, AFK Chunk start | 0 | 0 | 0 | 36 | 0 | 0 | Required: six parties computed once for each separately invoked 12-Cycle Chunk profile; already optimized and authoritative. |
| `useGameState.ts:5278`, API Cycle start | 0 | 0 | 0 | 0 | 1 | 100 | Required: each Cycle uses its incoming Party and cannot reuse the prior Cycle. Already supplied to `RUN_EXPEDITION`. |
| `useGameState.ts:2435` → Cunning/reward calls | 25 | 25 | 24 | 1,788 | 25 | 2,500 | Safe within `RUN_EXPEDITION`: every call uses `statusParty`, whose computed status already exists. AFK uses the immutable Chunk authority. Includes one final-log Cunning call per Cycle. |
| `useGameState.ts:2435` → prayer/deposit calls nested by Cunning | 25 | 25 | 24 | 1,788 | 25 | 2,500 | Safe within `RUN_EXPEDITION`; same authority and fingerprint as the preceding Cunning lookup. |
| `useGameState.ts:2534`, `getUnlockActorName` | 24 | 24 | 23 | 1,716 | 24 | 2,400 | Safe within `RUN_EXPEDITION`; complete stats are recomputed only to choose the highest `unlock` holder's existing character name. |
| `useGameState.ts:2435`, AFK free-action/prayer helpers | 0 | 0 | 0 | 216 | 0 | 0 | Transaction-locally reducible to one current-status computation per Cycle, but it is post-Cycle mutable authority and is not part of the recommendation. Too small alone. |
| `useGameState.ts:4891`, post-Cycle AFK max HP | 0 | 0 | 0 | 72 | 0 | 0 | Required after XP, equipment/automation, deity/progression effects. Must not reuse Chunk-start status. |
| `useGameState.ts:3941`, `HEAL_PARTY_HP` immediately after AFK check | 0 | 0 | 0 | 72 | 1 | 100 | Duplicate of the immediately preceding current-state/API-start max-HP computation, but only ~0.8–1.0% CPU and not the coherent recommended target. |
| `simulateExpeditionRuns:5323`, simulation baseline | 0 | 1 | 0 | 0 | 0 | 0 | Same stat-relevant state as the subsequent run start, but one call and below threshold. |
| `experimentalApi.ts:121`, observation | 0 | 0 | 0 | 0 | 0 | 0 | Six calls per observation, exactly one per party and shared by HP, character sections, equipment slices, and legal actions: already optimized. Before/after calls must remain separate across mutation. |

The AFK total above is six independent worker-style Chunk invocations. Each invocation creates a six-party status array, hence 36 Chunk-start calls; only the selected party's entry is consumed by that worker operation. Changing that worker/message shape is out of scope.

## Complete production call-site inventory

There are 29 production call expressions (excluding tests and the function definition).

| Source call expressions | Consumer | Audit result |
|---|---|---|
| `useGameState.ts:1248`, `:1410` | save hydration/default runtime HP | Required initialization; outside measured transactions. |
| `useGameState.ts:2435`, `:2534` | ability scalar and unlock actor | Redundant when called under `RUN_EXPEDITION`; recommendation. Outside that authority, accept a scalar/status explicitly rather than infer reuse. |
| `useGameState.ts:2937-2938` | HP preservation across equipment/build changes | Both required: inputs intentionally straddle a stat-invalidating mutation. Unsafe to reuse. |
| `useGameState.ts:3120` | authoritative expedition start | Required unless AFK/API explicitly supplies authority; already optimized. |
| `useGameState.ts:3941` | healing clamp | Required generally; locally duplicative only when caller just computed the same current state. Below threshold. |
| `useGameState.ts:4807` | AFK Chunk-start authority | Required/already optimized. Do not broaden. |
| `useGameState.ts:4891` | AFK post-Cycle healing basis | Required current mutable state. |
| `useGameState.ts:5278`, `:5323` | API Cycle start; simulation baseline | API call required per Cycle; simulation baseline locally duplicative but negligible. |
| `experimentalApi.ts:121` | observation | Required once per party; already shared internally. |
| `HomeScreen.tsx:533`, `:566` | API preflight; each run's ending max HP | Preflight duplicates Cycle 1 start but negligible. Per-run ending status is required because each after-state may have changed level/equipment/build/deity; final observation cannot replace historical run summaries. |
| `HomeScreen.tsx:832` | speed-of-time progress report | Required snapshot on demand. |
| `HomeScreen.tsx:1777` | selected-party render status | Required current render state; useMemo may be considered only with ordinary React dependencies, not global caching. Not expedition work. |
| `HomeScreen.tsx:1903`, `:2316`, `:2660` | desktop pane snapshot; AFK→online cycle reconstruction; time checkpoint | Current-state UI/runtime decisions. They cross asynchronous mutations and must not reuse expedition/Chunk snapshots. |
| `HomeScreen.tsx:3242`, `:3250` | notification ability owner/level | Current Party notification helpers; outside reducer authority and not reached by the headless resolver profiles. Inconclusive performance, unsafe to borrow transaction status implicitly. |
| `HomeScreen.tsx:3374` | sortie HP validation | Current UI preflight; one call, safe only to pass explicitly into the immediately dispatched transaction, below threshold. |
| `SettingTab.tsx:490`, `ExpeditionTab.tsx:447` | Settings ability display; expedition render | Current render computations; not expedition transaction duplicates. |
| `battleCandidate.ts:101`, `:261`, `:304`, `:797` | protocol projection/preparation/diagnostic fallbacks | Production expedition paths supply `environment.partyStatus`; fallback counters are zero and Gate 2A tests enforce that. Keep fallbacks for standalone/diagnostic callers. Already optimized; protocol-boundary migration remains closed. |

`characterComputation.ts` has no direct `computePartyStats` call. Its repeated work is transitive from the inventory above. `battle.ts`, `afkChunkCoordinator.ts`, and `afkScheduler.ts` have no direct call; they preserve the supplied status/Chunk boundaries described above.

## Authority and invalidation conclusions

1. Cunning, its nested prayer multiplier, final auto-sell summary, and unlock narration under `RUN_EXPEDITION` all receive `statusParty`. Exact fingerprints were identical to the transaction authority for online/simulation/Gods/API. In AFK they intentionally remain identical to the immutable Chunk-start authority even while `workingState` mutates. Reuse is safe.
2. Unlock narration needs only the highest `unlock` level and matching character name. It does not need a new complete party computation.
3. Observation already computes once per party and shares the result throughout that party's sections. Cross-observation reuse is unsafe after a mutating command/Cycle even when a particular sample happens not to change its fingerprint.
4. API final per-run summaries describe distinct after-states. Cycle N's starting status and the final observation are not authoritative for every ending state; reuse is unsafe without capturing a fresh post-Cycle status for that exact result.
5. Post-Cycle AFK healing sees many distinct stat fingerprints caused by level/equipment/progression changes. Chunk-start reuse would be stale and is prohibited.
6. AFK free-action/prayer profit calls use current mutable Party state, not Chunk-start authority. Their three same-Cycle calls can share a newly computed narrow status, but this separate small target must not be combined merely to meet a threshold.
7. Object identity was not used as evidence. Authority source, relevant mutation ordering, and stat fingerprints were used together.

## Proposed implementation and gates

If separately authorized, introduce one explicit transaction-local value created beside `partyStatus` in `RUN_EXPEDITION`, for example:

- existing `ComputedPartyStatus` plus prederived `Map<AbilityId, number>` and `unlockActorName`; or
- narrower scalars: `cunningMultiplier`, `prayerDepositMultiplier`, and `unlockActorName`.

Pass those values only to reward/narration/final-log helpers inside that reducer transaction. API continues to create one value per incoming Cycle. AFK derives it from the existing immutable Chunk-start status and does not expose it to post-Cycle healing/profit/UI work. No cache key, identity test, global memo, cross-party reuse, cross-Cycle reuse, or protocol change is needed.

Correctness gates:

1. Existing deterministic battle, expedition, reward, Diary, save, observation, API, AFK parity, protocol v3, and ABI v8 suites remain byte/value-identical.
2. Add authority tests for online, simulation, Gods Battle, API sequential Cycles, and 12-Cycle AFK proving one supplied/derived transaction status and zero nested full-stat computations.
3. Add stale-state tests where equipment, level, deity, build, race, gender, lineage, predisposition, main/subclass, and Mimorian form change between Cycles; Cycle N+1 and post-Cycle healing must recompute.
4. Assert AFK reward/narration continues to use Chunk-start authority while post-Cycle healing uses current mutable state.
5. Assert unlock actor/name, Cunning, prayer deposit, rewards, auto-sell totals, and final logs are unchanged in all four languages.

Performance gates (fresh process after warmup, same fixture/machine class):

1. Exact `computePartyStats` ceilings: online ≤1 inside one `RUN_EXPEDITION`; Gods Battle ≤1; API resolver ≤2 per Cycle including the existing heal clamp (prefer ≤1 only if separately proven); AFK recommended-path calls eliminated while retaining Chunk-start and mutable post-Cycle calls.
2. No regression above 5% in median online, AFK six-party Chunk, or API count-100 duration across at least five alternating baseline/candidate runs.
3. Require at least 10% median end-to-end improvement in two of online, AFK, and API count-100, and a clear sampled-allocation reduction. If not achieved, revert and stop general performance work.

