## 9. Environment

### 9.1 Desktop distribution

#### 9.1.3 API

* This section is maintained by humans.
* Core concepts:
  * Each Commit API request is atomic. If any supplied field or entry is invalid, no game-state change is committed.
  * API operations must share the same underlying game logic and validation logic as the UI.
    * Do not duplicate existing game logic specifically for the API.
    * Do not refactor or extract existing game logic solely to support the API unless required to avoid duplication or inconsistent behavior.
    * Implement only behavior that is specific to the API interface.

* Request/response types, defaults, query encoding, and examples are completed
  by 9.1.4.14. UI preference ownership is defined in 9.1.4.17; external delivery
  uses 9.1.4.15. These contracts do not change the referenced gameplay rules.

```text
React UI ── typed in-process adapter ─┐
Desktop ─── desktop bridge ───────────┼── Application API
AI / CUI ── HTTP/JSON adapter ────────┘         │
                                                ▼
                                   Progress/Game Authority / Reducer
                                                │
                                                ▼
                                           Persistence
```


**Item Format**
* The following compact item format is used throughout this API.
* Format:
  * With item: `<lockStatus>/<itemId>/<enhancement>/<superRare>`
  * No item: `0`
  * `lockStatus`: `0` = unlocked, `1` = locked.
  * `itemId`: See `Specification_3.2_ITEM_MASTER_DATA.md`.
  * `enhancement`: `0–6`, or `?`. See `enhancement title` in `Specification_1.2_CONSTANTS_GLOBAL.md`.
  * `superRare`: `0` = none; `1–N`, or `?` : Represents the corresponding `superRare` title defined in `Specification_1.2_CONSTANTS_GLOBAL.md`.
    * N represents the highest currently defined superRare ID and may increase in future versions.
* Example:
  * `0/1101/2/0`
  * `1/1211/0/14`
  * `0`

**Item category**
* `Item category` filter.
* Allowed values:
  * `sword`
  * `katana`
  * `archery`
  * `armor`
  * `gauntlet`
  * `wand`
  * `robe`
  * `shield`
  * `bolt`
  * `grimoire`
  * `catalyst`
  * `arrow`
  * `jewel`
* Display names may use the corresponding `party.categoryShort` i18n labels.
* Example: `sword`.

**Valid Options**
* `validOptions` contains values currently accepted by the
  corresponding Commit API.
* Availability must reflect the current game state, unlock state,
  environment, and other runtime conditions.
* Values returned by `validOptions` may be used directly with the
  corresponding Commit API.


##### 9.1.3.1 API endpoint list

`/api/v1/`

```
1. Fundamental

1-1. fundamental/status

1-2. fundamental/signUp

1-3. fundamental/logIn

1-4. fundamental/logOut


2. Read

2-1. read/observation
     compact
     overview
     expedition
     party
     base
     diary
     setting
     popupEventStream


2-2. read/expedition
     {p}/setting
     {p}/latestBattleLog
     {p}/simulationRun
     {p}/chargeStock

2-3. read/build
     party/{p}
     party/{p}/gaSearch
     party/{p}/directedBuild
     character/status
     character/equipment
     character/equipmentSet
     character/equipmentEvaluation
     character/stagedEquipmentTuning

2-4. read/base
     searchItems
     jewelPriorityParty
     shopInfo
     shopItemsList
     altarInfo
     enemyFormList

2-5. read/diary
     {p}/diarySetting
     diaryEntry/{diaryEntryId}

2-6. read/setting
     enemyEditPane
     modeSelect
     debug
     delivery/{deliveryId}

3. Commit

3-1. commit/progress
     elapsed
     progressReport


3-2. commit/expedition
     {p}/changeExpedition
     {p}/sortie
     {p}/godsBattle
     {p}/resetStatistics 

3-3. commit/build
     party/{p}
     party/{p}/applyBuildChanges
     character/{characterId}/changeBuild
     character/{characterId}/removeAllEquipment
     character/{characterId}/removeEquipment
     character/{characterId}/equip
     character/{characterId}/lockEquipment
     character/{characterId}/unlockEquipment
     character/{characterId}/autoEquipment
     character/{characterId}/jewelAttach
     character/{characterId}/jewelRemove
     character/{characterId}/saveEquipmentSet
     character/{characterId}/loadEquipmentSet
     character/{characterId}/deleteEquipmentSet
     character/{characterId}/renameEquipmentSet
     character/{characterId}/undoEquipment
     character/{characterId}/redoEquipment

3-4. commit/base
     changeJewelPriorityParty
     sellInventoryItems
     purchaseShopItems
     paidShopRefresh
     unlockSoldItems
     unlockForm
     markItemsAsSeen

3-5. commit/diary
     {p}/diarySetting
     diaryEntry/markAsRead

3-6. commit/setting
     clairvoyanceReset
     modeSelect
     enemyEditPane
     feedback
     backup/export
     backup/import
     backup/reset
     debug
     markNewsAsRead
     uiPreferences


4. Help

4-1. help
     overview
     endpoints

4-2. resources
     developerNewsNotification
     donationBox
     clairvoyance/{p}
     glossary
     itemCompendium
     characterRoster
     bestiary
     superRareList

```

* Path Parameters

* {p}: Party number
  * Diary entry and diarySetting:
    * Valid values: 0–6.
    * 0 represents the global scope. only for diary entry
    * 1–6 represent PT1–PT6.
  * Others:
    * Valid values: 1–6.
    * 1–6 represent PT1–PT6.
* {characterId}: `characterId` Character ID.
* {diaryEntryId}: Stable Diary-entry ID.

##### 9.1.3.2 API requirement fundamental

**1. Fundamental**

**1-1. `fundamental/status`**

* Returns the current API and runtime status.
* Parameters: none.
* Return:
    * `systemStatus`
    * `versionBuild`
      * Format: `v<version> (<buildNumber>)`
  (for example `v0.9.7 (119)`)
    * `environment`

**1-2. `fundamental/signUp`**

* Creates a new API user and initializes a new game for that user.
* Note: This feature is only for API control in this version.

* Parameters:
  * `userId`
    * Valid format: `[A-Za-z0-9_-]{1,16}`.
    * If a user with the same `gameMode`, `levelOffsetForOrca`, and `userId` already exists, `signUp` fails and does not modify the existing save data.
  * `language`
    * Optional.
    * Default: `en`.
    * If a supported `lang` URL parameter is present, use its value instead.
      * Example: `lang=en`.
  * `gameMode`
    * Allowed values:
      * `normal` // `mode.normal`
      * `orca`  // `mode.orca`
  * `levelOffsetForOrca`
    * Optional.
    * Used only when `gameMode` is `orca`.
    * Default: `5`.
    * Valid range: `0–20`.
  * `environment`
    * Required.
    * Must satisfy the restrictions defined for the specified environment.

* Return:
  * `userId`
  * `environment`
  * `gameMode`
  * `levelOffsetForOrca`

* Save data path:
  * Normal:
    * `users/<environment>/normal/<userId>/`
    * Example: `users/desktop/normal/Taro/`
  * Orca:
    * `users/<environment>/orca<levelOffsetForOrca>/<userId>/`
    * Example: `users/orca/orca5/Lin/`

**1-3. `fundamental/logIn`**

* Parameters:
  * `userId`
  * `environment`
  * `headless`
    * Optional.
    * Default: `false`
    * Boolean.
    * In `headless` mode, the game UI is not mounted or updated. Game progression, API behavior, and persistence remain identical to normal mode.
  * `gameMode`
  * `levelOffsetForOrca`
    * Optional.
    * Used to identify the target account when multiple accounts exist with the same combination of `userId`, `environment`, and `gameMode`.
    * If multiple matching accounts exist and `levelOffsetForOrca` is not specified, the login request is rejected.

* Behavior:
  * Starts a game instance or acquires API control of the existing instance.
  * On successful login, advances the in-game time up to the current real-world time.
    * If the in-game time is already later than the current real-world time, no time advancement is performed.

* While logged in:
  * Normal real-time progression is paused.
  * Only API operations from the logged-in user may control or modify the instance.
  * The player may control the game through the UI, except for commit operations.
  * Other state-mutating controls are restricted.
* Note: This feature is available only for API control in this version.


**1-4. `fundamental/logOut`**

* Parameters: none.
* Ends the current API session and releases API control of the instance.
* After logout:
    * Normal real-time progression may resume.
    * API-exclusive control ends.
    * Other controls are no longer restricted.
* Note: This feature is only for API control in this version.

##### 9.1.3.3 API requirement read


**2. Read**

**2-0. Objectives and `objectiveGuard` (shared)**

* One definition for every operation that measures or searches a build: `{p}/simulationRun` (2-2-3, `objective` only), `party/{p}/gaSearch` (2-3-2), `party/{p}/directedBuild` (2-3-3), and `character/stagedEquipmentTuning` (2-3-8, with 7.1.5). Each operation states only where and how often it measures them.

* `objective`
  * Options: `success`, `minDefeat`, `bossDamage`, `experience`, `progress`. Default: `success`.
  * Each objective has a `<rate>`, measured on a simulation as in 7.1.5 Score, and a per-run variance as in 7.1.5 Luck check.

    | `objective` | `<rate>` | Better | Unit of `<gain>` |
    |---|---|---|---|
    | `success` | Success rate (clear + return) | Higher | Percentage points |
    | `minDefeat` | Defeat rate | Lower | Percentage points |
    | `bossDamage` | Average share of boss HP dealt in the boss battle; a win counts as `1` | Higher | Percentage points |
    | `experience` | Average EXP per run | Higher | Relative change (%) |
    | `progress` | Average over runs of `(rooms cleared + share) / rooms on the route` (7.1.5 Score), `0` ~ `1` | Higher | Percentage points |

  * Route: every objective except `bossDamage` simulates the current destination up to the depth limit or the first closed Clear-Gate (`forecast.scope`).
  * `bossDamage` simulates only the boss battle of the current destination. Each run starts it at full party HP; the rooms before it, the gates, and the depth limit are ignored. HP lost on the way to the boss is not counted; use `success` or `progress` to include it.
  * `success`: while successes are rare, `progress` breaks ties between builds, so a search still has a signal when every build is at `0`. When two builds compared with each other both have a success rate of `0`, the comparison is judged on `progress` instead (`scoredBy: progress`).
  * `progress`: rewards getting further along the route even when no run clears it. Use it at a wall where the success rate is `0` or close to it, or as a guard so a boss build keeps the route.

* `objectiveGuard`
  * Optional. Object. Default: none. Accepted by `gaSearch`, `directedBuild`, and `stagedEquipmentTuning`.
  * A minimum value on a second objective, so a search for one objective cannot ruin another.
  * Format: `{ "<guardObjective>": <minimum> }`, with exactly one member.
    * `<guardObjective>`: `success`, `bossDamage`, or `progress`. It must differ from `objective`.
    * `<minimum>`: Number, `0` ~ `1`, measured as the `<rate>` of that objective. For `success`, it is the success rate (not `progress`).
  * Examples:
    * `"objective": "bossDamage", "objectiveGuard": { "success": 0.05 }` searches for boss damage but keeps the full-route success rate at 5% or more.
    * `"objective": "bossDamage", "objectiveGuard": { "progress": 0.9 }` keeps the route open even when the success rate is `0`.
  * Guard ranking (used wherever builds are ranked with a guard):
    1. Builds that reach `<minimum>` rank above every build that does not.
    2. Among builds that reach it, the better `objective` `<rate>` ranks first.
    3. Among builds that do not reach it, the higher guard value ranks first; ties are broken by `objective`.
    * So when no build reaches the guard, the build that comes closest to it ranks first.
  * Guard rule for a result: if the current build reaches the guard and the result does not, the result is worse, whatever its `objective` gain.
  * The guard is measured only where an operation says so (usually on its confirmed candidates), on the same seed and number of runs as the `objective` score it is ranked with.

* `crossCheck`
  * A second objective measured on the current build and the result, returned by `gaSearch`, `directedBuild`, and `stagedEquipmentTuning`.
  * Format: `{ objective, before, after, minimum, reached }`
    * `objective`: the `objectiveGuard` objective when it is set. Otherwise: `bossDamage` when `objective` is `success`, `minDefeat`, `experience`, or `progress`; `success` when `objective` is `bossDamage`.
    * `before`, `after`: `<rate>` of that objective for the current build and the result, measured on the operation's final comparison runs. For `success`, the success rate.
    * `minimum`: the `objectiveGuard` minimum, or `null` without a guard.
    * `reached`: `{ before, after }`, Booleans, whether each build reaches `minimum`; `null` without a guard.
  * `crossCheck` does not change the outcome unless `objectiveGuard` is set.
  * Example: `"objective": "bossDamage"` with `crossCheck` `{ "objective": "success", "before": 0.04, "after": 0.0 }` shows a boss build that leaves the route at 0%.

**2-1. `read/observation`**

**2-1-1. `compact`**

* Provides a compact observation designed primarily for AI decision-making.

* Behavior:
  * Each request performs a fresh, private 100-run simulation for every unlocked party.
  * The simulations use the same game-state snapshot as the current facts returned by this request.
  * The simulation results are intended as an on-demand decision aid, not as a real-time monitoring or prediction mechanism.
  * Simulation results are not cached between requests and are not persisted.
  * Other observation endpoints do not trigger these simulations.

* Parameters:
  * `quick`
    * Optional.
    * Boolean.
    * Default: `true`.
    * If `true`, omits `latestSimulationResult` from the response.
    * If `false`, includes `latestSimulationResult` in the response.
    
* Return:
  * `globalInfo`
    * `gameMode`
    * `inGameTime`
      * Format: ISO 8601 datetime string.
      * Example: `2026-09-20T07:42:15+09:00`.
    * `gold`
    * `prana`
  * `partyInfo`
    * Each party:
      * `party`
        * `level`
        * `experiencePoint`
          * Format: `<percentage>/<current>/<nextLevel>`
          * Example: `10%/649907/6499070`
        * `deity`
        * `deityRank`
        * `condition`
          * Format: `<conditionKey>/<conditionValue>`
            * `conditionKey`: `terrible`, `poor`, `low`, `cautious`, `normal`, `steady`, `good`, `great`, and `excellent`
            * `conditionValue`:
              * Integer range: `-400` to `400`.
              * For condition thresholds and calculation logic, see section 7.2.2 AUTO progress logic.
          * Example: `steady/55`
          * Example: `low/-188`
      * `state`
        * Example: `state.rest`.
      * `clearGate`
        * Example: `4th Elite gate: 3/4`
      * `sideQuest`
        * Format: `<sideQuest>-<lv>: <progress>/<target>-<timeRemaining>/<timeLimit>-<startTimestamp>`
          * remainingTime and deadline are expressed in hours (h).
          * `startTimestamp` indicates when the side quest started.
        * Example: `q.exercise-2: 4/10-5h/12h-20261009 13:18` 
      * `lastDestination`
        * Example: `4`.
      * `lastOutcome`
        * Example: `defeated`.
* `attention`
  * `latestSimulationResult`
    * Fresh 100-run simulation summary for each unlocked party for this request.
    * This is a simplified simulation using 1/10 of the runs used by the full 1,000-run simulation.
    * Format:
      `<partyIdTag>/<clearPercent>/<returnPercent>/<drawPercent>/<retreatPercent>/<defeatPercent>`
    * Example:
      `["PT1 / Clear 51% / Return 0% / Draw 1% / Retreat 4% / Defeat 44%", "PT2 / Clear 0% / Return 20% / Draw 30% / Retreat 15% / Defeat 35%"]`

  * `emptyEquipmentSlot`
    * Characters that currently have one or more empty equipment slots.
    * Format:
      * `<characterId>/<numberOfEmptySlots>`
    * Example:
      `["102/1", "103/1"]`

  * `notification`
    * Each party:
      * `unreadDiary`
        * Number of unread diary entries.
        * Example: `2`.
      * `unreadDiaryTitle`
        * Compact list of unread diary entries.
        * Format:
          * `<diaryEntryId>/<diaryTitle>/<diarySubtitle>/<timeStamp>`
          * timeStamp: YYYYMMDD HH:MM
        * Example:
          `["120/Defeat Record/Leporian Moon Palace/20260916 22:04", "1/Epic acquired (Moon-Hare Aegis)/Leporian Moon Palace/20260916 21:52"]`

* `read/observation` does not modify game state.
* Diary entries remain unread until explicitly marked as read through the corresponding Commit API.

**2-1-2. `overview`**

* Parameters: none.

* Return:
  * `headerInfo`  
    * Global game information shared across the application.
    * `gameMode`
    * `inGameTime`
      * Format: ISO 8601 datetime string.
      * Example: `2026-09-20T07:42:15+09:00`.
    * `gold`
    * `prana`
    * `progressReportInfo`

**2-1-3. `expedition`**

* Parameters: none.

* Return:
  * `expeditionInfo`
    * Expedition-related information.
    * Currently displayed in the Expedition tab in the UI.

**2-1-4. `party`**

* Parameters: optional `partyNumber` and `characterId`; see 9.1.4.17.

* Return:
  * `partyInfo`
    * Party-related information.
      * `currentHP`: `8960`
      * `partyMaxHP`: `70790`
      * `partyLevel`: `11`
      * `experienceRatio`: `10%`
      * `xp_current`: `1200`
      * `xp_next`: `12000`
      * `deity`: `God of Fortification`
      * `deityRank`: `8`
      * `deityTotalDonation`: `785242`
      * `deityNextRankThreshold`: `1066102`
    * Currently displayed in the party tab in the UI.
    * Includes `statistics`.
    * `sideQuestStatistics`
      * Format: `<sideQuestId>-<successfulCount>/<cancelledCount>/<failedCount>/<totalCount>` for each side quest.
        * `cancelledCount`: Number of side quests cancelled by a player action, such as starting a sortie.
        * `failedCount`: Number of side quests that ended without achieving the required goal.

**2-1-5. `base`**

* Parameters: optional `pane`; see 9.1.4.17.

* Return:
  * `baseInfo`
    * Base-related information.
    * Currently displayed in the base tab in the UI.

**2-1-6. `diary`**

* Parameters: optional `partyNumber` and `diaryEntryId`; see 9.1.4.17.

* Return:
  * `diaryInfo`
    * Diary-related information.
    * Including `diaryEntryId` list with `partyNumber`
    * Currently displayed in the diary tab in the UI.

**2-1-7. `setting`**

* Parameters: none.

* Return:
  * `settingInfo`
    * Setting-related information.
    * Currently displayed in the setting tab in the UI.


**2-1-8. `popupEventStream`**

* Parameters: none.

* Return:
  * `popupInfo`


**2-2. `read/expedition`**
**2-2-1. `{p}/setting`**

* Parameters: none.

* Return:
  * `current`:
    * `destination`
      * Example: `3`.
    * `depthLimit`
      * Example: `5f-3`.
    * `difficultyOffset`
      * Example: `8`.
    * `destinationMode`

  * `validOptions`:
    * `destination`
      * Currently available destination IDs.
      * Example: `[1, 2, 3]`.
    * `depthLimit`
      * Currently valid range.
      * Example: `[1f-3, 1f-4, 2f-3, 2f-4, 3f-3, 3f-4, 4f-3, 4f-4, 5f-3, 5f-4, beforeBoss, all]`.
    * `difficultyOffset`
      * Currently valid range.
      * Minimum: `0`.
      * Maximum: `68`.
      * Step: `2`.

* Values returned by `validOptions` can be used directly with `{p}/changeExpedition`.

**2-2-2. `{p}/latestBattleLog`**

* Parameters: optional `logId` for a retained log referenced by a Diary entry.
  Omission selects the latest retained log of this party. See 9.1.4.14.

* Return:
  * `battleLog`
    * Latest battle log of the specified party.
  * `resources`
    * Supporting resources used to render the battle log, including:
      * Enemy names and snapshots for Bestiary bubbles.
      * Compact battle data used for narration.
      * End-event information and related display data.
  * `bottleneckEnemies`
    * Status information for enemies identified as bottlenecks.
    * An enemy is considered a bottleneck if either:
      * Damage taken is `>= 35%`, or
      * The battle outcome is `draw` or `defeat`.
    * If no enemy meets these conditions, returns an empty list.

**2-2-3. `{p}/simulationRun`**

* Runs the current expedition simulation `numberOfRun` times and returns the result.
* this does not advance progression, return rewards, consume live randomness, write Diary entries, change equipment, or consume charge.
* Use it to measure the current build without a search.

* Parameters: 
  * `numberOfRun`
    * Optional.
    * Default: 100.
    * Integer.
    * Range: 1 ~ 1000.
  * `objective`
    * Optional.
    * `success`, `minDefeat`, `bossDamage`, `experience`, `progress` (see 2-0).
    * When set, the response also returns `rate` and `standardError` for this objective.
      * `rate` is the `<rate>` of 2-0.
    * With `bossDamage`, only the boss battle is simulated (2-0), and `overview` and `detail` describe that battle.
  * `seed`
    * Optional.
    * Integer.
    * Default: random.
    * Fixed seed for a reproducible result. The same `seed`, `numberOfRun`, and `objective` on the same save revision give the same result.

* Return:
* `overview`
  * Compact summary of the simulation result.
  * Format:
    `<successPercent>/<drawPercent>/<retreatPercent>/<defeatPercent>`
    * This part does not distinguish between `clear` and `return` for simplification.
  * Example:
    `Success 87.6% / Draw 1.2% / Retreat 3.7% / Defeat 7.5%`
  * `detail`
    * Format:
      `<floorRoom>/<successPercent>/<drawPercent>/<retreatPercent>/<defeatPercent>/<notReachedPercent>`
    * Success means that the party wins the battle in that room.
    * Example:
      `["1f-1/Success 90.0% / Draw 4.1% / Retreat 2.0% / Defeat 3.9% / Not reached 0.0%","1f-2/Success 50.0% / Draw 10.0% / Retreat 20.0% / Defeat 14.1% / Not reached 5.9%"]`
  * `rate`
    * Returned only when `objective` is set.
    * Same unit as the `<rate>` of 2-0. `progress`: a value from `0` to `1`.
  * `standardError`
    * Returned only when `objective` is set.
    * `sqrt(variance / numberOfRun)`, with the per-run variance of 7.1.5 (Luck check).
  * `seed`
    * The seed used: the requested one, or the random one chosen. Send it again to reproduce the result.

**2-2-4. `{p}/chargeStock`**

* Parameters: none

* Return:
  * `chargeStock`
    * Current number of available charge stocks.
    * Example: `4`
  * `chargeDuration`
    * Remaining real-time seconds until the next stock under current speed settings.
    * If `chargeStock` is at the maximum stock level, return `0`.
    * Example: `12`


**2-3. `read/build`**

**2-3-1. `party/{p}`**

* Parameters: none.

* Return:
  * `current`:
    * `deityId`
      * Example: `restoration`
    * `order`
      * Array of `characterId` (character IDs) in party order.
      * Example:  `[101, 102, 103, 104, 105, 106]`

  * `validOptions`:
    * `deityId`
      * Example: [`restoration`, `attrition`] 
    * `order`
      * `characterId` (character IDs) currently available for party ordering.
      * Example:  `[101, 102, 103, 104, 105, 106]`

**2-3-2. `party/{p}/gaSearch`**

* Optimizes the party build for the current destination and depth limit.
* This does not advance progression, return rewards, consume live randomness, write Diary entries, change equipment, consume charge, or change the save revision.
* Request time limit: the response is returned within `timeBudgetSeconds` (at most 600 seconds), including the verification. The API waits at most 600 seconds for this request.

* Parameters:
  * `targets`
    * Required.
    * Array of characters to optimize. All specified characters must belong to the party identified by `{p}`.
    * Format: `[{characterId, changeableComponents}]`
    * For each target character:
      * `changeableComponents`
        * `raceGender`: Boolean
        * `mainClass`: Boolean
        * `subClass`: Boolean
        * `lineage`: Boolean
        * `predisposition`: Boolean
        * `equipment`: Boolean
          * If `false`, the character's equipment remains unchanged and cannot be removed to equip another character.
          * Locked equipment is never changed or taken.
          * Item jars: the search chooses items, not copies.
            * All copies of one item without a Super Rare title are one jar.
            * Each Super Rare title of an item is a jar of its own, because each title has its own bonuses.
            * A slot takes the highest-enhancement copy of its jar that is still available to that character. Characters take copies in party order.
            * So a lower-enhancement copy is placed only when every higher copy of the same jar is used or out of reach (for example, worn by another character under `normal`).
            * The current build is read the same way: a worn copy is replaced by a higher-enhancement copy of the same jar when one is available. With `equipment` but not `jewels`, the new copy has no Jewel.
        * `jewels`: Boolean
        * If a component cannot be changed due to character-specific restrictions (e.g., a unique character), ignore the corresponding setting.
  * `considerOrderChange`
    * Boolean.
    * Optional.
    * Default: `false`
  * `considerDeityChange`
    * String enum.
    * Optional.
    * Default: `none`
    * Options: `none`, `unoccupiedDeities`, `allDeities`
      * `none`: Does not consider changing deities.
      * `unoccupiedDeities`: Considers switching to any deity not currently in use by another party.
      * `allDeities`: Considers all deities, including those used by other parties.      
  * `considerItemsScope`
    * Optional.
    * Default: `normal`
    * Options:
      * `normal`: Candidate items come from the Inventory and the character's own equipment only. Other characters are never touched.
      * `withinTargets`: Candidate items come from the Inventory and from the equipment of the `targets` whose `equipment` is changeable. The search distributes these items among those targets as a whole. Characters not in `targets` are never touched. Locked items are never taken.
      * `global`: Candidate items come from the Inventory and from every character's equipment, including other parties. Characters not in `targets` give up only unlocked items, and a character that gives up an item keeps an empty slot. Locked items are never taken.
  * `objective`
    * Optional.
    * Default: `success`.
    * `success`, `minDefeat`, `bossDamage`, `experience`, `progress` (see 2-0, including the `success` tie-break with `progress` and the boss-battle-only `bossDamage`).
    * If both builds have a success rate of `0` in the verification runs, `verdict` is judged on `progress` (see `verdict`).
  * `objectiveGuard`
    * Optional. Format, guard ranking, and guard rule: see 2-0.
    * The guard is checked on the top candidates only: every candidate re-scored with `confirmRuns` is also measured on the guard objective with `confirmRuns` runs (the confirm seed), and the confirmed candidates are ranked by the guard ranking. Candidates scored only with `quickRuns` are ranked by `objective` alone.
    * Cost: one extra guard simulation per confirmed candidate, plus the guard measurement in the final selection and the verification.
    * See `verification.crossCheck` and `verdict` for how the result reports the guard.
  * `gaParameters`
    * Optional.
    * `effort` selects a preset. Values in the preset table are used unless they are specified explicitly.

    | `effort` | `populationSize` | `generations` | `quickRuns` | `confirmRuns` | `timeBudgetSeconds` |
    |---|---|---|---|---|---|
    | `low` | 12 | 15 | 30 | 150 | 15 |
    | `medium` | 24 | 40 | 50 | 300 | 60 |
    | `high` | 48 | 80 | 100 | 600 | 180 |

    | Parameter | Type | Default | Range | Description |
    |---|---|---|---|---|
    | `effort` | String | `low` | `low` / `medium` / `high` | Preset for `populationSize`, `generations`, `quickRuns`, `confirmRuns`, and `timeBudgetSeconds`. Explicit values override the preset. |
    | `populationSize` | Integer | From `effort` | 8 ~ 64 | Number of candidate builds per generation. |
    | `generations` | Integer | From `effort` | 1 ~ 200 | Number of generations to run. |
    | `quickRuns` | Integer | From `effort` | 10 ~ 300 | Simulation runs used to score every candidate. |
    | `confirmRuns` | Integer | From `effort` | 50 ~ 1000 | Simulation runs (different seed) used to re-score the top candidates. |
    | `timeBudgetSeconds` | Integer | From `effort` | 5 ~ 600 | Hard time limit for the whole request, including the final selection and the verification. The search stops early enough to finish them inside the limit, and then returns the best build so far. |
    | `verifyRuns` | Integer | `500` | 100 ~ 1000 | Simulation runs (new independent seed) used to compare the current build and the best build after the search. Used for `verdict` and `forecast`. |
    | `eliteCount` | Integer | `3` | 0 ~ populationSize / 4 | Best builds copied unchanged to the next generation. |
    | `mutationRate` | Number | `0.35` | 0 ~ 1 | Probability that a child build is mutated. |
    | `tournamentSize` | Integer | `3` | 2 ~ 8 | Number of candidates compared when selecting each parent. |
    | `confirmTopN` | Integer | `5` | 1 ~ 10 | Number of top candidates re-scored with `confirmRuns` each generation. |
    | `seed` | Integer | Random | Any integer | Fixed seed for a reproducible result. |
    | `verifySeed` | Integer | Derived from `seed` | Any integer | Seed of the verification runs only. The same `verifySeed`, `verifyRuns`, `objective`, and save revision give the same `verification.before`, so two searches on the same save (for example with different `seed` values or another endpoint) can be compared on the same verification runs. The search itself still uses `seed`. |
    | `maxChanges` | Integer | None (no limit) | 1 ~ 100 | Maximum number of entries in `changeSummary`. Builds that need more changes are not selected. |
    | `seedWithHeuristics` | Boolean | `true` | `true` / `false` | Adds heuristic attack-focused and HP-focused builds to the first generation. |

* Return:
  * `verdict`
    * Rating of the best build compared with the current build.
    * Judged on a separate verification simulation (`verifyRuns`, independent seed), not on the scores used during the search.
    * `<rate>`: the `<rate>` of the selected `objective` (2-0).
      * `success`: if the current build and the best build both have a success rate of `0` in the verification runs, `<rate>` is `progress` instead, because both would tie at `0`. If either build has a success rate above `0`, `<rate>` stays the success rate.
    * `<gain>`: improvement of `<rate>` from the current build to the best build, in the unit of 2-0 (percentage points; relative change for `experience`). For `minDefeat`, a lower rate is an improvement.
    * Standard error (SE) is computed from the before and after verification runs, with the per-run variance of `<rate>` (7.1.5 Luck check).
    * Values:
      * `veryGood`: `<gain>` is at or above the threshold (10 percentage points; 20% for `experience`), and larger than 2 SE.
      * `good`: `<gain>` is larger than 2 SE, but below the `veryGood` threshold.
      * `noisy`: `<rate>` differs from the current build by no more than 2 SE, in either direction. The difference may come from chance.
      * `noChange`: No different build was found. `changeSummary` is empty.
      * `worse`: `<rate>` is worse than the current build by more than 2 SE. `changeSummary` is still returned but should not be applied.
    * With `objectiveGuard`: the guard rule of 2-0 applies in the verification runs. If the current build reaches the guard and the best build does not, `verdict` is `worse`, whatever `<gain>` is.
  * `forecast`
    * `before`: `overview` of the current build (same format as `{p}/simulationRun`).
    * `after`: `overview` of the best build (same format as `{p}/simulationRun`).
    * With `bossDamage`, both describe the boss battle only.
    * `scope`
      * The part of the dungeon the forecast simulates. A forecast says nothing about rooms outside it.
      * Format: `{ "from": <floorRoom>, "to": <floorRoom>, "rooms": <number>, "endsAt": <reason> }`
        * `from`, `to`: first and last room simulated, in the `<floorRoom>` format of `{p}/simulationRun` `detail` (for example `1f-1`).
        * `rooms`: number of rooms simulated. This is also the room count `progress` (7.1.5 Score) is divided by.
        * `endsAt`:
          * `clearGate`: the route stops before the first closed Clear-Gate (that room is not simulated).
          * `depthLimit`: the route stops at the party's depth limit.
          * `dungeonEnd`: the route reaches the last room of the destination.
          * `bossRoom`: `bossDamage`; only the boss room is simulated (`from` and `to` are that room).
      * Example: `{ "from": "1f-1", "to": "1f-3", "rooms": 3, "endsAt": "clearGate" }`. A success rate of 99% then covers rooms 1f-1 to 1f-3 only, not the elite rooms behind the gate.
  * `verification`
    * The values the `verdict` was judged on.
    * Format: `{ objective, scoredBy, runs, before, after, gain, standardError, seed, verifySeed, progress, crossCheck }`
    * `objective`: the requested `objective`.
    * `scoredBy`: the score the verdict used: `objective`, or `progress` when `objective` is `success` and both builds have a success rate of `0` (see `verdict`).
    * `runs`: `verifyRuns`.
    * `before`, `after`: `<rate>` of the current build and the best build, in the `scoredBy` score.
    * `gain`, `standardError`: `<gain>` and its SE (see `verdict`).
    * `seed`: the search seed (`gaParameters.seed`, or the random one chosen).
    * `verifySeed`: the verification seed used. Send it as `gaParameters.verifySeed` to measure another search on the same verification runs.
    * `progress`
      * `{ before, after }`: `progress` (7.1.5 Score, `0` ~ `1`) of the current build and the best build in the same verification runs.
      * Always returned, even when `scoredBy` is not `progress`, so a client can see how far into `forecast.scope` the runs get.
      * `null` with `bossDamage` (only the boss room is simulated).
    * `crossCheck`
      * See 2-0. It is always returned, with or without `objectiveGuard`.
      * `before`, `after` are measured in `verifyRuns` runs on the verification seed, for the current build and the best build.
      * `crossCheck` does not change `verdict` unless `objectiveGuard` is set.
  * `changeSummary`
    * Ordered array of Commit API calls that turns the current build into the best build.
    * Each entry can be sent directly to the Commit API.
    * Format: `{ "endpoint": <Commit API path>, "parameters": <parameters> }`
    * Order:
      1. `commit/build/character/{characterId}/removeEquipment` (all characters, to free items moving between characters)
      2. `commit/build/party/{p}` (`deityId`, `order`)
      3. `commit/build/character/{characterId}/changeBuild` (`simulation`: `false`)
      4. `commit/build/character/{characterId}/equip` (with `targetSlot`)
      5. `commit/build/character/{characterId}/jewelRemove`
      6. `commit/build/character/{characterId}/jewelAttach`
    * Example:
      `[{"endpoint":"commit/build/character/101/removeEquipment","parameters":{"targetEquipment":[0,2]}},{"endpoint":"commit/build/character/101/equip","parameters":{"targetEquipment":"0/1101/2/0","targetSlot":0}}]`
    * To apply the whole list in one atomic request, send it to `party/{p}/applyBuildChanges` as `changes`.
    * When applying `changeSummary` step by step, use the latest save revision as `expectedRevision` for each call.
  * `revision`
    * Save revision the search was based on.
  * `evaluations`
    * Number of builds evaluated.
  * `elapsedSeconds`
  * `basis`
    * String. Identifies the build-relevant state of the party that the search was based on (see `party/{p}/applyBuildChanges`).
    * Optionally send it to `party/{p}/applyBuildChanges` together with `changeSummary`. The request is then rejected if that state has changed.
    * The server does not keep the search result. `changeSummary` is the whole result.

**2-3-3. `party/{p}/directedBuild`**

* Request time limit: same as `party/{p}/gaSearch` (2-3-2). The response is returned within `timeBudgetSeconds` (at most 600 seconds), including the verification.

* Parameters:
  * `direction`
    * Required.
    * String enum: `rapidRanged`, `magicBurst`, `meleeBurst`, `free`, `turtle`, `balance`
    * See Direction for the class composition of each option.
  * `targets`
    * Required.
    * Array of characters to optimize, in the format `[{characterId, changeableComponents}]`.
    * All specified characters must belong to the party identified by `{p}`.
    * `changeableComponents` is optional. If omitted, all defaults below apply.
      * `uniqueCharacter`: Boolean, optional, default `false`.
        * If `true`, an available unique character may be assigned to this slot. If `false`, unique characters are never assigned.
      * `raceGender`: Boolean, optional, default `true`.
      * `mainClass`: Boolean, optional, default `true`.
      * `subClass`: Boolean, optional, default `true`.
      * `lineage`: Boolean, optional, default `false`.
      * `predisposition`: Boolean, optional, default `false`.
      * `autoEquipmentRun`: String enum, optional, default `FULL`.
        * Options: `currentSetting`, `FULL`, `SEMI`, `OFF`
        * The auto-equipment logic is triggered if the value is `FULL` or `SEMI`, or if the value is `currentSetting` and the character's `m.auto_equipment` is `FULL` or `SEMI`. `FULL` (7.1.2) also assigns Jewels; `SEMI` (7.1.3) leaves socketed Jewels unchanged.
        * Otherwise (`OFF`, or `currentSetting` with `m.auto_equipment` set to `OFF`), the logic is not triggered.
        * Note: Before the run, items the character can no longer equip after a class change (`c.equip_melee`, `c.equip_ranged`, `c.equip_magic`), or that no longer fit its slot count, are returned to the Inventory. This applies to every value, including `OFF`.
        * Note: Neither `SEMI` nor `OFF` fills an empty slot. `SEMI` (7.1.3) only replaces an equipped item with a higher-enhancement copy of the same item, so slots left empty by that step stay empty. Use `FULL` to fill them.
        * Whether it runs for a member whose build did not change depends on `autoEquipmentScope`.

  * `autoEquipmentScope`
    * String enum, optional, default `changedOnly`.
    * Options: `changedOnly`, `allTargets`
    * `changedOnly`: in each candidate, `autoEquipmentRun` runs only for the targets whose build changed. The other targets keep their current equipment and Jewels, for example the equipment found by `gaSearch` or `stagedEquipmentTuning`.
      * A target's build has changed when its unique character, race/gender, main class, sub class, lineage, or predisposition differs from the current build. An order change or a deity change alone does not count.
      * With `withinTargets` or `global`, a changed target may take an unlocked item from an unchanged member. That member then counts as changed and runs `autoEquipmentRun` afterward (party order), so it does not keep an empty slot.
      * So a candidate that changes only the order keeps every member's current equipment.
    * `allTargets`: `autoEquipmentRun` runs for every target in every candidate, whether or not its build changed (the behavior before `autoEquipmentScope` existed). Use it to let the search also re-run Auto Equipment on members it does not re-class.

  * `equipmentPolish`
    * String enum, optional, default `changedOnly`.
    * Options: `none`, `changedOnly`, `allTargets`
    * Selects the members Step 4 (see Process) searches. Step 4 searches equipment and Jewels with `polishMethod`, starting from the result of Steps 1 to 3, so the final equipment is chosen by `objective`, not only by the Auto Equipment rules.
    * `none`: Step 4 does not run. Equipment comes from `autoEquipmentRun` alone.
    * `changedOnly`: Step 4 searches the targets whose build changed in Steps 1 to 3 (a change as `autoEquipmentScope` defines it). The other targets keep their equipment and Jewels, for example the equipment found by `gaSearch` or `stagedEquipmentTuning`. If no target changed, Step 4 does not run.
    * `allTargets`: Step 4 searches every target, changed or not.
    * Locked equipment is never changed or taken.

  * `polishMethod`
    * String enum, optional, default `ga`.
    * Options: `ga`, `stagedTuning`, `stagedTuningThenGa`
    * How Step 4 searches. Both use `objective` and `objectiveGuard` of this request (2-0).
    * `ga`: a genetic search over the equipment and Jewels of the searched members, placing items as `party/{p}/gaSearch` (2-3-2) does with `equipment: true` and `jewels: true`. The searched members are its `targets`, and `considerItemsScope` applies to them as in 2-3-2. Broad: any item in any slot, and items move between the searched members. Suits members whose class changed and need a new loadout.
    * `stagedTuning`: `character/stagedEquipmentTuning` (2-3-8, 7.1.5) for each searched member, in party order, each starting from the build the previous one left. Targeted: it finds the bottleneck room and tries offense elements, defense elements, and counter abilities. Suits a wall caused by an enemy ability or element.
      * Items come from the Inventory and the member's own equipment only (7.1.5 General rules); `considerItemsScope` does not apply.
      * Run counts: its step 1 baseline uses `confirmRuns`, its steps 2–4 `quickRuns`, and its step 5 `confirmRuns`. Its other parameters take their 2-3-8 defaults.
      * Its final check (7.1.5 step 6) is skipped: the Final selection judges the result instead.
    * `stagedTuningThenGa`: `stagedTuning` first, then `ga` starting from the tuned equipment (its first generation contains the tuned result unchanged). Tuning finds element and counter changes first; the genetic search then fills in raw power and moves items between members. This is the order of the fastest recorded play runs (tuning before the genetic search). Step 4's time share is split evenly between the two; time tuning does not use passes to `ga`.

  * `considerOrderChange`
    * Boolean, optional, default `false`.
  * `considerDeityChange`
    * String enum, optional, default `none`.
    * `none`: Does not consider changing deities.
    * `unoccupiedDeities`: Considers any deity not currently in use by another party.
    * `allDeities`: Considers all deities, including those in use by other parties.
  * `considerItemsScope`
    * Optional.
    * Default: `normal`
    * Options:
      * `normal`: Candidate items come from the Inventory and the character's own equipment only. Other characters are never touched.
      * `withinTargets`: Candidate items come from the Inventory and from the equipment of the characters in `targets`. Characters not in `targets` are never touched. Locked items are never taken. Only the initial equipment can be taken: once an item is assigned during the pass, it stays with that character.
      * `global`: Candidate items come from the Inventory and from every character's equipment, including other parties. Locked items are never taken. Only the initial equipment can be taken: once an item is assigned during the pass, it stays with that character.
  * `objective`
    * String enum, optional, default `success`.
    * Options: `success`, `minDefeat`, `bossDamage`, `experience`, `progress` (see 2-0).
    * Every stage of the Process compares builds by this `objective`, and `verdict` is judged on it as for `party/{p}/gaSearch` (2-3-2).
  * `objectiveGuard`
    * Optional. Format, guard ranking, and guard rule: see 2-0. `verdict` applies it as `party/{p}/gaSearch` does.
    * Applies to every stage of the Process: the confirmed Step 1 candidates, every Step 2 candidate, every Step 3 candidate, Step 4 (every `polishMethod`), and the Final selection. In Steps 2 and 3 and in the Final selection, a change is accepted only under the Margin rule (see Process, Final selection), which includes the guard.
  * `directionStrictness`
    * String enum, optional, default `strict`.
    * Options: `strict`, `soft`
    * `strict`: the direction is a rule. Every candidate must reach the smallest achievable `distance` (see Distance). If the current build is farther, it is not a finalist either (see Final selection), and the search must change the composition.
    * `soft`: the direction is a preference. Every composition is a candidate, including the current one. During the search, each member of `distance` makes a candidate's score worse by `directionPenalty`.
      * The penalty is used for the search ranking only. `verdict` and `verification` are judged on the objective without the penalty.
      * With `free`, `distance` is always `0`, so `strict` and `soft` are the same.
  * `directionPenalty`
    * Number, optional, default `2`. Range `0` ~ `50`.
    * Used only with `directionStrictness: soft`.
    * Score penalty per member of `distance`: percentage points for `success`, `minDefeat`, `bossDamage`, and `progress` (a `minDefeat` defeat rate is raised); percent of the current build's average EXP for `experience`.
    * Example: with `2`, a candidate at `distance` `2` must be 4 points better than a candidate at `distance` `0` to rank above it.

  * `tuningParameters`
    * Optional. Object.
    * `effort` selects a preset. Values in the preset table are used unless they are specified explicitly.

    | `effort` | `populationSize` | `generations` | `quickRuns` | `confirmRuns` | `timeBudgetSeconds` | `mutationRate` |
    |---|---|---|---|---|---|---|
    | `low` | 12 | 10 | 30 | 150 | 60 | 0.35 |
    | `medium` | 24 | 30 | 50 | 300 | 180 | 0.35 |
    | `high` | 48 | 60 | 100 | 600 | 480 | 0.35 |

    * The quick runs only need to rank candidates roughly; the confirm runs and the Final selection decide. So the presets spend runs on more candidates rather than on more runs per candidate.

    | Parameter | Type | Default | Range | Description |
    |---|---|---|---|---|
    | `effort` | String | `medium` | `low` / `medium` / `high` | Preset for `populationSize`, `generations`, `quickRuns`, `confirmRuns`, `timeBudgetSeconds`, and `mutationRate`. Explicit values override the preset. |
    | `populationSize` | Integer | From `effort` | 8 ~ 64 | Steps 1 and 4: number of candidate builds per generation. |
    | `generations` | Integer | From `effort` | 1 ~ 200 | Steps 1 and 4: maximum number of generations to run. |
    | `quickRuns` | Integer | From `effort` | 10 ~ 300 | Simulation runs used to score every Step 1, Step 3, and Step 4 candidate. |
    | `confirmRuns` | Integer | From `effort` | 50 ~ 1000 | Simulation runs (different seed) used to re-score the top Step 1 and Step 4 candidates, every Step 2 candidate, and each Step 3 check, and for the baseline and step 5 of a `stagedTuning` polish. The Final selection uses twice this number (at most 1000). |
    | `timeBudgetSeconds` | Integer | From `effort` | 5 ~ 600 | Hard time limit for the whole request, including the Final selection and the verification. Their time is set aside first. When Step 4 runs, Step 1 may use at most 50% of the rest, Steps 2 and 3 together at most 20%, and Step 4 the remainder (at least 30%), plus any time an earlier step did not use. When Step 4 does not run (`equipmentPolish: none`, or no target to search), Step 1 may use at most 75% of the rest, and Steps 2 and 3 share the remainder. When a step's limit is reached, it locks its best result so far. When the search limit is reached, the remaining steps are skipped, and the Final selection and the verification still run. |
    | `verifyRuns` | Integer | `500` | 100 ~ 1000 | Simulation runs (new independent seed) used to compare the current build and the result. Used for `verdict` and `forecast`. |
    | `eliteCount` | Integer | `2` | 0 ~ populationSize / 4 | Steps 1 and 4: best builds copied unchanged to the next generation. |
    | `mutationRate` | Number | From `effort` | 0 ~ 1 | Steps 1 and 4: probability that a child build is mutated. |
    | `tournamentSize` | Integer | `3` | 2 ~ 8 | Steps 1 and 4: number of candidates compared when selecting each parent. |
    | `confirmTopN` | Integer | `3` | 1 ~ 10 | Steps 1 and 4: number of top candidates re-scored with `confirmRuns` each generation. |
    | `seed` | Integer | Random | Any integer | Fixed seed for a reproducible result. |
    | `verifySeed` | Integer | Derived from `seed` | Any integer | Seed of the verification runs only. Same meaning as the `verifySeed` of `party/{p}/gaSearch` (2-3-2). The same `verifySeed` gives `directedBuild` and `gaSearch` the same `verification.before` on the same save. |

    * There is no `maxChanges`: a class change and its `autoEquipmentRun` usually need many entries.

* Definition:
  * `Melee class`: `class.duelist`, `class.samurai`, `class.sword-saint`
  * `Ranged class`: `class.ranger`, `class.striker`, `class.ninja`
  * `Magic class`: `class.wizard`, `class.sage`, `class.alchemist`
  * `Support class`: `class.guardian`, `class.pilgrim`, `class.lord`

* Party rules:
  * Class counts are based on the main class only (sub classes are not counted).
  * Class counts and the duplicate rule apply to the whole party, including members who are not in `targets` and members with `mainClass: false`. Their main classes are fixed but still counted.
  * A party cannot have duplicate Support classes. This applies to all directions, including `free`.
    * Allowed: `class.guardian` + `class.pilgrim`
    * Not allowed: `class.guardian` + `class.guardian`

* Distance:
  * How many members a party is away from a direction's ranges. `0` means the party fits the direction.
  * For each of the four categories, count the members below the minimum and the members above the maximum, then add the four counts:
    * `distance = Σ over categories ( max(0, minimum − count) + max(0, count − maximum) )`
  * Example (`rapidRanged`): a party with 0 Melee, 0 Ranged, 3 Magic, and 3 Support classes is at `distance` `5` (Ranged 2 short, Magic 2 over, Support 1 over). A party with 1 / 2 / 1 / 2 is at `0`.
  * `free` has no ranges, so its `distance` is always `0`.
  * The smallest achievable distance is the smallest `distance` the party can reach by changing only the main classes of targets with `mainClass: true`, under the Party rules. When every member's main class may change, it is `0` for every direction.
  * Recomposition: the number of members whose main class category changes, from the current build to a candidate (`Σ |after − before| / 2` over the four categories). Recomposition `0` means the composition is unchanged, even if classes changed within a category.

* Direction (number of members per main class category):
  * The direction guides the main class assignment of characters whose `mainClass` is changeable. If the ranges cannot be fully satisfied, tuning proceeds with the closest achievable composition.
  * With `directionStrictness: strict`, a direction can only remove candidates that `free` would also consider. It helps only by focusing the search on its compositions; it never finds a build that `free` could not. Use `free` when the goal is the best score, and a direction (or `soft`) when the goal is to steer the party toward a class plan.
  * `rapidRanged`
    * `Melee class`: `0-1`
    * `Ranged class`: `2-5`
    * `Magic class`: `0-1`
    * `Support class`: `0-2`
    * High priority race: `Felidian`
      * When `raceGender` candidates are generated, `Felidian` is weighted 3x relative to other races (for example, 3x as likely to be sampled).
      * Applies only to characters whose `raceGender` is changeable.
      * Exception: `Felidian` cannot have `class.ninja` as its main class. Any candidate combining the two is invalid.
        * Reason: both grant `a.first-strike`, which does not stack.
  * `magicBurst`
    * `Melee class`: `0-1`
    * `Ranged class`: `0-1`
    * `Magic class`: `2-5`
    * `Support class`: `0-2`
  * `meleeBurst`
    * `Melee class`: `2-5`
    * `Ranged class`: `0-1`
    * `Magic class`: `0-1`
    * `Support class`: `0-2`
  * `free`
    * No class restriction (the Support duplicate rule still applies).
  * `turtle`
    * `Melee class`: `1-2`
    * `Ranged class`: `1-2`
    * `Magic class`: `1-2`
    * `Support class`: `2-3`
  * `balance`
    * `Melee class`: `1-2`
    * `Ranged class`: `1-2`
    * `Magic class`: `1-2`
    * `Support class`: `1-2`

* Process:
  * A component may be changed only if it is set to `true` in `changeableComponents` and the game rules allow the change.
    * Example: a unique character's gender, lineage, and predisposition cannot be changed, even if the component is `true`.
  * Step 1: High-impact changes
    * Searches: `uniqueCharacter`, `raceGender`, `mainClass`, `subClass`, `considerOrderChange`
    * Runs `autoEquipmentRun` for each candidate (see `autoEquipmentScope`). `considerItemsScope` and `objective` apply.
    * The current build is not a Step 1 candidate: Step 1 selects the best of the alternatives. The current build is compared only in the Final selection, after the result has been polished (Step 4), so a change is judged with its polished equipment, not with Auto Equipment alone.
      * A sample or child identical to the current build is replaced like a repeated candidate (see below).
      * A candidate may keep the current composition and differ in classes within a category, sub classes, races, unique characters, or order.
    * Sampling of the first generation (and of any later random candidates):
      * `free` and `soft`: 60% of the samples are local: they keep the current composition or have a recomposition of 1 or 2. The other 40% draw any valid composition.
        * With `soft`, the non-local samples draw from the compositions at the smallest achievable distance.
      * `strict` with any other direction: every sample draws from the compositions at the smallest achievable distance.
      * Within a composition, classes, races, sub classes, and unique characters are drawn as before.
    * A candidate is scored once per search. When breeding or sampling produces a candidate that was already scored, it is replaced by a new random sample (up to 4 attempts per slot), so a generation spends its runs on new builds.
    * Selects the confirmed candidate with the best score (by the `objectiveGuard` ranking with a guard) and locks these parameters. If there is no valid candidate, the original parameters are kept, and Steps 2 to 4 start from the current build.
  * Step 2: Deity change
    * Searches: `considerDeityChange`
    * Scores the current deity and every option with `confirmRuns` on the Step 1 result.
    * The best option replaces the current deity only if it passes the Margin rule (see Final selection) against it. Otherwise the current deity is kept.
  * Step 3: Lineage and predisposition
    * Searches: `lineage`, `predisposition`
    * Runs `autoEquipmentRun` for each candidate (only the member being tuned, see `autoEquipmentScope`). `considerItemsScope` and `objective` apply.
    * Tunes one target at a time in party order, lineage first, then predisposition. Every value is scored with `quickRuns` on one seed.
    * Check: the best value and the member's current value are then re-scored with `confirmRuns` on the confirm seed. The best value replaces the current one only if it passes the Margin rule against it. Otherwise the current value is kept.
  * Step 4: Equipment polish
    * Runs when `equipmentPolish` is not `none` and there is a member to search (see `equipmentPolish`).
    * Searches: the equipment and Jewels of those members, by `polishMethod`. Builds, deity, and order stay as Steps 1 to 3 locked them.
    * `ga`: a genetic search like `gaSearch` (2-3-2) that uses `populationSize`, `eliteCount`, `mutationRate`, `tournamentSize`, `confirmTopN`, `quickRuns`, and `confirmRuns`. It runs until `generations` or its time share ends. The first generation contains the result of Steps 1 to 3 unchanged, so it can only return that result or a build that scored better. Selects the confirmed candidate with the best score (by the guard ranking with a guard).
    * `stagedTuning`: 7.1.5 steps 1 to 5 for each searched member in party order (see `polishMethod`). A member keeps its equipment when its tuning records no candidate. When the time share ends, the members not reached keep their equipment.
    * `stagedTuningThenGa`: `stagedTuning` as above, then `ga` from the tuned result (see `polishMethod`).
  * Final selection
    * Finalists: the result of Steps 1 to 4, the result of Steps 1 to 3 when Step 4 changed it, and the current build.
    * Each finalist is re-scored on a new seed derived from `seed` with `2 × confirmRuns` runs (at most 1000).
    * Margin rule: a build passes against another build when its rate is better by more than one standard error, with SE computed as in the 7.1.5 Luck check (`SE = sqrt(beforeVariance / runs + afterVariance / runs)`). For `success`, when both rates are equal, `progress` (7.1.5 Score) decides by the same rule. With `objectiveGuard`, a build that reaches the guard passes against one that does not; when both miss it, the build must be better on the guard by more than one standard error.
    * The best finalist other than the current build becomes the result only if it passes the Margin rule against the current build. Otherwise the result is the current build: `verdict` is `noChange`, and `changeSummary` is empty.
    * When the current build is not a finalist (`directionStrictness: strict` with `forcedRecomposition: true`), the best finalist is the result, without the Margin rule.
    * Reason: the best of many noisy scores is usually too high, partly by luck. Re-scoring on a new seed removes most of that before the verification, so a search at a wall returns `noChange` instead of a `noisy` or `worse` change.

* Return:
  * Same as `party/{p}/gaSearch` (2-3-2): `verdict`, `forecast` (including `scope`), `verification` (including `progress` and `crossCheck`), `changeSummary`, `revision`, `evaluations`, `elapsedSeconds`, `basis`.
  * `seed`
  * `direction`
  * `directionStrictness`
  * `composition`
    * Number of members per main class category, before and after.
    * Format: `{ before, after, distanceBefore, distance, smallestDistance, recomposition, forcedRecomposition }`
      * `before`, `after`: `{ melee, ranged, magic, support }` of the current build and the result.
      * `distanceBefore`: `distance` of the current build for `direction`.
      * `distance`: `distance` of the result.
      * `smallestDistance`: the smallest achievable distance (see Distance).
      * `recomposition`: recomposition from the current build to the result.
      * `forcedRecomposition`: Boolean. `true` when `directionStrictness` is `strict` and `distanceBefore` is larger than `smallestDistance`. The current build was then not a finalist, and the result had to change the composition.
        * A `worse` verdict with `forcedRecomposition: true` usually means the direction did not suit the current party, not that the search failed. Use `free` or `soft` to compare.
  * `steps`
    * Number of candidates tried and the selected option, for each step of the Process, including Step 4.
    * `finalSelection`: the finalists' rates in the Final selection runs and which one became the result (`current` when the result is the current build).
  * Details: `9.1.4`.


**2-3-4. `character/status`**


* Parameters:
  * `characterId`
    * Required.
    * Accepts a single character ID or an array of character IDs.
    * Examples: `1`, `[1, 2, 3]`.

* Return:
  * For each specified character:
  * `characterId`: The character's ID.
  * `calculatedStatus`:
    * `CalculatedStatus` as defined in 9.1.4.14, with shared UI-calculated
      numeric stats, abilities, bonuses, and attack profiles.

  * `current`:
    * `name`
    * `uniqueSelection`
    * `racesAndGender`
    * `mainClassId`
    * `subClassId`
    * `lineage`
    * `predisposition`

  * `editableFields`:
    * `name`
      * Boolean. 
  * `validOptions`:
    * `uniqueSelection`
      * Unique character is not permit to change `name`, `race`, `gender`, `lineage`, and `predisposition`
    * `racesAndGender`
      * Currently valid race and gender combinations.
      * Format:
        * Normal: `<race>/<gender>`
        * Mimorian: `mimorian/<gender>/<targetEnemyId>`
      * Example:
        [`lupinian/male`, `lupinian/female`, `vulpinian/male`, `mimorian/female/193`]
      * For `mimorian`, the third value is the transformed target enemy ID.
      * If unavailable: `none`.
    * `mainClassId`
      * Example: [`duelist`, `ranger`]
    * `subClassId`
      * Example: [`duelist`, `ranger`]
    * `lineage`
      * Example: [`sandstorm`, `ashen_capital`]
      * Example for unique: `none`
    * `predisposition`
      * Example: [`aggressive`, `inquisitive`]
      * Example for unique: `none`

* Validation:
  * Same as `2.1 CHARACTER_&_PARTY` 

**2-3-5. `character/equipment`**

* Parameters:
  * `characterId`
    * Required.
    * Accepts a single character ID or an array of character IDs.
    * Examples: `1`, `[1, 2, 3]`.

* Return:
  * For each specified character:
  * `characterId`: The character's ID.
  * `current`:
    * `mode`
      * Current Auto Equipment mode.
      * Example: `FULL`, `SEMI`, `OFF`.
    * `equipment`
      * Array in equipment-slot order.
      * Uses <slotIndex>/<Item Format>[/<jewelType>:<jewelRank>].
        * slotIndex: 0, 1, 2, …
        * jewelType: might, arcana, fort, ward, shade, or focus.
        * jewelRank: 1–8.
        * The Jewel part is omitted if no Jewel is equipped.
        * An empty slot is represented by 0.
        * Example:
          ["0/0/1101/2/0/might:1", "1/1/1102/1/0", "0"]
  * `validOptions`:
    * `mode`
      * Example: [`FULL`, `SEMI`, `OFF`]. 
    * `numberOfEmptyEquipmentSlots`
      * Number of currently empty equipment slots.
      * Example: `1`.
    * `undoEquipment`
      * Up to 30 equipment states available for Undo. 
      * Each Undo state includes equipped item information, jewel assignment information, and `mode` condition. 
      * If any required equipment item or jewel is unavailable, the entire Undo state is unavailable.
      * Partial restoration is not allowed.
      * Format:
        * `{equipmentStates, available, unavailableReason}`
      * If no Undo state is available:
        * `equipmentStates`: `[]`
        * `available`: `false`
        * `unavailableReason`: `No undo history.`
    * `redoEquipment`
      * Up to 30 equipment states available for Redo.
      * Each Redo state includes equipped item information, jewel assignment information, and `mode` condition.
      * If any required equipment item or jewel is unavailable, the entire Redo state is unavailable.
      * Partial restoration is not allowed.
      * Format:
        * `{equipmentStates, available, unavailableReason}`
      * If no Redo state is available:
        * `equipmentStates`: `[]`
        * `available`: `false`
        * `unavailableReason`: `No redo history.`


**2-3-6. `character/equipmentSet`**

* Parameters:
  * `characterId`
    * Required.
    * Accepts a single character ID or an array of character IDs.
    * Each entry contains:
      * `equipmentSetId`
        * Optional.
        * Accepts one or more equipment set IDs.
        * If omitted, returns all saved equipment sets.
      * `isEquipmentSetDetail`
        * Boolean.
        * Optional; default: `false`.
        * If `true`, include the full equipment-set details.
        * If `false`, return summary information only.

* Return:
  * `characterId`
    * For each specified character:
      * `equipmentSets`
        * Array.
        * Each entry:
          * `equipmentSetId`
          * `equipmentSet`
            * Includes `availability`, evaluated for the target character against the
              current inventory, aptitude, and equipment-slot count.
            * `availability.allAvailable` is `true` only when the complete exact set
              can be loaded.
            * `availability.entries` preserves saved-set order. Each entry includes
              `slotIndex`, `item`, `available`, and `unavailableReason`.
            * `unavailableReason` is `slot_unavailable`, `not_equippable`,
              `unavailable`, or `null` when available. Jewels do not affect saved-set
              availability because saved equipment sets do not store Jewels.

**2-3-7. `character/equipmentEvaluation`**

* Parameters:
  * `characterId`
    * Required.
    * Accepts a single character ID or an array of character IDs.
    * Each entry contains:
      * `targetItems`
        * Optional when `equipmentChanges` is supplied.
        * One item or an array of items.
        * Each item uses `<Item Format>/<jewelType>:<jewelRank>`.
      * `equipmentChanges`
        * Optional when `targetItems` is supplied.
        * One hypothetical equipment change or an array of unique changes.
        * Replacement format: `<slotIndex>=<Item Format>/<jewelType>:<jewelRank>`.
        * Use `0:0` as the Jewel part when the replacement item has no Jewel.
        * Removal format: `<slotIndex>=0`.
        * Every slot is evaluated independently against the same immutable character
          snapshot. The item does not need to be owned.
      * At least one of `targetItems` or `equipmentChanges` is required.

* Return:
  * `characterId`
    * For each specified character:
      * `calculatedItemStatus`
        * Calculated item status for each target item after applying bonuses and modifiers specific to the target character.
        * Includes character-specific equipment bonuses that are not included in the item's standalone `calculatedBasePower`.
      * `calculatedEquipmentChange`
        * Ordered results for `equipmentChanges`; an empty array when none were requested.
        * Each result includes the echoed `change`, `equippable`,
          `physicalDefenseDelta`, and `magicalDefenseDelta`.
        * Defense deltas compare the complete character status before and after the
          hypothetical replacement or removal, including item and Jewel `d.` and `c.`
          effects. Evaluation never changes equipment, history, RNG, or revision.


**2-3-8. `character/stagedEquipmentTuning`**

* Tunes the equipment of one character with `7.1.5 Staged Equipment Tuning`.
* This does not advance progression, return rewards, consume live randomness, write Diary entries, change equipment, consume charge, or change the save revision.

* Parameters:
  * `characterId`
    * Required.
  * `baselineRuns` (constant: `1000`)
  * `quickRuns` (e.g., `100`, `300`, `1000`; default: `300`)
  * `finalTuningRuns` (e.g., `300`, `500`, `1000`; default: `500`)
  * `offenseElementRequest` (e.g., `e.fire`, `e.thunder`, `e.ice`, `e.none`; default: `noRequest`)
  * `offenseElementTrialRuns` (e.g., `0`, `9`, `18`; default: `9`)
  * `offenseElementCandidateCount` (e.g., `1`, `2`, `3`; default: `2`)
  * `defenseElementTrialRuns` (e.g., `0`, `15`, `30`; default: `15`)
  * `defenseElementCandidateCount` (e.g., `1`, `2`, `3`; default: `2`)
  * `abilityTrialRuns` (e.g., `0`, `40`, `80`; default: `40`)
  * `abilityCandidateCount` (e.g., `1`, `2`, `3`; default: `2`)
  * `minImprovement` (e.g., `0.03`, `0.07`, `0.10`; default: `0.07`)
  * `minGateImprovement` (e.g., `0.03`, `0.07`, `0.10`; default: `0.07`)
  * `objective`
    * Optional.
    * Default: `success`.
    * `success`, `minDefeat`, `bossDamage`, `experience`, `progress` (see 2-0).
    * How each is scored and how improvement is measured: 7.1.5 Score and Improvement.
  * `objectiveGuard`
    * Optional. Format, guard ranking, and guard rule: see 2-0.
    * Measured in 7.1.5 steps 5 and 6 only; steps 2–4 qualify candidates on `objective` alone (7.1.5 Guard).
  * `seed`
    * Optional.
    * Integer.
    * Default: random.
    * Fixed seed for a reproducible result. Every seed the tuning uses derives from it (7.1.5). The same `seed` on the same save revision gives the same result.

* Return:
  * `accepted`
    * Boolean. `true` if the tuned build passed the final check (7.1.5 step 6), the guard included.
  * `objective`
  * `crossCheck`
    * See 2-0. `before` and `after` are measured on the step 1 and step 6 runs (`baselineRuns`, the same seed).
  * `scoredBy`
    * The score the tuning used: the same as `objective`, or `progress` when `objective` is `success` and the step 1 success rate is `0` (7.1.5 Score).
  * `before`
    * `overview` of the current build from step 1 (same format as `{p}/simulationRun`).
  * `after`
    * `overview` of the tuned build from step 6 (same format as `{p}/simulationRun`).
    * With `bossDamage`, `before` and `after` describe the boss battle only.
  * `improvement`, `gain`, `standardError`
    * Values used in the final check (7.1.5 step 6), in the `scoredBy` score. `gain` is in the unit of 2-0 (relative change for `experience`).
  * `bottleneckRoom`
    * Floor and room found in step 1. Example: `3f-2`
    * With `bossDamage`, always the boss room.
  * `steps`
    * What each step recorded and what step 5 kept.
    * `offenseElement`, `defenseElement`, `ability`: recorded candidates with their improvement over the current build (steps 2–4 seed).
    * `finalTuning`: candidates kept in step 5, in order.
      * Each `improvement` is the improvement of the build with this candidate and every candidate before it, over the current build (7.1.5 step 5, Report).
      * The last entry's `improvement` is the step 5 improvement of the tuned build. Step 6 re-checks it on another seed (`improvement` above).
  * `changeSummary`
    * Ordered array of Commit API calls that turns the current build into the tuned build, including Jewel changes. Same format and order as `party/{p}/gaSearch`.
    * Empty when `accepted` is `false`.
  * `revision`
    * Save revision the tuning was based on.
  * `simulationRuns`
    * Total number of simulation runs used.
  * `elapsedSeconds`
  * `seed`
    * The seed used: the requested one, or the random one chosen. Send it again to reproduce the result.
  * `basis`
    * Returned only when `accepted` is `true`.
    * Same as the `basis` of `party/{p}/gaSearch`, for the character's party.



**2-4. `read/base`**


**2-4-1. `searchItems`**

* Searches items currently known to the player.

* Parameters:
  * `state`
    * **Choose one.**
    * Allowed values:
      * `owned`
      * `equipped`
      * `sold`
      * `all`
    * Default: `owned`.
  * `category`
    * Optional.
    * `Item category` filter.
  * `itemRarity`
    * Optional.
    * Allowed values:
      * `common`
      * `uncommon`
      * `rare`
      * `epic`
      * `mythic`
      * `all`
  * `superRare`
    * Optional.
    * Filters by whether the item has a Super Rare title.
    * Boolean: `true` / `false`.
  * `superRareId`
    * Optional.
    * Filters by a specific Super Rare title.
    * `0`: none.
    * `1–N`: corresponding `superRare title` in `Specification_1.2_CONSTANTS_GLOBAL.md`.
      * `N` represents the highest currently defined superRare ID and may increase in future versions.
    * Example: `12`.
  * `itemId`
    * Optional.
    * Searches for a specific item ID.
  * `searchAbility`
    * Optional.
    * Filters items that have the specified ability ID.
    * Example: `a.pursuit`.
  * `searchBonus`
    * Optional.
    * Filters items that have the specified bonus ID.
    * Example: `c.magical-defense-x2/3`.
  * `details`
    * Optional.
    * Controls additional item details returned.
    * Allowed values:
      * `none`
      * `ability`
      * `cBonus`
      * `otherBonus`
      * `abilityAndCBonus`
      * `all`
    * Default: `abilityAndCBonus`.
  * `limit`
    * Optional.
    * Maximum number of records to return.
    * Default: `10`.
    * Minimum: `1`.
    * Maximum: `5000`.
    * The limit is applied after filtering and sorting.

* Return:
  * For unassigned items:
    * `items`
      * Matching items, stacked by item variant.
      * Base format:
        * `<Item Format>/<quantity>/<calculatedBasePower>`
      * `calculatedBasePower`
        * Calculated value of the item's `base_power`, as defined in `3.1.1 Item category`.
        * Includes applicable modifiers such as enhancement level and other factors that affect the item's base power. Note: This caluclation is not including character's equipment bonus like `c.katana_x1.4`. (same behavior as UI part)
        * Only the `d.` bonus corresponding to the item's defined `base_power` is included in `calculatedBasePower`.
        * Other `d.` bonuses are returned separately in `otherBonus`.
        * Examples:
          * If `Item category` is `i.armor`:
            * `base_power` is `d.physical_defense+D`.
            * `calculatedBasePower` is the resulting physical defense value after applying enhancement and other applicable modifiers.
            * Other `d.` bonuses are included in `otherBonus`.
          * If `Item category` is `i.katana`:
            * `base_power` is `d.melee_attack+D`.
            * `calculatedBasePower` is the resulting melee attack value after applying enhancement and other applicable modifiers.
            * Other `d.` bonuses are included in `otherBonus`.
      * Example:
        * `["0/1101/2/0/3/18", "0/1104/0/12/1/24"]`
      * Additional fields are appended according to the selected `details` value.
      * Detail fields are appended in the following fixed order:
        * `<ability>`
        * `<cBonus>`
        * `<otherBonus>`
      * Format when `details=all`:
        * `<Item Format>/<quantity>/<calculatedBasePower>/<ability>/<cBonus>/<otherBonus>`
      * Example:
        * `0/1104/0/12/1/12/ability=[a.pursuit]/cBonus=[c.magical-defense-x2/3]/otherBonus=[d.physical_defense:6, d.HP:20, e.ice+0.020]`

  * For character-assigned items:
    * `items`
      * Base format:
        * `<Item Format>/<characterId>/<jewelType>:<jewelRank>/<calculatedBasePower>`
      * `<jewelType>:<jewelRank>` is `0:0` if no jewel is attached.
      * Additional fields are appended according to the selected `details` value.
      * Detail fields are appended in the following fixed order:
        * `<ability>`
        * `<cBonus>`
        * `<otherBonus>`
      * Format when `details=all`:
        * `<Item Format>/<characterId>/<jewelType>:<jewelRank>/<calculatedBasePower>/<ability>/<cBonus>/<otherBonus>`
  * For the `jewel` category:
    * `items`
      * Base format for unassigned jewels:
        * `<jewelType>:<jewelRank>/<quantity>`
      * Base format for assigned jewels:
        * `<Item Format>/<characterId>/<jewelType>:<jewelRank>/<calculatedBasePower>`
        * Uses the same base format as character-owned items.
      * Additional fields are appended according to the selected `details` value.
      * Detail fields are appended in the following fixed order:
        * `<calculatedBasePower>`
        * `<ability>`
        * `<cBonus>`
        * `<otherBonus>`
      * Format for assigned jewels when `details=all`:
        * `<Item Format>/<characterId>/<jewelType>:<jewelRank>/<calculatedBasePower>/<ability>/<cBonus>/<otherBonus>`
  * Sort order:
    * For equipment items:
      * Higher `calculatedBasePower` first.
      * If equal, higher `itemId` first.
      * If still equal, higher `jewelRank` first.
    * For unassigned jewels:
      * Higher `jewelRank` first.
      * If equal, higher `jewelType` first.

**2-4-2. `jewelPriorityParty`**

* Parameters: none.

* Return:
  * `current`:
    * `partyNumber`
      * Example: `2` (PT2 → `2`).
      * If no party is assigned priority: `none`.

  * `validOptions`:
    * `partyNumber`
      * Currently selectable party numbers.
      * Example: [1, 2, 3, `none`].

**2-4-3. `shopInfo`**

* Parameters: none.

* Return:
  * `intimacy`
  * `dialogue`
  * `paidRefreshCountdown`
  * `paidRefreshPrice`

**2-4-4. `shopItemsList`**

* Parameters: none.

* Return:
  * `current`:
    * `lineupId`
      * An opaque hash identifying the current shop stock.
      * Changes when the lineup, item details, prices, or remaining stock change, and on every refresh.
      * Does not change when the player's Gold changes.
      * Pass this value unchanged to `purchaseShopItems`.
      * If it no longer matches, reject with `illegal_action:lineup_changed`.
    * `items`
      * Current shop item list.
      * Format:
        * `<shopItemId>/<Item Format>/<price>/<availability>`
      * `availability`:
        * `true`: currently purchasable.
        * `false`: currently unavailable, sold out, or unaffordable.
      * Example:
        * [
        *  "1/0/1104/2/0/720/true",
        *  "2/0/1102/2/0/720/true",
        *  "3/0/1110/?/?/80/false",
        *  "4/0/1111/?/?/100/true",
        *  "5/0/1111/?/?/100/true",
        *  "6/0/1104/?/?/60/true",
        *  "7/0/1102/?/?/60/true"
        * ]
  * `validOptions`:
    * `items`
      * `shopItemId` values currently available for purchase.
      * These values can be used directly with `purchaseShopItems`.
      * Example:
        `[1, 2, 4, 5]`

**2-4-5. `altarInfo`**

* Parameters: none.

* Return:
  * `altarOverview`

**2-4-6. `enemyFormList`**

* Parameters:
  *  `enemyType`
  *  `enemyId`

* Return:
  * `current`:
    * `enemyFormList`
      * `enemyId`  
      * `enemyName`
      * `enemyType`
      * `enemyAbility`
      * `enemyBonus`
      * `unlockCost`
      * `unlockCondition`
  * `validOptions`:
    * `enemyId`  


**2-5. read/diary**

**2-5-1. `{p}/diarySetting`**

* Parameters: none.

* Return:
  * `current`:
    * `superRareThreshold`
    * `epicThreshold`
    * `mythicThreshold`
    * `rareThreshold`
    * `sideQuestThreshold`
    * `notifyGodsBattle`
    * `defeatNotificationMode`
    * `notifyCyclePopup`
    * `notifyItemDropPopup`
    * `notifyAutoEquipmentPopup`
    * `notifySideQuestPopup`
  * `validOptions`:
    * `superRareThreshold`
      * Allowed values: `all`, `1`, `2`, `3`, `4`, `5`, `6`, `none`.
    * `epicThreshold`
      * Allowed values: `all`, `1`, `2`, `3`, `4`, `5`, `6`, `none`.
    * `mythicThreshold`
      * Allowed values: `all`, `1`, `2`, `3`, `4`, `5`, `6`, `none`.
    * `rareThreshold`
      * Allowed values: `all`, `1`, `2`, `3`, `4`, `5`, `6`, `none`.
    * `sideQuestThreshold`
      * Allowed values: `all`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `none`.
    * `notifyGodsBattle`
      * Boolean.
    * `defeatNotificationMode`
      * Allowed values:
        * `defeatOnly`
        * `defeatAndDraw`
        * `defeatDrawRetreat`
        * `all`
        * `none`
    * `notifyCyclePopup`
      * Boolean.
    * `notifyItemDropPopup`
      * Boolean.
      * Default: `true`.
    * `notifyAutoEquipmentPopup`
      * Boolean.
    * `notifySideQuestPopup`
      * Boolean.

**2-5-2. `diaryEntry/{diaryEntryId}`**

* Parameters: none.
* Return: `{entry: DiaryEntry}` as defined in 9.1.4.14. Reading does not mark it
  as read. Missing or no-longer-retained entries return `not_found`.

**2-6. `read/setting`**

**2-6-1. `enemyEditPane`**

* Parameters: none.

* Return:
  * `current`:
    * `enemyLevel`
    * `enemyName`
    * `terrainEffect`
    * `enemyType`
    * `mainClass`
    * `subClass`
    * `addedAbilities`
  * `validOptions`:
    * `enemyLevel`
      * Integer: `1–99`.
      * Example: `10`.
    * `enemyName`
      * Example: `ミーティア`.
    * `terrainEffect`
      * Terrain-effect ID.
      * Example: [`none`, `terrain.rejuvenation`, `terrain.abundant`, ...]
    * `enemyType`
      * Example: [`Beast`, `Aerial`, ...]
    * `mainClass`
      * Example: [`class.duelist`,`class.samurai`, ... ]
    * `subClass`
      * Use `none` when no subclass is assigned.
      * Example: [`none`, `class.duelist`,`class.samurai`, ... ]
    * `addedAbilities`
      * Array of additional abilities.
      * Up to `5` entries may be specified.
      * Each entry:
        * `abilityId`
          * Use `none` when no ability is assigned.
          * Example: [`a.iaigiri`, `a.hunter` , ...]
        * `level`
          * Integer: `1–5`.
          * Example: `1`.

**2-6-2. `modeSelect`**

* Parameters: none.

* Return:
  * `current`:
    * `mode`
    * `enemyLevelOffset`
    * `language`
    * `darkMode`
    * `autoRepeat`
    * `showExpeditionStats`
    * `theme`
  * `validOptions`:
    * `mode`
      * Allowed values:
        * `mode.normal`
        * `mode.orca`
    * `enemyLevelOffset`
      * Enemy level offset used by `mode.orca`.
      * Integer: `0–20`.
    * `language`
      * Allowed values:
        * `ja`
        * `en`
        * `zh-CN`
        * `zh-TW`
        * `ko`
    * `darkMode`
      * Allowed values:
        * `off`
        * `on`
        * `system`
    * `autoRepeat`
      * Boolean: `true` / `false`.
    * `showExpeditionStats`
      * Boolean: `true` / `false`.
    * `theme`
      * Allowed values:
        * `theme.kemo`
        * `theme.laika`
        * `theme.leonard`
        * `theme.orca`
        * `theme.nox`
        * `theme.luna`
        * `theme.mishka`
        * `theme.puchitsa`
        * `theme.hagakure`
        * `theme.souga-ha`
        * `theme.finn`
        * `theme.merle`
        * `theme.rosaria`
        * `theme.milly`
        * `theme.guabi`
        * `theme.nemea`
        * `theme.bernetta`
        * `theme.yone`
        * `theme.niv`
        * `theme.nave`

**2-6-3. `debug`**

* Parameters: none.

* Return:
  * `current`:
    * `runtimeDiagnostics`
    * `clairvoyance`
    * `speedOfTime`
    * `godsBattleCondition`
    * `godsStrength`
    * `debugStoreOpen`
    * `displayFlavorCondition`
    * `displayAfkDuration`
    * `displayAllBestiary`
    * `displayAllCompendium`
    * `displayAllGlossary`
    * `colosseumMode`
  * `validOptions`:
    * `runtimeDiagnostics`
      * Boolean: `true` / `false`.
    * `clairvoyance`
      * Boolean: `true` / `false`.
    * `speedOfTime`
      * Allowed values:
        * `real`
        * `x1.2`
        * `x5`
        * `x20`
        * `x100`
        * `unlimited`
    * `godsBattleCondition`
      * Allowed values:
        * `normal`
        * `simple`
    * `godsStrength`
      * Allowed values:
        * `normal`
        * `veryWeak`
    * `debugStoreOpen`
      * Boolean: `true` / `false`.
    * `displayFlavorCondition`
      * Boolean: `true` / `false`.
    * `displayAfkDuration`
      * Boolean: `true` / `false`.
    * `displayAllBestiary`
      * Boolean: `true` / `false`.
    * `displayAllCompendium`
      * Boolean: `true` / `false`.
    * `displayAllGlossary`
      * Boolean: `true` / `false`.
    * `colosseumMode`
      * Boolean: `true` / `false`.

* Valid check note: Debug Mode is unavailable in some environments.


##### 9.1.3.4 API requirement — Commit

**3. Commit**

**3-1. `commit/progress`**

**3-1-1. `elapsed`**

* Parameters:
  * `calculateToRealTime`
    * Optional.
    * Boolean.
    * If `true`, advances the in-game time up to the current real-world time.
    * If the in-game time is already later than the current real-world time, no action is performed.
  * `elapsedSeconds`
    * Optional.
    * If specified, this parameter takes precedence over `calculateToRealTime`.
    * Unit: seconds.
    * Minimum: `60` seconds.
    * Maximum: `43200` seconds (12 hours).

* Behavior:
  * If neither parameter is specified, no action is performed.
  * Processes the elapsed time using `Time-Based Progress Handling` defined in `5.1.1 Party State Machine`.
  * Applies the following progression rules and modifiers:
    * `f.afk-emulation-efficiency`
    * `Speed of time`

* Return:
  * `elapsedSeconds`
    * Actual elapsed time processed.
    * Unit: seconds.
  * `inGameTime`
    * In-game time after processing.

**3-1-2. `progressReport`**

* Parameters: none.
* Return: `{deliveryId, status: "queued"}` after durable acceptance of the
  existing external progress-report action. Delivery and any success benefit
  follow 9.1.4.15. Queued acceptance is not a success notification.


**3-2. `commit/expedition`**

**3-2-1. `{p}/changeExpedition`**

* Parameters:
  * `destination`
    * Optional.
    * Example: `3`.
    * Validation: the specified destination must be unlocked.
  * `destinationMode`
    * Optional.
    * Option: `auto` or `fixed`
  * `depthLimit`
    * Optional.
    * Example: `5f-3`
  * `difficultyOffset`
    * Optional.
    * Example: `8`.
    * Validation: must be within the currently valid difficulty-offset range.
      * Example: `0–68`.

* Partial updates are allowed.

**3-2-2. `{p}/sortie`**

* Parameters:
  * `numberOfSortie`
    * Integer.
    * Range: `1–6`.
* Behavior:
  * Before processing, check the available charge.
    * If the available charge is lower than `numberOfSortie`, perform as many sorties as the available charge allows.
  * Performs the specified number of sorties sequentially.
  * Each sortie consumes 1 stock and immediately processes one full party cycle.
  * If the party is currently in `state.explore`, the current exploration cycle is completed first, then one additional full cycle is processed.
  * Processing always ends at the beginning of `state.rest`.

* Return:
  * `summary`
    * Format: `<validSortie>/<numberOfSortie>`
    * Example: `4/6`
  * For each sortie:
    * `diaryEntryId`
    * `rewards`
    * `logId`
    * `battleOutcome`
      * Example: `Clear`, `Draw`, `Retreat`, `Defeat`


**3-2-3. `{p}/godsBattle`**

* Parameters: none.
  * If `Gods battle` is unavailable, return error.

**3-2-4. `{p}/resetStatistics`**

* Parameters: none.


**3-3. `commit/build`**

**3-3-1. `party/{p}`**

* Parameters:
  * `deityId`
    * Example: `restoration`
  * `order`
    * Array of character IDs in party order.
    * Example:  `[101, 102, 103, 104, 105, 106]`

* Partial updates are allowed.

**3-3-2. `party/{p}/applyBuildChanges`**

* Applies a list of Commit API calls to party `{p}` in one atomic request.
  * The list is normally the `changeSummary` of `gaSearch`, `directedBuild`, or `stagedEquipmentTuning`.
  * The server does not keep search results. Everything this request needs is in its parameters.
* Undo and Redo:
  * Each character with at least one entry in `changes` gets exactly one Undo step: their equipment state before this operation.
  * Only equipment, jewels, and Auto Equipment `mode` are restored by Undo. Changes to race, class, lineage, predisposition, order, and deity are not reverted.

* Parameters:
  * `changes`
    * Required.
    * Non-empty array of Commit API calls, in the format of `changeSummary`: `{ "endpoint": <Commit API path>, "parameters": <parameters> }`.
    * Applied in the given order.
    * Allowed endpoints: the ones listed in `changeSummary` Order (`removeEquipment`, `commit/build/party/{p}`, `changeBuild`, `equip`, `jewelRemove`, `jewelAttach`).
    * `expectedRevision` is not needed in an entry. The request manages it.
  * `basis`
    * Optional.
    * String.
    * The `basis` returned with `changes` by the search.
    * If omitted, the build-relevant state is not compared. Each entry is still validated by the Commit API against the current state.
  * `verdict`
    * Optional.
    * String: `veryGood`, `good`, `noisy`, `noChange`, `worse`.
    * The `verdict` returned with `changes` by `gaSearch` or `directedBuild`. Omit it for `stagedEquipmentTuning`.
    * If omitted, no verdict check is performed.
  * `autoEquipmentMode`
    * Optional.
    * Default: `SEMI`.
    * Allowed values: `SEMI`, `OFF`.
    * `FULL` is not allowed, because Auto Equipment would replace the applied build.
  * `simulation`
    * Required.
    * Boolean.
    * If `true`, validates the changes and returns them without committing.
    * If `false`, applies and commits the changes.
  * `confirmation`
    * Required only when `confirmationRequired` is `true` and `simulation` is `false`.
    * Allowed values:
      * `yes`: Applies the changes.
      * `no`: Cancels the request without changing the game state.

* Validation:
  * The request is rejected when:
    * `changes` is empty, or an entry uses an endpoint that is not allowed.
    * `basis` is given and the build-relevant state changed after the search (party order, deity, inventory, jewels, or the build or equipment of any character in party `{p}`).
      * Other revision changes (e.g., progression) do not make `basis` stale.
    * `verdict` is `noChange`.
    * Any entry fails the validation of its Commit API call.
  * `confirmationRequired` is `true` when:
    * `verdict` is `worse` or `noisy`.

* Atomicity:
  * All entries in `changes` are applied as one commit.
  * If any entry fails validation, no game-state change is committed.

* Return:
  * `applied`
    * The `changes` that were applied (or would be applied when `simulation` is `true`).
  * `confirmationRequired`
    * Boolean.
  * `warnings`
    * Returned when confirmation is required. Includes the given `verdict`.
  * `calculatedStatus`
    * For each changed character, `CalculatedStatus` as defined in 9.1.4.14.


**3-3-3. `character/{characterId}/changeBuild`**

* Parameters:
  * `name`
  * `uniqueSelection`
  * `racesAndGender`
  * `mainClassId`
    * Example: `class.fighter`
  * `subClassId`
    * Example: `class.ranger`
  * `lineage`
  * `predisposition`
  * `simulation`
    * Required.
    * Boolean.
    * If `true`, validates and simulates the requested changes without committing them.
    * If `false`, applies and commits the requested changes.
* Partial updates are allowed.
  * Only specified parameters are changed.
  * Unspecified parameters retain their current values.

* Return:
  * `calculatedStatus` 
  * `confirmationRequired`
    * Boolean.
    * Indicates whether user confirmation is required before the requested changes can be committed.
  * `warnings`
    * Returned when the requested build change causes effects that require confirmation.
    * May include effects such as equipment becoming invalid or being automatically unequipped.
  * `confirmation`
    * Required only when `confirmationRequired` is `true` and `simulation=false`.
    * Allowed values:
      * `yes`
        * Applies the requested changes.
      * `no`
        * Cancels the requested changes without modifying the character.


**3-3-4. `character/{characterId}/removeAllEquipment`**

* Parameters: none.
* Remove all equipment.

* If `autoEquipment.mode` is `FULL`, change it to `SEMI`.

**3-3-5. `character/{characterId}/removeEquipment`**

* Parameters:
  * `targetEquipment`
    * One equipment entry or an array of equipment entries.
    * Uses `<slotIndex>`.
    * Example:
      `0`
    * Example:
      `[0, 1]`

* If `autoEquipment.mode` is `FULL`, change it to `SEMI`.


**3-3-6. `character/{characterId}/equip`**

* Parameters:
  * `targetEquipment`
    * One equipment entry or an array of equipment entries.
    * Uses `Item Format`.
    * Examples:
      * `0/1101/2/0`
      * `["0/1101/2/0", "1/1102/1/0"]`
    * If `targetSlot` is not specified, equipment slots cannot be selected explicitly.
    * The specified items are automatically assigned and sorted into valid equipment slots using the same logic as the UI.
  * `targetSlot`
    * Optional.
    * Format: `slotIndex`.
    * If specified, equips the target item to the specified slot, replacing the currently equipped item in that slot.
  * `remainsMode`
    * Optional.
    * Boolean.
    * Default: `false`.
    * If `true`, the current auto-equipment mode is preserved.
    * If one or more unlocked items are affected while `remainsMode` is `true`, return a warning message.
    * Useful when updating an equipped item without changing the mode, such as when changing its lock status.


**3-3-7. `character/{characterId}/lockEquipment`**

* Parameters:
  * `targetEquipment`
    * One equipment entry or an array of equipment entries.
    * Uses `<slotIndex>` (not `Item Format`).
    * Example:
      `0`
    * Example:
      `[0, 1]`
  * Requires `autoEquipment.mode` = `FULL`.
  * Does not change `autoEquipment.mode`.

**3-3-8. `character/{characterId}/unlockEquipment`**

* Parameters:
  * `targetEquipment`
    * One equipment entry or an array of equipment entries.
    * Uses `<slotIndex>` (not `Item Format`).
    * Example:
      `0`
    * Example:
      `[0, 1]`
  * Requires `autoEquipment.mode` = `FULL`.
  * Does not change `autoEquipment.mode`.

**3-3-9. `character/{characterId}/autoEquipment`**

* Parameters:
  * `mode`
    * Auto Equipment mode to apply.
    * Example: `FULL`, `SEMI`, `OFF`.
  * `immediateAutoEquipment`
    * If `true`, immediately runs Auto Equipment using the specified `mode`.
    * Boolean: `true` / `false`.

**3-3-10. `character/{characterId}/jewelAttach`**

* Parameters:
  * `targetEquipment`
    * Target equipment to which the jewel will be attached.

  * `jewelToSet`
    * Jewel to attach.
    * Only one jewel may be attached to each target equipment.
    * Must satisfy the compatibility rules defined in `3.1.7 Jewel (結晶)`, under `Item Type → Available Jewel`.

* If `autoEquipment.mode` is `FULL`, change it to `SEMI`.


**3-3-11. `character/{characterId}/jewelRemove`**

* Parameters:
  * `targetEquipment`

* If `autoEquipment.mode` is `FULL`, change it to `SEMI`.


**3-3-12. `character/{characterId}/saveEquipmentSet`**

* Parameters:
  * `equipmentSet`
    * Object: `{name?: string}`. Omitted name uses the UI default name.
    * Captures the character's current equipment into a new empty saved slot;
      callers cannot supply arbitrary equipment contents. See 9.1.4.14.

* Return:
  * `equipmentSetId`

**3-3-13. `character/{characterId}/loadEquipmentSet`**

* Parameters:
  * `equipmentSetId`
  * `loadMode`
    * Optional for an initially unconfirmed request. Defaults to `equipSet`
      only when all exact requirements are available; partial loads require
      a choice through the confirmation protocol in 9.1.4.5.

* Validation:
  * `partialUnavailable`
    * Boolean.
    * `true` if one or more items in the selected equipment set are unavailable.
  * `warningMessage`
    * Warning message shown when `partialUnavailable` is `true`.
  * If `partialUnavailable` is `true`, confirmation is required before execution.

* Confirmation:
  * `loadMode`
    * Options:
      * `equipSet`: Equip items, this option is visible only when all of items are available.
      * `equipSimilar`: Equip matching items where available, and substitute unavailable items with similar items.
      * `equipExactMatchesOnly`: Equip only items that exactly match the saved equipment set.
* Return:
  * `equipmentSet`

* If `autoEquipment.mode` is `FULL`, change it to `SEMI`.


**3-3-14. `character/{characterId}/deleteEquipmentSet`**

* Parameters:
  * `equipmentSetId`

**3-3-15. `character/{characterId}/renameEquipmentSet`**

* Parameters:
  * `equipmentSetId`
  * `name`

**3-3-16. `character/{characterId}/undoEquipment`**

* Parameters: none.

**3-3-17. `character/{characterId}/redoEquipment`**

* Parameters: none.


**3-4. `commit/base`**

**3-4-1. `changeJewelPriorityParty`**

* Parameters:
  * `partyNumber`
    * Example: 2 (PT2 -> 2)
    * If no party is assigned priority: `none`


**3-4-2. `sellInventoryItems`**

* Parameters:
  * `items`
    * Array of target items to sell.
    * One or more entries may be specified in a single request.
    * Format: `<Item Format>`
    * Examples:
      * `0/1102/1/0`
    * Behavior:
      * For each successfully sold item, changes the item state from s.owned to s.sold.

**3-4-3. `purchaseShopItems`**

* Parameters:
  * `lineupId`
    * Must match the current shop lineupId.
    * If the supplied lineupId does not match the current shop lineup, reject the request.
  * `items` 
    * Array of items to buy. One or more entries may be specified in a single request.
    * Each Entry:
      * `shopItemId`
        * Example: `1`

**3-4-4. `paidShopRefresh`**

* Parameters: none.


**3-4-5. `unlockSoldItems`**

* Parameters:
  * `items`
    * Array of sold items to unlock.
    * One or more items may be specified in a single request.
    * Format: `<Item Format>`

* Behavior:
  * Changes the item state from `s.sold` to `s.notown`.
  * Does not restore the item quantity.


**3-4-6. `unlockForm`**

* Parameters:
  * `enemyId`  



**3-5. `commit/diary`**

**3-5-1. `{p}/diarySetting`**

* Parameters:
  * `superRareThreshold`
  * `epicThreshold`
  * `mythicThreshold`
  * `rareThreshold`
  * `sideQuestThreshold`
  * `notifyGodsBattle`
  * `defeatNotificationMode`
  * `notifyCyclePopup`
  * `notifyItemDropPopup`
  * `notifyAutoEquipmentPopup`
  * `notifySideQuestPopup`

* Partial updates are allowed.
* Omitted fields retain their current values.


**3-5-2. `diaryEntry/markAsRead`**

* Parameters:
  * `diaryEntryId`
    * Diary entry ID to mark as read.
    * Accepts one or more diary entry IDs.
    * Example: `120`, `121`
    * If `ALL`, mark all applicable diary entries as read.
  * `partyNumber`
    * Optional party filter.
    * Example: `1`
    * If specified, the operation applies only to diary entries related to that party.
    * Example:
      * `diaryEntryId = ALL`
      * `partyNumber = 1`
      * Marks all PT1-related diary entries as read.


**3-6. `commit/setting`**

**3-6-1. `clairvoyanceReset`**

* Parameters:
  * `partyNumber`
  * `resetCommonRewards`
    * Boolean.
    * If `true`, resets the common rewards.
  * `resetRewards`
    * Boolean.
    * If `true`, resets the party-specific rewards.
  * `resetSideQuest`
    * Boolean.
    * If `true`, resets the side quest (`t.side_quest_bag` ).

**3-6-2. `modeSelect`**

* Parameters:
  * `mode`
  * `enemyLevelOffset`
  * `language`
  * `darkMode`
  * `showExpeditionStats`
  * `theme`

* Note: `autoRepeat` is an exception and is not controlled through the API.

* Partial updates are allowed; omitted fields retain their current values.

**3-6-3. `enemyEditPane`**

* Parameters:
  * `enemyLevel`
  * `enemyName`
  * `terrainEffect`
  * `enemyType`
  * `mainClass`
  * `subClass`
  * `addedAbilities`
    * Each entry:
      * `abilityId`
      * `level`

* Partial updates are allowed.
* Omitted fields retain their current values.

**3-6-4. `debug`**

* Parameters:
  * `runtimeDiagnostics`
  * `clairvoyance`
  * `speedOfTime`
  * `godsBattleCondition`
  * `godsStrength`
  * `debugStoreOpen`
  * `displayFlavorCondition`
  * `displayAfkDuration`
  * `displayAllBestiary`
  * `displayAllCompendium`
  * `displayAllGlossary`
  * `colosseumMode`

* Partial updates are allowed.
* Omitted fields retain their current values.

**3-6-5. `backup`**

**3-6-5-1. `backup/export`**

* Parameters: none.

* Return:
  * a back up file. 


**3-6-5-2. `backup/import`**

* Parameters:
  * `file`
    * The backup file to import.
  * `skipConfirmation`
    * Boolean.
    * Default: false.
    * Optional.
    * If `true`, skips the confirmation step.

* Return:
  * `result`
    * The result of the import operation.

**3-6-5-3. `backup/reset`**

* Initial parameters:
  * `skipConfirmation`
    * Boolean.
    * Optional.
    * Default: `false`.
    * If `true`, skips the confirmation step.

* Initial return:
  * `confirmationToken`
    * Returned when confirmation is required.
  * `warningMessage`
    * Warning shown before reset execution.

* Confirmation parameters:
  * `confirmationToken`
    * Required when `skipConfirmation` is `false`.

* Return:
  * `result`
    * The result of the reset operation.



**3-6-6. `feedback`**

* Parameters:
  * `name`
  * `category`
  * `text`
  * `latestBattleLogParty`
  * `includeBackup`
  * `attachments`
    * Optional.
    * Up to 4 image attachments.
* Multipart field names, defaults, and scalar types are defined in 9.1.4.10
  and 9.1.4.14. Return `{deliveryId, status: "queued"}` after durable acceptance.
  Delivery confirmation and the existing reward/cooldown follow 9.1.4.15.

**3-6-7. `markNewsAsRead`**

* News: `DeveloperNewsNotification`

* Parameters:
  * `version`
    * Optional.
    * Accepts one or more news `version`.
    * If omitted, marks all news articles as read.


**Additional UI and delivery operations**

* `read/setting/delivery/{deliveryId}`: read the originating save's external
  delivery status; full result shape and state transitions are in 9.1.4.15.
  `deliveryId` is an opaque server-generated string, not a user or filename.
* `commit/setting/uiPreferences`: partial update of explicitly persisted UI
  preferences through `{changes: [{key, value}]}`. Types, validation, and
  ownership are in 9.1.4.17. Return the complete public preference list.
* `commit/base/markItemsAsSeen`: acknowledge displayed newly acquired variants
  using `{items: [variantKey]}` from the inventory projection. Return changed
  keys in `{items: [...]}`; never change quantities or currencies. See 9.1.4.17.

##### 9.1.3.5 API requirement — Help


**4. Help**

**4-1. `help`**

**4-1-1. `overview`**

* Parameters: none.
* Returns the API list from:
  * `Endpoint index`

**4-1-2. `endpoints`**

* Parameters: none.
* Returns the API document:
  * `Specification_9.1.3_API.md` and `Specification_9.1.4_API_DETAIL.md`.


**4-2. `resources`**

**4-2-1. `developerNewsNotification`**

* Parameters: none.

* Return:
  * Each entry includes:
    * `version`
      * Unique identifier for the entry.
      * Treat this value as the entry ID.
    * `date`
    * `content`
    * `isRead`

* `content` is returned in the currently selected language.

**4-2-2. `donationBox`**

* Parameters: none.

* Return:
  * `gods`
    * Current donation status of each available god.
    * Format:
      * `<deityId>/<rank>/<donatedGold>/<nextRankGold>`
    * Example:
      `["restoration/3/1203/2200", "attrition/2/545/1200"]`
    * If maximum rank is reached, `nextRankGold`: `MAX`.

**4-2-3. `clairvoyance/{p}`**

* Returns current Clairvoyance information for the specified party.

* Parameters: none.

* Return:
  * `reward`
    * Remaining / total counts of reward bags.
  * `enhancement`
    * Remaining / total counts by enhancement title.
  * `superRare`
    * Remaining / total Super Rare counts.
  * `sideQuest`
    * Remaining / total side-quest draws.
  * `sleepiness`
    * Remaining counts:
      * `noSleep`
      * `nap`
      * `soundSleep`
  * `available`
  * `canReset`

* If Clairvoyance is unavailable for the specified party, return `unavailable`.

**4-2-4. `glossary`**

* Parameters:
  * `category`
    * **Choose one.**
* `validOptions`:
  * `category`
    * `Ab.` Ability Bonuses
    * `Base.` Base Stat Bonuses
    * `Fixed.` Fixed Bonuses
    * `Inc.` Increase Bonus Descriptions
    * `Mech.` Game Mechanics
    * `Faith.` Gods and Faith
    * `Magic.` Magic Attacks
    * `Quest.` Side Quests
    * `Terrain.` Terrain Effects

* Return:
  * `entries`
    * Glossary entries of the selected category.

**4-2-5. `itemCompendium`**

* Parameters:
  * `category`
  * `itemRarity`
  * `tier`
  * `itemId`
  * `searchAbility`
  * `searchBonus`
  * `details`

* `validOptions`:
  * `category`
    * Optional.
    * Uses the `Item category` list.
  * `itemRarity`
    * Optional.
    * Allowed values:
      * `common`
      * `uncommon`
      * `rare`
      * `epic`
      * `mythic`
      * `all`
  * `tier`
    * Optional.
    * Allowed values: `1–8`.
  * `itemId`
    * Optional.
    * Filters by a specific item ID.
  * `searchAbility`
    * Optional.
    * Filters items that have the specified ability ID.
    * Example: `a.pursuit`.
  * `searchBonus`
    * Optional.
    * Filters items that have the specified bonus ID.
    * Example: `c.magical-defense-x2/3`.
  * `details`
    * Optional.
    * Controls additional item details returned.
    * Allowed values:
      * `none`
      * `ability`
      * `cBonus`
      * `otherBonus`
      * `abilityAndCBonus`
      * `all`
    * Default: `abilityAndCBonus`.

* Return:
  * `items`
    * Matching item information according to the requested `details` value.
    * Format:
      * `itemId`
      * `name`
      * `itemRarity`
      * `tier`
      * `ability`
      * `cBonus`
      * `otherBonus`
    * `ability`, `cBonus`, and `otherBonus` may contain multiple bonus IDs and values.
    * Example:
      `1104, "Nicked Dirk", common, 1, ability=[a.pursuit], cBonus=[c.magical-defense-x2/3], otherBonus=[d.melee_attack:12, d.HP:20, e.ice+0.020]`


**4-2-6. `characterRoster`**

* Parameters:
  * `race`

* `validOptions`:
  * `race`
    * Choose one.
    * Options:
      [`lupinian`, `vulpinian`, `felidian`, `caninian`, `ursan`, `procyonian`, `leporian`, `cervin`, `murid`, `kemoria`, `orcinian`, `avian`, `mimorian`]
* Return:
  * `status`
    * Base race status.
    * Example:
      `Vitality:11 Strength:12 Intelligence:8 Mind:7`
  * `bonus`
    * Race bonuses.
  * `defaultAbility`
    * Default ability of the selected race.
  * `unlockAbility`
    * Unlockable abilities of the selected race.


**4-2-7. `bestiary`**

* Parameters:
  * `enemyId`
  * `enemyType`
  * `expedition`
  * `x.type`

* `validOptions`:
  * `enemyId`
    * Optional.
    * Example: `130`.
  * `enemyType`
    * Optional.
    * See `Expedition Enemy Types` in `Specification_4.1_EXPEDITION_&_ENEMY.md`.
  * `expedition`
    * Optional.
    * Current valid expedition IDs.
    * Example: `1–9`.
    * The available range may be extended in future versions.
  * `x.type`
    * Optional.
    * Example: `Normal`, `Elite`, `BOSS`


* Return:
  * `enemies`
    * Enemies matching the specified parameters.
    * Ordered using the same order as the Bestiary.
    * Each enemy includes the status and details defined in `Bestiary (敵キャラクター図鑑)` in `Specification_8.6_UI_SETTING.md`.


**4-2-8. `superRareList`**

* Parameters: none.

* Return:
  * `superRare`
    * List of all Super Rare titles.
    * Format:
      * `<superRareId>/<name>/<bonus>`
    * Example:
      `["1/...", "2/...", "3/..."]`

* `name` uses the current language setting.