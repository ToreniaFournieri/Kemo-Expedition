## 9. Environment

### 9.1 Desktop distribution

#### 9.1.3 Experimental AI API — Endpoint Contracts

##### 9.1.3.1 Endpoint

`/api/v1/`

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
     {p}/partyUpdate/
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


Path Parameters

{p}: Party number, 1–6
{c}: Character index within the party, 0–5
{d}: Diary-entry index


##### 9.1.3.2 Details

1. Fundamental

1-1. fundamental/status

1-2. fundamental/control/acquire

1-3. fundamental/control/release


**3. Commit**

**3-1. `commit/progress`**

**3-1-1. `elapsedSeconds`**

```http
POST /api/v1/commit/progress
```

```json
{
  "elapsedSeconds": 3600
}
```

* Maximum: `43200` seconds (12 hours).

**3-2. `commit/expedition`**

**3-2-1. `{p}/changeExpedition`**

```http
POST /api/v1/commit/expedition/{p}/changeExpedition
```

```json
{
  "destination": 3,
  "depthLimit": 20,
  "difficultyOffset": 8
}
```

**3-2-2. `{p}/sortie`**

```http
POST /api/v1/commit/expedition/{p}/sortie
```

```json
{}
```

An empty request body may also be allowed.

**3-2-3. `{p}/godBattle`**

```http
POST /api/v1/commit/expedition/{p}/godBattle
```

```json
{
  "targetId": "someGodId"
}
```

If the target is already selected in the game state, an empty request body may be used instead.

**3-3. `commit/party`**

**3-3-1. `{p}/partyUpdate`**

```http
POST /api/v1/commit/party/{p}/partyUpdate
```

```json
{
  "deityId": "restoration",
  "order": [
    101,
    102,
    103,
    104,
    105,
    106
  ]
}
```

Partial updates are allowed.

Example: change only the deity.

```json
{
  "deityId": "restoration"
}
```

Example: change only the party order.

```json
{
  "order": [
    103,
    101,
    102,
    104,
    106,
    105
  ]
}
```

**3-3-2. `{p}/character/{c}/changeBuild`**

```http
POST /api/v1/commit/party/{p}/character/{c}/changeBuild
```

```json
{
  "mainClassId": "fighter",
  "subClassId": "ranger",
  "gender": "male"
}
```

The request may include other character-build fields supported by the runtime.


**3-3-3. `{p}/character/{c}/equipment`**

```http
POST /api/v1/commit/party/{p}/character/{c}/equipment
```

Examples:

Remove all equipment:

```json
{
  "operation": "removeAll"
}
```

Remove specific equipment:

```json
{
  "operation": "remove",
  "equipmentInstanceIds": [
    "eq-10035",
    "eq-10042"
  ]
}
```

Equip items:

```json
{
  "operation": "equip",
  "equipmentInstanceIds": [
    "eq-10035",
    "eq-10042"
  ]
}
```

Change equipment lock status:

```json
{
  "operation": "setLock",
  "equipmentInstanceIds": [
    "eq-10035"
  ],
  "locked": true
}
```

Run Auto Equipment:

```json
{
  "operation": "autoEquipment",
  "mode": "full"
}
```


**3-4. `commit/base`**

**3-4-1. `changeJewelPriorityParty`**

```http
POST /api/v1/commit/base/changeJewelPriorityParty
```

```json
{
  "party": 2
}
```

If no party is assigned priority:

```json
{
  "party": null
}
```

**3-4-2. `sellInventoryItems`**

```http
POST /api/v1/commit/base/sellInventoryItems
```

```json
{
  "items": [
    {
      "itemId": 1104,
      "quantity": 3
    },
    {
      "itemId": 1207,
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

* sample need to define the key

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


## 3-6. `commit/setting`

### 3-6-1. `modeSelect`

```http
POST /api/v1/commit/setting/modeSelect
```

```json
{
  "mode": "orca"
}
```

### 3-6-2. `enemyEditPane`


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


### 3-6-3. `debug`

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


### 3-6-5. `feedback`

The request structure depends on the feedback implementation.

Example:

```http
POST /api/v1/commit/setting/feedback
```

```json
{
  "category": "gameplay",
  "message": "Example feedback message."
}
```

## Path parameters

* `{p}`: Party number, `1–6`.
* `{c}`: Character index within the party, `0–5`.
* `{d}`: Diary-entry index.

## General request-design rule

The URL identifies the operation, while the JSON request body contains only the parameters required by that operation.

Prefer:

```http
POST /api/v1/commit/expedition/{p}/changeExpedition
```

```json
{
  "destination": 3,
  "depthLimit": 20,
  "difficultyOffset": 8
}
```

Instead of:

```json
{
  "changeExpedition": {
    "destination": 3,
    "depthLimit": 20,
    "difficultyOffset": 8
  }
}
```
