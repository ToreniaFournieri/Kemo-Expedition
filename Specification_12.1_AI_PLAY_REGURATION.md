## 12. AI Play

### 12.1 AI Play Regulation

#### 12.1.1 Rules

1. Starting conditions

   * Start from a fresh Desktop Orca play session.
   * Do not import or reuse any existing save data.
   * Game mode: `mode.orca`
   * Enemy Level Offset: `+5`
   * Debug Mode: `OFF`

2. Access restrictions

   * Gameplay actions and game-state inspection must be performed through the official API only.
   * The following are prohibited:

     * UI-based gameplay
     * Debug tools
     * Direct save-data access
     * Direct calls to internal runtime functions

   * The following are allowed:
     * Access to the entire repository, including source code, specifications, tests, documentation, and **reports from previous AI Play runs**.

3. Goal

   * Defeat the normal Expedition 1 boss within 200 counted API calls.
   * Gods Battles are prohibited.

4. Score

   `Score = (counted API calls × 10) + actual sorties + failure penalty`

   * Lower scores are better.
   * Failure penalty:

     * `100,000` if the goal is not achieved within the 200-call limit.
     * `0` if the goal is achieved within the limit.
   * Actual sorties:

     * Every completed actual sortie attempt counts as `1`.
     * This includes:

       * Turn-backs
       * Draws
       * Retreats
       * Defeats
     * A defeat does not add any additional scoring penalty.
     * Normal gameplay consequences of defeat still apply.

5. Simulation

   * Forecast/simulation runs do not count as actual sorties.
   * Each simulation request counts as one counted API call.
   * Simulations must not:

     * Alter live progression.
     * Reveal future randomness that would occur in the live game.

6. End condition

   * End the AI Play immediately after the API operation that successfully defeats the normal Expedition 1 boss.
   * If the goal has not been achieved, end immediately after the 200th counted API call.
   * Success on the 200th counted API call is valid.

#### 12.1.2 Reporting

* At the end of AI Play, save the report under `@AI_play_report`.

* Report filename format:

  `<Score>_<Version>(<Build>)_<Concept>_<YYYYMMDD>.md`

  * Format Score as a six-digit, zero-padded integer.
    * Example: a score of `87649` becomes `087649`.
* Example filename:
  `105653_v0.9.6(7)_TestRun_20260906.md`

#### 12.1.3 API accounting and session lifecycle

* Regulation version: `1`. Each session records the game version/build and regulation version.
* Count one call for each authenticated, lease-owned gameplay request accepted by the serialized API dispatcher. Observation, build-options, retained logs, command, sortie, simulation, party-preview and catalog requests are gameplay requests. Invalid input, stale revisions, illegal actions and received idempotent retries count.
* Public/authenticated status, control acquisition/renewal/release, and evaluation-summary retrieval do not count. Authentication/lease failures and busy rejections occur before dispatcher acceptance and do not count. Exempt endpoints must not provide strategic game observations.
* One simulation request executes exactly 1,000 forecasts. There is no separate total forecast quota; every request still consumes a counted call.
* A sortie batch executes its exact requested count. If the boss is defeated before the batch ends, all completed sorties in that operation count. Finalize success after the complete operation, including on counted call 200.
* No background or AFK progression is allowed before the first request, between requests, during lease gaps, or after the evaluation ends. Normal saves created during this evaluation may be used to resume the same evaluation; they must not initialize a different evaluation.
* Organizer setup uses a new isolated desktop profile. `--ai-play=<Concept>` creates a new session; `--resume-ai-play=<EvaluationUUID>` opens its checkpoint on the identical version/build. Both require `--environment=orca`. The playing agent has no reset/import/start-evaluation API.
* Calls are reserved durably before execution. An interrupted reserved call still counts. Gameplay, random state, score results and idempotency receipts commit atomically; an uncommitted operation adds no actual sorties. Repeating a committed mutation with the same `Idempotency-Key` and identical request replays its result without executing gameplay again, but consumes another call while the evaluation remains active.
* Requests after termination are rejected without changing the frozen score. The final summary remains readable without an active lease.
* The desktop application writes an authoritative operation-ledger report into `AI_play_report` (packaged application: `Documents/BoKemo/AI_play_report`). The player may add strategy commentary after completion. Reports contain no tokens or hidden random state.

* Report filenames use the evaluation start date. If another evaluation already occupies the same filename, append the evaluation UUID to the Concept portion so neither report is overwritten.
