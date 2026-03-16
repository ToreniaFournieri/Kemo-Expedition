# 1. Enemy

## 1.1 Standard floor and enemy distribution for Expedition

| `x.exp_id` | `x.floor` | `x.room` | `x.level` | `x.type` | `x.enemy_type` | `x.class` | `x.drop` | `x.name` (Japanese) |
|---|---:|---|---:|---|---|---|---|---|
| 1 | 1 | 1-2 | 1 | Normal | `Beast` | Rogue | `i.bolt`U, `i.armor`U | 平原のけもの |
| 1 | 1 | 1-2 | 1 | Normal | `Beast` | Wizard | `i.wand`U, `i.catalyst`U | 平原のちいさな術獣 |
| 1 | 1 | 1-2 | 1 | Normal | `Beast` | Ranger | `i.arrow`U, `i.archery`U | 草むらの狩り獣 |
| 1 | 1 | 3 | 2 | Normal | `Beast` | Fighter | `i.sword`U, `i.gauntlet`U | 小爪のけもの |
| 1 | 1 | 3 | 2 | Normal | `Beast` | Lord | `i.shield`U, `i.robe`U | 群れのけもの |
| 1 | 1 | 4 | 4 | Elite | `Beast` | Duelist | `i.gauntlet`EA, `i.katana`EA | 群れのリーダー獣 |
| 1 | 2 | 1-2 | 2 | Normal | `Beast` | Ninja | `i.katana`U, `i.armor`U | 草かげのけもの |
| 1 | 2 | 1-2 | 2 | Normal | `Beast` | Samurai | `i.katana`U, `i.catalyst`U | 草原の刃獣 |
| 1 | 2 | 1-2 | 2 | Normal | `Beast` | Sage | `i.grimoire`U, `i.robe`U | ものしり獣 |
| 1 | 2 | 3 | 3 | Normal | `Aerial` | Duelist | `i.sword`U, `i.arrow`U | 低空の小翼 |
| 1 | 2 | 3 | 3 | Normal | `Aerial` | Pilgrim | `i.armor`U, `i.wand`U | 旅する小翼 |
| 1 | 2 | 4 | 5 | Elite | `Beast` | Fighter | `i.shield`EA, `i.robe`EA | 大きめのけもの |
| 1 | 3 | 1-2 | 3 | Normal | `Insect_Swarm` | Lord | `i.shield`U, `i.robe`U | むれ虫 |
| 1 | 3 | 1-2 | 3 | Normal | `Insect_Swarm` | Wizard | `i.wand`U, `i.catalyst`U | 羽虫の術使い |
| 1 | 3 | 1-2 | 3 | Normal | `Insect_Swarm` | Fighter | `i.sword`U, `i.gauntlet`U | 甲虫ファイター |
| 1 | 3 | 3 | 4 | Normal | `Beast` | Samurai | `i.katana`U, `i.bolt`U | 刃持ちのけもの |
| 1 | 3 | 3 | 4 | Normal | `Beast` | Ranger | `i.arrow`U, `i.archery`U | すばやいけもの |
| 1 | 3 | 4 | 6 | Elite | `Insect_Swarm` | Rogue | `i.sword`EC, `i.armor`EC | 硬殻のむれ虫 |
| 1 | 4 | 1-2 | 4 | Normal | `Aerial` | Rogue | `i.bolt`U, `i.armor`U | 風の小翼 |
| 1 | 4 | 1-2 | 4 | Normal | `Aerial` | Wizard | `i.wand`U, `i.catalyst`U | 曇り空の小翼 |
| 1 | 4 | 1-2 | 4 | Normal | `Aerial` | Ranger | `i.arrow`U, `i.archery`U | 見張り翼 |
| 1 | 4 | 3 | 5 | Normal | `Insect_Swarm` | Fighter | `i.sword`U, `i.gauntlet`U | 前線のむれ虫 |
| 1 | 4 | 3 | 5 | Normal | `Insect_Swarm` | Lord | `i.shield`U, `i.robe`U | 殻もちのむれ虫 |
| 1 | 4 | 4 | 7 | Elite | `Aerial` | Ranger | `i.arrow`EB, `i.bolt`EB, `i.archery`EB | 風切り翼 |
| 1 | 5 | 1-2 | 5 | Normal | `Insect_Swarm` | Ninja | `i.katana`U, `i.armor`U | かくれむれ虫 |
| 1 | 5 | 1-2 | 5 | Normal | `Insect_Swarm` | Samurai | `i.katana`U, `i.catalyst`U | 刀持ちむれ虫 |
| 1 | 5 | 1-2 | 5 | Normal | `Insect_Swarm` | Sage | `i.grimoire`U, `i.robe`U | むれ虫の古書持ち |
| 1 | 5 | 3 | 6 | Normal | `Aerial` | Duelist | `i.sword`U, `i.arrow`U | 細身の翼剣士 |
| 1 | 5 | 3 | 6 | Normal | `Aerial` | Pilgrim | `i.armor`U, `i.grimoire`U | 巡礼の小翼 |
| 1 | 5 | 4 | 8 | Elite | `Aerial` | Sage | `i.wand`EB, `i.grimoire`EB, `i.catalyst`EB | 風読みの翼 |
| 1 | 6 | 1-2 | 6 | Normal | `Beast` | Lord | `i.shield`U, `i.robe`U | 遺跡のけもの |
| 1 | 6 | 1-2 | 6 | Normal | `Beast` | Wizard | `i.wand`U, `i.catalyst`U | 遺跡の術獣 |
| 1 | 6 | 1-2 | 6 | Normal | `Beast` | Fighter | `i.sword`U, `i.gauntlet`U | 遺跡の前衛獣 |
| 1 | 6 | 3 | 7 | Normal | `Aerial` | Samurai | `i.katana`U, `i.bolt`U | 城上の翼侍 |
| 1 | 6 | 3 | 7 | Normal | `Aerial` | Ranger | `i.arrow`U, `i.archery`U | 羽弓の小翼 |
| 1 | 6 | 4 | 11 | BOSS | `Caninian` | Fighter | `i.sword`BD, `i.grimoire`BD | ケイナイアンの若き闘士 |
| 2 | 1 | 1-2 | 7 | Normal | `Frost` | Rogue | `i.bolt`U, `i.armor`U | 霜牙獣 |
| 2 | 1 | 1-2 | 7 | Normal | `Frost` | Wizard | `i.wand`U, `i.catalyst`U | 凍晶のまじもの |
| 2 | 1 | 1-2 | 7 | Normal | `Frost` | Ranger | `i.arrow`U, `i.archery`U | 雪原の氷獣 |
| 2 | 1 | 3 | 8 | Normal | `Frost` | Fighter | `i.sword`U, `i.gauntlet`U | 氷爪獣 |
| 2 | 1 | 3 | 8 | Normal | `Frost` | Lord | `i.shield`U, `i.robe`U | 白霜の群核 |
| 2 | 1 | 4 | 10 | Elite | `Frost` | Rogue | `i.sword`EA, `i.armor`EA | 氷影の上位獣 |
| 2 | 2 | 1-2 | 8 | Normal | `Frost` | Ninja | `i.katana`U, `i.armor`U | 雪潜みの氷獣 |
| 2 | 2 | 1-2 | 8 | Normal | `Frost` | Samurai | `i.katana`U, `i.catalyst`U | 凍刃獣 |
| 2 | 2 | 1-2 | 8 | Normal | `Frost` | Sage | `i.grimoire`U, `i.robe`U | 冬森の氷霊 |
| 2 | 2 | 3 | 9 | Normal | `Golem` | Duelist | `i.sword`U, `i.arrow`U | 石核の剣闘体 |
| 2 | 2 | 3 | 9 | Normal | `Golem` | Pilgrim | `i.armor`U, `i.wand`U | 祈路の岩体 |
| 2 | 2 | 4 | 11 | Elite | `Frost` | Fighter | `i.shield`EA, `i.robe`EA | 凍土の重殻獣 |
| 2 | 3 | 1-2 | 9 | Normal | `Plant_Fungal` | Lord | `i.shield`U, `i.robe`U | 菌林の群生核 |
| 2 | 3 | 1-2 | 9 | Normal | `Plant_Fungal` | Wizard | `i.wand`U, `i.catalyst`U | 胞子まじない株 |
| 2 | 3 | 1-2 | 9 | Normal | `Plant_Fungal` | Fighter | `i.sword`U, `i.gauntlet`U | 蔓根の暴れ株 |
| 2 | 3 | 3 | 10 | Normal | `Frost` | Samurai | `i.katana`U, `i.bolt`U | 霜刃獣 |
| 2 | 3 | 3 | 10 | Normal | `Frost` | Ranger | `i.arrow`U, `i.archery`U | 吹雪まとい |
| 2 | 3 | 4 | 12 | Elite | `Plant_Fungal` | Ranger | `i.arrow`EC, `i.bolt`EC, `i.archery`EC | 胞子嵐の飛種 |
| 2 | 4 | 1-2 | 10 | Normal | `Golem` | Rogue | `i.bolt`U, `i.armor`U | 岩殻の斥候体 |
| 2 | 4 | 1-2 | 10 | Normal | `Golem` | Wizard | `i.wand`U, `i.catalyst`U | 結晶脈の術体 |
| 2 | 4 | 1-2 | 10 | Normal | `Golem` | Ranger | `i.arrow`U, `i.archery`U | 谷壁の射撃体 |
| 2 | 4 | 3 | 11 | Normal | `Plant_Fungal` | Fighter | `i.sword`U, `i.gauntlet`U | 菌殻の突進株 |
| 2 | 4 | 3 | 11 | Normal | `Plant_Fungal` | Lord | `i.shield`U, `i.robe`U | 菌冠の寄生樹 |
| 2 | 4 | 4 | 13 | Elite | `Golem` | Duelist | `i.gauntlet`EB, `i.katana`EB | 玄岩の決闘体 |
| 2 | 5 | 1-2 | 11 | Normal | `Plant_Fungal` | Ninja | `i.katana`U, `i.armor`U | 胞子影の這い株 |
| 2 | 5 | 1-2 | 11 | Normal | `Plant_Fungal` | Samurai | `i.katana`U, `i.catalyst`U | 菌刃のつる株 |
| 2 | 5 | 1-2 | 11 | Normal | `Plant_Fungal` | Sage | `i.grimoire`U, `i.robe`U | 苔衣の胞子塊 |
| 2 | 5 | 3 | 12 | Normal | `Golem` | Duelist | `i.sword`U, `i.arrow`U | 石脚の剣闘体 |
| 2 | 5 | 3 | 12 | Normal | `Golem` | Pilgrim | `i.armor`U, `i.grimoire`U | 巡礼の岩体 |
| 2 | 5 | 4 | 14 | Elite | `Golem` | Sage | `i.wand`EB, `i.grimoire`EB, `i.catalyst`EB | 核晶の導師体 |
| 2 | 6 | 1-2 | 12 | Normal | `Frost` | Lord | `i.shield`U, `i.robe`U | 氷冠の群核 |
| 2 | 6 | 1-2 | 12 | Normal | `Frost` | Wizard | `i.wand`U, `i.catalyst`U | 寒天の呪獣 |
| 2 | 6 | 1-2 | 12 | Normal | `Frost` | Fighter | `i.sword`U, `i.gauntlet`U | 凍原の巨爪獣 |
| 2 | 6 | 3 | 13 | Normal | `Golem` | Samurai | `i.katana`U, `i.bolt`U | 断崖の岩刃兵 |
| 2 | 6 | 3 | 13 | Normal | `Golem` | Ranger | `i.arrow`U, `i.archery`U | 石翼の射手 |
| 2 | 6 | 4 | 17 | BOSS | `Lupinian` | Rogue | `i.armor`BD, `i.arrow`BD | ルピニアンの白狼将 |
| 3 | 1 | 1-2 | 14 | Normal | `Marine` | Rogue | `i.bolt`U, `i.armor`U | |
| 3 | 1 | 1-2 | 14 | Normal | `Marine` | Wizard | `i.wand`U, `i.catalyst`U | |
| 3 | 1 | 1-2 | 14 | Normal | `Marine` | Ranger | `i.arrow`U, `i.archery`U | |
| 3 | 1 | 3 | 15 | Normal | `Marine` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 3 | 1 | 3 | 15 | Normal | `Marine` | Lord | `i.shield`U, `i.robe`U | |
| 3 | 1 | 4 | 17 | Elite | `Marine` | Pilgrim | `i.catalyst`EA, `i.robe`EA | |
| 3 | 2 | 1-2 | 15 | Normal | `Marine` | Ninja | `i.katana`U, `i.armor`U | |
| 3 | 2 | 1-2 | 15 | Normal | `Marine` | Samurai | `i.katana`U, `i.catalyst`U | |
| 3 | 2 | 1-2 | 15 | Normal | `Marine` | Sage | `i.grimoire`U, `i.robe`U | |
| 3 | 2 | 3 | 16 | Normal | `Slime_Colony` | Duelist | `i.sword`U, `i.arrow`U | |
| 3 | 2 | 3 | 16 | Normal | `Slime_Colony` | Pilgrim | `i.armor`U, `i.wand`U | |
| 3 | 2 | 4 | 18 | Elite | `Marine` | Lord | `i.shield`EA, `i.sword`EA, `i.armor`EA | |
| 3 | 3 | 1-2 | 16 | Normal | `Spirit` | Lord | `i.shield`U, `i.robe`U | |
| 3 | 3 | 1-2 | 16 | Normal | `Spirit` | Wizard | `i.wand`U, `i.catalyst`U | |
| 3 | 3 | 1-2 | 16 | Normal | `Spirit` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 3 | 3 | 3 | 17 | Normal | `Marine` | Samurai | `i.katana`U, `i.bolt`U | |
| 3 | 3 | 3 | 17 | Normal | `Marine` | Ranger | `i.arrow`U, `i.archery`U | |
| 3 | 3 | 4 | 19 | Elite | `Spirit` | Wizard | `i.wand`EC, `i.grimoire`EC | |
| 3 | 4 | 1-2 | 17 | Normal | `Slime_Colony` | Rogue | `i.bolt`U, `i.armor`U | |
| 3 | 4 | 1-2 | 17 | Normal | `Slime_Colony` | Wizard | `i.wand`U, `i.catalyst`U | |
| 3 | 4 | 1-2 | 17 | Normal | `Slime_Colony` | Ranger | `i.arrow`U, `i.archery`U | |
| 3 | 4 | 3 | 18 | Normal | `Spirit` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 3 | 4 | 3 | 18 | Normal | `Spirit` | Lord | `i.shield`U, `i.robe`U | |
| 3 | 4 | 4 | 20 | Elite | `Slime_Colony` | Ninja | `i.gauntlet`EB, `i.katana`EB | |
| 3 | 5 | 1-2 | 18 | Normal | `Spirit` | Ninja | `i.katana`U, `i.armor`U | |
| 3 | 5 | 1-2 | 18 | Normal | `Spirit` | Samurai | `i.katana`U, `i.catalyst`U | |
| 3 | 5 | 1-2 | 18 | Normal | `Spirit` | Sage | `i.grimoire`U, `i.robe`U | |
| 3 | 5 | 3 | 19 | Normal | `Slime_Colony` | Duelist | `i.sword`U, `i.arrow`U | |
| 3 | 5 | 3 | 19 | Normal | `Slime_Colony` | Pilgrim | `i.armor`U, `i.grimoire`U | |
| 3 | 5 | 4 | 21 | Elite | `Slime_Colony` | Rogue | `i.arrow`EB, `i.bolt`EB, `i.archery`EB | |
| 3 | 6 | 1-2 | 19 | Normal | `Marine` | Lord | `i.shield`U, `i.robe`U | |
| 3 | 6 | 1-2 | 19 | Normal | `Marine` | Wizard | `i.wand`U, `i.catalyst`U | |
| 3 | 6 | 1-2 | 19 | Normal | `Marine` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 3 | 6 | 3 | 20 | Normal | `Slime_Colony` | Samurai | `i.katana`U, `i.bolt`U | |
| 3 | 6 | 3 | 20 | Normal | `Slime_Colony` | Ranger | `i.arrow`U, `i.archery`U | |
| 3 | 6 | 4 | 24 | BOSS | `Vulpinian` | Wizard | `i.wand`BD, `i.robe`BD | |
| 4 | 1 | 1-2 | 21 | Normal | `Shadowfang` | Rogue | `i.bolt`U, `i.armor`U | |
| 4 | 1 | 1-2 | 21 | Normal | `Shadowfang` | Wizard | `i.wand`U, `i.catalyst`U | |
| 4 | 1 | 1-2 | 21 | Normal | `Shadowfang` | Ranger | `i.arrow`U, `i.archery`U | |
| 4 | 1 | 3 | 22 | Normal | `Shadowfang` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 4 | 1 | 3 | 22 | Normal | `Shadowfang` | Lord | `i.shield`U, `i.robe`U | |
| 4 | 1 | 4 | 24 | Elite | `Shadowfang` | Rogue | `i.arrow`EA, `i.archery`EA | |
| 4 | 2 | 1-2 | 22 | Normal | `Shadowfang` | Ninja | `i.katana`U, `i.armor`U | |
| 4 | 2 | 1-2 | 22 | Normal | `Shadowfang` | Samurai | `i.katana`U, `i.catalyst`U | |
| 4 | 2 | 1-2 | 22 | Normal | `Shadowfang` | Sage | `i.grimoire`U, `i.robe`U | |
| 4 | 2 | 3 | 23 | Normal | `Felidian` | Duelist | `i.sword`U, `i.arrow`U | |
| 4 | 2 | 3 | 23 | Normal | `Felidian` | Pilgrim | `i.armor`U, `i.wand`U | |
| 4 | 2 | 4 | 25 | Elite | `Shadowfang` | Samurai | `i.katana`EA, `i.shield`EA, `i.gauntlet`EA | |
| 4 | 3 | 1-2 | 23 | Normal | `Titan` | Lord | `i.shield`U, `i.robe`U | |
| 4 | 3 | 1-2 | 23 | Normal | `Titan` | Wizard | `i.wand`U, `i.catalyst`U | |
| 4 | 3 | 1-2 | 23 | Normal | `Titan` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 4 | 3 | 3 | 24 | Normal | `Shadowfang` | Samurai | `i.katana`U, `i.bolt`U | |
| 4 | 3 | 3 | 24 | Normal | `Shadowfang` | Ranger | `i.arrow`U, `i.archery`U | |
| 4 | 3 | 4 | 26 | Elite | `Titan` | Fighter | `i.armor`EC, `i.bolt`EC | |
| 4 | 4 | 1-2 | 24 | Normal | `Felidian` | Rogue | `i.bolt`U, `i.armor`U | |
| 4 | 4 | 1-2 | 24 | Normal | `Felidian` | Wizard | `i.wand`U, `i.catalyst`U | |
| 4 | 4 | 1-2 | 24 | Normal | `Felidian` | Ranger | `i.arrow`U, `i.archery`U | |
| 4 | 4 | 3 | 25 | Normal | `Titan` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 4 | 4 | 3 | 25 | Normal | `Titan` | Lord | `i.shield`U, `i.robe`U | |
| 4 | 4 | 4 | 27 | Elite | `Felidian` | Duelist | `i.robe`EB, `i.sword`EB | |
| 4 | 5 | 1-2 | 25 | Normal | `Titan` | Ninja | `i.katana`U, `i.armor`U | |
| 4 | 5 | 1-2 | 25 | Normal | `Titan` | Samurai | `i.katana`U, `i.catalyst`U | |
| 4 | 5 | 1-2 | 25 | Normal | `Titan` | Sage | `i.grimoire`U, `i.robe`U | |
| 4 | 5 | 3 | 26 | Normal | `Felidian` | Duelist | `i.sword`U, `i.arrow`U | |
| 4 | 5 | 3 | 26 | Normal | `Felidian` | Pilgrim | `i.armor`U, `i.grimoire`U | |
| 4 | 5 | 4 | 28 | Elite | `Felidian` | Sage | `i.wand`EB, `i.grimoire`EB, `i.catalyst`EB | |
| 4 | 6 | 1-2 | 26 | Normal | `Shadowfang` | Lord | `i.shield`U, `i.robe`U | |
| 4 | 6 | 1-2 | 26 | Normal | `Shadowfang` | Wizard | `i.wand`U, `i.catalyst`U | |
| 4 | 6 | 1-2 | 26 | Normal | `Shadowfang` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 4 | 6 | 3 | 27 | Normal | `Felidian` | Samurai | `i.katana`U, `i.bolt`U | |
| 4 | 6 | 3 | 27 | Normal | `Felidian` | Ranger | `i.arrow`U, `i.archery`U | |
| 4 | 6 | 4 | 31 | BOSS | `Felidian` | Ranger | `i.bolt`BD, `i.archery`BD | |
| 5 | 1 | 1-2 | 28 | Normal | `Beast` | Rogue | `i.bolt`U, `i.armor`U | |
| 5 | 1 | 1-2 | 28 | Normal | `Beast` | Wizard | `i.wand`U, `i.catalyst`U | |
| 5 | 1 | 1-2 | 28 | Normal | `Beast` | Ranger | `i.arrow`U, `i.archery`U | |
| 5 | 1 | 3 | 29 | Normal | `Beast` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 5 | 1 | 3 | 29 | Normal | `Beast` | Lord | `i.shield`U, `i.robe`U | |
| 5 | 1 | 4 | 31 | Elite | `Beast` | Ranger | `i.arrow`EA, `i.bolt`EA, `i.archery`EA | |
| 5 | 2 | 1-2 | 29 | Normal | `Beast` | Ninja | `i.katana`U, `i.armor`U | |
| 5 | 2 | 1-2 | 29 | Normal | `Beast` | Samurai | `i.katana`U, `i.catalyst`U | |
| 5 | 2 | 1-2 | 29 | Normal | `Beast` | Sage | `i.grimoire`U, `i.robe`U | |
| 5 | 2 | 3 | 30 | Normal | `Dragon` | Duelist | `i.sword`U, `i.arrow`U | |
| 5 | 2 | 3 | 30 | Normal | `Dragon` | Pilgrim | `i.armor`U, `i.wand`U | |
| 5 | 2 | 4 | 32 | Elite | `Beast` | Pilgrim | `i.gauntlet`EA, `i.catalyst`EA | |
| 5 | 3 | 1-2 | 30 | Normal | `Ursan` | Lord | `i.shield`U, `i.robe`U | |
| 5 | 3 | 1-2 | 30 | Normal | `Ursan` | Wizard | `i.wand`U, `i.catalyst`U | |
| 5 | 3 | 1-2 | 30 | Normal | `Ursan` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 5 | 3 | 3 | 31 | Normal | `Beast` | Samurai | `i.katana`U, `i.bolt`U | |
| 5 | 3 | 3 | 31 | Normal | `Beast` | Ranger | `i.arrow`U, `i.archery`U | |
| 5 | 3 | 4 | 33 | Elite | `Ursan` | Fighter | `i.sword`EC, `i.armor`EC | |
| 5 | 4 | 1-2 | 31 | Normal | `Dragon` | Rogue | `i.bolt`U, `i.armor`U | |
| 5 | 4 | 1-2 | 31 | Normal | `Dragon` | Wizard | `i.wand`U, `i.catalyst`U | |
| 5 | 4 | 1-2 | 31 | Normal | `Dragon` | Ranger | `i.arrow`U, `i.archery`U | |
| 5 | 4 | 3 | 32 | Normal | `Ursan` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 5 | 4 | 3 | 32 | Normal | `Ursan` | Lord | `i.shield`U, `i.robe`U | |
| 5 | 4 | 4 | 34 | Elite | `Dragon` | Lord | `i.shield`EB, `i.katana`EB, `i.robe`EB | |
| 5 | 5 | 1-2 | 32 | Normal | `Ursan` | Ninja | `i.katana`U, `i.armor`U | |
| 5 | 5 | 1-2 | 32 | Normal | `Ursan` | Samurai | `i.katana`U, `i.catalyst`U | |
| 5 | 5 | 1-2 | 32 | Normal | `Ursan` | Sage | `i.grimoire`U, `i.robe`U | |
| 5 | 5 | 3 | 33 | Normal | `Dragon` | Duelist | `i.sword`U, `i.arrow`U | |
| 5 | 5 | 3 | 33 | Normal | `Dragon` | Pilgrim | `i.armor`U, `i.grimoire`U | |
| 5 | 5 | 4 | 35 | Elite | `Dragon` | Wizard | `i.wand`EB, `i.grimoire`EB | |
| 5 | 6 | 1-2 | 33 | Normal | `Beast` | Lord | `i.shield`U, `i.robe`U | |
| 5 | 6 | 1-2 | 33 | Normal | `Beast` | Wizard | `i.wand`U, `i.catalyst`U | |
| 5 | 6 | 1-2 | 33 | Normal | `Beast` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 5 | 6 | 3 | 34 | Normal | `Dragon` | Samurai | `i.katana`U, `i.bolt`U | |
| 5 | 6 | 3 | 34 | Normal | `Dragon` | Ranger | `i.arrow`U, `i.archery`U | |
| 5 | 6 | 4 | 38 | BOSS | `Ursan` | Samurai | `i.katana`BD, `i.shield`BD | |
| 6 | 1 | 1-2 | 35 | Normal | `Mech` | Rogue | `i.bolt`U, `i.armor`U | |
| 6 | 1 | 1-2 | 35 | Normal | `Mech` | Wizard | `i.wand`U, `i.catalyst`U | |
| 6 | 1 | 1-2 | 35 | Normal | `Mech` | Ranger | `i.arrow`U, `i.archery`U | |
| 6 | 1 | 3 | 36 | Normal | `Mech` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 6 | 1 | 3 | 36 | Normal | `Mech` | Lord | `i.shield`U, `i.robe`U | |
| 6 | 1 | 4 | 38 | Elite | `Mech` | Fighter | `i.shield`EA, `i.robe`EA | |
| 6 | 2 | 1-2 | 36 | Normal | `Mech` | Ninja | `i.katana`U, `i.armor`U | |
| 6 | 2 | 1-2 | 36 | Normal | `Mech` | Samurai | `i.katana`U, `i.catalyst`U | |
| 6 | 2 | 1-2 | 36 | Normal | `Mech` | Sage | `i.grimoire`U, `i.robe`U | |
| 6 | 2 | 3 | 37 | Normal | `Golem` | Duelist | `i.sword`U, `i.arrow`U | |
| 6 | 2 | 3 | 37 | Normal | `Golem` | Pilgrim | `i.armor`U, `i.wand`U | |
| 6 | 2 | 4 | 39 | Elite | `Mech` | Rogue | `i.sword`EA, `i.armor`EA | |
| 6 | 3 | 1-2 | 37 | Normal | `Chimera` | Lord | `i.shield`U, `i.robe`U | |
| 6 | 3 | 1-2 | 37 | Normal | `Chimera` | Wizard | `i.wand`U, `i.catalyst`U | |
| 6 | 3 | 1-2 | 37 | Normal | `Chimera` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 6 | 3 | 3 | 38 | Normal | `Mech` | Samurai | `i.katana`U, `i.bolt`U | |
| 6 | 3 | 3 | 38 | Normal | `Mech` | Ranger | `i.arrow`U, `i.archery`U | |
| 6 | 3 | 4 | 40 | Elite | `Chimera` | Sage | `i.wand`EC, `i.grimoire`EC, `i.catalyst`EC | |
| 6 | 4 | 1-2 | 38 | Normal | `Golem` | Rogue | `i.bolt`U, `i.armor`U | |
| 6 | 4 | 1-2 | 38 | Normal | `Golem` | Wizard | `i.wand`U, `i.catalyst`U | |
| 6 | 4 | 1-2 | 38 | Normal | `Golem` | Ranger | `i.arrow`U, `i.archery`U | |
| 6 | 4 | 3 | 39 | Normal | `Chimera` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 6 | 4 | 3 | 39 | Normal | `Chimera` | Lord | `i.shield`U, `i.robe`U | |
| 6 | 4 | 4 | 41 | Elite | `Golem` | Samurai | `i.katana`EB, `i.arrow`EB | |
| 6 | 5 | 1-2 | 39 | Normal | `Chimera` | Ninja | `i.katana`U, `i.armor`U | |
| 6 | 5 | 1-2 | 39 | Normal | `Chimera` | Samurai | `i.katana`U, `i.catalyst`U | |
| 6 | 5 | 1-2 | 39 | Normal | `Chimera` | Sage | `i.grimoire`U, `i.robe`U | |
| 6 | 5 | 3 | 40 | Normal | `Golem` | Duelist | `i.sword`U, `i.arrow`U | |
| 6 | 5 | 3 | 40 | Normal | `Golem` | Pilgrim | `i.armor`U, `i.grimoire`U | |
| 6 | 5 | 4 | 42 | Elite | `Golem` | Ninja | `i.gauntlet`EB, `i.bolt`EB, `i.archery`EB | |
| 6 | 6 | 1-2 | 40 | Normal | `Mech` | Lord | `i.shield`U, `i.robe`U | |
| 6 | 6 | 1-2 | 40 | Normal | `Mech` | Wizard | `i.wand`U, `i.catalyst`U | |
| 6 | 6 | 1-2 | 40 | Normal | `Mech` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 6 | 6 | 3 | 41 | Normal | `Golem` | Samurai | `i.katana`U, `i.bolt`U | |
| 6 | 6 | 3 | 41 | Normal | `Golem` | Ranger | `i.arrow`U, `i.archery`U | |
| 6 | 6 | 4 | 45 | BOSS | `Mustelid` | Sage | `i.armor`BD, `i.catalyst`BD | |
| 7 | 1 | 1-2 | 42 | Normal | `Titan` | Rogue | `i.bolt`U, `i.armor`U | |
| 7 | 1 | 1-2 | 42 | Normal | `Titan` | Wizard | `i.wand`U, `i.catalyst`U | |
| 7 | 1 | 1-2 | 42 | Normal | `Titan` | Ranger | `i.arrow`U, `i.archery`U | |
| 7 | 1 | 3 | 43 | Normal | `Titan` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 7 | 1 | 3 | 43 | Normal | `Titan` | Lord | `i.shield`U, `i.robe`U | |
| 7 | 1 | 4 | 45 | Elite | `Titan` | Lord | `i.sword`EA, `i.shield`EA | |
| 7 | 2 | 1-2 | 43 | Normal | `Titan` | Ninja | `i.katana`U, `i.armor`U | |
| 7 | 2 | 1-2 | 43 | Normal | `Titan` | Samurai | `i.katana`U, `i.catalyst`U | |
| 7 | 2 | 1-2 | 43 | Normal | `Titan` | Sage | `i.grimoire`U, `i.robe`U | |
| 7 | 2 | 3 | 44 | Normal | `Undead` | Duelist | `i.sword`U, `i.arrow`U | |
| 7 | 2 | 3 | 44 | Normal | `Undead` | Pilgrim | `i.armor`U, `i.wand`U | |
| 7 | 2 | 4 | 46 | Elite | `Titan` | Sage | `i.wand`EA, `i.grimoire`EA, `i.robe`EA | |
| 7 | 3 | 1-2 | 44 | Normal | `Aerial` | Lord | `i.shield`U, `i.robe`U | |
| 7 | 3 | 1-2 | 44 | Normal | `Aerial` | Wizard | `i.wand`U, `i.catalyst`U | |
| 7 | 3 | 1-2 | 44 | Normal | `Aerial` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 7 | 3 | 3 | 45 | Normal | `Titan` | Samurai | `i.katana`U, `i.bolt`U | |
| 7 | 3 | 3 | 45 | Normal | `Titan` | Ranger | `i.arrow`U, `i.archery`U | |
| 7 | 3 | 4 | 47 | Elite | `Aerial` | Pilgrim | `i.armor`EC, `i.catalyst`EC | |
| 7 | 4 | 1-2 | 45 | Normal | `Undead` | Rogue | `i.bolt`U, `i.armor`U | |
| 7 | 4 | 1-2 | 45 | Normal | `Undead` | Wizard | `i.wand`U, `i.catalyst`U | |
| 7 | 4 | 1-2 | 45 | Normal | `Undead` | Ranger | `i.arrow`U, `i.archery`U | |
| 7 | 4 | 3 | 46 | Normal | `Aerial` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 7 | 4 | 3 | 46 | Normal | `Aerial` | Lord | `i.shield`U, `i.robe`U | |
| 7 | 4 | 4 | 48 | Elite | `Undead` | Ranger | `i.arrow`EB, `i.bolt`EB, `i.archery`EB | |
| 7 | 5 | 1-2 | 46 | Normal | `Aerial` | Ninja | `i.katana`U, `i.armor`U | |
| 7 | 5 | 1-2 | 46 | Normal | `Aerial` | Samurai | `i.katana`U, `i.catalyst`U | |
| 7 | 5 | 1-2 | 46 | Normal | `Aerial` | Sage | `i.grimoire`U, `i.robe`U | |
| 7 | 5 | 3 | 47 | Normal | `Undead` | Duelist | `i.sword`U, `i.arrow`U | |
| 7 | 5 | 3 | 47 | Normal | `Undead` | Pilgrim | `i.armor`U, `i.grimoire`U | |
| 7 | 5 | 4 | 49 | Elite | `Undead` | Duelist | `i.gauntlet`EB, `i.katana`EB | |
| 7 | 6 | 1-2 | 47 | Normal | `Titan` | Lord | `i.shield`U, `i.robe`U | |
| 7 | 6 | 1-2 | 47 | Normal | `Titan` | Wizard | `i.wand`U, `i.catalyst`U | |
| 7 | 6 | 1-2 | 47 | Normal | `Titan` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 7 | 6 | 3 | 48 | Normal | `Undead` | Samurai | `i.katana`U, `i.bolt`U | |
| 7 | 6 | 3 | 48 | Normal | `Undead` | Ranger | `i.arrow`U, `i.archery`U | |
| 7 | 6 | 4 | 52 | BOSS | `Leporian` | Lord | `i.sword`BD, `i.wand`BD | |
| 8 | 1 | 1-2 | 49 | Normal | `Dragon` | Rogue | `i.bolt`U, `i.armor`U | |
| 8 | 1 | 1-2 | 49 | Normal | `Dragon` | Wizard | `i.wand`U, `i.catalyst`U | |
| 8 | 1 | 1-2 | 49 | Normal | `Dragon` | Ranger | `i.arrow`U, `i.archery`U | |
| 8 | 1 | 3 | 50 | Normal | `Dragon` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 8 | 1 | 3 | 50 | Normal | `Dragon` | Lord | `i.shield`U, `i.robe`U | |
| 8 | 1 | 4 | 52 | Elite | `Dragon` | Fighter | `i.sword`EA, `i.armor`EA | |
| 8 | 2 | 1-2 | 50 | Normal | `Dragon` | Ninja | `i.katana`U, `i.armor`U | |
| 8 | 2 | 1-2 | 50 | Normal | `Dragon` | Samurai | `i.katana`U, `i.catalyst`U | |
| 8 | 2 | 1-2 | 50 | Normal | `Dragon` | Sage | `i.grimoire`U, `i.robe`U | |
| 8 | 2 | 3 | 51 | Normal | `Ghost` | Duelist | `i.sword`U, `i.arrow`U | |
| 8 | 2 | 3 | 51 | Normal | `Ghost` | Pilgrim | `i.armor`U, `i.wand`U | |
| 8 | 2 | 4 | 53 | Elite | `Dragon` | Sage | `i.wand`EA, `i.bolt`EA | |
| 8 | 3 | 1-2 | 51 | Normal | `Jinma` | Lord | `i.shield`U, `i.robe`U | |
| 8 | 3 | 1-2 | 51 | Normal | `Jinma` | Wizard | `i.wand`U, `i.catalyst`U | |
| 8 | 3 | 1-2 | 51 | Normal | `Jinma` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 8 | 3 | 3 | 52 | Normal | `Dragon` | Samurai | `i.katana`U, `i.bolt`U | |
| 8 | 3 | 3 | 52 | Normal | `Dragon` | Ranger | `i.arrow`U, `i.archery`U | |
| 8 | 3 | 4 | 54 | Elite | `Jinma` | Pilgrim | `i.catalyst`EC, `i.robe`EC, `i.archery`EC | |
| 8 | 4 | 1-2 | 52 | Normal | `Ghost` | Rogue | `i.bolt`U, `i.armor`U | |
| 8 | 4 | 1-2 | 52 | Normal | `Ghost` | Wizard | `i.wand`U, `i.catalyst`U | |
| 8 | 4 | 1-2 | 52 | Normal | `Ghost` | Ranger | `i.arrow`U, `i.archery`U | |
| 8 | 4 | 3 | 53 | Normal | `Jinma` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 8 | 4 | 3 | 53 | Normal | `Jinma` | Lord | `i.shield`U, `i.robe`U | |
| 8 | 4 | 4 | 55 | Elite | `Ghost` | Samurai | `i.gauntlet`EB, `i.katana`EB, `i.arrow`EB | |
| 8 | 5 | 1-2 | 53 | Normal | `Jinma` | Ninja | `i.katana`U, `i.armor`U | |
| 8 | 5 | 1-2 | 53 | Normal | `Jinma` | Samurai | `i.katana`U, `i.catalyst`U | |
| 8 | 5 | 1-2 | 53 | Normal | `Jinma` | Sage | `i.grimoire`U, `i.robe`U | |
| 8 | 5 | 3 | 54 | Normal | `Ghost` | Duelist | `i.sword`U, `i.arrow`U | |
| 8 | 5 | 3 | 54 | Normal | `Ghost` | Pilgrim | `i.armor`U, `i.grimoire`U | |
| 8 | 5 | 4 | 56 | Elite | `Ghost` | Wizard | `i.grimoire`EB, `i.shield`EB | |
| 8 | 6 | 1-2 | 54 | Normal | `Dragon` | Lord | `i.shield`U, `i.robe`U | |
| 8 | 6 | 1-2 | 54 | Normal | `Dragon` | Wizard | `i.wand`U, `i.catalyst`U | |
| 8 | 6 | 1-2 | 54 | Normal | `Dragon` | Fighter | `i.sword`U, `i.gauntlet`U | |
| 8 | 6 | 3 | 55 | Normal | `Ghost` | Samurai | `i.katana`U, `i.bolt`U | |
| 8 | 6 | 3 | 55 | Normal | `Ghost` | Ranger | `i.arrow`U, `i.archery`U | |
| 8 | 6 | 4 | 59 | BOSS | `Cervin` | Ninja | `i.katana`BD, `i.bolt`BD, `i.grimoire`BD | |

# 2 Item drop

## 2.1 Item drop list

| `x.item_tier` | `x.rarity` | `x.source_enemy_type` | `x.item_type` | `x.name` |
|---|---|---|---|---|
| 1 | C | none | `i.sword` | 欠けた短剣 |
| 1 | C | none | `i.gauntlet` | 布巻きの手甲 |
| 1 | C | none | `i.shield` | 木の丸盾 |
| 1 | C | none | `i.armor` | 継ぎ革の服 |
| 1 | C | none | `i.robe` | 粗布のローブ |
| 1 | C | none | `i.katana` | 古びた小刀 |
| 1 | C | none | `i.wand` | ひび杖 |
| 1 | C | none | `i.grimoire` | 走り書きの本 |
| 1 | C | none | `i.catalyst` | にごり石 |
| 1 | C | none | `i.arrow` | 欠け矢 |
| 1 | C | none | `i.bolt` | 短ボルト |
| 1 | C | none | `i.archery` | つる弓 |
| 1 | U | none | `i.sword` | 鉄短剣 |
| 1 | U | none | `i.gauntlet` | 硬革の手甲 |
| 1 | U | none | `i.shield` | 補強木盾 |
| 1 | U | none | `i.armor` | 革当て |
| 1 | U | none | `i.robe` | 麻布の法衣 |
| 1 | U | none | `i.katana` | 細身の打刀 |
| 1 | U | none | `i.wand` | 灰木の杖 |
| 1 | U | none | `i.grimoire` | 初歩術式書 |
| 1 | U | none | `i.catalyst` | 磨き石の触媒 |
| 1 | U | none | `i.arrow` | 羽根矢 |
| 1 | U | none | `i.bolt` | 石先ボルト |
| 1 | U | none | `i.archery` | 狩人の弓 |
| 1 | E | `Aerial` | `i.wand` | 風呼びの小杖 |
| 1 | E | `Aerial` | `i.grimoire` | 渡り翼の教本 |
| 1 | E | `Aerial` | `i.catalyst` | 上昇気流の核石 |
| 1 | E | `Aerial` | `i.arrow` | 風切り矢 |
| 1 | E | `Aerial` | `i.bolt` | 隼落としボルト |
| 1 | E | `Aerial` | `i.archery` | 高枝の狩弓 |
| 1 | E | `Beast` | `i.gauntlet` | 獣革の拳当て |
| 1 | E | `Beast` | `i.shield` | 獣骨の小盾 |
| 1 | E | `Beast` | `i.robe` | 毛皮のまとい |
| 1 | E | `Beast` | `i.katana` | 牙研ぎの曲刀 |
| 1 | E | `Insect_Swarm` | `i.sword` | 虫刃の直剣 |
| 1 | E | `Insect_Swarm` | `i.armor` | 甲殻つぎの鎧 |
| 1 | B | `Caninian` | `i.sword` | 若牙の長剣 |
| 1 | B | `Caninian` | `i.gauntlet` | 若牙の手甲 |
| 1 | B | `Caninian` | `i.shield` | 若牙の防盾 |
| 1 | B | `Caninian` | `i.robe` | 若牙の外套 |
| 1 | B | `Caninian` | `i.katana` | 若牙の刀 |
| 1 | B | `Caninian` | `i.grimoire` | 若牙の戦書 |
| 2 | C | none | `i.sword` | |
| 2 | C | none | `i.gauntlet` | |
| 2 | C | none | `i.shield` | |
| 2 | C | none | `i.armor` | |
| 2 | C | none | `i.robe` | |
| 2 | C | none | `i.katana` | |
| 2 | C | none | `i.wand` | |
| 2 | C | none | `i.grimoire` | |
| 2 | C | none | `i.catalyst` | |
| 2 | C | none | `i.arrow` | |
| 2 | C | none | `i.bolt` | |
| 2 | C | none | `i.archery` | |
| 2 | U | none | `i.sword` | |
| 2 | U | none | `i.gauntlet` | |
| 2 | U | none | `i.shield` | |
| 2 | U | none | `i.armor` | |
| 2 | U | none | `i.robe` | |
| 2 | U | none | `i.katana` | |
| 2 | U | none | `i.wand` | |
| 2 | U | none | `i.grimoire` | |
| 2 | U | none | `i.catalyst` | |
| 2 | U | none | `i.arrow` | |
| 2 | U | none | `i.bolt` | |
| 2 | U | none | `i.archery` | |
| 2 | E | `Frost` | `i.sword` | |
| 2 | E | `Frost` | `i.armor` | |
| 2 | E | `Frost` | `i.shield` | |
| 2 | E | `Frost` | `i.robe` | |
| 2 | E | `Golem` | `i.gauntlet` | |
| 2 | E | `Golem` | `i.katana` | |
| 2 | E | `Golem` | `i.wand` | |
| 2 | E | `Golem` | `i.grimoire` | |
| 2 | E | `Golem` | `i.catalyst` | |
| 2 | E | `Plant_Fungal` | `i.arrow` | |
| 2 | E | `Plant_Fungal` | `i.bolt` | |
| 2 | E | `Plant_Fungal` | `i.archery` | |
| 2 | B | `Lupinian` | `i.armor` | |
| 2 | B | `Lupinian` | `i.arrow` | |
| 3 | C | none | `i.sword` | |
| 3 | C | none | `i.gauntlet` | |
| 3 | C | none | `i.shield` | |
| 3 | C | none | `i.armor` | |
| 3 | C | none | `i.robe` | |
| 3 | C | none | `i.katana` | |
| 3 | C | none | `i.wand` | |
| 3 | C | none | `i.grimoire` | |
| 3 | C | none | `i.catalyst` | |
| 3 | C | none | `i.arrow` | |
| 3 | C | none | `i.bolt` | |
| 3 | C | none | `i.archery` | |
| 3 | U | none | `i.sword` | |
| 3 | U | none | `i.gauntlet` | |
| 3 | U | none | `i.shield` | |
| 3 | U | none | `i.armor` | |
| 3 | U | none | `i.robe` | |
| 3 | U | none | `i.katana` | |
| 3 | U | none | `i.wand` | |
| 3 | U | none | `i.grimoire` | |
| 3 | U | none | `i.catalyst` | |
| 3 | U | none | `i.arrow` | |
| 3 | U | none | `i.bolt` | |
| 3 | U | none | `i.archery` | |
| 3 | E | `Marine` | `i.catalyst` | |
| 3 | E | `Marine` | `i.robe` | |
| 3 | E | `Marine` | `i.shield` | |
| 3 | E | `Marine` | `i.sword` | |
| 3 | E | `Marine` | `i.armor` | |
| 3 | E | `Spirit` | `i.wand` | |
| 3 | E | `Spirit` | `i.grimoire` | |
| 3 | E | `Spirit` | `i.gauntlet` | |
| 3 | E | `Spirit` | `i.katana` | |
| 3 | E | `Slime_Colony` | `i.arrow` | |
| 3 | E | `Slime_Colony` | `i.bolt` | |
| 3 | E | `Slime_Colony` | `i.archery` | |
| 3 | B | `Vulpinian` | `i.wand` | |
| 3 | B | `Vulpinian` | `i.robe` | |
| 4 | C | none | `i.sword` | |
| 4 | C | none | `i.gauntlet` | |
| 4 | C | none | `i.shield` | |
| 4 | C | none | `i.armor` | |
| 4 | C | none | `i.robe` | |
| 4 | C | none | `i.katana` | |
| 4 | C | none | `i.wand` | |
| 4 | C | none | `i.grimoire` | |
| 4 | C | none | `i.catalyst` | |
| 4 | C | none | `i.arrow` | |
| 4 | C | none | `i.bolt` | |
| 4 | C | none | `i.archery` | |
| 4 | U | none | `i.sword` | |
| 4 | U | none | `i.gauntlet` | |
| 4 | U | none | `i.shield` | |
| 4 | U | none | `i.armor` | |
| 4 | U | none | `i.robe` | |
| 4 | U | none | `i.katana` | |
| 4 | U | none | `i.wand` | |
| 4 | U | none | `i.grimoire` | |
| 4 | U | none | `i.catalyst` | |
| 4 | U | none | `i.arrow` | |
| 4 | U | none | `i.bolt` | |
| 4 | U | none | `i.archery` | |
| 4 | E | `Felidian` | `i.arrow` | |
| 4 | E | `Felidian` | `i.archery` | |
| 4 | E | `Felidian` | `i.robe` | |
| 4 | E | `Felidian` | `i.sword` | |
| 4 | E | `Felidian` | `i.wand` | |
| 4 | E | `Felidian` | `i.grimoire` | |
| 4 | E | `Felidian` | `i.catalyst` | |
| 4 | E | `Titan` | `i.armor` | |
| 4 | E | `Titan` | `i.bolt` | |
| 4 | E | `Titan` | `i.katana` | |
| 4 | E | `Titan` | `i.shield` | |
| 4 | E | `Titan` | `i.gauntlet` | |
| 4 | B | `Felidian` | `i.bolt` | |
| 4 | B | `Felidian` | `i.archery` | |
| 5 | C | none | `i.sword` | |
| 5 | C | none | `i.gauntlet` | |
| 5 | C | none | `i.shield` | |
| 5 | C | none | `i.armor` | |
| 5 | C | none | `i.robe` | |
| 5 | C | none | `i.katana` | |
| 5 | C | none | `i.wand` | |
| 5 | C | none | `i.grimoire` | |
| 5 | C | none | `i.catalyst` | |
| 5 | C | none | `i.arrow` | |
| 5 | C | none | `i.bolt` | |
| 5 | C | none | `i.archery` | |
| 5 | U | none | `i.sword` | |
| 5 | U | none | `i.gauntlet` | |
| 5 | U | none | `i.shield` | |
| 5 | U | none | `i.armor` | |
| 5 | U | none | `i.robe` | |
| 5 | U | none | `i.katana` | |
| 5 | U | none | `i.wand` | |
| 5 | U | none | `i.grimoire` | |
| 5 | U | none | `i.catalyst` | |
| 5 | U | none | `i.arrow` | |
| 5 | U | none | `i.bolt` | |
| 5 | U | none | `i.archery` | |
| 5 | E | `Beast` | `i.arrow` | |
| 5 | E | `Beast` | `i.bolt` | |
| 5 | E | `Beast` | `i.archery` | |
| 5 | E | `Beast` | `i.gauntlet` | |
| 5 | E | `Beast` | `i.catalyst` | |
| 5 | E | `Dragon` | `i.sword` | |
| 5 | E | `Dragon` | `i.armor` | |
| 5 | E | `Dragon` | `i.shield` | |
| 5 | E | `Dragon` | `i.katana` | |
| 5 | E | `Dragon` | `i.robe` | |
| 5 | E | `Dragon` | `i.wand` | |
| 5 | E | `Dragon` | `i.grimoire` | |
| 5 | B | `Ursan` | `i.katana` | |
| 5 | B | `Ursan` | `i.shield` | |
| 6 | C | none | `i.sword` | |
| 6 | C | none | `i.gauntlet` | |
| 6 | C | none | `i.shield` | |
| 6 | C | none | `i.armor` | |
| 6 | C | none | `i.robe` | |
| 6 | C | none | `i.katana` | |
| 6 | C | none | `i.wand` | |
| 6 | C | none | `i.grimoire` | |
| 6 | C | none | `i.catalyst` | |
| 6 | C | none | `i.arrow` | |
| 6 | C | none | `i.bolt` | |
| 6 | C | none | `i.archery` | |
| 6 | U | none | `i.sword` | |
| 6 | U | none | `i.gauntlet` | |
| 6 | U | none | `i.shield` | |
| 6 | U | none | `i.armor` | |
| 6 | U | none | `i.robe` | |
| 6 | U | none | `i.katana` | |
| 6 | U | none | `i.wand` | |
| 6 | U | none | `i.grimoire` | |
| 6 | U | none | `i.catalyst` | |
| 6 | U | none | `i.arrow` | |
| 6 | U | none | `i.bolt` | |
| 6 | U | none | `i.archery` | |
| 6 | E | `Chimera` | `i.wand` | |
| 6 | E | `Chimera` | `i.grimoire` | |
| 6 | E | `Chimera` | `i.catalyst` | |
| 6 | E | `Golem` | `i.katana` | |
| 6 | E | `Golem` | `i.arrow` | |
| 6 | E | `Mech` | `i.shield` | |
| 6 | E | `Mech` | `i.robe` | |
| 6 | E | `Mech` | `i.sword` | |
| 6 | E | `Mech` | `i.armor` | |
| 6 | E | `Mech` | `i.gauntlet` | |
| 6 | E | `Mustelid` | `i.bolt` | |
| 6 | E | `Mustelid` | `i.archery` | |
| 6 | B | `Mustelid` | `i.armor` | |
| 6 | B | `Mustelid` | `i.catalyst` | |
| 7 | C | none | `i.sword` | |
| 7 | C | none | `i.gauntlet` | |
| 7 | C | none | `i.shield` | |
| 7 | C | none | `i.armor` | |
| 7 | C | none | `i.robe` | |
| 7 | C | none | `i.katana` | |
| 7 | C | none | `i.wand` | |
| 7 | C | none | `i.grimoire` | |
| 7 | C | none | `i.catalyst` | |
| 7 | C | none | `i.arrow` | |
| 7 | C | none | `i.bolt` | |
| 7 | C | none | `i.archery` | |
| 7 | U | none | `i.sword` | |
| 7 | U | none | `i.gauntlet` | |
| 7 | U | none | `i.shield` | |
| 7 | U | none | `i.armor` | |
| 7 | U | none | `i.robe` | |
| 7 | U | none | `i.katana` | |
| 7 | U | none | `i.wand` | |
| 7 | U | none | `i.grimoire` | |
| 7 | U | none | `i.catalyst` | |
| 7 | U | none | `i.arrow` | |
| 7 | U | none | `i.bolt` | |
| 7 | U | none | `i.archery` | |
| 7 | E | `Aerial` | `i.arrow` | |
| 7 | E | `Aerial` | `i.bolt` | |
| 7 | E | `Aerial` | `i.archery` | |
| 7 | E | `Titan` | `i.sword` | |
| 7 | E | `Titan` | `i.shield` | |
| 7 | E | `Titan` | `i.wand` | |
| 7 | E | `Titan` | `i.grimoire` | |
| 7 | E | `Titan` | `i.robe` | |
| 7 | E | `Undead` | `i.armor` | |
| 7 | E | `Undead` | `i.catalyst` | |
| 7 | E | `Undead` | `i.gauntlet` | |
| 7 | E | `Undead` | `i.katana` | |
| 7 | B | `Leporian` | `i.sword` | |
| 7 | B | `Leporian` | `i.wand` | |
| 8 | C | none | `i.sword` | |
| 8 | C | none | `i.gauntlet` | |
| 8 | C | none | `i.shield` | |
| 8 | C | none | `i.armor` | |
| 8 | C | none | `i.robe` | |
| 8 | C | none | `i.katana` | |
| 8 | C | none | `i.wand` | |
| 8 | C | none | `i.grimoire` | |
| 8 | C | none | `i.catalyst` | |
| 8 | C | none | `i.arrow` | |
| 8 | C | none | `i.bolt` | |
| 8 | C | none | `i.archery` | |
| 8 | U | none | `i.sword` | |
| 8 | U | none | `i.gauntlet` | |
| 8 | U | none | `i.shield` | |
| 8 | U | none | `i.armor` | |
| 8 | U | none | `i.robe` | |
| 8 | U | none | `i.katana` | |
| 8 | U | none | `i.wand` | |
| 8 | U | none | `i.grimoire` | |
| 8 | U | none | `i.catalyst` | |
| 8 | U | none | `i.arrow` | |
| 8 | U | none | `i.bolt` | |
| 8 | U | none | `i.archery` | |
| 8 | E | `Cervin` | `i.sword` | |
| 8 | E | `Cervin` | `i.armor` | |
| 8 | E | `Cervin` | `i.wand` | |
| 8 | E | `Cervin` | `i.bolt` | |
| 8 | E | `Ghost` | `i.catalyst` | |
| 8 | E | `Ghost` | `i.robe` | |
| 8 | E | `Ghost` | `i.archery` | |
| 8 | E | `Jinma` | `i.gauntlet` | |
| 8 | E | `Jinma` | `i.katana` | |
| 8 | E | `Jinma` | `i.arrow` | |
| 8 | E | `Jinma` | `i.grimoire` | |
| 8 | E | `Jinma` | `i.shield` | |
| 8 | B | `Cervin` | `i.katana` | |
| 8 | B | `Cervin` | `i.bolt` | |
| 8 | B | `Cervin` | `i.grimoire` | |

# 2.2 Mythic rare item from gods

| Drop by | Item type     | name | unique ability |
|--------|---------------|-------------| ------|
| Seiran | `i.grimoire`    | 再生の聖典 | `c.unlock_Caninian_ability` |
| Seiran | `i.robe`        | 甦生の法衣 | `c.unlock_Caninian_ability` |
| Garv   | `i.katana`      | 血脈断ちの刀 | `c.unlock_Lupinian_ability` |
| Garv   | `i.shield`      | 堅忍の護盾 | `c.unlock_Lupinian_ability` |
| Kyōen  | `i.archery`     | 狡猾なる長弓 | `c.unlock_Vulpinian_ability` |
| Kyōen  | `i.bolt`        | 虚影貫きの矢 | `c.unlock_Vulpinian_ability` |
| Dolvar | `i.armor`       | 不壊の重装 | `c.unlock_Ursan_ability` |
| Dolvar | `i.gauntlet`    | 鉄城の篭手 | `c.unlock_Ursan_ability` |
| Miora  | `i.sword`       | 芽吹きの剣 | `c.unlock_Felidian_ability` |
| Miora  | `i.catalyst`    | 生命循環の触媒 | `c.unlock_Felidian_ability` |
| Rondel | `i.wand`        | 共鳴導く魔杖 | `c.unlock_Mustelid_ability` |
| Rondel | `i.arrow`       | 反響する魔矢 | `c.unlock_Mustelid_ability` |
| Lira   | `i.arrow`       | 精密射の矢 | `c.unlock_Leporian_ability` |
| Lira   | `i.archery`     | 千里照準の弓 | `c.unlock_Leporian_ability` |
| Forne  | `i.armor`       | 宿命纏いの鎧 | `c.unlock_Cervin_ability` |
| Forne  | `i.robe`        | 運命編みの外套 | `c.unlock_Cervin_ability` |
| Skuva  | `i.shield`      | 夕闇の円盾 | `c.unlock_Murid_ability` |
| Skuva  | `i.catalyst`    | 薄暮の触媒 | `c.unlock_Murid_ability` |
| Tanue  | `i.sword`       | 幻映の剣 | `c.unlock_Procyonian_ability` |
| Tanue  | `i.gauntlet`    | 迷彩の篭手 | `c.unlock_Procyonian_ability` |
| Noctyra| `i.bolt`        | 虚無穿つ矢 | |
| Noctyra| `i.katana`      | 絶滅の刀 | |
| Eris   | `i.grimoire`    | 争乱の書 | |
| Eris   | `i.wand`        | 乱調の魔杖 | |



# 3. Potential default name for player side characters

| race (English key) | potential name |
|-------------------|----------------|
| Caninian | タロウ |
| Caninian | コテツ |
| Caninian | ハヤテ |
| Caninian | シロ |
| Caninian | レオ |
| Caninian | アキラ |
| Caninian | リク |
| Caninian | ソラ |
| Caninian | マル |
| Caninian | ジン |
| Lupinian | ガルム |
| Lupinian | フェン |
| Lupinian | クロウ |
| Lupinian | ハク |
| Lupinian | レイガ |
| Lupinian | ヴォルフ |
| Lupinian | ギン |
| Lupinian | ランガ |
| Lupinian | ゼル |
| Lupinian | バルト |
| Vulpinian | キツネ丸 |
| Vulpinian | アカネ |
| Vulpinian | イズナ |
| Vulpinian | ヨウコ |
| Vulpinian | センリ |
| Vulpinian | コトネ |
| Vulpinian | クズノハ |
| Vulpinian | ミカゲ |
| Vulpinian | ヒナ |
| Vulpinian | アヤ |
| Ursan | ゴンタ |
| Ursan | バルド |
| Ursan | クマジロウ |
| Ursan | ドーガ |
| Ursan | グルン |
| Ursan | ダン |
| Ursan | ボルグ |
| Ursan | ガイ |
| Ursan | ザン |
| Ursan | ブラム |
| Felidian | ミミ |
| Felidian | タマ |
| Felidian | ルナ |
| Felidian | ネロ |
| Felidian | シエル |
| Felidian | レイ |
| Felidian | アオ |
| Felidian | カノン |
| Felidian | フィン |
| Felidian | ユイ |
| Mustelid | チョロ |
| Mustelid | ムサシ |
| Mustelid | コハク |
| Mustelid | レン |
| Mustelid | シノ |
| Mustelid | ハク |
| Mustelid | タケ |
| Mustelid | ツバメ |
| Mustelid | セン |
| Mustelid | カイ |
| Leporian | フブキ |
| Leporian | ハル |
| Leporian | トワ |
| Leporian | ユキ |
| Leporian | ナギ |
| Leporian | ミナ |
| Leporian | サラ |
| Leporian | アオイ |
| Leporian | レイナ |
| Leporian | カスミ |
| Cervin | サイカ |
| Cervin | カナエ |
| Cervin | リンネ |
| Cervin | ミコト |
| Cervin | ユズリハ |
| Cervin | シオン |
| Cervin | セツナ |
| Cervin | トキ |
| Cervin | マヒロ |
| Cervin | ツムギ |
| Murid | チュウタ |
| Murid | ネズミ丸 |
| Murid | カゲ |
| Murid | コソネ |
| Murid | スズ |
| Murid | コマ |
| Murid | ヒソカ |
| Murid | ネム |
| Murid | チビ |
| Murid | クルミ |
