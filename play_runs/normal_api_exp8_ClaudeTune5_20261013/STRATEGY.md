# ClaudeTune5: v0.10.1 (45) Normal API strategy -- "Tuning parameter study + early level farm"

Written before signup, 2026-10-13 14:07 UTC (23:07 JST). Real-time limit 8 h (until about 22:00 UTC).
Goals, in order: (1) D8 boss, (2) least in-game time, (3) fewest API calls, (4) 8 h real time.
References: ClaudeTune3 (b44) 11.63 d / 2,511 calls (record, in-game tools); ClaudeTune4 (b45) 21.28 d / 3,605 (gear walls, real-time bound);
ClaudeItem (b33, twin) 12.67 d / 1,786. Machine: macOS (Apple Silicon, 6 cores), Electron window, dist rebuilt from HEAD (build 45).

## Concept
In-game tools only: `read/build/character/stagedEquipmentTuning`, `gaSearch`, `applyBuildResult`, `simulationRun`, status reads. No twin, emulator,
proxyopt or hpopt. Earlier reports are knowledge only.
Test the tuning **parameters** that earlier runs left at their defaults (they are in 9.1.3 2-3-7 / 7.1.5):
`quickRuns`, `offenseElementCandidateCount`, `defenseElementCandidateCount`, `abilityCandidateCount`, `*TrialRuns`, `minImprovement`,
`minGateImprovement`, `offenseElementRequest`. Tune4 saw 79 of 274 tunings keep a step-5 candidate that step 6 rejected, and ~16 % accepted.
Questions: does a wider candidate list (count 3) or more trial runs raise accept rate or real gain? does a lower minImprovement (0.03)
with quickRuns 1000 reduce the winner's curse? Tuning is read-only, so variants can be run on the same save revision with the same `seed`
(paired comparison, no game time). Budget: a paired experiment at about 12 spots (1-3 extra calls each).

## Run plan
1. Opening (9 calls) as ClaudeTune3/4: lord/lord (1), guardian/guardian (6), ninja/ranger x3 (2,3,4), alchemist/wizard (5); order 6,1,4,2,3,5; Mirage.
2. Loop `hl2.py` (exact heal with `secondsToNextCycle`), observe every 6 loops; re-plan on a new first-gate floor (AUTOGA), seeded gate key.
3. Re-plan = tuning first (attackers 4,2,3,5), then big full-component GA only when route < ~85 % (quickRuns 100-150, budget 150-240 s).
   Right after arrival, repeat the GA until >= 85 % (Tune4 D3 lesson). Skip D1 tuning (`noItem`, known).
4. Bosses: `bossDamage` tuning, big `bossDamage` GA if boss-only < 85 %, then 1-2 `success` passes; attack at boss-only >= 45 % and route >= 10 %.
   Stop re-planning when two GAs in a row return noChange/noisy: grind the gate instead (Tune4: 1 game day, 1 real minute).
5. Levels: farm with a surviving build right after the D6 gates, straight to Lv30 (not Lv27 then again Lv30); depth from `probe.py`.
   Consider a D4 farm (4f-3/5f-3) before D5 if the D5 gates are walls (Tune3 did, Tune4 lost 1.2 d).
6. D8: re-plan per gate; farm 4f-3 if gate 5 is under ~30 %.

## Budget / targets
- Real time: GA ~90 % of API real time; cap GA at 150-240 s and ~40 big passes. Targets: D8 boss <= 14 game days, <= 2,800 calls, < 7 h real.

## Record
- tune_log.jsonl (every tuning with parameters, candidatesTried, bottleneckCounters), ga_log.jsonl, batch_calls.jsonl, notes.md (bugs, observations).
