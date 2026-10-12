# ClaudeTune3: v0.10.1 (44) Normal API strategy -- "Counter tuning"

Written before signup, 2026-10-12 20:30 JST. Real-time limit 8 h (until about 04:20 JST).
Goals, in order: (1) D8 boss, (2) least in-game time, (3) fewest API calls, (4) 8 h real time.
References: ClaudeTune (b41) 15.00 d / 3,059 calls; ClaudeTune2 (b42) 17.2 d / 3,351 calls; ClaudeItem (b33, twin tools) 12.67 d / 1,786 calls (record).

## Concept

Test the in-game `read/build/character/stagedEquipmentTuning` as it is now (build 44): step 4 tries counter abilities of the
bottleneck room first (7.1.5.1: enemy-ability counters such as `a.illusion-breaker`, `a.null-counter` (party-wide), `a.pursuit`,
and terrain counters such as `a.true-sight`, `a.domain-breaker`, `a.equation-breaker`, `a.output-stabilizer`, `a.mana-ward`, `a.defiance`).
All planning uses in-game tools only: `stagedEquipmentTuning`, `gaSearch`, `applyBuildResult`, `simulationRun`. No twin, emulator,
proxyopt or hpopt. Knowledge from earlier reports is allowed.

## Tuning-first re-plan (the test)

At each wall (a streak gate that stalls, or a boss that opens):
1. Tune the attackers first (cheap: about 2-6 s and 1 call each). Objective `success` on gates, `bossDamage` at bosses
   (boss room = bottleneck, so the counter map is tested against the boss's abilities).
2. Apply accepted results (1 call each). Measure with the result's own `after`; no extra meter.
3. Only if the gate is still weak (< about 30 % per run) or nothing was accepted, run a full-component `gaSearch`
   (medium early; big pop 64 / gen 200 / 300 s from D5) and then tune once more where the bottleneck room has a counter
   (D6 floors 3-6, D8 floors 1, 2, 5, illusion/defender bosses).
Floor terrains with a counter: D1 f3 fog, f6 tailwind; D2 f3 vine-snare, f5 crystal-zone, f6 floor-domain; D3 f2 silence-field,
f3-4 rough-waves; D4 f1/f5 dry, f2 heavy-wind; D5 f3 ash-haze, f6 fortified; D6 f1 burrow, f3 deletion, f4 machine-logic,
f5 cap-domain, f6 echo-domain; D8 f1 mana-burn, f2 gravity, f5 suppression.

## Lessons carried over

1. Opening (9 calls): lord/lord (1), guardian/guardian (6), ninja/ranger x3 (2,3,4), alchemist/wizard (5); order 6,1,4,2,3,5; Mirage.
2. Loop `hl.py`: K=3, HPF 0.97, HPF2 0.95, observe every 6. SEMI after apply freezes gear: re-plan as soon as a gate stalls.
3. Streak gate below about 60 % per run: farm (EXP and drops) at a lower depth instead of grinding.
4. Bosses: `bossDamage` (boss only, full HP) for the boss, `success` for the route. Do not run a `bossDamage` GA while the route
   is under about 30 %. Stop at the first boss Clear (a `godGate` appears).
5. Level breakpoints: Lv27 at D6, Lv30 at D7 (new slot); farm with an `experience` GA at 5f-3 when stuck.
6. Free every new party's gear at unlock (`freept.py`), so PT1 gets the drops.
7. Depth ladder when `success` is flat at 0 %: 5f-4 / 5f-3 first, then `all`.

## What to record

- Every tuning: accepted, improvement, scoredBy, bottleneck room, recorded ability candidates (is a counter first?).
- Accept rate by phase (before vs after a GA), and live gate change after an accepted tuning.
- Any bug or spec mismatch (e.g. API detail 9.1.4 step 4 text vs 7.1.5.1).

Targets: <= 15 d, <= 3,000 calls.
