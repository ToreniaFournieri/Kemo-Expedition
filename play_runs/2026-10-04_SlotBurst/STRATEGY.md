# SlotBurst: v0.10.1 Normal API strategy

Recorded before signup: 2026-10-04T07:04:22.743461+00:00

Goal order: defeat Expedition 8 boss, minimize in-game elapsed time, then HTTP API calls. Eight-hour wall-time cap includes setup; start approximately 2026-10-04 06:45 UTC (15:45 JST), deadline 14:45 UTC (23:45 JST).

## Evidence read before play
Read existing AI_play_report narratives, particularly GateBurst (38.625 days / 534 completed calls), Codex (39.889 / 452), CodexN8 (41.8967 / 747), ClaudeSortie (49.98 / 643), ClaudeRace (45.5 / 498) and the older Normal/Orca attempts. Prior successes establish Command/Defender support, first-strike snipers, distinct damage bonuses, vitality concentration, per-dungeon elements, exact-gate simulation, and diff-only mutations. Prior failures warn about empty SEMI slots, side-party gear hoarding, stale HP caches, low-probability streak gates, and lost boss evidence.

## Run concept
"SlotBurst": proven first-strike burst core, with measured v0.10.1 slot/trait alternatives. More slots are useful only if their distinct bonus stacks and owned gear fills them. Do not assume oath/devoted improve Ursan/Ninja (+2 already exists). Test Leporian/Felidian +2 alternatives and caster devoted/oath against accuracy/INT builds offline at walls.

Opening PT1: Kemo lord/lord; Laika guardian/guardian; Sota and Kuzunoha Ursan ninja/ranger, abyssal_sea, precise; Lop Leporian ninja/ranger, abyssal_sea, precise; Selfin Cervin alchemist/wizard, utopia, introspective. Formation Laika, Kemo, Sota, Kuzunoha, Lop, Selfin. Precision baseline, with Fertility/Mirage/Fortification tested at meaningful walls. FULL auto-equipment only while early drops fill capacity, then structured attacker gear and HP supports with SEMI. Unique traits remain fixed.

## Route and decisions
- Progress D1–D8 at difficulty 0 and depth all; use half-day maximum API advances initially, shorter blocks near reachable bosses. Read gate state once per block, batching only when a wall is already understood.
- Export exact saves for offline forecasts. Rebuild the unchanged current engine before launch; use no debug, imports, live-save edits or live RNG manipulation.
- At first meaningful wall, build attackers from distinct arrow/wand bonuses and raw damage/attack count; support HP from vitality armor and strong shields. Place available jewels, preserving unchanged items and jewels. Match D5 dragon resistance, D6 illusion, D7 fire/thunder-null and D8 thunder weakness.
- Tune the current gate Return chance, not boss Clear while capped. Prefer big gains and cheap build/order/deity levers. Validate selected candidates with a separate seed, then apply only the legal winning diff once.
- Side parties get FULL on unlock and farm cleared destinations for jewels. Pool their gear only when material benefit exceeds transfer calls; do not disable productive farming unnecessarily.
- Instant sorties finish a near-complete streak or attempt a reachable boss when stock and HP allow. Stop on verified Expedition 8 boss defeat; gates alone are ambiguous.
- Keep every HTTP attempt and duration in a redacted ledger. Capture boss setting, native defeat flag and retained room-24 victory log immediately. Report precise kill time if retained; otherwise a bracket/upper bound.

## Feedback plan
Record race/class/lineage/predisposition tests, distinct slot-bonus deduplication, any API/runtime errors and tooling mistakes separately. Report useful future-run opportunities with evidence and sampling limits. No runtime code fixes in this AI Player session.
