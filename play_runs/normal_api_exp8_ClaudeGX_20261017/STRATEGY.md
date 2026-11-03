# ClaudeGX: v0.10.1 (54) Normal API -- "GA test, serious run" (expected-runs re-plan, big GA, no tuning)
Written before signup, 2026-10-17 09:45 JST. Limit 8 h real. Goals: D8 boss, least in-game time, fewest calls.

## What earlier reports say
- Record: ClaudeGP b54 10.89 d / ~2,506 calls / 3h26 (GA-only + tuning, `high` preset GAs, big GA only at the D8 4f wall).
  - `high` stops after ~80 s whatever `timeBudgetSeconds` is; big GA (pop64/gen200/300 s) took D8 4f 36 -> 62 -> 74 %.
  - Tuning cost 373 calls (15 %) for 10 % accepted. Never farm D6 to Lv30 (DG lost 6 d); D6 boss died at Lv27.
  - levelProbe is useful as "does a level help?" but has no farm cost and its expectedRuns were 2-4x pessimistic.
  - Walls that cost ~1 d each: D4 3f, D6 5f, D8 4f.
- Tune3 b44 11.63 d: re-plan on every new gate floor. DG/AB: directedBuild loses to GA; A/B eats real time.

## Concept
GA is the only search tool (no tuning, no directedBuild). The test is **when and how big** to run a gaSearch:
re-plan decisions come from the expected runs to finish the gate streak, `E(p,k) = (1-p^k)/((1-p)p^k)` with the route
success `p` from a 300-run simulationRun (1 call) and `k` = required - current of the first gate.
- `E <= 8`: no search (save calls and real time).
- otherwise `high` GA (TB 180); if `E` after it is still > 15, big GA (64x200, 300 s), at most 2 big per re-plan;
  from D4 on, `E > 45` goes straight to the big GA.
- Re-plan on arrival, on every new gate (kind, floor), and after a stall budget of clamp(E,12,36) loops.
- Every GA: all components, global items, allDeities, order, levelProbe auto (logged in lp_log.jsonl, read only as "does a level help?").
- Boss (only after BOSS OPEN): big bossDamage GA if share < 0.9, then up to 2 big success GAs with objectiveGuard bossDamage 0.6;
  attack at route >= 0.5 %.
- No farming unless a big GA says noChange twice AND the level probe shows a level that helps within ~1 game day of EXP.

## Measured for the report
replan.jsonl (meter, E before/after, every GA verdict/gain/time), lp_log.jsonl, high vs big gain per call and per real minute,
whether E predicts the actual runs to open a gate.

## Targets
D8 boss < 10.9 d, < 2,300 calls, < 6 h real.
Workspace: run folder play_runs/normal_api_exp8_ClaudeGX_20261017/, Electron ud /tmp/bk-gx, account ClaudeGX.
