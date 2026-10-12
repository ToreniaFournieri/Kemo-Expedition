# ClaudeTune2: v0.10.1 (42) Normal API strategy -- "In-game stagedEquipmentTuning, round 2"
Written before signup, 2026-10-12. Goals: (1) D8 boss, (2) min in-game time, (3) min API calls, (4) 8 h real time.
References: ClaudeTune 15.00 d / 3,059 calls (b41, same concept), ClaudeItem 12.67 d / 1,786 calls (b33, twin tools, record),
ClaudeGA37 17.75 d / 3,448 calls (b37, GA only).

## Concept
Same as ClaudeTune, now on build 42: all gear planning with in-game tools only (`read/build/character/stagedEquipmentTuning`,
`gaSearch`, `applyBuildResult`, `simulationRun`). No twin / emulator / proxyopt / hpopt. Route knowledge from reports is allowed.
Build 42 changes to exercise: bossDamage = boss battle only from full HP (tuning bottleneck = boss room), rarer-side improvement
(accepts at 93 %+), progress fallback at 0 % success (`scoredBy`), quickRuns 300, cumulative finalTuning improvements,
simulationRun with `objective` + `seed` (+ `standardError`) that does not invalidate the kept result (so no more meter via gaSearch).

## Lessons carried over from ClaudeTune (what cost the time)
1. SEMI after applyBuildResult freezes gear -> re-plan the moment a gate stalls (hl.py AUTOGA/NST=2 does it).
2. Streak gates: below ~60 % per run FARM (EXP/drops) instead of grinding; extra sorties only at HP >= 95 % (HPF2=0.95).
3. Bosses: bossDamage is now cheap and exact (boss only): use simulationRun objective=bossDamage as the boss meter; run GA/tuning
   bossDamage until the boss `success` is > 0.5, then fight; arrival HP is separate (use success sim for the route).
4. D6 (4.3 d) and D8 (4.7 d) were 60 % of the run: farm 5f-3 at D6 / 3f-3 at D8 EARLY, Lv30 at D7 (slot unlock), 6309 on the rangers at D6 boss.
5. Strip new parties (removeAllEquipment x6, deity none) at unlock so PT1 keeps the drops; avoid FULL on hybrid classes.
6. Tuning only on attackers (4,2,3,5), only when the GA forecast is 15-80 %: ~250 calls saved. Observe every 6 loops.

## Plan
Opening (9 calls): lord/lord (1), guardian/guardian (6), ninja/ranger x3 (2,3,4: ursan, abyssal_sea, precise), alchemist/wizard (5: utopia,
introspective); order 6,1,4,2,3,5; deity Mirage. Loop = hl.py (HP aware). At each stall: wall.sh (GA all components global, then tune).
Targets: <= 13.5 d, <= 2,300 calls.

## What to test / look for
- bossDamage boss-only: does the tuning bottleneck equal the boss room? Does simulationRun bossDamage (new objective/seed/standardError) match tuning?
- Rarer-side improvement: accepts at high success? progress fallback at 0 %? quickRuns 300 time and winner's curse (step 5 vs step 6 gap).
- Cumulative finalTuning; simulationRun does not invalidate kept result; same seed reproducible; element switch pool, ability step (6309).
