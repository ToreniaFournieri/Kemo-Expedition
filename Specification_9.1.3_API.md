## 9. Environment

### 9.1 Desktop distribution

#### 9.1.3 API Requirements

* Human writes this part.

##### 9.1.3.1 API endpoint list

`/api/v1/`

```
1. Fundamental

1-1. fundamental/status

1-2. fundamental/control/acquire

1-3. fundamental/control/release


2. Read

2-1. read/observation

2-2. read/expedition
     {p}/latestBattleLog
     {p}/simulationRun

2-3. read/party
     {p}/partySummary
     {p}/character/{c}/status
     {p}/character/{c}/equipment

2-4. read/base
     searchItems
     shopItemsList

2-5. read/diary
     {p}/diarySetting
     {p}/diaryEntry/{d}

2-6. read/setting
     enemyEditPane
     modeSelect
     debug

2-7. read/resources
     developerNewsNotification
     donationBox
     clairvoyance/{p}
     glossary/subcategory
     itemCompendium/subcategory
     characterRoster/subcategory
     bestiary/subcategory
     superRareList


3. Commit

3-1. commit/progress

3-2. commit/expedition
     {p}/changeExpedition
     {p}/sortie
     {p}/godsBattle

3-3. commit/party
     {p}/partyUpdate
     {p}/character/{c}/changeBuild
     {p}/character/{c}/equipment

3-4. commit/base
     changeJewelPriorityParty
     sellInventoryItems
     purchaseShopItems

3-5. commit/diary
     {p}/diarySetting
     {p}/diaryEntry/markAsRead

3-6. commit/setting
     enemyEditPane
     modeSelect
     feedback
     backup
     debug
```

Path Parameters

{p}: Party number, 1–6
{c}: Character index within the party, 0–5
{d}: Diary-entry index, 0-23

##### 9.1.3.2 API requirement fundamental

1. Fundamental

1-1. fundamental/status

1-2. fundamental/control/acquire

1-3. fundamental/control/release

##### 9.1.3.3 API requirement read


2. Read

2-1. read/observation

2-2. read/expedition
     {p}/latestBattleLog
     {p}/simulationRun

2-3. read/party
     {p}/partySummary
     {p}/character/{c}/status
     {p}/character/{c}/equipment

2-4. read/base
     searchItems
     shopItemsList

2-5. read/diary
     {p}/diarySetting
     {p}/diaryEntry/{d}

2-6. read/setting
     enemyEditPane
     modeSelect
     debug

2-7. read/resources
     developerNewsNotification
     donationBox
     clairvoyance/{p}
     glossary/subcategory
     itemCompendium/subcategory
     characterRoster/subcategory
     bestiary/subcategory
     superRareList


##### 9.1.3.4 API requirement — Commit

**3. Commit**

**3-1. `commit/progress`**

* Parameters:
  * `elapsedSeconds`
    * Unit: seconds.
    * Maximum: `43200` seconds (12 hours).

**3-2. `commit/expedition`**

**3-2-1. `{p}/changeExpedition`**

* Parameters:
  * `destination`
    * Example: `3`.
    * Validation: the specified destination must be unlocked.
  * `depthLimit`
    * Example: `17` (`5F-1`).
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

**3-3. `commit/party`**

**3-3-1. `{p}/partyUpdate`**

* Parameters:
  * `deityId`
    * Example: `restoration`
  * `order`
    * Array of character IDs in party order.
    * Example:  `[101, 102, 103, 104, 105, 106]`

* Partial updates are allowed.

**3-3-2. `{p}/character/{c}/changeBuild`**

* Parameters:
  * `name`
  * `races`
  * `gender`
  * `mainClassId`
    * Example: `fighter`
  * `subClassId`
    * Example: `ranger`
  * `lineage`
  * `predisposition`

* Validation:
  * Same as `2.1 CHARACTER_&_PARTY` 
* Partial updates are allowed.

**3-3-3. `{p}/character/{c}/equipment`**

* Operations:
  * `removeAll`
  * `remove`
  * `equip`
  * `setLock`
  * `autoEquipment`

* Parameters:
  * `targetItemId`
    * Required for `remove`, `equip`, and `setLock`.
    * Not used for `removeAll` or `autoEquipment`.
  * `locked`
    * Required only for `setLock`.
    * Boolean: `true` or `false`.
  * `mode`
    * Used only for `autoEquipment`.
    * Example: `FULL`, `SEMI`, `OFF`


**3-4. `commit/base`**

**3-4-1. `changeJewelPriorityParty`**

* Parameters:
  * `partyNumber`
    * Example: 2 (PT2 -> 2)
    * If no party is assigned priority: `none`


**3-4-2. `sellInventoryItems`**

* Parameters:
  * `items`
    * Array of items to sell. One or more entries may be specified in a single request.
    * Each entry:
      * `itemId`
        * Example: 1104
      * `enhancement`
        * Example: 0
      * `superRare`
        * Exmaple: 0
      * `quantity`
        * Example: 3, `ALL`


**3-4-3. `purchaseShopItems`**

* Parameters:
  * `items` 
    * Array of items to buy. One or more entries may be specified in a single request.
    * Each Entry:
      * `shopItemId`
        * Example: 1


**3-5. `commit/diary`**

**3-5-1. `{p}/diarySetting`**

* Parameters:
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

* Partial updates are allowed.
* Omitted fields retain their current values.


**3-5-2. `{p}/diaryEntry/markAsRead`**

* Parameters:
  * `entryId`
    * Example: 0, 1, 2
    * Example: `ALL` 

**3-6. `commit/setting`**

**3-6-1. `modeSelect`**

* Parameters:
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


**3-6-2. `enemyEditPane`**

* Parameters:
  * `enemyLevel`
    * Integer: `1–99`.
    * Example: `10`.
  * `enemyName`
    * Example: `ミーティア`.
  * `terrainEffect`
    * Terrain-effect ID.
    * Example: `none`.
  * `enemyType`
    * Example: `Jinma`.
  * `mainClass`
    * Example: `class.duelist`.
  * `subClass`
    * Use `none` when no subclass is assigned.
    * Example: `none`.
  * `addedAbilities`
    * Array of additional abilities.
    * Up to `5` entries may be specified.
    * Each entry:
      * `abilityId`
        * Use `none` when no ability is assigned.
        * Example: `a.iaigiri`.
      * `level`
        * Integer: `1–5`.
        * Example: `1`.

* Partial updates are allowed.
* Omitted fields retain their current values.

**3-6-3. `debug`**

* Parameters:
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

* Partial updates are allowed.
* Omitted fields retain their current values.

**3-6-4. `backup`**

**3-6-4-1. `backup/export`**

* Parameters: none.


**3-6-4-2. `backup/import`**

* Parameters: imported file.


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

