## 9. Environment

### 9.1 Desktop distribution

#### 9.1.4 API detail

This section is the implementation contract for `Specification_9.1.3_API.md`.
Section 9.1.3 defines product intent, operations, parameters, and returned game
facts. This section defines transport, consistency, security, failure, and
adapter behavior. It must not introduce different game rules or UI behavior. If
the two sections conflict, section 9.1.3 and the gameplay/UI sections it
references take precedence, and this section must be corrected.

The React UI, desktop surfaces, and AI/CUI HTTP clients use one logical
Application API. They must reach the same command/query handlers, validation,
game authority, and persistence transaction. A transport adapter may only
authenticate, decode, validate the transport shape, invoke the Application API,
and encode the result.

```text
React UI ── typed in-process adapter ─┐
Desktop ─── context-isolated bridge ──┼── Application API ── Game Authority
AI / CUI ── loopback HTTP/JSON ───────┘          │
                                                └── Persistence
```

##### 9.1.4.1 Conformance and versioning

* The HTTP base path is `/api/v1`.
* JSON media type is `application/json; charset=utf-8`.
* The popup stream media type is `text/event-stream; charset=utf-8`.
* JSON member names use `camelCase`. Identifiers and enum values are
  case-sensitive.
* Durations named `*Seconds` use seconds. Absolute timestamps and members named
  `*At` use UTC ISO 8601 strings.
* Numeric game data is encoded as JSON numbers. The UI applies the display
  formatting rule in section 10.4; the API must not return locale-formatted
  numbers unless 9.1.3 explicitly defines a compact display string.
* Request objects reject unknown members with `invalid_request`. Optional
  members may be omitted but must not be silently accepted under another name.
* Every JSON response includes `apiVersion: "v1"` and `schemaVersion: 1`.
* Additive response members are backward compatible. Removing or renaming a
  member, changing its type or meaning, or changing a documented enum requires
  a new schema version. A breaking operation or path change requires a new API
  base version.
* `/experimental/v1` is not an alias and must not be exposed.

Common identifiers:

| Name | Contract |
| --- | --- |
| `revision` | Monotonically increasing integer for the active save. |
| `requestId` | Server-generated opaque identifier for one invocation. |
| `idempotencyKey` | Client-generated UUID or 16–128 printable ASCII characters. |
| `partyNumber` / `{p}` | Unlocked party number `1–6`. |
| `characterId` | Stable character ID, never a localized name or array position. |
| `diaryEntryId` | Stable retained Diary-entry ID. |
| `equipmentSetId` | Stable saved-equipment-set ID. |
| `shopItemId` | ID of an entry in the current shop lineup. |

Compact formats defined in 9.1.3 are wire formats and are not localized.
`Item Format` is `<lockStatus>/<itemId>/<enhancement>/<superRare>` or `0`.
Where an equipped entry is required, `Equipment Entry` is
`<slotIndex>/<Item Format>[/<jewelType>:<jewelRank>]`; an empty slot is `0`.
`Jewel Format` is `<jewelType>:<jewelRank>`, where the type and rank ranges are
those defined in 9.1.3.

##### 9.1.4.2 Response envelopes

Except for the file and SSE responses specified later, a successful Read,
Help, or Resource response is:

```json
{
  "apiVersion": "v1",
  "schemaVersion": 1,
  "requestId": "opaque-request-id",
  "revision": 42,
  "observedAt": "2026-09-20T01:23:45.678Z",
  "data": {}
}
```

`revision` is omitted when the request has no active save context, including
public Help and pre-login Status calls.

A successful Commit response is:

```json
{
  "apiVersion": "v1",
  "schemaVersion": 1,
  "requestId": "opaque-request-id",
  "previousRevision": 42,
  "revision": 43,
  "committedAt": "2026-09-20T01:23:45.678Z",
  "data": {},
  "effects": [],
  "changedResources": ["read/observation/overview"]
}
```

`data` contains the operation-specific return defined by 9.1.3. `effects` is a
compact ordered list of user-relevant semantic effects; it must not duplicate a
complete observation. `changedResources` identifies projections a client should
refresh. A valid no-op returns success with `revision == previousRevision`, an
empty `effects`, and an empty `changedResources`.

Successful Fundamental operations use the Read envelope. `revision` is omitted
when no active save is selected. `signUp` includes the initialized save revision
in `data`; `logIn` includes the session and lease tokens defined in 9.1.4.6;
`logOut` reports the final persisted revision and invalidates those tokens only
after the response has been prepared. Fundamental responses use
`Cache-Control: no-store`.

##### 9.1.4.3 Read consistency, caching, and pagination

* One response is projected from one immutable snapshot at its returned
  `revision`. A response must not combine values from different revisions.
* Read, Help, and Resource operations do not mutate game state, consume random
  values, advance time, mark Diary entries read, or persist derived state.
* Reads use `GET`, except `simulationRun`, which uses `POST` because it performs
  substantial non-cacheable computation. It remains a Read operation and must
  not commit anything.
* Save-derived JSON reads return
  `ETag: "rev-<revision>-<projectionHash>"` and honor `If-None-Match` with
  `304`. Static Help uses a content-hash ETag. Commit, Fundamental, and
  simulation responses use `Cache-Control: no-store`.
* List operations that can exceed 200 entries accept `limit` (`1–200`, default
  `100`) and an opaque `cursor`. Their `data` includes `nextCursor`, or `null`
  when complete. A cursor is bound to its route, filters, ordering, and revision;
  otherwise return `invalid_cursor`.
* Lists have a documented deterministic order. If 9.1.3 does not prescribe one,
  use stable ID ascending, with stable ID as the final tie-breaker.

##### 9.1.4.4 Commit, revision, and idempotency contract

All JSON Commit requests use this transport envelope:

```json
{
  "expectedRevision": 42,
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
  "parameters": {},
  "confirmationToken": "opaque-token-if-required"
}
```

* `expectedRevision` and `idempotencyKey` are required for HTTP commits.
  Trusted in-process adapters supply both on the caller's behalf.
* Validation, gameplay resolution, random consumption, state mutation, and
  persistence form one serialized transaction.
* If `expectedRevision` differs from the current save revision, return
  `stale_revision` before gameplay resolution and disclose no random result.
* Any invalid parameter or unavailable entry rejects the whole request. No
  partial state, currency, inventory, random, Diary, notification, or revision
  change may occur.
* One successful mutating transaction increments `revision` exactly once,
  regardless of the number of affected entries.
* A successful no-op does not increment `revision`.
* The server stores at least the latest 4,096 idempotency receipts per API user.
  Repeating the same key, route, authenticated user, and canonical operation
  parameters returns the original terminal status and response without
  re-execution. `confirmationToken` is excluded from parameter comparison.
  Reusing a key with a different route or operation parameters returns
  `idempotency_conflict`.
* The persisted game state and its idempotency receipt commit atomically. A
  persistence failure returns `save_failed`, publishes no popup event, and
  leaves the previous state and revision authoritative.

##### 9.1.4.5 Confirmation protocol

An operation requiring confirmation first returns HTTP `409`:

```json
{
  "apiVersion": "v1",
  "schemaVersion": 1,
  "requestId": "opaque-request-id",
  "revision": 42,
  "error": {
    "code": "confirmation_required",
    "message": "Confirmation is required.",
    "details": {
      "confirmationToken": "opaque-token",
      "warningKey": "api.warning.backupReset",
      "warningArgs": {},
      "expiresAt": "2026-09-20T01:28:45.678Z",
      "allowedChoices": []
    }
  }
}
```

The token expires after five minutes and is bound to the authenticated session,
current revision, endpoint, base parameters, idempotency key, and any listed
choice. The client repeats the request with the token and, when applicable, one
`allowedChoices` value inside `parameters`; adding that declared choice is the
only permitted parameter difference. A confirmation challenge is not a terminal
idempotency receipt. A changed, expired, already-used, or mismatched token
returns `confirmation_invalid`. Issuing or rejecting a confirmation does not
mutate game state.

##### 9.1.4.6 HTTP authentication and exclusive control

* The HTTP listener binds only to loopback. Remote interfaces and permissive
  cross-origin access are prohibited.
* A request containing `Origin` is accepted only from the packaged application
  origin configured for that process; all other origins are rejected. Tokens
  must not be stored in renderer web storage.
* Each process launch creates a high-entropy bootstrap bearer token and exposes
  it only through the authorized desktop launch/automation channel, never in a
  URL, log, help response, save, or UI DOM.
* All HTTP operations except `fundamental/status`, `help/overview`, and
  `help/endpoints` require `Authorization: Bearer <bootstrapToken>`.
* `fundamental/signUp` initializes the named API-controlled save but does not
  grant a control session.
* `fundamental/logIn` returns opaque `sessionToken` and `controlLeaseToken`.
  Subsequent session operations also require:
  `X-BoKemo-Session: <sessionToken>` and
  `X-BoKemo-Control-Lease: <controlLeaseToken>`.
* Only one control lease may exist for one save. A second login returns
  `control_unavailable` without interrupting the holder.
* While an external lease is active, normal real-time progression is paused and
  state-mutating React/Desktop controls are disabled with the stable reason
  `apiControlActive`. Read-only UI remains usable.
* A lease expires after five minutes without a successful authenticated API
  operation. Each successful operation renews it. Logout, listener shutdown,
  renderer loss, or process exit releases it safely; persisted state remains.
* In-process React/Desktop adapters use their trusted process identity and do
  not call `signUp` or `logIn`. They still use the same Application API handlers.

##### 9.1.4.7 Observation projections

The seven observation projections are the primary screen read models for the
corresponding 8.x UI areas. Specialized Read endpoints may supplement a screen
for focused details, search results, or command options, but components must not
read the complete persisted save or private reducer state. Each projection includes
stable IDs, semantic enum/translation keys, raw numeric values, availability,
and `validOptions`; localization occurs at the presentation boundary.

| Projection | Minimum complete facts |
| --- | --- |
| `compact` | Exactly the compact AI projection defined in 9.1.3, including attention and unread summaries. |
| `overview` | Header mode, in-game time, Gold, Prana, progress-report availability/status, current environment, unread count, and navigation availability. |
| `expedition` | Every unlocked party's identity, state, progress timing/steps, HP, disclosed floor/outcome, destination summary, charge state, Clear-Gate/side-quest facts, controls and their unavailable reasons, plus active result/log references required by 8.3. |
| `party` | Selected party, member order, deity/rank/condition, character display/calculated build facts, equipment entries and locks/Jewels, equipment mode/set summaries, inventory choices, and action availability required by 8.2. |
| `base` | Selected Base pane, currencies, item/inventory summaries, shop lineup/status, Altar facts, Jewel priority, enemy-form facts, filters, actions, and unavailable reasons required by 8.4. |
| `diary` | Party filters, unread totals, ordered Diary-entry summaries and IDs, selection, notification settings, and retained-entry availability required by 8.5. |
| `setting` | Current language/theme/display settings, mode-select facts, environment-gated debug controls, enemy editor, backup/feedback/news state, desktop-only availability, and valid options required by 8.6. |

Projection members that represent an unavailable control include
`available: false` and a stable `unavailableReason`; they must not be omitted in
a way that makes unavailable indistinguishable from unsupported. Secret state,
undisclosed random values, future drops/enemies, and complete save internals must
not appear in any projection.

##### 9.1.4.8 Popup event stream

`GET /api/v1/read/observation/popupEventStream` is an authenticated SSE stream.
Each state-derived event has this shape:

```text
id: 43:2
event: popup
data: {"apiVersion":"v1","schemaVersion":1,"revision":43,"sequence":2,"eventId":"43:2","eventKey":"popup.itemDrop","args":{},"partyNumber":1,"diaryEntryId":120,"groupKey":null,"createdAt":"2026-09-20T01:23:45.678Z"}
```

* `eventKey` and `args` are semantic and language-neutral. Each client localizes
  and displays them according to sections 8 and 9.1.1.
* Events are ordered by `(revision, sequence)` and emitted only after successful
  persistence. `eventId` is unique within the active save.
* Clients reconnect with `Last-Event-ID`. The server retains at least the latest
  256 events or five minutes of events, whichever is larger.
* If replay is no longer possible, emit `event: resyncRequired` containing the
  current revision, then close. The client refreshes its projections.
* Emit an SSE comment heartbeat every 15 seconds. Heartbeats do not renew the
  control lease or change game state.
* Closing a toast is local presentation state and is not a Commit operation.
* AFK recovery emits the grouped events required by sections 8 and 9.1.1, not a
  burst of one popup/native notification per recovered event. Diary detail is
  retained independently.

##### 9.1.4.9 Operation-specific completion rules

These rules fill transport/transaction gaps without replacing the operation
definitions in 9.1.3.

**Expedition**

* `read/expedition/{p}/setting.current` always returns `destination`,
  `destinationMode`, `depthLimit`, and `difficultyOffset` together.
* `changeExpedition` is a partial update; omitted members retain their values.
  Its response returns the complete new `current` object.
* `simulationRun` accepts an optional `expectedRevision`. The result states the
  simulated revision and seed-domain identifier and returns both the compact
  strings required by 9.1.3 and structured numeric outcome percentages for the
  overview and each room. It never exposes or advances the live random stream.
* `sortie` and `godsBattle` return the final outcome, return reason, rewards,
  affected inventory/currency, Diary references, and retained battle-log
  reference needed to explain the committed result.

**Party build and equipment**

* `changeBuild` uses the same UI validation and confirmation rules for changes
  that invalidate equipment or other dependent state.
* For `removeEquipment`, `lockEquipment`, `unlockEquipment`, `jewelAttach`, and
  `jewelRemove`, `targetEquipment` is one slot index or an array of slot indices.
  Duplicate indices are invalid.
* `jewelAttach.jewelToSet` uses `Jewel Format`. The exact owned Jewel instance is
  reserved during validation and consumed only by the successful transaction.
* Saving an equipment set records slot assignment, exact `Item Format`, exact
  attached Jewel `key:rank`, and lock state. The snapshot does not reserve items.
* `loadEquipmentSet.loadMode` is required in the confirmed execution:
  `equipSet` restores every stored exact item, slot, Jewel `key:rank`, and lock
  when all are available; `equipExactMatchesOnly` equips only exact available
  stored matches; `equipSimilar` may use the normal generic similar-item and
  auto-Jewel selection logic. The response lists each equipped, substituted,
  skipped, and unavailable entry with a stable reason.
* `equipSet` is absent from `allowedChoices` when any exact requirement is
  unavailable. A partial load requires the confirmation flow in 9.1.4.5.
* Equipment Undo/Redo restores the complete equipment state, including exact
  Jewels and locks, and reports whether another Undo/Redo remains available.

**Base**

* Multi-item sell, purchase, and restore requests validate all entries and the
  total balance before mutation. Results return affected `Item Format` values,
  quantities, and Gold/Prana deltas.
* `purchaseShopItems` identifies entries by `shopItemId`; the lineup is checked
  again at the expected revision. Duplicate IDs are invalid.
* `paidShopRefresh` charges the displayed current price and replaces the lineup
  in the same transaction. Idempotent replay must neither charge twice nor
  generate a second lineup.
* `restoreSoldItems` returns items to the owned inventory only under the existing
  UI restore rules and returns the exact restored quantities and currency delta.

**Diary, progress, news, and settings**

* Diary/settings commits documented as partial updates preserve omitted fields
  and return the complete resulting `current` object.
* `markAsRead` returns affected Diary-entry IDs and the resulting unread totals.
* `markNewsAsRead` returns affected news versions and the resulting unread count.
* `clairvoyanceReset` returns the party number and which of common rewards,
  party rewards, and side-quest progress were reset.
* `commit/progress/elapsed` reports requested, accepted, and capped elapsed
  seconds plus resulting progression effects. Existing AFK caps and FIFO rules
  remain authoritative.
* `commit/progress/progressReport` is an idempotent request to perform the
  existing progress-report action. Any external report delivery is recorded as
  an effect and must not be duplicated by an idempotent replay.

##### 9.1.4.10 File operations and limits

* `backup/export` returns `application/octet-stream` with a safe
  `Content-Disposition: attachment` filename plus `X-BoKemo-Revision` and
  `X-BoKemo-Schema-Version` headers. Export does not change revision.
* `backup/import` and `feedback` use `multipart/form-data`; all other Commit
  operations use JSON.
* Maximum JSON request body: 1 MiB. Maximum backup import: 32 MiB. Feedback may
  include at most four images, 8 MiB each and 20 MiB total. Accepted image types
  are PNG, JPEG, and WebP, verified by content rather than filename alone.
* Imported backups are decoded, schema-validated, migrated in memory, and fully
  hydrated before replacing the active save. Failure preserves the active save.
  Success creates one new authoritative revision and invalidates prior cursors,
  confirmations, and observation caches.
* Filenames, attachment metadata, and text are treated as untrusted input.
  Executable content, paths, and active markup must not be interpreted.

##### 9.1.4.11 Errors

All JSON errors use the following envelope. `revision` is omitted when no active
save is visible to the request.

```json
{
  "apiVersion": "v1",
  "schemaVersion": 1,
  "requestId": "opaque-request-id",
  "revision": 42,
  "error": {
    "code": "invalid_request",
    "message": "The request is invalid.",
    "details": { "field": "difficultyOffset" }
  }
}
```

`code` is stable. Clients must not parse `message`. `details` is optional and
must use stable member names. Errors must not expose secrets, stack traces,
partially staged state, undisclosed random results, or whether an inaccessible
user/resource exists.

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `invalid_request` | Invalid syntax, unknown field, type, range, enum, combination, cursor shape, or file. |
| 400 | `invalid_cursor` | Cursor does not match the route, filters, ordering, or retained revision. |
| 401 | `authentication_required` | Bootstrap bearer token is absent. |
| 401 | `authentication_failed` | Bootstrap bearer token is invalid. |
| 401 | `login_required` | No valid API control session is supplied. |
| 401 | `control_lease_invalid` | Control lease token does not belong to this session/save. |
| 401 | `control_lease_expired` | Control lease expired; log in again. |
| 404 | `not_found` | Requested visible resource does not exist. |
| 409 | `already_exists` | Sign-up identity already exists. |
| 409 | `control_unavailable` | Another client holds exclusive API control. |
| 409 | `stale_revision` | `expectedRevision` is not current; details include `currentRevision`. |
| 409 | `idempotency_conflict` | Idempotency key was used with a different route or body. |
| 409 | `illegal_action` | Valid request is unavailable under current game rules. |
| 409 | `confirmation_required` | Action requires the confirmation flow. |
| 409 | `confirmation_invalid` | Confirmation is expired, used, changed, or mismatched. |
| 413 | `payload_too_large` | Body, file, or attachments exceed the operation limit. |
| 415 | `unsupported_media_type` | Request media type is unsupported. |
| 422 | `incompatible_backup` | Backup is valid data but cannot be migrated by this version. |
| 429 | `busy` | Bounded work queue is full; `Retry-After` is supplied. |
| 500 | `save_failed` | Atomic persistence failed; previous state remains authoritative. |
| 500 | `internal_error` | Unexpected failure with no committed mutation. |
| 503 | `runtime_unavailable` | Game authority is starting, stopping, or unavailable. |

##### 9.1.4.12 HTTP endpoint index

`Bootstrap` requires the process bootstrap bearer. `Session` additionally
requires the API session and control-lease headers. Trusted React/Desktop calls
use the same operation without HTTP authentication headers.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/fundamental/status` | Public | API/runtime status. |
| POST | `/api/v1/fundamental/signUp` | Bootstrap | Create API user and save. |
| POST | `/api/v1/fundamental/logIn` | Bootstrap | Log in and acquire control. |
| POST | `/api/v1/fundamental/logOut` | Session | Persist and release control. |
| GET | `/api/v1/read/observation` | Session | Alias of the compact observation. |
| GET | `/api/v1/read/observation/compact` | Session | Compact AI observation. |
| GET | `/api/v1/read/observation/overview` | Session | Header/global projection. |
| GET | `/api/v1/read/observation/expedition` | Session | Expedition UI projection. |
| GET | `/api/v1/read/observation/party` | Session | Party UI projection. |
| GET | `/api/v1/read/observation/base` | Session | Base UI projection. |
| GET | `/api/v1/read/observation/diary` | Session | Diary UI projection. |
| GET | `/api/v1/read/observation/setting` | Session | Setting UI projection. |
| GET | `/api/v1/read/observation/popupEventStream` | Session | Popup SSE stream. |
| GET | `/api/v1/read/expedition/{p}/setting` | Session | Expedition settings/options. |
| GET | `/api/v1/read/expedition/{p}/latestBattleLog` | Session | Latest retained battle log. |
| POST | `/api/v1/read/expedition/{p}/simulationRun` | Session | Private 1,000-run forecast. |
| GET | `/api/v1/read/expedition/{p}/chargeStock` | Session | Charge stock/status. |
| GET | `/api/v1/read/build/party/{p}` | Session | Party build/options. |
| GET | `/api/v1/read/build/character/{characterId}/status` | Session | Character build/options. |
| GET | `/api/v1/read/build/character/{characterId}/equipment` | Session | Equipment/mode. |
| GET | `/api/v1/read/build/character/{characterId}/equipmentSet` | Session | Saved equipment sets. |
| GET | `/api/v1/read/base/searchItems` | Session | Search known items. |
| GET | `/api/v1/read/base/jewelPriorityParty` | Session | Jewel priority. |
| GET | `/api/v1/read/base/shopInfo` | Session | Shop status/information. |
| GET | `/api/v1/read/base/shopItemsList` | Session | Shop lineup. |
| GET | `/api/v1/read/base/altarInfo` | Session | Altar information. |
| GET | `/api/v1/read/base/enemyFormList` | Session | Enemy-form list/options. |
| GET | `/api/v1/read/diary/{p}/diarySetting` | Session | Diary settings/options. |
| GET | `/api/v1/read/diary/diaryEntry/{diaryEntryId}` | Session | Retained Diary entry. |
| GET | `/api/v1/read/setting/enemyEditPane` | Session | Enemy editor/options. |
| GET | `/api/v1/read/setting/modeSelect` | Session | Mode/settings options. |
| GET | `/api/v1/read/setting/debug` | Session | Debug settings/options. |
| POST | `/api/v1/commit/progress/elapsed` | Session | Advance controlled progression. |
| POST | `/api/v1/commit/progress/progressReport` | Session | Perform progress-report action. |
| POST | `/api/v1/commit/expedition/{p}/changeExpedition` | Session | Change expedition. |
| POST | `/api/v1/commit/expedition/{p}/sortie` | Session | Resolve one sortie. |
| POST | `/api/v1/commit/expedition/{p}/godsBattle` | Session | Resolve one Gods Battle. |
| POST | `/api/v1/commit/build/party/{p}` | Session | Change party build. |
| POST | `/api/v1/commit/build/character/{characterId}/changeBuild` | Session | Change character build. |
| POST | `/api/v1/commit/build/character/{characterId}/removeAllEquipment` | Session | Remove all equipment. |
| POST | `/api/v1/commit/build/character/{characterId}/removeEquipment` | Session | Remove selected slots. |
| POST | `/api/v1/commit/build/character/{characterId}/equip` | Session | Equip owned items. |
| POST | `/api/v1/commit/build/character/{characterId}/lockEquipment` | Session | Lock selected slots. |
| POST | `/api/v1/commit/build/character/{characterId}/unlockEquipment` | Session | Unlock selected slots. |
| POST | `/api/v1/commit/build/character/{characterId}/autoEquipment` | Session | Set/run Auto Equipment. |
| POST | `/api/v1/commit/build/character/{characterId}/jewelAttach` | Session | Attach an owned Jewel. |
| POST | `/api/v1/commit/build/character/{characterId}/jewelRemove` | Session | Remove an attached Jewel. |
| POST | `/api/v1/commit/build/character/{characterId}/saveEquipmentSet` | Session | Save current equipment set. |
| POST | `/api/v1/commit/build/character/{characterId}/loadEquipmentSet` | Session | Load a saved equipment set. |
| POST | `/api/v1/commit/build/character/{characterId}/deleteEquipmentSet` | Session | Delete a saved equipment set. |
| POST | `/api/v1/commit/build/character/{characterId}/renameEquipmentSet` | Session | Rename a saved equipment set. |
| POST | `/api/v1/commit/build/character/{characterId}/undoEquipment` | Session | Undo equipment change. |
| POST | `/api/v1/commit/build/character/{characterId}/redoEquipment` | Session | Redo equipment change. |
| POST | `/api/v1/commit/base/changeJewelPriorityParty` | Session | Change Jewel priority. |
| POST | `/api/v1/commit/base/sellInventoryItems` | Session | Sell inventory items. |
| POST | `/api/v1/commit/base/purchaseShopItems` | Session | Purchase shop entries. |
| POST | `/api/v1/commit/base/paidShopRefresh` | Session | Perform paid shop refresh. |
| POST | `/api/v1/commit/base/restoreSoldItems` | Session | Restore sold inventory items. |
| POST | `/api/v1/commit/base/unlockForm` | Session | Unlock an enemy form. |
| POST | `/api/v1/commit/diary/{p}/diarySetting` | Session | Change Diary settings. |
| POST | `/api/v1/commit/diary/diaryEntry/markAsRead` | Session | Mark Diary entries read. |
| POST | `/api/v1/commit/setting/clairvoyanceReset` | Session | Reset selected Clairvoyance state. |
| POST | `/api/v1/commit/setting/modeSelect` | Session | Change mode/settings. |
| POST | `/api/v1/commit/setting/enemyEditPane` | Session | Change enemy editor. |
| POST | `/api/v1/commit/setting/feedback` | Session | Submit feedback. |
| POST | `/api/v1/commit/setting/backup/export` | Session | Export active save. |
| POST | `/api/v1/commit/setting/backup/import` | Session | Import backup. |
| POST | `/api/v1/commit/setting/backup/reset` | Session | Request/confirm reset. |
| POST | `/api/v1/commit/setting/debug` | Session | Change debug settings. |
| POST | `/api/v1/commit/setting/markNewsAsRead` | Session | Mark developer news read. |
| GET | `/api/v1/help/overview` | Public | API overview and index. |
| GET | `/api/v1/help/endpoints` | Public | Versioned API contract. |
| GET | `/api/v1/resources/developerNewsNotification` | Session | Developer news. |
| GET | `/api/v1/resources/donationBox` | Session | Donation status. |
| GET | `/api/v1/resources/clairvoyance/{p}` | Session | Clairvoyance data. |
| GET | `/api/v1/resources/glossary` | Session | Glossary query. |
| GET | `/api/v1/resources/itemCompendium` | Session | Compendium query. |
| GET | `/api/v1/resources/characterRoster` | Session | Race roster query. |
| GET | `/api/v1/resources/bestiary` | Session | Bestiary query. |
| GET | `/api/v1/resources/superRareList` | Session | Super Rare list. |

##### 9.1.4.13 Adapter and contract-test requirements

* Define one transport-neutral typed Application API interface. React,
  desktop-bridge, and HTTP adapters must not own gameplay branches or maintain
  independent operation semantics.
* Generate or validate HTTP schemas from the same request/response types used by
  the in-process adapter. Check generated contract artifacts into source control
  when required for deterministic builds.
* Run the same canonical fixtures against in-process and HTTP adapters and
  compare semantic results after excluding transport-only metadata.
* Every Commit operation has contract tests for success, invalid-request
  atomicity, stale revision, exact idempotent replay, idempotency conflict,
  persistence failure rollback, and environment/unlock rejection where
  applicable.
* Randomized Commit tests prove that rejected, stale, confirmed, and replayed
  requests neither consume randomness twice nor expose undisclosed outcomes.
* Projection tests prove that each relevant 8.x UI can render from its
  observation projection without direct complete-save access.
* Stream tests cover ordering, post-persistence delivery, reconnect replay,
  replay expiry, resynchronization, and AFK grouping.
* A saved fixture executed through each adapter must produce the same revision,
  persisted game state, effects, and changed-resource list.

[EOF]
