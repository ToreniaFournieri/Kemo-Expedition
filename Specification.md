# KEMO EXPEDITION v0.8.0 - SPECIFICATION

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
**Branch:**
  - `main` → `/dev/`
  - `beta` → `/beta/`
  - `prod` → `/`
**Environment:**
  - `/dev/`: 開発環境
    - Debug mode: ON
    - Speed of time: x20 hyper 
  - `/beta/`: βテスト
    - Debug mode: OFF
    - Theme: `m.laika` (fixed; not user-configurable)
  - `/` : 本番環境
    - Debug mode: OFF
    - Speed of time: x1
**Save Data Isolation:** Save data must be namespaced per environment (example: `/dev/`, `/beta/`, and `/`) and never shared between them.

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


### 10.4 Formating
- All numeric values MUST use `Intl.NumberFormat('ja-JP')`
  - Example: `12,345`


## 11. CHANGELOG

- @Specification_11.1_CHANGELOG.md


**END OF SPECIFICATION**
