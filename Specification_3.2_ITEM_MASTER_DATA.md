## 3. ITEM

### 3.2 ITEM_MASTER_DATA

### 3.2.1 Item drop
- 3.2.1 Item drop list
  - **Special Bonus Override:** If an item is generated with a special-bonus, it becomes a special item.
    - A special item only retains: its core concept, its special-bonus
    - All other bonus sources are ignored and not applied: base-bonus, X-bonus, Y-bonus, E-bonus, C-bonus, B-bonus

| `x.item_id` | `x.item_tier` | `x.itemRarity` | `x.source_enemy_type` | `x.item_type` | `x.name` | special-bonus |
|---|---|---|---|---|---|---|
| 1101 | 1 | C | none | `i.armor`C | 継ぎ革の服 |
| 1102 | 1 | C | none | `i.robe`C | 粗布のローブ |
| 1103 | 1 | C | none | `i.shield`C | 木の丸盾 |
| 1104 | 1 | C | none | `i.sword`C | 欠けた短剣 |
| 1105 | 1 | C | none | `i.katana`C | 古びた小刀 |
| 1106 | 1 | C | none | `i.gauntlet`C | 布巻きの手甲 |
| 1107 | 1 | C | none | `i.arrow`C | 欠け矢 |
| 1108 | 1 | C | none | `i.bolt`C | 短ボルト |
| 1109 | 1 | C | none | `i.archery`C | つる弓 |
| 1110 | 1 | C | none | `i.wand`C | ひび杖 |
| 1111 | 1 | C | none | `i.grimoire`C | 走り書きの本 |
| 1112 | 1 | C | none | `i.catalyst`C | にごり石 |
| 1201 | 1 | U | none | `i.armor`U | 革当て |
| 1203 | 1 | U | none | `i.robe`U | 麻布の法衣 |
| 1205 | 1 | U | none | `i.shield`U | 補強木盾 |
| 1207 | 1 | U | none | `i.sword`U | 鉄短剣 |
| 1209 | 1 | U | none | `i.katana`U | 細身の打刀 |
| 1211 | 1 | U | none | `i.gauntlet`U | 硬革の手甲 |
| 1213 | 1 | U | none | `i.arrow`U | 羽根矢 |
| 1215 | 1 | U | none | `i.bolt`U | 石先ボルト |
| 1217 | 1 | U | none | `i.archery`U | 狩人の弓 |
| 1219 | 1 | U | none | `i.wand`U | 灰木の杖 |
| 1221 | 1 | U | none | `i.grimoire`U | 初歩術式書 |
| 1223 | 1 | U | none | `i.catalyst`U | 磨き石の触媒 |
| 1301 | 1 | R | `Beast` | `i.armor`RA | 獣革の鎧 |
| 1302 | 1 | R | `Beast` | `i.sword`RA | 牙の剣 |
| 1303 | 1 | R | `Insect_Swarm` | `i.sword`RC | 虫牙 |
| 1304 | 1 | R | `Beast` | `i.katana`RA | 追跡の鎌 | `a.pursuit` |
| 1305 | 1 | R | `Insect_Swarm` | `i.arrow`RC | 角針 |
| 1306 | 1 | R | `Insect_Swarm` | `i.bolt`RC | 甲殻片 |
| 1307 | 1 | R | `Aerial` | `i.archery`RB | 軽骨弓 |
| 1308 | 1 | R | `Insect_Swarm` | `i.archery`RC | 甲殻弓 |
| 1309 | 1 | R | `Aerial` | `i.catalyst`RB | 軽羽石 |
| 1310 | 1 | R | `Insect_Swarm` | `i.armor`RC | 甲鎧 | `a.null-death-touch` |
| 1311 | 1 | R | `Beast` | `i.robe`RA | 毛皮のまとい |
| 1312 | 1 | R | `Aerial` | `i.robe`RB | 風羽衣 | `a.wind-rider` |
| 1313 | 1 | R | `Beast` | `i.shield`RA | アイギスの盾 | `c.physical-defense_x2/3` |
| 1314 | 1 | R | `Aerial` | `i.shield`RB | 銀鏡の盾 | `c.magical-defense-x2/3` |
| 1315 | 1 | R | `Beast` | `i.gauntlet`RA | 獣革の拳当て |
| 1316 | 1 | R | `Aerial` | `i.arrow`RB | 風切り矢 |
| 1317 | 1 | R | `Aerial` | `i.bolt`RB | 隼落としボルト |
| 1318 | 1 | R | `Aerial` | `i.wand`RB | 風呼びの小杖 |
| 1319 | 1 | R | `Aerial` | `i.grimoire`RB | 渡り翼の教本 |
| 1401 | 1 | E | `Caninian` | `i.armor`ED | ライトアーマー |
| 1402 | 1 | E | `Caninian` | `i.gauntlet`ED | 手甲 |
| 1403 | 1 | E | `Caninian` | `i.grimoire`ED | 戦術書 |
| 1404 | 1 | E | `Caninian` | `i.robe`ED | 外套 |
| 1405 | 1 | E | `Caninian` | `i.sword`ED | 小刀 | `a.vine-cutter` |
| 1406 | 1 | E | `Caninian` | `i.shield`ED | 霧払 | `a.true-sight` |
| 1407 | 1 | E | `Caninian` | `i.katana`ED | 若牙の刀 |
| 2101 | 2 | C | none | `i.armor`C | 毛皮あての服 |
| 2102 | 2 | C | none | `i.robe`C | 毛ローブ |
| 2103 | 2 | C | none | `i.shield`C | 毛張りの丸盾 |
| 2104 | 2 | C | none | `i.sword`C | 毛巻きの短剣 |
| 2105 | 2 | C | none | `i.katana`C | 毛巻きの打刀 |
| 2106 | 2 | C | none | `i.gauntlet`C | 毛革の手甲 |
| 2107 | 2 | C | none | `i.arrow`C | 毛羽矢 |
| 2108 | 2 | C | none | `i.bolt`C | 霜毛ボルト |
| 2109 | 2 | C | none | `i.archery`C | 毛弦の狩弓 |
| 2110 | 2 | C | none | `i.wand`C | 毛飾りの枝杖 |
| 2111 | 2 | C | none | `i.grimoire`C | 毛表紙の術書 |
| 2112 | 2 | C | none | `i.catalyst`C | 獣毛の核石 |
| 2205 | 2 | U | none | `i.shield`U | 板の盾 |
| 2209 | 2 | U | none | `i.katana`U | 晶の打刀 |
| 2213 | 2 | U | none | `i.arrow`U | 羽矢 |
| 2215 | 2 | U | none | `i.bolt`U | 石ボルト |
| 2219 | 2 | U | none | `i.wand`U | 晶の杖 |
| 2220 | 2 | U | none | `i.armor`U | 氷紋の防寒衣 |
| 2221 | 2 | U | none | `i.robe`U | 氷糸の法衣 |
| 2222 | 2 | U | none | `i.sword`U | 霜刃の短剣 |
| 2223 | 2 | U | none | `i.gauntlet`U | 氷革の手甲 |
| 2224 | 2 | U | none | `i.archery`U | 霜枝の弓 |
| 2225 | 2 | U | none | `i.grimoire`U | 氷紋術式書 |
| 2226 | 2 | U | none | `i.catalyst`U | 氷核の触媒石 |
| 2301 | 2 | R | `Golem` | `i.robe`RB | アスベストの衣 |
| 2302 | 2 | R | `Golem` | `i.sword`RB | 岩斬剣 |
| 2303 | 2 | R | `Frost` | `i.katana`RA | 氷霜の太刀 | `e.ice+0.020` |
| 2304 | 2 | R | `Frost` | `i.arrow`RA | 氷霜の矢 | `e.ice+0.020`
| 2305 | 2 | R | `Frost` | `i.armor`RA | 凍狼の毛鎧 |
| 2306 | 2 | R | `Frost` | `i.robe`RA | 吹雪獣の外套 |
| 2307 | 2 | R | `Plant_Fungal` | `i.robe`RC | シトロネラの衣 | `a.null-life-drain` |
| 2308 | 2 | R | `Frost` | `i.shield`RA | 氷牙の防盾 | `r.ice_x2/3` |
| 2309 | 2 | R | `Frost` | `i.sword`RA | 白霜牙の剣 | `e.ice+0.020` |
| 2310 | 2 | R | `Golem` | `i.katana`RB | 岩晶の刀 |
| 2311 | 2 | R | `Golem` | `i.gauntlet`RB | 玄晶の手甲 |
| 2312 | 2 | R | `Plant_Fungal` | `i.arrow`RC | 胞子羽の矢 |
| 2313 | 2 | R | `Plant_Fungal` | `i.bolt`RC | 菌殻ボルト |
| 2314 | 2 | R | `Plant_Fungal` | `i.archery`RC | 蔓弓「胞雨」 |
| 2315 | 2 | R | `Golem` | `i.wand`RB | 結晶脈の杖 |
| 2316 | 2 | R | `Golem` | `i.grimoire`RB | 石核刻印の書 |
| 2317 | 2 | R | `Golem` | `i.catalyst`RB | 岩核触媒 |
| 2401 | 2 | E | `Lupinian` | `i.arrow`ED | 狼毛の矢 |
| 2402 | 2 | E | `Lupinian` | `i.catalyst`ED | 蒼き護符 | `a.mana-ward` |
| 2403 | 2 | E | `Lupinian` | `i.wand`ED | 蒼狼の杖 |
| 2404 | 2 | E | `Lupinian` | `i.armor`ED | ファーストエイド | `a.first-aid`1  |
| 2405 | 2 | E | `Lupinian` | `i.robe`ED | 毛皮衣 | `a.coldproof` |
| 2406 | 2 | E | `Lupinian` | `i.bolt`ED | 狼爪ボルト |
| 2407 | 2 | E | `Lupinian` | `i.archery`ED | ルピニアン毛弓 |
| 3101 | 3 | C | none | `i.armor`C | 貝綴じの軽鎧 |
| 3102 | 3 | C | none | `i.robe`C | 貝砂の法衣 |
| 3103 | 3 | C | none | `i.shield`C | 二枚貝の盾 |
| 3104 | 3 | C | none | `i.sword`C | 貝刃の短剣 |
| 3105 | 3 | C | none | `i.katana`C | 貝縁の小刀 |
| 3106 | 3 | C | none | `i.gauntlet`C | 貝殻の手甲 |
| 3107 | 3 | C | none | `i.arrow`C | 貝羽矢 |
| 3108 | 3 | C | none | `i.bolt`C | 貝先ボルト |
| 3109 | 3 | C | none | `i.archery`C | 貝弦の弓 |
| 3110 | 3 | C | none | `i.wand`C | 貝核の杖 |
| 3111 | 3 | C | none | `i.grimoire`C | 貝紋の術書 |
| 3112 | 3 | C | none | `i.catalyst`C | 貝珠の触媒石 |
| 3201 | 3 | U | none | `i.armor`U | 海布の防衣 |
| 3203 | 3 | U | none | `i.robe`U | 潮香の法衣 |
| 3205 | 3 | U | none | `i.shield`U | 波紋の盾 |
| 3207 | 3 | U | none | `i.sword`U | 潮刃の短剣 |
| 3209 | 3 | U | none | `i.katana`U | 海燕の打刀 |
| 3211 | 3 | U | none | `i.gauntlet`U | 潮革の手甲 |
| 3213 | 3 | U | none | `i.arrow`U | 波羽矢 |
| 3215 | 3 | U | none | `i.bolt`U | 潮先ボルト |
| 3217 | 3 | U | none | `i.archery`U | 海曲の弓 |
| 3219 | 3 | U | none | `i.wand`U | 潮読の杖 |
| 3221 | 3 | U | none | `i.grimoire`U | 海流術式書 |
| 3223 | 3 | U | none | `i.catalyst`U | 潮核の触媒 |
| 3301 | 3 | R | `Fruit` | `i.armor`RA | 鮫肌の鎧 | `a.execution-null` |
| 3302 | 3 | R | `Slime_Colony` | `i.armor`RB | 粘膜覆 | `a.null-corrode` |
| 3303 | 3 | R | `Fruit` | `i.robe`RA | 潮王の外套 |
| 3304 | 3 | R | `Orcinian` | `i.robe`RD | 鮫肌 |
| 3305 | 3 | R | `Fruit` | `i.shield`RA | 雷電の防盾 | `r.thunder_x2/3` |
| 3306 | 3 | R | `Fruit` | `i.sword`RA | 小刀 | `a.null-bind` |
| 3307 | 3 | R | `Fruit` | `i.katana`RA | 潮海の太刀 |
| 3308 | 3 | R | `Spirit` | `i.katana`RC | 幽刀 |
| 3309 | 3 | R | `Spirit` | `i.gauntlet`RC | 霊波の手甲 |
| 3310 | 3 | R | `Slime_Colony` | `i.gauntlet`RB | 粘群の手甲 |
| 3311 | 3 | R | `Slime_Colony` | `i.arrow`RB | 粘波の矢 |
| 3312 | 3 | R | `Slime_Colony` | `i.bolt`RB | 硫酸刺 | `a.corrode` |
| 3313 | 3 | R | `Slime_Colony` | `i.archery`RB | 群粘の弓 |
| 3314 | 3 | R | `Orcinian` | `i.archery`RD | 鯨髭の弓 |
| 3315 | 3 | R | `Fruit` | `i.wand`RA | 潮海の杖 |
| 3316 | 3 | R | `Orcinian` | `i.wand`RD | シャチの杖 |
| 3317 | 3 | R | `Fruit` | `i.grimoire`RA | 潮海の秘本 |
| 3318 | 3 | R | `Spirit` | `i.grimoire`RC | 誘いの書 |
| 3319 | 3 | R | `Fruit` | `i.catalyst`RA | 深潮核の触媒 |
| 3401 | 3 | E | `Vulpinian` | `i.bolt`ED | 狐尾のボルト |
| 3402 | 3 | E | `Vulpinian` | `i.catalyst`ED | 狐假虎威 | `a.rage-breaker` |
| 3403 | 3 | E | `Vulpinian` | `i.gauntlet`ED | 肉球 |
| 3404 | 3 | E | `Vulpinian` | `i.grimoire`ED | 狡猾の書 |
| 3405 | 3 | E | `Vulpinian` | `i.robe`ED | 茶褐色の法衣 |
| 3406 | 3 | E | `Vulpinian` | `i.shield`ED | 矢払盾 | `a.deflection`1 |
| 3407 | 3 | E | `Vulpinian` | `i.sword`ED | 雷式 | `e.thunder+0.030`, `b.strength+1` |
| 3408 | 3 | E | `Vulpinian` | `i.wand`ED | 狐尾の杖 |
| 4101 | 4 | C | none | `i.armor`C | 骨綴じの鎧 |
| 4102 | 4 | C | none | `i.robe`C | 骨粉の法衣 |
| 4103 | 4 | C | none | `i.shield`C | 肋骨の盾 |
| 4104 | 4 | C | none | `i.sword`C | 骨刃の短剣 |
| 4105 | 4 | C | none | `i.katana`C | 骨縁の打刀 |
| 4106 | 4 | C | none | `i.gauntlet`C | 骨環の手甲 |
| 4107 | 4 | C | none | `i.arrow`C | 骨羽矢 |
| 4108 | 4 | C | none | `i.bolt`C | 骨針ボルト |
| 4109 | 4 | C | none | `i.archery`C | 骨弦の弓 |
| 4110 | 4 | C | none | `i.wand`C | 骨杖 |
| 4111 | 4 | C | none | `i.grimoire`C | 骨刻の術書 |
| 4112 | 4 | C | none | `i.catalyst`C | 骨核の触媒石 |
| 4201 | 4 | U | none | `i.armor`U | 砂旅の外衣 |
| 4203 | 4 | U | none | `i.robe`U | 乾風衣 | `a.dryproof` |
| 4205 | 4 | U | none | `i.shield`U | 砂紋の盾 |
| 4207 | 4 | U | none | `i.sword`U | 砂刃の短剣 |
| 4209 | 4 | U | none | `i.katana`U | 砂走刀 |
| 4211 | 4 | U | none | `i.gauntlet`U | 砂革の手甲 |
| 4213 | 4 | U | none | `i.arrow`U | 砂羽矢 |
| 4215 | 4 | U | none | `i.bolt`U | 乾砂ボルト |
| 4217 | 4 | U | none | `i.archery`U | 砂風の弓 |
| 4219 | 4 | U | none | `i.wand`U | 陽炎の杖 |
| 4221 | 4 | U | none | `i.grimoire`U | 砂塵術式書 |
| 4223 | 4 | U | none | `i.catalyst`U | 砂晶の触媒 |
| 4301 | 4 | R | `Shadowfang` | `i.armor`RA | 影牙の鎧 |
| 4302 | 4 | R | `Titan` | `i.armor`RC | 巨骨の重鎧 |
| 4303 | 4 | R | `Shadowfang` | `i.robe`RA | 影衣 |  `a.anti-overwatch` |
| 4304 | 4 | R | `Felidian` | `i.robe`RB | 盗砂の猫衣 |
| 4305 | 4 | R | `Shadowfang` | `i.shield`RA | 紅の防盾 | `r.fire_x2/3` |
| 4306 | 4 | R | `Titan` | `i.shield`RC | 岩背の大盾 |
| 4307 | 4 | R | `Felidian` | `i.sword`RB | 曲剣 |
| 4308 | 4 | R | `Shadowfang` | `i.katana`RA | 影牙の太刀 |
| 4309 | 4 | R | `Titan` | `i.katana`RC | 巨刃の太刀 |
| 4310 | 4 | R | `Titan` | `i.gauntlet`RC | 破砕の巨手甲 |
| 4311 | 4 | R | `Felidian` | `i.arrow`RB | 猫牙矢 |
| 4312 | 4 | R | `Shadowfang` | `i.bolt`RA | 影牙のボルト |
| 4313 | 4 | R | `Felidian` | `i.bolt`RB | 砂猫のボルト | `c.penet+0.16` |
| 4314 | 4 | R | `Titan` | `i.bolt`RC | 砕岩ボルト |
| 4315 | 4 | R | `Felidian` | `i.archery`RB | 短弓 |
| 4316 | 4 | R | `Felidian` | `i.wand`RB | 猫呪杖 |
| 4317 | 4 | R | `Titan` | `i.wand`RC | 巨神の杖 |
| 4318 | 4 | R | `Shadowfang` | `i.grimoire`RA | サバイバル入門書 | `a.anti-ambush` |
| 4319 | 4 | R | `Felidian` | `i.grimoire`RB | 砂猫秘儀書 |
| 4320 | 4 | R | `Felidian` | `i.catalyst`RB | 崩壊核 | `a.decompose`1 |
| 4401 | 4 | E | `Felidian` | `i.archery`ED | 俊敏の弓 | `a.boost`1, `c.physical-defense-multiplier_x1.1` |
| 4402 | 4 | E | `Felidian` | `i.arrow`ED | 迅矢 |
| 4403 | 4 | E | `Felidian` | `i.bolt`ED | 狙撃ボルト |
| 4404 | 4 | E | `Felidian` | `i.grimoire`ED | バステトの書 |
| 4405 | 4 | E | `Felidian` | `i.robe`ED | カフタン |
| 4406 | 4 | E | `Felidian` | `i.sword`ED | はやぶさの剣 | `a.boost`1, `c.physical-defense-multiplier_x1.1`  |
| 5101 | 5 | C | none | `i.armor`C | 錆鉄の鎧 |
| 5102 | 5 | C | none | `i.robe`C | 炉灰の法衣 |
| 5103 | 5 | C | none | `i.shield`C | 鉄板の盾 |
| 5104 | 5 | C | none | `i.sword`C | 錆鉄の短剣 |
| 5105 | 5 | C | none | `i.katana`C | 赤熱の打刀 |
| 5106 | 5 | C | none | `i.gauntlet`C | 鉄環の手甲 |
| 5107 | 5 | C | none | `i.arrow`C | 鋼羽矢 |
| 5108 | 5 | C | none | `i.bolt`C | 鉄針 |
| 5109 | 5 | C | none | `i.archery`C | 鉄弦の弓 |
| 5110 | 5 | C | none | `i.wand`C | 鉄芯の杖 |
| 5111 | 5 | C | none | `i.grimoire`C | 鍛炉の術書 |
| 5112 | 5 | C | none | `i.catalyst`C | 鉄滓石 |
| 5201 | 5 | U | none | `i.armor`U | 熱鍛の鎧 |
| 5203 | 5 | U | none | `i.robe`U | 火紋の法衣 |
| 5205 | 5 | U | none | `i.shield`U | 炎縁の盾 |
| 5207 | 5 | U | none | `i.sword`U | 焔鋼の短剣 |
| 5209 | 5 | U | none | `i.katana`U | 火走りの打刀 |
| 5211 | 5 | U | none | `i.gauntlet`U | 火鱗の手甲 |
| 5213 | 5 | U | none | `i.arrow`U | 炎尾矢 |
| 5215 | 5 | U | none | `i.bolt`U | 火花ボルト |
| 5217 | 5 | U | none | `i.archery`U | 灼熱の弓 |
| 5219 | 5 | U | none | `i.wand`U | 熔鉄の杖 |
| 5221 | 5 | U | none | `i.grimoire`U | 炎嶺術式書 |
| 5223 | 5 | U | none | `i.catalyst`U | 火晶の触媒 |
| 5301 | 5 | R | `Dragon` | `i.armor`RB | スケールメイル | `a.null-burn` |
| 5302 | 5 | R | `Ursan` | `i.armor`RC | 大熊の鎧 |
| 5303 | 5 | R | `Beast` | `i.robe`RA | 火鼠の皮衣 | `r.fire_x3/5` |
| 5304 | 5 | R | `Dragon` | `i.robe`RB | 竜火の法衣 |
| 5305 | 5 | R | `Dragon` | `i.shield`RB | 竜稜の盾 |
| 5306 | 5 | R | `Dragon` | `i.sword`RB | ドラグスレイブ | `e.fire+0.030` |
| 5307 | 5 | R | `Dragon` | `i.katana`RB | 破城槌 | `a.siege` |
| 5308 | 5 | R | `Beast` | `i.gauntlet`RA | 焔爪の手甲 |
| 5309 | 5 | R | `Ursan` | `i.gauntlet`RC | 大熊の手甲 |
| 5310 | 5 | R | `Beast` | `i.arrow`RA | 炎獣の狩矢 |
| 5311 | 5 | R | `Beast` | `i.bolt`RA | 灰牙ボルト |
| 5312 | 5 | R | `Beast` | `i.archery`RA | 炎獣の長弓 |
| 5313 | 5 | R | `Dragon` | `i.wand`RB | 竜脈の杖 |
| 5314 | 5 | R | `Beast` | `i.grimoire`RA | 獣の秘本 |
| 5315 | 5 | R | `Dragon` | `i.grimoire`RB | 竜炎秘儀書 |
| 5316 | 5 | R | `Ursan` | `i.grimoire`RC | 大熊の秘本 |
| 5317 | 5 | R | `Beast` | `i.catalyst`RA | 獣核の焔触媒 |
| 5318 | 5 | R | `Dragon` | `i.catalyst`RB | 竜脈の触媒 |
| 5401 | 5 | E | `Ursan` | `i.armor`ED | 熊厚鎧 |
| 5402 | 5 | E | `Ursan` | `i.catalyst`ED | 溶触媒 |
| 5403 | 5 | E | `Ursan` | `i.gauntlet`ED | 破壊腕 | `a.bulwark-breaker` |
| 5404 | 5 | E | `Ursan` | `i.katana`ED | 焔断 | `a.fire-protect-breaker` |
| 5405 | 5 | E | `Ursan` | `i.shield`ED | 灰色の石 | `a.slow` |
| 5406 | 5 | E | `Ursan` | `i.sword`ED | 三連爪 |
| 5407 | 5 | E | `Ursan` | `i.wand`ED | 軍配 | `a.command` |
| 6101 | 6 | C | none | `i.armor`C | 機鋼外装 |
| 6102 | 6 | C | none | `i.robe`C | 導線ローブ |
| 6103 | 6 | C | none | `i.shield`C | シールド |
| 6104 | 6 | C | none | `i.sword`C | 合金短剣 |
| 6105 | 6 | C | none | `i.katana`C | 歯刃の打刀 |
| 6106 | 6 | C | none | `i.gauntlet`C | 銅の手甲 |
| 6107 | 6 | C | none | `i.arrow`C | 鋼芯矢 |
| 6108 | 6 | C | none | `i.bolt`C | 機鋼ボルト |
| 6109 | 6 | C | none | `i.archery`C | 機弦弓 |
| 6110 | 6 | C | none | `i.wand`C | 制御ロッド |
| 6111 | 6 | C | none | `i.grimoire`C | 回路術式書 |
| 6112 | 6 | C | none | `i.catalyst`C | 駆動コア片 |
| 6201 | 6 | U | none | `i.armor`U | 電導の鎧 |
| 6203 | 6 | U | none | `i.robe`U | 波紋ローブ |
| 6205 | 6 | U | none | `i.shield`U | 磁気盾 |
| 6207 | 6 | U | none | `i.sword`U | 高周波刃 |
| 6209 | 6 | U | none | `i.katana`U | 迅打刀 |
| 6211 | 6 | U | none | `i.gauntlet`U | 銅甲 |
| 6213 | 6 | U | none | `i.arrow`U | 雷尾矢 |
| 6215 | 6 | U | none | `i.bolt`U | 銅片 |
| 6217 | 6 | U | none | `i.archery`U | 轟雷の弓 |
| 6219 | 6 | U | none | `i.wand`U | 銅杖 |
| 6221 | 6 | U | none | `i.grimoire`U | 雷導術式書 |
| 6223 | 6 | U | none | `i.catalyst`U | 電晶触媒 |
| 6301 | 6 | R | `Mech` | `i.armor`RA | アーマー |
| 6302 | 6 | R | `Mech` | `i.robe`RA | ケージ |
| 6303 | 6 | R | `Mech` | `i.shield`RA | シールド |
| 6304 | 6 | R | `Chiropteran` | `i.shield`RB | 蝙蝠の盾 |
| 6305 | 6 | R | `Mech` | `i.sword`RA | 光の剣 | `a.armor-break` |
| 6306 | 6 | R | `Chiropteran` | `i.sword`RB | 蝙蝠の剣 |
| 6307 | 6 | R | `Chiropteran` | `i.katana`RB | 蝙蝠の太刀 |
| 6308 | 6 | R | `Mech` | `i.gauntlet`RA | グローブ |
| 6309 | 6 | R | `Mech` | `i.arrow`RA | 鉄礫 | `a.illusion-breaker` |
| 6310 | 6 | R | `Chiropteran` | `i.arrow`RB | 影の矢 | `c.penet+0.14` |
| 6311 | 6 | R | `Mech` | `i.bolt`RA | 鉄塊 |
| 6312 | 6 | R | `Chiropteran` | `i.bolt`RB | 蝙蝠の牙 |
| 6313 | 6 | R | `Mech` | `i.archery`RA | 鉄筒 |
| 6314 | 6 | R | `Chiropteran` | `i.archery`RB | 影の弓 |
| 6315 | 6 | R | `Chimera` | `i.wand`RC | 継ぎ獣導杖 |
| 6316 | 6 | R | `Chimera` | `i.grimoire`RC | 合成獣秘録 |
| 6317 | 6 | R | `Chiropteran` | `i.grimoire`RB | 暗闇の秘本 |
| 6318 | 6 | R | `Chimera` | `i.catalyst`RC | 継核触媒 |
| 6401 | 6 | E | `Procyonian` | `i.archery`ED | 葉曲弓 |
| 6402 | 6 | E | `Procyonian` | `i.armor`ED | 絶縁体 | `a.null-shock` |
| 6403 | 6 | E | `Procyonian` | `i.arrow`ED | 葉剛矢 |
| 6404 | 6 | E | `Procyonian` | `i.bolt`ED | 葉の迅撃ボルト |
| 6405 | 6 | E | `Procyonian` | `i.catalyst`ED | 演式核 | `a.equation-breaker` |
| 6406 | 6 | E | `Procyonian` | `i.grimoire`ED | 葉術本 |
| 6407 | 6 | E | `Procyonian` | `i.katana`ED | 雷切 | `a.thunder-protect-breaker` |
| 6408 | 6 | E | `Procyonian` | `i.shield`ED | 葉盾 |
| 6409 | 6 | E | `Procyonian` | `i.archery`ED | 葉の狩弓 |
| 7101 | 7 | C | none | `i.armor`C | 天穹の鎧 |
| 7102 | 7 | C | none | `i.robe`C | 星辰の法衣 |
| 7103 | 7 | C | none | `i.shield`C | 蒼月の盾 |
| 7104 | 7 | C | none | `i.sword`C | 星銀の短剣 |
| 7105 | 7 | C | none | `i.katana`C | 月影の打刀 |
| 7106 | 7 | C | none | `i.gauntlet`C | 月環の手甲 |
| 7107 | 7 | C | none | `i.arrow`C | 星羽矢 |
| 7108 | 7 | C | none | `i.bolt`C | 月閃ボルト |
| 7109 | 7 | C | none | `i.archery`C | 蒼穹の弓 |
| 7110 | 7 | C | none | `i.wand`C | 月読の杖 |
| 7111 | 7 | C | none | `i.grimoire`C | 天球術式書 |
| 7112 | 7 | C | none | `i.catalyst`C | 星核の触媒 |
| 7201 | 7 | U | none | `i.armor`U | 亡影の鎧 |
| 7203 | 7 | U | none | `i.robe`U | 光霊の法衣 |
| 7205 | 7 | U | none | `i.shield`U | 光巨の盾 |
| 7207 | 7 | U | none | `i.sword`U | 光暁の短剣 |
| 7209 | 7 | U | none | `i.katana`U | 影亡の打刀 |
| 7211 | 7 | U | none | `i.gauntlet`U | 巨光の手甲 |
| 7213 | 7 | U | none | `i.arrow`U | 光閃矢 |
| 7215 | 7 | U | none | `i.bolt`U | 亡影ボルト |
| 7217 | 7 | U | none | `i.archery`U | 光闇の弓 |
| 7219 | 7 | U | none | `i.wand`U | 巨光の杖 |
| 7221 | 7 | U | none | `i.grimoire`U | 亡影秘儀書 |
| 7223 | 7 | U | none | `i.catalyst`U | 光墓の触媒 |
| 7301 | 7 | R | `Undead` | `i.armor`RB | 冥府の鎧 |
| 7302 | 7 | R | `Pony` | `i.robe`RA | 風駆の馬衣 |
| 7303 | 7 | R | `Origami` | `i.robe`RC | 紙の羽衣 |
| 7304 | 7 | R | `Pony` | `i.shield`RA | 蹄鉄の大盾 |
| 7305 | 7 | R | `Pony` | `i.sword`RA | 群馬の長剣 |
| 7306 | 7 | R | `Undead` | `i.sword`RB | 冥府の剣 | `a.life-drain`1, `r.fire_x1.3` |
| 7307 | 7 | R | `Pony` | `i.katana`RA | 馬駆の太刀 |
| 7308 | 7 | R | `Undead` | `i.katana`RB | 大鎌 | `a.soul-reap`1, `r.fire_x1.3` |
| 7309 | 7 | R | `Origami` | `i.gauntlet`RC | 折紙の手甲 |
| 7310 | 7 | R | `Undead` | `i.gauntlet`RB | 冥爪の手甲 |
| 7311 | 7 | R | `Origami` | `i.arrow`RC | 折矢 |
| 7312 | 7 | R | `Undead` | `i.arrow`RB | 冥府の矢 | `c.penet+0.12` |
| 7313 | 7 | R | `Origami` | `i.bolt`RC | 紙裂のボルト |
| 7314 | 7 | R | `Pony` | `i.bolt`RA | 蹄鉄のボルト |
| 7315 | 7 | R | `Origami` | `i.archery`RC | 千羽の長弓 |
| 7316 | 7 | R | `Undead` | `i.archery`RB | 冥府の弓 |
| 7317 | 7 | R | `Pony` | `i.wand`RA | 駿馬の導杖 |
| 7318 | 7 | R | `Pony` | `i.grimoire`RA | 万馬の秘典 |
| 7319 | 7 | R | `Origami` | `i.grimoire`RC | 千折の秘本 |
| 7320 | 7 | R | `Undead` | `i.catalyst`RB | 冥核 | `a.gravity-well` |
| 7401 | 7 | E | `Leporian` | `i.archery`ED | 月兎の銀弓 |
| 7402 | 7 | E | `Leporian` | `i.armor`ED | アミラの鎧 |
| 7403 | 7 | E | `Leporian` | `i.gauntlet`ED | 月兎のガントレット |
| 7404 | 7 | E | `Leporian` | `i.grimoire`ED | 月兎の歴史書 |
| 7405 | 7 | E | `Leporian` | `i.katana`ED | 白妙 | `a.ice-protect-breaker` |
| 7406 | 7 | E | `Leporian` | `i.shield`ED | 月兎の聖盾 |
| 7407 | 7 | E | `Leporian` | `i.sword`ED | ホーリーソード | `a.requiem` |
| 7408 | 7 | E | `Leporian` | `i.arrow`ED | ホーリーアロー | `a.requiem` |
| 7409 | 7 | E | `Leporian` | `i.wand`ED | 月兎の破魔杖 | `a.mana-break` |
| 8101 | 8 | C | none | `i.armor`C | 古聖域の鎧 |
| 8102 | 8 | C | none | `i.robe`C | 神託の法衣 |
| 8103 | 8 | C | none | `i.shield`C | 竜印の盾 |
| 8104 | 8 | C | none | `i.sword`C | ミスリルの短剣 |
| 8105 | 8 | C | none | `i.katana`C | ミスリルの打刀 |
| 8106 | 8 | C | none | `i.gauntlet`C | 聖鍛の手甲 |
| 8107 | 8 | C | none | `i.arrow`C | 霊銀矢 |
| 8108 | 8 | C | none | `i.bolt`C | 神紋ボルト |
| 8109 | 8 | C | none | `i.archery`C | 聖奏の弓 |
| 8110 | 8 | C | none | `i.wand`C | 聖樹の杖 |
| 8111 | 8 | C | none | `i.grimoire`C | 古王の術典 |
| 8112 | 8 | C | none | `i.catalyst`C | 神眼の触媒 |
| 8201 | 8 | U | none | `i.armor`U | 星史の鎧 |
| 8203 | 8 | U | none | `i.robe`U | 聖譚の法衣 |
| 8205 | 8 | U | none | `i.shield`U | 守の盾 |
| 8207 | 8 | U | none | `i.sword`U | アリヴァの短剣 |
| 8209 | 8 | U | none | `i.katana`U | 伝承刃の打刀 |
| 8211 | 8 | U | none | `i.gauntlet`U | 英雄譚の手甲 |
| 8213 | 8 | U | none | `i.arrow`U | 伝承羽矢 |
| 8215 | 8 | U | none | `i.bolt`U | 神話閃ボルト |
| 8217 | 8 | U | none | `i.archery`U | 英雄の弓 |
| 8219 | 8 | U | none | `i.wand`U | 神話導の杖 |
| 8221 | 8 | U | none | `i.grimoire`U | 英霊叙事詩 |
| 8223 | 8 | U | none | `i.catalyst`U | 聖遺物の触媒 |
| 8301 | 8 | R | `Voidspawn` | `i.armor`RA | 虚痕の鎧 |
| 8302 | 8 | R | `Cervin` | `i.armor`RD | セルヴィンの鎧 |
| 8303 | 8 | R | `Voidspawn` | `i.robe`RA | 虚痕の法衣 |
| 8304 | 8 | R | `Ghost` | `i.robe`RB | ファイアーヴェール | `r.fire_x2/3` |
| 8305 | 8 | R | `Jinma` | `i.robe`RC | パーカー |
| 8306 | 8 | R | `Ghost` | `i.shield`RB | 霊の盾 |
| 8307 | 8 | R | `Jinma` | `i.shield`RC | ライオットシールド |
| 8308 | 8 | R | `Cervin` | `i.sword`RD | 勇鹿の剣 |
| 8309 | 8 | R | `Ghost` | `i.katana`RB | 拒絶の刀 |
| 8310 | 8 | R | `Jinma` | `i.katana`RC | グラフェンブレード |
| 8311 | 8 | R | `Voidspawn` | `i.gauntlet`RA | 虚痕の手甲 |
| 8312 | 8 | R | `Jinma` | `i.gauntlet`RC | 炭素繊維の拳甲 |
| 8313 | 8 | R | `Jinma` | `i.arrow`RC | 磁気矢 |
| 8314 | 8 | R | `Ghost` | `i.bolt`RB | 霊撃のボルト |
| 8315 | 8 | R | `Cervin` | `i.bolt`RD | 勇鹿の閃ボルト |
| 8316 | 8 | R | `Ghost` | `i.archery`RB | 残痕の弓 |
| 8317 | 8 | R | `Ghost` | `i.wand`RB | 珪素の杖 |
| 8318 | 8 | R | `Cervin` | `i.wand`RD | 勇鹿の杖 |S
| 8319 | 8 | R | `Voidspawn` | `i.grimoire`RA | 忘却の書 | `a.fading_memory`, `r.ice_x1.5, `r.ice_x1.25`, `r.thunder_x1.25` |
| 8320 | 8 | R | `Jinma` | `i.grimoire`RC | 反乱の手引 | `a.defiance` |
| 8321 | 8 | R | `Voidspawn` | `i.catalyst`RA | 虚痕の触媒 |
| 8322 | 8 | R | `Ghost` | `i.catalyst`RB | コバルト |
| 8401 | 8 | E | `Cervin` | `i.archery`ED | 鹿眼の弓 |
| 8402 | 8 | E | `Cervin` | `i.arrow`ED | 神矢 |
| 8403 | 8 | E | `Cervin` | `i.bolt`ED | 千里眼の雷閃ボルト |
| 8404 | 8 | E | `Cervin` | `i.catalyst`ED | 魔封晶 | `a.magic-seal` |
| 8405 | 8 | E | `Cervin` | `i.grimoire`ED | 刻憶の書 | `a.unforgettable` |
| 8406 | 8 | E | `Cervin` | `i.katana`ED | 境断 | `a.domain-breaker` |
| 8407 | 8 | E | `Cervin` | `i.robe`ED | 定めの聖衣 |
| 8408 | 8 | E | `Cervin` | `i.sword`ED | アストラルブレイカー |
| 8409 | 8 | E | `Cervin` | `i.wand`ED | 祓詞 | `a.m-barrier-breaker` |



### 3.2.2 Mythic rare item from gods

| Item ID | Drop by | Item type     | name | unique ability |
|--------|--------|---------------|-------------| ------|
| 8501 | Seiran | `i.grimoire`    | 再生の聖典 | `c.unlock_Caninian_ability` |
| 8502 | Seiran | `i.robe`        | 甦生の法衣 | `c.unlock_Caninian_ability` |
| 8503 | Garv   | `i.katana`      | 血脈断ちの刀 | `c.unlock_Lupinian_ability` |
| 8504 | Garv   | `i.shield`      | 堅忍の護盾 | `c.unlock_Lupinian_ability` |
| 8505 | Kyōen  | `i.archery`     | 狡猾なる長弓 | `c.unlock_Vulpinian_ability` |
| 8506 | Kyōen  | `i.bolt`        | 虚影貫きの矢 | `c.unlock_Vulpinian_ability` |
| 8507 | Dolvar | `i.armor`       | 不壊の重装 | `c.unlock_Ursan_ability` |
| 8508 | Dolvar | `i.gauntlet`    | 鉄城の篭手 | `c.unlock_Ursan_ability` |
| 8509 | Miora  | `i.sword`       | 芽吹きの剣 | `c.unlock_Felidian_ability` |
| 8510 | Miora  | `i.catalyst`    | 生命循環の触媒 | `c.unlock_Felidian_ability` |
| 8511 | Rondel | `i.wand`        | 共鳴導く魔杖 | `c.unlock_Mustelid_ability` |
| 8512 | Rondel | `i.arrow`       | 反響する魔矢 | `c.unlock_Mustelid_ability` |
| 8513 | Lira   | `i.arrow`       | 精密射の矢 | `c.unlock_Leporian_ability` |
| 8514 | Lira   | `i.archery`     | 千里照準の弓 | `c.unlock_Leporian_ability` |
| 8515 | Forne  | `i.armor`       | 宿命纏いの鎧 | `c.unlock_Cervin_ability` |
| 8516 | Forne  | `i.robe`        | 運命編みの外套 | `c.unlock_Cervin_ability` |
| 8517 | Skuva  | `i.shield`      | 夕闇の円盾 | `c.unlock_Murid_ability` |
| 8518 | Skuva  | `i.catalyst`    | 薄暮の触媒 | `c.unlock_Murid_ability` |
| 8519 | Tanue  | `i.sword`       | 幻映の剣 | `c.unlock_Procyonian_ability` |
| 8520 | Tanue  | `i.gauntlet`    | 迷彩の篭手 | `c.unlock_Procyonian_ability` |
| 8521 | Noctyra| `i.bolt`        | 虚無穿つ矢 | |
| 8522 | Noctyra| `i.katana`      | 絶滅の刀 | |
| 8523 | Eris   | `i.grimoire`    | 争乱の書 | |
| 8524 | Eris   | `i.wand`        | 乱調の魔杖 | |
