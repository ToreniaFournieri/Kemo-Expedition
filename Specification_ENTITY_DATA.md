## 2. CONSTANTS & DATA

### 2.3 Play characters
- The deity creates character and assigns 6 Characters to its party. 
- Characters can change their race, class, and name at any time while at HOME.

- id: int
- name: string
- races
- predisposition
- lineage
- main_class
- sub_class

#### 2.3.1 Character 
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

- **races(種族):**

|races | default ability　| unlock ability | unclock condition | bonus | 体,力,知,精 | memo |
|-----|-------|------|--------|--------|-----------|----------|
|ケイナイアン(Caninian) |  `a.seeker`1 | `a.resurrect`1 | `c.unlock_Caninian_ability` | `c.shield_x1.3`, `c.archery_x1.1` |10,10,10,10| 🐶Dog |
|ルピニアン(Lupinian) | `a.rage`1 | `a.re-counter`1 | `c.unlock_Caninian_ability` | `c.equip_slot+1`, `c.katana_x1.3`  |10,12,8,7| 🐺Wolf |
|ヴァルピニアン(Vulpinian) | `a.momentum`1 | `a.cunning`1 | `c.unlock_Vulpinian_ability` |`c.equip_slot+1`, `c.sword_x1.3`, `c.grimoire_x1.2` |11,10,12,8| 🦊Fox |
|ウルサン(Ursan) | `a.bulwark`1 | `a.cyborgization`1 | `c.unlock_Ursan_ability` |`c.equip_slot+2`, `c.catalyst_x1.2` |13,11,**7**,7| 🐻Bear |
|フェリディアン(Felidian)  | `a.first-strike`1 | `a.covering-fire`1 | `c.unlock_Felidian_ability` |`c.robe_x1.3` |9,9,10,12| 😺Cat |
|マステリド(Mustelid) | `a.resonance`1 | `a.peddler`1 | `c.unlock_Mustelid_ability`  | `c.gauntlet_x1.3`, `c.arrow_x1.3` |10,10,9,11| 🦡Ferret |
|レポリアン(Leporian) | `a.composure`1 | `a.magical-counter`1 | `c.unlock_Leporian_ability` | `c.archery_x1.3`,  `c.armor_x1.3` |9,8,11,10| 🐰Rabbit |
|セルヴィン(Cervin)  | `a.focus`1 | `a.prophecy`1 | `c.unlock_Cervin_ability` |`c.wand_x1.3`, `c.shield_x1.2` |8,7,13,10| 🦌Deer |
|ミュリッド(Murid) | `a.stealth`1 | (none) | `c.unlock_Murid_ability` |`c.penet+0.10`, `c.bolt_x1.3`  |9,8,10,10| 🐭Mouse |
|プロキオニアン(Procyonian) | `a.illusion`1 | (none) | `c.unlock_Procyonian_ability` |`c.equip_slot+1`, `c.grimoire_x1.3`  |9,8,10,6| 🦝Tanuki |

- note: 未来視はパーティ単位で管理する方針に　神聖局で、セルヴィンがいる場合に表示可能、またコストを払ってリセットも可能に(詳細は今後検討)



- **predisposition(性格):**

|predisposition | short word | bonus |
|-----|---|-----------|
|頑強 (Sturdy)| 頑 |`b.vitality+2`,  `c.armor_x1.1`|
|俊敏 (Agile)| 俊 | `c.evasion+0.01` |
|聡明 (Brilliant)| 聡 |`c.wand_x1.2`|
|器用 (Dexterous)| 器 |`c.accuracy+0.01`, `c.catalyst_x1.2`|
|騎士道 (Chivalric)| 騎 |`c.sword_x1.2`, `c.bolt_x1.1`|
|士魂 (Shikon)| 士 |`b.strength+1`, `c.katana_x1.1`, `c.arrow_x1.2`|
|追求 (Pursuing)| 追 |`b.intelligence+2`, `c.robe_x1.1`|
|商才 (Canny)| 商 |`c.equip_slot+1`|
|忍耐(Persistent)| 耐 |`b.mind+1`, `c.robe_x1.1`|

- **lineage(家系):**

|lineage | short word | bonus |
|-----|---|-----------|
|鋼誓の家（House of Steel Oath）| 鋼 |`c.sword_x1.3`, `c.catalyst_x1.3` |
|戦魂の家（House of War Spirit）| 魂 |`c.katana_x1.2`, `b.mind+1`|
|遠眼の家（House of Far Sight）| 眼 |`c.arrow_x1.3`, `c.gauntlet_x1.2` |
|不動の家（House of the Unmoving）| 不 |`c.armor_x1.2`, `b.vitality+1` |
|砕手の家（House of the Breaking Hand）| 砕 |`c.gauntlet_x1.2`, `b.strength+1`|
|導智の家（House of Guiding Thought）| 導 |`c.wand_x1.2`,  `c.bolt_x1.2` |
|秘理の家（House of Hidden Principles）| 秘 |`c.robe_x1.2`, `b.intelligence+1`|
|継誓の家（House of Inherited Oaths）| 継 |`c.shield_x1.2`, `b.vitality+1`|

- **classes:**

|class | main/sub bonuses | main bonus | master bonus | 
|-----|-----------|---------|---------|
|戦士(戦,Fighter) | `c.grit+1`, `c.equip_slot+1`,  `c.armor_x1.4` |`a.defender`1 |`a.defender`2 | 
|剣士(剣,Duelist) | `c.grit+1`, `c.sword_x1.4` | `a.counter`1 | `a.counter`2 | 
|忍者(忍,Ninja) | `c.grit+1`, `c.penet+0.15` | `a.re-attack`1 | `a.re-attack`2 | 
|侍(侍,Samurai) | `c.grit+1`, `c.katana_x1.4` |`a.iaigiri`1 | `a.iaigiri`2 |
|君主(君,Lord) | `c.grit+1`, `c.gauntlet_x1.4`, `c.equip_slot+1` |`a.command`1, `a.squander`1 |`a.command`2, `a.squander`1 | 
|狩人(狩,Ranger) | `c.pursuit+2`, `c.arrow_x1.4` | `a.hunter`1: Reduces row-based damage decay from 15% to 10% per step. |`a.hunter`2 | 
|魔法使い(魔,Wizard) | `c.caster+1`, `c.wand_x1.4` | `a.resonance`1 | `a.resonance`2 | 
|賢者(賢,Sage) | `c.caster+2`, `c.robe_x1.4`, `c.grimoire_x1.2`, `c.equip_slot+2` | `a.m-barrier`1 | `a.m-barrier`2 | 
|盗賊(盗,Rogue) | `c.pursuit+1`, `c.unlock` additional reward chance |`a.deflection`, `a.first-strike`1 |`a.deflection`, `a.first-strike`2. | 
|巡礼者(巡,Pilgrim) | `c.caster+1`, `c.grit+1`, `c.evasion+0.02`, `c.equip_slot+1` |`a.null-counter`1, `a.tithe`1 |`a.null-counter`2, `a.tithe`1 | 

- If `main_class` and  `sub_class` are same class, then it turns into master class, applies master bonus.
- `main_class` applies main/sub bonuses and main bonus. `sub_class` applies only main/sub bonuses.
- Only the strongest single ability(a.) of the same name applies.
- Only one single bonuses(c.) of the **exact** same name applies. (`c.equip_slot+2` and `c.equip_slot+1` then +3 slots. two `c.equip_slot+2`, but only one `c.equip_slot+2` works)
 (`c.armor_x1.4`, `c.armor_x1.3`, `c.armor_x1.3` =>1.4 x 1.3 = x 1.82 -> 1.8 (for display))

#### 2.3.2 Party structure 
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

#### 2.3.3 Religions lists
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


### 2.4 Expedition & Enemies
- Expedition layout: The 6 `x.floor` spire. Each floor consists of 4 `x.room`s. the last room of the floor is Elite/Boss enemy battle, other rooms are Normal enemy battles.
- There are 8 `x.expedition` destinations in total. every `x.expedition` has its own tier. (1st `x.expedition` drops tier-1 items. 2nd `x.expedition` drops tier-2 items)

#### 2.4.1 Expedition
- @Specification_Master_Data_Definitions.md, 1 Expedition Definitions

- Strength of enemy by its level 
  - n = `x.enemy_level` (1~99)
  - `x.exp_HP_mult`(n) =
  (1.16 - max(0, 0.0012*(n-25)) - max(0, 0.00006*(n-49)))^n
  - `x.exp_atk_mult`(n) =
  (1.09 - max(0, 0.00055*(n-25)) - max(0, 0.00003*(n-49)))^n
  - `x.exp_atk_amp_mult`(n) =
  (1.04 - max(0, 0.00022*(n-25)) - max(0, 0.000024*(n-49)))^n
  - `x.exp_NoA_mult`(n) =
  (1.05 - max(0, 0.00028*(n-25)) - max(0, 0.00002*(n-49)))^n
  - `x.exp_def_mult`(n)= (1.11 - max(0, 0.00058*(n-25)) - max(0, 0.00004*(n-49)))^n
  - `x.exp_def_amp_mult`(n)= 1.0


- `x.gods_mult`
  - If enemy is god, apllpy them. 

- Normal mode

| `x.god_HP_mult` | `x.god_atk_mult` | `x.god_NoA_mult` | `x.god_atk_amp_mult` | `x.god_def_mult` | `x.god_def_amp_mult` |
|-----|-----|-----|----|----|----|
| x1.5 | x1.1 | x1.3 | x1.2 | x1.1 | x1.0 |

- `debug mode for god battle`

| `x.god_HP_mult` | `x.god_atk_mult` | `x.god_NoA_mult` | `x.god_atk_amp_mult` | `x.god_def_mult` | `x.god_def_amp_mult` |
|-----|-----|-----|----|----|----|
| x0.3 | x0.3 | x0.5 | x0.4 | x0.3 | x1.0 |

- If `m.luna`, add +5 `x.enemy_level` for all enemy 

- **Enemy entity distribution** for each `x.expediton`
  - @Specification_Master.md, 1.1 Standard floor and enemy distribution for Expedition

- **Gods (神魔):**
  - Status calculation: master value is `x.exp_tier`. not using `x.exp_id`'s `x.exp_tier`.

| `x.exp_tier` | `x.enemy_level` | Name | Title | Display name | Class | Represent for | + ability | Drop item tier | Drop item category | `x.exp_id` |
|-|-|-|-|-|-|-|-|-|-|-|
| 3 | 26 | Seiran | Goddess of Restoration | セイラン 再生の女神 | Pilgrim | Caninian | `a.resurrect`2  | 3 | `i.grimoire`, `i.robe`| 1 |
| 4 | 34 | Garv | God of Attrition | ガーヴ 消耗の神 | Samurai | Lupinian | `a.rage`2, `a.re-counter`2 | 4 | `i.katana`, `i.shield` | 2 |
| 5 | 41 | Kyōen | God of Cunning | キョウエン 狡猾の神 | Rougue | Vulpinian | `a.momentum`2 | 5 |  `i.archery`, `i.bolt` | 3 |
| 6 | 49 | Dolvar | God of Fortification | ドルヴァ 防備の神 | Fighter | Ursan | `a.cyborgization`2 | 6 | `i.armor`, `i.gauntlet` | 4 |
| 7 | 58 | Miora | Goddess of Fertility | ミオラ 豊穣の女神  | Sage | Felidian | `a.firststrike`2 | 7 | `i.sword`, `i.catalyst` | 5 |
| 7 | 59 | Rondel | God of Resonance | ロンデル 共鳴の神 | Wizard | Mustelid | `a.resonance`4 | 7 | `i.wand`, `i.arrow` | 6 |
| 8 | 65 | Lira | Goddess of Precision | リラ 精密の女神 | Ranger | Leporian | `a.composure`2 | 8 | `i.arrow`, `i.archery` | 7 |
| 8 | 65 | Forne | God of Fate | フォルネ 運命の神 | Lord | Cervin | `a.focus`2 | 8 | `i.armor`, `i.robe` | 8|
| 8 | 65 | Skuva | God of Dusk | スクヴァ 黄昏の神 | Ninja | Murid | `a.stealth`1 | 8 | `i.sheild`,`i.catalyst` | 9 |
| 8 | 65 | Tanue | Goddess of Mirage | タヌエ 幻影の女神  | Duelist | Procyonian | `a.illusion`1 | 8 | `i.sword`, `i.gauntlet` | 10 |
| 8 | 68 | Noctyra | God of Oblivion | ノクティラ 忘却されし神 | Samurai | - | `a.rage`2, `a.firststrike`2 | 8 | `i.bolt`, `i.katana` | 11 |
| 8 | 68 | Eris | Goddess of discord | エリス 不和の神 | Pilgrim | - | `a.momentum`2, `a.resonance`4, `a.stealth`1 | 8 | `i.grimoire`, `i.wand` | 12 |

#### 2.4.2 Enemy structure (in battle)
- id: int
- type: string.  Normal/Elite/Boss
- x.Spawn_tier
- x.Spawn_pool //only for type.Normal. others (Elite/Boss) set 0.
- name: string
- class
- `d.HP`
- `a.ability`
- `f.attack`, `f.NoA`
	- `d.ranged_attack`, `d.ranged_NoA`
	- `d.magical_attack`, `d.magical_NoA`
	- `d.melee_attack`, `d.melee_NoA`
- `f.offense_amplifier` 
	- `d.ranged_attack_amplifier` // 1.0 as default 
	- `d.magical_attack_amplifier` // 1.0 as default 
	- `d.melee_attack_amplifier` // 1.0 as default 
- `f.defense`
	- `d.physical_defense`
	- `d.magical_defense`
- `f.elemental_offense_attribute`
	- Has only one type of `none`, `e.fire`, `e.ice`, or `e.thunder`
- `f.elemental_resistance_attribute`
	- `r.fire`
	- `r.ice`
	- `r.thunder`
- f.penet_multiplier
  	- always 0 // (in this version)
- `d.experience` // Enemy experience is added directly to party experience.
- drop_item

**Enemy Master Specification**
- This document defines the base data structure and dynamic scaling laws for all entities encountered during an expedition.
- `ability1`: Always active for that enemy type.
- `ability30`: Becomes active when the enemy's level is **30 or higher**.

| enemy_type | name | short name | ability1 | ability30 | c. bonuses |
|-|-|-|-|-|-|
| Beast | 猛獣 | 猛 | `a.howl`1 | `a.predator-sense`1 | `c.growth_x1.1`, `r.fire_x1.3`, `r.thunder_x2/3` |
| Slime_Colony | 粘体群 | 粘 | `a.slow`1, `a.corrode`1 | `a.life-drain`3 | `r.ice_x1.3` |
| Plant_Fungal | 植菌 | 植 | `a.no-offense`1, `a.magical-counter`1, `a.counter`1 | `a.decompose`1 | `r.fire_x1.3`, `r.thunder_x2/3`, `r.ice_x2/3`, `c.grit+1`, `c.caster+1` |
| Insect_Swarm | 昆虫 | 虫 | `a.swarm`1 | `a.death-touch`1 | `e.thunder+20`, `r.fire_x1.3`, `r.thunder_x2/3` |
| Aerial | 飛行 | 飛 | `a.flying`1 | `a.free`1 | `c.evasion+0.045`, `c.growth_x0.7`  |
| Frost | 氷雪 | 雪 | `a.frostbite`1 | `a.ice-reflect`1 | `e.ice+20`, `r.fire_x1.3`, `r.ice_x1/5` |
| Marine | 海棲 | 海 | `a.bind`1 | `a.regeneration`3 | `r.thunder_x1.3` |
| Dragon | 竜 | 竜 | `a.burn`1 | `a.fire-reflect`1 | `e.fire+40`, `r.fire_x1/2`, `r.ice_x1.3`|
| Spirit | 精霊 | 霊 | `a.soul-reap`1 | `a.mutual-magic-amplify`1 |  `e.ice+20`, `r.fire_x1.5`, `r.ice_x2/3`,`r.thunder_x4/5`, `c.physical-defense-multiplier_x3/5` |
| Ghost | 怨霊 | 怨 | `a.ranged-confusion`1 | `a.self-destruct`1 |  `c.evasion+0.020`, `c.physical-defense-multiplier_x3/5`, `r.ice_x1.5` |
| Undead | 不死 | 屍 | `a.slow`1, `a.oblivion`1 | `a.reanimate`3 | `c.physical-defense-multiplier_x1/2`, `r.fire_x1.5`, `r.ice_x2/3` |
| Golem | ゴーレム | 造 | `a.auriferous`1 | `a.magic-seal`1 | `c.growth_x1.3`, `r.thunder_x1.3` |
| Shadowfang | 影牙 | 影 | `a.ambush`1 | `a.mimic`1 | `e.ice+40`, `r.fire_x1.3`, `r.ice_x2/3` |
| Mech | 機械 | 機 | `a.shock`1 | `a.mutual-physical-amplify`2 | `c.physical-defense-multiplier_x3/5`, `r.thunder_x1.5` |
| Chimera | キメラ | 合 | `a.unstable-core`1 | `a.mutual-magic-restraint`1  | `e.thunder+30`, `c.grit+1`, `c.pursuit+1`, `c.caster+1`, `c.growth_x1.7`  |
| Titan | 巨人 | 巨 | `a.colossal`1 | `a.mutual-physical-restraint`1 | `c.growth_x1.5` |
| Jinma | 神魔 | 神 | `a.upgrade-all-abilities`1 , race ability1 | race ability2 | `c.growth_x2.0` |
| Kemono | ケモノ | ケ | race ability1 | race ability2 | |

1. The Core Principle: "Static Master, Dynamic Reality"
All enemies are stored with Master Values (Tier 1, Room 1 equivalent). Their actual threat level is calculated only upon spawning by applying the environmental pressure of the current Expedition and Floor.

2. Status Scaling FormulasThe final combat value final is derived from the Master Value base using the following multipliers.

**Enemy master data structure**
- id: int
- type: string.  Normal/Elite/Boss
- x.Spawn_tier
- x.Spawn_pool //only for type.Normal. others (Elite/Boss) set 0.
- name: string
- class
- drop_items

*note:* There are no duel(`d.`, `f.`, `e`, or `r`) related status in the master data. because these data is calculated by the formula.


**Enemy status mutipliers**
- `d.HP` : master value x `x.exp_HP_mult` x `x.floor_HP_mult` x `x.god_HP_mult` 
- `f.attack` :  master value x `x.exp_atk_mult` x `x.floor_atk_mult` x `x.god_atk_mult` 
- `f.NoA` :  master value x `x.exp_NoA_mult` x `x.floor_NoA_mult` x `x.god_NoA_mult` 
- `f.offense_amplifier` :  master value x `x.exp_atk_amp_mult` x `x.floor_atk_amp_mult` x `x.god_atk_amp_mult`
- `f.defense` :  master value x `x.exp_def_mult`  x `x.floor_def_mult` x `x.god_def_mult` 
- `f.defense_amplifier` : 1.0 x `x.exp_def_amp_mult` x `x.floor_def_amp_mult` x `x.god_def_amp_mult`x `x  //for physical and magical defense
- `f.elemental_offense_attribute` :  not scale
- `f.elemental_resistance_attribute` : not scale
- `f.penet_multiplier`: not scale

#### 2.4.3 Base data structure (enemy)

| Class | `d.HP` | `a.ability` | `c.accuracy` | `c.evasion` | `d.ranged_attack` | `d.ranged_NoA` | `d.magical_attack` | `d.magical_NoA` | `d.melee_attack` | `d.melee_NoA` | `d.ranged_attack_amplifier` | `d.magical_attack_amplifier` | `d.melee_attack_amplifier` | `d.physical_defense` | `d.magical_defense` | `e.fire` | `e.ice` | `e.thunder` | `r.fire` | `r.ice` |`r.thunder` | `d.experience` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Fighter | 126 | (none) | 0.00| 0.02 | 0 | 0 | 0 | 0 | 41 | 2 | x1.0 | x1.0 | x1.0 | 23 | 10 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 5 |
| Duelist | 100 | `a.counter`1 | 0.01 | 0.01 | 0 | 0 | 0 | 0 | 52 | 4 | x1.0 | x1.0 | x1.2 | 13 | 13 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 5 |
| Ninja | 92 | `a.re-attack`1 | 0.00 | 0.04 | 0 | 0 | 0 | 0 | 59 | 4 | x1.0 | x1.0 | x1.2 | 12 | 10 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 7 |
| Samurai | 80 | `a.iaigiri`1 | -0.05 | -0.01 | 0 | 0 | 0 | 0 | 93 | 1 | x1.0 | x1.0 | x1.3 | 11 | 11 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 4 |
| Lord | 116 | (none) | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 41 | 4 | x1.0 | x1.0 | x1.1 | 15 | 15 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 8 |
| Ranger | 88 | (none) | 0.03 | 0.01 | 35 | 4 | 0 | 0 | 0 | 0 | x1.2 | x1.0 | x1.0 | 12 | 10 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 6 |
| Wizard | 54 | `a.resonance`1 | 0.00 | -0.015 | 0 | 0 | 48 | 2 | 0 | 0 | x1.0 | x1.2 | x1.0 | 5 | 15 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 4 |
| Sage | 94 | (none) | 0.00 | 0.00 |0 | 0 | 26 | 4 | 0 | 0 | x1.0 | x1.2 | x1.0 | 12 | 17 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 4 |
| Rogue | 80 | `a.deflection`1, `a.first-strike`1 | 0.06 | 0.06 | 26 | 4 | 0 | 0 | 26 | 4 | x1.2 | x1.0 | x1.0 | 10 | 10 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 4 |
| Pilgrim | 124 | `a.null-counter`1 | 0.00 | 0.02 | 0 | 0 | 26 | 2 | 41 | 2 | x1.0 | x1.2 | x1.2 | 14 | 14 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 3 |
