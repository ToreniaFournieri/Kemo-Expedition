# ClaudeSlot2: v0.10.1 (3) Normal API strategy
Recorded before signup: 2026-10-05T22:43:59Z

Goal order: (1) defeat Expedition 8 boss, (2) minimise in-game time, (3) minimise API calls, 8 h real-time cap.

## Evidence read
All AI_play_report files; weight on SlotBurst v0.10.1 (33.14 d / 533 calls, best), GateBurst (38.6 d / 534), Codex (39.9 d / 452), ClaudeRace (race lever, HP-cache bug, side-party hoarding). Build 3 also lowers Exp8 enemy level 40->39 and Exp9 44->43 (slightly easier D8 than SlotBurst faced).

## Concept: "SlotBurst-Lean"
Re-use SlotBurst's proven core and its measured lessons, but spend fewer calls and fewer wall-days:
- Core: Laika guardian/guardian front, Kemo lord/lord, 2x Ursan ninja/ranger (abyssal_sea, precise) + Leporian sword-saint/ranger sniper, Cervin alchemist/wizard caster. Precision baseline; Fertility/Mirage/Fortification as 1-call per-wall levers.
- Lean calls: no redundant autoEquipment FULL commits (verify defaults with a single read first), side parties default FULL, export only when an offline plan will actually be applied, plan diff-only (preserve items and jewels), one full refit per big wall rather than repeated marginal ones.
- Check empty SEMI slots at Lv10/20/30 immediately; fill with fresh gear.
- Late casters: test Oath/Nimble (+2 slot via oath) at D8 walls BEFORE waiting days; test Laika-front for boss route.
- Time: half-day blocks early, one-hour blocks once boss gate is open; stop on verified native boss flag + room-24 enemy-387 victory; fetch diary with logId diary:<id>.
- Use offline twin (repo engine) for forecasts at walls only; independent seed confirmation before applying.
- Difficulty 0, depth all, fixed destination, advance after verified boss defeat (all remaining gates are godGate).
