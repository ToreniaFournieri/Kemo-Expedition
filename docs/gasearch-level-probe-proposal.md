# Proposal: `gaSearch` level probe ("farm or search?")

Status: draft v3 for review (2026-10-16). Source: ClaudeDG report (build 52), `AI_play_report/v0.10.1(52)_ClaudeDG_Normal_API_Exp8Boss_DirectedVsGA2_20261016.md`.

Owner decisions so far:
* Probe the next equipment slot unlock level by default.
* Two purposes: `conquest` (open the next gate or beat the boss) and `farming` (repeat a route safely).
* Conquest is judged by the runs a goal needs (boss: 10 % kill rate is fine; a Clear-Gate needs N consecutive successes).
* Farming is judged by the defeat rate (ideal: under 10 %).
* `auto` runs whenever the result is below the target. Names `levelProbe` / `levelNeeded` accepted.

## Problem

At a real wall, `gaSearch` and `directedBuild` both return `noChange` or `noisy`, and the response cannot tell an AI player
whether any build fixes the wall. The players then keep re-planning:

| Run | Wall | Cost before farming | What fixed it |
|---|---|---|---|
| ClaudeDG (b52) | D6 boss gate, Lv26 | ~200 observations, ~470 calls, ~1.7 d | Farm to Lv30 (boss fell in 2 prep rounds) |
| ClaudeDG (b52) | D8 elite gate 4/5, Lv31 | noChange/noisy searches | Levels |
| ClaudeItem (b33) | D7, Lv30 | | "Lv30 D7 breakpoint" |

## Why the probe uses slot unlock levels

Level growth is mostly flat; the jumps come from the base equipment slots (2.1.1.1 `f.equipment_slots`,
`LEVEL_EQUIP_SLOTS` in `src/game/characterComputation.ts`):

| Level | 1 | 3 | 6 | 10 | 14 | 19 | 24 | 30 | 36 | 43 | 50 | 57 | 65 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Base slots | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 |

The DG walls match: at Lv26 the party had 7 base slots, and Lv30 (8 slots) broke the D6 wall. By default the probe
simulates the **next slot unlock level** only (Lv26 -> Lv30). A new slot is empty in the current build, so the probe
fills it (see Process).

## Conquest: expected runs to the goal

A Clear-Gate opens after `k` consecutive successful runs through X,3 (5.1.3.1; `ELITE_GATE_REQUIREMENTS` 1F 7, 2F 6,
3F 5, 4F 4, 5F 3; boss gate 2). In `applyClearGateOutcome`, a Clear or a deep Return counts, a shallow Return is
neutral, and Draw, Retreat, or Defeat resets the streak to 0. Beating the boss is the same with `k = 1`.

With a per-run success probability `p` (independent runs), the expected number of runs to finish a streak of `k`
from the current streak `c` is the standard run-length result:

```
E_j(p) = (1 - p^j) / ((1 - p) * p^j)        expected runs to reach a streak of j from 0
runs(p, k, c) = E_k(p) - E_c(p)              from the current streak c (E_0 = 0)
```

So one rule covers bosses and gates: **conquest target = expected runs to the goal <= a run budget `B`**. With
`B = 10`, the boss needs 10 % (the owner's value), and each gate gets its own required rate:

| Goal | k | Required success rate, B = 5 | B = 10 (default) | B = 20 |
|---|---|---|---|---|
| Boss | 1 | 20.0 % | **10.0 %** | 5.0 % |
| Boss gate | 2 | 55.8 % | **37.0 %** | 25.0 % |
| 5F elite gate | 3 | 78.2 % | **57.6 %** | 43.3 % |
| 4F elite gate | 4 | 91.6 % | **71.3 %** | 56.7 % |
| 3F elite gate | 5 | (needs 100 %) | **80.6 %** | 66.5 % |
| 2F elite gate | 6 | (needs 100 %) | **87.1 %** | 73.6 % |
| 1F elite gate | 7 | (needs 100 %) | **91.8 %** | 79.0 % |

`E_k >= k`, so `B` must be at least `k` (7 covers every gate); the API rejects a smaller budget.

Caveats, stated in the response, not hidden:
* The runs are treated as independent. HP carried between sorties makes a failure after a failure more likely, so
  the real count is somewhat higher.
* `p` comes from `confirmRuns` simulations; near the required rate the standard error matters. The probe reports
  `expectedRuns` computed from `p` and does not round it in the player's favour.

## Farming: defeat rate

Farming repeats a route, so the cost is defeats (a defeat leaves the party unusable for a long time), not missed
Clears. **Farming target = defeat rate <= 10 %** (the share of `Defeat` outcomes, as the `minDefeat` objective counts
them). Retreat and Return do not count as defeats.

## About `bossDamage`

Evidence from 10 reports that used it:
* As a **search objective** it works: it reliably raises the boss-only kill share (Tune runs: 0.42 -> 1.0 at D1,
  0.26 -> 0.84 at D2, 0.44 -> 0.97 at D6), and it gives a gradient where `success` is flat at 0 % (D1: 0 -> 49 %).
* As a **decision metric** it misleads: it simulates the boss room alone at full HP, so a `bossDamage` build is often
  a glass cannon whose route drops to 0 % (D5 14.6 -> 0 %, "1f-1 loses about 65 % HP"). Every run needed
  `objectiveGuard` or a later `success` pass, and the attack decision was always made on the route success rate.

So the probe never measures `bossDamage`. Boss conquest measures the success rate of the whole route including the
boss room (`k = 1`), whatever objective the search used. Whether `bossDamage` should stay as a search objective is a
separate question (it is a useful stepping stone, not a target).

## Proposed behavior (for 9.1.3 2-3-2)

### Request

New optional parameters in `gaParameters`:

* `levelProbe`
  * Optional. String. Default `auto`.
  * `auto`: run the probe when the result build misses the purpose's target.
  * `always`: always run it.
  * `off`: never run it. The response has `levelProbe: null`.
* `levelProbePurpose`
  * Optional. String. Default `conquest`.
  * `conquest`: open the next goal of the destination (the next closed Clear-Gate, or the boss when every gate is
    open). Target: `expectedRuns <= levelProbeRunBudget`.
  * `farming`: repeat the searched route. Target: defeat rate `<= levelProbeMaxDefeat`.
* `levelProbeRunBudget`
  * Optional. Number 7-100. Default 10. `conquest` only.
* `levelProbeMaxDefeat`
  * Optional. Number 0-100 (%). Default 10. `farming` only.
* `levelProbeSteps`
  * Optional. String. Default `slot`.
  * `slot`: the probed levels are the next base slot unlock levels (table above).
  * `level`: the probed levels are current+1, current+2, ...
* `levelProbeCount`
  * Optional. Integer 1-10. Default 1 for `slot`, 5 for `level`. How many levels the probe may try.
  * Levels above the level cap (2.1.1.1 `max_level`, currently 69) are never probed.

The probe does not depend on the search `objective`: `experience`, `minDefeat`, `bossDamage`, `success`, and
`progress` searches all get the same probe.

### Process

1. Take the result build: the best build when `verdict` is `veryGood` or `good`, otherwise the current build (a
   `noChange`, `noisy`, or `worse` result should not be applied).
2. Measure it at the current level first (this is the `auto` check), then for each probed level L in order:
   1. Copy the save with `party.level = L` (experience unchanged).
   2. Fill the slots that L opens: each character's newly opened slots get items from the free supply, chosen as the
      search's greedy fill does (attack-focused and durability-focused fill; keep whichever scores better on the
      quick runs). Existing equipment is not moved.
   3. Simulate with `confirmRuns` runs on `verifySeed` (the same seed for every level, so the points are comparable):
      * `conquest`: the route up to the goal. For a Clear-Gate, the route through X,3 of the gate (the `success`
        scope ending at `clearGate`); for the boss, the whole route including the boss room. `p` = success rate.
      * `farming`: the searched route. Defeat rate.
3. Stop at the first level that meets the target, or after `levelProbeCount` levels.
4. The probe's time is reserved inside `timeBudgetSeconds`, like the verification. If it runs short, it stops early
   and sets `truncated`.

### Response

New field `levelProbe` (object or `null`). Example (numbers are illustrative, not measured):

```json
"levelProbe": {
  "build": "current",
  "purpose": "conquest",
  "goal": { "kind": "bossGate", "required": 2, "current": 0 },
  "target": { "runBudget": 10, "requiredRate": 37.0 },
  "fromLevel": 26,
  "steps": "slot",
  "points": [
    { "level": 26, "baseSlots": 7, "filledSlots": 0, "rate": 12.4, "standardError": 1.9, "expectedRuns": 73.1, "experienceToLevel": 0 },
    { "level": 30, "baseSlots": 8, "filledSlots": 6, "rate": 44.0, "standardError": 2.9, "expectedRuns": 7.4, "experienceToLevel": 4210 }
  ],
  "levelNeeded": 30,
  "truncated": false
}
```

* `build`: `best` or `current` (Process step 1).
* `goal`: `conquest` only. The next goal as `clearGates` reports it (`eliteGate` with `floor`, `bossGate`, or `boss`),
  with `required` (`k`) and `current` (`c`).
* `target`: `conquest`: `runBudget` and the `requiredRate` it implies for this goal. `farming`: `maxDefeat`.
* `points`: the current level first, then one entry per probed level.
  * `baseSlots`, `filledSlots` (newly opened slots the fill could equip, whole party).
  * `rate`, `standardError`: `conquest` success rate; `farming` defeat rate (%).
  * `expectedRuns`: `conquest` only, `runs(p, k, c)`; `null` when `p` is 0.
  * `experienceToLevel`: EXP still needed to reach that level (`getXpToNextLevel`, 2.1.1.1).
* `levelNeeded`: the first level that met the target; `null` when none did (or the probe was truncated first).
* Facts only, no recommendation enum, like `forecast` and `verification`.

How a player reads it:

* `levelProbe` is `null` under `auto`: the result already meets the target at the current level.
* `levelNeeded` is set: farm to that level (or attempt now if `expectedRuns` at the current level is acceptable).
* `levelNeeded` is `null` with the default (next slot only): even the next slot does not fix it. Probe further
  (`levelProbeCount` 2+), or change classes, depth, or destination.

## Scope

* Phase 1: `gaSearch` only.
* Phase 2: `directedBuild` (its response is "same as `gaSearch`", so it gains the field with the same rules).

## Implementation notes

* `src/api/v1/gaSearch.ts`: after `summarizeVerification`; reuse `simulateOnce` with the objective's scope rules
  (`prepareObjectiveState`) for the goal's route; the slot fill reuses the greedy fill of `heuristicGenomes`
  restricted to the new slots and the supply rules of `decode`; add the probe's runs to the `reserveMs` reservation.
* Goal and `k`/`c`: `getNextLockedClearGateKey`, `getClearGateRequired`, `getClearGateProgress`
  (`src/game/clearGateCore.ts`); boss when it returns `null` and the boss is not yet beaten.
* Export a helper for the next slot unlock level from `LEVEL_EQUIP_SLOTS` instead of copying the table.
* Parameter parsing in `parseGaSearchRequest` (`knownParameters`, ranges).
* Contract: `scripts/generate-api-v1-contract.mjs` -> `desktop/api-v1-contract.json`.
* Docs: 9.1.3 2-3-2 (human-owned, wording above), then 9.1.4 (AI-owned).
* Build number and changelog.

## Tests

* `runs(p, k, c)`: `k = 1` gives `1/p`; table values above (B = 10); `c = k - 1` gives `1/p^k`;
  `p = 1` gives `k - c`; `p = 0` gives `null`.
* Deterministic for a fixed `verifySeed`.
* `levelProbe: off` -> `null`; `auto` with the target met at the current level -> `null`.
* `slot` steps: Lv26 probes Lv30; `levelProbeCount: 2` probes Lv30 then Lv36; never above the level cap.
* The new slot is filled (`filledSlots` > 0 with a free supply) and existing equipment is unchanged.
* `levelProbeRunBudget` below 7 is rejected.
* The probe uses the route success rate, not the boss-only share, for a `bossDamage` search.
* The response stays within `timeBudgetSeconds`; a short budget sets `truncated`.
* The probe changes no save state and no revision.

## Validation against a real wall

Replay the ClaudeDG D6 boss-gate state (Lv26) from `play_runs/normal_api_exp8_ClaudeDG_20261016/`. Expected: the
default probe misses the target at Lv26 and meets it at Lv30, matching what fixed the wall. Also check the D8 gate
4/5 state at Lv31 (the next slot is Lv36; see whether the probe asks for it or the wall was gear after all).
