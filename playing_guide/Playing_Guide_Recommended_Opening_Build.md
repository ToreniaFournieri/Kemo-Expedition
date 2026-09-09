# Recommended Opening Build — Experimental API

Version: v0.9.6 (19)

Environment: Desktop Orca; `mode.orca`; enemy offset `+5`; Debug Mode OFF.

This is an API-only opening strategy for a fresh AI Play evaluation. It uses only public observations and supported strategic commands. It does not purchase shop items or select exact equipment slots; those operations are unavailable through the Experimental API.

Follow [Specification 12.2](../Specification_12.2_AI_PLAY_OPERATOR_GUIDE.md) for launch, lease, revision, accounting, recovery, and shutdown rules. Every action below must use IDs and choices present in the current observation and `_legalActions`.

## 1. Observe and validate the candidate

Start the reference client, then observe the fresh state:

```json
{"action":"observe"}
```

Confirm PT1 is party `1`, record its current revision, and verify the character IDs below. Use `build-options` for any non-unique character whose race, gender, lineage, or predisposition differs from the observed value. Unique characters must not be sent immutable fields.

Save the following **configuration object** as `/tmp/bokemo-opening-build.json`. It deliberately contains only writable configuration fields.

```json
{
  "characters": [
    {
      "characterId": 1,
      "changes": {"mainClassId": "guardian", "subClassId": "sword-saint"},
      "autoEquipmentMode": 2
    },
    {
      "characterId": 5,
      "changes": {
        "name": "Selfin",
        "gender": "female",
        "raceId": "cervin",
        "lineageId": "adaptation",
        "predispositionId": "introspective",
        "mainClassId": "pilgrim",
        "subClassId": "wizard"
      },
      "autoEquipmentMode": 1
    },
    {
      "characterId": 6,
      "changes": {"mainClassId": "lord", "subClassId": "alchemist"},
      "autoEquipmentMode": 1
    },
    {
      "characterId": 3,
      "changes": {
        "name": "Lop",
        "gender": "female",
        "raceId": "leporian",
        "lineageId": "adaptation",
        "predispositionId": "resourceful",
        "mainClassId": "ranger",
        "subClassId": "pilgrim"
      },
      "autoEquipmentMode": 1
    },
    {
      "characterId": 2,
      "changes": {
        "name": "Borg",
        "gender": "female",
        "raceId": "ursan",
        "lineageId": "adaptation",
        "predispositionId": "serene",
        "mainClassId": "sage",
        "subClassId": "alchemist"
      },
      "autoEquipmentMode": 1
    },
    {
      "characterId": 4,
      "changes": {
        "name": "Grun",
        "gender": "male",
        "raceId": "ursan",
        "lineageId": "adaptation",
        "predispositionId": "introspective",
        "mainClassId": "wizard",
        "subClassId": "alchemist"
      },
      "autoEquipmentMode": 1
    }
  ],
  "order": [1, 5, 6, 3, 2, 4],
  "deityId": "fortification",
  "destination": {"mode": "fixed", "dungeonId": 1},
  "depthLimit": "1f-3",
  "difficultyOffset": 0
}
```

Preview and simulate the unchanged file before committing it:

```json
{"action":"preview","partyId":1,"configurationFile":"/tmp/bokemo-opening-build.json"}
{"action":"simulate","partyId":1,"configurationFile":"/tmp/bokemo-opening-build.json"}
{"action":"configure","partyId":1,"configurationFile":"/tmp/bokemo-opening-build.json"}
```

If validation rejects the candidate, inspect `error.details.violations`, correct only the rejected fields using current `build-options`, then preview and simulate the revised candidate again. Do not continue with a partially assumed build.


## 2. Purchase items from the shop

* Purchase a sword, wand, and grimoire if available.
* The expected total cost is approximately `180G`.
* Shop-purchased items are always enhanced by at least `+1`, making them stronger than equivalent initial equipment.


## 3. Equip the party

* Remove all equipment from all six characters.

* Make **Kemo (Kemoria, characterId=1)** the primary melee attacker.

  * Equip:

    * One armor: `1101`
    * Four swords: `1104`  (one sword must have +1 or more enhancement)
    * Two gauntlets: `1106` and `1211`

* Make **Selfin (Cervin, Pilgrim)** the support magic attacker.

  * Equip:

    * One armor: `1101`
    * One robe: `1102`
    * One wand: `1110`

* Make **Lop (Leporian, Ranger)** the primary ranged attacker.

  * Equip:

    * Two arrows: `1107`
    * Two bows: `1109`

* Make **Grun (Ursan, Wizard)** the primary magic attacker.

  * Equip:

    * Two wands: `1110` (one wand must have +1 or more enhancement)
    * Two catalysts: `1112`

* Make **Borg (Ursan, Sage)** the secondary magic attacker.

  * Equip:
    * One robe: `1102`
    * Two grimorie: `1111` (one grimorie must have +1 or more enhancement)
    * One catalyst: `1112`

* Run Auto Equipment for **Laika (Caninian, characterId = 6)** after all manual equipment assignments above are complete.


### Intention

Enemies in the first area have approximately **16–26 Defense**. High per-hit damage is important because sufficiently strong attacks can kill an enemy immediately. If damage per hit is too low, the party may fail to defeat enemies at all.

For this reason, offensive resources should initially be concentrated on a small number of attackers rather than distributed evenly across the party.

**Kemo (Kemoria)** is particularly suitable as the main melee attacker because he has many equipment slots, allowing multiple offensive items to be stacked on a single character.


## 4. Verify productive farming

Save `{}` as `/tmp/bokemo-current-state.json` and simulate the committed state:

```json
{"action":"simulate","partyId":1,"configurationFile":"/tmp/bokemo-current-state.json"}
```

Forecast percentages are evidence for this exact state, not guaranteed live results. Record the current build, equipment, attack values/counts, and simulation outcomes rather than relying on a historical fixed percentage.

Run exactly one diagnostic sortie:

```json
{"action":"sortie","partyId":1,"count":1}
```

Check room progress, total XP, items, and `returnReason`. If the party draws in room one without gains, inspect the retained battle log and revise the build or targeted equipment order:

```json
{"action":"read","path":"/parties/1/battle-log/latest"}
```

Do not start a large batch until the simulation or diagnostic sortie demonstrates productive early-room progress.

## 5. Farm and improve

Once productivity is established, increase sortie batches gradually. Each accepted request runs exactly its requested `count` from 1 through 100, even if a winning result occurs before the batch ends.

```json
{"action":"sortie","partyId":1,"count":20}
```

After farming produces enhanced copies, run targeted SEMI automatic equipment for characters that already hold the categories you want to preserve:

```json
{"action":"run-auto-equipment","partyId":1,"characterId":1}
```

SEMI upgrades compatible equipped categories; it does not fill empty slots. Use a deliberate FULL run only when you accept category and attack-count changes, and inspect the resulting observation before continuing.

Re-simulate after meaningful build or equipment changes, use single sorties near a likely boss clear, and stop gameplay immediately when `evaluation.status` becomes `succeeded` or `failed`. Retrieve the final report and quit according to the operator guide.
