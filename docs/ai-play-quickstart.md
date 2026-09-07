# AI Play: first launch and connection guide

Use this guide with [AI Play Regulation 12.1](../Specification_12.1_AI_PLAY_REGURATION.md) and the [API endpoint contracts](../Specification_9.1.3_API_ENDPOINTS.md). The regulation is authoritative. The evaluation objective is the normal Expedition 1 boss, with a maximum of **20,000 counted API calls**; stop after the successful operation. Gods Battles are prohibited.

## 1. Prepare the source checkout

Open a terminal in the repository root (the directory containing `package.json`). You need Node.js 22 or newer and npm 11 or newer, as declared in `package.json`.

```sh
node --version
npm --version
npm ci
```

Install dependencies once for a fresh checkout, or again when the lockfile changes. The WASM battle kernel is checked in; Emscripten is not needed for ordinary play. A browser tab or `npm run dev` does not provide the desktop localhost API.

## 2. Start exactly one fresh evaluation

```sh
npm run desktop:orca -- --ai-play=MyConcept
```

Replace `MyConcept` with 1–64 letters, numbers, underscores or hyphens. Do not include angle brackets. The `--` passes the evaluation option through npm to Electron. This command builds the game, then opens a fresh isolated Desktop Orca profile. It does not import the ordinary Orca save.

Wait for the build to finish and the **AI Play connection panel** to appear. Keep this process running; use another terminal for API requests. Record the evaluation UUID, endpoint and bearer token from this panel. Reading connection details is setup; gameplay and game-state inspection must use the API exclusively. Do not navigate the gameplay UI, use DevTools, inspect save/profile contents, or call renderer/internal functions.

The environment must be `orca`, with `mode.orca`, enemy offset +5 and Debug OFF. These are fixed by the evaluation launch. The game is deliberately frozen until explicit API operations advance it; the paused panel is expected.

If the exact current build was already produced successfully, the equivalent launch without rebuilding is:

```sh
./node_modules/.bin/electron . --environment=orca --ai-play=MyConcept
```

Do not run both commands: every `--ai-play` launch creates a different evaluation. Do not launch the internal desktop smoke test as a play client; it creates a test evaluation and performs its own actions.

## 3. Check readiness and acquire control

The panel's endpoint already ends in `/experimental/v1`. Do not append that prefix twice. The port and token are generated for the running API; never assume an old connection still works.

For macOS zsh or bash, read credentials without putting the token in shell history:

```sh
printf 'Endpoint: '
read -r BOKEMO_BASE
printf 'Bearer token (hidden): '
read -r -s BOKEMO_TOKEN
printf '\n'

curl --silent --show-error "$BOKEMO_BASE/status" \
  --header "Authorization: Bearer $BOKEMO_TOKEN"
```

Check `game.version`, `game.build`, `game.environment`, and `runtime.status`. Wait for authenticated `runtime.status: "ready"` before acquiring. Public status saying `available` only confirms that the listener exists. Status calls are exempt from evaluation accounting.

```sh
BOKEMO_ACQUIRE=$(curl --silent --show-error "$BOKEMO_BASE/control/acquire" \
  --header "Authorization: Bearer $BOKEMO_TOKEN" \
  --header 'Content-Type: application/json' \
  --data '{"client":{"name":"My AI Player","version":"1"}}')
BOKEMO_LEASE=$(printf '%s' "$BOKEMO_ACQUIRE" | node -pe \
  'const r=JSON.parse(require("fs").readFileSync(0,"utf8")); if(!r.lease?.token) throw new Error(r.error?.message ?? "No lease returned"); r.lease.token')
unset BOKEMO_ACQUIRE
```

If acquisition fails, resolve the reported error before continuing. Keep both tokens private and out of reports or committed files.

## 4. Observe, configure, forecast, play

The first counted request can be an observation:

```sh
curl --silent --show-error "$BOKEMO_BASE/observation" \
  --header "Authorization: Bearer $BOKEMO_TOKEN" \
  --header "X-BoKemo-Control-Lease: $BOKEMO_LEASE"
```

Use IDs and legal actions from the response. Copy its `observation.revision` into configuration commands as `expectedRevision`. A successful mutation returns a new revision; use that for the next request. Previews and forecasts use `revision` instead. They cost a call but do not advance live progression.

For example, after confirming Party 1 is available, replace `0` below with the current revision to perform one actual sortie:

```sh
curl --silent --show-error "$BOKEMO_BASE/sortie" \
  --header "Authorization: Bearer $BOKEMO_TOKEN" \
  --header "X-BoKemo-Control-Lease: $BOKEMO_LEASE" \
  --header 'Content-Type: application/json' \
  --header 'Idempotency-Key: first-sortie' \
  --data '{"expectedRevision":0,"partyId":1,"count":1}'
```

Use a distinct idempotency key for each new mutation. After an uncertain response, retry with the same key and identical body; do not change its revision or count. A committed replay does not execute again, but still costs a call while the evaluation is active. Check every response for `error` and `evaluation.status`. Stop gameplay immediately when the evaluation succeeds or fails.

A batch accepts 1–100 sorties and always completes its requested count. Use small batches near a likely boss victory to avoid unnecessary scored sorties. `/simulation` performs 1,000 forecasts per request. Its aggregate outcomes are not a promise about future live randomness.

The opening can require deliberate build changes and shallow farming. Review attack counts alongside attack values, and use retained battle logs when progress stalls. FULL equipment selection can change category composition; SEMI preserves the composition while upgrading existing items, and FULL equipment locks can protect key items. These are strategic controls, not permission for direct slot selection. Do not blindly repeat zero-progress batches.

## 5. Lease gaps, resuming and finishing

A control lease expires after five minutes of inactivity. Successful owned gameplay calls renew it; `/status` does not. During planning, renew without spending a counted call:

```sh
curl --silent --show-error "$BOKEMO_BASE/control/renew" \
  --header "Authorization: Bearer $BOKEMO_TOKEN" \
  --header "X-BoKemo-Control-Lease: $BOKEMO_LEASE" \
  --header 'Content-Type: application/json' --data '{}'
```

If the lease expires, acquire a new one and replace the lease token. Do not restart the evaluation. The profile remains frozen during the gap. If the app itself was closed, resume its checkpoint on the **identical version/build**:

```sh
npm run desktop:orca -- --resume-ai-play=YOUR_EVALUATION_UUID
```

Replace `YOUR_EVALUATION_UUID` with the recorded UUID. Obtain the newly displayed endpoint/token and reacquire control. Do not use `--ai-play` to resume, import a save, reset the profile, or change the game build mid-run.

At termination, authenticated `GET /evaluation` remains available without a lease and returns the final accounting/report path. Source-checkout reports are under `AI_play_report/`; packaged reports are under `Documents/BoKemo/AI_play_report/`. Complete the report with strategy notes, final party status tables and command summaries required by the regulation. The automatic report currently supplies the ledger, not all of those details.

Release control with `POST /control/release` and an empty JSON object when finished. Evaluation progression remains frozen. Remove credentials from the client environment with `unset BOKEMO_TOKEN BOKEMO_LEASE`.

## Troubleshooting

| Symptom | What to check |
|---|---|
| `Missing script`, missing `package.json`, or Electron not found | Run from the repository root; install dependencies with `npm ci`. |
| The build is still printing output | Wait for the build to complete; launch occurs afterward. |
| A browser opens but there is no API panel | Use Desktop Orca with `--ai-play`, not the browser distribution or plain Vite. |
| Electron aborts or localhost returns `EPERM` in an agent sandbox | Request the host's normal approval for GUI launch/localhost access and rerun there. Do not disable the Electron sandbox or enable debug tools. |
| `runtime_loading` / `runtime_unavailable` | Check authenticated status and allow initialization to finish. Do not spend observation calls polling for startup. |
| `authentication_failed` / connection refused | Re-read the active panel's endpoint/token. The port and credentials can change after relaunch or API restart. |
| `no_active_lease` / `control_lease_expired` | Acquire a new lease; leave the evaluation/profile intact. |
| `control_already_leased` | Use the existing owning client, release it there, or let it expire. Do not create another evaluation to bypass it. |
| `stale_revision` | Use the latest returned revision. After a lost mutation response, preserve the original idempotency request. |
| `runtime_busy` | Let the outstanding operation finish; serialize requests. |
| `save_error` / identity or build mismatch | Stop and preserve the checkpoint. Do not reset, import, or overwrite it. |

This guide was checked against a live v0.9.6 build 13 Desktop Orca launch. It does not establish that a specific earlier agent failure had the same cause.
