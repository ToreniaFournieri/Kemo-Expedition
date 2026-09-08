## 12. AI Play

### 12.1 AI Play Regulation

#### 12.1.1 Rules

1. Starting conditions

   * Start from a fresh isolated Desktop session in the selected `orca` or `normal` mode.
   * Do not import or reuse any existing save data.

   * **BoKemo orca:**
     * Game mode: `mode.orca`
     * Enemy Level Offset: `+5`
     * Debug Mode: `OFF`

   * **BoKemo normal:**
     * Game mode: `mode.normal`
     * Enemy Level Offset: `0`
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

   * Defeat the normal Expedition 1 boss within **20,000 counted API calls**.
   * Gods Battles are prohibited.

4. Score

   `Score = (counted API calls × 10) + actual sorties + failure penalty`

   * Lower scores are better.
   * Failure penalty:

     * `100,000` if the goal is not achieved within the 20,000-call limit.
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
   * If the goal has not been achieved, end immediately after the 20,000th counted API call.
   * Success on the 20,000th counted API call is valid.

#### 12.1.2 Reporting

* At the end of AI Play, save the report under `@AI_play_report`.

* Report filename format:

  `<Score>_<Version>(<Build>)_<mode>_<Concept>_<YYYYMMDD>.md`

  * Format Score as a six-digit, zero-padded integer.
    * Example: a score of `87649` becomes `087649`.
* Example filename:
  `105653_v0.9.6(7)_orca_TestRun_20260906.md`

* Report content must include:
  * A summary of the AI Play run.
  * The final build configuration of each party member.
    * Use the status table format defined in `@Specification_8.1_UI_FOUNDATIONS.md` , section `8.1.2.3 Status table format`.
  * A summary of API call commands issued during the run.


#### 12.1.3 API accounting and session lifecycle

* Regulation version: `2`. Each session records the game version/build, mode, regulation version and immutable rules ID `ai-play-v2-calls20000-score10-sortie1-penalty100000-exactbatch`. Resume must match all these fields; historical evaluations retain their original rules and are never reinterpreted.
* Count one call for each authenticated, lease-owned gameplay request accepted by the serialized API dispatcher. Observation, build-options, retained logs, command, sortie, simulation, party-preview and catalog requests are gameplay requests. Invalid input, stale revisions, illegal actions and received idempotent retries count.
* Public/authenticated status, control acquisition/renewal/release, and evaluation-summary retrieval do not count. Authentication/lease failures and busy rejections occur before dispatcher acceptance and do not count. Exempt endpoints must not provide strategic game observations while the evaluation is active. After termination, `/evaluation/report` provides the frozen final public observation, required status table, winning-operation summary and full ledger; `/evaluation/ledger` provides accounting entries only. Ordinary responses and `/evaluation` omit the ledger.
* One simulation request executes exactly 1,000 forecasts. There is no separate total forecast quota; every request still consumes a counted call.
* A sortie batch executes its exact requested count. If the boss is defeated before the batch ends, all completed sorties in that operation count. Finalize success after the complete operation, including on counted call 20,000.
* No background or AFK progression is allowed before the first request, between requests, during lease gaps, or after the evaluation ends. Normal saves created during this evaluation may be used to resume the same evaluation; they must not initialize a different evaluation.
* Organizer setup uses a new isolated desktop profile. `--ai-play=<Concept>` creates a new session; `--resume-ai-play=<EvaluationUUID>` opens its checkpoint on the identical version/build. Use `--environment=orca` for Orca and `--environment=prod` for Normal. The launcher mode must match the checkpoint. The playing agent has no reset/import/start-evaluation API.
* Calls are reserved durably before execution. An interrupted reserved call still counts. Gameplay, random state, score results and idempotency receipts commit atomically; an uncommitted operation adds no actual sorties. Repeating a committed mutation with the same `Idempotency-Key` and identical request replays its result without executing gameplay again, but consumes another call while the evaluation remains active.
* Requests after termination are rejected without changing the frozen score. The final summary remains readable without an active lease.
* The desktop application writes an authoritative operation-ledger report into `AI_play_report` (packaged application: `Documents/BoKemo/AI_play_report`). The player may add strategy commentary after completion. Reports contain no tokens or hidden random state.

* Report filenames use the evaluation start date. If another evaluation already occupies the same filename, append the evaluation UUID to the Concept portion so neither report is overwritten.

* Organizer setup may launch/resume the application, read its private connection handoff, and check authenticated readiness. This exception does not permit UI gameplay, DevTools, save inspection or hidden-state access. The official `npm run ai-play -- --mode=orca --concept=Example` launcher builds and starts the isolated session; `--mode=normal` selects Normal. Use `--resume=<UUID>` instead of `--concept` to resume. It prints only the path to a private credentials file and readiness information, never credentials. The file is created with exclusive ownership and mode 0600 in a private temporary directory and removed on exit. Wait for authenticated `runtime.status=ready` before acquiring control.
* After the end condition, report retrieval, commentary, lease release and application shutdown remain allowed. They cannot change gameplay or score. Automatic reports include the final status table and the first winning operation even when the last sortie in that batch was a defeat.
* Available-action flags reflect evaluation restrictions: Gods Battles are unavailable throughout evaluation; all gameplay actions are unavailable after termination. Selectable race catalogs and build validation must match UI selectability. Existing unique members may retain their own race.
