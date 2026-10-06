# AI play tools (Normal-mode Application API runs)

Built during the 2026/10/03 D8-boss run (`AI_play_report/v0.9.8(11)_Claude_Normal_API_Exp8Boss_20261003.md`).

## client/ (Python, no dependencies)
* `t.py` – API client. Records **every call** (method, path, parameters, status, duration ms, in-game time) to `batch_calls.jsonl`
  in `$BOKEMO_PLAY_DIR`. `post()` adds `expectedRevision`/`idempotencyKey`, retries `stale_revision`, re-logs in on
  `control_lease_expired`. `export_save(path)` = `commit/setting/backup/export` (the exact account save in one call).
* `st.py` (12 h step + gate read), `runplan.py` (execute a call plan), `mkbatch.py` (jsonl -> batch json with per-endpoint stats),
  `replay_batch.py` (replay a recorded batch on a fresh account and compare durations), `ensure.sh` (restart the play Electron).
* Start the session: `BOKEMO_PLAY_USERDATA=<dir>/ud BOKEMO_PLAY_DESCRIPTOR=<dir>/desc.json electron scripts/run-api-play-session.cjs --environment=prod`.

## twin/ (Node, offline digital twin = the repo's real engine)
1. `node play_runs/ai_play_tools/twin/build.mjs` (from the repo root) bundles `src/` with esbuild into `twin/twin.mjs` (git-ignored).
2. Export the live save with `t.export_save('x.kemoz')` and load it: `T.loadSave('x.kemoz')` (`lib.mjs` re-exports the engine).
3. Seeded forecasts: `sim()` in `lib.mjs` (`simulateExpeditionRuns`, common random numbers). Same numbers as `read/expedition/{p}/simulationRun`.
4. Optimisers (`opt.mjs`): `climb2` (two-stage hill climb), `anneal`, **`genetic`** (population, per-character crossover with pool repair,
   mutation = slot replace / swap / jewel moves, elitism, quick+confirm fitness). `planCalls()` turns the best genome into the minimum API
   call list (removeEquipment -> equip array in slot order -> jewelAttach/Remove); `replay.mjs` verifies the plan offline.
5. Objectives: `gate.mjs` (exact `k*ln(P(success))` for a gate stage, plus boss), `bossonly.mjs` (single-room fights for a smooth damage
   signal), `stageopt.mjs`, `wall.mjs` (sortie based, see report caveat). Driver: `wallopt3.mjs <save> <dungeon> <stage> <seed> <gens> <out> <startPlan> <scenario>`
   with env `ALGO=ga|sa|climb`, `OBJ=gate|boss|bossonly|room|stages|combo`, `NQ/NC` (quick/confirm sample sizes), `LAMBDA` (call-count penalty).
6. Executing a plan: `python3 client/runplan.py plan.json`.

## Additions (2026/10/04 ClaudeRace run, `AI_play_report/v0.9.8(12)_ClaudeRace_Normal_API_Exp8Boss_20261004.md`)
* **HP cache fix**: `computePartyMaxHp` caches by `party.characters` array identity; `lib.sim()`, `bossonly.mjs`, `wall.mjs` and `hpopt.mjs` now
  replace the array before evaluating, otherwise in-place gear edits keep a stale party HP (all earlier searches undervalued HP items).
* `race.mjs` env for every driver: `RACE="cid:race:main:sub:lineage:pred;..."`, `ORDER=1,4,2,3,6,5`, `DEITY="Goddess of Precision"`.
* `SIDE=1` (opt.mjs/wallopt3): pool the equipment held by other parties; `planCalls` prepends `removeEquipment` only for taken slots.
* `wallopt3.mjs` `NOELEM=fire,ice` (ban elements) and `FORCEEL=el/ids/cats` (same-category re-gear ranked by attack).
* `proxyopt.mjs save out "4,2,3,5" "fire:1.5,ice:0.8,thunder:0.3,none:1" [start]` – deterministic attacker optimizer (attack x distinct-bonus
  amplifier x element weight x expected hits) + greedy jewel pass, ~1 s. `BAN=thunder` strips banned elements first.
* `hpopt.mjs save out "1,6" [start] [wdef]` – greedy party-HP (+defense) gear for supports.
* `lever.mjs save d f N "label|DEITY|RACE" ...` – cheap-lever sweep (deity/race/class, `PLAN=` to apply a plan first).
* `racetest.mjs`, `roomtab.mjs` (per-room table of a gate stage), `bosslog.mjs`, `pstats.mjs`, `give.mjs`, `armor.mjs`, `tankfill.mjs`.

## Additions (2026/10/06 ClaudeSlot2 run, `AI_play_report/v0.10.1(3)_ClaudeSlot2_Normal_API_Exp8Boss_20261006.md`)
* `twin/dmgplan.mjs save d N plan` – boss-only damage fraction / kills / reach for a call plan (honours `SIDE=1`, `RACE`, `DEITY`). Use it to judge `proxyopt`/`hpopt` plans in seconds.
* `twin/dmgspec.mjs save d N "label|RACESPEC|ORDER|DEITY" ...` – same metric for race, order or deity levers (race spec order is `cid:race:main:sub:lineage:pred`).
* `twin/roomfight.mjs save plan d N` with `FL=<floor> RM=<room>` – per-attack damage log of one non-boss room (elite blockers).
* `client/auto.py <dungeon> <steps> <seconds>` – step + observe loop, stops when every PT1 gate is `godGate` or the list is empty (then verify with an export).
* `client/runplan2.py plan.json <startIndex>` – tolerant plan runner (continues after a failed call, prints which one failed).
* Biggest lesson: run `proxyopt.mjs save out "5" ...` (caster) and `"4,2,3,5"` (attackers) plus `hpopt.mjs` before any GA; the GA missed a starved caster at D7.
