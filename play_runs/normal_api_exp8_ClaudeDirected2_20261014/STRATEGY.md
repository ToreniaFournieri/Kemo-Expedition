# ClaudeDir2: v0.10.1 (48) Normal API strategy -- "directedBuild INSTEAD of gaSearch"

Written before signup, 2026-10-14. Real-time limit 8 h. Goals: (1) D8 boss, (2) least in-game time, (3) fewest API calls.
Read: ClaudeDirected (b47) 15.73 d / 2,862 calls (directedBuild + GA); ClaudeTune3 (b44) record 11.63 d / 2,511 (tuning + GA).

## Concept
- `gaSearch` is NOT used at all. No twin / emulator / proxyopt / hpopt. Optimizer = in-game `directedBuild` (+ `applyBuildChanges`),
  `simulationRun` meter, and `stagedEquipmentTuning` kept as a cheap secondary step (it is not the GA; reported separately).
- Question: can directedBuild alone (free, effort high, long budget, soft/strict directions, objective success/bossDamage) replace the GA?
  Compare against ClaudeDirected's GA-assisted free/tune/GA recipe: where it stalls, what does the GA add (equipment/jewel search)?
  Note directedBuild already runs autoEquipmentRun per candidate (autoEquipmentScope changedOnly|allTargets) - test allTargets at walls.
- Build 48 spec changes to try: timeBudgetSeconds up to 600; `directionStrictness soft`, `autoEquipmentScope`.

## Plan
1. Hand opening (lord/guardian + 3 ninja/ranger + alchemist/wizard, Mirage) - the known fastest D1 (0.30 d / 69 calls).
2. Gate loop = hl2.py with AUTOGA: re-plan every 6 obs = directedBuild free (high) -> (tuning 4,2,3,5) -> second directedBuild free with
   autoEquipmentScope allTargets / different seed if route < GATH.  Route-first at bosses; attack only at route >= 5 % and boss-only >= 45 %.
3. Bosses: directedBuild bossDamage (free), then success pass; guard the 0 % route trap.
4. Farm D6 to Lv30 early with a surviving build (success free directedBuild at 5f-3/5f-4).
5. Log every directedBuild (dir_log.jsonl) with before/after/verdict/evals/real seconds.

## Targets
D8 boss <= 15 d, <= 2,800 calls, < 7 h real.
