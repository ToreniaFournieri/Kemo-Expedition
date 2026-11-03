# API v1 performance survey

`apiV1Benchmark.mjs` creates an isolated source mirror and disposable Electron account, then sends real HTTP requests using generated operations and conformance recipes. It never loads production accounts. Deliveries are redirected in the temporary source to a controlled local receiver. Deterministic clocks and seeds are diagnostic instrumentation only.

Run from the repository root:

```sh
node tests/performance/apiV1Benchmark.mjs --fixtures=fresh --samples=3 --warmups=1 --output=/private/tmp/api-survey.json
```

Use `--source=/path/to/source` to compare a preserved source snapshot, `--environment=dev` for debug-only routes, `--only='elapsed|backup/export'` to select operations, and `--heavy --fixtures=d8,mixed` for heavier variants. `fresh` is the prepared conformance fixture; `d8` and `mixed` refer to shipped `sample_savedata` expedition fixtures.

Results distinguish warmup rows, successful cases, errors, and unmet environment prerequisites. Three-sample surveys give medians and ranges, not reliable percentiles. The stream route measures header/connect latency only. Read paths assert live and durable state preservation. Elapsed commits additionally verify exact idempotent replay.

The October 3 tuning evidence is in `results/api-v1-tuning-2026-10-03/`.
