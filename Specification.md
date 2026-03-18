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

### 2.6 Master_Data_Definitions
- @Specification_2.6_MASTER_DATA_DEFINITIONS.md

### 2.7 Master
- @Specification_2.7_MASTER.md

### 2.8 Flavor text
- @Specification_2.8_FLAVOR_TEXT.md


## 3. INITIALIZATION 

### 3.1 Randomness initialization
-  `f.reset_weighted_bag`(bag_key: t.*)
  - bags: `t.common_reward_bag`, `t.common_enhancement_bag`, `t.uncommon_reward_bag`, `t.rare_reward_bag`, `t.mythic_reward_bag`, `t.enhancement_bag`, `t.superRare_bag`, `t.physical_threat_weight_bag`, `t.magical_threat_weight_bag`, `t.side_quest_bag`, and `t.sleepiness_of_party_bag` for each party. 


### 3.2 Initial setup
- Initial setup (or reset condition)

- unlocked deity: none (all of other deity is unlocked)

- PT1 Party initial condition.
  1. "ケモ", Caninian, 戦(盗), Canny, House of the Unmoving
     - equipment: `1101`, `1103`
  2. "ゴン", Vulpinian, 剣(侍), Chivalric, House of War Spirit
     - equipment: `1104`, `1104`
  3. "イタチ", Murid, 忍(君), Persistent, House of the Breaking Hand
     - equipment: `1104`, `1106`
  4. "ロップ", Leporian, 狩(賢), Shikon, House of Far Sight
     - equipment: `1107`, `1108`, `1109`
  5. "ラス", Felidian, 賢(巡), Dexterous, House of Steel Oath
     - equipment: `1110`, `1111`, `1112` 
  6. "セルヴァ", Cervin, 魔(魔), Canny, House of Guiding Thought
     - equipment: `1110`

- Party initial inventory.
  - 1 Tier-1 common items of each item type.

- Party initial state.
  - `PartyLevel`: 1
  - `xp_current`: 0
  - Gold: 200G
  - Auto-sell: none
  - state: idle
  - deity: none

- PT2 initial condition (when unlocked)
  - deity: `God of Attrition`
  - party member race: all Lupinian
  - 3.6 AUTO equipment logic for all party member. 
 
- PT3 initial condition (when unlocked)
  - deity: `God of Cunning`
  - party member race: all Vulpinian
  - 3.6 AUTO equipment logic for all party member.  

- PT4 initial condition (when unlocked)
  - deity: `God of Fortification`
  - party member race: all Ursan
  - 3.6 AUTO equipment logic for all party member.  

- PT5 initial condition (when unlocked)
  - deity: `Goddess of Fertility`
  - party member race: all Felidian
  - 3.6 AUTO equipment logic for all party member. 

- PT6 initial condition (when unlocked)
  - deity: `God of Resonance`
  - party member race: all Mustelid
  - 3.6 AUTO equipment logic for all party member.

### 3.4 Unlock party & Deity
- Party & Deity unlock condition: Defeating corresponding gods.
  - New party with new corresponding deity as default.
  - max 6 parties.
   
| Condition | Unlock Religions | Unlock party |
|-----|-----|-----|
| Defeating: `Seiran` | `Goddess of Restoration` | none |
| Defeating: `Garv` | `God of Attrition` | 2nd party |
| Defeating: `Kyōen` | `God of Cunning` | 3rd party |
| Defeating: `Dolvar` | `God of Fortification` | 4th party |
| Defeating: `Miora` | `Goddess of Fertility` | 5th party |
| Defeating: `Rondel` | `God of Resonance` | 6th party |
| Defeating: `Lira` | `Goddess of Precision` | none |
| Defeating: `Forne` | `God of Fate` | none |
| Defeating: `Skuva` | `God of Dusk` | none |
| Defeating: `Forne` | `God of Fate` | none |
| Defeating: `Tanue` | `Goddess of Mirage` | none |
| Defeating: `Noctyra` | `God of Oblivion` | none |
| Defeating: `Eris` | `Goddess of discord` | none |

## 4. AUTOMATION
- @Specification_4.AUTOMATION.md

## 5. PROGRESS
- @Specification_5_PROGRESS.md

## 6. BATTLE
- @Specification_6_BATTLE.md

## 7. REWARD 
- @Specification_Expedition_Battle_Reward.md

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
