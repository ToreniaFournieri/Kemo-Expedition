## 9. Environment

### 9.1 Desktop distribution

#### 9.1.4 API Endpoints v1

This document defines the HTTP contract for the API requirements in
`Specification_9.1.3_API.md`. That document is authoritative for game
behavior and availability; this document is authoritative for HTTP methods,
paths, parameter placement, response shapes, and errors.

`Specification_9.1.4_API_ENDPOINTS(experimental).md` and all
`/experimental/v1` contracts are obsolete and MUST NOT be used.

##### 9.1.4.1 Contract conventions

###### Protocol and session

* Base path: `/api/v1` without a required trailing slash.
* Requests and responses use HTTP and JSON unless a file operation says
  otherwise. JSON property names and enum values are case-sensitive.
* JSON property names use `camelCase`; existing game IDs retain their defined
  spelling.
* JSON responses use `Content-Type: application/json; charset=utf-8` and
  `Cache-Control: no-store`.
* Clients MUST ignore unknown response properties. Unknown request properties
  return `400 invalid_request`.
* The API has at most one logged-in user. `logIn` establishes the process-wide
  session and exclusive control; `logOut` ends both.
* Status, sign-up, login, and Help do not require login. All other endpoints do.
* This version has no client-supplied session token. Access belongs to the one
  active API instance and its exclusive-control state.

###### Requests and commits

* GET filters are query parameters. Repeated scalar parameters are invalid.
* POST parameters are one JSON object unless a file operation says otherwise.
* Omission applies a documented default. `null` is invalid unless explicitly
  allowed. Numeric fields are unlocalized JSON numbers.
* Parameterless endpoints accept no query parameters and either no body or
  `{}`.
* Read, Help, and Resources operations do not modify game state, including
  Diary read state.
* Every Commit request is atomic and serialized with other API and UI
  mutations. Validate all supplied fields and entries before installing state.
  On failure, commit none of the supplied changes.
* API operations MUST call the same authoritative game and validation logic as
  the UI; API-only copies of game rules are non-conforming.
* A successful Commit response contains at least `{ "ok": true }`. Documented
  result fields may appear beside `ok`.

###### Common formats

* **Item value:** `<lockStatus>/<itemId>/<enhancement>/<superRare>`.
  `lockStatus` is `0` or `1`; enhancement is `0–6`; Super Rare is
  `0–80`. Empty item is `0`. Example: `0/1101/2/0`.
* **Equipment-slot value:** occupied:
  `<slotIndex>/<lockStatus>/<itemId>/<enhancement>/<superRare>`, optionally
  followed by `/<jewelType>:<jewelRank>`; empty: `0`.
  Jewel type is `might`, `arcana`, `fort`, `ward`, `shade`, or
  `focus`; rank is `1–8`.
* **Item category:** `sword`, `katana`, `bow`, `armor`, `glove`,
  `wand`, `robe`, `shield`, `bolt`, `book`, `catalyst`, `arrow`,
  or `jewel`.
* `current` is the current value. `editableFields` states which fields may
  change. `validOptions` contains values accepted by the corresponding Commit
  operation at that state. A later state change may invalidate an old option.

###### Errors

All errors use:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "The request is invalid.",
    "details": { "field": "difficultyOffset" }
  }
}
```

`code` is stable. Clients MUST NOT parse `message`. `details` is optional;
`details.field` identifies an invalid JSON member, query, or path parameter.
Errors MUST NOT expose partially staged state or undisclosed random results.

| Status | Code | Meaning |
|-|-|-|
| 400 | `invalid_request` | Invalid syntax, field, type, range, enum, combination, or file. |
| 401 | `login_required` | No active API login. |
| 404 | `not_found` | Requested visible resource does not exist. |
| 409 | `already_exists` | Sign-up identity already exists. |
| 409 | `control_unavailable` | Exclusive API control is unavailable. |
| 409 | `illegal_action` | Valid request is unavailable under current game rules. |
| 409 | `confirmation_required` | Destructive action requires confirmation. |
| 413 | `payload_too_large` | File or attachments exceed the operation limit. |
| 500 | `save_failed` | Save load or atomic persistence failed. |
| 500 | `internal_error` | Unexpected failure. |

##### 9.1.4.2 Endpoint index

| Method | Endpoint | Login | Purpose |
|-|-|-|-|
| GET | `/api/v1/fundamental/status` | No | API/runtime status. |
| POST | `/api/v1/fundamental/signUp` | No | Create user and save. |
| POST | `/api/v1/fundamental/logIn` | No | Log in and acquire control. |
| POST | `/api/v1/fundamental/logOut` | Yes | Persist and release control. |
| GET | `/api/v1/read/observation` | Yes | Compact observation. |
| GET | `/api/v1/read/expedition/{p}/setting` | Yes | Expedition settings/options. |
| GET | `/api/v1/read/expedition/{p}/latestBattleLog` | Yes | Latest retained log. |
| GET | `/api/v1/read/expedition/{p}/simulationRun` | Yes | Private 1,000-run forecast. |
| GET | `/api/v1/read/build/party/{p}` | Yes | Party build/options. |
| GET | `/api/v1/read/build/character/{characterId}/status` | Yes | Character build/options. |
| GET | `/api/v1/read/build/character/{characterId}/equipment` | Yes | Equipment/mode. |
| GET | `/api/v1/read/base/searchItems` | Yes | Search known items. |
| GET | `/api/v1/read/base/jewelPriorityParty` | Yes | Jewel priority. |
| GET | `/api/v1/read/base/shopItemsList` | Yes | Shop lineup. |
| GET | `/api/v1/read/diary/{p}/diarySetting` | Yes | Diary settings/options. |
| GET | `/api/v1/read/diary/diaryEntry/{diaryEntryId}` | Yes | Retained Diary entry. |
| GET | `/api/v1/read/setting/enemyEditPane` | Yes | Enemy editor/options. |
| GET | `/api/v1/read/setting/modeSelect` | Yes | Mode/settings options. |
| GET | `/api/v1/read/setting/debug` | Yes | Debug settings/options. |
| POST | `/api/v1/commit/progress` | Yes | Advance progression. |
| POST | `/api/v1/commit/expedition/{p}/changeExpedition` | Yes | Change expedition. |
| POST | `/api/v1/commit/expedition/{p}/sortie` | Yes | Resolve one sortie. |
| POST | `/api/v1/commit/expedition/{p}/godsBattle` | Yes | Resolve one Gods Battle. |
| POST | `/api/v1/commit/build/party/{p}` | Yes | Change party build. |
| POST | `/api/v1/commit/build/character/{characterId}/changeBuild` | Yes | Change character build. |
| POST | `/api/v1/commit/build/character/{characterId}/removeAllEquipment` | Yes | Remove all equipment. |
| POST | `/api/v1/commit/build/character/{characterId}/removeEquipment` | Yes | Remove selected slots. |
| POST | `/api/v1/commit/build/character/{characterId}/equip` | Yes | Equip owned items. |
| POST | `/api/v1/commit/build/character/{characterId}/autoEquipment` | Yes | Set/run Auto Equipment. |
| POST | `/api/v1/commit/base/changeJewelPriorityParty` | Yes | Change Jewel priority. |
| POST | `/api/v1/commit/base/sellInventoryItems` | Yes | Sell inventory items. |
| POST | `/api/v1/commit/base/purchaseShopItems` | Yes | Purchase shop entries. |
| POST | `/api/v1/commit/diary/{p}/diarySetting` | Yes | Change Diary settings. |
| POST | `/api/v1/commit/diary/diaryEntry/markAsRead` | Yes | Mark Diary entries read. |
| POST | `/api/v1/commit/setting/enemyEditPane` | Yes | Change enemy editor. |
| POST | `/api/v1/commit/setting/modeSelect` | Yes | Change mode/settings. |
| POST | `/api/v1/commit/setting/debug` | Yes | Change debug settings. |
| POST | `/api/v1/commit/setting/backup/export` | Yes | Export active save. |
| POST | `/api/v1/commit/setting/backup/import` | Yes | Import backup. |
| POST | `/api/v1/commit/setting/backup/reset` | Yes | Request/confirm reset. |
| POST | `/api/v1/commit/setting/feedback` | Yes | Submit feedback. |
| GET | `/api/v1/help/overview` | No | API overview. |
| GET | `/api/v1/help/endpoints` | No | Endpoint reference. |
| GET | `/api/v1/resources/developerNewsNotification` | Yes | Developer news. |
| GET | `/api/v1/resources/donationBox` | Yes | Donation status. |
| GET | `/api/v1/resources/clairvoyance/{p}` | Yes | Clairvoyance data. |
| GET | `/api/v1/resources/glossary` | Yes | Glossary query. |
| GET | `/api/v1/resources/itemCompendium` | Yes | Compendium query. |
| GET | `/api/v1/resources/characterRoster` | Yes | Race roster query. |
| GET | `/api/v1/resources/bestiary` | Yes | Bestiary query. |
| GET | `/api/v1/resources/superRareList` | Yes | Super Rare list. |

Path parameters: `{p}` is unlocked party number `1–6`;
`{characterId}` is a stable character ID; `{diaryEntryId}` is a stable,
currently retained Diary-entry ID.

##### 9.1.4.3 Fundamental

###### `GET /api/v1/fundamental/status`

Returns `systemStatus`, `versionBuild`, and `environment`. It MUST NOT
create, acquire, renew, or release a session.

###### `POST /api/v1/fundamental/signUp`

Body: `userId` (required, `[A-Za-z0-9_-]{1,16}`), `gameMode` (required,
`normal|orca`), and `levelOffsetForOrca` (Orca only, integer `0–20`,
default `5`; omit for Normal). Returns `201 Created` with those fields
(`levelOffsetForOrca: null` for Normal). Creates the section 9.1.3.2 save path
but does not log in. Existing identity returns `409 already_exists`.

###### `POST /api/v1/fundamental/logIn`

Uses the same identity fields and validation as sign-up. The user must exist.
On success, loads the save, pauses normal real-time progression, acquires API
control, and returns `ok` plus the resolved identity. Missing user returns
`404 not_found`; occupied control returns `409 control_unavailable`.

###### `POST /api/v1/fundamental/logOut`

Persists before ending the session/control and returns `{ "ok": true }`.
`500 save_failed` MUST leave login/control active so pending in-memory progress
can be retried safely.

##### 9.1.4.4 Read

###### `GET /api/v1/read/observation`

Returns:

* `globalInfo`: `gameMode`, `inGameTime`, `gold`, `prana`.
* `partyInfo`: per party, `party` (`level`, `experiencePoint`,
  `deity`, `deityRank`, `condition`), `state`, `lastDestination`, `lastOutcome`.
  Experience uses `<percentage>/<current>/<nextLevel>`.
* `attention.latestSimulationResult`: latest stored simplified 100-run
  summaries using
  `<partyIdTag>/Clear <percent>/Return <percent>/Draw <percent>/Retreat <percent>/Defeat <percent>`.
  This read does not run a simulation.
* `attention.emptyEquipmentSlot`: values
  `<characterId>/<numberOfEmptySlots>`.
* `attention.notification`: per party, `unreadDiary` and
  `unreadDiaryTitle` values
  `<diaryEntryId>/<title>/<subtitle>/<YYYYMMDD HH:MM>`.

It MUST NOT mark Diary entries read.

###### `GET /api/v1/read/expedition/{p}/setting`

Returns `current` and `validOptions` for `destination`, `depthLimit`, and
`difficultyOffset`. Depth values are IDs such as `1f-3`, `5f-4`,
`beforeBoss`, or `all`; difficulty values are valid even integers.

###### `GET /api/v1/read/expedition/{p}/latestBattleLog`

Returns `battleLog` and `bottleneckEnemies`. Bottlenecks are disclosed
enemies producing at least 35% damage taken or a Draw/Defeat. The array is empty
when none qualify. This endpoint does not generate a battle or disclose hidden
enemies.

###### `GET /api/v1/read/expedition/{p}/simulationRun`

Runs exactly 1,000 private forecast trials of the current expedition. It does
not advance progression, return rewards, consume live randomness, write Diary,
change equipment, or consume charge. Returns `overview` as
`Success/Draw/Retreat/Defeat` percentages and ordered room `detail` as
`<floorRoom>/Success .../Draw .../Retreat .../Defeat .../Not reached ...`.
Overview Success combines Clear and Return; room Success means a room win.

###### `GET /api/v1/read/build/party/{p}`

Returns `current: { deityId, order }` and matching `validOptions`. Commit
order must contain every current member ID exactly once.

###### `GET /api/v1/read/build/character/{characterId}/status`

Returns `calculatedStatus`, `current`, `editableFields`, and
`validOptions`. Current contains `unique`, `name`, `racesAndGender`,
`mainClassId`, `subClassId`, `lineage`, and `predisposition`.
Race/gender uses `<race>/<gender>` or
`mimorian/<gender>/<targetEnemyId>`. Unique-character restrictions follow
section 9.1.3.3.

###### `GET /api/v1/read/build/character/{characterId}/equipment`

Returns `current.mode` (`FULL|SEMI|OFF`) and equipment-slot values in slot
order, plus `validOptions.mode` and
`validOptions.numberOfEmptyEquipmentSlots`.

###### `GET /api/v1/read/base/searchItems`

Queries: `state` (`owned|equipped|sold|all`, default `owned`);
`category` (required); optional `rarity`, `superRare` boolean,
`superRareId` `0–80`, `itemId`, `searchAbility`, `searchBonus`, and
`details` (`none|ability|cBonus|otherBonus|abilityAndCBonus|all`, default
`abilityAndCBonus`). Positive `superRareId` conflicts with
`superRare=false`.

Returns stacked `items` as `<Item value>/<quantity>`, `equippedItems` as
`<party>/<characterId>/<Item value>`, and requested `details` keyed by
`<itemId>/<superRare>`.

###### `GET /api/v1/read/base/jewelPriorityParty`

Returns `current.partyNumber` and `validOptions.partyNumber`; value is an
available party number or string `none`.

###### `GET /api/v1/read/base/shopItemsList`

Returns `current.items` as
`<shopItemId>/<itemId>/<price>/<availability>` and
`validOptions.items` as currently purchasable shop IDs.

###### `GET /api/v1/read/diary/{p}/diarySetting`

Returns current/options for every section 9.1.3.3 Diary field. Rarity thresholds
accept `all|1–6|none`; side-quest threshold `all|2–8|none`; defeat mode
`defeatOnly|defeatAndDraw|defeatDrawRetreat|all|none`; notification toggles
are booleans.

###### `GET /api/v1/read/diary/diaryEntry/{diaryEntryId}`

Returns the complete retained entry identified by stable ID, including stored
metadata, summary, and retained detail. It MUST NOT mark it read. Missing or
expired retention returns `404 not_found`.

###### `GET /api/v1/read/setting/enemyEditPane`

Returns current/options for `enemyLevel` (`1–99`), `enemyName`,
`terrainEffect`, `enemyType`, `mainClass`, `subClass`, and up to five
`addedAbilities: { abilityId, level }` entries; level is `1–5`.

###### `GET /api/v1/read/setting/modeSelect`

Returns current/options for `mode` (`mode.normal|mode.orca`),
`enemyLevelOffset` (`0–20`), `language` (`ja|en|zh-CN|zh-TW`),
`darkMode` (`off|on|system`), boolean `autoRepeat`, and the theme IDs
listed in section 9.1.3.3.

###### `GET /api/v1/read/setting/debug`

Returns current/options for every debug field in section 9.1.3.3. Values
unavailable in the active environment are omitted from `validOptions`.

##### 9.1.4.5 Commit

###### `POST /api/v1/commit/progress`

Body: `elapsedSeconds`, required integer `0–43200`. Advances the active save
through authoritative progression and persists once. Returns `ok` and
`elapsedSeconds`. Failure installs no partial progression.

###### `POST /api/v1/commit/expedition/{p}/changeExpedition`

Non-empty subset of `destination`, `depthLimit`, `difficultyOffset`.
Omitted fields retain current values. Validate the combined final configuration
against current options. Returns `ok` and full resulting `current`.

###### `POST /api/v1/commit/expedition/{p}/sortie`

Resolves one normal sortie using current legal configuration. Returns `ok`
and the authoritative completed `result` summary retained by runtime.
Unavailable sortie returns `409 illegal_action`.

###### `POST /api/v1/commit/expedition/{p}/godsBattle`

Resolves one currently available Gods Battle and returns `ok` and its
authoritative completed `result`. Unavailable battle returns
`409 illegal_action`.

###### `POST /api/v1/commit/build/party/{p}`

Non-empty subset of `deityId` and `order`. Deity must be available; order
contains every member ID exactly once. Returns `ok` and full `current`.

###### `POST /api/v1/commit/build/character/{characterId}/changeBuild`

Non-empty subset of `name`, `racesAndGender`, `mainClassId`,
`subClassId`, `lineage`, `predisposition`. Validate the combined final
build, editability, paired uniqueness, and Mimorian rules before changes.
Returns `ok` and full resulting `current`.

###### `POST /api/v1/commit/build/character/{characterId}/removeAllEquipment`

Removes all equipment through the UI's authoritative behavior. Returns
`{ "ok": true }`.

###### `POST /api/v1/commit/build/character/{characterId}/removeEquipment`

Body `targetEquipment` is one slot index or a non-empty array of distinct
existing slot indexes. Invalid/duplicate slots reject all removal.

###### `POST /api/v1/commit/build/character/{characterId}/equip`

`targetEquipment` is one Item value or a non-empty array. Every requested
variant must be owned in sufficient quantity. Client cannot choose slots;
authoritative UI logic assigns and sorts legal slots. Jewels cannot be directly
specified.

###### `POST /api/v1/commit/build/character/{characterId}/autoEquipment`

Body requires `mode` (`FULL|SEMI|OFF`) and boolean
`immediateAutoEquipment`. When true, apply the mode before running
authoritative Auto Equipment. Returns `ok` and resulting `mode`.

###### `POST /api/v1/commit/base/changeJewelPriorityParty`

Body `partyNumber` is a currently valid party number or string `none`.
Returns `ok` and resulting `partyNumber`.

###### `POST /api/v1/commit/base/sellInventoryItems`

Body `items` is a non-empty array of
`<Item value>/<positive quantity|ALL>`. Requested variants must be owned and
sellable; summed quantities cannot exceed ownership. Validate all before sale.

###### `POST /api/v1/commit/base/purchaseShopItems`

Body `items` is a non-empty array of `{ "shopItemId": 1 }`. IDs must be
distinct, visible, available, and jointly affordable. Use authoritative shop
rules and validate the complete purchase before committing any entry.

###### `POST /api/v1/commit/diary/{p}/diarySetting`

Accepts a non-empty subset of matching Read fields. Values must be in current
options; omitted fields remain. Returns `ok` and full resulting `current`.

###### `POST /api/v1/commit/diary/diaryEntry/markAsRead`

Body `diaryEntryId` is a retained numeric ID or string `ALL`. `ALL` marks
all currently retained entries read.

###### `POST /api/v1/commit/setting/enemyEditPane`

Accepts a non-empty subset of matching Read fields. `addedAbilities`, when
supplied, replaces the full list and has at most five entries. Omitted fields
remain. Returns `ok` and full `current`.

###### `POST /api/v1/commit/setting/modeSelect`

Body requires `mode`, `enemyLevelOffset`, `language`, `darkMode`, `autoRepeat`,
and `theme`. Values must be currently valid. `enemyLevelOffset` applies only to
Orca and is ignored by Normal mode. Environment-fixed values cannot change.
Returns `ok` and full `current`.

###### `POST /api/v1/commit/setting/debug`

Accepts a non-empty subset of section 9.1.3.4 debug fields. Values must be
currently valid; omitted fields remain. If Debug Mode is unavailable, changing
debug fields returns `409 illegal_action`.

###### `POST /api/v1/commit/setting/backup/export`

Returns `200 OK`, `Content-Type: application/octet-stream`,
`Content-Disposition: attachment`, and authoritative backup bytes. It does
not modify the active save.

###### `POST /api/v1/commit/setting/backup/import`

Request body is backup bytes with `Content-Type: application/octet-stream`.
Decode, validate, migrate, and stage the entire file before replacement.
Success returns JSON `{ "ok": true }`. Invalid input returns
`400 invalid_request`; install/persist failure returns `500 save_failed` and
retains the prior active save.

###### `POST /api/v1/commit/setting/backup/reset`

Initial `{}` MUST NOT reset. It returns `409 confirmation_required` with
`error.details.confirmationToken` and warning. Confirmation sends that token.
Valid token atomically resets/persists, is single-use and short-lived, is bound
to active user/save, and returns `{ "ok": true }`.

###### `POST /api/v1/commit/setting/feedback`

Uses `multipart/form-data`. Text parts: required `name`, `category`,
`text`, required boolean `includeBackup`, optional
`latestBattleLogParty`. Up to four optional image `attachments` parts.
Apply the Feedback UI's validation/limits. Returns `{ "ok": true }` and does
not alter gameplay state.

##### 9.1.4.6 Help

Help requires no login, uses `text/markdown; charset=utf-8` and
`Cache-Control: no-store`, and reflects files packaged with the running build.

###### `GET /api/v1/help/overview`

Returns the section `9.1.4.2 Endpoint index`.

###### `GET /api/v1/help/endpoints`

Returns `Specification_9.1.4_API_ENDPOINTS(v1).md`.

##### 9.1.4.7 Resources

###### `GET /api/v1/resources/developerNewsNotification`

Returns `entries` containing `version`, `date`, and active-language
`content`, in authoritative developer-news order.

###### `GET /api/v1/resources/donationBox`

Returns `gods` values
`<deityId>/<rank>/<donatedGold>/<nextRankGold>`; next rank is `MAX` at max.

###### `GET /api/v1/resources/clairvoyance/{p}`

Returns section 9.1.3.5 `reward`, `enhancement`, `superRare`, `sideQuest`,
and `sleepiness` counts. Sleepiness contains `noSleep`, `nap`,
`soundSleep`. If unavailable, returns `{ "status": "unavailable" }`.

###### `GET /api/v1/resources/glossary`

Required query `category` is `Ab.|Base.|Fixed.|Inc.|Mech.|Faith.|Magic.|Quest.|Terrain.`.
Returns active-language `entries` in authoritative Glossary order.

###### `GET /api/v1/resources/itemCompendium`

Required query `category`; optional `rarity`, `tier` (`1–8`), `itemId`,
`searchAbility`, `searchBonus`, and `details` using the searchItems values
and default. Returns `items` with `itemId`, localized `name`, `rarity`,
`tier`, and only requested `ability`, `cBonus`, `otherBonus` details, in
authoritative Compendium order.

###### `GET /api/v1/resources/characterRoster`

Required query `race` is one section 9.1.3.5 selectable race. Returns
`status`, `bonus`, `defaultAbility`, `unlockAbility`.

###### `GET /api/v1/resources/bestiary`

Optional filters: `enemyId`, `enemyType`, `expedition`. With no filters, return
all currently player-visible entries. Returns only player-visible `enemies` in
authoritative Bestiary order.

###### `GET /api/v1/resources/superRareList`

Returns `superRare` values
`<superRareId>/<localizedName>/<bonus>` in ascending ID order.

##### 9.1.4.8 Completeness and visibility

* Every section 9.1.3.1 endpoint MUST appear exactly once in the index and once
  in detailed sections.
* Runtime options MUST come from the same authority as UI options.
* Stable IDs and raw numbers are authoritative; localized strings are display
  metadata.
* Reads MUST NOT expose future rolls, bag order, undisclosed enemies/outcomes,
  complete internal saves, or renderer fields.
* No v1 endpoint may redirect to, alias, or require an
  `/experimental/v1` operation.

[EOF]
