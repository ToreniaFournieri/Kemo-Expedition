# ClaudeItem: v0.10.1 (33) Normal API strategy -- "Item rarity update check"
Written before signup, 2026-10-10. Goals: (1) D8 boss, (2) min in-game time, (3) min API calls, (4) 8 h real time.
Reference: ClaudeUpd 13.03 d / 2,289 calls (build 31).

## What is new (builds 32-33)
- 32: rarity keys common/uncommon/rare/epic/mythic (were eliteRare/bossRare/mythicRare); API `itemRarity` field everywhere (compendium,
  shop, expedition-log rewards, drop popups); `searchItems`/`itemCompendium` filter `itemRarity` (old `rarity` rejected); Diary triggers,
  diarySetting `epicThreshold`, Clairvoyance reward keys, Gods Battle progress `godBattle:<id>:epic`.
- 33: `rare` items from EnemyTypeSource D (3304, 3314, 3316, 8302, 8308, 8315, 8318) now get the same bonus set as source A.

## Concept
Replay ClaudeUpd's proven fast recipe (same 9-call opening, 1200->1080/2520 s elapsed loops with skip logic, plan at every stall via
proxyopt/hpopt/GA, exact-emulator gate checks, farm at depth before first unbeatable elite, breaker 6309 vs D6 boss, re-plan at Lv30)
while auditing the rarity update during normal play, at ~zero extra calls:
1. Parse every response I already fetch for stale keys (`rarity`, `eliteRare`, `bossRare`, `mythicRare`) -> automatic grep over batch_calls / logged bodies.
2. A handful of extra probes (budgeted <= 10 calls): `itemCompendium` with `itemRarity` filter + old `rarity` rejected, shop entry fields,
   diarySetting epicThreshold, expedition log rewards, shop at tier available, one equip of a D-source rare.
3. Check new D-source rare items (3304/3314/3316/8302/8308/8315/8318) appear and compare their bonuses with source-A items; use them in plans if better.
4. Offline: the twin/emulator use repo code, so also note any stale rarity naming in exports (kemoz) and plan outputs.
Targets: time <= 13 d; calls <= 2,000 (use 2,520 s loops while farming D5/D6; observe every 4-5 loops).
