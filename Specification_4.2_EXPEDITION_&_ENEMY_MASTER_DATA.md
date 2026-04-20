## 4. EXPEDITION_&_ENEMY

### 4.2 EXPEDITION_&_ENEMY_MASTER_DATA

### 4.2.2 Enemy

- Common item drop
  - All enemies drop common items, determined by their `x.class`.

**Class → Drop Set Mapping**

| `x.class` | Common item drop set |
|-|-|
| class.duelist | Melee |
| class.samurai | Melee |
| class.sword-saint | Melee |
| class.ranger | Ranged |
| class.striker | Ranged |
| class.ninja | Ranged |
| class.wizard | Magic |
| class.sage | Magic |
| class.alchemist | Magic |
| class.guardian | Defensive |
| class.pilgrim | Defensive |
| class.lord | Defensive |

**Common Item Pool**
- Once the Drop Set is determined, assign them to enemy's `x.drop` list.
  
| Drop set | items |
|----------|-------|
| Melee | `i.sword`, `i.katana`, `i.gauntlet` |
| Ranged | `i.arrow`, `i.bolt`, `i.archery` |
| Magic | `i.wand`, `i.grimoire`, `i.catalyst` |
| Defensive | `i.armor`, `i.robe`, `i.shield` |


- Rare items drop, Enemy

| `x.exp_id` | `x.floor` | `x.room` | `x.level` | `x.type` | `x.enemy_type` | `x.class` | `x.drop` | `x.name` (Japanese) | additional abilities or bonus |
|---|---:|---|---:|---|---|---|---|---|---|
| 1 | 1 | 1-2 | 1 | Normal | `Beast` | class.ranger | `i.arrow`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 平原のけもの |
| 1 | 1 | 1-2 | 1 | Normal | `Beast` | class.striker | `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 平原のちいさな獣 |
| 1 | 1 | 1-2 | 1 | Normal | `Beast` | class.wizard | `i.wand`U, `i.robe`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 草むらの狩り獣 |
| 1 | 1 | 3 | 2 | Normal | `Beast` | class.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`C, `i.robe`C, `i.shield`C | 小爪のけもの |
| 1 | 1 | 3 | 2 | Normal | `Beast` | class.lord | `i.shield`U, `i.katana`U, `i.armor`C, `i.robe`C, `i.shield`C | 群れのけもの |
| 1 | 1 | 4 | 4 | Elite | `Beast` | class.duelist | `i.sword`EA, `i.armor`EA, `i.sword`C, `i.katana`C, `i.gauntlet`C | 群れのリーダー獣 |
| 1 | 2 | 1-2 | 2 | Normal | `Beast` | class.ninja | `i.archery`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 草かげのけもの |
| 1 | 2 | 1-2 | 2 | Normal | `Beast` | class.sage | `i.grimoire`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ものしり獣 |
| 1 | 2 | 1-2 | 2 | Normal | `Beast` | class.samurai | `i.katana`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 仁けもの |
| 1 | 2 | 3 | 3 | Normal | `Aerial` | class.duelist | `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | かぎ爪の小翼 |
| 1 | 2 | 3 | 3 | Normal | `Aerial` | class.pilgrim | `i.robe`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | 旅する小翼 |
| 1 | 2 | 4 | 5 | Elite | `Beast` | class.samurai | `i.katana`EA, `i.shield`EA, `i.sword`C, `i.katana`C, `i.gauntlet`C | 大きめのけもの |
| 1 | 3 | 1-2 | 3 | Normal | `Insect_Swarm` | class.alchemist | `i.catalyst`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | むれ虫 |
| 1 | 3 | 1-2 | 3 | Normal | `Insect_Swarm` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 羽虫 |
| 1 | 3 | 1-2 | 3 | Normal | `Insect_Swarm` | class.sword-saint | `i.gauntlet`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 甲虫ファイター |
| 1 | 3 | 3 | 4 | Normal | `Beast` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 刃持ちのけもの |
| 1 | 3 | 3 | 4 | Normal | `Beast` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 唱えるけもの |
| 1 | 3 | 4 | 6 | Elite | `Insect_Swarm` | class.ranger.striker | `i.arrow`EC, `i.archery`EC, `i.bolt`EC, `i.arrow`C, `i.bolt`C, `i.archery`C | 硬殻のむれ虫 |
| 1 | 4 | 1-2 | 4 | Normal | `Aerial` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | 風の小翼 |
| 1 | 4 | 1-2 | 4 | Normal | `Aerial` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 曇り空の小翼 |
| 1 | 4 | 1-2 | 4 | Normal | `Aerial` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 賢い翼 |
| 1 | 4 | 3 | 7 | Elite | `Caninian` | class.duelist.lord | `i.shield`BD, `i.robe`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | 雇われ傭兵 |
| 1 | 4 | 3 | 7 | Elite | `Caninian` | class.lord.striker | `i.katana`BD, `i.gauntlet`BD, `i.armor`C, `i.robe`C, `i.shield`C | 見張り番 |
| 1 | 4 | 4 | 7 | Elite | `Aerial` | class.sage.lord | `i.grimoire`EB, `i.catalyst`EB, `i.shield`EB, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 風切りの鳥ケモ |
| 1 | 5 | 1-2 | 5 | Normal | `Insect_Swarm` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | かくれむれ虫 |
| 1 | 5 | 1-2 | 5 | Normal | `Insect_Swarm` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 刀持ちむれ虫 |
| 1 | 5 | 1-2 | 5 | Normal | `Insect_Swarm` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | むれ虫の古書持ち |
| 1 | 5 | 3 | 6 | Normal | `Aerial` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 細身の鳥ケモ |
| 1 | 5 | 3 | 6 | Normal | `Aerial` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 魔道の鳥ケモ |
| 1 | 5 | 4 | 8 | Elite | `Aerial` | class.alchemist.wizard | `i.catalyst`EB, `i.wand`EB, `i.robe`EB, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 学びし鳥ケモ |
| 1 | 6 | 1-2 | 6 | Normal | `Beast` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 遺跡のけもの |
| 1 | 6 | 1-2 | 6 | Normal | `Beast` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | 遺跡を守りしもの |
| 1 | 6 | 1-2 | 6 | Normal | `Beast` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 遺跡の傭兵 |
| 1 | 6 | 3 | 7 | Normal | `Aerial` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 羽弓の小翼 |
| 1 | 6 | 3 | 7 | Normal | `Aerial` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 城上の翼侍 |
| 1 | 6 | 4 | 11 | BOSS | `Caninian` | class.guardian | `i.armor`BD, `i.gauntlet`BD, `i.shield`BD, `i.armor`C, `i.robe`C, `i.shield`C | アレウス  | `a.ice-absorb`1 |
| 2 | 1 | 1-2 | 7 | Normal | `Frost` | class.ranger | `i.arrow`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 霜牙獣 |
| 2 | 1 | 1-2 | 7 | Normal | `Frost` | class.striker | `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 凍晶の霊 |
| 2 | 1 | 1-2 | 7 | Normal | `Frost` | class.wizard | `i.wand`U, `i.robe`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 雪原の氷獣 |
| 2 | 1 | 3 | 8 | Normal | `Frost` | class.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`C, `i.robe`C, `i.shield`C | 氷爪獣 |
| 2 | 1 | 3 | 8 | Normal | `Frost` | class.lord | `i.shield`U, `i.katana`U, `i.armor`C, `i.robe`C, `i.shield`C | 白霜の群核 |
| 2 | 1 | 4 | 10 | Elite | `Frost` | class.lord.ranger | `i.shield`EA, `i.katana`EA, `i.arrow`EA, `i.armor`C, `i.robe`C, `i.shield`C | 氷影の上位獣 |
| 2 | 2 | 1-2 | 8 | Normal | `Frost` | class.ninja | `i.archery`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 雪潜みの氷獣 |
| 2 | 2 | 1-2 | 8 | Normal | `Frost` | class.sage | `i.grimoire`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 凍智獣 |
| 2 | 2 | 1-2 | 8 | Normal | `Frost` | class.samurai | `i.katana`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 冬森の刃霊 |
| 2 | 2 | 3 | 9 | Normal | `Golem` | class.duelist | `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 石核の剣闘体 |
| 2 | 2 | 3 | 9 | Normal | `Golem` | class.pilgrim | `i.robe`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | 祈路の岩体 |
| 2 | 2 | 4 | 11 | Elite | `Frost` | class.samurai.guardian | `i.katana`EA, `i.shield`EA, `i.armor`EA, `i.sword`C, `i.katana`C, `i.gauntlet`C | 凍土の重殻獣 |
| 2 | 3 | 1-2 | 9 | Normal | `Plant_Fungal` | class.alchemist | `i.catalyst`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 菌林の群生核 |
| 2 | 3 | 1-2 | 9 | Normal | `Plant_Fungal` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 胞子守護株 |
| 2 | 3 | 1-2 | 9 | Normal | `Plant_Fungal` | class.sword-saint | `i.gauntlet`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 蔓根の暴れ株 |
| 2 | 3 | 3 | 10 | Normal | `Frost` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 霜刃獣 |
| 2 | 3 | 3 | 10 | Normal | `Frost` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 吹雪まとい |
| 2 | 3 | 4 | 12 | Elite | `Plant_Fungal` | class.striker.pilgrim | `i.bolt`EC, `i.arrow`EC, `i.robe`EC, `i.arrow`C, `i.bolt`C, `i.archery`C | 胞子嵐の飛種 |
| 2 | 4 | 1-2 | 10 | Normal | `Golem` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | 岩殻の守体 |
| 2 | 4 | 1-2 | 10 | Normal | `Golem` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 結晶脈の突撃体 |
| 2 | 4 | 1-2 | 10 | Normal | `Golem` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 谷壁の賢刀体 |
| 2 | 4 | 3 | 11 | Normal | `Plant_Fungal` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 菌殻の突進株 |
| 2 | 4 | 3 | 11 | Normal | `Plant_Fungal` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 菌冠の寄生樹 |
| 2 | 4 | 4 | 13 | Elite | `Golem` | class.sword-saint.alchemist | `i.gauntlet`EB, `i.sword`EB, `i.catalyst`EB, `i.sword`C, `i.katana`C, `i.gauntlet`C | 玄岩の連撃体 |
| 2 | 5 | 1-2 | 11 | Normal | `Plant_Fungal` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 胞子影の這い株 |
| 2 | 5 | 1-2 | 11 | Normal | `Plant_Fungal` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 菌刃のつる株 |
| 2 | 5 | 1-2 | 11 | Normal | `Plant_Fungal` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 苔衣の胞子塊 |
| 2 | 5 | 3 | 14 | Elite | `Lupinian` | class.ninja.sword-saint | `i.bolt`BD, `i.archery`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | 忍狼 |
| 2 | 5 | 3 | 14 | Elite | `Lupinian` | class.wizard.guardian | `i.wand`BD, `i.catalyst`BD, `i.robe`BD, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 妖狼 |
| 2 | 5 | 4 | 14 | Elite | `Golem` | class.wizard.sage | `i.wand`EB, `i.robe`EB, `i.grimoire`EB, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 核晶の導師体 |
| 2 | 6 | 1-2 | 12 | Normal | `Frost` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 氷冠の群核 |
| 2 | 6 | 1-2 | 12 | Normal | `Frost` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | 寒天の呪獣 |
| 2 | 6 | 1-2 | 12 | Normal | `Frost` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 凍原の巨爪獣 |
| 2 | 6 | 3 | 13 | Normal | `Golem` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 石翼の射手 |
| 2 | 6 | 3 | 13 | Normal | `Golem` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 断崖の岩刃兵 |
| 2 | 6 | 4 | 17 | BOSS | `Lupinian` | class.striker.ninja | `i.bolt`BD, `i.arrow`BD, `i.archery`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | 蒼狼ボルテフ | `a.deflection`2 |
| 3 | 1 | 1-2 | 14 | Normal | `Marine` | class.ranger.ranger | `i.arrow`U, `i.archery`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 浜辺の漂掠魚 |
| 3 | 1 | 1-2 | 14 | Normal | `Marine` | class.striker.striker | `i.bolt`U, `i.arrow`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 潮読みの小妖 |
| 3 | 1 | 1-2 | 14 | Normal | `Marine` | class.wizard.wizard | `i.wand`U, `i.robe`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 波打ちの術魚 |
| 3 | 1 | 3 | 15 | Normal | `Marine` | class.guardian.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`U, `i.armor`C, `i.robe`C, `i.shield`C | 潮刃の海獣 |
| 3 | 1 | 3 | 15 | Normal | `Marine` | class.lord.lord | `i.shield`U, `i.katana`U, `i.shield`U, `i.armor`C, `i.robe`C, `i.shield`C | 浅瀬の群れ長 |
| 3 | 1 | 4 | 17 | Elite | `Marine` | class.pilgrim.wizard | `i.robe`EA, `i.grimoire`EA, `i.wand`EA, `i.armor`C, `i.robe`C, `i.shield`C | 潮祈の先導魚 |
| 3 | 2 | 1-2 | 15 | Normal | `Marine` | class.ninja.ninja | `i.archery`U, `i.bolt`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 水面潜み |
| 3 | 2 | 1-2 | 15 | Normal | `Marine` | class.sage.sage | `i.grimoire`U, `i.catalyst`U, `i.grimoire`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 潮賢兵 |
| 3 | 2 | 1-2 | 15 | Normal | `Marine` | class.samurai.samurai | `i.katana`U, `i.shield`U, `i.katana`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 海辺の魚侍 |
| 3 | 2 | 3 | 16 | Normal | `Slime_Colony` | class.duelist.duelist | `i.sword`U, `i.armor`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 粘核の剣闘体 |
| 3 | 2 | 3 | 16 | Normal | `Slime_Colony` | class.pilgrim.pilgrim | `i.robe`U, `i.grimoire`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 巡礼ゼリー |
| 3 | 2 | 4 | 18 | Elite | `Marine` | class.lord.samurai | `i.shield`EA, `i.katana`EA, `i.katana`EA, `i.armor`C, `i.robe`C, `i.shield`C | 潮騎の重殻 |
| 3 | 3 | 1-2 | 16 | Normal | `Spirit` | class.alchemist.alchemist | `i.catalyst`U, `i.wand`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 泡霊の群核 |
| 3 | 3 | 1-2 | 16 | Normal | `Spirit` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 潮鳴きの霊術体 |
| 3 | 3 | 1-2 | 16 | Normal | `Spirit` | class.sword-saint.sword-saint | `i.gauntlet`U, `i.sword`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 霊波の前衛 |
| 3 | 3 | 3 | 17 | Normal | `Marine` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 海路の刃兵 |
| 3 | 3 | 3 | 17 | Normal | `Marine` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 白波の導師 |
| 3 | 3 | 4 | 19 | Elite | `Spirit` | class.wizard.ninja | `i.wand`EC, `i.robe`EC, `i.archery`EC, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 潮幻の導師 |
| 3 | 4 | 1-2 | 17 | Normal | `Slime_Colony` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | 粘波の斥候 |
| 3 | 4 | 1-2 | 17 | Normal | `Slime_Colony` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 粘潮の突撃核 |
| 3 | 4 | 1-2 | 17 | Normal | `Slime_Colony` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 飛沫の射出体 |
| 3 | 4 | 3 | 18 | Normal | `Spirit` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 霊潮の突撃体 |
| 3 | 4 | 3 | 18 | Normal | `Spirit` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 潮守の灯霊 |
| 3 | 4 | 4 | 20 | Elite | `Slime_Colony` | class.ninja.guardian | `i.archery`EB, `i.bolt`EB, `i.armor`EB, `i.arrow`C, `i.bolt`C, `i.archery`C | 粘群の影忍 |
| 3 | 5 | 1-2 | 18 | Normal | `Spirit` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 月潮の忍霊 |
| 3 | 5 | 1-2 | 18 | Normal | `Spirit` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 波祓いの侍霊 |
| 3 | 5 | 1-2 | 18 | Normal | `Spirit` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 潮文の語り霊 |
| 3 | 5 | 3 | 21 | Elite | `Vulpinian` | class.sword-saint.guardian | `i.sword`BD, `i.shield`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | 狐牙の護剣士 |
| 3 | 5 | 3 | 21 | Elite | `Vulpinian` | class.wizard.ninja | `i.catalyst`BD, `i.bolt`BD, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 狐尾の魔術師 |
| 3 | 5 | 4 | 21 | Elite | `Slime_Colony` | class.striker.sword-saint | `i.bolt`EB, `i.arrow`EB, `i.gauntlet`EB, `i.arrow`C, `i.bolt`C, `i.archery`C | 飛沫群の狙撃核 |
| 3 | 6 | 1-2 | 19 | Normal | `Marine` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 遺浜の貫魚 |
| 3 | 6 | 1-2 | 19 | Normal | `Marine` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | 遺浜の霊術体 |
| 3 | 6 | 1-2 | 19 | Normal | `Marine` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 遺浜の前衛魚 |
| 3 | 6 | 3 | 20 | Normal | `Slime_Colony` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 泡群の射手 |
| 3 | 6 | 3 | 20 | Normal | `Slime_Colony` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 海蝕の刃兵 |
| 3 | 6 | 4 | 24 | BOSS | `Vulpinian` | class.wizard.sage | `i.wand`BD, `i.robe`BD, `i.grimoire`BD, `i.wand`C, `i.grimoire`C, `i.catalyst`C | アズラーイール | `a.melee-confusion`1 |
| 4 | 1 | 1-2 | 21 | Normal | `Shadowfang` | class.ranger.ranger | `i.arrow`U, `i.archery`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 砂夜の牙影 |
| 4 | 1 | 1-2 | 21 | Normal | `Shadowfang` | class.striker.striker | `i.bolt`U, `i.arrow`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 月砂の迅牙 |
| 4 | 1 | 1-2 | 21 | Normal | `Shadowfang` | class.wizard.wizard | `i.wand`U, `i.robe`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 砂丘の妖士 |
| 4 | 1 | 3 | 22 | Normal | `Shadowfang` | class.guardian.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`U, `i.armor`C, `i.robe`C, `i.shield`C | 乾砂の裂爪 |
| 4 | 1 | 3 | 22 | Normal | `Shadowfang` | class.lord.lord | `i.shield`U, `i.katana`U, `i.shield`U, `i.armor`C, `i.robe`C, `i.shield`C | 影群の頭目 |
| 4 | 1 | 4 | 24 | Elite | `Shadowfang` | class.pilgrim.guardian | `i.robe`EA, `i.grimoire`EA, `i.armor`EA, `i.armor`C, `i.robe`C, `i.shield`C | 夜襲の祈影 |
| 4 | 2 | 1-2 | 22 | Normal | `Shadowfang` | class.ninja.ninja | `i.archery`U, `i.bolt`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 砂潜り |
| 4 | 2 | 1-2 | 22 | Normal | `Shadowfang` | class.sage.sage | `i.grimoire`U, `i.catalyst`U, `i.grimoire`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 月詠の黒牙 |
| 4 | 2 | 1-2 | 22 | Normal | `Shadowfang` | class.samurai.samurai | `i.katana`U, `i.shield`U, `i.katana`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 砂識の武牙 |
| 4 | 2 | 3 | 23 | Normal | `Felidian` | class.duelist.duelist | `i.sword`U, `i.armor`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 砂猫の剣士 |
| 4 | 2 | 3 | 23 | Normal | `Felidian` | class.pilgrim.pilgrim | `i.robe`U, `i.grimoire`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 巡砂の猫民 |
| 4 | 2 | 4 | 25 | Elite | `Shadowfang` | class.samurai.striker | `i.katana`EA, `i.shield`EA, `i.bolt`EA, `i.sword`C, `i.katana`C, `i.gauntlet`C | 黒牙の侍 |
| 4 | 3 | 1-2 | 23 | Normal | `Titan` | class.alchemist.alchemist | `i.catalyst`U, `i.wand`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 巨術士 |
| 4 | 3 | 1-2 | 23 | Normal | `Titan` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 砂碑の護兵 |
| 4 | 3 | 1-2 | 23 | Normal | `Titan` | class.sword-saint.sword-saint | `i.gauntlet`U, `i.sword`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 乾岩の破砕兵 |
| 4 | 3 | 3 | 24 | Normal | `Shadowfang` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 影牙の刃兵 |
| 4 | 3 | 3 | 24 | Normal | `Shadowfang` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 砂塵の妖牙 |
| 4 | 3 | 4 | 26 | Elite | `Titan` | class.lord.wizard | `i.shield`EC, `i.katana`EC, `i.wand`EC, `i.armor`C, `i.robe`C, `i.shield`C | 巨躯の破城兵 |
| 4 | 4 | 1-2 | 24 | Normal | `Felidian` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | 砂猫のあらくれもの |
| 4 | 4 | 1-2 | 24 | Normal | `Felidian` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | あらくれ兄貴猫 |
| 4 | 4 | 1-2 | 24 | Normal | `Felidian` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 夜砂のぐれ猫 |
| 4 | 4 | 3 | 27 | Elite | `Felidian` | class.ninja.duelist | `i.robe`BD, `i.sword`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | 黄昏の野盗猫 |
| 4 | 4 | 3 | 27 | Elite | `Felidian` | class.striker.sage | `i.grimoire`BD, `i.arrow`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | 砂嵐の強盗猫 |
| 4 | 4 | 4 | 27 | Elite | `Felidian` | class.ninja.duelist | `i.archery`EB, `i.bolt`EB, `i.sword`EB, `i.arrow`C, `i.bolt`C, `i.archery`C | 忍猫ネロ |
| 4 | 5 | 1-2 | 25 | Normal | `Titan` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 砂岩の忍巨 |
| 4 | 5 | 1-2 | 25 | Normal | `Titan` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 断崖の刃巨 |
| 4 | 5 | 1-2 | 25 | Normal | `Titan` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 岩窟の古老巨 |
| 4 | 5 | 3 | 26 | Normal | `Felidian` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 猫刃の決闘士 |
| 4 | 5 | 3 | 26 | Normal | `Felidian` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 流砂の術忍猫 |
| 4 | 5 | 4 | 28 | Elite | `Felidian` | class.sage.alchemist | `i.grimoire`EB, `i.catalyst`EB, `i.catalyst`EB, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 秘儀の砂猫 |
| 4 | 6 | 1-2 | 26 | Normal | `Shadowfang` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 豊穣の門番 |
| 4 | 6 | 1-2 | 26 | Normal | `Shadowfang` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | 豊穣の祈祷師 |
| 4 | 6 | 1-2 | 26 | Normal | `Shadowfang` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 豊穣の護衛 |
| 4 | 6 | 3 | 27 | Normal | `Felidian` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 豊穣の親衛射手 |
| 4 | 6 | 3 | 27 | Normal | `Felidian` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 豊穣の親衛隊 |
| 4 | 6 | 4 | 31 | BOSS | `Felidian` | class.striker.ranger | `i.bolt`BD, `i.arrow`BD, `i.arrow`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | シルウェストリス | `c.fire-defense-multiplier_x4/5` |
| 5 | 1 | 1-2 | 28 | Normal | `Beast` | class.ranger.ranger | `i.arrow`U, `i.archery`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 火灰の狩獣 |
| 5 | 1 | 1-2 | 28 | Normal | `Beast` | class.striker.striker | `i.bolt`U, `i.arrow`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 熱霧の迅獣 |
| 5 | 1 | 1-2 | 28 | Normal | `Beast` | class.wizard.wizard | `i.wand`U, `i.robe`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 火口原の呪獣 |
| 5 | 1 | 3 | 29 | Normal | `Beast` | class.guardian.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`U, `i.armor`C, `i.robe`C, `i.shield`C | 炎峰の爪獣 |
| 5 | 1 | 3 | 29 | Normal | `Beast` | class.lord.lord | `i.shield`U, `i.katana`U, `i.shield`U, `i.armor`C, `i.robe`C, `i.shield`C | 灰毛の群核 |
| 5 | 1 | 4 | 31 | Elite | `Beast` | class.ninja.sword-saint | `i.archery`EA, `i.bolt`EA, `i.gauntlet`EA, `i.arrow`C, `i.bolt`C, `i.archery`C | 炎嶺の忍刃頭 |
| 5 | 2 | 1-2 | 29 | Normal | `Beast` | class.ninja.ninja | `i.archery`U, `i.bolt`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 灰走りの獣影 |
| 5 | 2 | 1-2 | 29 | Normal | `Beast` | class.sage.sage | `i.grimoire`U, `i.catalyst`U, `i.grimoire`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 焔智の獣兵 |
| 5 | 2 | 1-2 | 29 | Normal | `Beast` | class.samurai.samurai | `i.katana`U, `i.shield`U, `i.katana`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 焼土の古獣 |
| 5 | 2 | 3 | 30 | Normal | `Dragon` | class.duelist.duelist | `i.sword`U, `i.armor`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 溶鱗の竜 |
| 5 | 2 | 3 | 30 | Normal | `Dragon` | class.pilgrim.pilgrim | `i.robe`U, `i.grimoire`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 火道の竜 |
| 5 | 2 | 4 | 32 | Elite | `Beast` | class.pilgrim.alchemist | `i.robe`EA, `i.grimoire`EA, `i.catalyst`EA, `i.armor`C, `i.robe`C, `i.shield`C | 焔狩の導き手 |
| 5 | 3 | 1-2 | 30 | Normal | `Ursan` | class.alchemist.alchemist | `i.catalyst`U, `i.wand`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 炎砦の熊錬師 |
| 5 | 3 | 1-2 | 30 | Normal | `Ursan` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 火護りの熊守衛 |
| 5 | 3 | 1-2 | 30 | Normal | `Ursan` | class.sword-saint.sword-saint | `i.gauntlet`U, `i.sword`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 灼鋼の熊戦士 |
| 5 | 3 | 3 | 33 | Elite | `Ursan` | class.samurai.duelist | `i.gauntlet`BD, `i.armor`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | 焔営の武熊 |
| 5 | 3 | 3 | 33 | Elite | `Ursan` | class.wizard.alchemist | `i.wand`BD, `i.catalyst`BD, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 焔営の術熊 |
| 5 | 3 | 4 | 33 | Elite | `Ursan` | class.guardian.sage | `i.armor`EC, `i.gauntlet`EC, `i.grimoire`EC, `i.armor`C, `i.robe`C, `i.shield`C | 監視熊ボルク |
| 5 | 4 | 1-2 | 31 | Normal | `Dragon` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | 火嶺の守り竜 |
| 5 | 4 | 1-2 | 31 | Normal | `Dragon` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 焔脈の竜隊長 |
| 5 | 4 | 1-2 | 31 | Normal | `Dragon` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 火尾の賢竜 |
| 5 | 4 | 3 | 32 | Normal | `Ursan` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 炎稜の熊兵 |
| 5 | 4 | 3 | 32 | Normal | `Ursan` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 灰牙の熊長 |
| 5 | 4 | 4 | 34 | Elite | `Dragon` | class.lord.duelist | `i.shield`EB, `i.katana`EB, `i.sword`EB, `i.armor`C, `i.robe`C, `i.shield`C | 竜嶺の炎守 |
| 5 | 5 | 1-2 | 32 | Normal | `Ursan` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 火口影の熊忍 |
| 5 | 5 | 1-2 | 32 | Normal | `Ursan` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 熔刃の熊侍 |
| 5 | 5 | 1-2 | 32 | Normal | `Ursan` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 火山文の熊賢 |
| 5 | 5 | 3 | 33 | Normal | `Dragon` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 火口の決闘竜 |
| 5 | 5 | 3 | 33 | Normal | `Dragon` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 熱道の巡礼竜 |
| 5 | 5 | 4 | 35 | Elite | `Dragon` | class.alchemist.wizard | `i.catalyst`EB, `i.wand`EB, `i.wand`EB, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 火口の導術竜 |
| 5 | 6 | 1-2 | 33 | Normal | `Beast` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 炎砦の闘撃獣 |
| 5 | 6 | 1-2 | 33 | Normal | `Beast` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | 砦影の術獣 |
| 5 | 6 | 1-2 | 33 | Normal | `Beast` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 砦前の戦獣 |
| 5 | 6 | 3 | 34 | Normal | `Dragon` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 城嶺の狙尾竜 |
| 5 | 6 | 3 | 34 | Normal | `Dragon` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 城嶺の刃竜 |
| 5 | 6 | 4 | 38 | BOSS | `Ursan` | class.samurai.duelist | `i.katana`BD, `i.shield`BD, `i.sword`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | 炎嶺王グラズル | `a.fire-reflect`1 |
| 6 | 1 | 1-2 | 35 | Normal | `Mech` | class.ranger.ranger | `i.arrow`U, `i.archery`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 遺構斥候ユニット |
| 6 | 1 | 1-2 | 35 | Normal | `Mech` | class.striker.striker | `i.bolt`U, `i.arrow`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 遺構演算コア機 |
| 6 | 1 | 1-2 | 35 | Normal | `Mech` | class.wizard.wizard | `i.wand`U, `i.robe`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 遺構術式ドローン |
| 6 | 1 | 3 | 36 | Normal | `Mech` | class.guardian.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`U, `i.armor`C, `i.robe`C, `i.shield`C | オートマタ |
| 6 | 1 | 3 | 36 | Normal | `Mech` | class.lord.lord | `i.shield`U, `i.katana`U, `i.shield`U, `i.armor`C, `i.robe`C, `i.shield`C | 遺構制御機 |
| 6 | 1 | 4 | 38 | Elite | `Mech` | class.guardian.ninja | `i.armor`EA, `i.gauntlet`EA, `i.archery`EA, `i.armor`C, `i.robe`C, `i.shield`C | オートマタVer2.1 |
| 6 | 2 | 1-2 | 36 | Normal | `Mech` | class.ninja.ninja | `i.archery`U, `i.bolt`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 潜伏偵察オートマタ |
| 6 | 2 | 1-2 | 36 | Normal | `Mech` | class.sage.sage | `i.grimoire`U, `i.catalyst`U, `i.grimoire`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 遺構演算フレーム |
| 6 | 2 | 1-2 | 36 | Normal | `Mech` | class.samurai.samurai | `i.katana`U, `i.shield`U, `i.katana`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 遺構斬撃解析機 |
| 6 | 2 | 3 | 37 | Normal | `Golem` | class.duelist.duelist | `i.sword`U, `i.armor`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 鉱核デュエラ |
| 6 | 2 | 3 | 37 | Normal | `Golem` | class.pilgrim.pilgrim | `i.robe`U, `i.grimoire`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 岩核アーカイブ像 |
| 6 | 2 | 4 | 39 | Elite | `Mech` | class.ranger.striker | `i.arrow`EA, `i.archery`EA, `i.bolt`EA, `i.arrow`C, `i.bolt`C, `i.archery`C | 試作暗殺ユニット |
| 6 | 3 | 1-2 | 37 | Normal | `Chimera` | class.alchemist.alchemist | `i.catalyst`U, `i.wand`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | キメラ試作体α |
| 6 | 3 | 1-2 | 37 | Normal | `Chimera` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | キメラ試作体β |
| 6 | 3 | 1-2 | 37 | Normal | `Chimera` | class.sword-saint.sword-saint | `i.gauntlet`U, `i.sword`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | キメラ試作体γ |
| 6 | 3 | 3 | 38 | Normal | `Mech` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 遺構斬撃兵装 |
| 6 | 3 | 3 | 38 | Normal | `Mech` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 遺構術式兵装 |
| 6 | 3 | 4 | 40 | Elite | `Chimera` | class.alchemist.wizard | `i.catalyst`EC, `i.wand`EC, `i.wand`EC, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ナイトメア |
| 6 | 4 | 1-2 | 38 | Normal | `Golem` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | 岩殻術衛像 |
| 6 | 4 | 1-2 | 38 | Normal | `Golem` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 鉱晶旗手像 |
| 6 | 4 | 1-2 | 38 | Normal | `Golem` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 岩壁賢刃像 |
| 6 | 4 | 3 | 39 | Normal | `Chimera` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | キメラ試作体δ |
| 6 | 4 | 3 | 39 | Normal | `Chimera` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | キメラ試作体ε |
| 6 | 4 | 4 | 41 | Elite | `Golem` | class.samurai.duelist | `i.katana`EB, `i.shield`EB, `i.sword`EB, `i.sword`C, `i.katana`C, `i.gauntlet`C | 断刃決闘像 |
| 6 | 5 | 1-2 | 39 | Normal | `Chimera` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | キメラ潜伏個体 |
| 6 | 5 | 1-2 | 39 | Normal | `Chimera` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | キメラ斬撃個体 |
| 6 | 5 | 1-2 | 39 | Normal | `Chimera` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | キメラ術式個体 |
| 6 | 5 | 3 | 40 | Normal | `Golem` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 鉱刃デュエラ像 |
| 6 | 5 | 3 | 40 | Normal | `Golem` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 鉱核祭像 |
| 6 | 5 | 4 | 42 | Elite | `Golem` | class.ninja.sage | `i.archery`EB, `i.bolt`EB, `i.grimoire`EB, `i.arrow`C, `i.bolt`C, `i.archery`C | 無主橋潜行ユニット |
| 6 | 6 | 1-2 | 40 | Normal | `Mech` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 共鳴祭壇闘撃機 |
| 6 | 6 | 1-2 | 40 | Normal | `Mech` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | 共鳴術式コア機 |
| 6 | 6 | 1-2 | 40 | Normal | `Mech` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 共鳴前衛オートマタ |
| 6 | 6 | 3 | 43 | Elite | `Procyonian` | class.ranger.duelist | `i.arrow`BD, `i.archery`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | プロキオニアン迅射兵 |
| 6 | 6 | 3 | 43 | Elite | `Procyonian` | class.samurai.ranger | `i.shield`BD, `i.katana`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | プロキオニアン護刃兵 |
| 6 | 6 | 4 | 45 | BOSS | `Procyonian` | class.sage.lord | `i.grimoire`BD, `i.catalyst`BD, `i.shield`BD, `i.wand`C, `i.grimoire`C, `i.catalyst`C | セレスティアルリーパー | `a.soul-reap`3 |
| 7 | 1 | 1-2 | 42 | Normal | `Titan` | class.ranger.ranger | `i.arrow`U, `i.archery`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 月輪の巨斥候 |
| 7 | 1 | 1-2 | 42 | Normal | `Titan` | class.striker.striker | `i.bolt`U, `i.arrow`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 光輪の巨斥候 |
| 7 | 1 | 1-2 | 42 | Normal | `Titan` | class.wizard.wizard | `i.wand`U, `i.robe`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 星屑の巨導師 |
| 7 | 1 | 3 | 43 | Normal | `Titan` | class.guardian.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`U, `i.armor`C, `i.robe`C, `i.shield`C | 月砕きの巨兵 |
| 7 | 1 | 3 | 43 | Normal | `Titan` | class.lord.lord | `i.shield`U, `i.katana`U, `i.shield`U, `i.armor`C, `i.robe`C, `i.shield`C | 光冠の巨長 |
| 7 | 1 | 4 | 45 | Elite | `Titan` | class.lord.striker | `i.shield`EA, `i.katana`EA, `i.bolt`EA, `i.armor`C, `i.robe`C, `i.shield`C | 天蓋の巨王兵 |
| 7 | 2 | 1-2 | 43 | Normal | `Titan` | class.ninja.ninja | `i.archery`U, `i.bolt`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 影月の巨忍 |
| 7 | 2 | 1-2 | 43 | Normal | `Titan` | class.sage.sage | `i.grimoire`U, `i.catalyst`U, `i.grimoire`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 月詠みの巨賢 |
| 7 | 2 | 1-2 | 43 | Normal | `Titan` | class.samurai.samurai | `i.katana`U, `i.shield`U, `i.katana`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 星詠みの巨侍 |
| 7 | 2 | 3 | 46 | Elite | `Leporian` | class.duelist.pilgrim | `i.armor`BD, `i.gauntlet`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | 白兎巡礼士 |
| 7 | 2 | 3 | 46 | Elite | `Leporian` | class.wizard.striker | `i.archery`BD, `i.grimoire`BD, `i.arrow`BD, `i.wand`C, `i.grimoire`C | 白兎術師 |
| 7 | 2 | 4 | 46 | Elite | `Titan` | class.wizard.sage | `i.wand`EA, `i.robe`EA, `i.grimoire`EA, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 天文の巨導賢 |
| 7 | 3 | 1-2 | 44 | Normal | `Aerial` | class.alchemist.alchemist | `i.catalyst`U, `i.wand`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 光翼の錬空将 |
| 7 | 3 | 1-2 | 44 | Normal | `Aerial` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 光翼の戦空兵 |
| 7 | 3 | 1-2 | 44 | Normal | `Aerial` | class.sword-saint.sword-saint | `i.gauntlet`U, `i.sword`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 蒼空の翼兵 |
| 7 | 3 | 3 | 45 | Normal | `Titan` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 月刀の巨侍兵 |
| 7 | 3 | 3 | 45 | Normal | `Titan` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 星術の巨導兵 |
| 7 | 3 | 4 | 47 | Elite | `Aerial` | class.pilgrim.sword-saint | `i.robe`EC, `i.grimoire`EC, `i.gauntlet`EC, `i.armor`C, `i.robe`C, `i.shield`C | 聖風の翼巡礼士 |
| 7 | 4 | 1-2 | 45 | Normal | `Undead` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | 影墓の亡者 |
| 7 | 4 | 1-2 | 45 | Normal | `Undead` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 闇刃の亡者 |
| 7 | 4 | 1-2 | 45 | Normal | `Undead` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 宵闇の亡者 |
| 7 | 4 | 3 | 46 | Normal | `Aerial` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 闇翔の翼兵 |
| 7 | 4 | 3 | 46 | Normal | `Aerial` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 闇天の翼将 |
| 7 | 4 | 4 | 48 | Elite | `Undead` | class.ranger.samurai | `i.arrow`EB, `i.archery`EB, `i.katana`EB, `i.arrow`C, `i.bolt`C, `i.archery`C | 冥月の亡者アドリアン |
| 7 | 5 | 1-2 | 46 | Normal | `Aerial` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 深淵の翼忍 |
| 7 | 5 | 1-2 | 46 | Normal | `Aerial` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 深淵の翼侍 |
| 7 | 5 | 1-2 | 46 | Normal | `Aerial` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 深淵の翼賢 |
| 7 | 5 | 3 | 47 | Normal | `Undead` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 墓園の亡護剣士 |
| 7 | 5 | 3 | 47 | Normal | `Undead` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 墓園の亡術忍士 |
| 7 | 5 | 4 | 49 | Elite | `Undead` | class.duelist.alchemist | `i.sword`EB, `i.armor`EB, `i.catalyst`EB, `i.sword`C, `i.katana`C, `i.gauntlet`C | 冥府の剣士ヴァレン |
| 7 | 6 | 1-2 | 47 | Normal | `Titan` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 月宮の戦士長 |
| 7 | 6 | 1-2 | 47 | Normal | `Titan` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | 月宮の導師 |
| 7 | 6 | 1-2 | 47 | Normal | `Titan` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 月宮の親衛隊 |
| 7 | 6 | 3 | 48 | Normal | `Undead` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 月王の寵臣ナヴィル |
| 7 | 6 | 3 | 48 | Normal | `Undead` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 月王の寵臣カリス |
| 7 | 6 | 4 | 52 | BOSS | `Leporian` | class.lord.ninja | `i.shield`BD, `i.katana`BD, `i.archery`BD, `i.armor`C, `i.robe`C, `i.shield`C | 月王ラピエル | `a.melee-reflect`2 |
| 8 | 1 | 1-2 | 49 | Normal | `Voidspawn` | class.ranger.ranger | `i.arrow`U, `i.archery`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 谷門の斥候 |
| 8 | 1 | 1-2 | 49 | Normal | `Voidspawn` | class.striker.striker | `i.bolt`U, `i.arrow`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 谷門の弩手 |
| 8 | 1 | 1-2 | 49 | Normal | `Voidspawn` | class.wizard.wizard | `i.wand`U, `i.robe`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 谷門の術師 |
| 8 | 1 | 3 | 50 | Normal | `Voidspawn` | class.guardian.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`U, `i.armor`C, `i.robe`C, `i.shield`C | 虚痕の守衛 |
| 8 | 1 | 3 | 50 | Normal | `Voidspawn` | class.lord.lord | `i.shield`U, `i.katana`U, `i.shield`U, `i.armor`C, `i.robe`C, `i.shield`C | 虚痕の監視長 |
| 8 | 1 | 4 | 52 | Elite | `Voidspawn` | class.guardian.pilgrim | `i.armor`EA, `i.gauntlet`EA, `i.robe`EA, `i.armor`C, `i.robe`C, `i.shield`C | 虚爪の古衛兵 |
| 8 | 2 | 1-2 | 50 | Normal | `Voidspawn` | class.ninja.ninja | `i.archery`U, `i.bolt`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 虚骨域の影刃 |
| 8 | 2 | 1-2 | 50 | Normal | `Voidspawn` | class.sage.sage | `i.grimoire`U, `i.catalyst`U, `i.grimoire`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 虚骨域の賢刀兵 |
| 8 | 2 | 1-2 | 50 | Normal | `Voidspawn` | class.samurai.samurai | `i.katana`U, `i.shield`U, `i.katana`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 虚骨域の碑文侍 |
| 8 | 2 | 3 | 51 | Normal | `Ghost` | class.duelist.duelist | `i.sword`U, `i.armor`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 霊域の決闘霊 |
| 8 | 2 | 3 | 51 | Normal | `Ghost` | class.pilgrim.pilgrim | `i.robe`U, `i.grimoire`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 霊域の巡礼霊 |
| 8 | 2 | 4 | 53 | Elite | `Voidspawn` | class.sage.alchemist | `i.grimoire`EA, `i.catalyst`EA, `i.catalyst`EA, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 虚智の語部 |
| 8 | 3 | 1-2 | 51 | Normal | `Jinma` | class.alchemist.alchemist | `i.catalyst`U, `i.wand`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 錬金術鬼 
| 8 | 3 | 1-2 | 51 | Normal | `Jinma` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 祭術鬼 |
| 8 | 3 | 1-2 | 51 | Normal | `Jinma` | class.sword-saint.sword-saint | `i.gauntlet`U, `i.sword`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 戦祀鬼 |
| 8 | 3 | 3 | 52 | Normal | `Voidspawn` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 虚紋の決刀士 |
| 8 | 3 | 3 | 52 | Normal | `Voidspawn` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 虚紋の導術士 |
| 8 | 3 | 4 | 54 | Elite | `Jinma` | class.pilgrim.sword-saint | `i.robe`EC, `i.grimoire`EC, `i.gauntlet`EC, `i.armor`C, `i.robe`C, `i.shield`C | 古祀の巡礼鬼 |
| 8 | 4 | 1-2 | 52 | Normal | `Ghost` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | 地獄門の潜術霊 |
| 8 | 4 | 1-2 | 52 | Normal | `Ghost` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 地獄門の戦霊将 |
| 8 | 4 | 1-2 | 52 | Normal | `Ghost` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 地獄門の賢霊 |
| 8 | 4 | 3 | 53 | Normal | `Jinma` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 剣術鬼 |
| 8 | 4 | 3 | 53 | Normal | `Jinma` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 鬼隊長 |
| 8 | 4 | 4 | 55 | Elite | `Ghost` | class.samurai.striker | `i.katana`EB, `i.shield`EB, `i.bolt`EB, `i.sword`C, `i.katana`C, `i.gauntlet`C | 幽冥の太刀霊 |
| 8 | 5 | 1-2 | 53 | Normal | `Jinma` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 書庫影の忍鬼 |
| 8 | 5 | 1-2 | 53 | Normal | `Jinma` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 書庫護刀の鬼 |
| 8 | 5 | 1-2 | 53 | Normal | `Jinma` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 書庫識の呪鬼 |
| 8 | 5 | 3 | 56 | Elite | `Cervin` | class.sword-saint.ninja | `i.catalyst`BD, `i.sword`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | 若鹿の秘儀剣忍 |
| 8 | 5 | 3 | 56 | Elite | `Cervin` | class.wizard.guardian | `i.arrow`BD, `i.robe`BD, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 若鹿の影護術士 |
| 8 | 5 | 4 | 56 | Elite | `Ghost` | class.wizard.samurai | `i.wand`EB, `i.robe`EB, `i.katana`EB, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 司書長セドリック |
| 8 | 6 | 1-2 | 54 | Normal | `Voidspawn` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 聖域の守り人 |
| 8 | 6 | 1-2 | 54 | Normal | `Voidspawn` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | 聖域の巡礼者 |
| 8 | 6 | 1-2 | 54 | Normal | `Voidspawn` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 聖域のつわもの |
| 8 | 6 | 3 | 55 | Normal | `Ghost` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 聖域の弓霊 |
| 8 | 6 | 3 | 55 | Normal | `Ghost` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 聖域の太刀霊 |
| 8 | 6 | 4 | 59 | BOSS | `Cervin` | class.ninja.wizard | `i.archery`BD, `i.bolt`BD, `i.wand`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | セルヴァ・レム | `a.shock`1, `a.magic-seal`1 |
