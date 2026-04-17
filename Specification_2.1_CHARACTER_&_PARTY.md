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

| races      |体,力,知,精| default ability　 | unlock ability       | c. bonus      | selectable |
|------------|-----------|-------------------|----------------------|--------------|------------|
| Lupinian   |10,12, 8, 7| `a.rage`1         | `a.re-counter`1      | `c.katana_x1.3`,   `c.wand_x1.2`,     `c.equip_slot+1`, `c.ice-defense-multiplier_x2/3`| `true` |
| Vulpinian  |11,10,12, 8| `a.momentum`1     | `a.cunning`1         | `c.sword_x1.3`,    `c.grimoire_x1.2`, `c.equip_slot+1`| `true` |
| Felidian   | 9, 9,10,13| `a.first-strike`1 | `a.covering-fire`1   | `c.robe_x1.3`,     `c.sword_x1.1`,    `c.arrow_x1.1`, `c.fire-defense-multiplier_x2/3`| `true` |
| Caninian   |10,10,10,10| `a.seeker`1       | `a.resurrect`1       | `c.shield_x1.3`,   `c.gauntlet_x1.2`, `c.archery_x1.1`, `c.growth_x1.1`| `true` |
| Ursan      |13,11, 7, 7| `a.bulwark`1      | `a.cyborgization`1   | `c.catalyst_x1.3`, `c.katana_x1.1`,   `c.equip_slot+2`| `true` |
| Procyonian |14, 8, 8, 6| `a.resonance`1    | `a.illusion`1        | `c.grimoire_x1.3`, `c.katana_x1.2`,   `c.robe_x1.2`,  `c.equip_slot+1`, `c.thunder-defense-multiplier_x2/3` | `true` |
| Leporian   | 9, 8,14,10| `a.composure`1    | `a.magical-counter`1 | `c.arrow_x1.3`,  `c.sword_x1.2`,    `c.armor_x1.3`| `true` |
| Cervin     | 8, 7,13,11| `a.focus`1        | `a.prophecy`1        | `c.wand_x1.3`,     `c.gauntlet_x1.2`, `c.shield_x1.2`| `true` |
| Murid      | 7, 8,11,14| `a.stealth`1      | (none)               | `c.bolt_x1.3`,     `c.grimoire_x1.3`  `c.penet+0.10` | `true` |
| Kemoria    |10,10,10,10| (none)            | (none)               | `c.growth_x1.2`, `c.equip_ranged`, `c.equip_melee`  | `false` |
| Orcinian   |11,13,10, 8| `a.execution` 1   | `a.overwatch`1       | `c.archery_x1.2`, `c.catalyst_x1.2`, `c.equip_slot+2` | `false` |
| Avianv     | 8,11,11, 9| `a.flying`1       | (none)               | `c.gauntlet_x1.3`, `c.penet+0.15`  | `false` |

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
| Kemoria | ケモリア | 雑食 | origin | N |
| Orcinian | オルシニアン | 肉食 | orca | N |
| Avian | アヴィアン | 雑食 | 🐓bird | N |

**classes:**

| key | Japanese | short name | main/sub bonuses | main bonus | master bonus |
|-----|----------|------------|------------------|------------|--------------|
| class.duelist | 剣士 | 剣 | `c.equip_melee`, `c.sword_x1.4`, `c.bolt_x1.1` | `a.counter`1 | `a.counter`2 |
| class.samurai | 侍 | 侍 | `c.equip_melee`, `c.katana_x1.4`, `c.archery_x1.2` | `a.iaigiri`1 | `a.iaigiri`2 |
| class.sword-saint | 剣聖 | 聖 | `c.equip_melee`, `c.gauntlet_x1.4`, `c.grimoire_x1.1`, `c.equip_slot+1` | `a.re-attack`1 | `a.re-attack`2 |
| class.ranger | 狩人 | 狩 | `c.equip_ranged`, `c.arrow_x1.4`, `c.sword_x1.1` | `a.hunter`1 | `a.hunter`2 |
| class.striker | 弩手 | 弩 | `c.equip_ranged`, `c.bolt_x1.4`, `c.katana_x1.1` | `a.heavy-strike`1 | `a.heavy-strike`2 |
| class.ninja | 忍者 | 忍 | `c.equip_ranged`, `c.archery_x1.4`, `c.wand_x1.1`, `c.equip_slot+1` | `a.first-strike`1 | `a.first-strike`2 |
| class.wizard | 魔法使い | 魔 | `c.equip_magic`, `c.wand_x1.4`, `c.bolt_x1.1` | `a.resonance`1 | `a.resonance`2 |
| class.sage | 賢者 | 賢 | `c.equip_magic`, `c.grimoire_x1.4`, `c.sword_x1.2` | `a.arc-magic`1 | `a.arc-magic`2 |
| class.alchemist | 錬金術師 | 錬 | `c.equip_magic`, `c.catalyst_x1.4`, `c.robe_x1.1`, `c.equip_slot+1` | `a.arcane-stability`1 | `a.arcane-stability`2 |
| class.guardian | 防人 | 防 | `c.armor_x1.4`, `c.equip_slot+2` | `a.defender`1 | `a.defender`2 |
| class.pilgrim | 巡礼者 | 巡 | `c.robe_x1.4`, `c.equip_slot+2` | `a.m-barrier`1, `a.tithe`1 | `a.m-barrier`2, `a.tithe`1 |
| class.lord | 君主 | 君 | `c.shield_x1.4`, `c.equip_slot+2` | `a.command`1, `a.squander`1 | `a.command`2, `a.squander`1 |

**lineage(系譜):**

-Selectable:
  - `true`: Available for player selection during character creation or edit.
  - `false`: Not available for manual selection (e.g., reserved for unique characters, events, or system assignment).

| lineage |　Text | short | category | bonus | selectable |
|--------|-----|------|----------|-------|------|
| `sandstorm` | 砂塵の系譜 | 砂 | 動乱 | `c.sword_x1.2` | `true` |
| `ashen_capital` | 灰都の系譜 | 灰 | 動乱 | `c.katana_x1.2` | `true` |
| `blaze_peak` | 焔嶺の系譜 | 焔 | 動乱 | `c.gauntlet_x1.2`, `c.fire-defense-multiplier_x4/5` | `true` |
| `abyssal_sea` | 深海の系譜 | 海 | 狩猟 | `c.arrow_x1.2` | `true` |
| `firmament` | 天穹の系譜 | 穹 | 狩猟 | `c.bolt_x1.2` | `true` |
| `frozen_forest` | 凍森の系譜 | 凍 | 狩猟 | `c.archery_x1.2`, `c.ice-defense-multiplier_x4/5` | `true` |
| `utopia` | 桃源の系譜 | 桃 | 学識 | `c.wand_x1.2` | `true` |
| `machina` | 機骸の系譜 | 機 | 学識 | `c.grimoire_x1.2` | `true` |
| `adaptation` | 適応の系譜 | 適 | 学識 | `c.catalyst_x1.2`, `c.thunder-defense-multiplier_x3/4` | `true` |
| `fragment` | 断章の系譜 | 断 | 生存 | `c.armor_x1.2` | `true` |
| `windcross` | 風渡の系譜 | 風 | 生存 | `c.robe_x1.2` | `true` |
| `oath` | 誓約の系譜 | 誓 | 生存 | `c.shield_x1.2` | `true` |
| `unascertained` | 不詳 | 不 | - | `c.armor_x1.3`, `c.robe_x1.3` | `false` |
| `pioneer` | 先駆者 | 先 | - | `c.wand_x1.3`, `a.howl`1 | `false` |
| `almighty` | 全能 | 全 | - | `c.growth_x1.3`, `c.sword_x1.3`, `c.arrow_x1.3`, `c.wand_x1.3` | `false` |
| `hidden_grail` | 隠された杯  | - | `c.evasion+0.010`, `c.robe_x1.3`  | `false` |
| `rowdy_orca_girl` | わんぱくシャチ娘 | - | `a.bind`1, `c.sword_x1.2`, `c.arrow_x1.2` | `false` |
| `meddlesome_fox` | 世話焼き狐 | - | `a.defender`1, `c.shield_x1.3`  | `false` |
| `crescent_jade` | 三日月瑶 | - | `a.death-touch`1, `c.wand_x1.1`, `c.robe_x1.1` | `false` |
| `phantom_thief` | 怪盗 | - | | `false` |
| `flamebound_grove` | 炎の杜 | - | | `false` |
| `apostate` | 背教者 | - | | `false` |
| `incarnation ` | 化身 | 化 | - | `a.boost`1, `a.prophecy`1 | `false` |
| `true_heir` | 真の継承者 | 真 | - |  `c.arrow_x1.3`, `c.armor_x1.2`, `a.re-counter`1 | `false` |
| `apex_predator` | エーペックスプレデター | 捕 | - | `c.katana_x1.2`, `c.grimoire_x1.2`, `c.upgrade_first-strike` | `false` |
| `usurper` | 簒奪者 | 簒 | - | `a.predator-sense`1, `c.catalyst_x1.3` | `false` |



**predisposition(性格):**
-Selectable:
  - `true`: Available for player selection during character creation or edit.
  - `false`: Not available for manual selection (e.g., reserved for unique characters, events, or system assignment).


| predisposition | Japanese | short | category | bonus | selectable |
|-----|-----|---|-----|-----------|--------|
| Aggressive | 好戦| 好 | 外向的 | `c.sword_x1.1`, `c.bolt_x1.1`, `c.catalyst_x1.1` | `true` |
| Inquisitive | 探求 | 探 | 外向的 | `c.katana_x1.1`, `c.arrow_x1.1`, `c.grimoire_x1.1` | `true` |
| Amicable | 親和 | 和 | 外向的 | `c.gauntlet_x1.1`, `c.bolt_x1.1`, `c.wand_x1.1` | `true` |
| Stubborn | 頑固 | 頑 | 内向的 | `c.shield_x1.1`, `b.vitality+1` | `true` |
| Evasive | 責任回避 | 避 | 内向的 | `c.evasion+0.020`, `b.mind+1` | `true` |
| Introspective | 内省 | 内 | 内向的 | `c.armor_x1.1`, `c.robe_x1.1` | `true` |
| Devoted | 献身 | 献 | 適応 | `c.growth_x1.1`, `c.fire-defense-multiplier_x4/5` | `true` |
| Serenity | 冷静 | 冷 | 適応 | `c.growth_x1.1`, `c.ice-defense-multiplier_x4/5` | `true` |
| Nimble | 軽快 | 軽 | 適応 | `c.evasion+0.010`, `c.thunder-defense-multiplier_x4/5` | `true` |
| Perceptive | 看破 | 看 | 機知 | `c.penet+0.100`, `b.intelligence+1` | `true` |
| Exacting | 精確 | 精 | 機知 | `c.accuracy+0.025`, `b.strength+1` | `true` |
| Savvy | 手腕 | 腕 | 機知 | `c.equip-slot+1` | `true` |

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
  - max(0, 0.00070 × (n - 7))
  - max(0, 0.00035 × (n - 14))
  - max(0, 0.00018 × (n - 21))
  - max(0, 0.00008 × (n - 28))
  - max(0, 0.00004 × (n - 35))
  - max(0, 0.00002 × (n - 42))
  - max(0, 0.00001 × (n - 49))
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
    - If character.`a.heavy-strike`, halve these number of attacks, round up. 
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
    - If character has `a.heavy-strike`: multiply by N. 
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
  + {(  3.0 x `b.mind` + 3.0 x `b.vitality` + (`L_eff` x `b.vitality` x (`b.vitality`  + `b.mind`) / 20 ) x `c.growth_xV`), round off}
```

- If character has c.growth_x1.6 and c.growth_x1.3, then 1.6 x 1.3 -> 2.08

```
`L_eff` =
  (level) * (
    1
    + max(0, (level - 7)/28) x 1.0
    + max(0, (level - 14)/28) x 1.9
    + max(0, (level - 21)/28) x 1.8
    + max(0, (level - 28)/28) x 1.7
    + max(0, (level - 35)/28) x 1.6
    + max(0, (level - 42)/28) x 1.5
    + max(0, (level - 49)/28) x 1.4
    + max(0, (level - 56)/28) x 1.3
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

| God | Name | Effect | ability | Scaling of rank up |
|-|-|-|-|-|
| none | 信仰なし | なし | (none) | (none) |
| Goddess of Restoration | 再生の女神 | At the end of every 4th room,  Heal 20% of missing HP, longer sleep 睡眠中 by x2.0, weak against ice (x1.5) | `r.ice_x1.5` | +0.1% Heal per rank |
| God of Attrition | 消耗の神 |  Add `c.deity_physical_attack_x1.20` to each party member. At the end of every 4th room, reduce 5% of remaining HP.| | +0.01 to `c.diety+attack_x1.20` per rank |
| God of Cunning | 狡猾の神 | Add `c.deity_magical_defense_x2/3` to each party member, abscond (lower saving money by x0.50) | (none) | saving money +0.01 to x0.50 per rank |
| God of Fortification | 防備の神 |  Add `c.deity_physical_defense_x2/3` to each party member, longer healing 休息中 by x2.0, weak against thunder (x1.5) | `r.thunder_x1.5` | - |
| Goddess of Fertility | 豊穣の女神 |  Add `c.deity_move_first+1` to each party member, longer fest 宴会中 by 2.0, weak against fire (x1.5) | `r.fire_x1.5` | -  |
| God of Resonance | 共鳴の神 | Upgrade all `a.resonance` values by +1 tier to each party member, resonance works in MID phase and also in LONG phase with God of Resonance. Add `c.deity_magical_defense_x1.10` to each party member, Add `c.deity_HP_x0.900` to party | (none) | +0.2 to `a.resonance` bonus (round down), +0.002 to `c.deity_HP_x0.900` per rank |
| Goddess of Precision | 精密の女神 | Add `c.deity_accuracy+0.015`, `c.deity_evasion-0.005` to each party member, longer 探索中 by 2.0 | (none) | +0.001 to `c.deity_accuracy+0.020` per rank |
| God of Fate | 運命の神 | alter future, longer praying 祈り中 by 2.0 | (none) | praying time -0.01 to x1.5 per rank |
| God of Dusk | 黄昏の神 | Add `c.deity_evasion+0.015`,  `c.deity_magical_defense_x1.10` to each party member, longer trading 売却中 by 2.0 | (none) | +0.001 to `c.deity_accuracy+0.020` per rank |
| Goddess of Mirage | 幻影の女神 | Add `c.deity_magical_attack_x1.20` and `c.deity_pysical_defense_x1.10` to each party member | (none) | +0.01 to `c.deity_magical_attack_x1.20` per rank |
| God of Oblivion | 忘却されし神 | (nothing) | (none) | at rank 10, one more additional reward chance |
| Goddess of Discord | 不和の神 |  At the start of each battle,  1 randomly chosen member gets `c.antagonism`, one more additional reward chance | (none) | (none)  |


#### 2.1.4 INITIALIZATION 

##### 2.1.4.1 Randomness initialization
-  `f.reset_weighted_bag`(bag_key: t.*)
  - bags: `t.common_reward_bag`, `t.common_enhancement_bag`, `t.uncommon_reward_bag`, `t.rare_reward_bag`, `t.mythic_reward_bag`, `t.enhancement_bag`, `t.superRare_bag`, `t.physical_threat_weight_bag`, `t.magical_threat_weight_bag`, `t.side_quest_bag`, and `t.sleepiness_of_party_bag` for each party. 

##### 2.1.4.2 Initial setup
- Initial setup (or reset condition)

- unlocked deity: none (all of other deity is unlocked)
- `Unique`: Unique Character Flag. 
- For PT2 to PT6: `7.1.1 AUTO equipment logic` for all party member.

- Initial state:
  - Gold: 200G
  - `PartyLevel`: 1
  - `xp_current`: 0

- **PT1** Party initial condition.
  - deity: `Goddess of Restoration`

| order | Name | Race | main class | sub class | lineage | predisposition | Initial equipment | Unique |
|------|------|------|------|------|------|------|------|------|
| 1 | ケモ | **Kemoria** | `class.guardian` | `class.pilgrim` | **`unascertained`** | `Devoted` | `1101`, `1110`, `1111`, `1112` | **`true`** |
| 2 | ゴン | Vulpinian | `class.duelist` | `class.pilgrim` | `sandstorm` | `Aggressive` | `1104`, `1106` | `false` |
| 3 | ロップ | Leporian | `class.ranger` | `class.ninja` | `abyssal_sea` | `Inquisitive` | `1107`, `1108`, `1109` |  `false` |
| 4 | ソウタ | Procyonian | `class.ninja`| `class.striker` | `firmament` | `Evasive` |`1104`, `1106`,`1104`, `1106` | `false` |
| 5 | セルフィン | Cervin | `class.wizard` | `class.alchemist` | `utopia` | `Amicable` | `1110`, `1112` | `false` |
| 6 | ライカ | Caninian | `class.sage` | `class.wizard`| **`pioneer`** | `Savvy` | `1110`, `1112`  | **`true`** |

- **PT2** initial condition (when unlocked)
  - deity: `God of Attrition`

| order | Name | Race | main class | sub class | lineage | predisposition | Unique |
|------|------|------|------|------|------|------|------|
| 1 | パーシヴァル | Procyonian | `class.samurai` | `class.guardian` | **`hidden_grail`** | `Inquisitive` | **`true`** |
| 2 | ランスロット | Lupinian | `class.sword-saint` | `class.samurai` | **`almighty`** | `Perceptive` | **`true`** |
| 3 | ルドルフ | Felidian | `class.ranger` | `class.striker` | `abyssal_sea` | `Amicable` | `false` |
| 4 | コソネ | Murid | `class.striker`| `class.striker` | `firmament` | `Aggressive ` | `false` |
| 5 | ルーファス | Caninian | `class.ninja` | `class.striker` | `frozen_forest` | `Aggressive` | `false` |
| 6 | アヤ | Vulpinian | `class.wizard` | `class.sage`| `utopia` | `Serenity` | `false` |

- **PT3** initial condition (when unlocked)
  - deity: `God of Cunning`

| order | Name | Race | main class | sub class | lineage | predisposition | Unique |
|------|------|------|------|------|------|------|------|
| 1 | シマ | Procyonian | `class.pilgrim` | `class.sage` | `machina` | `Nimble` | `false` |
| 2 | オルカ | **Orcinian** | `class.samurai` | `class.ninja` | **`rowdy_orca_girl`** | `Introspective` | **`true`** |
| 3 | シーケルン | Cervin | `class.wizard` | `class.alchemist` | `utopia` | `Amicable` | `false` |
| 4 | レナード | Vulpinian | `class.sage`| `class.lord` | **`meddlesome_fox`** | `Exacting` | **`true`** |
| 5 | アルテミス | Felidian | `class.alchemist` | `class.wizard` | `machina` | `Serenity` | `false` |
| 6 | ウォッシ | Lupinian | `class.ninja` | `class.wizard`| `windcross` | `Perceptive` | `false` |

- **PT4** initial condition (when unlocked)
  - deity: `Goddess of Fertility`

| order | Name | Race | main class | sub class | lineage | predisposition | Unique |
|------|------|------|------|------|------|------|------|
| 1 | グレン | Ursan | `class.guardian` | `class.guardian` | `fragment` | `Stubborn` | `false` |
| 2 | ロス | Caninian | `class.lord` | `class.wizard` | `machina` | `Savvy` | `false` |
| 3 | ルナ | Felidian | `class.sword-saint` | `class.duelist` | **`crescent_jade`** | `Perceptive` | **`true`** |
| 4 | ラビ | Lupinian | `class.duelist` | `class.samurai` | `blaze_peak` | `Inquisitive` | `false` |
| 5 | ノクス | Murid | `class.striker`| `class.ninja` | **`phantom_thief`** | `Aggressive` | **`true`** |
| 6 | フェン | Vulpinian | `class.sage` | `class.wizard`| `adaptation` | `Amicable` | `false` |

- **PT5** initial condition (when unlocked)
  - deity:  `God of Fortification`

| order | Name | Race | main class | sub class | lineage | predisposition | Unique |
|------|------|------|------|------|------|------|------|
| 1 | ミシュカ | Ursan | `class.lord` | `class.ninja` | **`apostate`** | `Stubborn` | **`true`** |
| 2 | プチーツァ | **Avian** | `class.ninja` | `class.ranger` | **`abyssal_sea`** | `Evasive` | **`true`** |
| 3 | ファー | Leporian | `class.ranger` | `class.guardian` | `abyssal_sea` | `Exacting` | `false` |
| 4 | ヴェリタス | Felidian | `class.striker`| `class.pilgrim` | `firmament` | `Devoted` | `false` |
| 5 | グレイ | Lupinian | `class.striker` | `class.ranger` | `firmament` | `Aggressive` | `false` |
| 6 | セトラ | Cervin | `class.wizard` | `class.wizard` | `utopia` | `Savvy` | `false` |

- **PT6** initial condition (when unlocked)
  - deity: `God of Resonance`

| order | Name | Race | main class | sub class | lineage | predisposition | Unique |
|------|------|------|------|------|------|------|------|
| 1 | ドンガ | Ursan | `class.pilgrim` | `class.wizard` | `fragment` | `Introspective` | `false` |
| 2 | ミィス | Caninian | `class.wizard` | `class.ranger` | `abyssal_sea` | `Inquisitive` | `false` |
| 3 | フィン | Leporian | `class.sword-saint` | `class.ranger` | **`true_heir`** | `Evasive` | **`true`** |
| 4 | ケラ | Procyonian | `class.alchemist`| `class.alchemist` | `adaptation` | `Amicable` | `false` |
| 5 | マーレ | Cervin | `class.wizard` | `class.sage` | **`incarnation`** | `Amicable` | **`true`** |
| 6 | ディル | Murid | `class.wizard` | `class.alchemist` | `utopia` | `Nimble` | `false` |
  

