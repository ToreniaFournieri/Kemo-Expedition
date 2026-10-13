# ClaudeTune4: v0.10.1 (45) Normal API strategy -- "Tuning diagnostics + exact heal"

Written before signup, 2026-10-12 23:10 UTC (2026-10-13 08:10 JST). Real-time limit 8 h (until about 07:00 UTC).
Goals, in order: (1) D8 boss, (2) least in-game time, (3) fewest API calls, (4) 8 h real time.
References: ClaudeTune3 (b44) 11.63 d / 2,511 calls (record, in-game tools only); ClaudeItem (b33, twin) 12.67 d / 1,786 calls.
Machine: Linux cloud container, 4 cores, headless Electron under `xvfb-run` from the repo root (dist built from HEAD, build 45).

## Concept

Test the in-game `read/build/character/stagedEquipmentTuning` as it is now (build 45) and use only in-game tools
(`stagedEquipmentTuning`, `gaSearch`, `applyBuildResult`, `simulationRun`, status reads). No twin, emulator, proxyopt or hpopt.
Knowledge from earlier reports is allowed.

Build 45 is new for tuning and for the loop, so the run checks:
1. `candidatesTried` and `bottleneckCounters` (new tuning diagnostics): do they explain the D1 "nothing tried" case from
   ClaudeTune3, and do the counter statuses (`owned` / `tried` / `notTried` / `noItem`) match what the steps record?
2. `gaSearch` `success` verdict judged on `progress` when both builds are at 0 (`verification.scoredBy`): does a 0 % route GA
   now apply a real progress gain instead of `noisy 0 -> 0`?
3. `secondsToNextCycle` / `carriedSeconds` in `elapsed` and `sortie` responses: one `elapsed` of `max(60, secondsToNextCycle)`
   after a sortie should heal the party. That replaces the old HP-learning loop and its 90 s top-ups.

## Run plan

1. **Opening (9 calls)**, as ClaudeTune3: lord/lord (1), guardian/guardian (6), ninja/ranger x3 (2, 3, 4), alchemist/wizard (5);
   order 6,1,4,2,3,5; Mirage.
2. **Loop `hl2.py`** (new): one `elapsed` of `max(60, secondsToNextCycle)` per loop (exact heal, one natural run), then sorties:
   the first at full HP, extras (up to K) while HP >= HPF2 and a charge is left. No top-ups, no deity read.
   Observe every 6 loops; re-plan when the first gate floor changes or progress stalls.
3. **Re-plan (tuning first)**: tune the attackers (4, 2, 3, 5), apply what is accepted, then a big full-component GA
   (pop 64, gen 200, quick 300, confirm 1000, 300 s) only if the success rate is still under about 85 %.
   - Skip tuning in D1 except one diagnostic pass (check `candidatesTried`).
   - Skip `success` tuning when the route is at 0 % (progress-scored tuning was never accepted in ClaudeTune3), except spot checks.
4. **Bosses**: `bossDamage` tuning on each attacker, big `bossDamage` GA if the boss-only kill rate is under 85 %, then 1-3 big
   `success` passes until the route is about 10 % or more. Attack when boss-only >= 45 % and route >= 10 %.
5. **Farming** (the main time cost: Lv24 -> 27 for D6, Lv27 -> 30 for D7, about 1.5 M EXP):
   - Farm only with a build that survives; pick the depth with `simulationRun` (`success` and `expectedPerRun` EXP),
     not by habit. Start the D6 farm right after the D6 gates (ClaudeTune3 lost about 24 h on weak farms there).
   - Farm loops use extra sorties (K=3) at HPF2 about 0.85 when the depth is safe, since each charge is a free run.
6. **Level breakpoints**: Lv27 for the D6 boss, Lv30 for D7 (new slot: tune right after it).
7. **D8**: re-plan per gate; farm 4f-3 if gate 5 is under about 30 %.

## Budget

- Real time: the GA is the main cost (about 5 min per big pass). Keep to about 45 big passes.
- Targets: <= 11.5 game days, <= 2,300 calls.

## What to record

- Every tuning (`tune_log.jsonl`): accepted, gain, scoredBy, bottleneck, `candidatesTried`, `bottleneckCounters`.
- Every GA (`ga_log.jsonl`): verdict, `verification.scoredBy`.
- Loop: calls per loop, skipped sorties, whether `secondsToNextCycle` always heals.
- Bugs, spec mismatches, suggestions.
