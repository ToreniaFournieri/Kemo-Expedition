# ClaudeAB: v0.10.1 (49) Normal API -- "directedBuild vs gaSearch, paired A/B"

Written before signup, 2026-10-15. Real-time limit 8 h. Goals: (1) D8 boss, (2) least in-game time, (3) fewest API calls.
Read first: Tune3 (b44) record 11.63 d / 2,511 calls (tuning-first + big GA); Directed (b47) 15.73 d / 2,862; Dir2 (b48, no GA) failed D8 (D6 21.6 d).

## Concept
Question: which gives the better outcome, in-game `directedBuild` or `gaSearch`?
Method: at every arrival / wall re-plan, run BOTH read-only on the same save with the same `seed` and `verifySeed`
(so `verification.before` is identical) and the same time budget; log gain, verdict, evaluations, real seconds; apply the winner
(then run the other from the new state to see if it adds). Log in ab_log.jsonl. Plus overall: the winner becomes the run's default.
Prior hypotheses from reports: directedBuild = class layer (+arrival re-plan, boss prep with objectiveGuard), no equipment search (but
build 49 defaults autoEquipmentRun FULL); gaSearch = equipment+jewel+class search, 87 % of real time.

## Recipe (from reports)
1. Hand opening (9 calls), skip D1 tuning. 2. Re-plan on new gate floor / stall: tuning(6 chars, tuning-first) -> A/B pair.
3. Bosses: bossDamage first, then success with objectiveGuard {bossDamage}; attack only at route >= 5 %, boss-only >= 45 % (never route 0 %).
4. Farm early with a surviving build (D6 5f-4 -> Lv27, D7 5f-3 -> Lv30), Lv30 breakpoint, re-tune after Lv30.
5. Loop = hl2.py (exact heal, one elapsed per loop). Re-plan every NST=6 obs.

## Targets
D8 boss <= 14 d, <= 2,800 calls, < 7 h real.
