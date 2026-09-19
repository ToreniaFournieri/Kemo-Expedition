## 9. Environment

### 9.1 Desktop distribution

#### 9.1.4 API detail


- TBA


##### 9.1.4.X API requirement — Errors

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

##### 9.1.4.x Endpoint index

| Method | Endpoint        | Login | Purpose      |
| ------ | ----------------------------------------------------------------- | ----- | ---------------------------------------- |
| GET    | `/api/v1/fundamental/status`    | No    | API/runtime status.    |
| POST   | `/api/v1/fundamental/signUp`    | No    | Create user and save.  |
| POST   | `/api/v1/fundamental/logIn`     | No    | Log in and acquire control.  |
| POST   | `/api/v1/fundamental/logOut`    | Yes   | Persist and release control. |
| GET    | `/api/v1/read/observation`      | Yes   | Compact observation.   |
| GET    | `/api/v1/read/expedition/{p}/setting`       | Yes   | Expedition settings/options. |
| GET    | `/api/v1/read/expedition/{p}/latestBattleLog`   | Yes   | Latest retained log.   |
| GET    | `/api/v1/read/expedition/{p}/simulationRun` | Yes   | Private 1,000-run forecast.  |
| GET    | `/api/v1/read/expedition/{p}/chargeStock`   | Yes   | Charge stock/status.   |
| GET    | `/api/v1/read/build/party/{p}`        | Yes   | Party build/options.   |
| GET    | `/api/v1/read/build/character/{characterId}/status`   | Yes   | Character build/options. |
| GET    | `/api/v1/read/build/character/{characterId}/equipment`  | Yes   | Equipment/mode.    |
| GET    | `/api/v1/read/build/character/{characterId}/equipmentSet`   | Yes   | Saved equipment sets.  |
| GET    | `/api/v1/read/base/searchItems`       | Yes   | Search known items.    |
| GET    | `/api/v1/read/base/jewelPriorityParty`      | Yes   | Jewel priority.    |
| GET    | `/api/v1/read/base/shopInfo`    | Yes   | Shop status/information. |
| GET    | `/api/v1/read/base/shopItemsList`     | Yes   | Shop lineup.       |
| GET    | `/api/v1/read/base/altarInfo`         | Yes   | Altar status/information.    |
| GET    | `/api/v1/read/base/enemyFormList`     | Yes   | Enemy-form list/options. |
| GET    | `/api/v1/read/diary/{p}/diarySetting`       | Yes   | Diary settings/options.  |
| GET    | `/api/v1/read/diary/diaryEntry/{diaryEntryId}`  | Yes   | Retained Diary entry.  |
| GET    | `/api/v1/read/setting/enemyEditPane`        | Yes   | Enemy editor/options.  |
| GET    | `/api/v1/read/setting/modeSelect`     | Yes   | Mode/settings options.   |
| GET    | `/api/v1/read/setting/debug`    | Yes   | Debug settings/options.  |
| POST   | `/api/v1/commit/progress`       | Yes   | Advance progression.   |
| POST   | `/api/v1/commit/expedition/{p}/changeExpedition`  | Yes   | Change expedition. |
| POST   | `/api/v1/commit/expedition/{p}/sortie`      | Yes   | Resolve one sortie.    |
| POST   | `/api/v1/commit/expedition/{p}/godsBattle`  | Yes   | Resolve one Gods Battle. |
| POST   | `/api/v1/commit/build/party/{p}`      | Yes   | Change party build.    |
| POST   | `/api/v1/commit/build/character/{characterId}/changeBuild`  | Yes   | Change character build.  |
| POST   | `/api/v1/commit/build/character/{characterId}/removeAllEquipment` | Yes   | Remove all equipment.  |
| POST   | `/api/v1/commit/build/character/{characterId}/removeEquipment`    | Yes   | Remove selected slots.   |
| POST   | `/api/v1/commit/build/character/{characterId}/equip`  | Yes   | Equip owned items. |
| POST   | `/api/v1/commit/build/character/{characterId}/autoEquipment`  | Yes   | Set/run Auto Equipment.  |
| POST   | `/api/v1/commit/build/character/{characterId}/saveEquipmentSet`   | Yes   | Save current equipment set.  |
| POST   | `/api/v1/commit/build/character/{characterId}/loadEquipmentSet`   | Yes   | Load a saved equipment set.  |
| POST   | `/api/v1/commit/build/character/{characterId}/deleteEquipmentSet` | Yes   | Delete a saved equipment set.  |
| POST   | `/api/v1/commit/build/character/{characterId}/undoEquipment`  | Yes   | Undo the latest equipment change.  |
| POST   | `/api/v1/commit/build/character/{characterId}/redoEquipment`  | Yes   | Redo the latest undone equipment change. |
| POST   | `/api/v1/commit/base/changeJewelPriorityParty`  | Yes   | Change Jewel priority.   |
| POST   | `/api/v1/commit/base/sellInventoryItems`    | Yes   | Sell inventory items.  |
| POST   | `/api/v1/commit/base/purchaseShopItems`     | Yes   | Purchase shop entries.   |
| POST   | `/api/v1/commit/base/restoreSoldItems`      | Yes   | Restore sold inventory items.  |
| POST   | `/api/v1/commit/base/unlockForm`      | Yes   | Unlock an enemy form.  |
| POST   | `/api/v1/commit/diary/{p}/diarySetting`     | Yes   | Change Diary settings.   |
| POST   | `/api/v1/commit/diary/diaryEntry/markAsRead`    | Yes   | Mark Diary entries read. |
| POST   | `/api/v1/commit/setting/enemyEditPane`      | Yes   | Change enemy editor.   |
| POST   | `/api/v1/commit/setting/modeSelect`         | Yes   | Change mode/settings.  |
| POST   | `/api/v1/commit/setting/debug`        | Yes   | Change debug settings.   |
| POST   | `/api/v1/commit/setting/backup/export`      | Yes   | Export active save.    |
| POST   | `/api/v1/commit/setting/backup/import`      | Yes   | Import backup.     |
| POST   | `/api/v1/commit/setting/backup/reset`       | Yes   | Request/confirm reset.   |
| POST   | `/api/v1/commit/setting/feedback`     | Yes   | Submit feedback.   |
| POST   | `/api/v1/commit/setting/markNewsAsRead`     | Yes   | Mark developer news as read. |
| GET    | `/api/v1/help/overview`         | No    | API overview.      |
| GET    | `/api/v1/help/endpoints`        | No    | Endpoint reference.    |
| GET    | `/api/v1/resources/developerNewsNotification`   | Yes   | Developer news.    |
| GET    | `/api/v1/resources/donationBox`       | Yes   | Donation status.   |
| GET    | `/api/v1/resources/clairvoyance/{p}`        | Yes   | Clairvoyance data. |
| GET    | `/api/v1/resources/glossary`    | Yes   | Glossary query.    |
| GET    | `/api/v1/resources/itemCompendium`    | Yes   | Compendium query.  |
| GET    | `/api/v1/resources/characterRoster`         | Yes   | Race roster query. |
| GET    | `/api/v1/resources/bestiary`    | Yes   | Bestiary query.    |
| GET    | `/api/v1/resources/superRareList`     | Yes   | Super Rare list.   |


Path parameters: `{p}` is unlocked party number `1–6`;
`{characterId}` is a stable character ID; `{diaryEntryId}` is a stable,
currently retained Diary-entry ID.

[EOF]