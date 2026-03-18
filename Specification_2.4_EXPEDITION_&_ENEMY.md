## 2. CONSTANTS & DATA

### 2.4 Expedition & Enemies
- Expedition layout: The 6 `x.floor` spire. Each floor consists of 4 `x.room`s. the last room of the floor is Elite/Boss enemy battle, other rooms are Normal enemy battles.
- There are 8 `x.expedition` destinations in total. every `x.expedition` has its own tier. (1st `x.expedition` drops tier-1 items. 2nd `x.expedition` drops tier-2 items)

#### 2.4.1 Expedition
- @Specification_3.1_MASTER_DATA_DEFINITIONS.md, 1 Expedition Definitions

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
  - @Specification_3.2_MASTER.md, 1.1 Standard floor and enemy distribution for Expedition

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
