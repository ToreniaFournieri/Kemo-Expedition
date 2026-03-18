## 3 Master
### 3.1 Master_Data_Definitions

#### 3.1.1 Expedition Definitions

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

### 3.1.2 Expedition Floor Concepts

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

### 3.1.3 Expedition Enemy Types

| `x.exp_id` | `x.enemy_type`A | `x.enemy_type` B | `x.enemy_type` C | `x.enemy_type` D  |
|-|-|-|-|-|
| 1 | `Beast` | `Aerial` | `Insect_Swarm` | `Caninian` |
| 2 | `Frost` | `Golem` | `Plant_Fungal` | `Lupinian` |
| 3 | `Marine` | `Slime_Colony` | `Spirit` | `Vulpinian` |
| 4 | `Shadowfang` | `Felidian` | `Titan` | `Felidian` |
| 5 | `Beast` | `Dragon` | `Ursan` | `Ursan` |
| 6 | `Mech` | `Golem` | `Chimera` | `Mustelid` |
| 7 | `Titan` | `Undead` | `Aerial` | `Leporian` |
| 8 | `Dragon` | `Ghost` | `Jinma` | `Cervin` |

### 3.1.4 Floor and enemy distribution 
- Standard template for each expedition
- Expedition unique enemy definitions
- Special elite enemy allocation
  - replace target: Replace floor X, room 3
  - 
| `x.floor` | `x.room`| `x.level_offset` | `x.type` | `x.enemy_type` | `x.class` | `x.drop` |
|-|-|-|-|-|-|-|
| 1 | 1-2 | +0 | Normal | A | Rogue | `i.bolt`U, `i.armor`U |
| 1 | 1-2 | +0 | Normal | A | Wizard | `i.wand`U, `i.catalyst`U |
| 1 | 1-2 | +0 | Normal | A | Ranger | `i.arrow`U, `i.archery`U |
| 1 | 3 | +1 | Normal | A | Fighter | `i.sword`U, `i.gauntlet`U |
| 1 | 3 | +1 | Normal | A | Lord | `i.shield`U, `i.robe`U |
| 1 | 4 | +3 | Elite | A | ELITE1.class | ELITE1.drop |
| 2 | 1-2 | +1 | Normal | A | Ninja | `i.katana`U,`i.armor`U |
| 2 | 1-2 | +1 | Normal | A | Samurai | `i.katana`U, `i.catalyst`U |
| 2 | 1-2 | +1 | Normal | A | Sage | `i.grimoire`U, `i.robe`U |
| 2 | 3 | +2 | Normal | B | Duelist | `i.sword`U, `i.arrow`U |
| 2 | 3 | +2 | Normal | B | Pilgrim | `i.armor`U, `i.wand`U |
| 2 | 4 | +4 | Elite | A | ELITE2.class | ELITE2.drop |
| 3 | 1-2 | +2 | Normal | C | Lord | `i.shield`U,`i.robe`U |
| 3 | 1-2 | +2 | Normal | C | Wizard | `i.wand`U, `i.catalyst`U |
| 3 | 1-2 | +2 | Normal | C | Fighter | `i.sword`U, `i.gauntlet`U |
| 3 | 3 | +3 | Normal | A | Samurai | `i.katana`U, `i.bolt`U |
| 3 | 3 | +3 | Normal | A | Ranger | `i.arrow`U, `i.archery`U |
| 3 | 4 | +5 | Elite | C | ELITE3.class | ELITE3.drop |
| 4 | 1-2 | +3 | Normal | B | Rogue | `i.bolt`U, `i.armor`U |
| 4 | 1-2 | +3 | Normal | B | Wizard | `i.wand`U, `i.catalyst`U |
| 4 | 1-2 | +3 | Normal | B | Ranger | `i.arrow`U, `i.archery`U |
| 4 | 3 | +4 | Normal | C | Fighter | `i.sword`U, `i.gauntlet`U |
| 4 | 3 | +4 | Normal | C | Lord | `i.shield`U, `i.robe`U |
| 4 | 4 | +6 | Elite | B | ELITE4.class | ELITE4.drop |
| 5 | 1-2 | +4 | Normal | C | Ninja | `i.katana`U,`i.armor`U |
| 5 | 1-2 | +4 | Normal | C | Samurai | `i.katana`U, `i.catalyst`U |
| 5 | 1-2 | +4 | Normal | C | Sage | `i.grimoire`U, `i.robe`U |
| 5 | 3 | +5 | Normal | B | Duelist | `i.sword`U, `i.arrow`U |
| 5 | 3 | +5 | Normal | B | Pilgrim | `i.armor`U, `i.grimoire`U |
| 5 | 4 | +7 | Elite | B | ELITE5.class | ELITE5.drop |
| 6 | 1-2 | +5 | Normal | A | Lord | `i.shield`U,`i.robe`U |
| 6 | 1-2 | +5 | Normal | A | Wizard | `i.wand`U, `i.catalyst`U |
| 6 | 1-2 | +5 | Normal | A | Fighter | `i.sword`U, `i.gauntlet`U |
| 6 | 3 | +6 | Normal | B | Samurai | `i.katana`U, `i.bolt`U |
| 6 | 3 | +6 | Normal | B | Ranger | `i.arrow`U, `i.archery`U |
| 6 | 4 | +10 | BOSS | D | BOSS.class | BOSS.drop |


| `x.exp_id` | expedition unique | `x.class`  | `x.drop` |
|-|-|-|-|
| 1 | ELITE1 | Duelist | `i.gauntlet`EA, `i.katana`EA |
| 1 | ELITE2 | Fighter | `i.shield`EA, `i.robe`EA |
| 1 | ELITE3 | Rogue | `i.sword`EC, `i.armor`EC |
| 1 | ELITE4 | Ranger | `i.arrow`EB, `i.bolt`EB, `i.archery`EB |
| 1 | ELITE5 | Sage | `i.wand`EB, `i.grimoire`EB, `i.catalyst`EB |
| 1 | BOSS | Fighter | `i.sword`BD, `i.grimoire`BD |
| 2 | ELITE1 | Rogue | `i.sword`EA, `i.armor`EA |
| 2 | ELITE2 | Fighter | `i.shield`EA, `i.robe`EA |
| 2 | ELITE3 | Ranger | `i.arrow`EC, `i.bolt`EC, `i.archery`EC |
| 2 | ELITE4 | Duelist | `i.gauntlet`EB, `i.katana`EB |
| 2 | ELITE5 | Sage | `i.wand`EB, `i.grimoire`EB, `i.catalyst`EB |
| 2 | BOSS | Rogue | `i.armor`BD, `i.arrow`BD |
| 3 | ELITE1 | Pilgrim | `i.catalyst`EA, `i.robe`EA |
| 3 | ELITE2 | Lord | `i.shield`EA, `i.sword`EA, `i.armor`EA |
| 3 | ELITE3 | Wizard | `i.wand`EC, `i.grimoire`EC  |
| 3 | ELITE4 | Ninja | `i.gauntlet`EB, `i.katana`EB |
| 3 | ELITE5 | Rogue | `i.arrow`EB, `i.bolt`EB, `i.archery`EB |
| 3 | BOSS | Wizard | `i.wand`BD, `i.robe`BD |
| 4 | ELITE1 | Rogue | `i.arrow`EA, `i.archery`EA |
| 4 | ELITE2 | Samurai | `i.katana`EA, `i.shield`EA,  `i.gauntlet`EA |
| 4 | ELITE3 | Fighter | `i.armor`EC, `i.bolt`EC |
| 4 | ELITE4 | Duelist | `i.robe`EB, `i.sword`EB |
| 4 | ELITE5 | Sage | `i.wand`EB, `i.grimoire`EB, `i.catalyst`EB |
| 4 | BOSS | Ranger | `i.bolt`BD, `i.archery`BD |
| 5 | ELITE1 | Ranger | `i.arrow`EA, `i.bolt`EA, `i.archery`EA |
| 5 | ELITE2 | Pilgrim | `i.gauntlet`EA, `i.catalyst`EA |
| 5 | ELITE3 | Fighter | `i.sword`EC, `i.armor`EC |
| 5 | ELITE4 | Lord | `i.shield`EB, `i.katana`EB, `i.robe`EB |
| 5 | ELITE5 | Wizard | `i.wand`EB, `i.grimoire`EB  |
| 5 | BOSS | Samurai | `i.katana`BD, `i.shield`BD |
| 6 | ELITE1 | Fighter | `i.shield`EA, `i.robe`EA |
| 6 | ELITE2 | Rogue | `i.sword`EA, `i.armor`EA |
| 6 | ELITE3 | Sage | `i.wand`EC, `i.grimoire`EC, `i.catalyst`EC |
| 6 | ELITE4 | Samurai | `i.katana`EB, `i.arrow`EB |
| 6 | ELITE5 | Ninja | `i.gauntlet`EB, `i.bolt`EB, `i.archery`EB |
| 6 | BOSS | Sage | `i.armor`BD, `i.catalyst`BD |
| 7 | ELITE1 | Lord | `i.sword`EA, `i.shield`EA |
| 7 | ELITE2 | Sage | `i.wand`EA, `i.grimoire`EA, `i.robe`EA |
| 7 | ELITE3 | Pilgrim | `i.armor`EC, `i.catalyst`EC |
| 7 | ELITE4 | Ranger | `i.arrow`EB, `i.bolt`EB, `i.archery`EB  |
| 7 | ELITE5 | Duelist | `i.gauntlet`EB, `i.katana`EB |
| 7 | BOSS | Lord | `i.sword`BD, `i.wand`BD |
| 8 | ELITE1 | Fighter | `i.sword`EA, `i.armor`EA |
| 8 | ELITE2 | Sage | `i.wand`EA, `i.bolt`EA |
| 8 | ELITE3 | Pilgrim | `i.catalyst`EC, `i.robe`EC, `i.archery`EC |
| 8 | ELITE4 | Samurai | `i.gauntlet`EB, `i.katana`EB, `i.arrow`EB |
| 8 | ELITE5 | Wizard | `i.grimoire`EB, `i.shield`EB  |
| 8 | BOSS | Ninja | `i.katana`BD, `i.bolt`BD, `i.grimoire`BD |


| `x.exp_id` | replace target | `x.level_offset` | `x.type` | `x_enemy_type` | `x.class` | `x.drop` |
|-|-|-|-|-|-|-|
| 1 | 4 | +6 | Elite | Caninian | Lord | `i.shield`BD, `i.robe`BD |
| 1 | 4 | +6 | Elite | Caninian | Fighter | `i.katana`BD, `i.gauntlet`BD |
| 2 | 5 | +7 | Elite | Lupinian |  Wizard | `i.wand`BD, `i.catalyst`BD |
| 2 | 5 | +7 | Elite | Lupinian | Ninja | `i.bolt`BD, `i.archery`BD |
| 3 | 5 | +7 | Elite | Vulpinian | Duelist | `i.sword`BD, `i.shield`BD |
| 3 | 5 | +7 | Elite | Vulpinian | Pilgrim | `i.catalyst`BD, `i.gauntlet`BD |
| 4 | 4 | +6 | Elite | Felidian | Rogue | `i.grimoire`BD, `i.arrow`BD |
| 4 | 4 | +6 | Elite | Felidian | Ninja | `i.robe`BD, `i.sword`BD |
| 5 | 3 | +5 | Elite | Ursan | Fighter | `i.gauntlet`BD, `i.armor`BD |
| 5 | 3 | +5 | Elite | Ursan | Sage | `i.wand`BD, `i.catalyst`BD |
| 6 | 6 | +8 | Elite | Mustelid | Samurai | `i.shield`BD, `i.katana`BD |
| 6 | 6 | +8 | Elite | Mustelid | Ranger | `i.arrow`BD, `i.archery`BD |
| 7 | 2 | +4 | Elite | Leporian | Pilgrim | `i.armor`BD, `i.gauntlet`BD |
| 7 | 2 | +4 | Elite | Leporian | Wizard | `i.archery`BD, `i.grimoire`BD |
| 8 | 5 | +7 | Elite | Cervin | Sage | `i.catalyst`BD, `i.robe`BD |
| 8 | 5 | +7 | Elite | Cervin | Rogue | `i.arrow`BD, `i.sword`BD |


- Drop code format: `i.item_type`<Rarity><EnemyTypeSource>

<Rarity>
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
