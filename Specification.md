# KEMO EXPEDITION v0.2.5 - SPECIFICATION

## 1. OVERVIEW
- Text-based, deterministic fantasy RPG
- Support Japanese language. 
- Tetris like randomness. (Bag Randomization)
- Data persistence 

### 1.1 World setting
- The world is fragmented into unexplored regions filled with ancient creatures and forgotten relics.
- Each expedition is guided by a single deity, who manifests power through a chosen party to restore balance and reclaim lost knowledge. 

## 2. CONSTANTS & DATA
- @Specification_CONSTANTS_&_DATA.md
- @Specification_Master.md

## 3. INITIALIZATION 

### 3.1 Randomness initialization
- **Reward:**
  - Populate `g.common_reward_bag` with tickets according to the `g.common_reward_bag` table.
  - Populate `g.uncommon_reward_bag` with tickets according to the `g.uncommon_reward_bag` table.
  - Populate `g.rare_reward_bag` with tickets according to the `g.rare_reward_bag` table.
  - Populate `g.mythic_reward_bag` with tickets according to the `g.mythic_reward_bag` table.

- **Enhancement:**
  - Populate `g.common_enhancement_bag` with tickets according to the `g.common_enhancement_bag` table.
  - Populate `g.enhancement_bag` with tickets according to the `g.enhancement_bag` table.

- **Super Rare:**
  - Populate `g.superRare_bag` with tickets according to the `g.superRare_bag` table.

- **Threat weight:** 
  - Populate `g.physical_threat_weight_bag` with tickets: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, 2,2,2,2,2,2,2,2, 3,3,3,3, 4,4, 5, 6]. 
  - Populate `g.magical_threat_weight_bag` with tickets: [1,2,3,4,5,6]. 

- If a bag is empty or explicitly reset the bag, initialize it.

### 3.2 Initial setup
- Initial setup (or reset condition)

- Party initial condition.
  1. "ケモ", Caninian, 戦(君), Sturdy, House of the Unmoving
  2. "ゴン", Vulpinian, 剣(侍), Chivalric, House of War Spirit
  3. "イタチ", Murid, 忍(盗), Persistent, House of the Breaking Hand
  4. "ロップ", Leporian, 狩(賢), Dexterous, House of Far Sight
  5. "ラス", Felidian, 賢(巡), Pursuing, House of Hidden Principles
  6. "セルヴァ", Cervin, 魔(魔), Canny, House of Guiding Thought

- Party initial inventory.
  - 3 Tier-1 common items of each item type.

- Party initial state.
  - level: 1
  - experience: 0
  - Gold: 200G
  - Auto-sell: none
  - state: 待機中


### 3.3 Character initialization

#### 3.3.1 Level and slots
- Experience and level are party-wide. Characters do not have individual levels; all level-based effects reference Party level.
- max_level: 29. (current version restriction)

- Equipment slots for individual character
	-`maximum_equipped_item`= base slots + class_bonuses (`c.equip_slot+1`, `c.equip_slot+2` )
  	- Where class_bonuses is the sum of unique values from Main and Sub class. Example: If Main Class provides `c.equip_slot+2` and Sub Class provides `c.equip_slot+1`, class_bonuses is 3. If both provide `c.equip_slot+2`, bonus_sum is 2.

|level | base slots |
|-----|-----------|
| 1 | 1 |
| 3 | 2 |
| 6 | 3 |
| 12 | 4 |
| 16 | 5 |
| 20 | 6 |
| 25 | 7 |
| 30 | 8 |
| 36 | 9 |
| 42 | 10 |
| 49 | 11 |


- Base status update: add (b.) modifiers. (ex. `b.vitality` = 10(from race) + `b.vitality+2` -> 12

#### 3.3.2 Multiplier and Functions

- c.multiplier like `c.sword_x1.3` applies only for sword item type. other item types like shield may have +10 melee_attack bonus, but shield's melee_attack bonus is not multiplied by `c.sword_x1.3` effect. 

- character.`f.attack`:
  - `d.ranged_attack`= Item Bonuses x enhancement multiplier x super rare multiplier x its c.multiplier
  - `d.melee_attack`= Item Bonuses x enhancement multiplier x super rare multiplier x its c.multiplier x `b.strength` / 10
  - `d.magical_attack`= Item Bonuses x enhancement multiplier x super rare multiplier x its c.multiplier x `b.intelligence` / 10

- character.`f.NoA`: // NoA 0 = No Action.
  - `d.ranged_NoA` = 0 + `c.pursuit+v` bonuses + Item Bonuses x enhancement multiplier x super rare multiplier x its c.multiplier + `c.ranged_NoA+v` (round up) 
  - `d.magical_NoA`= 0 + `c.caster+v` bonuses + Item Bonuses x enhancement multiplier x super rare multiplier x its c.multiplier + `c.magical_NoA+v` (round up) 
  - `d.melee_NoA`= 0 + `c.grit+v` bonuses + Item Bonuses x enhancement multiplier x super rare multiplier x its c.multiplier + `c.melee_NoA+v` (round up) 
    - IF the character has `a.iaigiri`, halve these number of attacks, round up. 
  - *note: `c.ranged_NoA+v`, `c.magical_NoA+v`, `c.melee_NoA+v`  Only one single bonuses(c.) of the **exact** same name applies.  

- character.`f.offense_amplifier` (phase: )
  - If phase is CLOSE,
    - If character.`a.iaigiri`, return v x sum of ( `c.melee_attack+v` )
  - Else return 1.0 x  sum of (`c.melee_attack+v` or `c.ranged_attack+v` or `c.magical_attack+v` )
  - *note: `c.melee_attack+v`,  `c.ranged_attack+v`, or `c.magical_attack+v`  Only one single bonuses(c.) of the **exact** same name applies.  

- character.`f.defense_amplifier` (phase: )
  - return max(0.01, 1.00 - sum of (`c.physical_defense+v` or `c.magical_defense+v` ))
  - *note: `c.physical_defense+v`, `c.magical_defense+v`  Only one single bonuses(c.) of the **exact** same name applies.  


- character.`f.accuracy_amplifier` (phase: )
  - If phase is LONG,  return: `d.accuracy_potency`.
  - If phase is MID, return: 1.0 (Fixed value)
  - If phase is CLOSE, return `d.accuracy_potency`.

- character.`f.elemental_offense_attribute`
  - Default is 1. If the damage type has `elemental_offense_attribute`, multiply x V. (ex. fire arrow has `e.fire` and its value is 1.2, multiply 1.2 )
 
- character.`f.penet_multiplier`
  -If character.`c.penet`, add them. (ex. `c.penet_+0.10` & `c.penet_+0.15` -> 0.25)

- character .`f.defense` (phase: phase):
  - If phase is LONG or CLOSE:
  	- `d.physical_defense`: Item Bonuses of Physical defense x enhancement multiplier x super rare multiplier x its c.multiplier x `b.vitality` / 10
  - If phase is MID:
  	- `d.magical_defense`: Item Bonuses of Magical defense x enhancement multiplier x super rare multiplier x its c.multiplier x `b.mind` / 10

#### 3.3.3 Mathematical Precision & Display Rules
- Internal Calculation: All multipliers and final status values are calculated using floating-point precision (e.g., 1.4 * 1.3 = 1.82) to ensure accuracy across multiple stacked bonuses.
- Display Rule (Rounding): For UI and logs, values are rounded to one decimal place (e.g., 1.82 → 1.8).
- Integer Rule: Final damage values and HP values are always floored to the nearest integer for display, though internal logic may retain decimals until the final step.
 
### 3.4 Party initialization
- c.multiplier like `c.amulet_x1.3` applies only for individual character's equipments. 
- Party.`d.HP`: 100 + (Total sum of individual ((Item Bonuses of HP x enhancement multiplier x super rare multiplier x its c.multiplier + level x `b.vitality` ) x (`b.vitality`  + `b.mind`) / 20))

- party.`f.party.offense_amplifier`(phase: phase):
  - If phase is LONG or CLOSE:
	- If party.`a.command`1, multiply x1.3
    - If party.`a.command`2, multiply x1.6
- party.`f.abilities_defense_amplifier`(phase: phase):
  - If phase is LONG or CLOSE:
	- If party.`a.defender`1, multiply x2/3
  	- If party.`a.defender`2, multiply x3/5
  - If phase is MID:
    - If party.`a.m-barrier`1, multiply x2/3
    - If party.`a.m-barrier`2, multiply x3/5

- party.`f.elemental_resistance_attribute`:
  	- Always set 1. (not for this version)

## 4. Party State Machine

- Use one state per party. Every party ticks independently.

- **State list**
  - 休息中: at home, heal +1% MaxHP / sec until full
  - 宴会中: at home, spend 33–67% of previous expedition profit (auto-sell gold), duration 5 sec (skip if profit = 0). if party has `a.squander` ability, double the gold spent on feasting (but not exceed its max profit).  Notification : Without Squander: PT1は25Gお金を使った/With Squander: PT1 君主トムは贅沢に50G使った
  - 睡眠中: at home. Duration 10 sec
  - 祈り中: at home, donate 10–33% of previous expedition profit, if party has `a.tithe`, Adds +10% of expedition profit to donation. remaining profits to global gold wallet. duration 5 sec (if profit = 0 → donate 0G, but still pray). The deity earns that amount of gold (keep record internally, later vision it may use this gold for something). Notification: Without Tithe: PT1は10G神に捧げ、30Gを貯金した/With Tithe: PT1 巡礼者ブラザは祈りと共に12G神に捧げて、28Gを貯金した/ Without Gold: (no notification)
  - 待機中: at home, only when 自動周回 = OFF (idle state)
  - 移動中: home → dungeon, duration 5 sec
  - 探索中: in dungeon, advance 1 room / sec, update HP per room; if HP < 30% MaxHP → retreat. At the end of this state, update this {ルピニアンの断崖踏破} part )
  - 帰還中: dungeon → home, duration 5 sec. Back to 休息中

- Player taps 出撃/一斉出撃
  - If party is in 待機中 / 休息中 / 宴会中 / 祈り中:
  - Immediately set state to 移動中
  - Do not refill HP; dungeon starts with current HP. No squander, donation, nor remaining profits to the global wallet. The profit vanishes (The party menders would definitely not be happy with this players emergency sortie.)
  - If party is already in 移動中 / 探索中 / 帰還中: ignore tap


- **Transition rules**
  - 自動周回ON: 休息中→宴会中(if possible)→睡眠中→祈り中→待機中→移動中→探索中→帰還中→休息中
  - 自動周回OFF: 移動中→探索中→帰還中→休息中 → 宴会中(条件付き) → 睡眠中 → 祈り中 → 待機中 (stop here)


### 4.1 Time-Based Progress Handling (Online + AFK)
- The state machine is purely time-based: persist `state` and `state_started_at`, and on each update tick compute progress from `now - state_started_at`, applying any completed transitions to reach the latest state.
- Update `state_started_at` **only when the party state changes** (on every state transition).
- Limit: maximum 60 minutes per catch-up simulation (current version).

**Notification**
- Format: 踏破N回/撤退M回/敗北X回 寄付金額: vG, 貯金額:　vG
- If the value is 0, not display its text (if all zero, then no notification)

```
Exapmle:
PT1: 踏破10回/敗北1回 寄付金額: 10G, 貯金額:　30G
PT2: 踏破1回 寄付金額: 10G, 貯金額:　30G
PT3: 貯金額: 10G
```

## 5. EXPEDITION 
- @Specification_Expedition_Battle_Reward.md

## 6. BATTLE
- @Specification_Expedition_Battle_Reward.md

## 7. REWARD 
- @Specification_Expedition_Battle_Reward.md

## 8. UI
- @Specification_UI.md

## 9. Environment
**Branch:** `main` → `/dev/`, `qa` → `/qa/`.
**Environment:** `/dev/` = 開発機, `/qa/` = αテスト; display the environment label in the version line.
**Save Data Isolation:** Save data must be namespaced per environment (`/dev/` and `/qa/`) and never shared between them.

## 10. CHANGELOG

|Version  |Changes                                                                               |
|---------|--------------------------------------------------------------------------------------|
| **0.2.5** | Alpha test update, barance fix  |
| 0.2.4 | Party State Machine update, AFK mode.  |
| 0.2.3 | Accuracy update. Magic is now respect `f.hit_detection`. |
| 0.2.2| Game balance modified, Enemy status mutipliers update, 2.3.3 Base data structure (enemy) update |
| 0.2.1 | Update:8.7 Divine Bureau, 1. Clairvoyance (add total counts at Normal reward ), Adding 2. Item Comedium and 3. Bestiary |
| 0.2.0 | Big update: 2.1 Global constants (change randamness upgrade), 2.3 Expedition & Enemies, 2.4 Items, 3. INITIALIZATION, 5.1 "Loot-Gate" progression system, 6.5 Outcome  7. REWARD (change the logic), 8.4 Expedition, 8.7 Divine Bureau (setting)  |
| 0.1.4 |                                                                |
    
**END OF SPECIFICATION**
