## 12. AI Play

### 12.2 AI Play Operator Guide

Follow this sequence for one evaluation. [Regulation 12.1](Specification_12.1_AI_PLAY_REGURATION.md) defines the rules; [API contracts](Specification_9.1.3_API_ENDPOINTS.md) define exact request and response fields. This guide explains existing operations. Strategy advice is not a guarantee of victory.

#### 1. Remember the objective

- Defeat the normal Expedition 1 boss within 20,000 counted API calls. Gods Battles are prohibited.
- Lower is better: `score = calls × 10 + actual sorties + failure penalty`. The failure penalty is 100,000 when the call limit is reached without success.
- Use only the official API for gameplay and game-state inspection. Repository documents and previous reports are allowed. UI gameplay, DevTools, save inspection/import/reset and internal runtime calls are prohibited.
- After any response, check `error` and `evaluation.status` before another gameplay request. Stop gameplay when status becomes `succeeded` or `failed`.

#### 2. Launch once and connect

From the repository root:

```sh
npm run ai-play -- --mode=orca --concept=MyConcept
```

Use `--mode=normal` when requested. For dependencies, credential loading and HTTP headers, follow the [first-launch guide](docs/ai-play-quickstart.md). A browser or development server does not provide this API.

Prefer the reference client below after launcher readiness. It performs connection and control setup; send its `observe` action next. The numbered HTTP steps are the manual alternative. Do not manually acquire a lease before starting the reference client.

1. Keep the launcher running. Read its private connection handoff; never print or report credentials.
2. Use the handoff's `endpoint` as the base URL. It already includes `/experimental/v1`.
3. Check authenticated `GET /status` until `runtime.status` is `ready`. Verify version, build, mode and rules.
4. Acquire control with `POST /control/acquire`, body `{"client":{"name":"AI Player","version":"1"}}`. Keep the returned lease token private.
5. Read `GET /observation`. Record evaluation UUID, revision, score, party IDs and legal actions.

Authenticated requests require the bearer header. Owned gameplay requests also require `X-BoKemo-Control-Lease`. JSON POST requests require `Content-Type: application/json`. Send one request at a time and wait for its complete response.

##### Reference client

After the launcher reports readiness, use the official client in another terminal:

```sh
npm run ai-play:client -- --connection=/path/from/launcher/connection.json --directory=/tmp/my-ai-play-client
```

The client checks evaluation identity, acquires and renews control, serializes requests, supplies the latest revision and assigns mutation keys. Keep it running; enter one action per line or `@/absolute/path/to/action.json`. See [client examples and recovery](docs/ai-play-client.md).

```json
{"action":"observe"}
```

For party changes, use `{"action":"preview","partyId":1,"configurationFile":"/absolute/path/to/build.json"}`, then `simulate` and `configure` with the same file. The file contains only the `configuration` object illustrated in section 3. Actual play still requires an explicit action such as `{"action":"sortie","partyId":1,"count":1}`.

The client must preserve a pending mutation's exact body and key before dispatch. An uncertain response blocks new gameplay until explicit `retry`; retry checks termination first and can consume a counted call. It must never retry a mutation automatically or choose builds or batch counts. Full sanitized API responses are retained separately from compact output; client notes are not game saves. Terminal gameplay remains blocked. Only one client may own its local directory at a time. Credentials must remain in memory and the organizer handoff, outside client artifacts.

#### 3. Prepare the opening party before farming

**Do not assume the starting build can beat room one.** If it repeatedly draws there with zero XP and no items, repeating sorties does not establish a productive farming loop. Review the whole party before spending a large batch. A full rebuild may be necessary; changing every member is not a universal requirement.

1. Inspect every member's main/sub class, race, lineage, predisposition, attack values, attack counts and equipment. Use `GET /catalog` for public choices and `POST /build-options` for a character's legal coupled choices. Keep unique-character restrictions intact.
2. Propose a coordinated opening build: enough effective attacks to defeat an early enemy, plus protection for the attackers. Consider all members, their order and deity together. A late-game winning build may depend on levels and equipment the starting party does not have.
3. Put build changes in `configuration.characters[].changes`. Include `autoEquip: true` when the candidate needs equipment recalculated, and preview the result. A class change alone does not guarantee useful equipment or positive attack counts.
4. Simulate a shallow legal depth with that same configuration. The opening target is productive early rooms, not necessarily a full dungeon clear. Zero forecast clears alone does not prove zero farming value; simulation does not return earned XP or items.
5. Commit the candidate, then run **one diagnostic sortie**. Check room progress, XP, items and `returnReason`. If it draws in room one without gains, inspect `GET /parties/{partyId}/battle-log/latest`, revise the build and equipment, and simulate again. Increase batch size only after evidence of productive farming.

This example shows how to change two members together in `POST /party-preview`; it is a request-shape example, not a guaranteed opening build. Replace revision, character IDs and class choices with current legal values. Add one entry for each other member you want to change; omitted members retain their builds.

```json
{
  "revision": 123,
  "partyId": 1,
  "configuration": {
    "characters": [
      {"characterId": 1, "changes": {"mainClassId": "sword-saint", "subClassId": "guardian"}, "autoEquipmentMode": 2},
      {"characterId": 2, "changes": {"mainClassId": "alchemist", "subClassId": "pilgrim"}, "autoEquipmentMode": 2}
    ],
    "autoEquip": true
  }
}
```

Use the identical `configuration` in `/simulation`, then inside the `configure_party` command shown below. Legal `changes` also include `raceId`, `gender`, `lineageId` and `predispositionId`; do not guess their availability. To change formation, add `configuration.order` containing **every** party member ID exactly once. To change deity, add a legal `configuration.deityId`. Preview and simulation do not commit these changes.

#### 4. Repeat: propose → simulate → commit → play → review

| Step | What to do |
| --- | --- |
| Propose | After establishing a productive opening, change one strategic idea at a time. Use observed IDs and legal choices; consult `/build-options` for coupled build restrictions. Keep the candidate configuration in a JSON file. |
| Simulate | `POST /simulation` with the current `revision`, `partyId` and candidate `configuration`. Each request runs exactly 1,000 forecasts, costs one call and does not advance live progression. Inspect its evaluated party and `comparison` for attack-count, build and equipment changes. |
| Inspect equipment | For equipment inspection without running a forecast, use `POST /party-preview` with the same body. Inspect attack **counts**, attack values, defenses and equipment. This costs another call. |
| Commit | If the evidence supports the candidate, send `configure_party` with the same configuration and current `expectedRevision`. Use the returned revision afterward. |
| Play | Start with a small sortie batch. Increase only after productive results. Use single sorties when attempting a likely boss clear. |
| Review | Read XP/rewards, condition, defeats, room progress and `returnReason`. Reconsider after zero progress or repeated defeats. Read the retained battle log when the cause is unclear. |

Request-body examples below assume Party 1 and revision 123 are current. Replace these values before sending. The example candidate selects full depth; use it only when appropriate for the party.

`POST /simulation` (also valid for `/party-preview`):

```json
{"revision":123,"partyId":1,"configuration":{"depthLimit":"all"}}
```

`POST /command`, with a new `Idempotency-Key` such as `configure-001`:

```json
{"expectedRevision":123,"command":{"type":"configure_party","partyId":1,"configuration":{"depthLimit":"all"}}}
```

`POST /sortie`, with a different new key such as `sortie-001`. Here 124 is an example; use the actual revision returned by the command:

```json
{"expectedRevision":124,"partyId":1,"count":1}
```

Accepted batches complete exactly their requested 1–100 sorties, even if victory occurs early. Every completed sortie counts. Forecasts estimate outcomes; they do not reveal the next live result. A shallow depth-limit return is not a boss clear. Prefer explicit `returnReason` over legacy aggregate outcome labels when diagnosing returns.

#### 5. Equipment and context reminders

- `autoEquipmentMode`: `0` = OFF, `1` = SEMI, `2` = FULL.
- SEMI upgrades existing compatible categories; it does not fill empty slots. FULL can change categories and attack counts. Preview significant changes.
- Locks target currently equipped items and require FULL mode. Configuration applies mode changes before locks, then runs automatic equipment if `autoEquip: true`.
- To preserve equipment while filling capacity: preview FULL with locks on the current items and `autoEquip: true`; commit if useful; then switch to SEMI in a separate command if desired. Resolve any lock changes while still in FULL. This uses existing automation, not direct item selection.
- Keep a short working note: evaluation UUID, revision, calls/score, party level/XP/condition, configuration, attack counts, last batch result and next hypothesis. Never store credentials in it.
- Save complete public responses locally and read compact summaries during planning. Do not repeatedly request observations when the preceding response already contains the needed state. Use request files or pipes for long JSON instead of typing it into an interactive terminal.

#### 6. Recover without starting over

| Situation | Next action |
| --- | --- |
| Planning pause | Before five minutes of inactivity, `POST /control/renew` with `{}`. Status checks do not renew the lease. |
| Expired lease | Acquire a new lease and replace its token. Keep the same evaluation. |
| Lost mutation response | Preserve its exact body, revision and idempotency key. Check `/evaluation` for termination first. If active, retry the original request; never invent a new key for the same uncertain action. A replay still costs a call. |
| `stale_revision` | For a confirmed rejected request, use the returned current revision and reassess the candidate. Do not rewrite an uncertain request before resolving its outcome. |
| Validation error | Read `error.details.violations` and correct its configuration paths; build errors can identify several members at once. Accepted invalid gameplay requests consume calls. |
| `runtime_busy` | Wait for the outstanding operation; do not send concurrent gameplay requests. |
| App closed | Resume with `npm run ai-play -- --mode=orca --resume=YOUR_EVALUATION_UUID` using the original mode, identical version/build and rules. Load the new handoff. |
| Save error or identity mismatch | Stop and preserve the checkpoint. Do not reset or overwrite it. |

Status, control and evaluation-summary requests are exempt. Gameplay reads, previews, simulations and mutations cost calls once accepted by the dispatcher. Time between requests does not advance evaluation gameplay.

#### 7. Finish

1. After termination, make no more gameplay requests.
2. Read `GET /evaluation` for final accounting and the report path. Read `GET /evaluation/report` for the frozen final public snapshot, status table, winning operation and ledger. These are exempt; the report endpoint is terminal-only.
3. Add strategy notes and convenience findings to the report. Preserve its authoritative results and required final member status table. Exclude credentials and hidden random state.
4. Release control with `POST /control/release`, body `{}`, then close the evaluation application and discard client credentials.

The report filename uses the evaluation **start date**, mode and six-digit score, as specified in Regulation 12.1. A forecast alone never establishes success; the final evaluation and winning-operation evidence do.
