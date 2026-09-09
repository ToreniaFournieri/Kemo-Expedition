# AI Play reference client

Use the [operator guide](../Specification_12.2_AI_PLAY_OPERATOR_GUIDE.md) for play decisions and [Regulation 12.1](../Specification_12.1_AI_PLAY_REGURATION.md) for rules. This client uses existing official HTTP endpoints. It does not launch a new evaluation, choose a build or execute sorties on its own.

## Start

Launch the game using the [quickstart](ai-play-quickstart.md), wait for readiness, then run this in another terminal:

```sh
node scripts/ai-play-client.mjs --connection=/path/from/launcher/connection.json --directory=/tmp/my-ai-play-client
```

Replace both paths. Direct Node launch makes the printed PID the client process; the npm alias remains available. Keep the client process running between actions. Use the same directory when reconnecting to the same evaluation; use a different directory for a new evaluation. Do not run the manual lease-acquisition instructions alongside this client.

The client acquires control and renews it during planning. It sends one HTTP request at a time, obtains the current revision through authenticated status, and generates a unique key for each new mutation. These bookkeeping requests are exempt. Preview, simulation, observation and other gameplay requests still consume calls normally.

## Send actions

Enter short control JSON per line, or enter `@/absolute/path/to/action.json`. Build configuration objects must be read from files. Do not paste them into the terminal: terminal line limits can truncate input before the client receives it. The client rejects received input lines over 2,048 bytes; this check cannot detect bytes discarded by the terminal. Output ends with `READY` after each action.

```json
{"action":"observe"}
```

Save a candidate **configuration object** in `/tmp/opening-build.json`. Use the actual current character IDs and legal choices. For example, after confirming Character 1's choices:

```json
{
  "characters": [
    {"characterId":1,"changes":{"mainClassId":"sword-saint","subClassId":"guardian"},"autoEquipmentMode":2}
  ],
  "autoEquip":true
}
```

Inspect and evaluate it before committing. Send these one at a time, reviewing each result:

```json
{"action":"preview","partyId":1,"configurationFile":"/tmp/opening-build.json"}
{"action":"simulate","partyId":1,"configurationFile":"/tmp/opening-build.json"}
{"action":"configure","partyId":1,"configurationFile":"/tmp/opening-build.json"}
{"action":"remove-all-equipment","partyId":1,"characterId":1}
{"action":"run-auto-equipment","partyId":1,"characterId":1}
{"action":"sortie","partyId":1,"count":1}
```

Do not modify the file between preview, simulation and commit unless you intend to evaluate a new candidate. A `configuration` object is supported inside an `@action-file`, but is rejected when pasted directly on an input line. Do not supply both `configuration` and `configurationFile`. The API remains the authority for legal configuration values. Review the whole opening party; the single-character example is syntax, not a proven strategy.

| Action | Inputs / use |
| --- | --- |
| `observe` | Current public observation. |
| `preview`, `simulate`, `configure` | `partyId` (default 1), and `configurationFile`; `configuration` is allowed inside an action file. |
| `remove-all-equipment` | `partyId` (default 1) and required `characterId`; invokes the API's character-level `remove_all_equipment` command. |
| `run-auto-equipment` | `partyId` (default 1) and required `characterId`; immediately runs that character's configured automatic-equipment mode. |
| `sortie` | `partyId` (default 1), explicit integer `count` from 1 to 100. |
| `build-options` | `body` containing the endpoint's character/candidate fields. The client supplies `revision`. See the [API contract](../Specification_9.1.3_API_ENDPOINTS.md). |
| `read` | `path`: `/catalog`, `/diary-entries`, `/parties/1/battle-log/latest`, or `/diary-entries/ID/battle-log`. |
| `status`, `evaluation` | Exempt readiness/accounting checks. |
| `retry` | Explicitly resend the saved uncertain mutation with its original body and key, only while evaluation remains active. |
| `report`, `ledger` | Final public report or accounting ledger; report requires termination. |
| `release` | Persist and release control while leaving the client open. |
| `quit` | Stop renewal immediately, discard queued actions, settle the outstanding response and attempt release, then exit. |

No generic mutation action is provided. `configure`, `remove-all-equipment`, and `run-auto-equipment` are narrow wrappers around their existing API commands. Gods Battles, shop purchases, and direct equipment selection are not available through this client.

## Read results

Simulation and preview output includes the server’s `comparison` against the current live party at the same revision, including build, combat and equipment changes. Simulation also displays the evaluated party; no separate preview call is needed just to retrieve its combat values.

Compact output includes evaluation accounting, revision, party level/XP/condition, computed combat values including attack counts, changed equipment, sortie totals and return reasons. XP difference is the change in the party's current XP field, which can decrease on leveling; use sortie XP totals for actual gains. Preview changes are compared with the last live observation held by this client and do not replace that observation.

Every response also has an `artifact` path to its complete sanitized JSON. Read that file for catalogs, detailed battle logs, legal actions or final status tables that compact output omits. A missing summary field does not mean zero. Credentials and completed-battle replay metadata are excluded. These are client records of official API responses, not game-save files. No source/profile inspection is performed.

## Request progress and shutdown

`requests.jsonl` records `dispatching`, `response_received`, `response_saved`, or `response_uncertain` events with request IDs, paths, timestamps and available call counts. It covers reads such as simulation as well as mutations. The last gameplay request is also retained in `client-state.json` across reconnects. The terminal prints gameplay dispatch/completion events and uncertain responses; routine exempt bookkeeping stays in the journal.

`dispatching` is saved before invoking HTTP and does not prove delivery or acceptance. `response_received` means a JSON response was received; `response_saved` names the response artifact. A missing response does not mean an uncounted call. In particular, simulation leaves the gameplay revision unchanged and creates no pending mutation, but still costs a call when accepted. Use the exempt `evaluation` and `ledger` actions to check authoritative accounting. A read with a lost response is not automatically retried; a new simulation is a new counted request.

`quit`, Ctrl-C, SIGTERM and an interrupt byte delivered through a pipe start shutdown immediately, including during a pending request. Renewal scheduling stops, queued actions are discarded and input remains responsive until shutdown begins. The outstanding HTTP request may finish or reach its existing two-minute timeout; aborting contact does not cancel server gameplay. The client then attempts release with a five-second timeout and closes its input handle. EOF instead finishes the supplied input stream and then closes.

Watch the explicit events: `shutdown_started` → optional `waiting_for_request` → `releasing_control` → `control_released` or `release_unconfirmed` → `client_closed`. `control_inactive` means the server reports no active owned lease. `no_client_lease` means this process holds no lease token, not proof that no server lease exists. A failed release exits with a failure status and preserves recovery files. Never infer successful release merely from process exit. A release already in progress or renewal already accepted can finish after the interrupt; no further renewal is sent.

## Recovery

- **Uncertain mutation:** the client writes `client-state.json` before dispatch and blocks new gameplay if the response is lost or an infrastructure failure is ambiguous. Read `evaluation` and `ledger` to check accounting, then use `retry` if active. The client rechecks termination and uses the exact original body and key. Never edit the pending request. A received retry still costs a call.
- **Terminal result:** use `report` and `evaluation`, then `quit`. Pending winning requests must not be retried. Add strategy notes to the authoritative report path returned by `evaluation`.
- **Restart:** resume the game on the identical build/mode/rules if needed, obtain the new handoff, and restart the client with the same directory. It verifies evaluation identity. First verify the old client has stopped: a live client renews indefinitely, so waiting longer will not help. Use its owning terminal or verified printed PID to stop it. An accepted server operation can also keep the lease pinned until completion. After unconfirmed release, check authenticated status; ordinary expiry starts after the last renewal or completed pinned operation. Credentials are deliberately not saved in client state.
- **Directory already in use:** `client.lock` contains the owning process ID. First verify that process has exited. Only then remove this client lock file and retry. Do not delete `client-state.json` or response artifacts to bypass an unresolved request.
- **API validation error:** inspect `error.details.violations` for configuration field paths and reason codes (and the artifact for full details), correct the candidate and submit a new action. The rejected accepted request still counts. The client does not silently retry errors or change strategy.
- **Save error, identity mismatch or artifact write failure:** stop and preserve the checkpoint and client directory. Resolve the reported problem before recovery.

The client keeps the process alive during planning and may make exempt lease/status requests. Closing it does not shut down the game launcher. Shut down the evaluation application after final reporting to remove its private connection handoff.

Updating client scripts does not require rebuilding or restarting the game. For an active evaluation, preserve its current game version/build and reuse its existing connection handoff after the previous client has stopped. Do not rebuild and resume that checkpoint on a different game build.
