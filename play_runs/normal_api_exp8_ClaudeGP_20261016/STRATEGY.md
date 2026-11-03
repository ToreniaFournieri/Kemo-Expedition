# ClaudeGP: v0.10.1 (54) Normal API -- "GA test, serious run" (gaSearch + build-54 levelProbe)
Written before signup, 2026-10-16. Limit 8 h real. Goals: D8 boss, least in-game time, fewest calls.

## What earlier reports say
- Record: Tune3 b44 11.63 d / 2,511 calls (tuning first, big GA only when route < 85 %, farm with a surviving build).
- DG b52: D1-D5 in 978 calls / 3.2 d (hand opening + gate loop + re-plan), but D6 wall at Lv26 cost 1,150 calls/6 d
  (200 obs gate loop before farming); GA beat directedBuild 50:26 on gate equipment re-plans; real walls were fixed by levels.
- AB b49 failed: A/B search at walls ate real time. Dir2 (no GA) failed. => GA-only this time.

## Concept
Test gaSearch as the single search tool in a serious record attempt, especially the new `levelProbe` (b54), which should answer
"farm or keep searching" at a wall. Every re-plan = tuning (attackers first) -> gaSearch (full components, global items,
allDeities) with `levelProbe {mode:auto, purpose:conquest}`. Log every probe (lp_log.jsonl) and check its prediction against what
actually happens (did the gate fall at the probe's `levelNeeded`?).

## Rules
1. Hand opening (open.py). Stage loop per dungeon (hl3 with AUTOGA = tune + GA, NST=6). Never A/B.
2. Wall rule (the test): if the GA verdict is noChange/noisy AND the probe says the current level misses the target with
   levelNeeded > level (or none met) -> stop re-planning, farm to levelNeeded at the deepest depth with defeat <= 10 %
   (probe `purpose: farming` to pick depth), then re-plan once.
3. Boss: only after "BOSS OPEN"; prep = bossDamage tuning+GA, then success GA with objectiveGuard bossDamage 0.6; attack at route >= 0.5 %.
4. Real-time guard: no search > 300 s except boss prep; stop extras after 6 h.
Targets: D8 boss <= 12 d, <= 2,600 calls, < 7 h real.
