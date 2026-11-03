# API v1 performance tuning verification

Baseline commit: bc33bbab5bef8c808d285d6f6a6ec438ecda9cec; version0.9.8/build4.
Hardware: Apple A18 Pro,6CPUcores,8GiB RAM; macOS27.0.1 arm64, Electron production renderer, nativeWASM ABI8.

Tested through real Desktop HTTP transport using disposable Electron userData and accounts; deliveries redirected only in temporary mirrors to controlled local HTTP receiver. Production/user saves unchanged. Headless session used consistently for comparison. Forecast RNG fixed only in diagnostic mirror; every request recomputes forecasts. Fixture/save/control/RNG restored before each sample; commits persisted through production account store.

## Coverage

All85 generated operations exercised with valid success paths:81 on production prepared-fresh save, remaining3debug operations in isolated dev and SSEconnect replacement.3measured requests plus1warmup peroperation. Prepared-fresh fixture has1party, fundedgold/Prana and diary entry to meet route prerequisites; this is a route survey, not exhaustive state/path coverage. Initial SSE recorder hash error replaced by successful rerun. Confirmation challenge and accepted request measured separately; rows show accepted request latency. Fresh route firstcalls are warmup samples, not cold application startup.

## Controlled heavier workloads

D8fixture ALL_Exp8_v0.9.3_dev_20260816.kemoz:6active parties,36FULL auto-equipment characters,2308inventory variants. Baseline, cache-only, combined cache+codec:3process blocks each,1warmup+2measured requests percase each block, alternating source order;6measured/variant/case.108total requests includingwarmups,4cases. Native battle engine warmed by repeated fresh process cases; elapsed12h executes1936nativebattles with194218draws and149status snapshots identically.

| Workload | Baseline median(range)ms | Cache-only medianms | Combined median(range)ms | Improvement |
|---|---:|---:|---:|---:|
| commit/setting/backup/export | 930.4 (814.1–978.4) | 900.3 | 504.9 (486.7–522.4) | 45.7% |
| elapsed43200 | 379.4 (357.8–419.4) | 302.4 | 290.0 (280.0–294.8) | 23.6% |
| elapsed3600 | 189.6 (170.5–197.7) | 183.6 | 169.9 (166.5–177.8) | 10.4% |
| commit/progress/elapsed | 92.8 (82.9–104.0) | 91.3 | 91.1 (84.7–106.8) | 1.9% |

All108records have exact input, output, live state, decoded durable save, RNG and native telemetry parity. Elapsed idempotent receipt replay returns same revision/data without modifying durable storage. Backup wire output exact. Renderer16ms timer gap exportmedian873.3→455.6ms, maximum924.1→470.0ms;12h median153.5→143.2ms. Gaps include renderer IPC/snapshot overhead around request, so are responsiveness diagnostics, not mutually exclusive request phase timings. No reliable short-call gain inferred where ranges overlap.

## All85 baseline route survey, slowest first

| Operation | Medianms | Rangems | Max responsebytes |
|---|---:|---:|---:|
| read/expedition/{p}/simulationRun | 17.91 | 17.61–18.74 | 1501 |
| fundamental/logOut | 17.71 | 16.29–18.31 | 177 |
| fundamental/logIn | 15.18 | 14.61–15.70 | 412 |
| read/base/enemyFormList | 7.21 | 6.53–7.56 | 142376 |
| commit/expedition/{p}/sortie | 5.48 | 5.02–5.80 | 419 |
| commit/expedition/{p}/godsBattle | 5.00 | 4.60–5.29 | 446 |
| commit/setting/backup/export | 4.68 | 3.78–4.82 | 7014 |
| commit/setting/backup/import | 4.14 | 4.13–5.09 | 277 |
| commit/progress/progressReport | 4.02 | 3.74–4.11 | 383 |
| commit/build/character/{characterId}/changeBuild | 4.02 | 3.80–5.79 | 2980 |
| commit/build/character/{characterId}/removeEquipment | 4.00 | 3.64–4.33 | 417 |
| commit/build/character/{characterId}/removeAllEquipment | 3.94 | 3.85–4.24 | 362 |
| commit/build/character/{characterId}/redoEquipment | 3.93 | 3.54–4.19 | 417 |
| commit/setting/feedback | 3.88 | 3.77–4.01 | 331 |
| fundamental/signUp | 3.86 | 2.53–4.35 | 252 |
| commit/progress/elapsed | 3.77 | 3.20–3.83 | 456 |
| commit/build/character/{characterId}/undoEquipment | 3.76 | 3.64–4.42 | 428 |
| commit/base/purchaseShopItems | 3.72 | 3.42–3.73 | 356 |
| help/endpoints | 3.67 | 3.51–3.95 | 169932 |
| commit/build/character/{characterId}/jewelAttach | 3.56 | 3.46–3.93 | 507 |
| commit/build/character/{characterId}/autoEquipment | 3.40 | 3.17–4.21 | 476 |
| commit/build/character/{characterId}/equip | 3.39 | 3.15–4.57 | 442 |
| commit/build/party/{p} | 3.29 | 2.88–4.31 | 313 |
| commit/expedition/{p}/changeExpedition | 3.25 | 2.89–3.49 | 407 |
| commit/base/paidShopRefresh | 3.19 | 3.02–3.21 | 328 |
| commit/setting/enemyEditPane | 3.16 | 2.91–4.28 | 422 |
| commit/setting/modeSelect | 3.12 | 2.96–3.16 | 351 |
| commit/build/character/{characterId}/jewelRemove | 3.12 | 3.06–3.15 | 428 |
| commit/setting/debug | 3.10 | 2.61–3.18 | 582 |
| commit/base/unlockForm | 3.07 | 2.90–3.43 | 288 |
| commit/setting/uiPreferences | 3.00 | 2.83–4.14 | 326 |
| commit/diary/diaryEntry/markAsRead | 3.00 | 2.85–3.03 | 310 |
| commit/diary/{p}/diarySetting | 2.99 | 2.82–3.16 | 563 |
| commit/build/character/{characterId}/lockEquipment | 2.96 | 2.78–3.17 | 428 |
| commit/setting/markNewsAsRead | 2.94 | 2.86–3.07 | 610 |
| commit/build/character/{characterId}/saveEquipmentSet | 2.87 | 2.43–4.48 | 274 |
| commit/build/character/{characterId}/loadEquipmentSet | 2.85 | 2.65–2.93 | 911 |
| commit/base/markItemsAsSeen | 2.81 | 2.66–2.91 | 279 |
| commit/expedition/{p}/resetStatistics | 2.81 | 2.76–2.94 | 208 |
| commit/setting/backup/reset | 2.80 | 2.57–3.16 | 262 |
| read/observation/compact | 2.80 | 2.58–3.01 | 649 |
| commit/base/sellInventoryItems | 2.77 | 2.64–2.81 | 333 |
| commit/setting/clairvoyanceReset | 2.68 | 2.39–3.25 | 293 |
| commit/base/unlockSoldItems | 2.68 | 2.61–2.72 | 281 |
| commit/build/character/{characterId}/deleteEquipmentSet | 2.67 | 2.64–3.92 | 429 |
| commit/build/character/{characterId}/renameEquipmentSet | 2.67 | 2.64–2.71 | 429 |
| read/observation/base | 2.67 | 2.32–2.67 | 11287 |
| commit/base/changeJewelPriorityParty | 2.63 | 2.50–2.71 | 291 |
| commit/build/character/{characterId}/unlockEquipment | 2.59 | 2.57–3.11 | 428 |
| read/observation/party | 2.57 | 2.56–2.77 | 18016 |
| read/observation | 2.50 | 2.42–2.65 | 649 |
| read/observation/expedition | 1.81 | 1.70–1.84 | 780 |
| read/build/character/{characterId}/status | 1.67 | 1.41–1.71 | 3133 |
| resources/bestiary | 1.64 | 1.43–1.70 | 6238 |
| read/build/character/{characterId}/equipment | 1.54 | 1.26–1.62 | 550 |
| read/base/shopInfo | 1.49 | 1.37–1.51 | 330 |
| read/base/shopItemsList | 1.46 | 1.30–1.51 | 1693 |
| read/build/character/{characterId}/equipmentSet | 1.45 | 1.31–1.53 | 169 |
| read/setting/enemyEditPane | 1.42 | 1.35–1.42 | 4040 |
| read/observation/setting | 1.39 | 1.27–1.44 | 1784 |
| resources/superRareList | 1.39 | 1.25–1.40 | 4673 |
| read/observation/diary | 1.38 | 1.32–1.39 | 2010 |
| read/base/altarInfo | 1.35 | 1.22–1.52 | 4443 |
| resources/clairvoyance/{p} | 1.33 | 1.30–1.38 | 168 |
| read/diary/{p}/diarySetting | 1.27 | 1.23–1.53 | 963 |
| read/build/party/{p} | 1.26 | 1.13–1.37 | 398 |
| help/overview | 1.22 | 1.17–1.25 | 10531 |
| read/setting/modeSelect | 1.22 | 1.19–1.32 | 522 |
| read/build/character/{characterId}/equipmentEvaluation | 1.21 | 1.14–1.55 | 292 |
| resources/characterRoster | 1.21 | 1.10–2.79 | 442 |
| resources/developerNewsNotification | 1.19 | 1.17–1.30 | 4083 |
| read/expedition/{p}/chargeStock | 1.18 | 1.14–2.63 | 185 |
| read/base/searchItems | 1.17 | 1.13–1.32 | 879 |
| resources/itemCompendium | 1.16 | 1.16–1.35 | 3167 |
| read/expedition/{p}/latestBattleLog | 1.14 | 1.09–1.22 | 207 |
| read/observation/overview | 1.14 | 0.96–1.23 | 394 |
| read/expedition/{p}/setting | 1.13 | 1.02–1.16 | 428 |
| read/setting/debug | 1.13 | 1.05–1.14 | 925 |
| resources/glossary | 1.08 | 1.07–1.21 | 287 |
| read/base/jewelPriorityParty | 1.08 | 1.07–1.17 | 220 |
| read/setting/delivery/{deliveryId} | 1.02 | 0.96–1.92 | 343 |
| resources/donationBox | 1.01 | 0.93–1.22 | 399 |
| fundamental/status | 0.99 | 0.98–1.08 | 209 |
| read/observation/popupEventStream | 0.98 | 0.91–0.98 | 0 |
| read/diary/diaryEntry/{diaryEntryId} | 0.96 | 0.96–1.03 | 588 |

Final route survey: all 85 operations accepted, no case failures. SSE timing covers connection headers only; first event and reconnect delivery latency are not separately profiled. Final validation completed below.

## Baseline versus final all 85 operations

Ordered by final measured latency, slowest first. Three measured samples per operation (SSE final connect has six across two environments); ranges describe survey variation, not robust percentile estimates.

| Operation | Baseline median ms | Final median ms | Final range ms |
|---|---:|---:|---:|
| read/expedition/{p}/simulationRun | 17.91 | 16.05 | 15.72–19.51 |
| fundamental/logOut | 17.71 | 15.63 | 15.03–20.23 |
| fundamental/logIn | 15.18 | 14.65 | 14.29–15.15 |
| read/base/enemyFormList | 7.21 | 6.76 | 6.61–7.20 |
| help/overview | 1.22 | 5.54 | 1.28–8.83 |
| commit/expedition/{p}/sortie | 5.48 | 5.40 | 5.34–6.19 |
| commit/expedition/{p}/godsBattle | 5.00 | 5.03 | 4.91–5.36 |
| resources/donationBox | 1.01 | 4.65 | 1.35–9.53 |
| commit/build/character/{characterId}/changeBuild | 4.02 | 4.59 | 4.06–5.25 |
| commit/setting/backup/import | 4.14 | 4.43 | 4.01–5.17 |
| help/endpoints | 3.67 | 4.29 | 3.99–4.85 |
| commit/build/character/{characterId}/loadEquipmentSet | 2.85 | 4.25 | 3.07–8.75 |
| commit/build/character/{characterId}/redoEquipment | 3.93 | 4.23 | 3.97–4.30 |
| commit/progress/progressReport | 4.02 | 3.98 | 3.96–4.99 |
| commit/base/purchaseShopItems | 3.72 | 3.90 | 3.63–4.28 |
| commit/build/character/{characterId}/removeAllEquipment | 3.94 | 3.89 | 3.83–3.92 |
| commit/build/character/{characterId}/undoEquipment | 3.76 | 3.86 | 3.39–4.31 |
| commit/build/character/{characterId}/removeEquipment | 4.00 | 3.76 | 3.71–4.05 |
| commit/progress/elapsed | 3.77 | 3.66 | 3.51–3.73 |
| commit/build/character/{characterId}/deleteEquipmentSet | 2.67 | 3.66 | 2.78–3.77 |
| commit/setting/backup/export | 4.68 | 3.59 | 3.41–4.27 |
| commit/build/character/{characterId}/autoEquipment | 3.40 | 3.47 | 2.98–4.25 |
| commit/build/character/{characterId}/jewelRemove | 3.12 | 3.44 | 3.36–3.70 |
| commit/build/character/{characterId}/jewelAttach | 3.56 | 3.43 | 3.30–3.67 |
| commit/base/changeJewelPriorityParty | 2.63 | 3.42 | 3.09–3.93 |
| commit/base/paidShopRefresh | 3.19 | 3.41 | 3.35–3.53 |
| commit/setting/feedback | 3.88 | 3.38 | 3.29–3.62 |
| commit/diary/{p}/diarySetting | 2.99 | 3.38 | 3.10–5.37 |
| commit/build/character/{characterId}/saveEquipmentSet | 2.87 | 3.37 | 2.75–3.87 |
| commit/setting/debug | 3.10 | 3.35 | 2.64–3.49 |
| commit/base/markItemsAsSeen | 2.81 | 3.26 | 3.07–3.28 |
| commit/build/character/{characterId}/renameEquipmentSet | 2.67 | 3.23 | 3.23–3.24 |
| commit/build/character/{characterId}/lockEquipment | 2.96 | 3.18 | 3.01–3.22 |
| commit/setting/enemyEditPane | 3.16 | 3.17 | 3.03–3.38 |
| commit/base/unlockSoldItems | 2.68 | 3.10 | 3.04–3.58 |
| commit/setting/markNewsAsRead | 2.94 | 3.10 | 2.66–3.54 |
| commit/base/unlockForm | 3.07 | 3.08 | 2.92–3.13 |
| commit/build/character/{characterId}/equip | 3.39 | 3.07 | 2.94–3.26 |
| commit/expedition/{p}/resetStatistics | 2.81 | 3.05 | 2.86–3.10 |
| commit/base/sellInventoryItems | 2.77 | 3.04 | 2.92–3.13 |
| commit/diary/diaryEntry/markAsRead | 3.00 | 3.03 | 2.99–3.38 |
| commit/build/party/{p} | 3.29 | 3.03 | 2.86–3.17 |
| commit/expedition/{p}/changeExpedition | 3.25 | 3.00 | 2.97–3.06 |
| commit/setting/modeSelect | 3.12 | 3.00 | 2.73–3.04 |
| commit/build/character/{characterId}/unlockEquipment | 2.59 | 2.86 | 2.83–2.96 |
| read/observation | 2.50 | 2.74 | 2.22–2.79 |
| commit/setting/backup/reset | 2.80 | 2.72 | 2.61–2.99 |
| commit/setting/uiPreferences | 3.00 | 2.71 | 2.56–2.92 |
| fundamental/signUp | 3.86 | 2.63 | 2.54–3.73 |
| read/observation/compact | 2.80 | 2.61 | 2.53–2.63 |
| read/observation/base | 2.67 | 2.55 | 2.41–2.65 |
| read/observation/party | 2.57 | 2.53 | 2.49–2.80 |
| commit/setting/clairvoyanceReset | 2.68 | 2.50 | 2.46–2.73 |
| resources/developerNewsNotification | 1.19 | 1.98 | 1.33–2.34 |
| resources/bestiary | 1.64 | 1.78 | 1.74–2.28 |
| read/observation/expedition | 1.81 | 1.72 | 1.70–1.73 |
| read/build/character/{characterId}/status | 1.67 | 1.62 | 1.51–1.71 |
| read/build/character/{characterId}/equipment | 1.54 | 1.60 | 1.20–1.68 |
| resources/clairvoyance/{p} | 1.33 | 1.57 | 1.34–1.59 |
| read/base/shopItemsList | 1.46 | 1.55 | 1.16–1.60 |
| read/build/character/{characterId}/equipmentSet | 1.45 | 1.52 | 1.30–1.72 |
| read/observation/setting | 1.39 | 1.42 | 1.31–1.44 |
| read/base/shopInfo | 1.49 | 1.42 | 1.36–1.43 |
| read/base/altarInfo | 1.35 | 1.40 | 1.31–1.43 |
| resources/superRareList | 1.39 | 1.40 | 1.33–1.41 |
| resources/itemCompendium | 1.16 | 1.38 | 1.27–1.38 |
| read/observation/diary | 1.38 | 1.37 | 1.34–1.43 |
| read/base/searchItems | 1.17 | 1.32 | 1.20–1.45 |
| read/setting/enemyEditPane | 1.42 | 1.32 | 1.23–1.34 |
| read/diary/{p}/diarySetting | 1.27 | 1.24 | 1.22–1.40 |
| resources/glossary | 1.08 | 1.22 | 1.13–1.28 |
| fundamental/status | 0.99 | 1.22 | 1.08–1.22 |
| read/observation/overview | 1.14 | 1.21 | 1.15–1.25 |
| read/setting/modeSelect | 1.22 | 1.19 | 1.12–1.25 |
| resources/characterRoster | 1.21 | 1.18 | 1.10–1.23 |
| read/build/character/{characterId}/equipmentEvaluation | 1.21 | 1.16 | 1.13–1.42 |
| read/build/party/{p} | 1.26 | 1.15 | 1.12–1.30 |
| read/expedition/{p}/latestBattleLog | 1.14 | 1.14 | 1.14–1.24 |
| read/setting/debug | 1.13 | 1.14 | 0.99–1.21 |
| read/base/jewelPriorityParty | 1.08 | 1.14 | 1.05–1.17 |
| read/expedition/{p}/chargeStock | 1.18 | 1.11 | 1.04–3.02 |
| read/diary/diaryEntry/{diaryEntryId} | 0.96 | 1.04 | 0.99–1.27 |
| read/expedition/{p}/setting | 1.13 | 1.03 | 0.99–1.11 |
| read/setting/delivery/{deliveryId} | 1.02 | 1.01 | 0.94–1.15 |
| read/observation/popupEventStream | 0.98 | 0.94 | 0.86–1.15 |

## Rejected experiments

Coder tested an overlay inventory snapshot with exact gameplay parity; it took1554–1599ms versus cache-only1467–1549ms, so it was not promoted. Coder separately tested native compact forecast output: output83.2MB→4.6MB per1000forecasts with exact response hash and23981battles, but warm wall694–695→712ms; byte encoding was not the governing forecast cost. Forecast output remains unchanged, recomputed fresh on every request. These isolated CPU trials are distinct from Tester Desktop HTTP timings.

## Reproduction

Use `node tests/performance/apiV1Benchmark.mjs --source=/path/to/source --fixtures=fresh --samples=3 --warmups=1 --output=/private/tmp/survey.json` for all production operations; use `--environment=dev --only='clairvoyanceReset|commit/setting/enemyEditPane|commit/setting/debug|popupEventStream'` for debug routes and stream connect. Heavy survey uses `--fixtures=d8,mixed --heavy --only='observation|simulationRun|searchItems|equipmentEvaluation'`. Controlled elapsed/export comparison uses `--fixtures=d8 --heavy --only='elapsed|backup/export'`. Source snapshots are identified by source-hashes.json. The harness creates new source mirrors and userData and redirects delivery only in diagnostic source; none of the seed/clock/local-recipient hooks are promoted runtime changes.

## Final larger-save survey, slowest first

Sixteen operation/workload cases on each D8 and mixed fixture, three measured requests plus one warmup;128requests total, zero failures. Read-only live/durable snapshots remain identical. All forecasts freshly computed, including alias/compact quick=false100runs perparty and explicit1000runs for oneparty.

| Fixture | Operation/workload | Medianms | Rangems | Bytes |
|---|---|---:|---:|---:|
| mixed | simulationRun1000 | 966.2 | 908.4–970.7 | 4445 |
| d8 | simulationRun1000 | 896.1 | 895.4–911.9 | 4436 |
| mixed | read/observation quick=false | 651.5 | 639.8–687.9 | 11956 |
| mixed | read/observation/compact quick=false | 643.5 | 634.3–646.1 | 11956 |
| d8 | read/observation quick=false | 395.0 | 383.0–418.3 | 10399 |
| d8 | read/observation/compact quick=false | 384.9 | 383.6–395.6 | 10399 |
| d8 | read/expedition/{p}/simulationRun | 107.9 | 95.5–113.6 | 4290 |
| mixed | read/expedition/{p}/simulationRun | 96.0 | 93.1–100.4 | 4294 |
| mixed | read/observation/base | 23.1 | 23.1–23.2 | 379436 |
| d8 | read/observation/base | 22.2 | 20.1–24.1 | 378593 |
| d8 | read/observation | 20.6 | 20.2–20.9 | 9976 |
| mixed | read/observation/compact | 19.5 | 18.1–23.1 | 11536 |
| mixed | read/observation | 19.0 | 16.7–19.5 | 11536 |
| d8 | read/observation/compact | 18.3 | 17.9–19.1 | 9976 |
| mixed | searchItems5000 | 10.5 | 10.2–12.3 | 249819 |
| d8 | searchItems5000 | 8.7 | 8.2–8.7 | 248981 |
| mixed | read/base/searchItems | 8.6 | 7.6–11.3 | 1044 |
| mixed | read/observation/diary | 7.6 | 6.9–8.8 | 83069 |
| mixed | read/observation/expedition | 6.7 | 4.9–6.7 | 3654 |
| mixed | read/observation/party | 6.0 | 3.4–6.5 | 24248 |
| d8 | read/base/searchItems | 5.7 | 5.6–6.3 | 1044 |
| d8 | read/observation/diary | 5.6 | 5.1–7.4 | 80528 |
| mixed | read/build/character/{characterId}/equipmentEvaluation | 4.9 | 3.4–6.1 | 295 |
| d8 | read/observation/expedition | 4.4 | 4.2–4.7 | 3656 |
| d8 | read/build/character/{characterId}/equipmentEvaluation | 4.4 | 1.7–10.0 | 295 |
| d8 | read/observation/party | 4.1 | 4.1–4.2 | 24194 |
| mixed | read/observation/popupEventStream | 3.9 | 3.5–4.4 | 0 |
| mixed | read/observation/setting | 3.7 | 3.5–4.2 | 1784 |
| mixed | read/observation/overview | 3.3 | 1.4–3.7 | 397 |
| d8 | read/observation/setting | 1.5 | 1.5–1.7 | 1784 |
| d8 | read/observation/overview | 1.4 | 1.3–1.4 | 396 |
| d8 | read/observation/popupEventStream | 1.1 | 1.0–1.3 | 0 |

## Final validation and release

Promoted release is0.9.8/build5. Both optimized runtime source SHA256hashes exactly match the timed combined build4source snapshot; release metadata differs deliberately so timed saves/hashes remain directly comparable. See source-hashes.json.

Build, generatedAPIcontract check, changed-file ESLint, and rebuiltDesktop smoke pass. Desktop smoke reports85operations and exercises headless session, commit durability, logout/relogin, idle expiry, main/panevisibility and saved progression. Fullsuite495tests:478passed in initial sandbox run,14loopback-restricted failures corrected by a permitted16/16transport rerun (twoalready passed); reconciled492passed with3preexistingfailures. Preserved prechangeHEAD snapshot independently reproduces all3today:AFKauthority source-regex assertion, stale AFKtransfer fixturehash, PartyTab module allowlist. The transfer observedhash isidentical onprechange/current. FullESLint retains3preexisting errors:tests/i18nKeyUsage.test.ts lines21/23 escapedhyphen and tests/support/apiV1PopupEvents.profile.ts unusedGameState. Changedfiles lint passes.

Production save reuse/control-only persistence invariants pass in application/authority regression profiles. Portable codec golden compatibility tests pass; no corrupted-input compatibility regression observed. Nativeinternaldeflate behavior unchanged. Baseline route survey340success requests, finalsurvey344(withduplicatedSSEdevconnect), heavysurvey128, controlledmatrix108; runtimebenchmarks therefore920successful requests includingwarmups. The earlier exploratory heavy pilot is excluded from this count. Route/state coverage is representative, not exhaustive for every possible account state or error path; skippeddebugprerequisites onprod were covered independently in dev. SSEfirstevent/reconnect functional tests pass, but their latency is not separately benchmarked.

The accepted changes shorten large portable save export and longer elapsed progression while preserving exact serializedgameplay, RNG, receipts and durable state. Remaining slowest operations are freshlycomputed1000run forecasts(~896D8/~966mixedms) and quick=false mixedparty forecasts(~644–652ms); they were measured and investigated but the tested flag-only change was slower and rejected. Most prepared-fresh operations remain1–6ms; survey differences at that scale are not claimed as reliable optimization gains.
