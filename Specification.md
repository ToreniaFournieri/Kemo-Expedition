# KEMO EXPEDITION v0.3.1 - SPECIFICATION

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
-  `f.reset_weighted_bag`(bag_key: g.*)
  - bags: `g.common_reward_bag`, `g.common_enhancement_bag`, `g.uncommon_reward_bag`, `g.rare_reward_bag`, `g.mythic_reward_bag`, `g.enhancement_bag`, `g.superRare_bag`, `g.physical_threat_weight_bag`, and `g.magical_threat_weight_bag`


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
  - `PartyLevel`: 1
  - `xp_current`: 0
  - Gold: 200G
  - Auto-sell: none
  - state: 待機中


### 3.3 Character initialization

#### 3.3.1 Level and slots
- Experience and level are party-wide. Characters do not have individual levels; all level-based effects reference Party level.
- max_level: 39. (current version restriction)

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

**Experience and level and experience point**
- Each party has its own `PartyLevel` and `xp_current`.
- Experience point to next is calculated like this:
  - `f.XP_to_next`(level: ) = 100 x (1.259)^(level -1)
- When the party levels up:
  - `PartyLevel` += 1
  - `xp_current` = 0
  - Any overflow XP is discarded.

- Experience calculation:
  - Each expedition has a  `x.exp_level`.
  - Each expedition has 6 `xfloor`s, and each `x.floor`.
  - Enemy level `x.enemy_level_final` = `x.exp_level` + (`x.floor` - 1 )
  - Enemy level is used only for experience calculation. 
  - Example:
    - Tier 2 expedition (base enemy level = 8), floor 3 (add +2): `x.enemy_level_final` = 8 + 2 = 10

- Multipliers
  - Tier multiplier: `x.exp_experience_mult` = 3 ^(`x.tier` - 1)
  - Rank multiplier:
    - `x.mult_rank` = 1.0 (Normal)
    - `x.mult_rank` = 1.5 (Elite)
    - `x.mult_rank` = 3.0 (Boss)
  - Over-level penalty:
    - `x.experience_penalty` = (1/2) ^ max(0, `PartyLevel` - `x.enemy_level_final`)

- Total gained XP:
  - `f.calculate_experience` = `d.experience` x `x.mult_rank` x `x.exp_experience_mult` x `x.experience_penalty`
  - The XP is accumulated as float and ceiled once at the end of an `x.expedition` when applied to `xp_current`. 


#### 3.3.2 Multiplier and Functions

- c.multiplier like `c.sword_x1.3` applies only for sword item type. other item types like shield may have +10 melee_attack bonus, but shield's melee_attack bonus is not multiplied by `c.sword_x1.3` effect.
  - if character.`a.seeker`, multiplier the calsulated amount to `c. multiplier`. 

- **`f.base_multiplier`(base_type: ) table of `b.value`**
  - base_type: `b.strength` or `b.intelligence` -> attack scale
  - base_type: `b.vitality` or `b.mind` -> defense scale
  - If `b.strength` is 12, then it applies x1.10. If `b.vitality` is 15, then it applies x0.77.
  - If its value is lower or higher so no entry in the table, apply the lowest or highest value.


| Value | attack scale | defense scale |
|---|---|----|
| 6 | x0.81 | x1.22 |
| 7 | x0.86 | x1.16 |
| 8 | x0.90 | x1.10 |
| 9 | x0.95 | x1.05 |
| 10 | x1.00 | x1.00 |
| 11 | x1.05 | x0.95 |
| 12 | x1.10 | x0.90 |
| 13 | x1.16 | x0.86 |
| 14 | x1.22 | x0.81 |
| 15 | x1.28 | x0.77 |
| 16 | x1.34 | x0.73 |
| 17 | x1.41 | x0.69 |
| 18 | x1.48 | x0.66 |
| 19 | x1.55 | x0.63 |
| 20 | x1.63 | x0.60 |
| 21 | x1.71 | x0.57 |
| 22 | x1.80 | x0.54 |
| 23 | x1.89 | x0.51 |


- character.`f.NoA`: // NoA 0 = No Action.
  - `d.ranged_NoA` = 0 + `c.pursuit+v` bonuses + Item Bonuses of {(`d.ranged_NoA` x enhancement multiplier x super rare multiplier x its c.multiplier + `c.ranged_NoA+v`), round off} 
    - IF the character has `a.iaigiri`, halve these number of attacks, round up. 
  - `d.magical_NoA`= 0 + `c.caster+v` bonuses + Item Bonuses of {(`d.magical_NoA` x enhancement multiplier x super rare multiplier x its c.multiplier + `c.magical_NoA+v`), round off} 
  - `d.melee_NoA`= 0 + `c.grit+v` bonuses + Item Bonuses of {(`d.melee_NoA` x enhancement multiplier x super rare multiplier x its c.multiplier + `c.melee_NoA+v`), round off} 
    - IF the character has `a.iaigiri`, halve these number of attacks, round up. 
  - *note: `c.ranged_NoA+v`, `c.magical_NoA+v`, `c.melee_NoA+v`  Only one single bonuses(c.) of the **exact** same name applies.  

- character.`f.attack`:
  - `d.ranged_attack`= Item Bonuses of {(`d.ranged_attack` x enhancement multiplier x super rare multiplier x its c.multiplier), round off}
  - `d.melee_attack`= Item Bonuses of {(`d.melee_attack` x enhancement multiplier x super rare multiplier x its c.multiplier), round off}
  - `d.magical_attack`= Item Bonuses of of {(`d.magical_attack`  x enhancement multiplier x super rare multiplier x its c.multiplier), round off}

- character.`f.offense_amplifier` (phase: )
  - If phase is LONG or CLOSE,
    - If character.`a.iaigiri`, return v x sum of ( `c.melee_attack+v` or `c.ranged_attack+v`)　x `c.physical_offense_multiplier_xV` x `f.base_multiplier`(base_type: `b.strength`)
      - `a.iaigiri`1: v = 2.0
      - `a.iaigiri`2: v = 2.5
      - `a.iaigiri`3: v = 3.0
    - Else return 1.0 x sum of ( `c.melee_attack+v`, `c.ranged_attack+v` and `c.physical_attack+v` ) x `c.physical_offense_multiplier_xV` x `f.base_multiplier`(base_type: `b.strength`)
  		- ex. If chracter has `c.physical_offense_multiplier_x1.4` and `c.physical_offense_multiplier_x1.2`, 1.4 x 1.2 = 1.68.
  - If phase is MID,  return 1.0 x  sum of (`c.magical_attack+v` and `c.magical_attack+v` ) x `c.magical_offense_multiplier_xV` x `f.base_multiplier`(base_type: `b.intelligence`)
     	- ex. If chracter has `c.magical_offense_multiplier_x1.4` and `c.magical_offense_multiplier_x1.2`, 1.4 x 1.2 = 1.68.
  - *note: `c.melee_attack+v`,  `c.ranged_attack+v`, `c.magical_attack+v`, `c.physical_attack+v`, `c.physical_offense_multiplier_xV` or  `c.magical_offense_multiplier_xV`. Only one single bonuses(c.) of the **exact** same name applies.  

- character .`f.defense` (phase: ):
  - If phase is LONG or CLOSE:
  	- `d.physical_defense`: Item Bonuses of {(Physical defense x enhancement multiplier x super rare multiplier x its c.multiplier), round off}
  - If phase is MID:
  	- `d.magical_defense`: Item Bonuses of {(Magical defense x enhancement multiplier x super rare multiplier x its c.multiplier), round off}

- character.`f.defense_amplifier` (phase: )
  - If phase is LONG or CLOSE
    - return max(0.01, (1.00 - sum of (`c.physical_defense+v`)) x `c.physical_defense_multiplier_xV` x `f.base_multiplier`(base_type: `b.vitality` ) )
  - Else (phase is MID), return max(0.01, (1.00 - sum of (`c.magical_defense+v` )) x `c.magical_defense_multiplier_xV` x `f.base_multiplier`(base_type: `b.mind` ))
    - ex. If chracter has`c.physical_defense_multiplier_x1.4` and `c.physical_defense_multiplier_x1.2`, 1.4 x 1.2 = 1.68.

  - *note: `c.physical_defense+v`, `c.magical_defense+v`  Only one single bonuses(c.) of the **exact** same name applies.  


- character.`f.accuracy_amplifier` (phase: )
  - If phase is LONG,  return: `d.accuracy_potency`.
  - If phase is MID, return: 1.0 (Fixed value)
  - If phase is CLOSE, return `d.accuracy_potency`.

- character.`f.elemental_offense_attribute`
  - Compute the single elemental amplifier used in damage calculation.
  - Definitions
	- For each element E ∈ {fire, ice, thunder}:
	- sum_v(E) = Σ v for all equipped item bonuses of e.E+v
	- selected_element = **argmax_E sum_v(E)**
    - Tie-breaker: thunder > ice > fire > none
    - elemental_offense_attribute = 1 + sum_v(selected_element)
    - If all sums are 0, then selected_element = none and elemental_offense_attribute = 1.0
    - Stackable:  if two `e.fire+0.15`, then 1 + 0.15 + 0.15 -> 1.30

- character.`f.elemental_resistance_attribute` (element: )
  	- return 1.0 x `c.element_defense_multiplier_xV`
  	  - ex. character has `c.fire_defense_multiplier_x3/5`, then 1.0 x 3/5 -> 0.60 for fire.

- character.`f.penet_multiplier`
  -If character.`c.penet`, add them. (ex. `c.penet+0.10` & `c.penet+0.15` -> 0.25)

#### 3.3.3 Mathematical Precision & Display Rules
- Internal Calculation: All multipliers and final status values are calculated using floating-point precision (e.g., 1.4 * 1.3 = 1.82) to ensure accuracy across multiple stacked bonuses.
- Display Rule (Rounding): For UI and logs, values are rounded to one decimal place (e.g., 1.82 → 1.8).
- Integer Rule: Final damage values and HP values are always floored to the nearest integer for display, though internal logic may retain decimals until the final step.
 
### 3.4 Party initialization
- c.multiplier like `c.amulet_x1.3` applies only for individual character's equipments. 

```
Party.`d.HP` =
  100
  + (Total sum of individual (Item Bonuses of {((HP x enhancement multiplier x super rare multiplier x its c.multiplier ) x (`b.vitality` + `b.mind`) / 20 x `c.growth_xV`) , round off}
  + {(`L_eff` x `b.vitality` x (`b.vitality`  + `b.mind`) / 20 x `c.growth_xV`), round off}
```

- If character has c.growth_x1.6 and c.growth_x1.3, then 1.6 x 1.3 -> 2.08

```
`L_eff` =
  level * (
    1
    + max(0, (level - 10)/33)^1.1
    + max(0, (level - 20)/33)^1.2
    + max(0, (level - 30)/33)^1.3
    + max(0, (level - 40)/33)^1.4
    + max(0, (level - 50)/33)^1.5
    + max(0, (level - 60)/33)^1.6
    + max(0, (level - 70)/33)^1.7
    + max(0, (level - 80)/33)^1.8
  )
```

- party.`f.party.offense_amplifier`(phase: phase):
  - If phase is LONG or CLOSE:
	- If party.`a.command`1, multiply x1.3
    - If party.`a.command`2, multiply x1.6
    - If party.`a.command`3, multiply x2.0
- party.`f.abilities_defense_amplifier`(phase: phase):
  - If phase is LONG or CLOSE:
	- If party.`a.defender`1, multiply x2/3
  	- If party.`a.defender`2, multiply x3/5
  	- If party.`a.defender`3, multiply x1/2
  - If phase is MID:
    - If party.`a.m-barrier`1, multiply x2/3
    - If party.`a.m-barrier`2, multiply x3/5
    - If party.`a.m-barrier`3, multiply x1/2



## 4. Party State Machine

- Use one state per party. Every party ticks independently.

- **State list**
  - 休息中: at home, heal +1% MaxHP / sec until full
  - 宴会中: at home, spend 33–67% of previous expedition profit (auto-sell gold), duration 5 sec (skip if profit = 0). If party has `a.squander`2 ability, x2.0 the gold spent on feasting. Else if party has `a.squander`1 ability, x1.5 the gold spent on feasting.  (but not exceed its max profit).  Notification : Without Squander: PT1は25Gお金を使った/With Squander: PT1 君主トムは贅沢に50G使った
  - 睡眠中: at home. Duration 10 sec
  - 祈り中: at home, donate 10–33% of previous expedition profit, if party has `a.tithe`2, Adds +15% of expedition profit to donation, else if party has `a.tithe`1, Adds +10% of expedition profit to donation. remaining profits to global gold wallet. duration 5 sec (if profit = 0 → donate 0G, but still pray). The deity earns that amount of gold (keep record internally, later vision it may use this gold for something). Notification: Without Tithe: PT1は10G神に捧げ、30Gを貯金した/With Tithe: PT1 巡礼者ブラザは祈りと共に12G神に捧げて、28Gを貯金した/ Without Gold: (no notification)
  - 待機中: at home, only when 自動周回 = OFF (idle state)
  - 移動中: home → dungeon, duration 5 sec. If party.character.`a.peddler`, reduce its duration. (`a.peddler`1: 2/3, `a.peddler`2: 3/5)
  - 探索中: in dungeon, advance 1 room / sec, update HP per room; if HP < 30% MaxHP → retreat. At the end of this state, update this {ルピニアンの断崖踏破} part )
  - 帰還中: dungeon → home, duration 5 sec.  If party.character.`a.peddler`, reduce its duration. (`a.peddler`1: 2/3, `a.peddler`2: 3/5) Back to 休息中

- Player taps 出撃/一斉出撃
  - If party is in 待機中 / 休息中 / 宴会中 / 祈り中:
  - Immediately set state to 移動中
  - Do not refill HP; dungeon starts with current HP. No squander, donation, nor remaining profits to the global wallet. The profit vanishes (The party menders would definitely not be happy with this players emergency sortie.)
  - If party is already in 移動中 / 探索中 / 帰還中: ignore tap
  - If party Hp is 0 (just after defeated): ignore tap and show notification log:"random party.character は疲弊しており出撃を拒否した"


- **Transition rules**
  - 自動周回ON: 休息中→宴会中(if possible)→睡眠中→祈り中→待機中→移動中→探索中→帰還中→休息中
  - 自動周回OFF: 移動中→探索中→帰還中→休息中 → 宴会中(条件付き) → 睡眠中 → 祈り中 → 待機中 (stop here)


### 4.1 Time-Based Progress Handling (Online + AFK)
- The state machine is purely time-based: persist `state` and `state_started_at`, and on each update tick compute progress from `now - state_started_at`, applying any completed transitions to reach the latest state.
- Update `state_started_at` **only when the party state changes** (on every state transition).
- Limit: maximum 600 minutes per catch-up simulation (current version).

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
**Branch:** `main` → `/dev/`, `qa` → `/qa/`, `luna` → `/luna`
**Environment:** `/dev/` = 開発機, `/qa/` = αテスト, `/luna/` = αテスト(luna); display the environment label in the version line.
**Special mod:** If `/luna/`, game mode is `m.luna` and cannot be changed. 
**Save Data Isolation:** Save data must be namespaced per environment (`/dev/` and `/qa/`) and never shared between them.

## 10. CHANGELOG

|Version  |Changes                                                                               |
|---------|--------------------------------------------------------------------------------------|
| **0.3.1** | Level and experience system update |
| 0.3.0 | Super rare update |
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
