# Run concept (ClaudeS55 run 6, Normal, Exp8 boss)
Baselines: Codex 39.9 d / 452 calls (best), Claude run5 stalled D8 (46.5 d/567), run4 44.8 d / 557.
Concept "Twin-gated precision snipers, diff-only edits":
1. Proven opening: Kemo lord/lord (Command), Laika guardian/guardian (Defender), Sota/Kuz/Lop ursan|leporian ninja/ranger abyssal_sea precise, Selfin wizard/alchemist; Precision deity from start.
2. Zero blind steps: 12h steps only; read gates every 2-3 steps; export save (1 call) only when optimising.
3. Offline twin (repo engine, build 12) + GA on the EXACT gate probability (k ln P). Apply only plans with large forecast gain.
4. Call economy: diff-only edits (single-slot equip with targetSlot, removeEquipment lists), never full rebuilds; no 15-min idle (lease); jewels from first wall (category=jewel), distinct ranks stack.
5. Reach D8 strong: advance as soon as the boss falls (D8 floors still give more XP/T8 drops), but search at every wall >2 steps; D8 walls are streak gates so p matters cubically.
6. Stop at first Clear of boss 387 (don't wait for godGate); verify via diary bossRare log + difficulty offset max 48.
