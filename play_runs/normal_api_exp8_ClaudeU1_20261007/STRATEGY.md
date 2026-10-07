# ClaudeU1 - v0.10.1 (10) Normal API strategy  (recorded 2026-10-07T01:47:20Z, before signup)
Goal order: boss D8 -> min in-game days -> min API calls; 8h real cap. Reference best: ClaudeSlot2 29.5d / 552 calls; SlotBurst 33.1d/533.
## Concept "SlotBurst-Lean + Unique Swap"
- Slot2 core: Laika guardian/guardian front, Kemo lord/lord, 2 Ursan ninja/ranger (abyssal_sea, precise), Leporian ranger sniper, Cervin alchemist/wizard caster; deity levers (Mirage at D2!, Fertility, Fortification) tested on each wall, no redundant FULL commits.
- NEW (build 10): unique characters honour 'Available At'. Test uniqueSelection allocation: Sougaha (PT5: almighty = growth x1.3, sword/arrow/wand x1.3, +1 stats) as sniper, Merle (PT6: boost2/resonance/prophecy) as caster, Orca (PT2: arrow/sword x1.2), Finn (PT6). Evaluate offline in twin vs Ursan archers; apply only if twin damage beats it. Probe: locked unique rejected, uniqueSelection validOptions, uniqueness across parties, convert back to false, gender/race side effects, slots, HP.
- Per-character optimisers first (proxyopt caster/attackers, hpopt supports) from D2/D3, not GA. Judge plans with dmgplan before spending calls.
- Time: half-day blocks early, 12h/6h at walls, 1h near boss. Stop on exported defeatedBossExpeditions[8].
