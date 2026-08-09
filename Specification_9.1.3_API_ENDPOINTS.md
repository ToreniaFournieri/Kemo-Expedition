## 9. Environment

### 9.1 Desktop distribution

#### 9.1.3 Experimental AI API — Endpoint Contracts

This document is the normative endpoint contract referenced by section 9.1.3 of @Specification.md.

### Contract conventions

- Endpoint descriptions follow the operation structure of OpenAPI Specification 3.2.0: operation identifier, security, parameters and headers, response status, response headers, schema, field definitions, and examples.
- JSON schemas use the data model and validation vocabulary supported by OpenAPI 3.2.0.
- HTTP method, status-code, header, authentication, caching, and content-negotiation behavior follows RFC 9110.
- The key words `MUST`, `MUST NOT`, `REQUIRED`, `SHOULD`, `SHOULD NOT`, and `MAY` are normative only when capitalized and are interpreted according to BCP 14 (RFC 2119 and RFC 8174).
- Property names and enum values are case-sensitive.
- JSON property names use `camelCase`. Error codes and enum values use lowercase `snake_case` unless an endpoint explicitly specifies otherwise.
- Unix timestamps are integer milliseconds since `1970-01-01T00:00:00Z`.
- Clients MUST ignore unrecognized response properties. The server MUST NOT remove a property, change its type, or change its meaning without changing `schemaVersion`.
- Every response MUST include `Content-Type: application/json` and `Cache-Control: no-store`.
- Unless an operation states otherwise, a successful response is `200 OK`.

### Endpoint index

| Method | Path | Operation ID | Authentication | Control lease | Purpose |
|-|-|-|-|-|-|
| `GET` | `/experimental/v1/status` | `getExperimentalApiStatus` | Optional | Not required | Discover API, runtime, and lease status. |
| `POST` | `/experimental/v1/control/acquire` | `acquireExperimentalApiControl` | Bearer | Must be available | Acquire exclusive API control. |
| `POST` | `/experimental/v1/control/release` | `releaseExperimentalApiControl` | Bearer | Owner required | Persist and return control to the UI. |
| `POST` | `/experimental/v1/build-options` | `getCharacterBuildOptions` | Bearer | Owner required | Evaluate safe character-build alternatives without mutation. |
| `GET` | `/experimental/v1/observation` | `getExperimentalApiObservation` | Bearer | Owner required | Read the AI-safe game observation. |
| `POST` | `/experimental/v1/command` | `executeExperimentalApiCommand` | Bearer | Owner required | Apply one strategic command. |
| `POST` | `/experimental/v1/sortie` | `executeExperimentalApiSorties` | Bearer | Owner required | Resolve 1 to 100 normal expedition Cycles. |

### Common error envelope

All endpoint errors MUST use this shape:

```json
{
  "error": {
    "code": "authentication_failed",
    "message": "The supplied bearer token is invalid.",
    "retryable": false,
    "details": {}
  }
}
```

| Field | Type | Required | Description |
|-|-|-|-|
| `error` | object | Yes | Error container. |
| `error.code` | string | Yes | Stable machine-readable error identifier. |
| `error.message` | string | Yes | Concise English diagnostic intended for logs and development. Clients MUST NOT parse it for control flow. |
| `error.retryable` | boolean | Yes | Whether retrying later without changing the request may succeed. |
| `error.details` | object | No | Endpoint-specific structured diagnostic data. Clients MUST ignore unrecognized properties. |

## `GET /experimental/v1/status`

**Operation ID:** `getExperimentalApiStatus`

**Purpose:** Discover the API and determine whether an authenticated client can safely acquire or use control. This operation is read-only. It MUST NOT acquire or renew a control lease, advance simulation, persist game state, or increment the state revision.

### Security

- Authentication is optional for this operation.
- A request without an `Authorization` header returns only the public response.
- A request with `Authorization: Bearer <token>` and a valid token returns the authenticated response.
- If an `Authorization` header is supplied but is malformed or contains an invalid token, the server MUST return `401 Unauthorized`. It MUST NOT fall back to the public response.
- An authenticated caller MAY also supply `X-BoKemo-Control-Lease: <lease-token>`. This header is used only to calculate `control.ownedByCaller`; this endpoint does not renew that lease.
- The response MUST NOT contain the bearer token or control-lease token.

### Public response

**Status:** `200 OK`

```json
{
  "apiVersion": "experimental/v1",
  "authenticationRequired": true,
  "status": "available"
}
```

| Field | Type | Required | Allowed value | Description |
|-|-|-|-|-|
| `apiVersion` | string | Yes | `experimental/v1` | Version of the HTTP path and operation contract. |
| `authenticationRequired` | boolean | Yes | `true` | Confirms that gameplay and authenticated status data require bearer authentication. |
| `status` | string | Yes | `available` | Confirms that the loopback API server is reachable. It does not mean that the renderer, save, or control lease is ready. |

The public response MUST NOT reveal the environment, game version, build number, state revision, renderer or save status, or control-lease status.

### Authenticated response

**Status:** `200 OK`

```json
{
  "apiVersion": "experimental/v1",
  "schemaVersion": 1,
  "game": {
    "version": "0.9.1",
    "build": 40,
    "environment": "dev"
  },
  "runtime": {
    "status": "ready",
    "revision": 123
  },
  "control": {
    "status": "available",
    "ownedByCaller": false,
    "leaseExpiresAt": null
  }
}
```

#### Top-level fields

| Field | Type | Required | Description |
|-|-|-|-|
| `apiVersion` | string | Yes | HTTP contract version. It MUST equal `experimental/v1`. |
| `schemaVersion` | integer | Yes | Version of the JSON schemas used by all `/experimental/v1` responses. Initial value: `1`. |
| `game` | object | Yes | Identity of the running BoKemo build. |
| `runtime` | object | Yes | Readiness of the authoritative renderer and active save. |
| `control` | object | Yes | Exclusive API-control lease status. |

#### `game` fields

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `game.version` | string | Yes | Semantic version string | Running application version from `package.json`. |
| `game.build` | integer | Yes | `>= 1` | Running build number from `build_number.txt`. |
| `game.environment` | string | Yes | `dev`, `beta`, or `prod` | Active desktop environment and save namespace defined in section 9. |

#### `runtime` fields

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `runtime.status` | string | Yes | See runtime-status table | Current availability of the renderer and save. |
| `runtime.revision` | integer or `null` | Yes | `>= 0` when present | Current authoritative state revision. It MUST be `null` until a valid save-backed runtime state is available. Reading status never changes it. |

| `runtime.status` | Meaning | May acquire control | May call observation or mutations |
|-|-|-|-|
| `loading` | Renderer or save initialization is incomplete. | No | No |
| `ready` | Runtime is initialized and no operation is executing. | Yes, if control is available | Yes, with required authentication and lease |
| `busy` | An API command or sortie batch is executing. | No | Status only; other operations are rejected as busy |
| `save_error` | Save loading failed and section 5.1.4 protections are active. | No | No |
| `shutting_down` | Application termination has begun. | No | No |

#### `control` fields

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `control.status` | string | Yes | `available` or `leased` | Whether an exclusive API-control lease exists. |
| `control.ownedByCaller` | boolean | Yes | — | `true` only when `X-BoKemo-Control-Lease` contains the active lease token. A missing, invalid, or expired lease token produces `false`. |
| `control.leaseExpiresAt` | integer or `null` | Yes | Unix timestamp in milliseconds | Expiration time of the active lease, or `null` when `control.status` is `available`. |

When `control.status` is `available`, `ownedByCaller` MUST be `false` and `leaseExpiresAt` MUST be `null`. When it is `leased`, `leaseExpiresAt` MUST contain a future timestamp at the instant the response is created.

### Authenticated response while busy

```json
{
  "apiVersion": "experimental/v1",
  "schemaVersion": 1,
  "game": {
    "version": "0.9.1",
    "build": 40,
    "environment": "prod"
  },
  "runtime": {
    "status": "busy",
    "revision": 124
  },
  "control": {
    "status": "leased",
    "ownedByCaller": true,
    "leaseExpiresAt": 1786345200000
  }
}
```

### Error responses

| Status | `error.code` | `retryable` | Condition |
|-|-|-|-|
| `401 Unauthorized` | `authentication_failed` | `false` | A supplied bearer credential is malformed or invalid. |
| `405 Method Not Allowed` | `method_not_allowed` | `false` | The path is requested with a method other than `GET`. The response MUST include `Allow: GET`. |
| `503 Service Unavailable` | `runtime_unavailable` | `true` | The main renderer cannot be contacted or application shutdown prevents a complete authenticated status response. |

The normal authenticated representation with `runtime.status` equal to `loading` or `save_error` SHOULD be preferred when the main process can obtain authoritative runtime status. `503 Service Unavailable` is reserved for failure to obtain that status, not merely for a runtime that is known to be unready.

### Compatibility rules

- `GET /experimental/v1/status` MUST remain available while a sortie batch or command is executing so clients can distinguish `busy` from loss of service.
- A caller MUST compare `apiVersion` before using an endpoint and SHOULD compare `schemaVersion` before decoding authenticated payloads.
- Additive response fields do not require a `schemaVersion` change. Removing a field, changing a field's type, narrowing accepted input, or changing existing semantics requires a new `schemaVersion` or API version as appropriate.

## `POST /experimental/v1/control/acquire`

**Operation ID:** `acquireExperimentalApiControl`

**Purpose:** Acquire the single exclusive API-control lease and place the authoritative renderer in API-controlled mode. This operation changes control state but not game state. It MUST NOT increment the game-state revision.

### Security

- This operation requires `Authorization: Bearer <token>`.
- This operation does not accept `X-BoKemo-Control-Lease` because no caller owns the available lease before acquisition.
- The server MUST NOT return a bearer token in any response.
- The newly generated control-lease token MUST appear only in a successful acquisition response.

### Request

**Headers:**

```http
POST /experimental/v1/control/acquire
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**

```json
{
  "client": {
    "name": "bokemo-ai",
    "version": "1.0.0"
  }
}
```

The request body MAY be omitted. If a body is supplied, it MUST be a JSON object. Unknown properties at any level MUST be rejected.

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `client` | object | No | — | Informational identity of the controlling client. It does not grant authority and is not persisted in game save data. |
| `client.name` | string | Yes when `client` is present | 1 to 64 Unicode characters after trimming | Human-readable client name. An empty trimmed value is invalid. |
| `client.version` | string | No | 1 to 64 Unicode characters after trimming | Client-provided version label. |

- `expectedRevision` MUST NOT be supplied. Acquiring control changes lease state rather than gameplay state.
- Client metadata MUST NOT be used to decide authorization or lease ownership.

### Success response

**Status:** `200 OK`

```json
{
  "apiVersion": "experimental/v1",
  "schemaVersion": 1,
  "lease": {
    "token": "opaque-base64url-value",
    "acquiredAt": 1786345100000,
    "expiresAt": 1786345400000,
    "idleTimeoutMs": 300000
  },
  "runtime": {
    "status": "ready",
    "revision": 123
  }
}
```

#### Top-level fields

| Field | Type | Required | Description |
|-|-|-|-|
| `apiVersion` | string | Yes | HTTP contract version. It MUST equal `experimental/v1`. |
| `schemaVersion` | integer | Yes | JSON schema version. Initial value: `1`. |
| `lease` | object | Yes | Newly acquired exclusive control lease. |
| `runtime` | object | Yes | Runtime state at the instant control was acquired. |

#### `lease` fields

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `lease.token` | string | Yes | Opaque base64url value containing at least 256 bits of cryptographically secure randomness | Secret used to prove ownership of the control lease. It MUST be stored only in process memory and MUST NOT be written to save data or logs. |
| `lease.acquiredAt` | integer | Yes | Unix timestamp in milliseconds | Time at which the lease became active. |
| `lease.expiresAt` | integer | Yes | `acquiredAt + 300000` | Initial lease-expiration time. |
| `lease.idleTimeoutMs` | integer | Yes | `300000` | Sliding inactivity timeout in milliseconds. |

#### `runtime` fields

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `runtime.status` | string | Yes | `ready` | Confirms that the renderer acknowledged API-controlled mode. |
| `runtime.revision` | integer | Yes | `>= 0` | Authoritative game-state revision at acquisition. Acquisition MUST NOT change this value. |

After acquisition, every operation that requires lease ownership MUST include both credentials:

```http
Authorization: Bearer <token>
X-BoKemo-Control-Lease: <lease-token>
```

### Atomic acquisition behavior

The server MUST perform acquisition in this order:

1. Authenticate the bearer token.
2. Confirm that the authoritative runtime is `ready` and its save is valid.
3. Confirm that no active control lease exists.
4. Ask the authoritative renderer to enter API-controlled mode and disable every state-mutating UI control.
5. Wait for renderer acknowledgement that gameplay progression and mutating UI actions are locked.
6. Generate and register the control lease in main-process memory.
7. Return the lease token and runtime revision.

- If any step fails, the operation MUST leave no active lease and MUST restore ordinary UI control and progression if they were provisionally locked.
- The lease MUST be considered active only after renderer acknowledgement and successful main-process registration.
- Repeating acquisition while any unexpired lease exists MUST NOT renew, replace, or disclose that lease.

### Progression while controlled

- Normal wall-clock progression MUST pause while the lease is active.
- Existing partial state and Step progress MUST remain frozen until an API operation explicitly simulates progression or the lease ends.
- Acquiring control MUST NOT advance game time, run AFK recovery, persist game state, change party selection, or change gameplay settings.
- API commands and sorties advance only the simulation explicitly required by those operations.
- Time spent under API control MUST NOT become AFK elapsed time when control ends.
- An accepted API operation pins the lease for the complete operation even if its normal expiry time passes during execution.
- While pinned, inactivity expiry MUST be suspended. After the operation finishes successfully, the server MUST set `expiresAt` to five minutes after the response is prepared.
- While an operation is pinned, the server MUST extend the active lease as needed so `expiresAt` reported by the status endpoint remains in the future.
- Lease expiry, release, API disablement, or application shutdown MUST restore normal progression from the current simulated state without catch-up for the controlled wall-clock interval.

### Sliding inactivity renewal

- The initial lease expires five minutes after acquisition unless renewed by activity.
- A successful lease-owned call to `observation`, `build-options`, `command`, or `sortie` MUST renew the lease by setting `expiresAt` to five minutes after that response is prepared.
- `status` MUST NOT renew the lease. `release` ends the lease instead of renewing it.
- Authentication failures, invalid or stale lease tokens, invalid requests, stale revisions, illegal actions, internal failures, and persistence failures MUST NOT renew the lease.
- Exception: when a release failure deliberately retains API-controlled mode for safe retry, it MUST grant a new five-minute recovery period so the lease cannot expire immediately after being unpinned.
- A long-running accepted command or sortie pins the lease for its complete atomic operation. It cannot expire during that operation, and successful completion starts a new five-minute inactivity period.
- The server MUST determine inactivity expiry with a monotonic clock. Returned `expiresAt` values remain Unix milliseconds derived from the corresponding monotonic deadline.
- Lease expiry and the start of a lease-owned operation MUST be serialized. A request begins ownership processing successfully only when processing starts strictly before the expiry deadline.
- An expired lease cannot be revived. The client must acquire a new lease.

### Error responses

| Status | `error.code` | `retryable` | Condition |
|-|-|-|-|
| `400 Bad Request` | `invalid_request` | `false` | Malformed JSON, an unknown property, prohibited `expectedRevision`, or invalid client metadata. |
| `401 Unauthorized` | `authentication_failed` | `false` | Bearer authentication is missing, malformed, or invalid. |
| `409 Conflict` | `control_already_leased` | `true` | An unexpired control lease already exists. |
| `409 Conflict` | `runtime_busy` | `true` | A serialized operation is still completing and control cannot be acquired. |
| `405 Method Not Allowed` | `method_not_allowed` | `false` | The path is requested with a method other than `POST`. The response MUST include `Allow: POST`. |
| `503 Service Unavailable` | `runtime_loading` | `true` | Renderer or save initialization is incomplete. |
| `503 Service Unavailable` | `save_error` | `false` | Save loading failed and section 5.1.4 protections are active. |
| `503 Service Unavailable` | `runtime_unavailable` | `true` | Renderer IPC failed or the renderer did not acknowledge the UI and progression lock. |

For `control_already_leased`, the server MAY include only the active lease expiration as structured details:

```json
{
  "error": {
    "code": "control_already_leased",
    "message": "Experimental API control is already leased.",
    "retryable": true,
    "details": {
      "leaseExpiresAt": 1786345400000
    }
  }
}
```

The response MUST NOT identify the controlling client or disclose either token.

## `POST /experimental/v1/control/release`

**Operation ID:** `releaseExperimentalApiControl`

**Purpose:** Safely persist the authoritative game state, end the caller's exclusive API-control lease, and return mutation and normal real-time progression to the UI. This operation changes control and timing anchors but does not change gameplay state or increment the game-state revision.

### Security

- This operation requires both:

```http
Authorization: Bearer <token>
X-BoKemo-Control-Lease: <lease-token>
```

- The bearer token authenticates API access. The control-lease token proves ownership of the active lease.
- The server MUST compare lease tokens using a timing-safe comparison.
- Neither credential may be returned in the response, written to logs, or persisted in save data.

### Request

```http
POST /experimental/v1/control/release
Authorization: Bearer <token>
X-BoKemo-Control-Lease: <lease-token>
Content-Type: application/json
```

- The request body MAY be omitted or MAY be an empty JSON object (`{}`).
- Any request-body property, including `expectedRevision`, MUST be rejected as `invalid_request`.
- The operation does not use `expectedRevision` because it does not conditionally change gameplay state.

### Success response

**Status:** `200 OK`

```json
{
  "apiVersion": "experimental/v1",
  "schemaVersion": 1,
  "release": {
    "releasedAt": 1786345150000,
    "reason": "client_request",
    "statePersisted": true
  },
  "runtime": {
    "status": "ready",
    "revision": 123,
    "controlStatus": "available"
  }
}
```

#### Top-level fields

| Field | Type | Required | Description |
|-|-|-|-|
| `apiVersion` | string | Yes | HTTP contract version. It MUST equal `experimental/v1`. |
| `schemaVersion` | integer | Yes | JSON schema version. Initial value: `1`. |
| `release` | object | Yes | Completed lease-release result. |
| `runtime` | object | Yes | Runtime state after ordinary UI control and progression have resumed. |

#### `release` fields

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `release.releasedAt` | integer | Yes | Unix timestamp in milliseconds | Server time at which lease release completed. |
| `release.reason` | string | Yes | `client_request` | Confirms that the controlling client explicitly released control. |
| `release.statePersisted` | boolean | Yes | `true` | Confirms that all authoritative game-state changes completed before release were flushed successfully. |

#### `runtime` fields

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `runtime.status` | string | Yes | `ready` | Runtime is available for ordinary UI progression. |
| `runtime.revision` | integer | Yes | `>= 0` | Authoritative game-state revision after persistence. Release MUST NOT increment it. |
| `runtime.controlStatus` | string | Yes | `available` | Confirms that no API controller holds the lease. |

### Atomic release behavior

The server MUST perform release in this order:

1. Authenticate the bearer token.
2. Confirm that an active, unexpired lease exists and that the supplied lease token owns it.
3. Confirm that no API command or sortie batch is executing.
4. Mark the lease as releasing so no renewal or new gameplay operation can race with release.
5. Ask the authoritative renderer to flush all completed gameplay changes to the active environment's save namespace.
6. Re-anchor progression and deadline timing so controlled wall-clock time remains excluded while preserving all simulated time advanced by API operations.
7. Ask the renderer to leave API-controlled mode, restore state-mutating UI controls, and resume normal real-time progression.
8. Wait for renderer acknowledgement.
9. Destroy the lease token and all client metadata held for that lease.
10. Return the final revision and successful release result.

- Release MUST be atomic from the perspective of API clients and UI actions.
- Once the lease is marked as releasing, new command, observation, build-options, sortie, and release requests for that lease MUST be rejected with `control_releasing` until release succeeds or rolls back.
- A release request received while a command or sortie batch is executing MUST return `runtime_busy`. It MUST NOT cancel, interrupt, or partially commit that operation.
- A successful release MUST make the previous lease token permanently invalid.
- Repeating release with the previous token after success MUST return `no_active_lease`; clients MAY confirm success through the status endpoint.

### Progression hand-back

- Normal wall-clock progression resumes only after persistence, timing re-anchoring, UI restoration, and renderer acknowledgement succeed.
- The controlled wall-clock interval MUST NOT be counted as online elapsed time, AFK elapsed time, side-quest elapsed time, charge elapsed time, or Step progress.
- Simulated time explicitly advanced by successful API sorties MUST remain applied to game state, side quests, deadlines, Diary timestamps, and other time-dependent effects.
- Partial state and Step progress that existed when control was acquired MUST resume from the same fractional or completed-Step position, except for progression explicitly produced by API operations.
- The Instant Expedition charge stock and timer remain governed by the API-sortie rule in section 9.1.3: API sorties do not modify them, and the controlled wall-clock interval does not recharge them.
- Release MUST NOT run AFK recovery, change party selection, change gameplay settings, or increment `revision`.

### Failure and rollback behavior

- If save persistence fails, release MUST fail with `persistence_failed`; the lease and API-controlled UI lock remain active so the client can inspect status, maintain the lease, and retry release. Section 5.1.4 save protections apply.
- If timing re-anchoring or UI restoration fails after persistence, the server MUST keep or restore the existing lease and API-controlled mode whenever the renderer remains reachable. It MUST return `release_failed` and MUST NOT report success.
- If the renderer becomes unavailable, the main process MUST terminate the lease and schedule ordinary control restoration for the next successful renderer initialization. It MUST return `runtime_unavailable`; save-load protections determine whether mutation may resume.
- A failed release MUST NOT increment `revision` or discard successfully completed gameplay changes.

### Error responses

| Status | `error.code` | `retryable` | Condition |
|-|-|-|-|
| `400 Bad Request` | `invalid_request` | `false` | Malformed JSON or a non-empty request object. |
| `401 Unauthorized` | `authentication_failed` | `false` | Bearer authentication is missing, malformed, or invalid. |
| `403 Forbidden` | `control_lease_invalid` | `false` | An active lease exists, but `X-BoKemo-Control-Lease` is missing, malformed, or does not match it. |
| `409 Conflict` | `no_active_lease` | `false` | No control lease exists. |
| `409 Conflict` | `control_lease_expired` | `false` | The matching lease expired before release processing began. |
| `409 Conflict` | `control_releasing` | `true` | Another release operation has already marked the lease as releasing. |
| `409 Conflict` | `runtime_busy` | `true` | A command or sortie batch is executing. The caller should retry after it completes. |
| `405 Method Not Allowed` | `method_not_allowed` | `false` | The path is requested with a method other than `POST`. The response MUST include `Allow: POST`. |
| `500 Internal Server Error` | `release_failed` | `true` | Persistence succeeded, but timing re-anchoring or UI restoration failed and was rolled back to API-controlled mode. |
| `503 Service Unavailable` | `persistence_failed` | `true` | The authoritative state could not be flushed safely. |
| `503 Service Unavailable` | `runtime_unavailable` | `true` | Renderer IPC failed or the authoritative renderer became unavailable. |

- Bearer authentication MUST be evaluated before lease state or lease-token validity.
- If no lease exists, the server returns `no_active_lease` regardless of a missing, malformed, stale, or previously released lease token.
- If an active lease exists but the supplied token is missing, malformed, or different, the server returns `control_lease_invalid` without identifying its owner or expiration.
- If the matching lease expired, the server MUST complete lease-expiry cleanup before returning `control_lease_expired`.

## `POST /experimental/v1/build-options`

**Operation ID:** `getCharacterBuildOptions`

**Purpose:** Return the complete currently legal selection domains for one character build and optionally validate a hypothetical partial build before it is submitted to `update_character_build`. This operation is read-only despite using `POST`; a request body is required because the result may depend on a proposed multi-field selection.

### Security

This operation requires both:

```http
Authorization: Bearer <token>
X-BoKemo-Control-Lease: <lease-token>
```

- The bearer token authenticates API access. The control-lease token proves ownership of the active lease.
- A successful response renews the five-minute inactivity timeout. The endpoint MUST NOT return either credential.

### Request

```json
{
  "revision": 123,
  "partyId": 1,
  "characterId": 101,
  "proposedChanges": {
    "raceId": "lupinian",
    "gender": "female",
    "mainClassId": "wizard"
  }
}
```

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `revision` | integer | Yes | `>= 0` | Observation revision against which options are evaluated. This is named `revision`, not `expectedRevision`, because the operation is read-only. |
| `partyId` | integer | Yes | Unlocked party ID | Party containing the character. |
| `characterId` | integer | Yes | Character belonging to `partyId` | Character whose alternatives are requested. |
| `proposedChanges` | object | No | Partial character-build fields | Hypothetical changes to merge with the current build before validation. |

- `proposedChanges` accepts the same properties and value types as `update_character_build.changes`.
- An omitted or empty `proposedChanges` evaluates the current effective build.
- Unknown properties MUST be rejected at every request-object level.
- The endpoint MUST NOT assign a random default name. When a race change would assign one during the real command, it reports that behavior as metadata.
- A stale `revision` MUST be rejected before evaluating options or revealing current character constraints.

### Success response

**Status:** `200 OK`

```json
{
  "apiVersion": "experimental/v1",
  "schemaVersion": 1,
  "revision": 123,
  "partyId": 1,
  "characterId": 101,
  "currentBuild": {
    "name": "Rin",
    "gender": "female",
    "raceId": "vulpinian",
    "lineageId": "sandstorm",
    "predispositionId": "inquisitive",
    "mainClassId": "ranger",
    "subClassId": "sage",
    "mimorianEnemyId": null
  },
  "candidateBuild": {
    "name": "Rin",
    "gender": "female",
    "raceId": "lupinian",
    "lineageId": "sandstorm",
    "predispositionId": "inquisitive",
    "mainClassId": "wizard",
    "subClassId": "sage",
    "mimorianEnemyId": null
  },
  "candidateValidation": {
    "valid": true,
    "violations": [],
    "defaultNameWillBeAssigned": true
  },
  "options": {
    "editableFields": [
      "name",
      "gender",
      "raceId",
      "lineageId",
      "predispositionId",
      "mainClassId",
      "subClassId",
      "mimorianEnemyId"
    ],
    "name": {
      "editable": true,
      "minimumLength": 1,
      "maximumLength": 64
    },
    "raceGenderPairs": [
      {
        "raceId": "lupinian",
        "gender": "female"
      },
      {
        "raceId": "vulpinian",
        "gender": "male"
      }
    ],
    "lineageIds": ["sandstorm", "ashen_capital"],
    "predispositionIds": ["aggressive", "inquisitive"],
    "mainClassIds": ["duelist", "wizard"],
    "subClassIds": ["duelist", "wizard"],
    "mimorianEnemyIds": [],
    "mimorianRules": {
      "gender": "female",
      "lineageId": null,
      "predispositionId": null
    }
  }
}
```

### Response fields

| Field | Type | Required | Description |
|-|-|-|-|
| `apiVersion` | string | Yes | HTTP contract version. It MUST equal `experimental/v1`. |
| `schemaVersion` | integer | Yes | JSON schema version. Initial value: `1`. |
| `revision` | integer | Yes | Revision used for all validation and option generation. |
| `partyId` | integer | Yes | Evaluated party. |
| `characterId` | integer | Yes | Evaluated character. |
| `currentBuild` | object | Yes | Current effective character-build observation. |
| `candidateBuild` | object | Yes | Current build merged with `proposedChanges` and normalized only where the rules produce a deterministic value. |
| `candidateValidation` | object | Yes | Whether `candidateBuild` could be submitted safely. |
| `options` | object | Yes | Complete legal selection domains at this revision. |

`currentBuild` and `candidateBuild` use the character `build` schema from the observation endpoint.

### Candidate validation

| Field | Type | Required | Description |
|-|-|-|-|
| `candidateValidation.valid` | boolean | Yes | Whether the complete candidate satisfies all character-build rules. |
| `candidateValidation.violations` | array | Yes | Structured reasons the candidate is invalid. Empty when valid. |
| `candidateValidation.defaultNameWillBeAssigned` | boolean | Yes | `true` when the proposed race differs and no explicit name was provided. |

Each violation contains:

| Field | Type | Required | Description |
|-|-|-|-|
| `code` | string | Yes | Stable reason code. |
| `fields` | string array | Yes | Build fields participating in the violation. |
| `conflictingCharacterIds` | integer array | Yes | Other characters causing the conflict, or an empty array. |

Stable violation codes are:

| Code | Meaning |
|-|-|
| `immutable_character_field` | A proposed property is immutable for this unique character. |
| `party_race_gender_conflict` | Another editable party member already uses the proposed race and gender pair. |
| `mimorian_gender_required` | A Mimorian candidate is not female. |
| `mimorian_form_required` | A Mimorian candidate has no enemy form. |
| `mimorian_form_locked` | The selected form has not been unlocked. |
| `mimorian_form_assigned` | Another Mimorian already uses the form. |
| `mimorian_identity_conflict` | A Mimorian candidate contains a lineage or predisposition. |
| `non_mimorian_identity_required` | A non-Mimorian candidate lacks a lineage or predisposition. |
| `non_mimorian_form_forbidden` | A non-Mimorian candidate contains a Mimorian form. |
| `unselectable_value` | A race, lineage, predisposition, or class is not selectable. |
| `invalid_name` | The proposed explicit name violates character-name rules. |

### Safe option domains

- `options.editableFields` is the authoritative list of properties that can produce a valid candidate and that are accepted by `update_character_build.changes` for this character. The preflight endpoint MAY receive another supported property only to return an `immutable_character_field` candidate violation; it never makes that property editable.
- `options.raceGenderPairs` is the authoritative list of race and gender combinations currently legal for the target character. Race and gender MUST be represented as pairs because validating independent lists would allow unsafe combinations.
- A pair occupied by another non-unique member in the party MUST be omitted.
- For Mimorian, only `{ "raceId": "mimorian", "gender": "female" }` may appear, and only when at least one unassigned unlocked form exists or the character is already a valid Mimorian.
- `options.lineageIds` and `options.predispositionIds` contain selectable values for non-Mimorian builds. A Mimorian uses the `null` values declared by `mimorianRules` instead.
- `options.mainClassIds` and `options.subClassIds` contain every class currently selectable for the character.
- `options.mimorianEnemyIds` contains unlocked forms not assigned to another Mimorian, plus the target character's currently assigned form when applicable.
- All option arrays MUST contain stable IDs, be duplicate-free, and follow master-data order.
- For a unique character:
  - `options.editableFields` MUST equal exactly `["mainClassId", "subClassId"]`;
  - `options.name.editable` is `false`;
  - `raceGenderPairs` contains only its current pair;
  - lineage and predisposition arrays contain only their current effective values;
  - class arrays continue to contain all selectable classes;
  - Mimorian-form options contain only the current value when applicable.
- The response MUST NOT expose rejected race/gender pairs, another character's build, locked Mimorian form IDs, random default-name candidates, or hidden master-data values.
- For a non-unique character, `editableFields` contains every generally editable build property, subject to the conditional Mimorian and race/gender rules returned by the other option fields.

### How clients construct a safe build

- For a non-Mimorian character, a structurally safe complete build consists of:
  - one entry from `raceGenderPairs` whose race is not `mimorian`;
  - one `lineageId`;
  - one `predispositionId`;
  - one `mainClassId`;
  - one `subClassId`;
  - `mimorianEnemyId: null`.
- For a Mimorian character, a structurally safe complete build consists of:
  - the Mimorian/female pair from `raceGenderPairs`;
  - `lineageId: null` and `predispositionId: null` as specified by `mimorianRules`;
  - one `mainClassId`;
  - one `subClassId`;
  - one ID from `mimorianEnemyIds`.
- Clients SHOULD call this endpoint again with their intended `proposedChanges` and require `candidateValidation.valid: true` before calling `update_character_build` with the same revision.
- A valid options response is advisory only for its `revision`. The mutating command MUST repeat all validation and may return `stale_revision` if state changed.

### Side effects and consistency

- Option generation and candidate validation MUST use the same validators as `update_character_build`.
- The complete response MUST be generated from one immutable state revision.
- Calling this endpoint MUST NOT consume randomness, assign a default name, trigger automatic equipment, modify inventory or Jewels, emit notifications, persist game state, advance time, or increment `revision`. Its only control-state side effect is renewing the inactivity timeout after a successful response.

### Error responses

| Status | `error.code` | `retryable` | Condition |
|-|-|-|-|
| `400 Bad Request` | `invalid_request` | `false` | The request schema, field type, or property set is invalid. |
| `401 Unauthorized` | `authentication_failed` | `false` | Bearer authentication is missing, malformed, or invalid. |
| `403 Forbidden` | `control_lease_invalid` | `false` | An active lease exists, but the lease header is missing, malformed, or does not match it. |
| `404 Not Found` | `party_not_found` | `false` | `partyId` does not identify an unlocked party. |
| `404 Not Found` | `character_not_found` | `false` | `characterId` does not belong to the specified party. |
| `409 Conflict` | `stale_revision` | `true` | `revision` does not equal the authoritative revision. `error.details` MUST contain `currentRevision`. |
| `409 Conflict` | `no_active_lease` | `false` | No control lease exists. |
| `409 Conflict` | `control_lease_expired` | `false` | The matching lease expired before evaluation began. |
| `409 Conflict` | `control_releasing` | `true` | The lease is being released. |
| `409 Conflict` | `runtime_busy` | `true` | A command or sortie batch is executing. |
| `405 Method Not Allowed` | `method_not_allowed` | `false` | The path is requested with a method other than `POST`. The response MUST include `Allow: POST`. |
| `503 Service Unavailable` | `save_error` | `false` | Save-load protection from section 5.1.4 is active. |
| `503 Service Unavailable` | `runtime_unavailable` | `true` | The authoritative renderer cannot evaluate the character. |

- Authentication and lease ownership MUST be checked before revision, target existence, or candidate validation.
- Revision MUST be checked before target existence or candidate validation so stale requests cannot probe the current party composition.

## `GET /experimental/v1/observation`

**Operation ID:** `getExperimentalApiObservation`

**Purpose:** Return one atomic, revisioned, AI-safe snapshot of the active environment's strategic game state and the commands currently legal. This endpoint is read-only and is not a raw save-data export.

### Security

- This operation requires both:

```http
Authorization: Bearer <token>
X-BoKemo-Control-Lease: <lease-token>
```

- The bearer token authenticates API access. The control-lease token proves ownership of the active lease.
- Neither credential may appear in the response or logs.
- A successful observation response MUST renew the sliding inactivity timeout according to the acquire contract.

### Request

```http
GET /experimental/v1/observation
Authorization: Bearer <token>
X-BoKemo-Control-Lease: <lease-token>
```

- The endpoint accepts no request body, path parameters, or query parameters.
- An unsupported query parameter MUST be rejected as `invalid_request` so a misspelled or unsupported filter cannot silently produce a misleading observation.

### Success response

**Status:** `200 OK`

The following non-normative example illustrates the response structure. Empty repeated-object arrays are abbreviated for readability and do not override the cardinality and field requirements below.

```json
{
  "apiVersion": "experimental/v1",
  "schemaVersion": 1,
  "observation": {
    "revision": 123,
    "observedAt": 1786345160000,
    "simulatedAt": 1786345100000,
    "environment": "dev",
    "language": "en",
    "resources": {
      "gold": 12500,
      "prana": 15,
      "jewelsByKeyAndRank": {
        "might:1": 2,
        "fort:2": 1
      }
    },
    "automation": {
      "autoRun": false
    },
    "progression": {
      "unlockedPartyIds": [1, 2],
      "unlockedDungeonIds": [1, 2, 3],
      "unlockedDeityIds": ["none", "restoration"]
    },
    "catalogs": {
      "selectableRaceIds": ["lupinian", "vulpinian"],
      "selectableClassIds": ["duelist", "ranger"],
      "selectablePredispositionIds": ["aggressive", "inquisitive"],
      "selectableLineageIds": ["sandstorm", "ashen_capital"],
      "unlockedMimorianEnemyIds": [],
      "dungeons": [
        {
          "id": 1,
          "tier": 1,
          "displayName": "Caninian Plains"
        }
      ],
      "deities": [
        {
          "id": "none",
          "displayName": "None"
        }
      ]
    },
    "inventory": {
      "equipmentByCategory": {
        "armor": {
          "ownedCount": 3,
          "autoEquipmentCandidateCount": 2,
          "bestCandidate": {
            "itemId": 101,
            "variantId": "opaque-stable-variant-id",
            "tier": 2,
            "rarity": "uncommon",
            "enhancement": 1,
            "superRare": 0
          }
        }
      }
    },
    "parties": [
      {
        "id": 1,
        "name": "PT1",
        "level": 12,
        "experience": 450,
        "experienceToNext": 1200,
        "hp": {
          "current": 3800,
          "maximum": 4200
        },
        "condition": {
          "value": 42,
          "key": "condition.normal"
        },
        "deityId": "restoration",
        "state": {
          "id": "state.idle",
          "progressKind": "none",
          "completedSteps": null,
          "totalSteps": null,
          "startedAt": null,
          "endsAt": null
        },
        "automation": {
          "jewelPriority": true
        },
        "expedition": {
          "destinationMode": "fixed",
          "selectedDungeonId": 2,
          "depthLimit": "all",
          "difficultyOffset": 3,
          "maximumDifficultyOffset": 20,
          "instantExpeditionStock": 2,
          "instantExpeditionChargeStartedAt": 1786340000000,
          "normalSortieAvailable": true,
          "godBattleAvailable": false
        },
        "lootGates": [],
        "sideQuest": null,
        "characters": [],
        "latestExpedition": null
      }
    ],
    "legalActions": [
      {
        "type": "sortie",
        "partyId": 1,
        "characterId": null,
        "constraints": {
          "minimumCount": 1,
          "maximumCount": 100
        }
      }
    ]
  }
}
```

### Top-level fields

| Field | Type | Required | Description |
|-|-|-|-|
| `apiVersion` | string | Yes | HTTP contract version. It MUST equal `experimental/v1`. |
| `schemaVersion` | integer | Yes | JSON schema version. Initial value: `1`. |
| `observation` | object | Yes | One internally consistent snapshot taken at `observation.revision`. |

### Observation identity fields

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `observation.revision` | integer | Yes | `>= 0` | Authoritative game-state revision to supply as `expectedRevision` in the next mutating request. |
| `observation.observedAt` | integer | Yes | Unix timestamp in milliseconds | Server wall-clock time at which snapshot construction completed. |
| `observation.simulatedAt` | integer | Yes | Unix timestamp in milliseconds | Current authoritative in-game timestamp. It remains frozen except for simulation explicitly performed by API operations. |
| `observation.environment` | string | Yes | `dev`, `beta`, or `prod` | Active desktop environment and save namespace. |
| `observation.language` | string | Yes | `ja`, `en`, `zh-CN`, or `zh-TW` | Active display language used for optional display metadata. Stable IDs remain authoritative. |

### Resources and progression

| Field | Type | Required | Description |
|-|-|-|-|
| `observation.resources.gold` | integer | Yes | Shared Gold balance. |
| `observation.resources.prana` | integer | Yes | Shared Prana balance. |
| `observation.resources.jewelsByKeyAndRank` | object | Yes | Counts of unequipped Jewels, keyed as `<jewelKey>:<rank>`. Zero-count entries MAY be omitted. |
| `observation.automation.autoRun` | boolean | Yes | Global normal Auto-Run setting shared by all parties. It remains paused while API control is active. |
| `observation.progression.unlockedPartyIds` | integer array | Yes | Unlocked party IDs in party order. |
| `observation.progression.unlockedDungeonIds` | integer array | Yes | Dungeon IDs currently available to at least one party. |
| `observation.progression.unlockedDeityIds` | string array | Yes | Deity IDs currently available for assignment. |

All resource values MUST be raw JSON numbers without `Intl.NumberFormat` separators or localized numeric strings.

### Catalogs

- `catalogs` contains the currently selectable or unlocked IDs required to construct strategic commands without copying static master data into every character or party object.
- `selectableRaceIds`, `selectableClassIds`, `selectablePredispositionIds`, and `selectableLineageIds` contain only values selectable under the current specification.
- `unlockedMimorianEnemyIds` contains only enemy forms already unlocked at the Altar.
- `dungeons` contains `id`, `tier`, and optional localized `displayName` for each unlocked dungeon.
- `deities` contains stable `id` and optional localized `displayName` for each assignable deity.
- Array order MUST be deterministic and follow the corresponding master-data or progression order.
- Display names are optional metadata. Clients MUST use stable IDs for commands and comparisons.

### Inventory summary

`observation.inventory.equipmentByCategory` MUST contain one property for every equipment category defined in section 3, keyed without the `i.` prefix.

| Field | Type | Required | Description |
|-|-|-|-|
| `ownedCount` | integer | Yes | Total unequipped, owned item count in the category, including stacked variants. |
| `autoEquipmentCandidateCount` | integer | Yes | Number of owned variants currently eligible for automatic equipment for at least one character. |
| `bestCandidate` | object or `null` | Yes | Highest-priority eligible variant under the authoritative automatic-equipment comparison, or `null`. |
| `bestCandidate.itemId` | integer | Yes when present | Stable base item ID. |
| `bestCandidate.variantId` | string | Yes when present | Opaque stable identifier for this owned variant. It may be used for observation correlation but not direct equipment commands. |
| `bestCandidate.tier` | integer | Yes when present | Item tier. |
| `bestCandidate.rarity` | string | Yes when present | `common`, `uncommon`, `eliteRare`, `bossRare`, or `mythicRare`. |
| `bestCandidate.enhancement` | integer | Yes when present | Enhancement-title value; `0` means none. |
| `bestCandidate.superRare` | integer | Yes when present | Super-Rare-title value; `0` means none. |

- The summary MUST use the same eligibility and priority logic as automatic equipment.
- It MUST NOT expose sold items, shop lineup mystery results, bag contents, or future item rolls.

### Party fields

Each entry in `observation.parties` represents one unlocked party. Parties MUST be ordered by party ID.

| Field | Type | Required | Description |
|-|-|-|-|
| `id` | integer | Yes | Stable party ID. |
| `name` | string | Yes | Current party name. |
| `level` | integer | Yes | Party-wide level. |
| `experience` | integer | Yes | Current party XP after normal application rules. |
| `experienceToNext` | integer or `null` | Yes | XP required for the next level, or `null` at maximum level. |
| `hp.current` | integer | Yes | Current shared party HP. |
| `hp.maximum` | integer | Yes | Computed maximum shared party HP. |
| `condition.value` | integer | Yes | Current value from -400 through 400. |
| `condition.key` | string | Yes | Current condition-band key from section 7.1.2. |
| `deityId` | string | Yes | Stable assigned deity ID. |
| `state` | object | Yes | Frozen state-machine position at observation time. |
| `automation.jewelPriority` | boolean | Yes | Whether this party is the current Jewel Priority Party. |
| `expedition` | object | Yes | Current normal-expedition strategy and availability. |
| `lootGates` | array | Yes | Currently relevant disclosed loot-gate progress. |
| `sideQuest` | object or `null` | Yes | Active side quest, or `null`. |
| `characters` | array | Yes | Six characters in combat and automatic-equipment order. |
| `latestExpedition` | object or `null` | Yes | Latest disclosed expedition summary, or `null`. |

### Party state

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `state.id` | string | Yes | State ID from section 5.1.1 | Current state. |
| `state.progressKind` | string | Yes | `none`, `continuous`, or `steps` | Progress representation. |
| `state.completedSteps` | integer or `null` | Yes | `>= 0` when present | Completed Steps for `steps`; otherwise `null`. |
| `state.totalSteps` | integer or `null` | Yes | `>= 1` when present | Initial total Steps for `steps`; otherwise `null`. |
| `state.startedAt` | integer or `null` | Yes | Unix timestamp in milliseconds | Present only for `continuous`. |
| `state.endsAt` | integer or `null` | Yes | Unix timestamp in milliseconds | Present only for `continuous`. |

- For `none`, all progress and timestamp fields MUST be `null`.
- For `steps`, Step fields MUST be integers and timestamp fields MUST be `null`.
- For `continuous`, Step fields MUST be `null`, and `startedAt` and `endsAt` MUST be present.
- Observation MUST preserve the no-spoiler timing rules for `state.explore`.

### Expedition fields

| Field | Type | Required | Description |
|-|-|-|-|
| `destinationMode` | string | Yes | `auto` or `fixed`. |
| `selectedDungeonId` | integer | Yes | Current dungeon ID. |
| `depthLimit` | string | Yes | Current `ExpeditionDepthLimit` value. |
| `difficultyOffset` | integer | Yes | Effective offset for the selected dungeon. |
| `maximumDifficultyOffset` | integer | Yes | Maximum valid offset for the selected dungeon. |
| `instantExpeditionStock` | integer | Yes | Current UI Instant Expedition charge stock. API sorties do not consume it. |
| `instantExpeditionChargeStartedAt` | integer or `null` | Yes | Frozen UI charge timer anchor, or `null` when no timer is active. |
| `normalSortieAvailable` | boolean | Yes | Whether a normal API sortie request is legal for this party now. |
| `godBattleAvailable` | boolean | Yes | Whether the separate single-run Gods Battle command is legal now. |

### Loot gates and side quest

Each `lootGates` entry contains:

| Field | Type | Required | Description |
|-|-|-|-|
| `id` | string | Yes | Stable gate identifier. |
| `kind` | string | Yes | `entering`, `uncommon`, `eliteRare`, `godBattle`, or `sideQuest`. |
| `current` | integer | Yes | Disclosed current progress. |
| `required` | integer | Yes | Required progress. |
| `satisfied` | boolean | Yes | Whether the gate is currently open. |
| `dungeonId` | integer or `null` | Yes | Related dungeon, when applicable. |
| `floor` | integer or `null` | Yes | Related disclosed floor, when applicable. |
| `room` | integer or `null` | Yes | Related room, when applicable. |

An active `sideQuest` contains stable `id`, `type`, `target`, `progress`, `rolledTier`, `assignedAt`, and `expiresAt`. It MUST NOT expose future quest-bag order or reward rolls.

### Character and equipment fields

Each character entry contains:

| Field | Type | Required | Description |
|-|-|-|-|
| `id` | integer | Yes | Stable character ID. |
| `row` | integer | Yes | Combat and automatic-equipment order from 1 through 6. |
| `isUnique` | boolean | Yes | Whether unique-character edit restrictions apply. |
| `build` | object | Yes | Current editable identity and class build. |
| `autoEquipmentMode` | integer | Yes | `0` (`OFF`), `1` (`SEMI`), or `2` (`FULL`). |
| `computed` | object | Yes | Current authoritative combat summary. |
| `equipment` | array | Yes | All currently available equipment slots in slot order. |

Each `build` object MUST use this shape:

```json
{
  "name": "Rin",
  "gender": "female",
  "raceId": "vulpinian",
  "lineageId": "sandstorm",
  "predispositionId": "inquisitive",
  "mainClassId": "wizard",
  "subClassId": "sage",
  "mimorianEnemyId": null
}
```

| Field | Type | Required | Description |
|-|-|-|-|
| `build.name` | string | Yes | Current character name. |
| `build.gender` | string | Yes | `male` or `female`. |
| `build.raceId` | string | Yes | Stable race ID. |
| `build.lineageId` | string or `null` | Yes | Stable lineage ID; `null` for a Mimorian. |
| `build.predispositionId` | string or `null` | Yes | Stable predisposition ID; `null` for a Mimorian. |
| `build.mainClassId` | string | Yes | Stable main-class ID. |
| `build.subClassId` | string | Yes | Stable sub-class ID. |
| `build.mimorianEnemyId` | integer or `null` | Yes | Selected unlocked Mimorian form; required for a Mimorian and `null` for every other race. |

- `build` MUST reflect the effective values used by character computation and battle resolution, not pending UI edit values.
- For a unique character, immutable values remain visible in `build` even though they are absent from that character's legal update constraints.
- The observation's `update_character_build` legal action MUST list the fields editable for that specific character and the currently allowed values for each ID field. For a unique character, the editable field list MUST equal exactly `["mainClassId", "subClassId"]`.
- Its constraints MUST also identify `/experimental/v1/build-options` as the authoritative preflight operation for coupled build choices.

`computed` contains raw numeric `maximumEquipmentSlots`, base stats, ranged/magical/melee attack and number of attacks, physical/magical defense, accuracy, evasion, elemental offense, elemental resistance, and effective ability IDs with levels. It MUST use the same calculation functions as battle resolution and UI status display.

Each equipment-slot entry contains `slotIndex`, `locked`, and `item`. `item` is `null` for an empty slot; otherwise it contains stable `itemId`, opaque `variantId`, category, tier, rarity, enhancement, Super-Rare value, raw item stats, attached Jewel key/rank or `null`, and optional localized `displayName`. Equipment multipliers belong in `computed`, not in raw item stats.

### Latest expedition

`latestExpedition` contains only the already disclosed summary: dungeon ID, difficulty offset, final outcome, completed and total rooms, total XP, total rewards by rarity, auto-sell count and profit, remaining and maximum HP, and completion timestamp.

- It MUST NOT include undisclosed current-exploration floors or outcomes.
- It MUST NOT include complete room logs, combat logs, enemy snapshots, or future rewards.
- Detailed logs remain governed by the existing latest-result and Diary UI rules and are outside this endpoint.

### Legal actions

`observation.legalActions` is the authoritative machine-readable list of commands accepted at `observation.revision`.

Each entry contains:

| Field | Type | Required | Description |
|-|-|-|-|
| `type` | string | Yes | Command discriminator accepted by the command or sortie endpoint. |
| `partyId` | integer or `null` | Yes | Target party when applicable. |
| `characterId` | integer or `null` | Yes | Target character when applicable. |
| `constraints` | object | Yes | Command-specific allowed values, ranges, or target IDs. |

- The list MUST include only actions legal at the current revision.
- At minimum it may contain `update_character_build`, `reorder_character`, `set_deity`, `set_auto_equipment_mode`, `toggle_equipment_lock`, `set_jewel_priority_party`, `set_expedition_destination`, `set_expedition_depth`, `set_expedition_difficulty`, `set_auto_run`, `god_battle`, and `sortie`.
- A `sortie` action's constraints MUST include `minimumCount: 1` and `maximumCount: 100`.
- A command omitted from `legalActions` MUST be rejected as `illegal_action` if submitted against the same revision.
- `legalActions` is advisory across revisions. Clients MUST still supply `expectedRevision`, and the server MUST revalidate every command.

### Snapshot consistency and side effects

- The renderer MUST construct the complete observation from one authoritative state revision under a read lock or equivalent immutable snapshot.
- Every derived value, catalog, inventory summary, and legal action MUST correspond to that same revision.
- If the revision changes before snapshot construction completes, the renderer MUST discard the partial result and retry from the new revision.
- Arrays and object-key generation MUST be deterministic so semantically unchanged observations serialize consistently.
- A successful observation response renews the inactivity timeout after the immutable snapshot is complete.
- Reading observation MUST NOT:
  - mark items, Diary entries, or notifications as seen;
  - reveal flavor or battle-log details not otherwise disclosed;
  - advance time or state-machine progress;
  - run AFK recovery or automation;
  - persist game state;
  - increment `revision`.

### Error responses

| Status | `error.code` | `retryable` | Condition |
|-|-|-|-|
| `400 Bad Request` | `invalid_request` | `false` | A query parameter or otherwise unsupported request input was supplied. |
| `401 Unauthorized` | `authentication_failed` | `false` | Bearer authentication is missing, malformed, or invalid. |
| `403 Forbidden` | `control_lease_invalid` | `false` | An active lease exists, but the lease header is missing, malformed, or does not match it. |
| `409 Conflict` | `no_active_lease` | `false` | No control lease exists. |
| `409 Conflict` | `control_lease_expired` | `false` | The matching lease expired before observation processing began. |
| `409 Conflict` | `control_releasing` | `true` | The lease is being released. |
| `409 Conflict` | `runtime_busy` | `true` | A command or sortie batch is executing; only status remains available. The active operation pins the lease. |
| `405 Method Not Allowed` | `method_not_allowed` | `false` | The path is requested with a method other than `GET`. The response MUST include `Allow: GET`. |
| `503 Service Unavailable` | `save_error` | `false` | Save-load protection from section 5.1.4 is active. |
| `503 Service Unavailable` | `runtime_unavailable` | `true` | The authoritative renderer cannot provide a complete snapshot. |

- Bearer authentication MUST be evaluated before lease state or lease-token validity.
- If no lease exists, the server returns `no_active_lease` regardless of the supplied lease token.
- If an active lease exists but the supplied lease token is missing, malformed, or different, the server returns `control_lease_invalid` without identifying its owner or expiration.
- If the matching lease expired, the server MUST complete lease-expiry cleanup before returning `control_lease_expired`.

## `POST /experimental/v1/command`

**Operation ID:** `executeExperimentalApiCommand`

**Purpose:** Apply one revision-guarded strategic command through the authoritative game engine. Configuration commands do not advance simulated time. The `god_battle` discriminator is the sole command in this endpoint that resolves an immediate expedition Cycle.

### Security and request envelope

This operation requires both bearer authentication and ownership of the active control lease.

```http
POST /experimental/v1/command
Authorization: Bearer <token>
X-BoKemo-Control-Lease: <lease-token>
Content-Type: application/json
```

```json
{
  "expectedRevision": 123,
  "command": {
    "type": "update_character_build",
    "partyId": 1,
    "characterId": 101,
    "changes": {
      "mainClassId": "wizard"
    }
  }
}
```

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `expectedRevision` | integer | Yes | `>= 0` | Revision from the most recent observation. |
| `command` | object | Yes | — | Exactly one tagged strategic command. |
| `command.type` | string | Yes | Defined command discriminator | Selects the command-specific schema. |

- Unknown properties MUST be rejected at every request-object level.
- The server MUST authenticate and verify lease ownership before comparing revisions or validating gameplay data.
- A stale `expectedRevision` MUST return `stale_revision` without executing auto-equipment, consuming randomness, saving, or changing state.

### Common command transaction

- Exactly one command discriminator is accepted per request.
- Except for `god_battle`, every command MUST complete as one atomic configuration transaction without advancing simulated time, state-machine progress, side-quest time, or charge time.
- The server MUST validate the complete request against `expectedRevision` before mutation or randomness.
- A successful command MUST:
  1. apply all command-specific effects to a staged state;
  2. recompute affected derived state;
  3. increment the game-state revision exactly once;
  4. persist the complete staged state once;
  5. commit it atomically;
  6. return the complete post-command observation at the new revision.
- If validation, computation, simulation, or persistence fails, the server MUST roll back the complete command and leave the revision unchanged.
- A valid request that would produce no effective state change returns `no_change` and MUST NOT save or increment the revision.
- Commands execute through the same authoritative validators and game functions as their corresponding UI operations. API-only normalization or fallback behavior is forbidden unless explicitly stated.
- A command operation pins the control lease until its response is prepared, according to the acquire contract. Successful completion renews the five-minute inactivity timeout.

### Common success envelope

```json
{
  "apiVersion": "experimental/v1",
  "schemaVersion": 1,
  "command": {
    "type": "set_deity",
    "status": "applied",
    "previousRevision": 123,
    "revision": 124
  },
  "effects": {},
  "observation": {}
}
```

| Field | Type | Required | Description |
|-|-|-|-|
| `apiVersion` | string | Yes | HTTP contract version. It MUST equal `experimental/v1`. |
| `schemaVersion` | integer | Yes | JSON schema version. Initial value: `1`. |
| `command.type` | string | Yes | Applied command discriminator. |
| `command.status` | string | Yes | `applied`. |
| `command.previousRevision` | integer | Yes | Revision supplied by the client. |
| `command.revision` | integer | Yes | New revision; exactly `previousRevision + 1`. |
| `effects` | object | Yes | Command-specific committed effects. |
| `observation` | object | Yes | Complete post-command observation using the new revision. |

### Command discriminator index

| `command.type` | Purpose | Advances simulated time | Triggers automatic equipment |
|-|-|-|-|
| `update_character_build` | Change one character's build. | No | Yes, for that character |
| `reorder_character` | Move one member to another combat row. | No | No |
| `set_deity` | Assign a deity to one party. | No | No |
| `set_auto_equipment_mode` | Set one character's automation mode. | No | No |
| `toggle_equipment_lock` | Toggle one equipped item's automatic-equipment lock. | No | No |
| `set_jewel_priority_party` | Select the global Jewel Priority Party or manual mode. | No | No |
| `set_expedition_destination` | Set one party's automatic or fixed destination. | No | No |
| `set_expedition_depth` | Set one party's exploration depth limit. | No | No |
| `set_expedition_difficulty` | Set the selected party-dungeon difficulty offset. | No | No |
| `set_auto_run` | Set the global normal Auto-Run mode. | No | No |
| `god_battle` | Resolve one available Gods Battle Cycle. | Yes | No |

## Command schemas

### `update_character_build`

Updates one character's editable build fields and immediately resolves the resulting equipment consequences and configured automatic-equipment behavior.

#### Command fields

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `command.type` | string | Yes | `update_character_build` | Command discriminator. |
| `command.partyId` | integer | Yes | Unlocked party ID | Party containing the character. |
| `command.characterId` | integer | Yes | Character belonging to `partyId` | Character to update. |
| `command.changes` | object | Yes | At least one supported property | Partial build update merged atomically with the current build. |
| `changes.name` | string | No | Same validation as section 8.2.3 | Explicit new name. |
| `changes.gender` | string | No | `male` or `female` | New gender. |
| `changes.raceId` | string | No | Currently selectable and legal race ID | New race. |
| `changes.lineageId` | string or `null` | No | Currently selectable lineage ID or `null` | New lineage for a non-Mimorian; MUST be `null` for a Mimorian. |
| `changes.predispositionId` | string or `null` | No | Currently selectable predisposition ID or `null` | New predisposition for a non-Mimorian; MUST be `null` for a Mimorian. |
| `changes.mainClassId` | string | No | Currently selectable class ID | New main class. |
| `changes.subClassId` | string | No | Currently selectable class ID | New sub class. |
| `changes.mimorianEnemyId` | integer or `null` | No | Unlocked, unassigned enemy-form ID or `null` | Required for a Mimorian and MUST be `null` for a non-Mimorian. |

- `changes` is a partial update. Properties not supplied retain their current effective values, except for specification-defined dependent changes such as default naming after a race change.
- `changes` MUST contain at least one property whose requested value differs from the current effective build. Otherwise return `no_change`.
- A unique character may change only `mainClassId` and `subClassId`; supplying any other property returns `immutable_character_field`.
- Unique-character immutability MUST be checked against the properties present in `changes`, even if a prohibited property repeats its current value. A caller cannot include `name`, `gender`, `raceId`, `lineageId`, `predispositionId`, or `mimorianEnemyId` in a unique-character request.
- The merged build MUST satisfy the gender/race uniqueness rules in section 8.2.3.
- Mimorian builds require `gender: female`, an unlocked enemy form not assigned to another Mimorian, and no effective lineage or predisposition. The response observation represents both as `null`.
- A non-Mimorian build requires valid lineage and predisposition values and has `mimorianEnemyId: null`.
- If `raceId` changes and `name` is absent, assign a localized default name using the normal section 8.2.3 rules. If `name` is present, the explicit valid name takes precedence.
- All validation MUST complete before equipment is removed, randomness is consumed, notifications are emitted, or state is mutated.

### Build update and automatic-equipment order

After validation, the renderer MUST execute the update atomically in this order:

1. Apply the merged build to a staged copy of the character.
2. Recalculate base stats, abilities, equipment permissions, equipment-slot count, maximum party HP, and all other derived combat values.
3. Preserve compatible equipment in its existing slots when possible.
4. Compact equipped items into surviving slots, then return overflow or newly incompatible items to owned inventory according to section 8.2.3. Attached Jewels on returned items return to Jewel inventory according to the normal equipment-removal rules.
5. Immediately trigger automatic equipment for this character using its existing `autoEquipmentMode`:
   - `OFF` (`0`): do not select or upgrade equipment after mandatory compatibility and slot cleanup. If this party is the Jewel Priority Party, apply only the normally permitted automatic-Jewel behavior.
   - `SEMI` (`1`): retain compatible equipped categories and locks, upgrade existing equipment under section 7.1.1, and do not fill empty slots or replace categories.
   - `FULL` (`2`): run the complete remove, fill, and upgrade flow in section 7.1.1 while preserving locked and Super-Rare exceptions.
6. If this is the Jewel Priority Party, run automatic Jewel assignment after equipment selection according to section 7.1.3.
7. Recalculate the final character and party combat values and synchronize current HP after the maximum-HP change using the normal equipment-change rule.
8. Generate the same equipment and build notifications that the corresponding UI operations generate.
9. Commit the staged build, inventory, Jewels, equipment, HP, notifications, and derived state as one transaction.
10. Increment the game-state revision exactly once and persist the committed state.

- Automatic equipment is triggered immediately even though its ordinary Cycle timing has not occurred.
- The automatic-equipment trigger applies only to the updated character. It MUST NOT process other characters or parties.
- Equipment selection MUST use the inventory produced after mandatory overflow and incompatibility removals, so returned items may participate in the same automatic-equipment run.
- Locked items are preserved only when they remain legal and fit within surviving slots. A lock cannot override class/race equipment legality or the maximum slot count.
- The command MUST use the same comparison, Memory C/D, duplicate bonus, category balance, Jewel Priority, inventory stacking, and auto-sell rules as the existing automation implementation. No API-only equipment policy exists.
- If any build, equipment, inventory, Jewel, HP, notification, persistence, or automatic-equipment step fails, the entire command MUST roll back and the revision MUST remain unchanged.

### Success response

**Status:** `200 OK`

```json
{
  "apiVersion": "experimental/v1",
  "schemaVersion": 1,
  "command": {
    "type": "update_character_build",
    "status": "applied",
    "previousRevision": 123,
    "revision": 124
  },
  "effects": {
    "changedFields": ["mainClassId"],
    "defaultNameAssigned": false,
    "autoEquipment": {
      "triggered": true,
      "mode": 2,
      "unequippedCount": 1,
      "equippedCount": 2,
      "upgradedCount": 1,
      "jewelAssignmentCount": 1
    },
    "hp": {
      "previousCurrent": 3800,
      "previousMaximum": 4200,
      "current": 3900,
      "maximum": 4300
    }
  },
  "observation": {}
}
```

| Field | Type | Required | Description |
|-|-|-|-|
| `command.type` | string | Yes | Applied command discriminator. |
| `command.status` | string | Yes | `applied`. |
| `command.previousRevision` | integer | Yes | Revision supplied by the client. |
| `command.revision` | integer | Yes | New revision; exactly `previousRevision + 1`. |
| `effects.changedFields` | string array | Yes | Effective build properties changed, including dependent changes such as a default name. |
| `effects.defaultNameAssigned` | boolean | Yes | Whether race-change naming selected a default name. |
| `effects.autoEquipment` | object | Yes | Immediate automatic-equipment summary. |
| `effects.hp` | object | Yes | Raw current and maximum HP before and after the transaction. |
| `observation` | object | Yes | Complete post-command observation using the observation schema and new revision. |

The `autoEquipment` counts summarize committed slot or Jewel changes. They do not expose rejected candidates, bag state, or hidden comparison internals.

### Command errors

In addition to the common authentication, lease, releasing, busy, method, save, and runtime errors defined by the preceding endpoints, `update_character_build` may return:

| Status | `error.code` | `retryable` | Condition |
|-|-|-|-|
| `400 Bad Request` | `invalid_request` | `false` | The command envelope, discriminator, field type, or property set is invalid. |
| `409 Conflict` | `stale_revision` | `true` | `expectedRevision` does not equal the authoritative revision. `error.details` MUST include `currentRevision`. |
| `409 Conflict` | `no_change` | `false` | The requested build is identical to the effective build. |
| `422 Unprocessable Content` | `illegal_action` | `false` | `update_character_build` was not legal for this target at the supplied revision. |
| `422 Unprocessable Content` | `immutable_character_field` | `false` | The request attempts to change a unique character's immutable property. |
| `422 Unprocessable Content` | `invalid_build` | `false` | The merged race, gender, lineage, predisposition, class, or Mimorian combination violates character rules. |
| `422 Unprocessable Content` | `mimorian_form_unavailable` | `false` | The form is locked, nonexistent, or assigned to another Mimorian. |
| `500 Internal Server Error` | `command_failed` | `true` | Staged build or automatic-equipment resolution failed and was rolled back. |
| `503 Service Unavailable` | `persistence_failed` | `true` | The complete staged transaction could not be persisted and was rolled back. |

- Validation errors MUST include `error.details.field` when one request property is responsible.
- `stale_revision` MUST be checked before gameplay legality so a client cannot use stale commands to probe current hidden state.
- Error responses MUST NOT include candidate equipment rankings, random default-name candidates, hidden inventory state, or partial staged results.

### `reorder_character`

```json
{
  "type": "reorder_character",
  "partyId": 1,
  "characterId": 101,
  "targetRow": 3
}
```

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `partyId` | integer | Yes | Unlocked party ID | Target party. |
| `characterId` | integer | Yes | Member of `partyId` | Character to move. |
| `targetRow` | integer | Yes | 1 through 6 | New combat and automatic-equipment row. |

- Move the character to `targetRow` and shift intervening characters by one row while preserving their relative order.
- Character IDs, builds, equipment, and HP remain unchanged.
- Reordering MUST NOT trigger automatic equipment.
- Moving a character to its current row returns `no_change`.
- `effects` contains `previousRow`, `targetRow`, and `shiftedCharacterIds` in their new row order.

### `set_deity`

```json
{
  "type": "set_deity",
  "partyId": 1,
  "deityId": "restoration"
}
```

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `partyId` | integer | Yes | Unlocked party ID | Party receiving the deity. |
| `deityId` | string | Yes | ID in the observation's assignable deity catalog | New deity. |

- The deity must be unlocked and assignable.
- A deity other than `none` cannot be assigned to more than one party. `none` may be assigned to multiple parties.
- Apply the deity, recalculate all affected character and party derived values, and synchronize current HP through the normal maximum-HP-change rule.
- Deity assignment MUST NOT trigger automatic equipment, donation, prayer, or a Gods Battle.
- Assigning the current deity returns `no_change`.
- `effects` contains `previousDeityId`, `deityId`, and raw previous/final current and maximum HP.

### `set_auto_equipment_mode`

```json
{
  "type": "set_auto_equipment_mode",
  "partyId": 1,
  "characterId": 101,
  "mode": 2
}
```

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `partyId` | integer | Yes | Unlocked party ID | Party containing the character. |
| `characterId` | integer | Yes | Member of `partyId` | Character whose mode changes. |
| `mode` | integer | Yes | `0`, `1`, or `2` | `OFF`, `SEMI`, or `FULL`. |

- This command changes configuration only. It MUST NOT immediately remove, fill, replace, upgrade, lock, unlock, or attach equipment or Jewels.
- The new mode applies at the next specification-defined automatic-equipment trigger, including a later successful `update_character_build` for this character.
- Existing item locks remain stored when leaving `FULL`, although their UI controls and automatic-equipment effect apply only as specified in section 8.2.4.
- Setting the current mode returns `no_change`.
- `effects` contains `previousMode`, `mode`, and `autoEquipmentTriggered: false`.

### `toggle_equipment_lock`

```json
{
  "type": "toggle_equipment_lock",
  "partyId": 1,
  "characterId": 101,
  "slotIndex": 0
}
```

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `partyId` | integer | Yes | Unlocked party ID | Party containing the character. |
| `characterId` | integer | Yes | Member of `partyId` | Equipment owner. |
| `slotIndex` | integer | Yes | Zero-based available slot index | Occupied equipment slot to toggle. |

- The character's automatic-equipment mode MUST be `FULL`.
- The slot must exist and contain an item at `expectedRevision`.
- Toggle only that item's `locked` state. Do not identify the item by display name or array position alone; the server validates the observed slot's current `variantId` through the revision guard.
- This command MUST NOT trigger automatic equipment or change item/Jewel ownership.
- `effects` contains `slotIndex`, `variantId`, `previousLocked`, and `locked`.

### `set_jewel_priority_party`

```json
{
  "type": "set_jewel_priority_party",
  "partyId": 2
}
```

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `partyId` | integer or `null` | Yes | Unlocked party ID or `null` | Priority party; `null` selects manual Jewel assignment. |

- This is a global setting. At most one party can be the Jewel Priority Party.
- Changing priority MUST NOT immediately attach, detach, or move Jewels. It applies at the next specification-defined automatic-equipment trigger.
- Setting the current value returns `no_change`.
- `effects` contains `previousPartyId`, `partyId`, and `autoJewelEquipmentTriggered: false`.

### `set_expedition_destination`

Fixed destination example:

```json
{
  "type": "set_expedition_destination",
  "partyId": 1,
  "mode": "fixed",
  "dungeonId": 3
}
```

Automatic destination example:

```json
{
  "type": "set_expedition_destination",
  "partyId": 1,
  "mode": "auto"
}
```

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `partyId` | integer | Yes | Unlocked party ID | Party to configure. |
| `mode` | string | Yes | `auto` or `fixed` | Destination-selection policy. |
| `dungeonId` | integer | Required for `fixed`; forbidden for `auto` | Dungeon currently selectable by the party | Fixed destination. |

- `fixed` immediately selects `dungeonId` and loads that party-dungeon pair's persisted difficulty offset, defaulting to 0 when none exists.
- `auto` changes only destination mode. The current selected dungeon remains visible until authoritative Auto progress logic selects a destination at its normal timing.
- The command MUST NOT start, stop, or resolve an expedition.
- If the effective mode and selected destination would not change, return `no_change`.
- `effects` contains previous/final mode, previous/final selected dungeon ID, and previous/final effective difficulty offset.

### `set_expedition_depth`

```json
{
  "type": "set_expedition_depth",
  "partyId": 1,
  "depthLimit": "3f-4"
}
```

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `partyId` | integer | Yes | Unlocked party ID | Party to configure. |
| `depthLimit` | string | Yes | `1f-3`, `1f-4`, `2f-3`, `2f-4`, `3f-3`, `3f-4`, `4f-3`, `4f-4`, `5f-3`, `5f-4`, `beforeBoss`, or `all` | New exploration depth. |

- The value affects later normal and API sorties. It MUST NOT truncate or resolve frozen current exploration when the command is applied.
- Setting the current value returns `no_change`.
- `effects` contains `previousDepthLimit` and `depthLimit`.

### `set_expedition_difficulty`

```json
{
  "type": "set_expedition_difficulty",
  "partyId": 1,
  "difficultyOffset": 12
}
```

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `partyId` | integer | Yes | Unlocked party ID | Party to configure. |
| `difficultyOffset` | integer | Yes | Even integer from 0 through the observed `maximumDifficultyOffset` | Offset for the party's currently selected dungeon. |

- Difficulty configuration is legal only after this party has defeated the selected dungeon's Boss at least once, as specified in section 8.3.
- Persist the value for the current party-dungeon pair without modifying other parties or dungeons.
- The command MUST reject odd, negative, over-maximum, or normalized/clamped input rather than silently changing it.
- It MUST NOT change enemies already present in a frozen in-progress exploration; it applies to later expedition resolution.
- Setting the current pair's stored value returns `no_change`.
- `effects` contains `dungeonId`, `previousDifficultyOffset`, `difficultyOffset`, `additionalItemChanceTickets`, and `additionalSuperRareChanceTickets`.

### `set_auto_run`

```json
{
  "type": "set_auto_run",
  "enabled": true
}
```

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `enabled` | boolean | Yes | — | Global normal Auto-Run setting. |

- Auto-Run is global and applies to all unlocked parties.
- While API control is active, changing this setting MUST NOT resume progression or transition a party immediately; progression remains frozen.
- After control release, every party follows the state transitions for the final Auto-Run value in section 5.1.1.
- The setting does not control API batch sorties and does not automatically trigger Gods Battles during API-controlled time.
- Setting the current value returns `no_change`.
- `effects` contains `previousEnabled` and `enabled`.

### `god_battle`

```json
{
  "type": "god_battle",
  "partyId": 1
}
```

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `partyId` | integer | Yes | Unlocked party ID | Party that challenges the God associated with its selected dungeon. |

- This command is legal only when all normal UI Gods Battle requirements are satisfied at `expectedRevision`, including:
  - the selected dungeon and its Boss completion record are valid;
  - the Gods Battle loot gate is ready or remains retryable after a previous defeat;
  - global Auto-Run is `false`;
  - the party is not already moving to or resolving a Gods Battle;
  - party current and maximum HP are greater than 0;
  - at least one normal Instant Expedition charge is available.
- `god_battle` is not an unlimited-charge API sortie. It MUST consume exactly one UI Instant Expedition stock and update its normal charge timer according to sections 5.1.1 and 8.3.
- If a normal exploration is frozen in progress, resolve and finalize it first using the same immediate-sortie rule as the UI, then process the additional Gods Battle Cycle.
- Before the Gods Battle begins, finalize pending expedition rewards, apply emergency pending-profit handling, cancel the active side quest, and emit the corresponding notifications under the normal UI rules.
- Fully heal the party at the specified immediate-sortie timing, resolve movement, exploration, God replacement, battle, rewards, return, Diary handling, gate reset on victory, and retry availability on defeat through the authoritative engine.
- Finish at the beginning of `state.rest` and preserve all resulting HP, rewards, XP, donations, savings, unlocks, conditions, logs, and side effects.
- Unlike configuration commands, advance `simulatedAt` by the complete immediately simulated duration and apply time-dependent effects in chronological order.
- The operation remains one atomic command transaction: consume the charge, resolve all required expeditions, persist once, and increment revision exactly once. Any internal or persistence failure rolls back the charge and every simulated effect.
- `effects` contains:
  - `partyId`, `dungeonId`, and challenged `godId`;
  - charge stock before and after;
  - whether a pre-existing exploration was resolved;
  - whether a side quest was cancelled;
  - simulated start/end timestamps;
  - final Gods Battle outcome;
  - concise expedition, reward, XP, Gold, Jewel, Prana, gate, unlock, HP, and Diary summaries.
- The response MUST NOT include complete room or combat logs by default.

### Shared command errors

Unless a discriminator defines a more specific error, `/command` uses:

| Status | `error.code` | `retryable` | Condition |
|-|-|-|-|
| `400 Bad Request` | `invalid_request` | `false` | Malformed JSON, an unknown property, invalid type, or invalid conditional field combination. |
| `400 Bad Request` | `unsupported_command` | `false` | `command.type` is not a defined discriminator. |
| `401 Unauthorized` | `authentication_failed` | `false` | Bearer authentication is missing, malformed, or invalid. |
| `403 Forbidden` | `control_lease_invalid` | `false` | An active lease exists, but the lease header is missing, malformed, or does not match it. |
| `404 Not Found` | `party_not_found` | `false` | Target party is not unlocked or does not exist. |
| `404 Not Found` | `character_not_found` | `false` | Target character does not belong to the specified party. |
| `404 Not Found` | `equipment_slot_not_found` | `false` | Target slot does not exist or is empty. |
| `409 Conflict` | `stale_revision` | `true` | `expectedRevision` differs from the authoritative revision. `error.details.currentRevision` is required. |
| `409 Conflict` | `no_change` | `false` | The valid command would produce no effective change. |
| `409 Conflict` | `no_active_lease` | `false` | No control lease exists. |
| `409 Conflict` | `control_lease_expired` | `false` | The matching lease expired before command processing began. |
| `409 Conflict` | `control_releasing` | `true` | The lease is being released. |
| `409 Conflict` | `runtime_busy` | `true` | Another command or sortie batch is executing. |
| `405 Method Not Allowed` | `method_not_allowed` | `false` | The path is requested with a method other than `POST`. The response MUST include `Allow: POST`. |
| `422 Unprocessable Content` | `illegal_action` | `false` | The structurally valid command is not legal in the current game state. |
| `422 Unprocessable Content` | `deity_unavailable` | `false` | The deity is locked or assigned to another party. |
| `422 Unprocessable Content` | `equipment_lock_unavailable` | `false` | The character is not in `FULL` mode or the item cannot be locked. |
| `422 Unprocessable Content` | `difficulty_unavailable` | `false` | Boss completion has not unlocked difficulty adjustment. |
| `422 Unprocessable Content` | `god_battle_unavailable` | `false` | A normal Gods Battle requirement is not satisfied. |
| `422 Unprocessable Content` | `instant_charge_insufficient` | `false` | No UI Instant Expedition charge is available for `god_battle`. Charge time is frozen while API control remains active. |
| `500 Internal Server Error` | `command_failed` | `true` | Authoritative command execution failed and rolled back. |
| `503 Service Unavailable` | `persistence_failed` | `true` | The staged command could not be persisted and rolled back. |
| `503 Service Unavailable` | `save_error` | `false` | Save-load protection from section 5.1.4 is active. |
| `503 Service Unavailable` | `runtime_unavailable` | `true` | The authoritative renderer cannot execute the command. |

### Command validation precedence

1. Parse the HTTP request sufficiently to identify whether it is structurally processable.
2. Authenticate the bearer token.
3. Verify active lease existence, expiry, and ownership.
4. Reject releasing or busy control state.
5. Validate the common command envelope and discriminator schema.
6. Compare `expectedRevision` with the authoritative revision.
7. Resolve target IDs.
8. Validate command-specific game legality.
9. Stage, compute, persist, and commit the command.

- Revision comparison occurs before target and gameplay validation so stale requests cannot probe current state.
- Error details MAY identify invalid fields and allowed public enum values but MUST NOT reveal hidden state, bag order, candidate rankings, undisclosed outcomes, or partial transaction data.

## `POST /experimental/v1/sortie`

**Operation ID:** `executeExperimentalApiSorties`

**Purpose:** Resolve 1 to 100 complete normal expedition Cycles synchronously for one party without consuming, recharging, or otherwise changing the UI Instant Expedition battery. This is the primary progression operation for AI play.

### Security

This operation requires both:

```http
Authorization: Bearer <token>
X-BoKemo-Control-Lease: <lease-token>
```

- The bearer token authenticates API access. The control-lease token proves ownership of the active lease.
- The complete request pins the lease until its response is prepared. Successful completion renews the five-minute inactivity timeout.
- Neither credential may appear in responses, persisted state, Diary records, notifications, or logs.

### Request

```http
POST /experimental/v1/sortie
Authorization: Bearer <token>
X-BoKemo-Control-Lease: <lease-token>
Content-Type: application/json
```

```json
{
  "expectedRevision": 124,
  "partyId": 1,
  "count": 10
}
```

| Field | Type | Required | Constraints | Description |
|-|-|-|-|-|
| `expectedRevision` | integer | Yes | `>= 0` | Revision from the most recent observation or successful mutation. |
| `partyId` | integer | Yes | Unlocked party ID | Party that performs every requested sortie. |
| `count` | integer | Yes | 1 through 100 inclusive | Exact number of new normal expedition Cycles to resolve. |

- Unknown properties MUST be rejected.
- The request MUST NOT accept a dungeon override, Gods Battle flag, charge option, random seed, debug mode, time scale, or partial-result option.
- The selected dungeon, depth limit, difficulty offset, deity, character order/builds, equipment, automatic-equipment settings, and global Auto-Run value are read from the authoritative state at `expectedRevision`.
- The selected dungeon at batch acceptance is the destination for all requested Cycles. `destinationMode: auto` MUST NOT silently switch the batch to another dungeon between Cycles.

### Acceptance validation

Before consuming randomness or changing staged state, the server MUST validate:

- bearer authentication and lease ownership;
- runtime availability and absence of another serialized mutation;
- exact revision equality;
- `partyId` existence and unlock status;
- integer `count` range;
- selected dungeon existence and availability to the party;
- normal expedition data, loot-gate data, enemy data, and item-drop data required to simulate the complete batch;
- a valid party with computed maximum HP greater than 0.

- Current HP equal to 0 is not an acceptance failure. The first requested Cycle performs the normal rest/recovery required before departure.
- An unmet loot gate is not an acceptance failure. Its normal turn-back result counts as a completed requested sortie.
- Insufficient Instant Expedition stock is not an acceptance failure because this endpoint has unlimited API charge.
- Gods Battle readiness is ignored. Every requested Cycle is a normal expedition, and the API batch MUST NOT automatically engage a God even when Auto progress logic or party condition would normally do so.
- If any acceptance check fails, reject the request before staging, random draws, simulation, notifications, or persistence.

### Pre-existing partial-state settlement

API control can be acquired while a party is partway through a normal Cycle. Before requested Cycle 1 begins:

- If the party is already at the beginning of `state.rest` or is `state.idle`, no settlement is required.
- Otherwise, resolve the frozen current Cycle from its preserved partial position through the beginning of its next `state.rest` using normal chronological rules.
- Settlement preserves every result and side effect of the already-started Cycle but does not count toward requested or completed sortie count.
- If the frozen state contains an already-started Gods Battle, settlement may finish that existing battle. It MUST NOT start another Gods Battle.
- The response reports settlement separately as `prelude`; it is never merged into a requested run summary.
- Settlement and the requested batch remain one atomic transaction. A failure anywhere rolls back settlement as well as every requested Cycle.

### Requested Cycle behavior

After settlement, each requested sortie begins at `state.rest` and ends at the beginning of the next `state.rest`.

Each Cycle MUST resolve the authoritative sequence and applicable optional/skipped states:

1. Rest and recover until normal departure requirements are satisfied.
2. Resolve pending reward finalization and `state.sell` when applicable.
3. Resolve `state.free_action` spending.
4. Draw and resolve optional sleepiness and `state.sound_sleep`.
5. Trigger automatic equipment at its normal Cycle timing for all eligible characters and the Jewel Priority Party.
6. Resolve `state.pray`, donation, embezzlement, and savings.
7. Resolve `state.move`.
8. Fully restore HP at the beginning of `state.explore` as specified in section 5.1.1.
9. Resolve disclosed loot gates, every visited room and battle, rewards, XP, HP persistence, retreat rules, and normal expedition outcome through the configured depth limit.
10. Resolve `state.return`, side-quest assignment/progress/completion/expiration, condition changes, Diary and notification triggers, and progression unlocks.
11. End at the beginning of the next `state.rest`.

- Simulate every Step duration and time-dependent effect immediately in chronological order. The client does not wait for real time.
- `simulatedAt` advances by the actual simulated duration of settlement and every requested Cycle, including modifiers and skipped states.
- Bag randomization and all other authoritative randomness are consumed sequentially. Results from one Cycle affect all later Cycles.
- Inventory, equipment, Jewels, Gold, Prana, XP, HP, condition, side quests, loot gates, boss records, Gods Battle readiness, party unlocks, Diary entries, and other results carry forward between Cycles.
- A `Clear`, `Turned_Back`, `Draw_Retreat`, `Wounded_Retreat`, or `Defeat` result counts as one completed requested sortie.
- Defeat MUST NOT truncate the batch. The following requested Cycle begins with normal rest/recovery and continues the sequence.
- Once accepted, exactly `count` requested Cycles MUST complete. A gameplay outcome cannot stop the batch early.
- Global Auto-Run configuration does not add Cycles to the requested count and does not start background progression during the request.

### Unlimited API charge

The server MUST snapshot the party's complete Instant Expedition charge state before settlement and restore that exact charge state after all simulated time has completed.

- API batch sorties MUST NOT:
  - require positive `instantExpeditionStock`;
  - consume or add stock;
  - start, stop, reset, accelerate, delay, or complete its recharge timer;
  - move `instantExpeditionChargeStartedAt`;
  - grant unlimited charge to the UI or `god_battle` command.
- Charge state includes stock, maximum stock, recharge anchor, accrued partial recharge progress, and any environment-specific charge metadata.
- Simulation time inside the batch does not recharge UI stock.
- The response MUST include charge-before and charge-after summaries so clients can verify they are identical.
- Any charge-state difference is an internal failure and MUST roll back the complete transaction.

### Atomicity, revision, and persistence

- The server MUST clone or transactionally stage every mutable value needed by settlement and up to 100 Cycles, including random bags and runtime timing state.
- No UI mutation, command, second sortie batch, control release, AFK recovery, or background progression may interleave with the operation.
- Status remains available through the main process while the renderer is busy; the active operation pins the lease.
- Intermediate results MUST NOT be saved, published as observations, sent to the Party Progress pane, or exposed through API responses.
- After every requested Cycle completes, validate state invariants, charge equality, requested/completed equality, and response totals against staged results.
- On success, increment revision exactly once, persist the complete staged state once, commit it, publish the final display snapshot, and return the response.
- On simulation, invariant, response-construction, or persistence failure, restore the exact pre-request state, including bags, timestamps, logs, notifications, charge state, and revision.
- Client disconnection does not cancel an accepted batch. The server MUST finish and commit or roll back the atomic operation; the client can inspect status and observation afterward.

### Success response

**Status:** `200 OK`

The following non-normative example abbreviates `runs` for readability. A conforming response contains exactly `completedCount` per-run entries.

```json
{
  "apiVersion": "experimental/v1",
  "schemaVersion": 1,
  "sortie": {
    "partyId": 1,
    "dungeonId": 3,
    "requestedCount": 10,
    "completedCount": 10,
    "previousRevision": 124,
    "revision": 125,
    "simulatedStartAt": 1786345200000,
    "simulatedEndAt": 1786363200000
  },
  "prelude": null,
  "outcomes": {
    "Clear": 6,
    "Turned_Back": 1,
    "Draw_Retreat": 1,
    "Wounded_Retreat": 1,
    "Defeat": 1
  },
  "totals": {
    "experienceGained": 3200,
    "goldGained": 900,
    "goldDonated": 120,
    "goldSaved": 780,
    "itemsObtained": 18,
    "itemsByRarity": {
      "common": 10,
      "uncommon": 5,
      "eliteRare": 2,
      "bossRare": 1,
      "mythicRare": 0
    },
    "autoSoldItems": 4,
    "autoSellGold": 240,
    "jewelsGained": 1,
    "pranaGained": 0
  },
  "charge": {
    "before": {
      "stock": 2,
      "chargeStartedAt": 1786340000000
    },
    "after": {
      "stock": 2,
      "chargeStartedAt": 1786340000000
    }
  },
  "sideQuests": {
    "assigned": 1,
    "completed": 1,
    "cancelled": 0,
    "expired": 0
  },
  "unlocks": {
    "bossDungeonIds": [3],
    "godBattleDungeonIds": [3],
    "partyIds": [2],
    "deityIds": [],
    "otherIds": []
  },
  "runs": [],
  "observation": {}
}
```

### Response fields

| Field | Type | Required | Description |
|-|-|-|-|
| `apiVersion` | string | Yes | HTTP contract version. It MUST equal `experimental/v1`. |
| `schemaVersion` | integer | Yes | JSON schema version. Initial value: `1`. |
| `sortie.partyId` | integer | Yes | Party that performed the batch. |
| `sortie.dungeonId` | integer | Yes | Normal dungeon fixed for the accepted batch. |
| `sortie.requestedCount` | integer | Yes | Accepted request count. |
| `sortie.completedCount` | integer | Yes | Must equal `requestedCount`. |
| `sortie.previousRevision` | integer | Yes | Accepted `expectedRevision`. |
| `sortie.revision` | integer | Yes | New revision; exactly `previousRevision + 1`. |
| `sortie.simulatedStartAt` | integer | Yes | In-game timestamp before optional settlement. |
| `sortie.simulatedEndAt` | integer | Yes | In-game timestamp after the final requested Cycle. |
| `prelude` | object or `null` | Yes | Concise settlement summary, or `null` when no settlement occurred. |
| `outcomes` | object | Yes | Counts for requested Cycles only; values must sum to `completedCount`. |
| `totals` | object | Yes | Aggregate economic and reward deltas from requested Cycles only. Prelude deltas are reported inside `prelude`. |
| `charge` | object | Yes | Verifiable identical before/after UI charge summaries. |
| `sideQuests` | object | Yes | Requested-Cycle side-quest event counts. |
| `unlocks` | object | Yes | Newly unlocked stable IDs from requested Cycles. |
| `runs` | array | Yes | Exactly one concise summary per requested Cycle in execution order. |
| `observation` | object | Yes | Complete post-batch observation at the new revision. |

- `totals.itemsObtained` counts all generated item rewards before auto-selling; `totals.autoSoldItems` is the subset automatically sold.
- `totals.jewelsGained` counts Jewel rewards acquired regardless of whether later automatic Jewel assignment equips them.
- `totals.goldGained` is the net increase in the shared wallet. Donation, savings, and auto-sell fields are explanatory components and MUST NOT be added to it again by clients.

### Prelude summary

When present, `prelude` contains simulated start/end timestamps, starting state, final outcome when an expedition was settled, XP and resource deltas, reward counts, side-quest events, unlocks, and ending HP. It MUST identify whether an already-started Gods Battle was completed. It MUST NOT affect requested counts, `outcomes`, `totals`, or `runs`.

### Per-run summary

Each `runs` entry contains:

| Field | Type | Required | Description |
|-|-|-|-|
| `index` | integer | Yes | One-based requested Cycle index. |
| `dungeonId` | integer | Yes | Dungeon resolved in this Cycle. |
| `simulatedStartAt` | integer | Yes | Cycle start timestamp. |
| `simulatedEndAt` | integer | Yes | Cycle end timestamp. |
| `outcome` | string | Yes | `Clear`, `Turned_Back`, `Draw_Retreat`, `Wounded_Retreat`, or `Defeat`. |
| `completedRooms` | integer | Yes | Rooms resolved during exploration. |
| `totalRooms` | integer | Yes | Rooms in the configured complete expedition. |
| `latestDisclosedFloor` | integer or `null` | Yes | Latest floor permitted by disclosure rules. |
| `experienceGained` | integer | Yes | XP applied for this Cycle. |
| `goldGained` | integer | Yes | Net Gold added to the shared wallet during this Cycle. |
| `goldDonated` | integer | Yes | Gold donated during this Cycle. |
| `goldSaved` | integer | Yes | Gold moved to the wallet as savings. |
| `itemsByRarity` | object | Yes | Obtained item counts by rarity. |
| `autoSoldItems` | integer | Yes | Auto-sold item count. |
| `autoSellGold` | integer | Yes | Gold produced by auto-selling. |
| `jewelsGained` | integer | Yes | Jewel rewards obtained. |
| `pranaGained` | integer | Yes | Prana gained. |
| `sideQuestEvents` | string array | Yes | `assigned`, `completed`, `cancelled`, and/or `expired` in occurrence order. |
| `unlockedIds` | string array | Yes | Stable prefixed IDs unlocked by this Cycle. |
| `endingHp.current` | integer | Yes | Party HP at Cycle end. |
| `endingHp.maximum` | integer | Yes | Maximum party HP at Cycle end. |

- `runs` MUST have exactly `completedCount` entries with consecutive indexes.
- Per-run and aggregate values MUST reconcile exactly.
- Item names, complete item objects, enemy identities beyond normal disclosure, room logs, combat logs, random draws, and bag state are excluded.
- Existing latest-result and Diary retention still process normally in staged game state; the response does not override their limits.

### Error responses

| Status | `error.code` | `retryable` | Condition |
|-|-|-|-|
| `400 Bad Request` | `invalid_request` | `false` | Malformed JSON, an unknown property, non-integer count, or count outside 1 through 100. |
| `401 Unauthorized` | `authentication_failed` | `false` | Bearer authentication is missing, malformed, or invalid. |
| `403 Forbidden` | `control_lease_invalid` | `false` | An active lease exists, but the lease header is missing, malformed, or does not match it. |
| `404 Not Found` | `party_not_found` | `false` | `partyId` does not identify an unlocked party. |
| `409 Conflict` | `stale_revision` | `true` | `expectedRevision` differs from the authoritative revision. `error.details.currentRevision` is required. |
| `409 Conflict` | `no_active_lease` | `false` | No control lease exists. |
| `409 Conflict` | `control_lease_expired` | `false` | The matching lease expired before acceptance. |
| `409 Conflict` | `control_releasing` | `true` | The lease is being released. |
| `409 Conflict` | `runtime_busy` | `true` | Another command or sortie batch is executing. |
| `405 Method Not Allowed` | `method_not_allowed` | `false` | The path is requested with a method other than `POST`. The response MUST include `Allow: POST`. |
| `422 Unprocessable Content` | `normal_sortie_unavailable` | `false` | The selected normal dungeon is locked or unavailable to the party. |
| `422 Unprocessable Content` | `invalid_party` | `false` | The party cannot produce a valid positive maximum HP or another required computed value. |
| `500 Internal Server Error` | `sortie_failed` | `true` | Required master data, settlement, simulation, invariant validation, or response reconciliation failed and rolled back. |
| `503 Service Unavailable` | `persistence_failed` | `true` | The complete staged batch could not be persisted and rolled back. |
| `503 Service Unavailable` | `save_error` | `false` | Save-load protection from section 5.1.4 is active. |
| `503 Service Unavailable` | `runtime_unavailable` | `true` | The authoritative renderer cannot execute the batch. |

### Validation precedence

1. Parse the request sufficiently to determine whether it is structurally processable.
2. Authenticate the bearer token.
3. Verify active lease existence, expiry, and ownership.
4. Reject releasing or busy control state.
5. Validate the request schema and count.
6. Compare `expectedRevision` with the authoritative revision.
7. Resolve `partyId` and validate the selected normal expedition.
8. Stage settlement and all requested Cycles.
9. Validate final invariants and response reconciliation.
10. Persist and commit atomically.

- Revision comparison occurs before party and expedition validation so stale requests cannot probe current state.
- Errors MUST NOT return partial run results, random state, candidate enemies or items, undisclosed outcomes, or staged resource values.
