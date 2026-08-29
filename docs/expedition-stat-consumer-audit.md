# Expedition Stat Consumer Audit — Build 48

Date: 2026/08/25  
Version/build/baseline commit: 0.9.4 / 48 / `0d0c84cf` (Build 47)
Protocol/Wasm ABI: v3 / v8 (unchanged)

## Decision

Accepted and implemented. `RUN_EXPEDITION` now derives one frozen `ExpeditionRewardContext` from its explicit `statusParty` and existing authoritative `ComputedPartyStatus`, then reuses it for every victorious-room reward, unlock narration, and the final expedition log. This is transaction-local reuse, not caching.

The implemented context shape is:

```ts
type ExpeditionRewardContext = Readonly<{
  autoSellMultiplier: number;
  unlockActorName?: string;
}>;
```

Its authority lifetime is exactly one `RUN_EXPEDITION` transaction. Online, simulation, and Gods Battle derive it from that transaction's starting status. AFK derives it from the supplied immutable Chunk-start Party/status pair and reuses it across reward resolution and narration without exposing it to mutable post-Cycle work. Each API Cycle derives a new context from that Cycle's incoming Party/status pair; no context crosses a Cycle boundary.

The formulas and selection behavior are unchanged: Cunning uses `1`, `1.2`, or `1.3` for levels 0, 1, or 2+; the result is multiplied after `Math.max(0, deity deposit multiplier - (Momentum > 0 ? 0.1 : 0))`; deity name and `deityGold` remain the deposit inputs. Unlock scans characters in current order, updates only for a strictly higher `unlock` level, and retains the exact current character name, including ordinary and Mimorian characters. The optional `unlockActorName` property is absent when no actor exists, and the expedition log's `autoSellMultiplier` remains absent unless the multiplier is greater than 1.

Protocol v3, Wasm ABI v8, battle encoding/decoding, Gate 2B, native profile caching, AFK worker messages, battle fixtures, post-Cycle profit/healing, observations, API contracts, and all gameplay formulas remain unchanged. No global cache, Party-identity cache, cross-transaction reuse, or cross-Cycle reuse was introduced.

## Build 48 acceptance evidence

### Exact computation counts

The audit-only guarded counter was injected only into isolated temporary bundles. Counts are deterministic and meet every requested maximum.

| Workload | Build 47 | Build 48 | Removed | Gate |
|---|---:|---:|---:|---:|
| Online expedition | 75 | 1 | 74 | ≤1 |
| Simulation, one run | 76 | 2 | 74 | ≤2 |
| Gods Battle | 72 | 1 | 71 | ≤1 |
| AFK, six parties × 12 Cycles | 5,688 | 396 | 5,292 | ≤396 |
| API resolver, count 1 | 76 | 2 | 74 | ≤2 |
| API resolver, count 100 | 7,600 | 200 | 7,400 | ≤200 |
| Observation before + mutating Cycle + after | 88 | 14 | 74 | six per observation plus two Cycle calls |

There are zero reward/unlock `computePartyStats()` calls left inside `RUN_EXPEDITION`; its sole call is the authoritative transaction-start computation when no status is supplied. Observation remains exactly one computation per party per observation.

### Complete deterministic parity

Build 47 commit `0d0c84cf` and the candidate were bundled from isolated exports without switching or resetting the active worktree. A fixed clock, identical checked dependencies/save/seeds, and fresh state per workload were used. Complete resulting state, parties, inventory, Gold, rewards and names, bags and random cursors, expedition/Diary logs, progression/unlocks, side quests, per-run API logs, and before/after observations were serialized for online, simulation, Gods Battle, AFK six-party/12-Cycle, API count 1, and API count 100 in `ja`, `en`, `zh-CN`, and `zh-TW`.

The two 349,153,146-byte outputs were byte-identical with SHA-256 `0cce65abb7539e864749321b73bac89d02ecac94816dd2d0f5a0b763c9db1363`. This proves unchanged reward items/names/log entries, auto-sell decisions/Gold/totals, optional multiplier presence, unlock narration, log ordering, Diary contents, bag state, and observable API state for the matched workloads.

### Alternating fresh-process performance

Build 47 (A) and Build 48 (B) used the same Node v26.7.0 runtime, dependency directory, lockfile, save, deterministic seeds, and warmup. Five fresh processes per side used `A B B A A B B A A B` for every workload. Values are median and full range; change is B versus A.

| Workload | Build 47 ms | Build 48 ms | Change |
|---|---:|---:|---:|
| Online expedition | 48.94 (45.45–51.44) | 21.15 (20.68–22.53) | -56.8% |
| Simulation, one run | 151.39 (146.49–155.87) | 119.02 (115.66–121.19) | -21.4% |
| Gods Battle | 76.10 (74.70–80.38) | 27.63 (27.41–37.14) | -63.7% |
| AFK, six parties × 12 Cycles | 1,988.92 (1,895.87–2,031.38) | 571.26 (549.12–610.93) | -71.3% |
| API resolver, count 1 | 66.98 (64.35–68.90) | 30.24 (26.74–30.84) | -54.9% |
| API resolver, count 100 | 2,248.96 (2,213.08–2,287.13) | 674.18 (652.83–706.96) | -70.0% |
| Observation before + mutating Cycle + after | 75.30 (72.44–89.94) | 45.14 (44.27–46.43) | -40.1% |

The primary acceptance workloads have no regression and all three exceed the required 10% improvement.

### Sampled allocation attribution

Three fresh V8 heap-sampling processes per side used the same workload setup. Mean total sampled allocations changed as follows; sampling is attribution evidence rather than an exhaustive allocation count.

| Workload | Build 47 bytes | Build 48 bytes | Change |
|---|---:|---:|---:|
| Online expedition | 49,971,605 | 10,271,435 | -79.4% |
| Simulation, one run | 89,345,461 | 48,301,408 | -45.9% |
| Gods Battle | 73,692,733 | 9,023,843 | -87.8% |
| AFK, six parties × 12 Cycles | 3,323,836,117 | 632,986,432 | -81.0% |
| API resolver, count 1 | 51,445,837 | 12,029,112 | -76.6% |
| API resolver, count 100 | 3,672,802,835 | 744,229,856 | -79.7% |
| Observation before + mutating Cycle + after | 61,693,427 | 22,687,272 | -63.2% |

The former reward-helper and unlock-narration allocation categories disappear from online, simulation, Gods Battle, and API profiles. AFK retains only the explicitly excluded current mutable profit helpers plus required Chunk-start/post-Cycle computations.

### Remaining consumers and further work

Required consumers remain at save hydration/default HP, HP preservation across equipment/build mutation, expedition/API Cycle start, AFK Chunk start, post-Cycle AFK maximum HP, `HEAL_PARTY_HP`, simulation baseline, API ending summaries, observations, UI preflight/render/checkpoints, notifications, and battle diagnostic fallbacks. Shop auto-sell continues to call the explicitly Party-current `getCurrentPartyCunningMultiplier`; mutable prayer/free-action helpers still accept a current `Party` and never accept an optional status.

No further in-scope transaction-local reward target clears 5%: remaining online, simulation, and Gods Battle stat CPU is about 0.8–1.1%. The AFK mutable profit family remains measurable (about 16.4% sampled CPU), but it is a separate post-Cycle authority problem explicitly excluded from this optimization. API Cycle-start and heal/status work likewise remains required or individually below the requested threshold. Further optimization is therefore not justified as part of this target.

## Build 47 baseline method and measurement boundary

- The accepted Build 47 save-backed fixtures and deterministic random/seed seams were used after an unmeasured observation warmup.
- Exact calls/stacks were collected from an audit-only esbuild transform that injects a guarded counter into the temporary `/tmp` bundle. Repository runtime source is not modified and ordinary builds contain no counter, timing call, or allocation record.
- CPU uses V8 Inspector sampling; allocation uses V8 heap allocation sampling at 8 KiB. Three fresh processes were run per workload. Percentages use all profiler samples, including runtime/GC, matching the migration report's convention. Allocation values are sampled bytes, not exhaustive allocation totals.
- The API `count=1`/`count=100` profile covers the authoritative resolver used by the serialized endpoint. Static endpoint accounting adds one preflight call, one ending-HP call per result, and one final six-party observation: full endpoint call totals are therefore 84 and 7,707 respectively. These endpoint-only additions were not falsely attributed to the resolver's end-to-end duration.
- V8 sometimes inlines adjacent reward helpers. The profiling-only exact stack counter separates their counts; sampled CPU/allocation is reported at the stable helper-family boundary. Adjacent direct reducer calls that share the same `gameReducer` frame are likewise separated by exact source counters, not presented as independently sampled totals.

## Build 47 baseline workload results

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

## Build 47 measured expedition call-site attribution

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

## Build 47 complete production call-site inventory

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

## Build 47 authority and invalidation conclusions

1. Cunning, its nested prayer multiplier, final auto-sell summary, and unlock narration under `RUN_EXPEDITION` all receive `statusParty`. Exact fingerprints were identical to the transaction authority for online/simulation/Gods/API. In AFK they intentionally remain identical to the immutable Chunk-start authority even while `workingState` mutates. Reuse is safe.
2. Unlock narration needs only the highest `unlock` level and matching character name. It does not need a new complete party computation.
3. Observation already computes once per party and shares the result throughout that party's sections. Cross-observation reuse is unsafe after a mutating command/Cycle even when a particular sample happens not to change its fingerprint.
4. API final per-run summaries describe distinct after-states. Cycle N's starting status and the final observation are not authoritative for every ending state; reuse is unsafe without capturing a fresh post-Cycle status for that exact result.
5. Post-Cycle AFK healing sees many distinct stat fingerprints caused by level/equipment/progression changes. Chunk-start reuse would be stale and is prohibited.
6. AFK free-action/prayer profit calls use current mutable Party state, not Chunk-start authority. Their three same-Cycle calls can share a newly computed narrow status, but this separate small target must not be combined merely to meet a threshold.
7. Object identity was not used as evidence. Authority source, relevant mutation ordering, and stat fingerprints were used together.

## Implemented architecture and gate disposition

Build 48 chose the narrower scalar form from the audit:

- `autoSellMultiplier` contains the Cunning result multiplied by the prayer/deposit result in the existing numeric order.
- `unlockActorName` contains only the selected current display name and is omitted when no actor exists.

The values are used only by reward resolution, unlock narration, and the final log inside that reducer transaction. API creates one value per incoming Cycle. AFK derives it from the existing immutable Chunk-start status and does not expose it to post-Cycle healing/profit/UI work. No cache key, identity test, global memo, cross-party reuse, cross-Cycle reuse, or protocol change exists.

Correctness gate results:

1. Existing deterministic battle, expedition, reward, Diary, save, observation, API, AFK parity, protocol v3, and ABI v8 suites pass.
2. Authority and exact counter tests prove one derived transaction context and zero nested reward/unlock full-stat computations.
3. API start-status, AFK post-Cycle status, healing, and the other mutation-aware recomputations remain present; no status-accepting optional helper was introduced.
4. AFK reward/narration continues to use Chunk-start authority while post-Cycle healing uses current mutable state.
5. Complete four-language deterministic output is byte-identical to Build 47.

Performance gate results:

1. Exact `computePartyStats` ceilings pass for every workload.
2. No median regression occurred in online, AFK six-party Chunk, or API count-100 across five alternating fresh processes per side.
3. Online, AFK, and API count-100 all improve by more than 10%, and sampled allocation volume falls clearly in every measured workload.
