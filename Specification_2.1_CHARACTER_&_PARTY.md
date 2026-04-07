## 2. CHARACTER_&_PARTY

### 2.1 CHARACTER_&_PARTY


#### 2.1.1 Character
- The deity creates character and assigns 6 Characters to its party. 
- Characters can change their race, class, and name at any time while at HOME.

- id: int
- name: string
- races
- predisposition
- lineage
- main_class
- sub_class

**Character**
- A character is defined by Race, Class and Predisposition
  - Race defines base status
  - Class defines combat behavior modifiers and equipment bonuses
  - Predisposition defines additional modifiers
  - Characters have no individual HP

**Base Status Parameters**
- Each character has the following base status values: 
    - `b.vitality`: 体, 体力. contributes to physical defense and `d.HP`
    - `b.strength`: 力, 力. contributes to physical attack
    - `b.intelligence`: 知, 知性. contributes to magical attack
    - `b.mind`: 精, 精神. contributes to magical defense and `d.HP`


**races(種族):**

| races      |体,力,知,精| default ability　 | unlock ability       | c. bonus      | 
|------------|-----------|-------------------|----------------------|--------------|
| Lupinian   |10,12, 8, 7| `a.rage`1         | `a.re-counter`1      | `c.katana_x1.3`,   `c.wand_x1.2`,     `c.equip_slot+1`, `c.ice-defense-multiplier_x2/3`|
| Vulpinian  |11,10,12, 8| `a.momentum`1     | `a.cunning`1         | `c.sword_x1.3`,    `c.grimoire_x1.2`, `c.equip_slot+1`|
| Felidian   | 9, 9,10,13| `a.first-strike`1 | `a.covering-fire`1   | `c.robe_x1.3`,     `c.sword_x1.1`,    `c.arrow_x1.1`, `c.fire-defense-multiplier_x2/3`|
| Caninian   |10,10,10,10| `a.seeker`1       | `a.resurrect`1       | `c.shield_x1.3`,   `c.gauntlet_x1.2`, `c.archery_x1.1`, `c.growth_x1.1`|
| Ursan      |13,11, 7, 7| `a.bulwark`1      | `a.cyborgization`1   | `c.catalyst_x1.3`, `c.katana_x1.1`,   `c.equip_slot+2`|
| Procyonian |14, 8, 8, 6| `a.resonance`1 | `a.illusion`1          | `c.grimoire_x1.3`, `c.katana_x1.2`,   `c.robe_x1.2`,  `c.equip_slot+1`, `c.thunder-defense-multiplier_x2/3` |
| Leporian   | 9, 8,14,10| `a.composure`1    | `a.magical-counter`1 | `c.arrow_x1.3`,  `c.sword_x1.2`,    `c.armor_x1.3`|
| Cervin     | 8, 7,13,11| `a.focus`1        | `a.prophecy`1        | `c.wand_x1.3`,     `c.gauntlet_x1.2`, `c.shield_x1.2`|
| Murid      | 7, 8,11,14| `a.stealth`1      | (none)               | `c.bolt_x1.3`,     `c.grimoire_x1.3`  `c.penet+0.10` |

| races | Japanese name | category | concept | availability |
|------|----------------|----------|--------|--------------|
| Lupinian | ルピニアン | 肉食 | 🐺Wolf | Y |
| Vulpinian | ヴァルピニアン | 肉食 | 🦊Fox | Y |
| Felidian | フェリディアン | 肉食 | 😺Cat | Y |
| Mustelid | マステリド | 肉食 | 🦡Ferret | N |
| Caninian | ケイナイアン | 雑食 | 🐶Dog | Y |
| Ursan | ウルサン | 雑食 | 🐻Bear | Y |
| Procyonian | プロキオニアン | 雑食 | 🦝Tanuki | Y |
| Suinian | スイニアン | 雑食 | 🐗Boar | N |
| Leporian | レポリアン | 草食 | 🐰Rabbit | Y |
| Cervin | セルヴィン | 草食 | 🦌Deer | Y |
| Murid | ミュリッド | 草食 | 🐭Mouse | Y |
| Caprion | カプリオン | 草食 | 🐐Goat | N |

**classes:**

| key | Japanese | short name | main/sub bonuses | main bonus | master bonus |
|-----|----------|------------|------------------|------------|--------------|
| class.duelist | 剣士 | 剣 | `c.equip_melee`, `c.sword_x1.4` | `a.counter`1 | `a.counter`2 |
| class.samurai | 侍 | 侍 | `c.equip_melee`, `c.katana_x1.4` | `a.iaigiri`1 | `a.iaigiri`2 |
| class.sword-saint | 剣聖 | 聖 | `c.equip_melee`, `c.gauntlet_x1.4`, `c.equip_slot+1` | `a.re-attack`1 | `a.re-attack`2 |
| class.ranger | 狩人 | 狩 | `c.equip_ranged`, `c.arrow_x1.4` | `a.hunter`1 | `a.hunter`2 |
| class.striker | 弩手 | 弩 | `c.equip_ranged`, `c.bolt_x1.4` | `a.heavy-strike`1 | `a.heavy-strike`2 |
| class.ninja | 忍者 | 忍 | `c.equip_ranged`, `c.archery_x1.4`, `c.equip_slot+1` | `a.first-strike`1 | `a.first-strike`2 |
| class.wizard | 魔法使い | 魔 | `c.equip_magic`, `c.wand_x1.4` | `a.resonance`1 | `a.resonance`2 |
| class.sage | 賢者 | 賢 | `c.equip_magic`, `c.grimoire_x1.4` | `a.arc-magic`1 | `a.arc-magic`2 |
| class.alchemist | 錬金術師 | 錬 | `c.equip_magic`, `c.catalyst_x1.4`, `c.equip_slot+1` | `a.arcane-stability`1 | `a.arcane-stability`2 |
| class.guardian | 防人 | 防 | `c.armor_x1.4`, `c.equip_slot+2` | `a.defender`1 | `a.defender`2 |
| class.pilgrim | 巡礼者 | 巡 | `c.robe_x1.4`, `c.equip_slot+2` | `a.m-barrier`1, `a.tithe`1 | `a.m-barrier`2, `a.tithe`1 |
| class.lord | 君主 | 君 | `c.shield_x1.4`, `c.equip_slot+2` | `a.command`1, `a.squander`1 | `a.command`2, `a.squander`1 |

**lineage(系譜):**

| lineage | short | category | bonus |
|--------|------|----------|-------|
| 砂塵の系譜 | 砂 | 動乱 | `c.sword_x1.2` |
| 灰都の系譜 | 灰 | 動乱 | `c.katana_x1.2` |
| 焔嶺の系譜 | 焔 | 動乱 | `c.gauntlet_x1.2`, `c.fire-defense-multiplier_x4/5` |
| 深海の系譜 | 海 | 狩猟 | `c.arrow_x1.2` |
| 天穹の系譜 | 穹 | 狩猟 | `c.bolt_x1.2` |
| 凍森の系譜 | 凍 | 狩猟 | `c.archery_x1.2`, `c.ice-defense-multiplier_x4/5` |
| 桃源の系譜 | 桃 | 学識 | `c.wand_x1.2` |
| 機骸の系譜 | 機 | 学識 | `c.grimoire_x1.2` |
| 適応の系譜 | 適 | 学識 | `c.catalyst_x1.2`, `c.thunder-defense-multiplier_x3/4` |
| 断章の系譜 | 断 | 生存 | `c.armor_x1.2` |
| 風渡の系譜 | 風 | 生存 | `c.robe_x1.2` |
| 誓約の系譜 | 誓 | 生存 | `c.shield_x1.2` |


**predisposition(性格):**


| predisposition | Japanese | short | category | bonus |
|-----|-----|---|-----|-----------|
| Aggressive | 好戦| 好 | 外向的 | `c.sword_x1.1`, `c.bolt_x1.1`, `c.catalyst_x1.1` |
| Inquisitive | 探求 | 探 | 外向的 | `c.katana_x1.1`, `c.arrow_x1.1`, `c.grimoire_x1.1` |
| Amicable | 親和 | 和 | 外向的 | `c.gauntlet_x1.1`, `c.bolt_x1.1`, `c.wand_x1.1` |
| Stubborn | 頑固 | 頑 | 内向的 | `c.shield_x1.1`, `b.vitality+1` |
| Shirk | 責任回避 | 避 | 内向的 | `c.evasion+0.020`, `b.mind+1` |
| Introspective | 内省 | 内 | 内向的 | `c.armor_x1.1`, `c.robe_x1.1` |
| Devoted | 献身 | 献 | 適応 | `c.growth_x1.1`, `c.fire-defense-multiplier_x4/5` |
| Serenity | 冷静 | 冷 | 適応 | `c.growth_x1.1`, `c.ice-defense-multiplier_x4/5` |
| Nimble | 軽快 | 軽 | 適応 | `c.evasion+0.010`, `c.thunder-defense-multiplier_x4/5` |
| Perceptive | 看破 | 看 | 機知 | `c.penet+0.010`, `b.intelligence+1` |
| Exacting | 精確 | 精 | 機知 | `c.accuracy+0.025`, `b.strength+1` |
| Savvy | 手腕 | 腕 | 機知 | `c.equip-slot+1` |

- If `main_class` and  `sub_class` are same class, then it turns into master class, applies master bonus.
- `main_class` applies main/sub bonuses and main bonus. `sub_class` applies only main/sub bonuses.
- Only the strongest single ability(a.) of the same name applies.
- Only one single bonuses(c.) of the **exact** same name applies. (`c.equip_slot+2` and `c.equip_slot+1` then +3 slots. two `c.equip_slot+2`, but only one `c.equip_slot+2` works)
 (`c.armor_x1.4`, `c.armor_x1.3`, `c.armor_x1.3` =>1.4 x 1.3 = x 1.82 -> 1.8 (for display))


##### 2.1.1.1 Level and slots
- Experience and level are party-wide. Characters do not have individual levels; all level-based effects reference Party level.
- max_level: 69. (current version restriction)

- Equipment slots for individual character
	-`maximum_equipped_item`= base slots + class_bonuses (`c.equip_slot+1`, `c.equip_slot+2` )
  	- Where class_bonuses is the sum of unique values from Main and Sub class. Example: If Main Class provides `c.equip_slot+2` and Sub Class provides `c.equip_slot+1`, class_bonuses is 3. If both provide `c.equip_slot+2`, bonus_sum is 2.

- `f.equipment_slots`

|level | base slots |
|-----|-----------|
| 1 | 1 |
| 3 | 2 |
| 6 | 3 |
| 10 | 4 |
| 14 | 5 |
| 19 | 6 |
| 24 | 7 |
| 30 | 8 |
| 36 | 9 |
| 43 | 10 |
| 50 | 11 |
| 57 | 12 |
| 65 | 13 |
| 73 | 14 |
| 81 | 15 |
| 90 | 16 |
| 99 | 17 |


- Base status update: add (b.) modifiers. (ex. `b.vitality` = 10(from race) + `b.vitality+2` -> 12

**Experience and level and experience point**
- Each party has its own `PartyLevel` and `xp_current`.
- Experience point to next is calculated:
```
  - N=1 to 99
`f.XP_to_next`(level: ) = 1000 x (
  1.259
  - max(0, 0.00085 × (n - 12))
  - max(0, 0.00042 × (n - 24))
  - max(0, 0.00018 × (n - 36))
  - max(0, 0.00006 × (n - 48))
)^(level - 1) round up
```
- When the party levels up:
  - `PartyLevel` += 1
  - `xp_current` = 0
  - Any overflow XP is discarded.

- Multipliers
  - `f.experience`: master value x `x.enemy_level` x `x.enemyTypeExpMult` x  `x.experience_penalty`
    - `x.enemyTypeExpMult`: Normal = 1.0, Elite = 1.25, Boss = 1.5, Gods =3.0
    - Over-level penalty: `x.experience_penalty` = (1/2) ^ max(0, `PartyLevel` - `x.enemy_level`)

- Total gained XP:
  - `f.calculate_experience` = `d.experience` x `x.mult_rank` x `x.exp_experience_mult` x `x.experience_penalty`
  - The XP is accumulated as float and ceiled once at the end of an `x.expedition` when applied to `xp_current`. 


##### 2.1.1.2 Multiplier and Functions

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
  - `d.ranged_NoA` = 0 + Item Bonuses of {(`d.ranged_NoA` x enhancement multiplier x super rare multiplier x its c.multiplier + `c.ranged_NoA+v`), round up} 
    - If character.`a.iaigiri` or `a.heavy-strike`, halve these number of attacks, round up. 
  - `d.magical_NoA`= 0 + Item Bonuses of {(`d.magical_NoA` x enhancement multiplier x super rare multiplier x its c.multiplier + `c.magical_NoA+v`), round up}
    - If character.`a.arc-magic`: reduce this number of attacks to 1/3, round up.

  - `d.melee_NoA`= 0 + Item Bonuses of {(`d.melee_NoA` x enhancement multiplier x super rare multiplier x its c.multiplier + `c.melee_NoA+v`), round off} 
    - If character.`a.iaigiri` or `a.heavy-strike`: halve these number of attacks, round up.
  - *note: `c.ranged_NoA+v`, `c.magical_NoA+v`, `c.melee_NoA+v`  Only one single bonuses(c.) of the **exact** same name applies.  

- character.`f.attack`:
  - `d.ranged_attack`= Item Bonuses of {(`d.ranged_attack` x enhancement multiplier x super rare multiplier x its c.multiplier), round off}
  - `d.melee_attack`= Item Bonuses of {(`d.melee_attack` x enhancement multiplier x super rare multiplier x its c.multiplier), round off}
  - `d.magical_attack`= Item Bonuses of of {(`d.magical_attack`  x enhancement multiplier x super rare multiplier x its c.multiplier), round off}

- character.`f.offense_amplifier` (phase: )
  - If phase is LONG or CLOSE,
    - If character.`a.iaigiri`, return v x sum of ( `c.melee_attack+v` or `c.ranged_attack+v`)　x `c.physical_offense_multiplier_xV` x `f.base_multiplier`(base_type: `b.strength`)
      - `a.iaigiri`1: v *= 1.6
      - `a.iaigiri`2: v *= 1.8
      - `a.iaigiri`3: v *= 2.0
    - Else return 1.0 x sum of ( `c.melee_attack+v`, `c.ranged_attack+v` and `c.physical_attack+v` ) x `c.physical_offense_multiplier_xV` x `f.base_multiplier`(base_type: `b.strength`)
    - If character has `a.heavy-strike`: multiply by N. 
  		- ex. If chracter has `c.physical_offense_multiplier_x1.4` and `c.physical_offense_multiplier_x1.2`, 1.4 x 1.2 = 1.68.
  - If phase is MID,  return 1.0 x  sum of (`c.magical_attack+v` and `c.magical_attack+v` ) x `c.magical_offense_multiplier_xV` x `f.base_multiplier`(base_type: `b.intelligence`)
    - If character.`a.arc-magic`: v *= 3.0
    - ex. If chracter has `c.magical_offense_multiplier_x1.4` and `c.magical_offense_multiplier_x1.2`, 1.4 x 1.2 = 1.68.
  - *note: `c.melee_attack+v`,  `c.ranged_attack+v`, `c.magical_attack+v`, `c.physical_attack+v`, `c.physical_offense_multiplier_xV` or  `c.magical_offense_multiplier_xV`. Only one single bonuses(c.) of the **exact** same name applies.  

- character.`f.defense` (phase: ):
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
  - If character.`c.penet`, add them. (ex. `c.penet+0.10` & `c.penet+0.15` -> 0.25)
  - If character has `a.heavy-strike`: Add ((original NoA) - (current NoA)) x N. 
 

##### 2.1.1.3 Mathematical Precision & Display Rules
- Internal Calculation: All multipliers and final status values are calculated using floating-point precision (e.g., 1.4 * 1.3 = 1.82) to ensure accuracy across multiple stacked bonuses.
- Display Rule (Rounding): For UI and logs, values are rounded to one decimal place (e.g., 1.82 → 1.8).
- Integer Rule: Final damage values and HP values are always floored to the nearest integer for display, though internal logic may retain decimals until the final step.
 
#### 2.1.2 Party
- c.multiplier like `c.amulet_x1.3` applies only for individual character's equipments. 

```
Party.`d.HP` =  
  (Total sum of individual (Item Bonuses of {((HP x enhancement multiplier x super rare multiplier x its c.multiplier ) x (`b.vitality` + `b.mind`) / 20 x `c.growth_xV`) , round off}
  + {(  2.0 x `b.mind` + 2.0 x `b.vitality` + (`L_eff` x `b.vitality` x (`b.vitality`  + `b.mind`) / 20 ) x `c.growth_xV`), round off}
```

- If character has c.growth_x1.6 and c.growth_x1.3, then 1.6 x 1.3 -> 2.08

```
`L_eff` =
  (level) * (
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
    - If flont_row_from_actor_member_has.`a.command`3: multiply x2.43
	- If flont_row_from_actor_member_has.`a.command`2: multiply x1.35
    - If flont_row_from_actor_member_has.`a.command`1: multiply x1.2
- party.`f.abilities_defense_amplifier`(phase: phase):
  - If phase is LONG or CLOSE:
  	- If flont_row_from_actor_member_has.`a.defender`3: multiply x1/2
  	- If flont_row_from_actor_member_has.`a.defender`2: multiply x3/5
	- If flont_row_from_actor_member_has.`a.defender`1: multiply x2/3
  - If phase is MID:
    - If flont_row_from_actor_member_has.`a.m-barrier`3: multiply x1/2
    - If flont_row_from_actor_member_has.`a.m-barrier`2: multiply x3/5
    - If flont_row_from_actor_member_has.`a.m-barrier`1: multiply x2/3
   

**Party structure**
1. Party Properties
- Player party consists of 6 characters. 
- Row Assignment: Party members occupy positions 1 through 6. Row 1 represents the front-most position (highest threat), while Row 6 represents the back-most position (lowest threat).

- All characters participate simultaneously

2. Character Properties
- Each character has:
  	- `f.attack`, `f.NoA`
		- `d.ranged_attack`, `d.ranged_NoA`
	    - `d.magical_attack`, `d.magical_NoA`
	    - `d.melee_attack`, `d.melee_NoA`
    - `f.elemental_offense_attribute`  
		- Has only one type of `none`, `e.fire`, `e.ice`, or `e.thunder`
      	- Has its multiplier like x1.15
    - `f.defense`
	    - `d.physical_defense`
	    - `d.magical_defense`
  	- `f.elemental_resistance_attribute` 
  		- `r.fire`
  		- `r.ice`
  		- `r.thunder`
  	- Equipment slots

- Characters do not have individual HP. Each character contributes total HP. 

#### 2.1.3 Religions lists
- 信仰なし (None) may be selected by multiple parties.
- All other religions are unique and can be assigned to only one party at a time.

| God | Name | Effect | Scaling of rank up |
|-|-|-|-|
| none | 信仰なし | なし | (none) |
| Goddess of Restoration | 再生の女神 | At the end of every 4th room,  Heal 20% of missing HP, longer sleep 睡眠中 by x1.5, weak against ice (x1.5) | +0.1% Heal per rank |
| God of Attrition | 消耗の神 |  Add `c.deity_physical_attack_x1.20` to each party member. At the end of every 4th room, reduce 5% of remaining HP.| +0.01 to `c.diety+attack_x1.20` per rank |
| God of Cunning | 狡猾の神 | Add `c.deity_magical_defense_x2/3` to each party member, abscond (lower saving money by x0.50) | saving money +0.01 to x0.50 per rank |
| God of Fortification | 防備の神 |  Add `c.deity_physical_defense_x2/3` to each party member, longer healing 休息中 by x1.5, weak against thunder (x1.5) | healing time -0.01 to x1.5 per rank |
| Goddess of Fertility | 豊穣の女神 |  Add `c.deity_move_first+1` to each party member, longer fest 宴会中 by 1.5, weak against fire (x1.5) | fest time -0.01 to x1.5 per rank  |
| God of Resonance | 共鳴の神 | Upgrade all `a.resonance` values by +1 tier to each party member, resonance works in MID phase and also in LONG phase with God of Resonance. Add `c.deity_magical_defense_x1.10` to each party member, Add `c.deity_HP_x0.900` to party | +0.2 to `a.resonance` bonus (round down), +0.002 to `c.deity_HP_x0.900` per rank |
| Goddess of Precision | 精密の女神 | Add `c.deity_accuracy+0.015`, `c.deity_evasion-0.005` to each party member, longer 探索中 by 1.5 | +0.001 to `c.deity_accuracy+0.020` per rank |
| God of Fate | 運命の神 | alter future, longer praying 祈り中 by 1.5 | praying time -0.01 to x1.5 per rank |
| God of Dusk | 黄昏の神 | Add `c.deity_evasion+0.015`,  `c.deity_magical_defense_x1.10` to each party member, longer trading 売却中 by 1.5 | +0.001 to `c.deity_accuracy+0.020` per rank |
| Goddess of Mirage | 幻影の女神 | Add `c.deity_magical_attack_x1.20` and `c.deity_pysical_defense_x1.10` to each party member | +0.01 to `c.deity_magical_attack_x1.20` per rank |
| God of Oblivion | 忘却されし神 | (nothing) | at rank 10, one more additional reward chance |
| Goddess of Discord | 不和の神 |  At the start of each battle,  1 randomly chosen member gets `c.antagonism`, one more additional reward chance | (none)  |


#### 2.1.4 INITIALIZATION 

##### 2.1.4.1 Randomness initialization
-  `f.reset_weighted_bag`(bag_key: t.*)
  - bags: `t.common_reward_bag`, `t.common_enhancement_bag`, `t.uncommon_reward_bag`, `t.rare_reward_bag`, `t.mythic_reward_bag`, `t.enhancement_bag`, `t.superRare_bag`, `t.physical_threat_weight_bag`, `t.magical_threat_weight_bag`, `t.side_quest_bag`, and `t.sleepiness_of_party_bag` for each party. 

##### 2.1.4.2 Initial setup
- Initial setup (or reset condition)

- unlocked deity: none (all of other deity is unlocked)

- PT1 Party initial condition.
  1. "ケモ", Caninian, 防(錬), Inquisitive, 断
     - equipment: `1101`, `1110`, `1111`, `1112` 
  2. "ゴン", Vulpinian, 剣(侍), Aggressive, 砂
     - equipment: `1104`, `1106`
  3. "ソウタ", Procyonian, 忍(君), Evasive, 穹
     - equipment: `1104`, `1106`,`1104`, `1106`
  4. "ロップ", Leporian, 狩(巡), Nimble, 海
     - equipment: `1107`, `1108`, `1109`
  5. "ラス", Felidian, 賢(防), Nimble, 適
     - equipment: `1110`, `1111`, `1112` 
  6. "セルヴァ", Cervin, 魔(魔), Stubborn, 腕
     - equipment: `1110`, `1112`

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
  - 7.1.1 AUTO equipment logic for all party member. 
 
- PT3 initial condition (when unlocked)
  - deity: `God of Cunning`
  - party member race: all Vulpinian
  - 7.1.1 AUTO equipment logic for all party member.  

- PT4 initial condition (when unlocked)
  - deity: `God of Fortification`
  - party member race: all Ursan
  - 7.1.1 AUTO equipment logic for all party member.  

- PT5 initial condition (when unlocked)
  - deity: `Goddess of Fertility`
  - party member race: all Felidian
  - 7.1.1 AUTO equipment logic for all party member. 

- PT6 initial condition (when unlocked)
  - deity: `God of Resonance`
  - party member race: all Procyonian
  - 7.1.1 AUTO equipment logic for all party member.
