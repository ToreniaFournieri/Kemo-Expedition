## 9. Environment

### 9.1 Desktop distribution

#### 9.1.3 API

* This section is maintained by humans.
* Core concepts:
    * Each Commit API request is atomic. If any supplied field or entry is invalid, no game-state change is committed.
    * API operations must share the same underlying game logic and validation logic as the UI.
        * Do not duplicate existing game logic specifically for the API.
        * Implement only behavior that is specific to the API interface.
* Request/response types, defaults, query encoding, and examples are completed
  by 9.1.4.14. UI preference ownership is defined in 9.1.4.17; external delivery
  uses 9.1.4.15. These contracts do not change the referenced gameplay rules.

```
React UI ── typed in-process adapter ─┐
Desktop ─── desktop bridge ───────────┼── Application API
AI / CUI ── HTTP/JSON adapter ────────┘         │
                                                ▼
                                      Game Authority / Reducer
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
  * `enhancement`: `0–6`. See `enhancement title` in `Specification_1.2_CONSTANTS_GLOBAL.md`.
  * `superRare`: `0` = none; `1–N` : Represents the corresponding `superRare` title defined in `Specification_1.2_CONSTANTS_GLOBAL.md`.
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
  * `bow`
  * `armor`
  * `glove`
  * `wand`
  * `robe`
  * `shield`
  * `bolt`
  * `book`
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
     character/{characterId}/status
     character/{characterId}/equipment
     character/{characterId}/equipmentSet

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

3-3. commit/build
     party/{p}
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

Path Parameters

{p}: Party number, 1–6
{characterId}: `characterId` Character ID.
{diaryEntryId}: Stable Diary-entry ID.

##### 9.1.3.2 API requirement fundamental

**1. Fundamental**

**1-1. `fundamental/status`**

* Returns the current API and runtime status.
* Parameters: none.
* Return:
    * `systemStatus`
    * `versionBuild`
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
    * Default: `ja`.
    * If a supported `lang` URL parameter is present, use its value instead.
      * Example: `lang=ja`.
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

**2-1. `read/observation`**

**2-1-1. `compact`**

* Provides a compact observation designed primarily for AI decision-making.
* Do not call this endpoint frequently.

* Behavior:
  * Each request performs a fresh, private 100-run simulation for every unlocked party.
  * The simulations use the same game-state snapshot as the current facts returned by this request.
  * The simulation results are intended as an on-demand decision aid, not as a real-time monitoring or prediction mechanism.
  * Simulation results are not cached between requests and are not persisted.
  * Other observation endpoints do not trigger these simulations.

* Parameters: none.

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
            * `conditionKey`: `poor`, `low`, `cautious`, `normal`, `steady`, `good`, `great`, and `excellent`
            * `conditionValue`:
              * Integer range: `-349` to `400`.
              * For condition thresholds and calculation logic, see section 7.2.2 AUTO progress logic.
          * Example: `steady/55`
          * Example: `low/-188`
      * `state`
        * Example: `state.rest`.
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
          `["120/Defeat Record/Leporian Moon Palace/20260916 22:04", "1/Boss Rare acquired (Moon-Hare Aegis)/Leporian Moon Palace/20260916 21:52"]`

* `read/observation` does not modify game state.
* Diary entries remain unread until explicitly marked as read through the corresponding Commit API.

**2-1-2. `overview`**

* Parameters: none.

* Return:
  * `headerInfo`  
    * Global game information shared across the application.
    * Currently displayed in the header pane in the UI.
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
    * Currently displayed in the party tab in the UI.

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
  * `bottleneckEnemies`
    * Status of enemies identified as bottlenecks.
    * Bottleneck definition:
      * Damage taken: `>=35%`, or
      * `draw` or `defeat` outcome.
    * If no enemy meets the condition, return none.

**2-2-3. `{p}/simulationRun`**

* Runs the current expedition simulation `1,000` times and returns the result.
* this does not advance progression, return rewards, consume live randomness, write Diary entries, change equipment, or consume charge.

* Parameters: none.

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

**2-3-1 `party/{p}`**

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


**2-3-2. `character/{characterId}/status`**

* Parameters: none.

* Return:
  * `calculatedStatus`:
    * `CalculatedStatus` as defined in 9.1.4.14, with shared UI-calculated
      numeric stats, abilities, bonuses, and attack profiles.

  * `current`:
    * `unique`
    * `name`
    * `racesAndGender`
    * `mainClassId`
    * `subClassId`
    * `lineage`
    * `predisposition`


  * `editableFields`:
    * `name`
      * Boolean. 
    * `unique`
      * Boolean.
      * Unique character is not permit to change `name`, `race`, `gender`, `lineage`, and `predisposition`
  * `validOptions`:
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
      * Example: [`class.fighter`, `class.ranger`]
    * `subClassId`
      * Example: [`class.fighter`, `class.ranger`]
    * `lineage`
      * Example: [`sandstorm`, `ashen_capital`]
      * Example for unique: `none`
    * `predisposition`
      * Example: [`aggressive`, `inquisitive`]
      * Example for unique: `none`

* Validation:
  * Same as `2.1 CHARACTER_&_PARTY` 

**2-3-3. `character/{characterId}/equipment`**

* Parameters: none.

* Return:
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
      * Each Undo state includes both equipped item information and jewel assignment information.
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
      * Each Redo state includes both equipped item information and jewel assignment information.
      * If any required equipment item or jewel is unavailable, the entire Redo state is unavailable.
      * Partial restoration is not allowed.
      * Format:
        * `{equipmentStates, available, unavailableReason}`
      * If no Redo state is available:
        * `equipmentStates`: `[]`
        * `available`: `false`
        * `unavailableReason`: `No redo history.`


**2-3-4. `character/{characterId}/equipmentSet`**

* Parameters:
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
  * `equipmentSets`
    * Array.
    * Each entry:
      * `equipmentSetId`
      * `equipmentSet`

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
  * `rarity`
    * Optional.
    * Allowed values:
      * `common`
      * `uncommon`
      * `eliteRare`
      * `bossRare`
      * `mythicRare`
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
    * `items`
      * Current shop item list.
      * Format:
        * `<shopItemId>/<itemId>/<price>/<availability>`
      * `availability`:
        * `true`: currently purchasable.
        * `false`: currently unavailable, sold out, or unaffordable.
      * Example:
        `["1/1104/60/true", "2/1102/60/true", "3/1110/80/false", "4/1111/100/true", "5/1111/100/true"]`
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
    * `bossThreshold`
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
    * `bossThreshold`
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

* Parameters: none.

**3-2-3. `{p}/godsBattle`**

* Parameters: none.
  * If `Gods battle` is unavailable, return error.

**3-3. `commit/build`**

**3-3-1. `party/{p}`**

* Parameters:
  * `deityId`
    * Example: `restoration`
  * `order`
    * Array of character IDs in party order.
    * Example:  `[101, 102, 103, 104, 105, 106]`

* Partial updates are allowed.

**3-3-2. `character/{characterId}/changeBuild`**

* Parameters:
  * `name`
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



**3-3-3. `character/{characterId}/removeAllEquipment`**

* Parameters: none.
* Remove all equipment.

**3-3-4. `character/{characterId}/removeEquipment`**

* Parameters:
  * `targetEquipment`
    * One equipment entry or an array of equipment entries.
    * Uses `<slotIndex>`.
    * Example:
      `0`
    * Example:
      `[0, 1]`

**3-3-5. `character/{characterId}/equip`**

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


**3-3-6. `character/{characterId}/lockEquipment`**

* Parameters:
  * `targetEquipment`

**3-3-7. `character/{characterId}/unlockEquipment`**

* Parameters:
  * `targetEquipment`


**3-3-8. `character/{characterId}/autoEquipment`**

* Parameters:
  * `mode`
    * Auto Equipment mode to apply.
    * Example: `FULL`, `SEMI`, `OFF`.
  * `immediateAutoEquipment`
    * If `true`, immediately runs Auto Equipment using the specified `mode`.
    * Boolean: `true` / `false`.

**3-3-9. `character/{characterId}/jewelAttach`**

* Parameters:
  * `targetEquipment`
    * Target equipment to which the jewel will be attached.

  * `jewelToSet`
    * Jewel to attach.
    * Only one jewel may be attached to each target equipment.
    * Must satisfy the compatibility rules defined in `3.1.7 Jewel (結晶)`, under `Item Type → Available Jewel`.

**3-3-10. `character/{characterId}/jewelRemove`**

* Parameters:
  * `targetEquipment`

**3-3-11. `character/{characterId}/saveEquipmentSet`**

* Parameters:
  * `equipmentSet`
    * Object: `{name?: string}`. Omitted name uses the UI default name.
    * Captures the character's current equipment into a new empty saved slot;
      callers cannot supply arbitrary equipment contents. See 9.1.4.14.

* Return:
  * `equipmentSetId`

**3-3-12. `character/{characterId}/loadEquipmentSet`**

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


**3-3-13. `character/{characterId}/deleteEquipmentSet`**

* Parameters:
  * `equipmentSetId`

**3-3-14. `character/{characterId}/renameEquipmentSet`**

* Parameters:
  * `equipmentSetId`
  * `name`

**3-3-15. `character/{characterId}/undoEquipment`**

* Parameters: none.


**3-3-16. `character/{characterId}/redoEquipment`**

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
  * `bossThreshold`
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
    * If `true`, resets the side quest progress.

**3-6-2. `modeSelect`**

* Parameters:
  * `mode`
  * `enemyLevelOffset`
  * `language`
  * `darkMode`
  * `autoRepeat`
  * `showExpeditionStats`
  * `theme`

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

* Parameters: an imported file.

* Return:
  * the result. 

**3-6-5-3. `backup/reset`**

* Initial parameters: none.

* System reply `confirmationToken` with warning.

* Confirmation parameters: `confirmationToken`.


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
  * `rarity`
  * `tier`
  * `itemId`
  * `searchAbility`
  * `searchBonus`
  * `details`

* `validOptions`:
  * `category`
    * Choose one.
    * Uses the `Item category` list.
  * `rarity`
    * Optional.
    * Allowed values:
      * `common`
      * `uncommon`
      * `eliteRare`
      * `bossRare`
      * `mythicRare`
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
      * `rarity`
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

