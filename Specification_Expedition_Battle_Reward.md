## 5. EXPEDITION 
- Persistence through an expedition:`d.HP`.
- auto-sell profit amp:
  - If party.character.`a.cunning`, multiplier x1.2.
  - If party.character.`a.cunning`, multiplier x1.3.

### 5.1 "Loot-Gate" progression system
- If the party fails to meet the entry requirements, the expedition ends before the Gate Room and they are returned to Home.

| title | Gate `x.floor`,`x.room` | condition |
|----|----|----|
| Entering | 1,1 | correct 1 boss rare item from previous expedition ( `x.expedition` -1 ), expect for the first expedition. |
| 1st Elite gate | 1,4 | correct 3 uncommon items from this `x.expedition` |
| 2nd Elite gate | 2,4 | correct 9 uncommon items from this `x.expedition`  |
| 3rd Elite gate | 3,4 | correct 18 uncommon items from this `x.expedition` |
| 4th Elite gate | 4,4 | correct 30 uncommon items from this `x.expedition`  |
| 5th Elite gate | 5,4 | correct 45 uncommon items from this `x.expedition`  |
| Boss gate | 6,4 | correct 3 elite rare items from this `x.expedition` |
| Gods battle gate | - | collect 10 Boss rare items in dungeons to unlock Gods Battle |
| Side quest gate | - | it depends on side quest `q.` condition |


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
  - As defalut, expands the latest room. 
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
left-alinged                                           right-aligned
[距離<roll result>] 敵が　対象　に行動名！(N/M回)    (icon 数値 in dark orange)
[距離<roll result>] 味方:行動主 の行動名！(N/M回)    (icon 数値　in Blue)

[効] イタチの 矢払い！ (敵の遠距離攻撃の命中率を10%低下)
[効] ウルフの 守護者！　(後列にいる味方への物理ダメージ × 2/3)
[効] ベアの 指揮！ (後列にいる味方の物理攻撃力 × 1.3)
[効] ラビの 魔法障壁！ (後列にいる味方への魔法ダメージ × 2/3)
[効] 不和の神の効果！ ([⚠️敵対]ゴンが仲違いした)
[効] name の氷結反射！ (自身が受ける予定の氷属性ダメージを反射(3/10))
[効] name の火炎反射！ (自身が受ける予定の炎属性ダメージを反射(3/10))
[効] name の魔法反射！ (自身が受ける予定の魔法ダメージを反射(1/10))
[効] name の凍傷！ (相手の行動を少し遅らせる)
[効] name の魔法増幅！ (双方魔法ダメージ1.3倍)
[効] name の魔法抑制！ (双方魔法ダメージ0.8倍)
[効] name の物理増幅！ (双方物理ダメージ1.4倍)
[効] name の物理抑制！ (双方物理ダメージ0.8倍)
[効] name が opponent の ability を忘却の彼方に消し去った！
[効] name の魔封！ (この場で最初に唱える魔法は無効化される)
[効] name が opponent の ability を模倣した！

(遠距離攻撃フェーズ)
[2] ロップ の攻撃！(1/2回)          (🏹 7)
(魔法攻撃フェーズ)
[3] 敵がアルカナアローを唱えた！(5/6回, 共鳴+25%)
[-] ゴン に命中！(2/2回)            (🪄 16)
[-] セルヴァ に命中！(3/4回)         (🪄 16)
[1] セルヴァ がフロストニードルを唱えた！(3/3回, 共鳴+33%)     (❄️ 6)

[2] ロップ の氷属性攻撃は反射された！ (10/17回) (❄️ 8,832 →反射 2,944)

(近接攻撃フェーズ)
[2] ケモ の攻撃！(1/1回)             (⚔ 11)
[2] ゴン の攻撃！(1/1回)             (⚔ 71)
(space)
[末] 再生の神の効果！(HP回復+25)
[末] 消耗の神の効果！(HP消耗-10)
[末] イタチの解錠 石板の盾 を獲得した！(自動売却対象: 10G)
[末] 探索深度に到達した為帰還します
```

- note: [効] text always at the beginning of battle log (before the "(遠距離攻撃フェーズ)" part)
- note: [末] text always at the end of battle log (after the "(近接攻撃フェーズ)" part)

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
  - If (phase is MID) or (phase is LONG and party.`God of Resonance`),
  	- If actor.`a.resonance`1, return 1.0 + (0.05 x (n - 1))   
  	- If actor.`a.resonance`2, return 1.0 + (0.08 x (n - 1))
  	- If actor.`a.resonance`3, return 1.0 + (0.11 x (n - 1))
  	- If actor.`a.resonance`4, return 1.0 + (0.13 x (n - 1))
  	- If actor.`a.resonance`5, return 1.0 + (0.15 x (n - 1))
    Else, return 1.0.

- `f.damage_calculation`: (actor: , opponent: , phase: )
	max(1, (actor.`f.attack` - opponent.`f.defense` x (1 - actor.`f.penet_multiplier`) ) x actor.`f.offense_amplifier` x actor.`f.elemental_offense_attribute` x opponent.`f.elemental_resistance_attribute` x opponent.`f.defense_amplifier` x party.`f.party.offense_amplifier` x `f.resonance_amplifier` x `f.rage_amplifier` x `f.momentum_amplifer` x `f.mutual_amplifer` )
  - `f.rage_amplifier`:
    - If actor has `a.rage`1, return min(2.0, 1.0 + 0.5 x (1 - (actor.current_HP / actor.max_HP)))
    - If actor has `a.rage`2, return min(2.0, 1.0 + 0.6 x (1 - (actor.current_HP / actor.max_HP)))
  - `f.momentum_amplifer`:
    - If actor has `a.momentum`1, return 1.25 - (1 - (actor.current_HP / actor.max_HP)) x 0.5
    - If actor has `a.momentum`2, return 1.25 - (1 - (actor.current_HP / actor.max_HP)) x 0.4
  - note: If actor: enemy, party.`f.party.offense_amplifier` = 1.0
  - `f.mutual_amplifer`:
    - If (phase is MID and (actor or opponent) has `a.mutual-magic-amplify`1), return 1.3
    - If (phase is MID and (actor or opponent) has `a.mutual-magic-restraint`1), return 0.8
	- If (phase is (LONG or CLOSE) and (actor or opponent) has `a.mutual-physical-amplify`2, return 1.4
    - If (phase is (LONG or CLOSE) and (actor or opponent) has `a.mutual-physical-restraint`1, return 0.8

  - If opponent.`a.stealth`1 and (opponent.current_HP / opponent.max_HP) <= 0.24, damage is set to 0. Log:"name は物陰に隠れて攻撃をやり過ごせたのだ！"
  - If opponent.`a.stealth`2 and (opponent.current_HP / opponent.max_HP) <= 0.29, damage is set to 0. Log:"name は物陰に隠れて攻撃をやり過ごせたのだ！"
    - note: This is only for party member ability. enemy have this `a.stealth` ability, then Log:"enemy は神隠れした。もう攻撃はこれ以上あたらない！"

**Row-based modifier** 
- Targeting selects a character only to determine defense, row potency, abilities (counter). All damage resolved against a character is applied to `d.HP`.
  - The threat weight table defines how many tickets of each row index are placed into `t.threat_weight_bag`.

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


- `t.physical_threat_weight_bag` and `t.magical_threat_weight_bag`  Threat Weight (Passive Targeting) 
  - A numerical value assigned to a unit based on their row position that determines the size of their "slice" in the enemy's targeting pool.

- `f.targeting`:
  - If actor.`c.antagonism`, target is opposite. (character -> character. enemy -> enemy)
  - If phase is LONG or CLOSE, Gets one ticket from `t.physical_threat_weight_bag`.
    - `a.bulwark`1 or `a.bulwark`2 redirect 
	  if (`a.bulwark`1 and phase is LONG) or (`a.bulwark`2 and phase is (LONG or CLOSE)):
	      flont_character = party.unit_in_front_of(t)    // the unit directly ahead of selected character (one row closer to enemy)
	      if flont_character != null and flont_character.has(a.bulwark):
	          return flont_character
  - If phase is MID, Gets one ticket from `t.magical_threat_weight_bag`. 
    - Bag contains numbers [1,2,3,4,5,6]
    - The drawn number corresponds to row index (1–6).
    - The character currently occupying that row is selected as the target.


- `d.accuracy_potency` 
  - A global accuracy modifier applied to a unit’s final output based on their current row position.
  - Row-based modifiers apply only to player characters. Enemies are treated as having fixed potency (1.0).
  - Row-based `d.accuracy_potency` is applied only during LONG and CLOSE phases.
  - MID phase ignores row-based accuracy potency, so has fixed potency (1.0).

- **`d.accuracy_potency`**
  - If character.`a.composure`1, min(1, `d.accuracy_potency` + 0.10)
  - If character.`a.composure`2, min(1, `d.accuracy_potency` + 0.13)

|row | normal | `a.hunter`1 | `a.hunter`2 | `a.hunter`3 |
|---|---|---|---|---|
|1| 1.00 | 1.00 | 1.00 | 1.00 |
|2| 0.85 | 0.90 | 0.93 | 0.95 |
|3| 0.72 | 0.81 | 0.86 | 0.90 |
|4| 0.61 | 0.73 | 0.80 | 0.86 |
|5| 0.52 | 0.66 | 0.75 | 0.81 |
|6| 0.44 | 0.59 | 0.70 | 0.77 |


- `f.hit_detection`(actor: , opponent: ,Nth_hit: )
  - For all pahse, LONG, MID, CLOSE.
  - If actor.`a.focus`1, `f.c_accuracy+v` =  actor.`c.accuracy+v` x 1.2 (rounding up to the 3rd decimal ex. 0.003 * 1.2 = 0.0036 → 0.004)
  - If actor.`a.focus`2, `f.c_accuracy+v` =  actor.`c.accuracy+v` x 1.3 (rounding up to the 3rd decimal)
  - decay_of_accuracy: clamp(0.86, 0.90 + actor.`f.c_accuracy+v` - opponent.`c.evasion+v`, 0.98)
  - baseChance = actor.d.accuracy_potency
  - If opponent has `a.deflection`2 AND phase == LONG: baseChance -= 0.15. Else if opponent has `a.deflection`1 AND phase == LONG: baseChance -= 0.10
  - chance = clamp(0.0, baseChance, 1.0) x (decay ^ (Nth_hit - 1))
    - Note: Nth_hit starts at 1 for the first strike.
    - Note: Nth_hit counts indevisually and not share with normal attack, re-attack and counter. (Nth_hit is reset per attack sequence)
  - Roll: Return Random(0, 1.0) <= chance
 

- **`f.counter`(actor: , opponent: ,phase: ) :** IF (opponent or party members have not available `a.null-counter`) and (actor.`a.counter`, phase is CLOSE) , the actor attacks to opponent. (using `f.hit_detection` and `f.damage_calculation`)
    - `a.counter`1: actor.`f.NoA` x 0.5, round up
    - `a.counter`2: actor.`f.NoA` x 1.0, round up
    - `a.counter`3: actor.`f.NoA` x 1.5, round up
    - Counter triggers immediately after damage resolution, regardless of turn order modifiers.
    - IF actor.`a.counter` and (opponent or opponent.party.character have available `a.null-counter`), displays log like : “巡礼者ブラザの反撃無効化により、二枚爪の黒豹のカウンターは防がれた！”. Reduce null-counter counter. (note: `a.null-counter`1 can disable once in battle,  `a.null-counter`2 can disable twice in battle, `a.null-counter`3 can disable three times in battle. if the null-counter is 0, the `a.null-counter` is disable in this battle. )
    - *note:* if opponent is character, then check party.`a.null-counter`. if at least one party member has available `a.null-counter`, nagete the counter attack.

- **`f.re-counter`(actor: , opponent: ,phase: ) :** IF actor.`a.re-counter` and (opponent or opponent.party.character have not `a.null-counter`), the actor attacks to opponent. (using `f.hit_detection` and `f.damage_calculation`)
  	- `a.re-counter`1:   actor.`f.NoA` x 0.5, round up
  	- `a.re-counter`2:   actor.`f.NoA` x 1.0
    - Re Counter triggers immediately after damage resolution, regardless of turn order modifiers.


- **`f.covering-fire`(actor: , opponent: ) :** IF actor.`a.covering-fire` and actor can ranged attack, the actor ranged attacks to opponent. (using `f.hit_detection` and `f.damage_calculation`)
  	- `a.covering-fire`1:   actor.`f.NoA` x 0.5, round up
  	- `a.covering-fire`2:   actor.`f.NoA` x 1.0
    - covering fire triggers immediately after damage resolution, regardless of turn order modifiers.

- **`f.magical-counter`(actor: , opponent: ,phase: ) :** IF actor.`a.magical-counter` and actor can magical attack, the actor magic attacks to opponent. (using `f.hit_detection` and `f.damage_calculation`, and actor.`f.NoA` x 0.5, round up)
  	- `a.magical-counter`1:   actor.`f.NoA` x 0.5, round up
  	- `a.magical-counter`2:   actor.`f.NoA` x 1.0
    - Magical counter triggers immediately after damage resolution, regardless of turn order modifiers.


### 6.3 Turn resolution 
**Speed & Turn Order (Rolling Dice Rule)**
- At the start of each phase (LONG / MID / CLOSE), **each actor** (enemy + each party member) rolls initiative.
  - `a.first-strike`3, roll **4d3** (4~12) cap the result at 9
  - `a.first-strike`2, roll **3d3** (3~9)
  - `a.first-strike`1, roll **2d3** (2~6)
  - No `a.first-strike`, roll **1d3** (1~3)
- Modification 
  - If party.`Goddess of Fertility`, add +1 (cap the result at 9)
  - If actor.`a.slow`1, subtract 1 (minimum 1)
  - If opponent.`a.frostbite`1, subtract 1 (minimum 1)
- Actions are resolved in descending order of roll result.
- Tie-breaker: Enemy > Front row party members > Last row party member.

**Actor action**

- `f.NoA` times, get `f.targeting` -> opponent. 
  	- If `f.hit_detection`(actor: , opponent: , Nth_hit: the current hit index), current party.
  	- If (actor.`e.ice` and opponent.`a.ice-reflect`) or (actor.`e.fire` and opponent.`a.fire-reflect`) or (phase is MID and `a.magical-reflect`), actor.`d,HP` -= `f.damage_calculation` x reflect damage amplifier. log "ロップ の氷属性攻撃は反射された！　(2/4回) " or "セルヴァ がフロストニードルを唱えたが反射された！　(3/3回, 共鳴+33%) "
  	- Else `d.HP` -= `f.damage_calculation` (actor: enemy , opponent: character, phase: phase)
- If current opponent .`d.HP` =< 0, if opponent.`a.resurrect`1, set `d.HP` = 1 and disable `a.resurrect` for this battle. log "ケモは致命ダメージを食いしばって耐えた！" . Else,  Defeat.
- If current opponent.`d.HP` =< 0, if character.`a.resurrect`2, set opponent.`d.HP` = 1% of (opponent.max_HP) and disable the `a.resurrect` for this battle. log "ケモは致命ダメージを食いしばって耐えた！" . Else,  Defeat. 
- If (phase is LONG) and (opponent.`a.illusion`1) and (the `a.illusion` is enable), treats all incoming attack as miss hits, disable the `a.illusion` for this battle. log "ポンタへの攻撃はすべて幻だった！".
- If (phase is LONG) and (opponent.party.character.`a.illusion`2) and (the `a.illusion` is enable), treats all incoming attack as miss hits, disable the `a.illusion` for this battle. log "nameへの攻撃はすべて幻だった！".

- **Coutner:** `f.counter`(actor:actor , opponent:opponent ,phase: )
  - **Re-counter** If opponent.`a.re-counter`, `f.re-counter`(actor:opponent , opponent:actor ,phase: )
- **Re-attack**: IF actor.`a.re-attack`, the actor attacks to opponent. (using f.hit_detection, f.damage_calculation)
   	- `a.re-attack`1: One attack and actor.`f.NoA` x 0.5, round up
  	- `a.re-attack`2: One attack and actor.`f.NoA` x 0.7, round up
  	- `a.re-attack`3: One attack and actor.`f.NoA` x 1.0
- **Magical counter:** If opponent.`a.magical-counter` and phase is MID, `f.magical-counter`(actor:opponent, opponent:actor ,phase: )

- **Covering fire:** IF actor.`a.covering-fire` and the actor's successful hit is only one and phase is CLOSE, `f.covering-fire`(actor:covering fire actor.party.character , opponent:opponent)

- *Note:*  Nth_hit is per action based (not per-target)

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
  - Elite Rooms (`x.floor`:1-5, `x.room`:4): If `God of Restoration`, **Heal 20% of missing HP** (show the log). IF `God of Attrition`,  **reduce 5% of remaining HP** (show the log).
  - If the party.`d.HP` <= 30% of max HP, back to home with trophies. (excpetion: the Final Boss room)  -> `Wonded_Retreat`
  - Normal Rooms (`x.room`:1–2): Proceed to the next `x.room`.
  - Gate Rooms (`x.room`: 3 check): At the end of Room 3, the "Loot-Gate" check occurs. If passed, proceed to `x.room`:4 (Elite/Boss).
  - Elite Rooms (`x.floor`:1-5, `x.room`:4): Proceed to the next floor: `x.floor` +1 , `x.room`:1.
  - Final Boss Room (`x.floor`:6, `x.room`:4): Expedition Clear! Return Home with all trophies.

- *Draw*:no penalties (current version). no `d.experience` points nor item reward at this room. Back to home with trophies of previous rooms.


## 7. REWARD 

- For every item listed in the enemy's potential drop items,
  - If the item is common,
    - Get one ticket from `t.common_reward_bag`. One more with `c.unlock`, One more with `m.luna`, One more with `Goddess of Discord` or `God of Oblivion`(rank 10 or more).
	- If `t.reward_bag`.value = '1', then get one ticket from `t.common_enhancement_bag`.
      - If (mode is `m.laika`) and `t.enhancement_bag`.value >= 5, then treats `t.enhancement_bag`.value as 4.
    - If `t.enhancement_bag`.value >= 1 and ( mode is not `m.laika`), then get one ticket from `t.superRare_bag`.
  - If the item is uncommon,
    - Gets one ticket from `t.uncommon_reward_bag`. One more with `c.unlock`, One more with `m.luna`, One more with `Goddess of Discord` or `God of Oblivion`(rank 10 or more).
    - If `t.uncommon_reward_bag`.value = '1', then get one ticket from `t.enhancement_bag`.
      - If (mode is `m.laika`) and `t.enhancement_bag`.value >= 5, then treats `t.enhancement_bag`.value as 4.   
    - If `t.enhancement_bag`.value >= 1 and ( mode is not `m.laika`), then get one ticket from `t.superRare_bag`.
  - If the item is rare,
    - Gets one ticket from `t.rare_reward_bag`. One more with `c.unlock`, One more with `m.luna`, One more with `Goddess of Discord` or `God of Oblivion`(rank 10 or more).
    - If `t.rare_reward_bag`.value = '1', then get one ticket from `t.enhancement_bag`.
      - If (mode is `m.laika`) and `t.enhancement_bag`.value >= 5, then treats `t.enhancement_bag`.value as 4.
    - If `t.enhancement_bag`.value >= 1 and ( mode is not `m.laika`), then get one ticket from `t.superRare_bag`.
  - If the item is mythic,
    - Gets one ticket from `t.mythic_reward_bag`. One more with `c.unlock`, One more with `m.luna`, One more with `Goddess of Discord` or `God of Oblivion`(rank 10 or more).
    - If `t.rare_mythic_bag`.value = '1', then get one ticket from `t.enhancement_bag`.
      - If (mode is `m.laika`) and `t.enhancement_bag`.value >= 5, then treats `t.enhancement_bag`.value as 4.
    - If `t.enhancement_bag`.value >= 1 and ( mode is not `m.laika`), then get one ticket from `t.superRare_bag`.

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
