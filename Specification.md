# KEMO EXPEDITION v0.6.0 - SPECIFICATION

## 1. OVERVIEW
- Text-based, deterministic fantasy RPG
- Support Japanese language. 
- Tetris like randomness. (Bag Randomization)
- Data persistence 

### 1.1 World setting
- The world is fragmented into unexplored regions filled with ancient creatures and forgotten relics.
- Each expedition is guided by a single deity, who manifests power through a chosen party to restore balance and reclaim lost knowledge. 

## 2. CONSTANTS & DATA
### 2.1 Glossary
- @Specification_2.1_GLOSSARY.md

### 2.2 Global constants
- @Specification_2.2_GLOBAL_CONSTANTS.md

### 2.3 Play characters
- @Specification_2.3_CHARACTER_&_PARTY.md

### 2.4 Expedition & Enemies
- @Specification_2.4_EXPEDITION_&_ENEMY.md

### 2.5 Items
- @Specification_2.5_ITEM_DATA.md

## 3. MASTER
### 3.1 Master_Data_Definitions
- @Specification_3.1_MASTER_DATA_DEFINITIONS.md

### 3.2 Master
- @Specification_3.2_MASTER.md

### 3.3 Flavor text
- @Specification_3.3_FLAVOR_TEXT.md

## 4. AUTOMATION
- @Specification_4.AUTOMATION.md

## 5. PROGRESS
- @Specification_5_PROGRESS.md

## 6. BATTLE
- @Specification_6_BATTLE.md

## 8. UI
- @Specification_UI.md

## 9. Environment
**Branch:** `main` → `/dev/`, `qa` → `/qa/`, `luna` → `/luna`
**Environment:** `/dev/` = 開発環境, `/qa/` = αテスト, `/luna/` = αテスト; display the environment label in the version line.
**Special mod:** If `/luna/`, game mode is `m.luna` and cannot be changed. 
**Save Data Isolation:** Save data must be namespaced per environment (`/dev/` and `/qa/`) and never shared between them.

## 10. Coding Rule: SpecRef Traceability
- To ensure traceability between specification and implementation, developers must annotate relevant code blocks with SpecRef comments.

### 10.1 Format (mandatory)

```
// SpecRef: <SectionID> | <SectionTitle> | <Anchor>
```

### 10.2 Examples
```
// SpecRef: 8.5.1 | Shop (お店) | Paid Refresh (有償洗替)

// SpecRef: 6.2 | Function of battle | f.hit_detection
// SpecRef: 6.2 | Function of battle | f.targeting
```

### 10.3 Rules
- SectionID must exactly match the specification heading number (e.g., `6.2`).
- Anchor must exactly match the corresponding identifier/name in the specification (e.g., `f.hit_detection`, `Paid Refresh (有償洗替)`).
- Place the `SpecRef` comment at the entry point of the implemented logic (function/method or main branch block).
- If one code block implements multiple spec items, add one `SpecRef` line per item.
- When specification IDs/titles/anchors change, corresponding `SpecRef` comments must be updated in the same change set.


## 11. CHANGELOG

|Version  |Changes                                                                               |
|---------|--------------------------------------------------------------------------------------|
| **0.6.0** | Big barance update: item, enemy, race, others |
| 0.5.3 | Two tabs mode. Dark mode, Laika mode |
| 0.5.2 | Flavor text update. Fixed auto equipment logic, update side quest barance, especially embezzlement part logic. Refine AFK part. |
| 0.5.1 | Ajusts auto equipment logic |
| 0.5.0 | unlock for deities, religions . auto equipment update |
| 0.4.1 | Cycle update |
| 0.4.0 | Jewel update, side quest update (level cap to 49) |
| 0.3.3 | Gods religion update |
| 0.3.2 | God battle, unlock ability update |
| 0.3.1 | Level and experience system update |
| 0.3.0 | Super rare update (level cap to 39 from 29) |
| 0.2.9 | Race ability update |
| 0.2.7 | Enemy scale rebarance update |
| 0.2.6 | First Strike description text update |
| 0.2.5 | Alpha test update, barance fix  |
| 0.2.4 | Party State Machine update, AFK mode.  |
| 0.2.3 | Accuracy update. Magic is now respect `f.hit_detection`. |
| 0.2.2| Game balance modified, Enemy status mutipliers update, 2.3.3 Base data structure (enemy) update |
| 0.2.1 | Update:8.7 Divine Bureau, 1. Clairvoyance (add total counts at Normal reward ), Adding 2. Item Comedium and 3. Bestiary |
| 0.2.0 | Big update: 2.1 Global constants (change randamness upgrade), 2.3 Expedition & Enemies, 2.4 Items, 3. INITIALIZATION, 5.1 "Loot-Gate" progression system, 6.5 Outcome  7. REWARD (change the logic), 8.4 Expedition, 8.7 Divine Bureau (setting)  |
| 0.1.4 |                                                                |
    
**END OF SPECIFICATION**
