## 2. CONSTANTS & DATA

### 2.4 Expedition & Enemies
- Expedition layout: The 6 `x.floor` spire. Each floor consists of 4 `x.room`s. the last room of the floor is Elite/Boss enemy battle, other rooms are Normal enemy battles.
- There are 8 `x.expedition` destinations in total. every `x.expedition` has its own tier. (1st `x.expedition` drops tier-1 items. 2nd `x.expedition` drops tier-2 items)

#### 2.4.1 Expedition Definitions

| `x.exp_id` | `x.item_tier` | `x.enemy_level` | `x.expedition` | short name | terrain effect(f1,2,3,6) | terrain effect(f4,5) | item concept |
|---|-----|-----|-----|-----|-----|-----|---|
| 1 | 1 | 1 | ケイナイアン平原(Caninian Plains) | 原 | Rejuvenation(活性化):Heal 2% of missing HP at the end of every room. | Thunderstorm(雷雨): Both sides gain `e.thunder_x3/2` | C:primitive |
| 2 | 2 | 7 | ルピニアンの亜寒帯(Lupinian Taiga) | 寒 | Chill(冷気):Room duration is increased by x1.5. Reduce this penalty by 0.1 for each party member with Fire elemental offense | Crystal Zone(水晶域): When a magic attack is used, the attacker takes backfire damage equal to 5% of the damage dealt.  | C:fur, U:icy, E:enemy_type B:fur  |
| 3 | 3 | 14 | ヴァルンの海洋(Vulpinian Ocean) | 海 | Rough waves(荒波):The melee NoA is reduced to x0.75 | Conduction(導電):Thunder attacks cause backfire damage equal to 5% of the damage dealt | C:shell, U:marine, E:enemy_type B:enemy_type |
| 4 | 4 | 21 | フェリディ砂漠(Felidian desert) | 砂 | Dry(乾燥):Ice elemental damage is reduced to x0.5 | Heavy wind(強風): Both sides receive `c.accuracy-0.020` | C:Bone , U:Desert, E:enemy_type B:enemy_type |
| 5 | 5 | 28 | ウルサンの炎嶺(Ursan Pyrepeak) | 炎 | Ashen Haze(灰霞): All `a.first-strike` abilities are disabled | Heat wave(熱波):At the end of every room, take damage equal to 5% of current HP. Reduce this damage by 1% for each party member with Ice elemental offense | concept: C:metal , U:fire, E:enemy_type B:enemy_type |
| 6 | 6 | 35 | マステリドの巣穴(Mustelid Burrow) | 巣 | Cave(洞窟): The ranged NoA is reduced to x0.75 | Leakage(漏電): Take damage equal to 3% of missing HP at the end of every room. |  C:lost tech (fantasy tone) , U:thunder, E:enemy_type B:enemy_type |
| 7 | 7 | 42 | レポリアンの月宮(Leporian Moon Palace) | 月 | Light Zone(光域):`a.mutual-physical-amplify`-1:物理抑制(双方物理ダメージ0.8倍) | Dark Zone(闇域):`a.mutual-physical-amplify`1:物理増幅(双方物理ダメージ1.2倍) | C:fantasy equipment , U:Light from Titan,Dark from Undead E:enemy_type B:enemy_type |
| 8 | 8 | 49 | セルヴィンの谷(Cervin Vale) | 谷 | Sanctuary(聖域): `a.mutual-magic-amplify`1:魔法増幅(双方魔法ダメージ1.2倍) | Gehenna(ゲヘナ):No religion bonuses apply | C:more advanced fantasy equipment , U:legendary  E:enemy_type B:enemy_type |
| 99 | 0 | 0 | 闘技場 (Colosseum) | 闘 | none | none | Debug-only area. Displayed only when Colosseum is enabled. |

**Expedition Floor Concepts**

| `x.exp_id` | `x.floor` | concept | Japanese |
|---|---:|---|---|
| 1 | 1 | Windy Prairie | 風渡る草原 |
| 1 | 2 | Predator Territory | 捕食者の縄張り |
| 1 | 3 | Swarm Nest Basin | 群生の巣盆地 |
| 1 | 4 | Lookout | 見張り台 |
| 1 | 5 | Buried Ruin Fields | 埋没遺跡原野 |
| 1 | 6 | Caninian Ruin-City | ケイナイアンの廃都 |
| 2 | 1 | Snow Forest | 雪の森 |
| 2 | 2 | Rotwood Trails | 腐木の小径 |
| 2 | 3 | Carnivorous Plants | 食肉植物群生地 |
| 2 | 4 | Icicle Labyrinth | 氷柱迷宮 |
| 2 | 5 | Crystal Cave | 水晶洞窟 |
| 2 | 6 | Ruin of Crystal Palace | 水晶宮殿跡 |
| 3 | 1 | Sunny Beach | 陽だまりの浜辺 |
| 3 | 2 | Sea of Peace | 静穏の海 |
| 3 | 3 | Shipwreck | 難破船 |
| 3 | 4 | Sea Arch | 海蝕門 |
| 3 | 5 | Deserted Fishing Village | 打ち捨てられた漁村 |
| 3 | 6 | Sacred Court of the Vulpine Elders | ヴルピニアン長老会の聖廷 |
| 4 | 1 | A Silent Night in the Desert | 砂漠の静夜 |
| 4 | 2 | Rocky Plateau | 岩石台地 |
| 4 | 3 | Limestone Cave | 石灰洞窟 |
| 4 | 4 | Night Bandit Ambush | 夜盗の待ち伏せ |
| 4 | 5 | Chasing the Lost Gems | 失われた宝石の追跡 |
| 4 | 6 | Temple of Fertility | 豊穣の神殿 |
| 5 | 1 | Lost Forest | 迷いの森 |
| 5 | 2 | Rugged Mountain Trail | 険しき山道 |
| 5 | 3 | Ursan War Camp | ウルサンの戦陣 |
| 5 | 4 | Dragon Ridge | 竜の尾根 |
| 5 | 5 | Volcanic Crater | 火山火口 |
| 5 | 6 | Fortress | 要塞 |
| 6 | 1 | Steam-powered Burrow | 蒸気仕掛けの地下穴 |
| 6 | 2 | Wreckage of K9 Interstellar Spacecraft | K9星間宇宙船の残骸 |
| 6 | 3 | Forbidden Research Facility | 禁断の研究施設 |
| 6 | 4 | Machine Without a Heart | 心なき機械 |
| 6 | 5 | Bridge Without a Master | 主なき艦橋 |
| 6 | 6 | Altar of Resonance | 共鳴の祭壇 |
| 7 | 1 | Giant Debris Ring | 巨大残骸環 |
| 7 | 2 | Transporter | 転送装置区画 |
| 7 | 3 | Light Zone | 光の領域 |
| 7 | 4 | Dark Zone | 闇の領域 |
| 7 | 5 | The Abyss | 深淵 |
| 7 | 6 | Moon Palace | 月宮殿 |
| 8 | 1 | Dragon-Scarred Valley Gate | 竜傷の峡谷門 |
| 8 | 2 | Ossuary Research Fields | 納骨研究原野 |
| 8 | 3 | Small Gods | 小さき神々 |
| 8 | 4 | Gehenna | ゲヘナ |
| 8 | 5 | Cervin Archive District | セルヴィン文書保管街区 |
| 8 | 6 | Clairvoyance Sanctuary | 千里眼の聖域 |


#### 2.4.2 Enemy
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

#### 2.4.3 Enemy structure (in battle)
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

#### 2.4.4 Base data structure (enemy)

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
