# Normal API expedition 8 run — 2026-10-03

The final result and advice are in `../../AI_play_report/v0.9.8(12)_CodexN8Oct03_Normal_API_Exp8Boss_20261003.md`. All game changes used the official API. The game source was unchanged.

## Recorded batch and timings

- `batch-inputs.jsonl`: ordered API requests, exact JSON inputs, HTTP method, route, phase, status, and `durationMs` for every call, including failures.
- `api-calls.jsonl`: the same journal with responses, timestamps, revisions, response sizes, and backup checksums. Authentication tokens are redacted.
- `api-call-timings.csv` and `api-operation-timings.csv`: individual timings and operation aggregates.
- `summary.json`: clock advancement, call counts, errors, phases, and timing definition.
- `equipment-test-batch.jsonl`: a successful equipment update extracted from the journal, suitable for timing a matching checkpoint replay.
- `final-save.bokemo`: the native API export after the boss victory. Earlier `checkpoint-*.bokemo` files capture equipment-search baselines.
- `search-*.json`, `caster-*.json`, and `D8-floor2-weight-sweep.json`: offline equipment experiments, validation forecasts, and selected builds. `candidate.json` is the last proposed build, not a replacement for the final save.

`durationMs` uses a monotonic clock from starting `fetch` until the entire response body arrives. It excludes JSON parsing, logging, offline simulation, and shell/tool overhead. HTTP request time and in-game time are different quantities.

## Validate or replay the batch

Run from the repository root. Validation is offline and does not advance a game:

```bash
node play_runs/2026-10-03_Normal_Exp8/batch-process.cjs
node play_runs/2026-10-03_Normal_Exp8/batch-process.cjs play_runs/2026-10-03_Normal_Exp8/equipment-test-batch.jsonl
node play_runs/2026-10-03_Normal_Exp8/summarize.cjs
```

For an equipment benchmark, first restore the checkpoint named in `equipment-test-manifest.json` into a separate disposable Normal profile through the game's supported backup import. Start its official API play session and log in with `client.cjs` using that profile's descriptor and a separate client-state file. Then execute:

```bash
export BOKEMO_PLAY_DESCRIPTOR=/tmp/disposable-play-descriptor.json
export BOKEMO_CLIENT_STATE=/tmp/disposable-client-state.json
export BOKEMO_ARTIFACT_DIR=/tmp/bokemo-equipment-replay
export BOKEMO_REPLAY_USER_ID=YourDisposableNormalAccount
node play_runs/2026-10-03_Normal_Exp8/batch-process.cjs play_runs/2026-10-03_Normal_Exp8/equipment-test-batch.jsonl --execute
```

The runner keeps the recorded parameters but replaces revision numbers and idempotency keys with fresh values from `Client`. It writes a separate request journal and `/tmp/bokemo-replay-timings.json`, which compares baseline and replay durations. Set `BOKEMO_REPLAY_OUTPUT` to change the comparison path. It skips historical failed requests by default; `--include-failed` includes them. `--phase=NAME` filters a larger batch. The manifest's forecast counts are the recorded reference, not an exact expectation for a new random simulation.

The full history is an audit trace rather than a guaranteed fresh-account recipe: future random drops can change which items exist. Use the matching checkpoint for equipment comparisons. Replay itself has not been executed against a second live profile during this run.

## Repeat the offline equipment experiment

```bash
node play_runs/2026-10-03_Normal_Exp8/build-twin.cjs
BOKEMO_PHASE=equipment-test BOKEMO_SEARCH_BUDGET=60 \
  node play_runs/2026-10-03_Normal_Exp8/search.cjs --backup
```

`--backup` makes one read-only API export, reconstructs the complete current save, and searches with the game's unchanged simulation and stat functions. Use `--checkpoint=checkpoint-683.bokemo` instead to reuse that local snapshot without another API call. Without `--apply`, it records a candidate and forecast only. Add `--apply` to commit the selected build to the logged-in profile, whose state must still match the snapshot. `tune-caster.cjs` performs a smaller caster class/equipment sweep. That script reserves equipment and jewels belonging to unchanged characters. `formation-test.cjs`, `support-tuning.cjs`, and `attacker-hp-test.cjs` isolate formation, tank gear, and attacker HP changes. The apply helper refreshes equipment after class changes because the API may remove incompatible items or excess slots.

Candidates share a changing seeded random stream for comparisons; final validation uses a different seed. The seed stream is local to the offline simulator and never controls the live game's RNG. A forecast is an estimate, not a promised outcome. Use `source-hashes.json` and the runtime version in `summary.json` when comparing future measurements.
