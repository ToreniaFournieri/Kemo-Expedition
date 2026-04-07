## 4. EXPEDITION_&_ENEMY

### 4.1 EXPEDITION_&_ENEMY
- Expedition layout: The 6 `x.floor` spire. Each floor consists of 4 `x.room`s. the last room of the floor is Elite/Boss enemy battle, other rooms are Normal enemy battles.
- There are 8 `x.expedition` destinations in total. every `x.expedition` has its own tier. (1st `x.expedition` drops tier-1 items. 2nd `x.expedition` drops tier-2 items)

#### 4.1.1 Expedition Definitions

- Expedition

| `x.exp_id` | `x.item_tier` | `x.enemy_level` | `x.expedition` | short name | item concept |
|---|-----|-----|-----|-----|-----|
| 1 | 1 | 1 | ケイナイアン平原(Caninian Plains) | 原 | C:primitive |
| 2 | 2 | 7 | ルピニアンの亜寒帯(Lupinian Taiga) | 寒 | C:fur, U:icy, E:enemy_type B:fur  |
| 3 | 3 | 14 | ヴァルンの海洋(Vulpinian Ocean) | 海 | C:shell, U:marine, E:enemy_type B:enemy_type |
| 4 | 4 | 21 | フェリディ砂漠(Felidian Desert) | 砂 | C:Bone , U:Desert, E:enemy_type B:enemy_type |
| 5 | 5 | 28 | ウルサンの炎嶺(Ursan Pyrepeak) | 炎 | C:metal , U:fire, E:enemy_type B:enemy_type |
| 6 | 6 | 35 | プロキオン巣穴(Procyonian Burrow) | 巣 | C:lost tech (fantasy tone) , U:thunder, E:enemy_type B:enemy_type |
| 7 | 7 | 42 | レポリアンの月宮(Leporian Moon Palace) | 月 | C:fantasy equipment , U:Light from Titan,Dark from Undead E:enemy_type B:enemy_type |
| 8 | 8 | 49 | セルヴィンの谷(Cervin Vale) | 谷 |  C:more advanced fantasy equipment , U:legendary  E:enemy_type B:enemy_type |
| 99 | 0 | 0 | 闘技場 (Colosseum) | 闘 | Debug-only area. Displayed only when Colosseum is enabled. |

- Floor of each expedition


**Expedition Floor Concepts**

| `x.exp_id` | `x.floor` | concept | Japanese | terrain effects |
|---|---:|---|---|---|
| 1 | 1 | Windy Prairie | 風渡る草原 | `terrain.rejuvenation` |
| 1 | 2 | Predator Territory | 捕食者の縄張り | `terrain.predation` |
| 1 | 3 | Swarm Nest Basin | 群生の巣盆地 | `terrain.fog` |
| 1 | 4 | Lookout | 見張り台 | `terrain.exposure` |
| 1 | 5 | Buried Ruin Fields | 埋没遺跡原野 | `terrain.thunderstorm`  |
| 1 | 6 | Caninian Ruin-City | ケイナイアンの廃都 | `terrain.tailwind` |
| 2 | 1 | Snow Forest | 雪の森 | `terrain.chill` |
| 2 | 2 | Rotwood Trails | 腐木の小径 | `terrain.rotwood` |
| 2 | 3 | Carnivorous Plants | 食肉植物群生地 | `terrain.vine-snare` |
| 2 | 4 | Icicle Labyrinth | 氷柱迷宮 | `terrain.chill` |
| 2 | 5 | Crystal Cave | 水晶洞窟 | `terrain.crystal-zone` |
| 2 | 6 | Ruin of Crystal Palace | 水晶宮殿跡 | `terrain.floor-domain` |
| 3 | 1 | Sunny Beach | 陽だまりの浜辺 | `terrain.sunny-beach` |
| 3 | 2 | Sea of Peace | 静穏の海 | `terrain.silence-field` |
| 3 | 3 | Shipwreck | 難破船 | `terrain.rough-waves` |
| 3 | 4 | Sea Arch | 海蝕門 | `terrain.rough-waves` |
| 3 | 5 | Deserted Fishing Village | 打ち捨てられた漁村 | `terrain.conduction` |
| 3 | 6 | Sacred Court of the Vulpine Elders | ヴルピニアン長老会の聖廷 | `terrain.sacred-judgement` |
| 4 | 1 | A Silent Night in the Desert | 砂漠の静夜 | `terrain.dry` |
| 4 | 2 | Rocky Plateau | 岩石台地 | `terrain.heavy-wind` |
| 4 | 3 | Limestone Cave | 鍾乳洞 | `terrain.limestone-cave` |
| 4 | 4 | Night Bandit Ambush | 夜盗の待ち伏せ | `terrain.frenzy` |
| 4 | 5 | Chasing the Lost Gems | 失われた宝石の追跡 | `terrain.dry` |
| 4 | 6 | Temple of Fertility | 豊穣の神殿 | `terrain.abundant` |
| 5 | 1 | Lost Forest | 迷いの森 | `terrain.looping-path` |
| 5 | 2 | Rugged Mountain Trail | 険しき山道 | `terrain.enemy-high-ground` |
| 5 | 3 | Ursan War Camp | ウルサンの戦陣 | `terrain.ash-haze` |
| 5 | 4 | Dragon Ridge | 竜の尾根 | `terrain.heatwave` |
| 5 | 5 | Volcanic Crater | 火山火口 | `terrain.heatwave` |
| 5 | 6 | Fortress | 要塞 | `terrain.fortified` |
| 6 | 1 | Steam-powered Burrow | 蒸気仕掛けの地下穴 | `terrain.burrow` |
| 6 | 2 | Wreckage of K9 Interstellar Spacecraft | K9星間宇宙船の残骸 | `terrain.leakage` |
| 6 | 3 | Forbidden Research Facility | 禁断の研究施設 | `terrain.deletion` |
| 6 | 4 | Machine Without a Heart | 心なき機械 | `terrain.machine-logic` |
| 6 | 5 | Bridge Without a Master | 主なき艦橋 | `terrain.cap-domain` |
| 6 | 6 | Altar of Resonance | 共鳴の祭壇 | `terrain.echo-domain`  |
| 7 | 1 | Giant Debris Ring | 巨大残骸環 | `terrain.decay` |
| 7 | 2 | Transporter | 転送装置区画 | `terrain.chain-lightning` |
| 7 | 3 | Light Zone | 光の領域 | `terrain.light-field` |
| 7 | 4 | Dark Zone | 闇の領域 | `terrain.dark-field` |
| 7 | 5 | The Abyss | 深淵 | `terrain.dark-field` |
| 7 | 6 | Moon Palace | 月宮殿 | `terrain.low-gravity` |
| 8 | 1 | Dragon-Scarred Valley Gate | 竜傷の峡谷門 | `terrain.mana-burn` |
| 8 | 2 | Ossuary Research Fields | 納骨研究原野 | `terrain.gravity` |
| 8 | 3 | Small Gods | 小さき神々 | `terrain.transcendence` |
| 8 | 4 | Gehenna | ゲヘナ | `terrain.gehenna` |
| 8 | 5 | Cervin Archive District | セルヴィン文書保管街区 | `terrain.suppression` |
| 8 | 6 | Clairvoyance Sanctuary | 千里眼の聖域 | `terrain.sanctuary` |

#### 4.1.2 Enemy

**Enemy status mutipliers**
- `d.HP` : master value x `x.exp_HP_mult`
- `f.attack` :  master value x `x.exp_atk_mult`
- `f.NoA` :  master value x `x.exp_NoA_mult`
- `f.offense_amplifier` :  master value x `x.exp_atk_amp_mult` 
- `f.defense` :  master value x `x.exp_def_mult`
  - If `a.colossal`, `f.defense` x= 2.0 
- `f.physical_defense_amplifier` : 1.0 x `x.exp_def_amp_mult`
  - If `a.colossal`, `f.physical_defense_amplifier` x= 2.0
- `f.magical_defense_amplifier` : 1.0 x `x.exp_def_amp_mult`
- `f.elemental_offense_attribute` :  not scale
- `f.elemental_resistance_attribute` : not scale
- `f.penet_multiplier`: not scale


- Strength of enemy by its level 
  - n = `x.enemy_level` (1~99)
  - `x.exp_HP_mult`(n) =
  (1.16 - max(0, 0.0012*(n-25)) - max(0, 0.00006*(n-49)))^n
  - `x.exp_atk_mult`(n) =
  (1.09 - max(0, 0.00055*(n-25)) - max(0, 0.00003*(n-49)))^n
  - `x.exp_atk_amp_mult`(n) = (1.03 - max(0, 0.000165*(n-25)) - max(0, 0.000017*(n-49)))^n
  - `x.exp_NoA_mult`(n) =
  (1.05 - max(0, 0.00028*(n-25)) - max(0, 0.00002*(n-49)))^n
  - `x.exp_def_mult`(n)= (1.11 - max(0, 0.00058*(n-25)) - max(0, 0.00004*(n-49)))^n
  - `x.exp_def_amp_mult`(n)= 1.0

- If `m.luna`, add +5 `x.enemy_level` for all enemy 

- **Enemy entity distribution** for each `x.expediton`

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

#### 4.1.3 Enemy structure (in battle)
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
| Shadowfang | 影牙 | 影 | `a.ambush`1 | `a.mimic`1 | `e.fire+20`, `r.fire_x1.3`, `r.ice_x2/3` |
| Mech | 機械 | 機 | `a.shock`1 | `a.mutual-physical-amplify`2 | `c.physical-defense-multiplier_x3/5`, `r.thunder_x1.5` |
| Chimera | キメラ | 合 | `a.unstable-core`1 | `a.mutual-magic-restraint`1  | `e.thunder+30`, `c.grit+1`, `c.pursuit+1`, `c.caster+1`, `c.growth_x1.7`  |
| Titan | 巨人 | 巨 | `a.colossal`1 | `a.mutual-physical-restraint`1 | `c.growth_x1.5` |
| Jinma | 神魔 | 神 | `a.upgrade-all-abilities`1 , race ability1 | none | `c.growth_x1.3` |
| Kemono | ケモノ | ケ | race ability1 | none | |


| Kemono races      | race ability1　 | c. bonus of enemey     | 
|------------|-----------|-------------------|
| Lupinian   | `a.rage`1, `a.re-counter`1      | `e.ice+25`, `c.ice-defense-multiplier_x2/3`|
| Vulpinian  |`a.momentum`1, `a.cunning`1         | `e.thunder+25` |
| Felidian   |`a.first-strike`1, `a.covering-fire`1   | `e.fire+25`, `c.fire-defense-multiplier_x2/3`|
| Caninian   |`a.seeker`1, `a.resurrect`1       | `c.growth_x1.1`|
| Ursan      |`a.bulwark`1, `a.cyborgization`1   | `e.fire+40` |
| Procyonian |`a.resonance`1, `a.illusion`1          | `e.thunder+40`, `c.thunder-defense-multiplier_x2/3` |
| Leporian   |`a.composure`1, `a.magical-counter`1 | `e.ice+40` |
| Cervin     |`a.focus`1, `a.prophecy`1        | |
| Murid      |`a.stealth`1 | `c.penet+0.10` |

1. The Core Principle: "Static Master, Dynamic Reality"
All enemies are stored with Master Values (Tier 1, Room 1 equivalent). Their actual threat level is calculated only upon spawning by applying the environmental pressure of the current Expedition and Floor.

2. Status Scaling FormulasThe final combat value final is derived from the Master Value base using the following multipliers.

**Enemy Passive ability**
- Resolve in the following priority order:
  - `a.upgrade-all-abilities`
    - Increase the level of all other abilities currently possessed by the actor by N, up to Lv5.
    - Does not affect `a.upgrade-all-abilities` itself.
  - `a.cyborgization`
  - `a.composure`
  - `a.focus`
  - `a.colossal`
  - `a.iaigiri`
  - `a.hunter`

**Enemy master data structure**
- id: int
- type: string.  Normal/Elite/Boss
- x.Spawn_tier
- x.Spawn_pool //only for type.Normal. others (Elite/Boss) set 0.
- name: string
- class
- drop_items

*note:* There are no duel(`d.`, `f.`, `e`, or `r`) related status in the master data. because these data is calculated by the formula.

#### 4.1.4 Base data structure (enemy)

- **Base status**

| `d.HP` | `a.ability` | `d.accuracy` | `d.evasion` | `d.ranged_attack` | `d.magical_attack` | `d.melee_attack` | `d.ranged_attack_amplifier` | `d.magical_attack_amplifier` | `d.melee_attack_amplifier` | `d.physical_defense` | `d.magical_defense` | `d.experience` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 80 | (none) | 0.00 | 0.00 | 31 | 29 | 40 | x1.0 | x1.0 | x1.0 | 12 | 12 | 5 |

- **Class modifier**

| Class | `d.HP_modifier` | `a.ability_add` | `d.accuracy_add` | `d.evasion_add` | `d.ranged_attack_modifier` | `d.ranged_attack_amplifier_modifier` | `d.ranged_NoA` | `d.magical_attack_modifier` | `d.magical_attack_amplifier_modifier` | `d.magical_NoA` | `d.melee_attack_modifier` | `d.melee_attack_amplifier_modifier` | `d.melee_NoA` | `d.physical_defense_modifier` | `d.magical_defense_modifier` | `d.experience_modifier` |
|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|
| class.duelist     | x1.10 | `a.counter`1          | 0.00 | 0.00 | x0.9 | x0.8 | 0 | x0.9 | x0.8 | 0 | x1.0 | x1.2 | 4 | x1.05 | x0.8 | x1.0 |
| class.samurai     | x0.88 | `a.iaigiri`1          | 0.00 | -0.02 | x0.9 | x0.8 | 0 | x0.9 | x0.8 | 0 | x2.0 | x1.0 | 1 | x1.0 | x0.7 | x0.8 |
| class.sword-saint | x1.21 | `a.re-attack`1        | 0.00 | 0.00 | x0.9 | x0.8 | 0 | x0.9 | x0.8 | 0 | x0.8 | x1.3 | 6 | x1.0 | x0.75 | x1.0 |
| class.ranger      | x0.94 | (none)                | 0.03 | 0.01 | x1.3 | x1.2 | 4 | x0.9 | x0.8 | 0 | x0.9 | x0.8 | 0 | x0.8 | x0.8 | x1.2 |
| class.striker     | x1.05 | `a.heavy-strike`1     | 0.00 | -0.02 | x1.5 | x1.0 | 2 | x0.9 | x0.8 | 0 | x0.9 | x0.8 | 0 | x0.76 | x0.76 | x0.8 |
| class.ninja       | x0.83 | `a.first-strike`1     | 0.05 | 0.03 | x0.8 | x1.3 | 5 | x0.9 | x0.8 | 0 | x0.9 | x0.8 | 0 | x0.82 | x0.93 | x1.0 |
| class.wizard      | x0.55 | `a.resonance`1        | 0.00 | -0.015 | x0.9 | x0.8 | 0 | x1.2 | x1.0 | 2 | x0.9 | x0.8 | 0 | x0.63 | x1.1 | x0.8 |
| class.sage        | x0.94 | `a.arc-magic`1        | 0.00 | 0.00 | x0.9 | x0.8 | 0 | x0.8 | x1.3 | 4 | x0.9 | x0.8 | 0 | x0.8 | x1.3 | x1.0 |
| class.alchemist   | x0.77 | `a.arcane-stability`1 | 0.00 | 0.00 | x0.9 | x0.8 | 0 | x1.2 | x1.0 | 5 | x0.9 | x0.8 | 0 | x0.7 | x1.0 | x1.2 |
| class.guardian    | x1.43 | (none)                | 0.00 | 0.00 | x0.9 | x0.8 | 0 | x0.8 | x0.8 | 0 | x0.9 | x0.8 | 2 | x1.2 | x0.6 | x1.0 |
| class.pilgrim     | x1.26 | (none)                | 0.00 | 0.00 | x0.9 | x0.8 | 0 | x0.9 | x0.85 | 2 | x0.9 | x0.9 | 0 | x1.1 | x1.1 | x0.4 |
| class.lord        | x1.21 | (none)                | 0.00 | 0.00 | x0.9 | x0.8 | 0 | x0.9 | x0.8 | 0 | x1.0 | x0.9 | 2 | x1.2 | x1.0 | x1.6 |



- **Calculation of master value**
- `d.HP` master value: `d.HP` x mainClass.`d.HP_modifier`  x subClass.`d.HP_modifier`
- `a.ability` add :`a.ability` + mainClass.`a.ability_add`  // No subClass ability added
  - If mainclass == subClass, then increment its ability level by 1.
- `f.attack` master value:
  - Ranged: `d.ranged_attack` x mainClass.`d.ranged_attack_modifier` x subClass.`d.ranged_attack_modifier`
  - Magical: `d.magical_attack` x mainClass.`d.magical_attack_modifier` x subClass.`d.magical_attack_modifier`
  - Melee: `d.melee_attack` x mainClass.`d.melee_attack_modifier` x subClass.`d.melee_attack_modifier`
- `f.accuracy` master value:  `d.accuracy` + mainClass.`d.accuracy_add` +  subClass.`d.accuracy_add`
- `f.evasion` master value:  `d.evasion` + mainClass.`d.evasion_add` +  subClass.`d.evasion_add`
- `f.NoA` master value:
  - Ranged: mainClass.`d.ranged_NoA` + 1/2 x (subClass.`d.ranged_NoA`)
  - Magical: mainClass.`d.magical_NoA` + 1/2 x (subClass.`d.magical_NoA`)
  - Melee: mainClass.`d.melee_NoA` + 1/2 x (subClass.`d.melee_NoA`)
- `f.offense_amplifier` master value:
  - Ranged: `d.ranged_attack_amplifier` x mainClass.`d.ranged_attack_amplifier_modifier` x subClass.`d.ranged_attack_amplifier_modifier`
  - Magical: `d.magical_attack_amplifier` x mainClass.`d.magical_attack_amplifier_modifier` x subClass.`d.magical_attack_amplifier_modifier`
  - Melee: `d.melee_attack_amplifier` x mainClass.`d.melee_attack_amplifier_modifier` x subClass.`d.melee_attack_amplifier_modifier`
- `f.defense` master value:
  -  `d.physical_defense` x mainClass.`d.physical_defense_modifier` x subClass.`d.physical_defense_modifier`
  -  `d.magical_defense` x mainClass.`d.magical_defense_modifier` x subClass.`d.magical_defense_modifier` 
- `f.experience` master value: `d.experience` x mainClass.`d.experience_modifier` x subClass.`d.experience_modifier`

#### 4.1.5 Master_Data_Definitions

**Expedition Floor generation**
- This part is discribe process to make @Specification_4.2_EXPEDITION_&_ENEMY_MASTER_DATA.md

**Step**  
  - 1. Define `Expedition Enemy Types`
    2. Define `Standard template` for the expedition
    3. Allocate Special elite enemy, replaced by floor X, room 3.
   
**Expedition Enemy Types**

| `x.exp_id` | `x.enemy_type`A | `x.enemy_type` B | `x.enemy_type` C | `x.enemy_type` D  |
|-|-|-|-|-|
| 1 | `Beast` | `Aerial` | `Insect_Swarm` | `Caninian` |
| 2 | `Frost` | `Golem` | `Plant_Fungal` | `Lupinian` |
| 3 | `Marine` | `Slime_Colony` | `Spirit` | `Vulpinian` |
| 4 | `Shadowfang` | `Felidian` | `Titan` | `Felidian` |
| 5 | `Beast` | `Dragon` | `Ursan` | `Ursan` |
| 6 | `Mech` | `Golem` | `Chimera` | `Procyonian` |
| 7 | `Titan` | `Undead` | `Aerial` | `Leporian` |
| 8 | `Dragon` | `Ghost` | `Jinma` | `Cervin` |

**Drop template**
- `x.drop` is used for all rarity drops (Uncommon / Elite / Boss).
- Common drops are selected randomly from the assigned `Drop set`.

| `x.class` | `x.drop` | Common item drop set |
|-|-|-|
| class.duelist | `i.sword`, `i.armor` | Melee |
| class.samurai | `i.katana`, `i.shield` | Melee |
| class.sword-saint | `i.gauntlet`, `i.sword` | Melee |
| class.ranger | `i.arrow`,`i.archery` | Ranged |
| class.striker | `i.bolt`, `i.arrow` | Ranged |
| class.ninja | `i.archery`, `i.bolt` | Ranged |
| class.wizard | `i.wand`, `i.robe` | Magic |
| class.sage | `i.grimoire`, `i.catalyst` | Magic |
| class.alchemist | `i.catalyst`, `i.wand` | Magic |
| class.guardian | `i.armor`, `i.gauntlet` | Defensive |
| class.pilgrim | `i.robe`, `i.grimoire` | Defensive |
| class.lord | `i.shield`, `i.katana` | Defensive |

**Common item table**

| Drop set | items |
|----------|-------|
| Melee | `i.sword`, `i.katana`, `i.gauntlet` |
| Ranged | `i.arrow`, `i.bolt`, `i.archery` |
| Magic | `i.wand`, `i.grimoire`, `i.catalyst` |
| Defensive | `i.armor`, `i.robe`, `i.shield` |


| `x.type` | has subClass | drops  |
|-|-|-|
| Normal | No | 2 Uncommon items (mainClass), 3 Common items |
| Elite | No | 2 Elite rare items (mainClass), 3 Common items |
| Boss | No | 2 Boss rare items (mainClass), 3 Common items |
| Normal | Yes | 2 Uncommon items (mainClass), 1 Uncommon item (subClass: first `x.drop`), 3 Common items |
| Elite | Yes | 2 Elite rare items (mainClass), 1 Elite rare item (subClass: first `x.drop`), 3 Common items |
| Boss | Yes | 2 Boss rare items (mainClass), 1 Boss rare item (subClass: first `x.drop`), 3 Common items |


**Standard template**
- `x.class`: class.mainClass.subClass
- single-class enemies in (`x.exp_id` is 3 or higher) are promoted to master-class.

| `x.floor` | `x.room`| `x.level_offset` | `x.type` | `x.enemy_type` | `x.class` |
|-|-|-|-|-|-|
| 1 | 1-2 | +0 | Normal | A | class.striker |
| 1 | 1-2 | +0 | Normal | A | class.wizard | 
| 1 | 1-2 | +0 | Normal | A | class.ranger | 
| 1 | 3 | +1 | Normal | A | class.guardian |
| 1 | 3 | +1 | Normal | A | class.lord |
| 1 | 4 | +3 | Elite | A | ELITE1.class |
| 2 | 1-2 | +1 | Normal | A | class.ninja |
| 2 | 1-2 | +1 | Normal | A | class.samurai |
| 2 | 1-2 | +1 | Normal | A | class.sage |
| 2 | 3 | +2 | Normal | B | class.duelist |
| 2 | 3 | +2 | Normal | B | class.pilgrim |
| 2 | 4 | +4 | Elite | A | ELITE2.class |
| 3 | 1-2 | +2 | Normal | C | class.sword-saint |
| 3 | 1-2 | +2 | Normal | C | class.alchemist |
| 3 | 1-2 | +2 | Normal | C | class.guardian.pilgrim |
| 3 | 3 | +3 | Normal | A | class.samurai.duelist |
| 3 | 3 | +3 | Normal | A | class.wizard.alchemist |
| 3 | 4 | +5 | Elite | C | ELITE3.class |
| 4 | 1-2 | +3 | Normal | B | class.lord.striker |
| 4 | 1-2 | +3 | Normal | B | class.sage.samurai |
| 4 | 1-2 | +3 | Normal | B | class.guardian.wizard |
| 4 | 3 | +4 | Normal | C | class.duelist.lord |
| 4 | 3 | +4 | Normal | C | class.lord.striker |
| 4 | 4 | +6 | Elite | B | ELITE4.class 
| 5 | 1-2 | +4 | Normal | C | class.ninja.ranger |
| 5 | 1-2 | +4 | Normal | C | class.samurai.sword-saint |
| 5 | 1-2 | +4 | Normal | C | class.wizard.alchemist |
| 5 | 3 | +5 | Normal | B | class.sword-saint.guardian |
| 5 | 3 | +5 | Normal | B | class.wizard.ninja |
| 5 | 4 | +7 | Elite | B | ELITE5.class |
| 6 | 1-2 | +5 | Normal | A | class.duelist.striker |
| 6 | 1-2 | +5 | Normal | A | class.pilgrim.sage |
| 6 | 1-2 | +5 | Normal | A | class.sword-saint.striker |
| 6 | 3 | +6 | Normal | B | class.samurai.ranger |
| 6 | 3 | +6 | Normal | B | class.ranger.duelist |
| 6 | 4 | +10 | BOSS | D | BOSS.class |

**Elite and boss enemy**

| `x.exp_id` | expedition unique | `x.class`  |
|-|-|-|
| 1 | ELITE1 | class.duelist |
| 1 | ELITE2 | class.samurai |
| 1 | ELITE3 | class.ranger.striker |
| 1 | ELITE4 | class.sage.lord  |
| 1 | ELITE5 | class.alchemist.wizard |
| 1 | BOSS | class.guardian.lord |
| 2 | ELITE1 | class.lord.ranger |
| 2 | ELITE2 | class.samurai.guardian |
| 2 | ELITE3 | class.striker.pilgrim  |
| 2 | ELITE4 | class.sword-saint.alchemist |
| 2 | ELITE5 | class.wizard.sage |
| 2 | BOSS | class.striker.ninja |
| 3 | ELITE1 | class.pilgrim.wizard |
| 3 | ELITE2 | class.lord.samurai |
| 3 | ELITE3 | class.sage.duelist |
| 3 | ELITE4 | class.wizard.ninja |
| 3 | ELITE5 | class.striker.sword-saint |
| 3 | BOSS | class.wizard.sage | 
| 4 | ELITE1 | class.pilgrim.guardian |
| 4 | ELITE2 | class.samurai.striker | 
| 4 | ELITE3 | class.lord.wizard |
| 4 | ELITE4 | class.ninja.duelist | 
| 4 | ELITE5 | class.sage.alchemist |
| 4 | BOSS | class.striker.ranger |
| 5 | ELITE1 | class.ninja.sword-saint | 
| 5 | ELITE2 | class.pilgrim.alchemist |
| 5 | ELITE3 | class.guardian.sage |
| 5 | ELITE4 | class.lord.duelist |
| 5 | ELITE5 | class.alchemist.wizard |
| 5 | BOSS | class.samurai.duelist |
| 6 | ELITE1 | class.guardian.ninja |
| 6 | ELITE2 | class.ranger.striker |
| 6 | ELITE3 | class.alchemist.wizard |
| 6 | ELITE4 | class.samurai.duelist |
| 6 | ELITE5 | class.ninja.sage |
| 6 | BOSS | class.sage.lord |
| 7 | ELITE1 | class.lord.striker |
| 7 | ELITE2 | class.wizard.sage |
| 7 | ELITE3 | class.pilgrim.sword-saint | 
| 7 | ELITE4 | class.ranger.samurai |
| 7 | ELITE5 | class.duelist.alchemist |
| 7 | BOSS | class.lord.ninja |
| 8 | ELITE1 | class.guardian.pilgrim |
| 8 | ELITE2 | class.sage.alchemist |
| 8 | ELITE3 | class.pilgrim.sword-saint |
| 8 | ELITE4 | class.samurai.striker |
| 8 | ELITE5 | class.wizard.samurai |
| 8 | BOSS | class.ninja.wizard |

**Special enemy of replacement**

| `x.exp_id` | replace target floor | `x.level_offset` | `x.type` | `x_enemy_type` | `x.class` | `x.drop` |
|-|-|-|-|-|-|-|
| 1 | 4 | +6 | Elite | Caninian | class.duelist.lord | `i.shield`BD, `i.robe`BD |
| 1 | 4 | +6 | Elite | Caninian | class.lord.striker | `i.katana`BD, `i.gauntlet`BD |
| 2 | 5 | +7 | Elite | Lupinian | class.wizard.guardian | `i.wand`BD, `i.catalyst`BD |
| 2 | 5 | +7 | Elite | Lupinian | class.ninja.sword-saint | `i.bolt`BD, `i.archery`BD |
| 3 | 5 | +7 | Elite | Vulpinian | class.sword-saint.guardian | `i.sword`BD, `i.shield`BD |
| 3 | 5 | +7 | Elite | Vulpinian | class.wizard.ninja | `i.catalyst`BD, `i.bolt`BDBD |
| 4 | 4 | +6 | Elite | Felidian | class.striker.sage | `i.grimoire`BD, `i.arrow`BD |
| 4 | 4 | +6 | Elite | Felidian | class.ninja.duelist | `i.robe`BD, `i.sword`BD |
| 5 | 3 | +5 | Elite | Ursan | class.samurai.duelist | `i.gauntlet`BD, `i.armor`BD |
| 5 | 3 | +5 | Elite | Ursan | class.wizard.alchemist | `i.wand`BD, `i.catalyst`BD |
| 6 | 6 | +8 | Elite | Procyonian | class.samurai.ranger  | `i.shield`BD, `i.katana`BD |
| 6 | 6 | +8 | Elite | Procyonian | class.ranger.duelist | `i.arrow`BD, `i.archery`BD |
| 7 | 2 | +4 | Elite | Leporian | class.duelist.pilgrim | `i.armor`BD, `i.gauntlet`BD |
| 7 | 2 | +4 | Elite | Leporian | class.wizard.striker | `i.archery`BD, `i.grimoire`BD |
| 8 | 5 | +7 | Elite | Cervin | class.sword-saint.ninja | `i.catalyst`BD, `i.sword`BD |
| 8 | 5 | +7 | Elite | Cervin | class.wizard.guardian | `i.arrow`BD, `i.robe`BD |


- Drop code format: `i.item_type`<Rarity><EnemyTypeSource>

<Rarity>
- `C`: Common  (No enemy type specific)
- `U`: Uncommon  (No enemy type specific)
- `E`: Elite Rare
- `B`: Boss Rare

<EnemyTypeSource>
- A = common local ecology
- B = later threat / stronger regional pressure
- C = accent floor enemy 
- D = symbolic / boss-linked presence

- Within the same `x.item_tier`, Common and Uncommon drop code resolves to a fixed item. (Common can be dropped by all enemy, so it is omitted by the list)
- Example: if `i.archeryEA` in `x.exp_id = 1` is set to `つる巻き弓`, then every enemy in that expedition that drops `i.archeryEA` drops `つる巻き弓`.
- Different expeditions may assign different concrete items to the same drop code.

