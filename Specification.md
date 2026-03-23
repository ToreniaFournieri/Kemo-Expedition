# KEMO EXPEDITION v0.6.1 - SPECIFICATION

- 1. OVERVIEW
    - Text-based, deterministic fantasy RPG
    - Support Japanese language. 
    - Tetris like randomness. (Bag Randomization)
    - Data persistence 

- 2. World setting
    - The world is fragmented into unexplored regions filled with ancient creatures and forgotten relics.
    - Each expedition is guided by a single deity, who manifests power through a chosen party to restore balance and reclaim lost knowledge. 

## 1. CONSTANTS 

### 1.1 CONSTANTS_GLOSSARY
- @Specification_1.1_CONSTANTS_GLOSSARY.md

### 1.2 CONSTANTS_GLOBAL
- @Specification_1.2_CONSTANTS_GLOBAL.md

## 2. CHARACTER_&_PARTY

### 2.1 CHARACTER_&_PARTY
- @Specification_2.1_CHARACTER_&_PARTY.md 

### 2.2 CHARACTER_&_PARTY_MASTER_DATA
- @Specification_2.2_CHARACTER_&_PARTY_MASTER_DATA.md

## 3. ITEM

### 3.1 ITEM
- @Specification_3.1_ITEM.md

### 3.2 ITEM_MASTER_DATA
- @Specification_3.2_ITEM_MASTER_DATA.md

## 4. EXPEDITION_&_ENEMY

### 4.1 EXPEDITION_&_ENEMY
- @Specification_4.1_EXPEDITION_&_ENEMY.md

### 4.2 EXPEDITION_&_ENEMY_MASTER_DATA
- @Specification_4.2_EXPEDITION_&_ENEMY_MASTER_DATA.md

## 5. PROGRESS

### 5.1 PROGRESS
- @Specification_5.1_PROGRESS.md

### 5.2 PROGRESS_FLAVOR_TEXT
- @Specification_5.2_PROGRESS_FLAVOR_TEXT.md

## 6. BATTLE

### 6.1 BATTLE
- @Specification_6.1_BATTLE.md

## 7. AUTOMATION

### 7.1 AUTOMATION
- @Specification_7.1_AUTOMATION.md

## 8. UI

### 8.1 UI_FOUNDATIONS
- @Specification_8.1_UI_FOUNDATIONS.md

### 8.2 UI_PARTY
- @Specification_8.2_UI_PARTY.md

### 8.3 UI_EXPEDITION
- @Specification_8.3_UI_EXPEDITION.md

### 8.4 UI_BASE
- @Specification_8.4_UI_BASE.md

### 8.5 UI_DIARY
- @Specification_8.5_UI_DIARY.md

### 8.6 UI_DIVINE_BUREAU
- @Specification_8.6_UI_DIVINE_BUREAU.md


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
// SpecRef: 8.4.1 | Shop (お店) | Paid Refresh (有償洗替)

// SpecRef: 6.1.2 | Function of battle | f.hit_detection
// SpecRef: 6.1.2 | Function of battle | f.targeting
```

### 10.3 Rules
- SectionID must exactly match the specification heading number (e.g., `6.1.2`).
- Anchor must exactly match the corresponding identifier/name in the specification (e.g., `f.hit_detection`, `Paid Refresh (有償洗替)`).
- Place the `SpecRef` comment at the entry point of the implemented logic (function/method or main branch block).
- If one code block implements multiple spec items, add one `SpecRef` line per item.
- When specification IDs/titles/anchors change, corresponding `SpecRef` comments must be updated in the same change set.


## 11. SPECIFICATION EDITING POLICY

### 11.1 Root File Governance
- `Specification.md` is the table of contents and global policy document for the full specification tree.
- Feature-specific rules must be defined in the referenced section files, not in `Specification.md`, unless the rule is global in scope.
- No update `Specification.md` nor `Specification_1.1_CONSTANTS_GLOSSARY.md`

### 11.2 Cross-Reference Update Requirement
- Every specification change must update all affected cross-references in the same change set.
- Renames are forbidden unless all inbound references are updated in the same change set.

### 11.3 Required Contents for Behavioral Changes
- Every behavioral change must include all of the following:
  - affected section IDs,
  - a short rationale,
  - exact anchors or identifiers added or changed,
  - a changelog entry in `Specification.md`.

### 11.4 Keyword Family Expansion Requirement
- When adding a new keyword family such as `terrain.*`, the editor must update all applicable locations in the same change set:
  - glossary or identifier definition,
  - data source section,
  - runtime behavior section,
  - UI or logging section if the behavior is player-visible.

### 11.5 Deterministic Language Requirement
- Ambiguous language such as “slightly” or “sometimes” must be replaced with deterministic rules.

### 11.6 Clarification Requirement
- If Codex cannot determine the intended behavior from the existing specification text, it must stop and request clarification instead of inventing game logic.

    
## 12. CHANGELOG

|Version  |Changes                                                                               |
|---------|--------------------------------------------------------------------------------------|
| **0.6.1** | Added Section 12 specification editing policy for global spec governance and change traceability |
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
