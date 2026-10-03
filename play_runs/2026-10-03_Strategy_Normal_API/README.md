# CodexBurst1003: selected Normal API run assets

[Run report](../../AI_play_report/v0.9.8(12)_CodexBurst1003_Normal_API_Exp8Boss_20261003.md).

Expedition 8 boss defeated on v0.9.8 (12), prod, Normal. The stopped clock consumed **46.25 game days**; **595 API attempts** include verification. The boss died between days **46.125 and 46.25**. Its exact winning battle log was not retained.

| Published asset | Use |
| --- | --- |
| [STRATEGY.md](STRATEGY.md) | First-strike run concept written before signup; useful starting point for another AI |
| [victory-proof.json](victory-proof.json) | Checked boss flag, public offset ceiling/gate evidence, time bounds, final party stats, and local save hash |
| [summary.json](summary.json) | Request totals, route frequencies, errors, and measured API duration |
| [timings.csv](timings.csv) | Per-request route, HTTP status, duration, revision, and game clock for call-economy analysis |

The full saves, raw responses, request bodies, candidate loadouts, and exploratory scripts are retained locally and are not published in this PR. `LOCAL_ARCHIVE.md` is a local-only index of those files.

595 attempts = 587 successes + 6 HTTP errors + 2 unanswered login attempts. Calls 537–538 have approximate start timestamps and unknown durations. The 593 completed requests total 92.037 measured seconds. Timeout waits are included in wall time. No progression occurred after winning call 590.

The proof JSON records verified observations and final stats; it does not contain the native save itself. Its save SHA-256 identifies the retained local export. Native simulation forecasts in the report were run offline and did not alter the live account's RNG or game source.
