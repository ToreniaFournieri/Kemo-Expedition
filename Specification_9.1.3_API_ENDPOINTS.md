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
| `POST` | `/experimental/v1/control/heartbeat` | `renewExperimentalApiControl` | Bearer | Owner required | Renew the active control lease. |
| `POST` | `/experimental/v1/control/release` | `releaseExperimentalApiControl` | Bearer | Owner required | Persist and return control to the UI. |
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
    "build": 31,
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
    "build": 31,
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
    "expiresAt": 1786345130000,
    "heartbeatIntervalMs": 10000
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
| `lease.expiresAt` | integer | Yes | `acquiredAt + 30000` | Initial lease-expiration time. |
| `lease.heartbeatIntervalMs` | integer | Yes | `10000` | Recommended interval between successful heartbeat requests. |

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
- While pinned, the operation MUST NOT require heartbeats. After it finishes, the server MUST set `expiresAt` to 30 seconds after the response is prepared.
- While an operation is pinned, the server MUST extend the active lease as needed so `expiresAt` reported by the status endpoint remains in the future.
- Lease expiry, release, API disablement, or application shutdown MUST restore normal progression from the current simulated state without catch-up for the controlled wall-clock interval.

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
      "leaseExpiresAt": 1786345130000
    }
  }
}
```

The response MUST NOT identify the controlling client or disclose either token.
