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
npm run ai-play -- --mode=orca --concept=MyConcept
```

Replace `MyConcept` with 1–64 letters, numbers, underscores or hyphens. Use `--mode=normal` for Normal (prod `/`, enemy offset 0); Orca uses `/orca/`, offset +5. Both keep Debug OFF. The launcher builds, creates an isolated profile, and prints a private connection-file path followed by readiness. Keep that process running in its terminal. It removes the credentials file when the application exits.

Read only the organizer's connection handoff for setup. Do not inspect save/profile contents, use DevTools, navigate gameplay UI or call runtime internals. Every new concept launch creates a new evaluation; use resume after interruptions. Tests are separate from play clients.

## 3. Check readiness and acquire control

The connection file's `endpoint` already ends in `/experimental/v1`. Do not append that prefix twice. The port and token are generated for the running API; never assume an old connection still works.

For macOS zsh or bash, load the private handoff without displaying credentials or putting them in shell history:

```sh
printf 'Connection file path: '
read -r BOKEMO_CONNECTION
BOKEMO_BASE=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).endpoint)' "$BOKEMO_CONNECTION")
BOKEMO_TOKEN=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).token)' "$BOKEMO_CONNECTION")

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

If the lease expires, acquire a new one and replace the lease token. Do not restart the evaluation. The profile remains frozen during the gap. If the app itself was closed, resume its checkpoint on the **identical version/build, mode and rules ID**:

```sh
npm run ai-play -- --mode=orca --resume=YOUR_EVALUATION_UUID
```

Replace `YOUR_EVALUATION_UUID` with the recorded UUID. Load the newly generated private connection file and reacquire control. Do not use `--ai-play` to resume, import a save, reset the profile, or change the game build mid-run.

At termination, authenticated `GET /evaluation` remains available without a lease and returns the final accounting/report path. Source-checkout reports are under `AI_play_report/`; packaged reports are under `Documents/BoKemo/AI_play_report/`. The automatic report includes final party configurations, status tables, winning-operation evidence and the full ledger. Add strategy notes and usability findings. `GET /evaluation/report` returns these final public facts without a lease or counted call; it rejects active runs. `GET /evaluation/ledger` retrieves accounting entries. Ordinary responses omit the growing ledger. Report retrieval, release and app shutdown are allowed after termination.

Release control with `POST /control/release` and an empty JSON object when finished. Evaluation progression remains frozen. Remove credentials from the client environment with `unset BOKEMO_TOKEN BOKEMO_LEASE`.

## Troubleshooting

| Symptom | What to check |
|---|---|
| `Missing script`, missing `package.json`, or Electron not found | Run from the repository root; install dependencies with `npm ci`. |
| The build is still printing output | Wait for the build to complete; launch occurs afterward. |
| A browser opens but there is no API panel | Use `npm run ai-play` from the checkout; the API requires Desktop. |
| Electron aborts or localhost returns `EPERM` in an agent sandbox | Request the host's normal approval for GUI launch/localhost access and rerun there. Do not disable the Electron sandbox or enable debug tools. |
| `runtime_loading` / `runtime_unavailable` | Check authenticated status and allow initialization to finish. Do not spend observation calls polling for startup. |
| `authentication_failed` / connection refused | Reload the active private connection file. The port and credentials can change after relaunch or API restart. |
| `no_active_lease` / `control_lease_expired` | Acquire a new lease; leave the evaluation/profile intact. |
| `control_already_leased` | Use the existing owning client, release it there, or let it expire. Do not create another evaluation to bypass it. |
| `stale_revision` | Use the latest returned revision. After a lost mutation response, preserve the original idempotency request. |
| `runtime_busy` | Let the outstanding operation finish; serialize requests. |
| `save_error` / identity or build mismatch | Stop and preserve the checkpoint. Do not reset, import, or overwrite it. |

This guide was checked against v0.9.6 build 14 Normal and Orca desktop smoke tests and the private launcher handoff. It does not establish that a specific earlier agent failure had the same cause.

The completed [build 13 playtest findings](ai-play-usability-findings-20260908.md) cover equipment, outcome labels and report limitations encountered while using this workflow.
