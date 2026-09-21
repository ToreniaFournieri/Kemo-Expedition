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
* Read, Help, and Resource operations do not mutate game state, consume live random
  values, advance time, mark Diary entries read, or persist derived state.
* Reads use `GET`, except `simulationRun`, which uses `POST` because it performs
  substantial non-cacheable computation. It remains a Read operation and must
  not commit anything.
* Every compact observation request deliberately runs a new private 100-run
  simulation for each unlocked party against the response's immutable snapshot.
  This includes the `/read/observation` alias. It is an on-demand AI decision
  operation, not the UI's real-time monitoring query. Do not reuse an older
  forecast or reduce the run count. It uses the same simulation rules as the
  1,000-run query, with an isolated random domain and no persisted result.
* Compact observation, including its alias, returns `Cache-Control: no-store`,
  emits no ETag, and does not return 304. Other save-derived JSON reads return
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
* For a new operation, if `expectedRevision` differs from the current save revision, return
  `stale_revision` before gameplay resolution and disclose no random result.
* Any invalid parameter or unavailable entry rejects the whole request. No
  partial state, currency, inventory, random, Diary, notification, or revision
  change may occur.
* One successful mutating transaction increments `revision` exactly once,
  regardless of the number of affected entries.
* A successful no-op does not increment `revision`.
* Receipt scope is the server-owned save identity, including environment and API
  user, not the session token. Retain at least the latest 4,096 successful
  receipts, including no-ops, in commit order. Reconnect/login does not clear them.
* Processing order is: authenticate and authorize the save; validate transport
  shape and limits; canonicalize the route and parameters; look up a receipt or
  admitted request; then, only for a new request, check revision, confirmation,
  gameplay legality, and perform the transaction. Repeat receipt lookup under
  the transaction lock before executing. A matching receipt returns the original
  HTTP status and response body, including original request ID and timestamps,
  before stale-revision or used-confirmation checks. Current authentication is
  still required; possessing a key alone never grants access.
* Canonical comparison includes route, operation parameters, and uploaded-file
  digests. Object member order is ignored; array order is retained. Documented
  state-independent defaults are expanded. State-dependent decisions are resolved
  once and stored with admission; never recompute them against newer state for a
  receipt lookup. `expectedRevision` and `confirmationToken` are excluded.
  Different route or parameters for a retained key return `idempotency_conflict`.
  The completed parameters include any selected confirmation choice.
* A duplicate of work already admitted returns `409 operation_in_progress` with
  `Retry-After: 1`; it never queues a second execution. This check uses the same
  canonical comparison as receipt lookup.
* Rejections, confirmation challenges, `busy`, cancellation, and persistence
  failures are not terminal receipts. They consume no key. Retry a failed attempt
  with the original key through the same endpoint, which checks for a success
  receipt before execution; changed user intent uses a new key.
* Retain compact tombstones for evicted successful keys for the lifetime of the
  save identity. A tombstone returns `409 idempotency_expired` without execution;
  the client must inspect current state before proposing a new action. Tombstones
  need not retain payloads or responses. Never silently re-execute an old key.
* Import/reset preserves the local revision high-water mark, receipts, and
  tombstones. They are server-owned control metadata, excluded from exported
  backups and never replaced by imported metadata. The import/reset receipt
  commits with the replacement state. Replaying an older receipt reports that
  historical result and does not reapply it to the replacement save.
* The persisted game state and its idempotency receipt commit atomically. A
  persistence failure returns `save_failed`, publishes no popup event, and
  leaves the previous state and revision authoritative.

**Atomic progression across multiple Chunks**

* A `commit/progress/elapsed` request is one external transaction even when it
  processes many logical Chunks. After revision validation, capture the committed
  snapshot and resolve the request's target time once. Run the shared section 5.1
  progression logic against a private staged state, including game clocks, RNG
  and bags, inventory, currencies, equipment, pending backlog, and retained logs.
* Preserve section 5.1's worker-arrival FIFO ordering, per-party barriers,
  automatic-equipment timing, distinct coordinator snapshots, and completion
  acknowledgements inside that staged transaction. Each internal Chunk version
  is separate from the public API `revision`; completing a Chunk does not publish
  a new API revision. Subsequent workers and Chunks use the latest staged snapshot.
* Hold exclusive mutation authority for the save until commit or rollback.
  Other writes, including delivery-completion transactions, wait their turn and
  revalidate against the then-current committed state. Scheduler yields remain
  bounded and responsive; they do not release mutation authority. Reads and
  read-only UI continue to use the last committed snapshot and cannot see staged
  outcomes, rewards, logs, or clock advances.
* A Chunk checkpoint or scheduler yield preserves only private working progress
  for this request. It must not replace the active save, publish a pending AFK
  cursor, or trigger ordinary autosave. Any temporary storage is uncommitted
  staging and is never loaded as authoritative recovery state. Ordinary AFK
  recovery outside this API transaction retains its section 5.1 checkpoint rules.
* After all requested processing finishes, atomically persist the complete final
  state, retained-record references, idempotency receipt, and buffered popup
  events using the existing manifest-last durability protocol. Only after that
  durable commit may the authority publish the final snapshot and release effects.
  Increment the public revision exactly once for a mutation, or leave it unchanged
  for a no-op. Notifications follow the existing AFK grouping rules.
* Failure or safe cancellation before the durable commit discards every staged
  Chunk and effect, fences outstanding worker results, and leaves the pre-request
  state, RNG, clocks, backlog, and revision unchanged. Restart does not resume a
  partially staged request. If the durable commit succeeded before a crash or lost
  response, reload its complete state and receipt; retry returns that receipt
  without repeating any Chunk. Never report rollback after a durable success.
* Login's catch-up uses this same staging/publication boundary before returning
  a successful session; its Fundamental envelope and authentication rules remain
  unchanged. This boundary does not change elapsed-time selection, caps,
  efficiency, or speed modifiers defined by 9.1.3 and section 5.1.

##### 9.1.4.5 Confirmation protocol

This generic challenge applies to operations that do not define their own
confirmation (`backup/import`, `backup/reset`, and partial `loadEquipmentSet`).
`changeBuild` is excluded: it confirms through its `simulation` and
`confirmation` parameters (9.1.4.9).

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

`allowedChoices` is an array of strings. When non-empty, `details.choiceField`
names the parameter that accepts exactly one listed value (for equipment loads,
`loadMode`). A challenge reserves its base parameters and key until expiry;
repeating it returns the same challenge. A different base request with that key
returns `idempotency_conflict`. A permitted choice extends that reservation and
becomes part of the successful receipt. Tokens are consumed only by a successful
commit. A persistence failure does not consume a token; it may be retried while
the token and revision remain valid. A successful replay bypasses token checks.
If the revision changed, return `stale_revision`; obtain a fresh challenge for
the new revision. An expired challenge may be replaced by a new unconfirmed
request with the same base parameters and key when no receipt exists.

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
* An idle lease expires after five minutes without a successful authenticated
  session operation. Successful session reads, commits, and receipt replays
  renew it; public/bootstrap requests and failed requests do not. Work lifecycle
  and safe release rules are defined in 9.1.4.16. No lease survives process exit.
* In-process React/Desktop adapters use their trusted process identity and do
  not call `signUp` or `logIn`. They still use the same Application API handlers.

##### 9.1.4.7 Observation projections

The six non-compact observation projections are the primary screen read models
for the corresponding 8.x UI areas; compact is the on-demand AI projection.
Specialized Read endpoints may supplement a screen
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
* Allocate sequences within the committed revision; never reuse a revision after
  restart, import, or reset. Persist the replay buffer with the state transaction,
  so a crash between persistence and publication is recoverable by replay.
* Clients reconnect with `Last-Event-ID`. The server retains at least the latest
  256 events or five minutes of events, whichever is larger.
  A first connection without `Last-Event-ID` starts after the current committed
  event boundary; it does not replay old notifications. Clients keep reconnect
  IDs scoped to the authenticated save, never transfer them between saves, and
  discard them after `resyncRequired`.
* If replay is no longer possible, emit `event: resyncRequired` containing the
  current revision, then close. The client refreshes its projections.
* Emit an SSE comment heartbeat every 15 seconds. Heartbeats do not renew the
  control lease or change game state.
* Closing a toast is local presentation state and is not a Commit operation.
* The connection is bound to its authenticated save/session. Check lease validity
  throughout its lifetime. Logout or expiry closes it; heartbeat traffic alone
  cannot keep a lease alive. An SSE connection does not pin a lease as work.
* Import/reset atomically clears the old event buffer and records a replay
  boundary. Existing streams emit `resyncRequired` and close after commit.
  Cursors at or before that boundary cannot replay historical popups. On restart,
  clients authenticate again and may replay only events still retained for the
  same save. Invalid, future, or out-of-retention IDs also require resync.
* Clients deduplicate by save identity and `eventId`. Reconnect delivery is
  at-least-once; a replay must not create a second visible toast or native alert.
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

* `changeBuild` uses the same UI validation as the Party editor and owns its
  confirmation through the `simulation` and `confirmation` parameters defined in
  9.1.3 (3-3-2); it never issues the generic 9.1.4.5 challenge.
  * `simulation` is required and must be a boolean. `simulation: true` validates
    and reports without committing: it is a valid no-op (no revision change, no
    state change, no equipment-history entry) that still records the idempotency
    receipt, and it returns the same validation errors a commit would.
  * The response `data` always includes `confirmationRequired`, `warnings`, and
    `applied`, plus the complete new `current` object. `warnings` are semantic
    `{key, args}` entries with numeric arguments, never localized text, and are
    non-empty only when `confirmationRequired` is true. The keys are
    `api.warning.changeBuild.equipmentSlotReduction` (`count`),
    `api.warning.changeBuild.meleeAptitudeRemoved`,
    `api.warning.changeBuild.rangedAptitudeRemoved`, and
    `api.warning.changeBuild.magicAptitudeRemoved` (each with `items`, the
    number of equipped items that would be removed).
  * With `simulation: false`, a change that requires confirmation is applied only
    with `confirmation: "yes"`. A missing confirmation is `invalid_request`
    (field `confirmation`), because the caller is expected to simulate first.
    `confirmation: "no"` cancels the change without modifying the character and
    without advancing the revision. `confirmation` combined with
    `simulation: true`, any value other than `yes` or `no`, and a non-boolean
    `simulation` are rejected atomically as `invalid_request`.
  * A confirmation is not bound to the state that was simulated. HTTP callers pass
    the revision returned by the simulation as `expectedRevision`, so a change made
    in between is rejected as `stale_revision`. The trusted in-process adapter
    supplies the current revision on the caller's behalf.
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

* Multi-item sell, purchase, and unlock requests validate all entries and the
  total balance before mutation. Results return affected `Item Format` values,
  quantities, and Gold/Prana deltas.
* `purchaseShopItems` identifies entries by `shopItemId`; the lineup is checked
  again at the expected revision. Duplicate IDs are invalid.
* `paidShopRefresh` charges the displayed current price and replaces the lineup
  in the same transaction. Idempotent replay must neither charge twice nor
  generate a second lineup.
* `sellInventoryItems` sells the entire owned stack for each supplied variant.
  `unlockSoldItems` only changes `s.sold` to `s.notown`; it restores no quantity
  and refunds no currency. Duplicate variants in either request are invalid.

**Diary, progress, news, and settings**

* Diary/settings commits documented as partial updates preserve omitted fields
  and return the complete resulting `current` object.
* `markAsRead` returns affected Diary-entry IDs and the resulting unread totals.
* `markNewsAsRead` returns affected news versions and the resulting unread count.
* `clairvoyanceReset` returns the party number and which of common rewards,
  party rewards, and side-quest progress were reset.
* `commit/progress/elapsed` reports requested, accepted, and capped elapsed
  seconds plus resulting progression effects. Existing AFK caps and FIFO rules
  remain authoritative. All Chunks form one staged transaction under 9.1.4.4;
  intermediate coordinator versions are not externally committed API revisions.
* `commit/progress/progressReport` performs the existing progress-report action.
  Feedback and any external delivery use 9.1.4.15. Local receipt persistence does
  not by itself prove that an external recipient received a message.

##### 9.1.4.10 File operations and limits

* `backup/export` returns `application/octet-stream` with a safe
  `Content-Disposition: attachment` filename plus `X-BoKemo-Revision` and
  `X-BoKemo-Schema-Version` headers. Export does not change revision.
* `backup/import` and `feedback` use `multipart/form-data`; all other Commit
  operations use JSON.
* Multipart requests contain exactly one `metadata` part of media type
  `application/json` with the same envelope as JSON commits. Import has
  `parameters: {}` and exactly one binary part named `backup`. Feedback scalar
  fields are in `parameters`; `attachments` is an ordered array of file-part
  names (`attachment0` through `attachment3`). Omission means `[]`. Each listed
  part appears exactly once; unlisted, missing, or duplicate parts are invalid.
* Compute SHA-256 and byte length from each received file's contents. Canonical
  comparison includes its part name, verified media type, digest, byte length,
  and attachment order, not multipart boundaries or client filenames. The
  server-generated backup and retained log requested by feedback are captured
  once at admission and stored with the job, not regenerated on retry.
* The JSON limit applies to `metadata`. Binary limits apply to received file
  bytes; enforce limits while receiving. Reject malformed multipart with
  `invalid_request`. No mutation or external delivery occurs before all parts
  have been verified. Import's canonical digest uses the original uploaded
  bytes, before decoding/migration.
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
| 409 | `idempotency_expired` | Successful key is known, but its full receipt was evicted; no re-execution. |
| 409 | `operation_in_progress` | The same operation is already admitted; retry the same request later. |
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
| 503 | `operation_cancelled` | Admitted work was cancelled before commit; no mutation was published. |

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
| POST | `/api/v1/commit/base/unlockSoldItems` | Session | Clear auto-sell status without restoring items. |
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
| POST | `/api/v1/commit/setting/uiPreferences` | Session | Update explicitly persisted UI preferences. |
| POST | `/api/v1/commit/base/markItemsAsSeen` | Session | Acknowledge displayed newly acquired item variants. |
| GET | `/api/v1/read/setting/delivery/{deliveryId}` | Session | Read external delivery status. |
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
* Retry tests cover lost responses, simultaneous duplicate admission, used-token
  replay, stale-revision replay, expired receipts, reconnect, and import/reset.
  Multipart tests prove equivalent boundaries/filenames preserve identity while
  changed file bytes conflict, and malformed/oversized parts cause no mutation.
* Delivery tests inject failures before send, after remote acceptance, before
  local completion, and on restart. Assert no unsafe automatic resend, no reward
  for queued/unknown delivery, and no duplicate cooldown reward. Old jobs cannot
  reward an imported/reset save.
* Projection tests prove that each relevant 8.x UI can render from its
  observation projection without direct complete-save access.
* Stream tests cover ordering, post-persistence delivery, reconnect replay,
  replay expiry, resynchronization, and AFK grouping.
* Lifecycle tests cover lease pinning, queued request expiry, client disconnect,
  shutdown, renderer loss, and reset during a private read. Compact observation
  tests count exactly 100 runs per unlocked party on every successful request,
  verify a single snapshot, and prove no game-state or live-RNG mutation.
* Multi-Chunk progression tests inject failure after an intermediate Chunk and
  before final persistence: state, RNG, clocks, backlog, public revision, and
  emitted events must remain unchanged. Concurrent reads must see only the
  pre-request or complete post-request state. Verify one public revision on
  success, no intermediate autosave publication, stale worker rejection after
  rollback, and receipt replay after a crash following durable commit. Compare
  staged results with shared section 5.1 logic using the same recorded FIFO order,
  not a single whole-recovery hash across independent worker schedules.
* A saved fixture executed through each adapter must produce the same revision,
  persisted game state, effects, and changed-resource list.

##### 9.1.4.14 Parameter and payload schema conventions

* GET parameters are URL query parameters; GET bodies are rejected. Encode arrays
  by repeating the parameter name, for example `equipmentSetId=1&equipmentSetId=2`.
  A repeated scalar is invalid. Booleans are exactly `true` or `false`, numbers
  are unformatted decimal strings, and compact values are percent-encoded once.
  JSON arrays remain arrays. For a documented scalar-or-array input, normalize a
  scalar to a one-element array. Empty arrays are invalid unless explicitly
  allowed. Reject duplicate IDs except repeated item variants in `equip`, where
  repetition requests multiple owned copies.
* `simulationRun` POST accepts `{expectedRevision?: number}` directly, with no
  Commit envelope or idempotency key. Omission uses the admission revision; a
  supplied mismatch returns `stale_revision` before private computation.
* A parameter is required unless marked optional, given a default, or contained
  in an explicitly partial update. Partial updates preserve omitted members; an
  empty update is a no-op. `null` is accepted only where explicitly documented.
  `none` is the literal string `"none"`, not JSON null. Empty result collections
  are `[]`; unavailable option collections are `[]` with availability/reason
  metadata, replacing prose examples that say `none` for a collection.
* Integers must be safe JSON integers; numbers must be finite. IDs use the type
  in the canonical catalog: party, character, Diary, equipment-set, shop, item,
  and enemy IDs are integers; semantic keys and news versions are strings.
* `validOptions` is advisory at the returned revision. Separate option lists
  do not assert that every combination is legal; commit validates the combined
  request. A range is `{ "min": 0, "max": 68, "step": 2 }`, not an array of
  every integer. An action is `{available: boolean, unavailableReason: string|null}`;
  the reason is null exactly when available. Enumerated keys come from the shared
  gameplay catalogs, not translated labels.
* Slash-delimited formats containing free text encode each text component with
  percent-encoding before joining; clients split first and decode once. Numeric
  item/equipment formats require no escaping. Compact prose is a display field,
  not an alternative source of gameplay identifiers. The documented compact
  Diary timestamp uses the game clock's display timezone; transport `*At` values
  use UTC. `inGameTime` is an ISO 8601 instant normalized to UTC on the wire.

The following concrete payload definitions supplement 9.1.3. Object members are
required unless marked `?`; `T[]` means an ordered JSON array of T. These are
public projections, never permission to serialize private runtime objects.

```typescript
type SemanticText = { key: string; args: Record<string, string | number | boolean> };
type Availability = { available: boolean; unavailableReason: string | null };
type NumericFact = { key: string; value: number; unit: "number" | "ratio" | "seconds" };
type AbilityFact = { abilityId: string; level: number };
type BonusFact = { bonusId: string; value: number };
type CalculatedStatus = {
  stats: NumericFact[];
  abilities: AbilityFact[];
  bonuses: BonusFact[];
  attacks: {
    attackType: "melee" | "ranged" | "magical";
    available: boolean;
    facts: NumericFact[];
    speed: { min: number; max: number; diceCount: number; dieSize: number } | null;
  }[];
};
type EquipmentSet = {
  equipmentSetId: number;
  name: string;
  createdAt: string;
  equipment?: string[]; // Equipment Entry, complete slot order when requested
};
type DiaryEntry = {
  diaryEntryId: number;
  partyNumber: number;
  occurredAt: string; // emulated in-game instant
  unread: boolean;
  content: {
    format: "semantic";
    title: SemanticText;
    subtitle: SemanticText;
    events: SemanticText[];
  } | {
    format: "legacy";
    title: string;
    subtitle: string;
    text: string;
  };
  battleLog: { logId: string; availability: Availability } | null;
};
```

* `calculatedStatus` uses `CalculatedStatus`. `stats`, `bonuses`, and attack
  `facts` contain every value required by the 8.2 status pane, with stable
  glossary keys and raw numbers; no formula is recomputed in the adapter.
  All three attack types appear; unavailable attacks have empty facts/null speed.
* `equipmentSets` is `{equipmentSetId, equipmentSet: EquipmentSet}[]`.
  `isEquipmentSetDetail` defaults to false. Detail includes the complete equipment
  array; summary omits it. `saveEquipmentSet.parameters.equipmentSet` is
  `{name?: string}`; omission of name uses the existing UI default. Saving captures
  current equipment at `expectedRevision` into the next empty set slot, never
  accepts a caller-created equipment snapshot, and never overwrites a full list.
  Set names and character names use the existing UI validation.
* `loadEquipmentSet` defaults to `equipSet` when all exact requirements are
  available. When a partial load needs confirmation, no choice is guessed;
  the repeated request supplies `loadMode` via the confirmation protocol.
* `diaryEntry/{diaryEntryId}` returns `{entry: DiaryEntry}`. Missing/evicted IDs
  return `not_found`. Semantic events preserve their recorded order and cover
  non-battle narration. Battle detail is fetched through `latestBattleLog` with
  optional `logId`; omission selects the party's latest retained log, while an
  explicit ID selects that party's referenced retained log or returns `not_found`.
  Legacy text remains unchanged; do not infer semantic facts from it.
* `chargeDuration` is a nonnegative number of remaining real-time seconds until
  the next stock under current speed settings; zero at maximum stock. API reads
  do not themselves advance the charge clock.
* `enemyFormList.enemyType` and `enemyId` are optional intersecting filters;
  omission selects all currently visible forms. `rarity` defaults to `all` for
  search/compendium. Missing `superRare` means either value; inconsistent
  `superRare` and `superRareId` filters are invalid.
* `purchaseShopItems.items` is `{shopItemId: number}[]`.
  `sellInventoryItems.items` and `unlockSoldItems.items` are nonempty `Item Format`
  string arrays. The latter returns `{items: string[]}` of changed variants with
  zero currency effects. Sell/purchase return `{items: {item: string, quantity:
  number}[], goldDelta: number, pranaDelta: number}`.
* `modeSelect` is a partial update. `autoEquipment.immediateAutoEquipment`
  defaults to false. All other defaults and environment restrictions remain
  those explicitly defined in 9.1.3 and the UI specifications.
* Feedback parameters are `name: string`, `category: feedback|question|
  featureRequest|bugReport`, `text: string`, `latestBattleLogParty?: number|"none"`
  (default 1), `includeBackup?: boolean` (default false), and
  `attachments?: string[]` (default []). Text/name validation follows the UI.
  An unavailable selected party is rejected; `none` includes no party log.
* For commands with no other documented `data`, return `{}`; do not return null
  or an arbitrary reducer result. Updates to a `current` settings/build object
  return its complete new public `current`. Deletions return the affected ID.
  Equipment commands return complete equipment/mode plus Undo/Redo availability.
* Before runtime implementation, the shared typed schema catalog must enumerate
  every operation's request, response, enum, defaults, limits, and nullable
  members, including each UI projection's named fields and numeric fact keys.
  Each operation needs a valid JSON request/response example and invalid-input
  example. No `any`, unspecified object, or direct saved-state fallback is
  acceptable for a public payload. Catalog conformance is an implementation gate,
  not permission to infer new gameplay rules from incomplete prose.

Examples of JSON bodies (GET equipment-set arrays use query encoding above):

```json
{
  "expectedRevision": 42,
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
  "parameters": { "equipmentSet": { "name": "Boss build" } }
}
```

Feedback `metadata`, accompanied by one verified image part named `attachment0`:

```json
{
  "expectedRevision": 42,
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440001",
  "parameters": {
    "name": "Player",
    "category": "bugReport",
    "text": "The displayed result differs from the retained log.",
    "latestBattleLogParty": 1,
    "includeBackup": false,
    "attachments": ["attachment0"]
  }
}
```

##### 9.1.4.15 External delivery and rewards

* Feedback and externally sent progress reports atomically persist a delivery
  job, immutable payload, and idempotency receipt before any network send. The
  Commit succeeds with `data: {deliveryId, status: "queued"}`; this means accepted
  locally, not delivered. UI submission remains pending until confirmed delivery.
  A receipt replay always returns the original queued result, without enqueuing
  another job. Current status is read separately.
* `read/setting/delivery/{deliveryId}` returns `{deliveryId, status, createdAt,
  updatedAt, failureReason, rewardApplied}`. Status is `queued`, `sending`,
  `delivered`, `failed`, `unknown`, or `cancelled`. `failureReason` is a stable
  code or null; `rewardApplied` is boolean. Restrict access to the originating
  save identity. The setting/overview projection includes relevant pending IDs.
* Serialize delivery attempts per job. Use `deliveryId` as the recipient's
  deduplication key when supported. Retry confirmed pre-send failures safely.
  If delivery may have happened but acknowledgement is lost, record `unknown`;
  without recipient deduplication or a status lookup, do not automatically resend
  and do not claim exactly-once external delivery. A restart from `sending` also
  becomes `unknown` unless the recipient can resolve it safely.
* Apply the existing feedback reward/cooldown or progress-report benefit only
  after delivery is confirmed. A serialized internal Application API transaction
  marks delivery and applies the eligible benefit once, with its own revision
  and effects. Concurrent submissions cannot claim the same cooldown reward.
  This narrowly scoped completion is allowed during an external control lease;
  subsequent callers may need to refresh a stale revision. `queued`, `failed`,
  and `unknown` never grant a success reward or display a success message.
* Persist completion deduplication independently of evictable response receipts.
  When a confirmed remote result cannot be persisted, retry local completion,
  never the remote send. A crash before that confirmation was durably recorded
  remains an ambiguous delivery and follows the `unknown` rule.
* Import/reset cancels queued jobs and fences old jobs from granting benefits
  to the replacement save. Refuse replacement with `illegal_action` while a
  network send is actively in flight. Retain terminal/unknown status as control
  metadata, exclude payloads/jobs from backups, and never send imported jobs.
  Delivery workers cannot mutate game state outside Application API completion.

##### 9.1.4.16 Admitted work, disconnection, and shutdown

* HTTP operations return synchronously when complete, except external delivery
  enqueueing in 9.1.4.15. An admitted simulation or commit pins its control lease
  until it finishes or rolls back. Queued-but-not-admitted work does not pin it
  and must authenticate again at admission. After a successful operation, the
  normal five-minute idle window starts from completion.
* Reads capture an immutable snapshot at admission. Simulations run in private
  workers and must not block unrelated UI rendering or read queries. The compact
  query's 100 runs and full query's 1,000 runs are never reduced under load.
  Use a bounded work queue and return `busy` before admission when it is full.
* Client disconnect may cancel private read computation; it never cancels an
  admitted commit. That commit resolves to durable success or rollback. The
  client recovers a lost response by repeating the same endpoint/body/key; an
  admitted duplicate reports `operation_in_progress`, then the terminal receipt.
  It must not switch to a fresh key merely because the connection timed out.
* Graceful logout/shutdown stops new admission and drains or safely rolls back
  admitted work before releasing authority. Reads may be cancelled. Do not
  resume normal progression while staged work could still commit. Renderer loss
  or process death reloads the last durable state and receipts; uncommitted
  staging is discarded. Bootstrap/session tokens must be reacquired on restart.
* Import/reset invalidates snapshots still computing and closes their streams.
  An affected read returns `stale_revision` rather than publishing a pre-reset
  result. It never cancels a previously committed operation or deletes its receipt.
* Wall-clock/API-time reconciliation and logical Chunk boundaries remain governed
  by the progression specifications. Within an atomic API progression request,
  checkpoints and publication follow 9.1.4.4; ordinary AFK checkpoints outside
  that request remain unchanged. Transport lease renewal never advances game time.

##### 9.1.4.17 UI state ownership

| State | Owner and access |
| --- | --- |
| Hover, open tooltip, scroll, unsaved form draft, dismissed toast | Local client state; no Commit and no revision change. |
| Current party/character/Diary selection, Base pane, transient filters | Local view context supplied to a projection; reads never persist selection. Where 8.x requires retention, persist through `uiPreferences`. |
| Retained pane expansion, per-party Clairvoyance expansion, previous feedback name, retained selections/filters | Per-save preferences through `commit/setting/uiPreferences`, returned by `read/observation/setting`. |
| Newly acquired inventory highlighting | Read supplies stable variant keys and `isNew`; `markItemsAsSeen` explicitly acknowledges displayed variants. |
| Diary/news read state, language/theme, gameplay settings | Existing specific Commit operations; never a side effect of projection. |
| Desktop login-at-startup and notification delivery preferences | Trusted desktop Application API operations with platform availability, not arbitrary save fields or privileged HTTP passthrough. |

`uiPreferences.parameters.changes` is a nonempty array of
`{key: string, value: string|number|boolean}`. Keys are an explicit shared catalog
of preferences already required by 8.x, published with their value types and
valid options in `settingInfo.uiPreferences`. Unknown keys, duplicate keys, and
wrong types reject the entire update; this is not a generic save-path setter.
Return the complete public preference list. Defaults and retention scope follow
8.x; do not make every local click a persisted mutation.

`markItemsAsSeen.parameters.items` is a nonempty array of stable variant keys
returned by the inventory projection. Return `{items: string[]}` of actually
changed keys. Re-acknowledging a known seen variant is a no-op. Unknown variants
reject atomically. Neither operation changes inventory quantity or currencies.

Focused projection query context:

| Projection | Optional context |
| --- | --- |
| `party` | `partyNumber`, `characterId`; character must belong to selected party. |
| `base` | `pane`: `shop|inventory|vault|workshop|altar`; item searches use `searchItems`. |
| `diary` | `partyNumber`, `diaryEntryId`; entry must belong to selected party. |
| `compact`, `overview`, `expedition`, `setting` | No local selection context. |

Defaults use the retained selection when 8.x requires it, otherwise the first
unlocked party/member or the documented default pane. Return the effective
selection. A stale retained selection falls back safely; an explicitly invalid
selection is rejected. Disabled panes still return their availability/reason.
UI adapters translate actual view actions into the required explicit commands
(for example leaving a Diary party tab marks its entries read); HTTP reads never
perform those actions. The menu-bar pane continues to receive only its minimum
read-only display projection under 9.1.2.

Before migrating a UI area, inventory every existing control and persisted
preference against this ownership map. Publish the closed preference catalog and
trusted desktop operation schemas alongside the shared types; uncovered actions
block that area's migration rather than falling back to direct save mutation.

[EOF]
