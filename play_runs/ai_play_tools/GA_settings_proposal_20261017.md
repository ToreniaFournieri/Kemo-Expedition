# gaSearch settings proposal (2026/10/17)

For human review. The spec edits for the parts marked **[in spec]** are in `Specification_9.1.3_API.md` 2-3-2 and `Specification_9.1.4_API_DETAIL.md` **GA search**. The runtime is not changed yet.

## Data
* Source: every `gaSearch` result logged in the Exp8 Normal API runs (`ga_log.jsonl` / `ab_log.jsonl`), joined to the request parameters in `batch_calls.jsonl`.
  That gives 979 searches in 11 runs. Of those, 770 are `success` searches with all 7 components changeable, from 10 of the runs (the table below).
* Caveat: the runs differ in dungeon, level, and inventory, so most rows are not controlled comparisons.
  The cleanest pair is ClaudeTune4, which used the same population with both `quickRuns` values.
* "Good %" = share of `good`/`veryGood` verdicts. "Gain" = mean gain in points, counting non-improving searches as 0.
* "Hit TB" = searches that used at least 90 % of `timeBudgetSeconds`.

| Run | pop / quickRuns / TB | n | Gain | Good % | Evaluations | Sec | Hit TB | Mean start rate |
|---|---|---|---|---|---|---|---|---|
| Tune4 | 64 / **300** / 300 | 23 | **+17.6** | **87** | 911 | 307 | 23 | 0.39 |
| Tune4 | 64 / 100 / 240 | 12 | +10.2 | 58 | 1,507 | 246 | 12 | 0.25 |
| Tune4 | 64 / 100 / 150 | 26 | +7.3 | 50 | 866 | 157 | 26 | 0.33 |
| Tune4 | 64 / 300 / 180 | 6 | +8.9 | 50 | 513 | 187 | 6 | 0.25 |
| Directed | 64 / 300 / 300 | 6 | +24.5 | 83 | 1,944 | 303 | 6 | 0.08 |
| Directed | 64 / 100 / 180 | 35 | +13.4 | 63 | 3,135 | 180 | 33 | 0.41 |
| Tune3 | 64 / 300 / 300 | 53 | +13.1 | 70 | 1,959 | 302 | 53 | 0.32 |
| Tune2 | 64 / 300 / 300 | 46 | +14.7 | 59 | 2,177 | 302 | 46 | 0.29 |
| Tune5 | 64 / 100 / 180 | 73 | +12.3 | 62 | 3,698 | 176 | 66 | 0.37 |
| GP | 48 / 100 / 120 (`high`) | 64 | +12.7 | 66 | 1,671 | 86 | 15 | 0.49 |
| DG | 48 / 100 / 120 (`high`) | 76 | +11.9 | 62 | 1,578 | 83 | 13 | 0.41 |
| Tune | 48 / 100 / 90 (`high`) | 83 | +7.6 | 41 | 1,488 | 73 | 30 | 0.40 |
| GA37 | 48 / 100 / 90 (`high`) | 64 | +8.0 | 45 | 1,152 | 91 | 62 | 0.20 |
| Tune3 | 24 / 50 / 90 (`medium`) | 8 | +25.4 | 88 | 512 | 15 | 0 | 0.30 |

## Findings
1. **`quickRuns` matters most.** At a 40 % rate, one candidate's quick score has about ±4.9 points of noise at 100 runs and ±2.8 at 300.
   Real steps between neighbouring builds are often a few points, so at 100 runs selection partly follows luck.
   With the same population (Tune4), 300 runs gave +17.6 pt with 87 % good, against +10.2 pt with 58 % at 100 runs.
2. **The time budget is the real limit, not `generations`.** Every 64-population search hit its time budget; none reached 200 generations.
   At 300 runs a search needs about 300 s: at 180 s, Tune4's qr300 searches did no better than qr100.
3. **`high` stops on generations.** At 120 s, `high` used ~85 s on average and only 15 of 64 GP searches hit the budget. A larger budget alone buys nothing.
4. **`medium` is good value on easy floors.** It took 10-15 s with large gains when the start rate is moderate. The gp2 client's `ESKIP` rule (skip a search when E <= 8) covers most of these cases.
5. **Never varied in any run:** `mutationRate`, `eliteCount`, `tournamentSize`, `confirmTopN`, `confirmRuns`. There is no evidence about them either way.

## Proposal
* **[in spec]** Add `effort: max` = population 64, generations 200, quickRuns 300, confirmRuns 600, time budget 600 s.
  This is the best-measured setting (64/300/300) with the API's full 600 s, since it is time-bound.
  `confirmRuns` stays at 600 because the measured setting used 600.
* **[in spec]** `quickRuns` range 10 ~ 300 → 10 ~ 1000, the same as `stagedEquipmentTuning`. 300 was a binding cap in the best searches.
* **[in spec]** Return `generationsRun` and `stopReason` (`generations` / `timeBudget`), so a client can see which limit stopped the search. GP missed this for most of its run.
* **[in spec]** `seedBuilds`: up to 16 known builds (no equipment) enter the first generation as ordinary candidates, and `seeds` reports which were used, their quick score, and whether the best build kept them.
* **Not in spec (decide first):**
  * `high` preset: keep 48/80/100/600/180 for now. Changing it to quickRuns 300 needs about 300 s, which turns `high` into `max`. If you want one strong default instead, set `high` = 48/80/300/600/300.
  * Adaptive `quickRuns` (choose the runs from the current rate so the noise is about ±2.5 points: ~380 runs at 50 %, ~150 at 10 % or 90 %).
    This needs a new value type (`"auto"`), so it is left out until the fixed `max` has been tried.
  * `populationSize` cap 64: keep. Nothing ran above it, and the searches are time-bound, so a bigger population means fewer generations.
  * `timeBudgetSeconds` cap 600: keep. It matches the API request limit. Raise it only together with parallel candidate scoring (worker pool), which is a separate runtime proposal.

## Test plan for the untested parameters (offline, no live time)
* Pick about 10 walls from the logs (D4 3f, D5 5f, D6 4f/5f, D7 2f/boss gate, D8 4f; start rate below 50 %), using saves rebuilt from the run records with the ClaudeCharge emulator.
* Same save, same `seed` / `verifySeed`, `max` preset, one change at a time:
  `mutationRate` 0.2 / 0.35 / 0.5; `eliteCount` 1 / 3 / 8; `tournamentSize` 2 / 3 / 5; `confirmTopN` 3 / 5 / 10. Three seeds each.
* Score: the verified gain and the change in expected runs to the gate (`E(k) - E(c)`).
  Adopt a change only if it wins on at least 7 of 10 walls.

## Build templates for `seedBuilds`
* Source runs: AB, DG, Directed (both runs), and GP. These are the only runs whose searches could change race, classes, lineage, and predisposition.
  In the others, PT1 kept the hand opening.
  Their final teams all differ (Fertility is the only common deity), so store several templates per gate, not one "best".
* Store per destination and gate: the build values at the moment the gate opened or the boss died, plus the measured success rate and the party level.
  Rank them by success rate, and send the top 8-16 for the current gate as `seedBuilds`.
* Learn from `seeds[].inBest` and `quickRate` over later runs: drop templates that never survive.
