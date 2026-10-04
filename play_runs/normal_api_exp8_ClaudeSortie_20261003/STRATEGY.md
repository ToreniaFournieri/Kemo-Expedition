# Strategy and run concept — ClaudeSortie1003 (Normal API, Expedition 8 boss)

Written before signup. Goals in priority order: beat the D8 boss, minimise in-game days, minimise API calls, finish within 8 real hours.

## What the earlier reports say (inputs)
* Best references: Codex 39.9 d / 452 calls, CodexN8 41.9 d / 747, Claude run 4 44.8 d / 557, CodexBurst 46.3 d / 595, Claude run 6 78 d / 545.
* Every run spends 25–30 of its ~40 days on D6–D8 streak gates (k = 7/6/5/4/3 consecutive Returns, boss-entry k = 2). Expected runs for p, k: `(p^-k - 1)/(1 - p)`; p matters far more than anything else.
* Proven opening: Kemo lord/lord (Command), Laika guardian/guardian (Defender), Sota + Kuzunoha Ursan ninja/ranger abyssal_sea precise, Lop ninja/ranger abyssal_sea precise, Selfin Cervin wizard/alchemist utopia introspective, Precision deity. Elements: ice early D7, fire late D7, thunder D8.
* Call sinks: build commits (245–498). Full rebuilds and jewel reshuffles are the waste. Lease expiry after 15 idle min and bad login handling cost others 10–30 calls.
* Unused lever found in the source: **instant sortie stock is charged on the in-game clock** (`instantExpedition.ts`, `context.simulatedAt`). After D3 the stock is 6 with refill 6/12/24/48/96/192 min, i.e. it is full again after every 12 h step. One sortie = one full expedition run for 0 in-game seconds and 1 call, and its response gives the outcome immediately. Earlier runs used at most 3 sorties.

## Run concept: "Exact twin, diff-only builds, sortie-finished walls"
1. **Opening** (≈9 calls): signup, the proven builds, Precision, order `[6,1,4,2,3,5]`, D1 fixed / all / offset 0.
2. **Offline exact twin**: `backup/export` (1 call) → load the real save in the repo engine (no DTO reconstruction errors: jewels, gates, deity rank, level are exact) → structured builder + seeded local search on the **exact current gate objective** (Return rate at the blocked gate, Clear rate for the boss), confirm on an independent seed with ≥1,000 runs before committing.
3. **Diff-only apply**: per character, compare old vs new slot lists; use single-slot `equip` with `targetSlot` for replaced slots, `removeEquipment` only for slots that become empty, jewel moves only where the jewel actually changes. Never `removeAllEquipment`.
4. **Sortie-finished walls**: after each 12 h step read the expedition once. When a gate is in progress or the boss is reachable, spend the refilled sortie stock (stop at a Defeat: the party is exhausted). For the boss stage, a sortie `Clear` lets me change destination at once instead of farming the beaten dungeon for the rest of a 12 h step. Budget: sorties only where p is decent; never spam them at p < 10 %.
5. **Pace**: 12 h steps (1 call = ~26 runs). Read gates after every step only at walls; on easy stretches step twice before reading.
6. **Jewels and side parties**: query `category=jewel` from D3 on, assign distinct ranks (might/arcana on attackers, fort/ward on tanks) at every wall search.
7. **Lease**: never leave >14 min between calls during offline work; renew with one cheap read instead of failing a commit.
8. **Stop rule**: stop the moment D8 boss 387 is cleared (sortie result `Clear` at D8 or `difficultyOffset.max` 48); save the boss battle log immediately (diary eviction).

Not allowed / not used: debug mode, save imports, resets, source changes, live RNG manipulation.
