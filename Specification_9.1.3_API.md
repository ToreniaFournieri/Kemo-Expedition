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
     elapsedSeconds

3-2. commit/expedition
     {p}/changeExpedition
     {p}/sortie
     {p}/godBattle

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
     {p}/diaryEntry/{d}/markAsRead

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
    * Example:  101, 102, 103, 104, 105, 106

* Partial updates are allowed.

**3-3-2. `{p}/character/{c}/changeBuild`**

* Parameters:
  * `name`
  * `races`
  * `gender"`
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

```json
{
  "items": [
    {
      "itemId": 1104,
      "enhancement": 0,
      "superRare": 0,
      "quantity": 3
    },
    {
      "itemId": 1207,
      "enhancement": 0,
      "superRare": 0,
      "quantity": 1
    }
  ]
}
```

If enhanced or unique items must be distinguished, use item-instance identifiers instead of only `itemId`.

**3-4-3. `purchaseShopItems`**

```http
POST /api/v1/commit/base/purchaseShopItems
```

```json
{
  "items": [
    {
      "shopItemId": 201,
      "quantity": 2
    },
    {
      "shopItemId": 207,
      "quantity": 1
    }
  ]
}
```

**3-5. `commit/diary`**

**3-5-1. `{p}/diarySetting`**

```http
POST /api/v1/commit/diary/{p}/diarySetting
```

* TBA: Define the supported `diarySetting` keys.

```json
{
  "settingA": true
}
```

If multiple diary triggers can be configured:

```json
{
  "settingA": true,
  "settingB": false,
}
```

**3-5-2. `{p}/diaryEntry/{d}/markAsRead`**

```http
POST /api/v1/commit/diary/{p}/diaryEntry/{d}/markAsRead
```

```json
{}
```


**3-6. `commit/setting`**

**3-6-1. `modeSelect`**

```http
POST /api/v1/commit/setting/modeSelect
```

```json
{
  "mode": "orca"
}
```

**3-6-2. `enemyEditPane`**


```http
POST /api/v1/commit/setting/enemyEditPane
```

```json
{
  "enemyLevel": 10,
  "enemyName": "ミーティア",
  "terrainEffect": "none",
  "enemyType": "Jinma",
  "mainClass": "class.duelist",
  "subClass": "none",
  "addedAbilities": [
    {
      "abilityId": "a.iaigiri",
      "level": 1
    },
    {
      "abilityId": "none",
      "level": 1
    },
    {
      "abilityId": "none",
      "level": 1
    },
    {
      "abilityId": "none",
      "level": 1
    },
    {
      "abilityId": "none",
      "level": 1
    }
  ]
}
```


**3-6-3. `debug`**

```http
POST /api/v1/commit/setting/debug
```

```json
{
  "runtimeDiagnostics": true,
  "clairvoyance": false,
  "speedOfTime": "x5",
  "godsBattleCondition": "normal",
  "godsStrength": "normal",
  "debugStoreOpen": false,
  "displayFlavorCondition": false,
  "displayAfkDuration": false,
  "displayAllBestiary": false,
  "displayAllCompendium": false,
  "displayAllGlossary": false,
  "colosseumMode": false
}
```

Partial updates are allowed.


**3-6-4. `backup`**

**3-6-4-1. `backup/export`**

```http
POST /api/v1/commit/setting/backup/export
```

```json
{}
```

* Exports the current save data as a backup file.

**3-6-4-2. `backup/import`**

```http
POST /api/v1/commit/setting/backup/import
```

**3-6-4-3. `backup/reset`**

```http
POST /api/v1/commit/setting/backup/reset
```

A Full Reset deletes all local save data.

Because this operation is destructive, it requires explicit confirmation.

Initial request:

```json
{}
```

Example response:

```json
{
  "status": "confirmationRequired",
  "warning": "This operation will permanently delete all local save data.",
  "confirmationToken": "xyz789"
}
```

Confirmation request:

```http
POST /api/v1/commit/setting/backup/reset
```

```json
{
  "confirmationToken": "xyz789",
  "confirm": true
}
```

On successful reset:

```json
{
  "status": "success"
}
```

**3-6-5. `feedback`**


```http
POST /api/v1/commit/setting/feedback
```

Example request:

```json
{
  "name": "Taro",
  "category": "featureRequest",
  "text": "Please add a comparison view for simulation results.",
  "latestBattleLogParty": 1,
  "includeBackup": true,
  "attachments": [
    "image-file-1",
    "image-file-2"
  ]
}
```

* `attachments`

  * Optional.
  * Up to 4 image attachments.


Example successful response:

```json
{
  "status": "success",
  "reward": {
    "eligible": true,
    "prana": 10
  },
  "nextRewardEligibleInSeconds": 604800
}
```
