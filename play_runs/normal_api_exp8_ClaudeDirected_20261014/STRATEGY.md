# ClaudeDirected: v0.10.1 (47) Normal API strategy -- "directedBuild in the game"

Written before signup, 2026-10-14 04:55 UTC (13:55 JST). Real-time limit 8 h (until about 12:52 UTC).
Goals, in order: (1) D8 boss, (2) least in-game time, (3) fewest API calls, (4) 8 h real time.
References read: ClaudeTune3 (b44) 11.63 d / 2,511 calls (record, in-game tools); ClaudeTune5 (b45) 18.21 d / 3,404 (D1-D4 best: 2.05 d / 628 calls);
ClaudeTune4 21.28 d; ClaudeItem (b33, twin) 12.67 d / 1,786. Machine: macOS (Apple Silicon), Electron from repo node_modules, dist rebuilt from HEAD (build 47).

## Concept
Test the new in-game `read/build/party/{p}/directedBuild` (build 47) and `applyBuildChanges` (replaces `applyBuildResult`; the client sends the search's
`changeSummary` + `basis` + `verdict`). In-game tools only: `directedBuild`, `gaSearch`, `stagedEquipmentTuning`, `simulationRun`, status reads.
No twin, emulator, proxyopt or hpopt. Earlier reports are knowledge only.

Questions to answer:
1. Does `directedBuild` replace the hand-made 9-call opening? (D1 target: <= 0.30 d / 69 calls, the Tune5 value.)
2. Which direction (`rapidRanged`, `magicBurst`, `meleeBurst`, `balance`, `turtle`, `free`) wins at which stage (gate floors, bosses)? Directions are read-only, so
   they can be compared on the same save revision with the same `seed` (1 call each, 0 game time).
3. Does the class-level search (race/gender, main/sub class, unique) find what `gaSearch` (equipment + jewels + class) and tuning miss at a wall?
4. Where does it overlap `gaSearch` with mainClass/subClass changeable, and which is faster for the same forecast gain?
5. Bugs / concerns: composition handling, Support dup rule, Felidian+ninja rule, `basis` staleness, `verdict` check at apply, time budget behaviour.

## Run plan
1. Signup, read the fresh party, `directedBuild rapidRanged` (all 6 targets, order + unoccupied deities, `autoEquipmentRun` currentSetting,
   scope global), apply with `applyBuildChanges`, then the Tune5 gate loop (`hl2.py`: exact heal with `secondsToNextCycle`).
   If the forecast looks clearly worse than the known opening (lord/guardian + 3 ninja + alchemist, Mirage) I fall back to it and record why.
2. Re-plan = (a) `directedBuild` with the direction that fits the bottleneck (class layer), (b) tuning on attackers 4,2,3,5, (c) big full-component `gaSearch`
   when the route stays < ~85 %. Skip D1 tuning (known `noItem`).
3. Bosses: `bossDamage` objective for directedBuild/GA, then `success` passes; attack at boss-only >= 45 % and route >= 10 %.
   Do not run a `progress`-scored GA while the route is exactly 0 % (Tune5 trap).
4. Grind: re-plan every 6 observations (NST=6); farm D6 5f-3 from Lv23-24 with a surviving build to Lv30; D7 at Lv30 new slot -> re-plan at once.
5. Keep GA/directed budgets <= 180-240 s; one loop is ~1 s real, GAs are the real-time cost.

## Targets
- D8 boss <= 14 game days, <= 2,800 calls, < 7 h real.

## Record
- `notes.md` (per-boss notes, bugs), `batch_calls.jsonl` (every request), `dir_log.jsonl` (every directedBuild), `ga_log.jsonl`, `tune_log.jsonl`.
