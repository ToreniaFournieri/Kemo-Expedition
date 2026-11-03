# SlotBurst run evidence

Expedition 8 boss verified defeated on v0.10.1 (1) source/spec, fresh prod Normal account `SlotBurst1004`.

- Documented Clear: **33.143692 game days** (33d 3h 26m 55s).
- Stop clock: **33.166667 days**.
- Requests including verification: **533**, comprising **531 successes and 2 HTTP errors**.
- Measured HTTP duration: **70.766 seconds**. Signup-to-final-verification wall time: approximately **2h 41m**, plus setup.
- [Full report](../../AI_play_report/v0.10.1(1)_Codex_SlotBurst_Normal_API_Exp8Boss_20261004.md).

`STRATEGY.md` was recorded before signup. `calls.jsonl` logs every HTTP attempt without authentication credentials. `responses/` holds native response envelopes, excluding login responses. Official public exports have `.kemoz` extensions. No live save imports or edits were used.

Victory evidence:

- `victory.kemoz`: native boss flags 1–8 true, retained diary Clear at `2026-11-06T10:32:41.870Z`.
- `responses/0533.json`: native retained-log response for `diary:1793961161870-zjyv4f`.
- `winning_battle_log.json`: extracted native battle log; 24/24 rooms, enemy 387 defeated, 2,682 HP remaining.
- `run_summary.json`: timings, counts, final stats and boss room.

`final.kemoz` is the earlier pre-victory checkpoint captured when the boss-entry gate opened. Use **victory.kemoz** for final proof.

`forecasts.jsonl`, `plan*.json`, and `tools/` retain local planning evidence and replayable play helpers. Invalid early gate-key/deity trials are identified in the report; do not treat every forecast row as valid evidence. `offline_d7_boss.json` and `offline_d8_boss.json` are diagnostic simulations, not live victory logs. Client authentication and control-lease state remain outside this folder under private `/tmp` storage.
