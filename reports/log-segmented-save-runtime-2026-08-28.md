# Log-segmented runtime persistence — 2026/08/28

## Decision

Promote log-only segmentation to production runtime in build 69. Keep the existing five-second AFK durable-checkpoint interval rather than checkpointing once per Chunk or weakening recovery durability. A steady checkpoint now recompresses the frequently changing core only; retained Diary bodies are immutable records that are compressed once and reused until the existing retention policy removes them.

This is intentionally not a general cold/warm/hot state redesign. Character configuration, settings, inventory, experience, gold, bags, and other authoritative state remain together in the core. Only the dominant retained Diary bodies are segmented.

## Runtime contract

- Runtime storage uses `log-segmented-v1`: one compressed core manifest plus one independently compressed record for each retained Diary entry.
- The core owns Diary order and `isRead`; the immutable record owns the remaining Diary body. `lastExpeditionLog` references its retained Diary entry when possible and remains explicit otherwise. Pending Diary data remains in the core.
- Ordinary and AFK checkpoints write only the core and newly inserted Diary records. Exact duplicate state-object flushes reuse the already durable revision.
- New records are written first, the core manifest commits last, and unreachable old records are deleted only after that commit. A cleanup failure cannot invalidate an already durable save.
- Complete import replacement writes a fresh record generation, so a partial quota/storage failure cannot overwrite records used by the prior manifest.
- Reset removes the core and all scoped Diary records. Legacy monolithic runtime saves load unchanged and migrate at the next successful checkpoint.
- Backup import/export remains a single portable `compressed-v1` payload. The internal record layout is not exposed in `.kemoz` backups.

## Canonical Electron result

Environment: Electron 37.10.3 / Chromium 138 on macOS, hidden sandboxed renderer, production persistence worker, Chromium `localStorage`, pinned six-Party Expedition 8 fixture, two warm-ups, twenty measured samples, nearest-rank percentiles.

| Metric | Build-54 monolithic worker baseline p50 | Build-69 segmented steady p50 | Improvement |
|-|-:|-:|-:|
| Worker compression | 925.6 ms | 71.9 ms | 92.23% |
| End-to-end durability | 952.3 ms | 84.6 ms | 91.12% |
| Save-surrounding renderer delay | 21.1 ms | 11.6 ms | 45.02% |

The build-69 p95 values were 77.5 ms compression, 91.1 ms durability, and 12.7 ms renderer delay. The first migration warm-up, which wrote all 123 independent records, completed in 624.2 ms; subsequent warm-up durability was 73.6 ms. The measured samples preserved canonical segmented round-trip, byte-identical portable export encoding, and deterministic AFK final-state SHA-256 `11fb8356c53d5087d8f220408a92c3c8b12ef276abf2898e9a7e19e7b88bfebc`.

## Payload and tradeoff

The steady compressed core is 70,542 characters from 734,668 core JSON characters. The fixture has 123 retained Diary records totaling 1,046,705 compressed characters, for 1,117,247 runtime compressed characters overall. The byte-identical portable monolithic export is 409,974 characters.

Runtime storage is therefore 2.725 times the portable payload (172.5% larger) because every independent record resets the compression dictionary. This is the deliberate cost of avoiding repeated compression of 94.8% log-dominated canonical JSON. Growth remains bounded by the existing limit of 24 Diary entries per Party (144 entries for the six-Party fixture maximum), and expired records are reclaimed after the manifest commit.

The production AFK worker is 427,152 bytes, 272 bytes larger than build 68, and remains below both the 500 kB JavaScript chunk gate and the dedicated worker limits.

The remaining steady-save bottleneck is the unchanged UTF-16 compression codec at 71.9 ms p50, followed by renderer projection/serialization at 10.5 ms p50. Storage writes are no longer material at 0.2 ms p50. A future optimization should target the core codec only if another measured gate justifies the compatibility risk; reducing checkpoint frequency is unnecessary for current fluency and would worsen recovery durability.

## Verification

- 20-sample canonical Electron production-path profile
- Segmented round-trip, read-state-only rewrite, retention deletion, missing-record rejection, legacy detection, and partial-import atomicity regressions
- Coordinator single-flight, stale response, worker failure, storage retry, portable export, and shutdown regressions
- Full automated test suite
- ESLint
- TypeScript and Vite production build
- Bundle and 500 kB chunk gates
- Memory smoke suite
- `git diff --check`
