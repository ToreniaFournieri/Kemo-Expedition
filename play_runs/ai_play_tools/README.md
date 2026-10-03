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
