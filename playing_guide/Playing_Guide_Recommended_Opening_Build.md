# Recommended Opening Build — Application API v1

This is a target opening build for a fresh `mode.orca` save with enemy level offset `+5` and Debug Mode off. Adjust it to the characters, unlocks, shop stock, and inventory in the active save. The retired AI Play evaluation protocol does not apply.

Use [Specification 9.1.3](../Specification_9.1.3_API.md) for operations and game rules, and [Specification 9.1.4](../Specification_9.1.4_API_DETAIL.md) for HTTP, authentication, revisions, and errors.

## 1. Connect and inspect the save

Enable **Application API v1** in the desktop Setting tab and obtain the loopback connection details and bootstrap token through the application. For a new API-controlled save, call `POST /api/v1/fundamental/signUp`, then `POST /api/v1/fundamental/logIn`. Login returns `sessionToken` and `controlLeaseToken`. Session requests require:

```text
Authorization: Bearer <bootstrapToken>
X-BoKemo-Session: <sessionToken>
X-BoKemo-Control-Lease: <controlLeaseToken>
```

Read `GET /api/v1/read/observation/compact` once for an opening overview. It runs a fresh private 100-run simulation for every unlocked party, so use focused reads for later checks:

```text
GET /api/v1/read/build/party/1
GET /api/v1/read/build/character/{characterId}/status
GET /api/v1/read/build/character/{characterId}/equipment
GET /api/v1/read/expedition/1/setting
GET /api/v1/read/base/shopItemsList
```

Confirm PT1 is party `1`, its six character IDs match the table below, and the desired choices appear in the relevant `current`, `validOptions`, and `editableFields`. Character IDs are stable IDs, not party positions.

Every HTTP commit below uses this envelope. Substitute the latest returned `revision`, generate a **new** `idempotencyKey` for each distinct commit, and put only that operation's fields in `parameters`:

```json
{
  "expectedRevision": 42,
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
  "parameters": {}
}
```

Read each result before the next request. If a response is lost, retry the **same** request with the same key. If the revision is stale, reread affected state before deciding on a new request. Commit responses do not include a complete replacement observation.

## 2. Build and order PT1

| Character ID | Character | Target `changeBuild` fields | Initial Auto Equipment |
| --- | --- | --- | --- |
| 1 | Kemo | `{"mainClassId":"guardian","subClassId":"sword-saint"}` | `FULL`; set `SEMI` before manual equipment |
| 5 | Selfin | `{"name":"Selfin","racesAndGender":"cervin/female","lineage":"adaptation","predisposition":"introspective","mainClassId":"pilgrim","subClassId":"wizard"}` | `SEMI` |
| 6 | Laika | `{"mainClassId":"lord","subClassId":"alchemist"}` | `SEMI`; use `FULL` for the final automatic run |
| 3 | Lop | `{"name":"Lop","racesAndGender":"leporian/female","lineage":"adaptation","predisposition":"resourceful","mainClassId":"ranger","subClassId":"pilgrim"}` | `SEMI` |
| 2 | Borg | `{"name":"Borg","racesAndGender":"ursan/female","lineage":"adaptation","predisposition":"serene","mainClassId":"sage","subClassId":"alchemist"}` | `SEMI` |
| 4 | Grun | `{"name":"Grun","racesAndGender":"ursan/male","lineage":"adaptation","predisposition":"introspective","mainClassId":"wizard","subClassId":"alchemist"}` | `SEMI` |

For each character, compare `GET /api/v1/read/build/character/{characterId}/status` with the target. Send only changed, valid fields. Omit immutable identity fields for a unique character. Submit `POST /api/v1/commit/build/character/{characterId}/changeBuild` first with the desired fields and `"simulation":true`. This validates without applying. Inspect `data.confirmationRequired` and `data.warnings`, then submit the same desired fields with `"simulation":false`. Include `"confirmation":"yes"` only if the simulation required it and you accept its effects. Each request needs its own key and the latest revision. For example:

```text
POST /api/v1/commit/build/character/1/changeBuild
```

```json
{
  "expectedRevision": 42,
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440001",
  "parameters": {
    "mainClassId": "guardian",
    "subClassId": "sword-saint",
    "simulation": true
  }
}
```

The target party order is `[1,5,6,3,2,4]`, with deity `fortification`. Check `GET /api/v1/read/build/party/1`, then send `POST /api/v1/commit/build/party/1` with `parameters` of `{"deityId":"fortification","order":[1,5,6,3,2,4]}`. Omit either field if it already matches.

Check `GET /api/v1/read/expedition/1/setting`, then set the target with `POST /api/v1/commit/expedition/1/changeExpedition` and `parameters` of `{"destination":1,"destinationMode":"fixed","depthLimit":"1f-3","difficultyOffset":0}`. This operation permits partial updates.

## 3. Buy opening items

Look for a sword, wand, and grimoire in `GET /api/v1/read/base/shopItemsList`. The historical budget was about `180G`; use current prices and Gold. Buy only available entries. The numeric `shopItemId` values identify lineup slots, not base item IDs or old stock-entry strings.

For example, if slots `2` and `4` are available:

```text
POST /api/v1/commit/base/purchaseShopItems
```

```json
{
  "expectedRevision": 43,
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440002",
  "parameters": {"items":[{"shopItemId":2},{"shopItemId":4}]}
}
```

Replace those IDs with observed choices. The whole purchase succeeds or fails together. A lineup can rotate without a revision change, so buy promptly and reread `shopItemsList` after purchases or refreshes. Inspect the purchased item variants before equipping. Skip unavailable categories instead of guessing.

## 4. Equip the party

The original allocation target is below. These are **base item IDs**, not the `Item Format` strings accepted by `equip`. Match each target to an owned, compatible item in current inventory. Prefer the strongest available enhancement for Kemo's sword, Grun's wand, and Borg's grimoire.

| Assignment order | Character ID | Target base item IDs | Mode afterward |
| --- | --- | --- | --- |
| 1 | 1 (Kemo) | `1101, 1104, 1104, 1104, 1104, 1106, 1211` | `SEMI` |
| 2 | 4 (Grun) | `1110, 1110, 1112, 1112` | `SEMI` |
| 3 | 2 (Borg) | `1102, 1111, 1111, 1112` | `SEMI` |
| 4 | 5 (Selfin) | `1101, 1102, 1110` | `SEMI` |
| 5 | 3 (Lop) | `1107, 1107, 1109, 1109` | `SEMI` |
| 6 | 6 (Laika) | Leave for a `FULL` automatic run | `FULL` |

Inspect current equipment and party inventory with `GET /api/v1/read/observation/party`. Set the manual characters to `SEMI` using `POST /api/v1/commit/build/character/{characterId}/autoEquipment` with `parameters` of `{"mode":"SEMI","immediateAutoEquipment":false}`. Remove equipment from affected characters with their `removeAllEquipment` commits, then equip characters in the table's order using `POST /api/v1/commit/build/character/{characterId}/equip`. Supply owned **Item Format** values in `parameters.targetEquipment`, such as `"0/1104/1/0"`; verify the exact format and quantity in current inventory. Use `targetSlot` only for a deliberate single-slot replacement.

Every removal, equip, and mode change is a separate commit. There is no v1 operation that removes and reallocates all six characters' equipment atomically. Check equipment and revision after each character before assigning the next one's items. If an item is missing or incompatible, revise the target from current inventory rather than assuming partial success.

Finally, run Laika's automatic equipment with `POST /api/v1/commit/build/character/6/autoEquipment` and `parameters` of `{"mode":"FULL","immediateAutoEquipment":true}`. Inspect its `autoEquipmentReport` and resulting equipment.

This concentrates offensive items on Kemo, Grun, and Borg. Early enemies can have roughly 16–26 Defense, so per-hit damage matters. Treat those figures and this allocation as starting points, then check current attack values and simulation results.

## 5. Verify productive farming

Run `POST /api/v1/read/expedition/1/simulationRun` with an empty JSON object or an optional `expectedRevision` for a private 1,000-run forecast. This is a Read operation: it does not commit progression, consume charge, or return rewards. Forecast percentages describe the simulated snapshot, not guaranteed live results.

If promising, check `GET /api/v1/read/expedition/1/chargeStock` and the Sortie control in `GET /api/v1/read/observation/expedition`, then send one `POST /api/v1/commit/expedition/1/sortie` with the standard commit envelope and empty `parameters`. One accepted request consumes one charge stock and resolves one sortie. Inspect its `outcome`, `rewards`, `diaryEntryId`, and `logId` before another.

For battle detail, read `GET /api/v1/read/expedition/1/latestBattleLog`; use the returned `logId` as that endpoint's optional query parameter when you need the retained log from a particular sortie. If the party draws in room one without gains, adjust the build or allocation and simulate again before spending more charge.

## 6. Farm and improve

Continue with individual sortie commits while charge is available and results remain useful. There is no `count` parameter or 20-sortie batch in `/api/v1`. Refresh the relevant reads and revision between commits, and use single sorties near a likely boss clear.

After farming yields stronger copies, use `POST /api/v1/commit/build/character/{characterId}/autoEquipment` with `{"mode":"SEMI","immediateAutoEquipment":true}` for a character whose equipped categories you want to preserve. `SEMI` can upgrade compatible equipped categories but does not fill empty slots. Use `FULL` only when category and attack-count changes are acceptable. Inspect `autoEquipmentReport`, character status, and a new simulation after meaningful changes.

When finished, call `POST /api/v1/fundamental/logOut` to persist and release API control.
