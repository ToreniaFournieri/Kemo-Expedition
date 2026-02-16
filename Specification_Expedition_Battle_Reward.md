## 5. EXPEDITION 
- Persistence through an expedition:`d.HP`.

### 5.1 "Loot-Gate" progression system
- If the party fails to meet the entry requirements, the expedition ends before the Gate Room and they are returned to Home.

| title | Gate `x.floor`,`x.room` | uncommon items from `x.room` |
|----|----|----|
| Entering | 1,1 | correct 1 mythic item from previous expedition ( `x.expedition` -1 ), expect for the first expedition. |
| 1st Elite gate | 1,4 | correct 3 uncommon items from this `x.expedition` |
| 2nd Elite gate | 2,4 | correct 9 uncommon items from this `x.expedition`  |
| 3rd Elite gate | 3,4 | correct 18 uncommon items from this `x.expedition` |
| 4th Elite gate | 4,4 | correct 30 uncommon items from this `x.expedition`  |
| 5th Elite gate | 5,4 | correct 45 uncommon items from this `x.expedition`  |
| Boss gate | 6,4 | correct 3 rare items from this `x.expedition` |


### 5.2 Logs
- `f.quick_summary`:
  - `p.outcome_of_expedition`: 
    - 踏破: victory and complete the whole dungeons 
    - 帰還: victory but not fulfill loot-gate condition 
    - 撤退: draw 
    - 敗北: defeat
  - `p.remaining_HP`: remaining party HP/ max party HP : `340/ 1000`
  - `p.reached_room` / `p.number_of_rooms` : 4/6
  - `p.gained_experience`: ex. +234
  - `p.auto-sell_profit`: Amount of Auto-sell items. ex. 1,224G
  - `p.retrieving_trophies`: Shows items by comma-separated.
    - [C] [U] for Black color, [R] for Blue color, [M] for Dark Orange.
    - With Super Rare titled item, override to BOLD Dark orenge.

```
結果: `p.dungeon_name`   残HP: `p.remaining_HP`   `p.outcome_of_expedition`
▼
EXP: `p.gained_experience` | 自動売却額: `p.auto-sell_profit`
獲得アイテム: `p.retrieving_trophies`
```

- `f.list_of_rooms`
  - **Display Order:** Descending order (Boss room at the top, then Room N... down to Room 1). 
  - Line 1:
    - X (Displays number of room. If it is the last room, displays BOSS.)
	- `p.enemy_name`: Name of enemy.
	- `p.enemy_HP`: Shows enemy's `d.HP` (max HP)
	- `p.remaining_HP_of_room`: Party HP and percentage. like: 430(59%)
    - `p.outcome_of_room`: Victory/Defeat/Draw/No Visit -> 勝利/敗北/引分/未到達
　- Line 2:
  	- `p.enemy_attack_values`: Using `f.attack` for each range.  ex. 300/0/340    
	- `p.total_damage_dealt`: Shows total damage dealt
	- `p.total_damage_taken`: Shows total damage taken
	- `p.reward_from_room`: Shows item.

```
X: `p.enemy_name` | `p.outcome_of_room` |  ▼
獲得: `p.reward_from_room`.
```

```
1F-2: 泥まみれキノコ妖 引分▼
獲得:伝説の火打ち石の触媒
(Column 1) 自HP 273 /1,000 [Party HP bar here: Rermaining HP(Blue)/healed HP (Green)  /Taken damage(Dark orange) / max_HP]
(Column 2) 敵HP 20 /320 [Enemy HP bar here: Rermaining HP(Blue) / max_HP]
```

- `f.battle_logs`
  - icon: 
  - `elemental_offense_attribute` -> `e.fire`:🔥, `e.thunder`:⚡, `e.ice`:❄️
  - If there is no elemental attribute (`e.none`), LONG phase:🏹, MID phase:🪄 ,CLOSE phase:⚔

```
戦闘ログ:
[距離<roll result>] 敵が　対象　に行動名！(N/M回) (icon 数値 in dark orange)
[距離<roll result>] 味方:行動主 の行動名！(N/M回) (icon 数値　in Blue)

[効] ウルフの 守護者！　(パーティへの物理ダメージ × 2/3)
[効] ベアの 指揮！ (パーティ攻撃力 × 1.3)
[効] ラビの 魔法障壁！ (パーティへの魔法ダメージ × 2/3)

[遠3] ミミ の攻撃！(3/4回)              (🏹 120)
[魔2] セルヴァ の魔法攻撃！(2/2回, 共鳴+10%))         (🪄 100)
[近3] 敵が キツネ丸 に攻撃！(2/2回)       (⚔ 36)
[近3] 敵が ミミ に攻撃したが外れた！(0/1回)
[近3] キツネ丸 のカウンター！(2/4回)        (⚔ 367)
[近2] キツネ丸 の攻撃！(5/7回)             (⚔ 190)
[近1] レオン の攻撃は外れた！(0/3回)

[末] 再生の神の効果！(HP回復+25)
[末] 消耗の神の効果！(HP消耗-10)
[末] イタチの解錠 石板の盾 を獲得した！(自動売却対象: 10G)
[末] 探索深度に到達した為帰還します
```

## 6. BATTLE

### 6.1 Encounter Rules
- Each encounter consists of one battle

### 6.2 Function of battle

**Battle Phase**

|Phase |Damage type |number of attacks type |Defense type|
|-----|-----------|-----------|-----------|
|LONG |`d.ranged_attack` |`d.ranged_NoA` | `d.physical_defense` |
|MID |`d.magical_attack` |`d.magical_NoA` | `d.magical_defense` |
|CLOSE |`d.melee_attack` |`d.melee_NoA` | `d.physical_defense` |

- After the CLOSE phase, the battle is over. Party needs to beat enemy within these three phases.
 

**functions of attack**

- `f.resonance_amplifier`(actor: ,successful hit: n )
  	If actor.`a.resonance`1, return 1.0 + (0.05 x (n - 1))   
  	If actor.`a.resonance`2, return 1.0 + (0.08 x (n - 1))
  	If actor.`a.resonance`3, return 1.0 + (0.11 x (n - 1))
  	If actor.`a.resonance`4, return 1.0 + (0.13 x (n - 1))
  	If actor.`a.resonance`5, return 1.0 + (0.15 x (n - 1))
    Else, return 1.0.

- `f.damage_calculation`: (actor: , opponent: , phase: )
	max(1, (actor.`f.attack` - opponent.`f.defense` x (1 - actor.`f.penet_multiplier`) ) x actor.`f.offense_amplifier` x actor.`f.elemental_offense_attribute` x opponent.`f.elemental_resistance_attribute` x opponent.`f.defense_amplifier` x party.`f.party.offense_amplifier` x `f.resonance_amplifier`)

  - note: If actor: enemy, party.`f.party.offense_amplifier` = 1.0

**Row-based modifier** 
- Targeting selects a character only to determine defense, row potency, abilities (counter). All damage resolved against a character is applied to `d.HP`.
  - The threat weight table defines how many tickets of each row index are placed into `g.threat_weight_bag`.

|row | Physical Threat weight |
|---|---|
|1|16|
|2|8|
|3|4|
|4|2|
|5|1|
|6|1|

|row | Magical Threat weight |
|---|---|
|1|1|
|2|1|
|3|1|
|4|1|
|5|1|
|6|1|


- `g.physical_threat_weight_bag` and `g.magical_threat_weight_bag`  Threat Weight (Passive Targeting) 
  - A numerical value assigned to a unit based on their row position that determines the size of their "slice" in the enemy's targeting pool.

- `f.targeting`:
  - If phase is LONG or CLOSE, Gets one ticket from `g.physical_threat_weight_bag`.
  - If phase is MID, Gets one ticket from `g.magical_threat_weight_bag`. 
    - Bag contains numbers [1,2,3,4,5,6]
    - The drawn number corresponds to row index (1–6).
    - The character currently occupying that row is selected as the target.

- `d.accuracy_potency` 
  - A global accuracy modifier applied to a unit’s final output based on their current row position.
  - Row-based modifiers apply only to player characters. Enemies are treated as having fixed potency (1.0).
  - Row-based `d.accuracy_potency` is applied only during LONG and CLOSE phases.
  - MID phase ignores row-based accuracy potency, so has fixed potency (1.0).

- **`d.accuracy_potency`**

|row | normal | `a.hunter`1 | `a.hunter`2 |
|---|---|---|---|
|1| 1.00 | 1.00 | 1.00 |
|2| 0.85 | 0.90 | 0.93 |
|3| 0.72 | 0.81 | 0.86 |
|4| 0.61 | 0.73 | 0.80 |
|5| 0.52 | 0.66 | 0.75 |
|6| 0.44 | 0.59 | 0.70 |


- `f.hit_detection`(actor: , opponent: ,Nth_hit: )
  - For all pahse, LONG, MID, CLOSE. 
  - decay_of_accuracy: clamp(0.86, 0.90 + actor.`c.accuracy+v` - opponent.`c.evasion+v`, 0.98)
  - baseChance = actor.d.accuracy_potency
  - if opponent has a.deflection AND phase == LONG: baseChance -= 0.10
  - chance = clamp(0.0, baseChance, 1.0) x (decay ^ (Nth_hit - 1))
    - Note: Nth_hit starts at 1 for the first strike.
    - Note: Nth_hit counts indevisually and not share with normal attack, re-attack and counter. (Nth_hit is reset per attack sequence)
      
  - Roll: Return Random(0, 1.0) <= chance
 

- **`f.counter`(actor: , opponent: ,phase: ) :** IF actor.`a.counter` and (opponent or party members have not `a.null-counter`) and take damage in CLOSE phase, the actor attacks to opponent. (using `f.hit_detection` and `f.damage_calculation`, and actor.`f.NoA` x 0.5, round up)
    - Counter triggers immediately after damage resolution, regardless of turn order modifiers.
    - IF actor.`a.counter` and (opponent or party member have `a.null-counter`), displays log like : “巡礼者ブラザの反撃無効化により、二枚爪の黒豹のカウンターは防がれた！”
    - *note:* if opponent is character, then check party.`a.null-counter`. if at least one party member has `a.null-counter`, nagete the counter attack.



### 6.3 Turn resolution 
**Speed & Turn Order (Rolling Dice Rule)**
- At the start of each phase (LONG / MID / CLOSE), **each actor** (enemy + each party member) rolls initiative.
  - Has `a.first-strike`2, **3d3**. (3~9)
  - Has `a.first-strike`1, **2d3**. (2~6)
  - Normal **1d3**. (1~3)
- Actions are resolved in descending order of roll result.
- Tie-breaker: Enemy > Front row party members > Last row party member.

**Enemy action**
- Enemy always moves first.
- `f.NoA` times, get `f.targeting` -> target character
  	- If `f.hit_detection`(actor: , opponent: ,Nth_hit: the current hit index), current party.`d.HP` -= `f.damage_calculation` (actor: enemy , opponent: character, phase: phase)
- If currenr party.`d.HP` =< 0, Defeat.

- **Coutner:** `f.counter`(actor:enemy , opponent:character ,phase: CLOSE )
- **Re-attack**: IF enemy.`a.re-attack`, the enemy attacks to characters. (using f.hit_detection, f.damage_calculation, and enemy.f.NoA x 0.5, round up)
- *Note:* Nth_hit is global for all enemy attacks in the phase (not per-target)


**Player action**
- Each party member act if he has corresponding damage source in the phase. 

- `f.NoA` times -> enemy
	- If `f.hit_detection`(actor: , opponent: ,Nth_hit: the current hit index), current enemy.`d.HP` -= `f.damage_calculation` (actor: character, opponent: enemy, phase: phase)
- If enemy.`d.HP` =< 0, Victory.

- **Coutner:** `f.counter`(actor:character , opponent: enemy , phase: CLOSE )
- **Re-attack:** IF character.`a.re-attack`, the character attacks to enemy. (using `f.hit_detection`, `f.damage_calculation`, and character.`f.NoA` x 0.5, round up)

### 6.4 Post battle


### 6.5 Outcome 

**Resolution**
- Defeat (Player loses)
    - If party.`d.HP` <= 0
	- This overrides all other outcomes
	- Even if enemy.`d.HP` is also <= 0
- Victory
	- If enemy.`d.HP` <= 0 and party.`d.HP` > 0
- Draw
	- If enemy.`d.HP` > 0 and party.`d.HP` > 0


**Consequence**
- *Defeat*: no penalties (current version). gains `d.experience` points, but no item reward. Back to home without trophies. 
- *Victory*: gains `d.experience` points to a party. has a chance of gaining reward from enemies drop item. Check the conditions bellow.
  - If the party.`d.HP` <= 30% of max HP, back to home with trophies. (excpetion: the Final Boss room)
  - Normal Rooms (`x.room`:1–2): Proceed to the next `x.room`.
  - Gate Rooms (`x.room`: 3 check): At the end of Room 3, the "Loot-Gate" check occurs. If passed, proceed to `x.room`:4 (Elite/Boss).
  - Elite Rooms (`x.floor`:1-5, `x.room`:4): If `God of Restoration`, **Heal 20% of missing HP** (show the log). IF `God of Attrition`,  **reduce 5% of remaining HP** (show the log).  Proceed to the next floor: `x.floor` +1 , `x.room`:1.
  - Final Boss Room (`x.floor`:6, `x.room`:4): Expedition Clear! Return Home with all trophies.

- *Draw*:no penalties (current version). no `d.experience` points nor item reward at this room. Back to home with trophies of previous rooms.


## 7. REWARD 

- For every item listed in the enemy's potential drop items,
  - If the item is common,
    - Get one ticket from `g.common_reward_bag`. Two with `c.unlock`.
	- If `g.reward_bag`.value = '1', then get one ticket from `g.common_enhancement_bag`.
    - If `g.enhancement_bag`.value >= 1, then get one ticket from `g.superRare_bag`.
  - If the item is uncommon,
    - Gets one ticket from `g.uncommon_reward_bag`. Two with `c.unlock`.
    - If `g.uncommon_reward_bag`.value = '1', then get one ticket from `g.enhancement_bag`.
    - If `g.enhancement_bag`.value >= 1, then get one ticket from `g.superRare_bag`.
  - If the item is rare,
    - Gets one ticket from `g.rare_reward_bag`. Two with `c.unlock`.
    - If `g.rare_reward_bag`.value = '1', then get one ticket from `g.enhancement_bag`.
    - If `g.enhancement_bag`.value >= 1, then get one ticket from `g.superRare_bag`.
  - If the item is mythic,
    - Gets one ticket from `g.mythic_reward_bag`. Two with `c.unlock`.
    - If `g.rare_mythic_bag`.value = '1', then get one ticket from `g.enhancement_bag`.
    - If `g.enhancement_bag`.value >= 1, then get one ticket from `g.superRare_bag`.

  - Combines them into one item.

```
 enhancement:0 -> ロングソード
 enhancement:1, superRare:0 -> 名工のロングソード,
 enhancement:3, superRare:1 -> 世界を征する宿ったロングソード)
```

- **Item Retrieval Logic:**
  - Items are stacked by (superRare, enhancement, and base item) and has state
  - *State:`s.sold` Auto-Sell:* If a dropped item matches a rule with state:`s.sold`, it is sold immediately (not added to inventory, gain Gold)
  - *State:`s.owned` Existing Items:* If the item is already in the inventory, increment the item count
  - *State:(no record) New Items:* If no record for the item exists, the system generates the item and sets it to state:`s.owned`
