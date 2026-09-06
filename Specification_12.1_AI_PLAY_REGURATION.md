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

* Example:

  `105653_v0.9.6(7)_TestRun_20260906.md`

