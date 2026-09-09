
# Recommended Opening Build

Version: v0.9.6 (14)

Environment: Desktop Orca; `mode.orca`; enemy offset `+5`; Debug Mode OFF.

The opening phase of Orca mode is extremely difficult. With the default initial build, the party may be unable to defeat even the first enemy, resulting in no EXP or item gains.

This guide provides a recommended opening setup intended to establish a viable farming loop as quickly as possible.

## 1. Change PT1 to the following build


```json
[
  {
    "id": 1,
    "level": 10,
    "deityId": "restoration",
    "expedition": {
      "destinationMode": "fixed",
      "selectedDungeonId": 1,
      "depthLimit": "all",
      "difficultyOffset": 0,
      "maximumDifficultyOffset": 80,
      "instantExpeditionStock": 6,
      "instantExpeditionChargeStartedAt": null,
      "normalSortieAvailable": false,
      "godBattleAvailable": false
    },
    "characters": [
      {
        "id": 1,
        "row": 1,
        "build": {
          "name": "Kemo",
          "gender": "male",
          "raceId": "kemoria",
          "lineageId": "unascertained",
          "predispositionId": "none",
          "mainClassId": "guardian",
          "subClassId": "sword-saint",
          "mimorianEnemyId": null
        },
        "autoEquipmentMode": 1
      },
      {
        "id": 5,
        "row": 2,
        "build": {
          "name": "Selfin",
          "gender": "female",
          "raceId": "cervin",
          "lineageId": "adaptation",
          "predispositionId": "introspective",
          "mainClassId": "pilgrim",
          "subClassId": "wizard",
          "mimorianEnemyId": null
        },
        "autoEquipmentMode": 1
      },
      {
        "id": 6,
        "row": 3,
        "build": {
          "name": "Laika",
          "gender": "female",
          "raceId": "caninian",
          "lineageId": "pioneer",
          "predispositionId": "none",
          "mainClassId": "lord",
          "subClassId": "alchemist",
          "mimorianEnemyId": null
        },
        "autoEquipmentMode": 1
      },
      {
        "id": 3,
        "row": 4,
        "build": {
          "name": "Lop",
          "gender": "female",
          "raceId": "leporian",
          "lineageId": "adaptation",
          "predispositionId": "resourceful",
          "mainClassId": "ranger",
          "subClassId": "pilgrim",
          "mimorianEnemyId": null
        },
        "autoEquipmentMode": 1
      },
      {
        "id": 4,
        "row": 6,
        "build": {
          "name": "Grun",
          "gender": "male",
          "raceId": "ursan",
          "lineageId": "adaptation",
          "predispositionId": "introspective",
          "mainClassId": "wizard",
          "subClassId": "alchemist",
          "mimorianEnemyId": null
        },
        "autoEquipmentMode": 1
      },
      {
        "id": 2,
        "row": 5,
        "build": {
          "name": "Borg",
          "gender": "female",
          "raceId": "ursan",
          "lineageId": "adaptation",
          "predispositionId": "serene",
          "mainClassId": "sage",
          "subClassId": "alchemist",
          "mimorianEnemyId": null
        },
        "autoEquipmentMode": 1
      },
    ]
  }
]
```

## 2. Purchase items from the shop

* Purchase a sword, wand, and grimoire if available.
* The expected total cost is approximately `180G`.
* Shop-purchased items are always enhanced by at least `+1`, making them stronger than equivalent initial equipment.


## 3. Equip the party

* Remove all equipment from all six characters.

* Make **Kemo (Kemoria)** the primary melee attacker.

  * Equip:

    * One armor: `1101`
    * Four swords: `1104`  (one sword must have +1 or more enhancement)
    * Two gauntlets: `1106` and `1211`

* Make **Selfin (Cervin, Pilgrim)** the support magic attacker.

  * Equip:

    * One armor: `1101`
    * One robe: `1102`
    * One wand: `1110`

* Make **Lop (Leporian, Ninja)** the primary ranged attacker.

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

* Run Auto Equipment for **Laika** after all manual equipment assignments above are complete.


### Intention

Enemies in the first area have approximately **16–26 Defense**. High per-hit damage is important because sufficiently strong attacks can kill an enemy immediately. If damage per hit is too low, the party may fail to defeat enemies at all.

For this reason, offensive resources should initially be concentrated on a small number of attackers rather than distributed evenly across the party.

**Kemo (Kemoria)** is particularly suitable as the main melee attacker because he has many equipment slots, allowing multiple offensive items to be stacked on a single character.



## 4. Run a simulation

Run a simulation to evaluate whether the opening build is viable.

A properly configured party may produce results similar to:

`Return 5.4% / Draw 28.4% / Retreat 55.2% / Defeat 11.0%`

A high defeat rate is still acceptable at this stage as long as the party can occasionally defeat enemies and begin gaining EXP and items.


## 5. Run 100 sorties

Run approximately 100 sorties using the opening configuration.

The purpose of this phase is to accumulate EXP, gold, and equipment drops rather than to clear the expedition immediately.


## 6. Run SEMI Auto Equipment

After farming, run **SEMI Auto Equipment** for all characters.

By this point, the party should have accumulated many trophies and enhanced items. Replacing weaker equipment with higher-enhancement alternatives should significantly improve the party's combat performance.


## 7. Continue farming

Good luck!
