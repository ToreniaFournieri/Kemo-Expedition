# ClaudeTune: v0.10.1 (41) Normal API strategy -- "In-game stagedEquipmentTuning"
Written before signup, 2026-10-12. Goals: (1) D8 boss, (2) min in-game time, (3) min API calls, (4) 8 h real time.
References: ClaudeItem 12.67 d / 1,786 calls (b33, twin tools, record); ClaudeGA37 17.75 d / 3,448 calls (b37, in-game GA only).

## Concept
Plan gear only with in-game tools, centred on the new `read/build/character/stagedEquipmentTuning` (builds 40-41).
No twin, emulator, proxyopt or hpopt. Route knowledge from earlier reports is allowed.

Tuning (Spec 7.1.5) does not search raw power: it tries other offense elements (all elemental items switched together),
resistance sets, and ability items (breakers of the bottleneck room's enemy abilities first), then a greedy combine and a
1000-run luck check. Items: Inventory + the character's own items only. So it needs a power source next to it:
- **Power = FULL auto-equip.** FULL picks max-power items per class category order (element-blind, so it mixes elements).
  Refresh = `character/{id}/autoEquipment {mode: FULL, immediateAutoEquipment: true}` (1 call).
- **Tuning on top of FULL** unifies the element, adds resistances and breakers. `applyBuildResult` sets SEMI, so FULL
  stops overwriting the tuned build. Re-run "FULL refresh -> tune" when a new item tier has piled up.
- **gaSearch** only for what tuning cannot touch (class, race, order, deity) and as one A/B against tuning on the same state.

## Plan
1. Opening (9 calls, as ClaudeItem/GA37): lord/lord (1), guardian/guardian (6), ninja/ranger x3 (2,3,4: ursan,
   abyssal_sea, precise), alchemist/wizard (5: utopia, introspective); order 6,1,4,2,3,5; deity Mirage. PT1 stays FULL early.
2. Loop: GA37's build-36 HP-aware `hl.py` (elapse ~1 cycle, 90 s top-ups, sortie at full HP; extra sorties at HPF2).
3. At each new destination with a gate under ~30 %: tune the 3 rangers + caster (`success`), apply. At boss-open: tune with
   `bossDamage` and `success`. When a tuning returns not accepted twice, try FULL refresh -> tune, then gaSearch.
4. Route facts: D6 boss #315 Procyonian `a.illusion` -> 6309 illusion-breaker on rangers (does tuning step 4 find it?);
   Lv30 opens a slot (D7 breakpoint) -> refresh + re-tune at once; farm depths D4 4f-4, D6 3f-4/5f-3, D7 4f-3, D8 3f-3;
   D7 Origami thunder-null/fire-weak, D8 Voidspawn thunder-weak, Ghost ice-weak. Free deities that new parties take.
5. Side parties: their FULL auto-equip hoards drops and tuning cannot take other characters' items -> set new parties'
   characters to OFF and strip them if their gear is better than PT1's options.

## What to test / look for
- Accept rate, forecast gain vs live gate/boss rate; elapsed time per tuning (desktop timeout 600 s).
- Bottleneck choice with `bossDamage` (prepareObjectiveState still runs the full route?) -> does the boss's ability drive step 4?
- Element switch quality (FULL mixes elements), resist step, ability step; Jewels only on changed slots; minimal changeSummary.
- `seed` reproducibility; `applyBuildResult` rename, `autoEquipmentMode`, staleness, "tuning replaces the party's gaSearch result".
Targets: <= 16 d, <= 2,500 calls.
