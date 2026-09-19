## 9. Environment

### 9.1 Desktop distribution

#### 9.1.3 API

* This section is maintained by humans.
* Core concepts:
    * Each Commit API request is atomic. If any supplied field or entry is invalid, no game-state change is committed.
    * API operations must share the same underlying game logic and validation logic as the UI.
        * Do not duplicate existing game logic specifically for the API.
        * Implement only behavior that is specific to the API interface.

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
  * `superRare`: `0` = none; `1–80` represents the corresponding `superRare title` in `Specification_1.2_CONSTANTS_GLOBAL.md`.
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

3. Commit

3-1. commit/progress
     elapsed
     progressReport

* Parameters: none.

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
     character/{characterId}/autoEquipment
     character/{characterId}/saveEquipmentSet
     character/{characterId}/loadEquipmentSet
     character/{characterId}/deleteEquipmentSet

3-4. commit/base
     changeJewelPriorityParty
     sellInventoryItems
     purchaseShopItems
     restoreSoldItems
     unlockForm

3-5. commit/diary
     {p}/diarySetting
     diaryEntry/markAsRead

3-6. commit/setting
     enemyEditPane
     modeSelect
     feedback
     backup/export
     backup/import
     backup/reset
     debug
     markNewsAsRead


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

* Return:
  * `userId`
  * `gameMode`
  * `levelOffsetForOrca`

* Save data path:
  * Normal:
    * `users/normal/<userId>/`
    * Example: `users/normal/Taro/`
  * Orca:
    * `users/orca<levelOffsetForOrca>/<userId>/`
    * Example: `users/orca5/Lin/`

**1-3. `fundamental/logIn`**

* Parameters:
  * `userId`
  * `gameMode`
  * `levelOffsetForOrca`
* Starts a game instance or acquires API control of the current instance.
* While logged in:
  * Normal real-time progression is paused.
  * Only API operations from the logged-in user may control or modify the instance.
  * Other state-mutating controls are restricted.
* Note: This feature is only for API control in this version.

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

* An API for AI.

* Parameters: none.

* Return:
  * `globalInfo`
    * `gameMode`
    * `inGameTime`
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
    * Latest 100-run simulation summary for each party.
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

* Parameters: none.

* Return:
  * `partyInfo`
    * Party-related information.
    * Currently displayed in the party tab in the UI.

**2-4-5. `base`**

* Parameters: none.

* Return:
  * `baseInfo`
    * Base-related information.
    * Currently displayed in the base tab in the UI.

**2-4-6. `diary`**

* Parameters: none.

* Return:
  * `baseInfo`
    * Diary-related information.
    * Currently displayed in the diary tab in the UI.

**2-4-7. `setting`**

* Parameters: none.

* Return:
  * `settingInfo`
    * Setting-related information.
    * Currently displayed in the setting tab in the UI.


**2-4-8. `popupEventStream`**

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

* Parameters: none.

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

**2-3-4. `character/{characterId}/equipmentSet`**

* Parameters:
  * `equipmentSetId`
    * Optional.
    * Accepts one or more equipment set IDs.
    * If omitted, returns all saved equipment sets.
  * `isEquipmentSetDetail`
    * Boolean.
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
    * **Choose one.**
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
    * `1–80`: corresponding `superRare title` in `Specification_1.2_CONSTANTS_GLOBAL.md`.
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

* Return:
  * `items`
    * Matching items, stacked by item variant.
    * Format:
      * `<Item Format>/<quantity>`
    * Example:
      `["0/1101/2/0/3", "0/1104/0/12/1"]`
  * `equippedItems`
    * Returned when equipped items match the search.
    * Format:
      * `<partyNumber>/<characterId>/<Item Format>`
    * Example:
      `["1/101/1/1102/1/0"]`
  * `details`
    * Additional item information according to the requested `details` value.
    * Key format:
      * `<itemId>/<superRare>`
    * Values may include:
      * `ability`
      * `cBonus`
      * `otherBonus`
    * `otherBonus` may contain multiple bonus IDs and values.
    * Example:
      `1104/12: ability=[a.pursuit], cBonus=[c.magical-defense-x2/3], otherBonus=[d.melee_attack:12, d.HP:20, e.ice+0.020]`



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
    * `theme`
      * Allowed values:
        * `m.kemo`
        * `m.laika`
        * `m.leonard`
        * `m.orca`
        * `m.nox`
        * `m.luna`
        * `m.mishka`
        * `m.puchitsa`
        * `m.hagakure`
        * `m.souga-ha`
        * `m.finn`
        * `m.merle`
        * `m.rosaria`
        * `m.milly`
        * `m.guabi`
        * `m.nemea`
        * `m.bernetta`
        * `m.yone`
        * `m.niv`
        * `m.nave`

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
  * `elapsedSeconds`
    * Unit: seconds.
    * Maximum: `43200` seconds (12 hours).

**3-1-2. `progressReport`**

* Parameters: none.


**3-2. `commit/expedition`**

**3-2-1. `{p}/changeExpedition`**

* Parameters:
  * `destination`
    * Example: `3`.
    * Validation: the specified destination must be unlocked.
  * `depthLimit`
    * Example: `5f-3`
  * `difficultyOffset`
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

* Partial updates are allowed.

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
    * Equipment slot cannot be specified.
    * Equipped items are automatically assigned and sorted into valid equipment slots using the same logic as the UI.
    * Uses `Item Format`.
    * Example:
      `0/1101/2/0`
    * Example:
      `["0/1101/2/0", "1/1102/1/0"]`

**3-3-6. `character/{characterId}/autoEquipment`**

* Parameters:
  * `mode`
    * Auto Equipment mode to apply.
    * Example: `FULL`, `SEMI`, `OFF`.
  * `immediateAutoEquipment`
    * If `true`, immediately runs Auto Equipment using the specified `mode`.
    * Boolean: `true` / `false`.

**3-3-7. `character/{characterId}/saveEquipmentSet`**

* Parameters:
  * `equipmentSet`

* Return:
  * `equipmentSetId`

**3-3-8. `character/{characterId}/loadEquipmentSet`**

* Parameters:
  * `equipmentSetId`

* Validation:
  * `partialUnavailable`
    * Indicates that one or more items in the selected equipment set are unavailable.
    * `warningMessage`
    * Requires confirmation before execution.

* Confirmation:
  * If confirmed, proceed with loading the equipment set.
  * If declined, dismiss the operation without making any changes.

* Return:
  * `equipmentSet`

**3-3-9. `character/{characterId}/deleteEquipmentSet`**

* Parameters:
  * `equipmentSetId`

**3-3-10. `character/{characterId}/undoEquipment`**



**3-3-11. `character/{characterId}/redoEquipment`**


**3-4. `commit/base`**

**3-4-1. `changeJewelPriorityParty`**

* Parameters:
  * `partyNumber`
    * Example: 2 (PT2 -> 2)
    * If no party is assigned priority: `none`


**3-4-2. `sellInventoryItems`**

* Parameters:
  * `items`
    * Array of items to sell.
    * One or more entries may be specified in a single request.
    * Format: `<Item Format>/<quantity>`
      * `quantity`
        * Integer greater than `0`, or `ALL`.
    * Examples:
      * `0/1101/2/0/12`
        * Sell `12` of item `0/1101/2/0`.
        * Reduce the owned quantity by `12`.
      * `0/1102/1/0/ALL`
        * Sell all matching items.
        * Automatically change the item state from `s.owned` to `s.sold`.


**3-4-3. `purchaseShopItems`**

* Parameters:
  * `items` 
    * Array of items to buy. One or more entries may be specified in a single request.
    * Each Entry:
      * `shopItemId`
        * Example: `1`

**3-4-4. `restoreSoldItems`**

* Parameters:
  * `items`

**3-4-5. `unlockForm`**

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

**3-6-1. `modeSelect`**

* Parameters:
  * `mode`
  * `enemyLevelOffset`
  * `language`
  * `darkMode`
  * `autoRepeat`
  * `theme`


**3-6-2. `enemyEditPane`**

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

**3-6-3. `debug`**

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

**3-6-4. `backup`**

**3-6-4-1. `backup/export`**

* Parameters: none.

* Return:
  * a back up file. 

**3-6-4-2. `backup/import`**

* Parameters: an imported file.

* Return:
  * the result. 

**3-6-4-3. `backup/reset`**

* Initial parameters: none.

* System reply `confirmationToken` with warning.

* Confirmation parameters: `confirmationToken`.


**3-6-5. `feedback`**

* Parameters:
  * `name`
  * `category`
  * `text`
  * `latestBattleLogParty`
  * `includeBackup`
  * `attachments`
    * Optional.
    * Up to 4 image attachments.

**3-6-6. `markNewsAsRead`**

* News: `DeveloperNewsNotification`

* Parameters:
  * `newsId`
    * Optional.
    * Accepts one or more news IDs.
    * If omitted, marks all news articles as read.


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

