# ClaudeSS: v0.10.1 (56) Normal API -- "Signal & Seed" (native progress signal, guard ranking, seeded GA)
Written before signup, 2026-10-17 17:40 JST. Limit 8 h real. Goals: D8 boss, least in-game time, fewest calls.

## What earlier reports say
- Record: ClaudeGP b54 10.89 d / ~2,506 calls / 3h26. ClaudeGX b54 13.95 d / 2,562 calls / 6h10.
- Calls: ~77 % of all calls are the gate loop (elapsed + sortie). Fewer calls = fewer runs = better builds sooner.
- GX: skip a search when `E-k <= 3` saved ~230 calls through D5 at the same pace. Re-plan on every new gate and on
  slot unlock levels (14/19/24/30).
- GX: at low route success (< 15 %), success-ranked GAs are noise; a progress-ranked first GA broke 6 of 8 walls.
  Build 56 now does this inside gaSearch (`successSignal: auto`).
- GX: guarded GAs returned noChange 4x (guard filtered only at confirmation). Build 56 ranks every candidate by the guard.
- Boss recipe that worked (GX D7): unguarded bossDamage GA, then route GA guarded by bossDamage >= 0.85 x share.
  The D6 boss cost GX 2.4 d because a pure bossDamage build died on the route. Never farm D6 to Lv30 (GP: boss at Lv27).
- Real time is spent in search (GX 5.9 h of 6.2 h). Big GA = 4-5 min; 44 % of GX big GAs gave nothing.

## Concept
1. GA is the only search tool (no tuning, no directedBuild). Loop, gate re-plan triggers and skip rule are GX's.
2. **Signal**: every route GA uses `objective: success` with the default `successSignal: auto` (no client-side
   progress hack). Log `quickSignal`, `stopReason`, `generationsRun`, `guardStats`.
3. **Seed**: every GA sends `seedBuilds` from a seed library built from the GP and GX record runs (`seed_lib.json`:
   the class/race/lineage/predisposition/order/deity builds they applied at the same destination, last 4 of each run).
   Log `seeds[].inBest` to see whether known builds help.
4. Sizes: `high` (48x80, ~80 s) for normal re-plans. Wall (`E-k > 45`, or a `high` GA still leaves `E-k > 12`):
   one `effort: max` GA with timeBudgetSeconds 360 (quickRuns 300 = less noise), at most 2 per re-plan.
5. Boss (only after BOSS OPEN): meter route; if < 5 %: unguarded bossDamage GA (`high`) if share < 0.9, then a `max`
   success GA guarded by bossDamage >= 0.85 x share, seeded with the pre-boss route build. Attack at route >= 0.5 %.
   If the guarded pass fails, re-run unguarded success seeded with the route build (never attack with a pure
   bossDamage build).
6. No farming. Level is only from the loop.

## Targets
D8 boss < 10.9 d, < 2,300 calls, < 5 h real.
Workspace: run folder play_runs/normal_api_exp8_ClaudeSS_20261017/, Electron ud /tmp/bk-ss, account ClaudeSS.
