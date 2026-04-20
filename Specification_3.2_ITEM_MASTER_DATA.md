## 3. ITEM

### 3.2 ITEM_MASTER_DATA

### 3.2.1 Item drop
- 3.2.1 Item drop list
  - **Special Bonus Override:** If an item is generated with a special-bonus, it becomes a special item.
    - A special item only retains: its core concept, its special-bonus
    - All other bonus sources are ignored and not applied: base-bonus, X-bonus, Y-bonus, E-bonus, C-bonus, B-bonus

| `x.item_tier` | `x.rarity` | `x.source_enemy_type` | `x.item_type` | `x.name` | special-bonus |
|---|---|---|---|---|---|
| 1 | C | none | `i.sword`C | 欠けた短剣 |
| 1 | C | none | `i.gauntlet`C | 布巻きの手甲 |
| 1 | C | none | `i.shield`C | 木の丸盾 |
| 1 | C | none | `i.armor`C | 継ぎ革の服 |
| 1 | C | none | `i.robe`C | 粗布のローブ |
| 1 | C | none | `i.katana`C | 古びた小刀 |
| 1 | C | none | `i.wand`C | ひび杖 |
| 1 | C | none | `i.grimoire`C | 走り書きの本 |
| 1 | C | none | `i.catalyst`C | にごり石 |
| 1 | C | none | `i.arrow`C | 欠け矢 |
| 1 | C | none | `i.bolt`C | 短ボルト |
| 1 | C | none | `i.archery`C | つる弓 |
| 1 | U | none | `i.sword`U | 鉄短剣 |
| 1 | U | none | `i.gauntlet`U | 硬革の手甲 |
| 1 | U | none | `i.shield`U | 補強木盾 |
| 1 | U | none | `i.armor`U | 革当て |
| 1 | U | none | `i.robe`U | 麻布の法衣 |
| 1 | U | none | `i.katana`U | 細身の打刀 |
| 1 | U | none | `i.wand`U | 灰木の杖 |
| 1 | U | none | `i.grimoire`U | 初歩術式書 |
| 1 | U | none | `i.catalyst`U | 磨き石の触媒 |
| 1 | U | none | `i.arrow`U | 羽根矢 |
| 1 | U | none | `i.bolt`U | 石先ボルト |
| 1 | U | none | `i.archery`U | 狩人の弓 |
| 1 | E | `Beast` | `i.armor`EA | 獣革の鎧 |
| 1 | E | `Beast` | `i.sword`EA | 牙の剣 |
| 1 | E | `Beast` | `i.gauntlet`EA | 獣革の拳当て |
| 1 | E | `Beast` | `i.robe`EA | 毛皮のまとい |
| 1 | E | `Beast` | `i.katana`EA | 牙研ぎの曲刀 |
| 1 | E | `Beast` | `i.shield`EA | アイギスの盾 | `c.physical-defense_x2/3` |
| 1 | E | `Aerial` | `i.robe`EB | 風羽衣 | `a.wind-rider` |
| 1 | E | `Aerial` | `i.shield`EB | 銀鏡の盾 | `c.magical-defense-x2/3` |
| 1 | E | `Aerial` | `i.wand`EB | 風呼びの小杖 |
| 1 | E | `Aerial` | `i.grimoire`EB | 渡り翼の教本 |
| 1 | E | `Aerial` | `i.catalyst`EB | 軽羽石 |
| 1 | E | `Aerial` | `i.arrow`EB | 風切り矢 |
| 1 | E | `Aerial` | `i.bolt`EB | 隼落としボルト |
| 1 | E | `Aerial` | `i.archery`EB | 軽骨弓 |
| 1 | E | `Insect_Swarm` | `i.archery`EC | 甲殻弓 |
| 1 | E | `Insect_Swarm` | `i.arrow`EC | 角針 |
| 1 | E | `Insect_Swarm` | `i.bolt`EC | 甲殻片 |
| 1 | E | `Insect_Swarm` | `i.sword`EC | 虫牙 |
| 1 | E | `Insect_Swarm` | `i.armor`EC | 甲鎧 | `a.null-death-touch` |
| 1 | B | `Caninian` | `i.sword`BD | 長剣 |
| 1 | B | `Caninian` | `i.gauntlet`BD | 手甲 |
| 1 | B | `Caninian` | `i.shield`BD | 霧払 | `a.true-sight` |
| 1 | B | `Caninian` | `i.armor`BD | ライトアーマー |
| 1 | B | `Caninian` | `i.robe`BD | 外套 |
| 1 | B | `Caninian` | `i.katana`BD | 若牙の刀 |
| 1 | B | `Caninian` | `i.grimoire`BD | 戦術書 |
| 2 | C | none | `i.sword`C | 毛巻きの短剣 |
| 2 | C | none | `i.gauntlet`C | 毛革の手甲 |
| 2 | C | none | `i.shield`C | 毛張りの丸盾 |
| 2 | C | none | `i.armor`C | 毛皮あての服 |
| 2 | C | none | `i.robe`C | 毛ローブ |
| 2 | C | none | `i.katana`C | 毛巻きの打刀 |
| 2 | C | none | `i.wand`C | 毛飾りの枝杖 |
| 2 | C | none | `i.grimoire`C | 毛表紙の術書 |
| 2 | C | none | `i.catalyst`C | 獣毛の核石 |
| 2 | C | none | `i.arrow`C | 毛羽矢 |
| 2 | C | none | `i.bolt`C | 霜毛ボルト |
| 2 | C | none | `i.archery`C | 毛弦の狩弓 |
| 2 | U | none | `i.sword`U | 霜刃の短剣 |
| 2 | U | none | `i.gauntlet`U | 氷革の手甲 |
| 2 | U | none | `i.shield`U | 板の盾 |
| 2 | U | none | `i.armor`U | 氷紋の防寒衣 |
| 2 | U | none | `i.robe`U | 氷糸の法衣 |
| 2 | U | none | `i.katana`U | 晶の打刀 |
| 2 | U | none | `i.wand`U | 晶の杖 |
| 2 | U | none | `i.grimoire`U | 氷紋術式書 |
| 2 | U | none | `i.catalyst`U | 氷核の触媒石 |
| 2 | U | none | `i.arrow`U | 羽矢 |
| 2 | U | none | `i.bolt`U | 石ボルト |
| 2 | U | none | `i.archery`U | 霜枝の弓 |
| 2 | E | `Frost` | `i.arrow`EA | 氷霜の矢 |
| 2 | E | `Frost` | `i.katana`EA | 氷霜の太刀 |
| 2 | E | `Frost` | `i.sword`EA | 白霜牙の剣 | `e.ice+0.020` |
| 2 | E | `Frost` | `i.armor`EA | 凍狼の毛鎧 |
| 2 | E | `Frost` | `i.shield`EA | 氷牙の防盾 | `r.ice_x2/3` |
| 2 | E | `Frost` | `i.robe`EA | 吹雪獣の外套 |
| 2 | E | `Golem` | `i.gauntlet`EB | 玄晶の手甲 |
| 2 | E | `Golem` | `i.katana`EB | 岩晶の刀 |
| 2 | E | `Golem` | `i.wand`EB | 結晶脈の杖 |
| 2 | E | `Golem` | `i.grimoire`EB | 石核刻印の書 |
| 2 | E | `Golem` | `i.catalyst`EB | 岩核触媒 |
| 2 | E | `Golem` | `i.robe`EB | アスベストの衣 |
| 2 | E | `Golem` | `i.sword`EB | 岩斬剣 |
| 2 | E | `Plant_Fungal` | `i.arrow`EC | 胞子羽の矢 |
| 2 | E | `Plant_Fungal` | `i.bolt`EC | 菌殻ボルト |
| 2 | E | `Plant_Fungal` | `i.archery`EC | 蔓弓「胞雨」 |
| 2 | E | `Plant_Fungal` | `i.robe`EC | シトロネラの衣 | `a.null-life-drain` |
| 2 | B | `Lupinian` | `i.robe`BD | 毛皮衣 | `a.coldproof` |
| 2 | B | `Lupinian` | `i.armor`BD | ファーストエイド | `a.first-aid`1  |
| 2 | B | `Lupinian` | `i.arrow`BD | 狼毛の矢 |
| 2 | B | `Lupinian` | `i.wand`BD | 蒼狼の杖 |
| 2 | B | `Lupinian` | `i.catalyst`BD | 蒼狼核の触媒 |
| 2 | B | `Lupinian` | `i.bolt`BD | 狼爪ボルト |
| 2 | B | `Lupinian` | `i.archery`BD | ルピニアン毛弓 |
| 3 | C | none | `i.sword`C | 貝刃の短剣 |
| 3 | C | none | `i.gauntlet`C | 貝殻の手甲 |
| 3 | C | none | `i.shield`C | 二枚貝の盾 |
| 3 | C | none | `i.armor`C | 貝綴じの軽鎧 |
| 3 | C | none | `i.robe`C | 貝砂の法衣 |
| 3 | C | none | `i.katana`C | 貝縁の小刀 |
| 3 | C | none | `i.wand`C | 貝核の杖 |
| 3 | C | none | `i.grimoire`C | 貝紋の術書 |
| 3 | C | none | `i.catalyst`C | 貝珠の触媒石 |
| 3 | C | none | `i.arrow`C | 貝羽矢 |
| 3 | C | none | `i.bolt`C | 貝先ボルト |
| 3 | C | none | `i.archery`C | 貝弦の弓 |
| 3 | U | none | `i.sword`U | 潮刃の短剣 |
| 3 | U | none | `i.gauntlet`U | 潮革の手甲 |
| 3 | U | none | `i.shield`U | 波紋の盾 |
| 3 | U | none | `i.armor`U | 海布の防衣 |
| 3 | U | none | `i.robe`U | 潮香の法衣 |
| 3 | U | none | `i.katana`U | 海燕の打刀 |
| 3 | U | none | `i.wand`U | 潮読の杖 |
| 3 | U | none | `i.grimoire`U | 海流術式書 |
| 3 | U | none | `i.catalyst`U | 潮核の触媒 |
| 3 | U | none | `i.arrow`U | 波羽矢 |
| 3 | U | none | `i.bolt`U | 潮先ボルト |
| 3 | U | none | `i.archery`U | 海曲の弓 |
| 3 | E | `Marine` | `i.grimoire`EA | 潮海の秘本 |
| 3 | E | `Marine` | `i.katana`EA | 潮海の太刀 |
| 3 | E | `Marine` | `i.wand`EA | 潮海の杖 |
| 3 | E | `Marine` | `i.catalyst`EA | 深潮核の触媒 |
| 3 | E | `Marine` | `i.robe`EA | 潮王の外套 |
| 3 | E | `Marine` | `i.shield`EA | 雷電の防盾 | `r.thunder_x2/3` |
| 3 | E | `Marine` | `i.sword`EA | 小刀 | `a.null-bind` |
| 3 | E | `Marine` | `i.armor`EA | 深海鱗の鎧 |
| 3 | E | `Spirit` | `i.wand`EC | 灯霊の杖 |
| 3 | E | `Spirit` | `i.grimoire`EC | 誘いの書 |
| 3 | E | `Spirit` | `i.gauntlet`EC | 霊波の手甲 |
| 3 | E | `Spirit` | `i.katana`EC | 幽刀 |
| 3 | E | `Spirit` | `i.archery`EC | 潮霊の弓 |
| 3 | E | `Spirit` | `i.robe`EC | 潮霊の羽衣 |
| 3 | E | `Slime_Colony` | `i.arrow`EB | 粘波の矢 |
| 3 | E | `Slime_Colony` | `i.bolt`EB | 硫酸刺 | `a.corrode` |
| 3 | E | `Slime_Colony` | `i.archery`EB | 群粘の弓 |
| 3 | E | `Slime_Colony` | `i.armor`EB | 粘膜覆 | `a.null-corrode` |
| 3 | E | `Slime_Colony` | `i.gauntlet`EB | 粘群の手甲 |
| 3 | B | `Vulpinian` | `i.bolt`BD | 狐尾のボルト |
| 3 | B | `Vulpinian` | `i.wand`BD | 狐尾の杖 |
| 3 | B | `Vulpinian` | `i.robe`BD | 茶褐色の法衣 |
| 3 | B | `Vulpinian` | `i.grimoire`BD | 狡猾の書 |
| 3 | B | `Vulpinian` | `i.sword`BD | 雷式 | `e.thunder+0.030`, `b.strength+1` |
| 3 | B | `Vulpinian` | `i.shield`BD | 矢払盾 | `a.deflection`1 |
| 3 | B | `Vulpinian` | `i.catalyst`BD | 狐核の触媒 |
| 3 | B | `Vulpinian` | `i.gauntlet`BD | 肉球 |
| 4 | C | none | `i.sword`C | 骨刃の短剣 |
| 4 | C | none | `i.gauntlet`C | 骨環の手甲 |
| 4 | C | none | `i.shield`C | 肋骨の盾 |
| 4 | C | none | `i.armor`C | 骨綴じの鎧 |
| 4 | C | none | `i.robe`C | 骨粉の法衣 |
| 4 | C | none | `i.katana`C | 骨縁の打刀 |
| 4 | C | none | `i.wand`C | 骨杖 |
| 4 | C | none | `i.grimoire`C | 骨刻の術書 |
| 4 | C | none | `i.catalyst`C | 骨核の触媒石 |
| 4 | C | none | `i.arrow`C | 骨羽矢 |
| 4 | C | none | `i.bolt`C | 骨針ボルト |
| 4 | C | none | `i.archery`C | 骨弦の弓 |
| 4 | U | none | `i.sword`U | 砂刃の短剣 |
| 4 | U | none | `i.gauntlet`U | 砂革の手甲 |
| 4 | U | none | `i.shield`U | 砂紋の盾 |
| 4 | U | none | `i.armor`U | 砂旅の外衣 |
| 4 | U | none | `i.robe`U | 乾風衣 |
| 4 | U | none | `i.katana`U | 砂走刀 |
| 4 | U | none | `i.wand`U | 陽炎の杖 |
| 4 | U | none | `i.grimoire`U | 砂塵術式書 |
| 4 | U | none | `i.catalyst`U | 砂晶の触媒 |
| 4 | U | none | `i.arrow`U | 砂羽矢 |
| 4 | U | none | `i.bolt`U | 乾砂ボルト |
| 4 | U | none | `i.archery`U | 砂風の弓 |
| 4 | E | `Shadowfang` | `i.armor`EA | 影牙の鎧 |
| 4 | E | `Shadowfang` | `i.bolt`EA | 影牙のボルト |
| 4 | E | `Shadowfang` | `i.grimoire`EA | 影牙の秘本 |
| 4 | E | `Shadowfang` | `i.katana`EA | 影牙の太刀 |
| 4 | E | `Shadowfang` | `i.robe`EA | 影牙の法衣 |
| 4 | E | `Shadowfang` | `i.shield`EA | 紅の防盾 | `r.fire_x2/3` |
| 4 | E | `Felidian` | `i.bolt`EB | 砂猫のボルト |
| 4 | E | `Felidian` | `i.arrow`EB | 猫牙矢 |
| 4 | E | `Felidian` | `i.archery`EB | 短弓 |
| 4 | E | `Felidian` | `i.robe`EB | 盗砂の猫衣 |
| 4 | E | `Felidian` | `i.sword`EB | 曲剣 |
| 4 | E | `Felidian` | `i.wand`EB | 猫呪杖 |
| 4 | E | `Felidian` | `i.grimoire`EB | 砂猫秘儀書 |
| 4 | E | `Felidian` | `i.catalyst`EB | 崩壊核 | `a.decompose`1 |
| 4 | E | `Titan` | `i.armor`EC | 巨骨の重鎧 |
| 4 | E | `Titan` | `i.bolt`EC | 砕岩ボルト |
| 4 | E | `Titan` | `i.katana`EC | 巨刃の太刀 |
| 4 | E | `Titan` | `i.shield`EC | 岩背の大盾 |
| 4 | E | `Titan` | `i.gauntlet`EC | 破砕の巨手甲 |
| 4 | E | `Titan` | `i.wand`EC | 巨神の杖 |
| 4 | B | `Felidian` | `i.bolt`BD | 狙撃ボルト |
| 4 | B | `Felidian` | `i.archery`BD | 俊敏の弓 | `a.boost`1, `c.physical-defense-multiplier_x1.1` |
| 4 | B | `Felidian` | `i.grimoire`BD | バステトの書 |
| 4 | B | `Felidian` | `i.arrow`BD | 迅矢 |
| 4 | B | `Felidian` | `i.robe`BD | カフタン |
| 4 | B | `Felidian` | `i.sword`BD | はやぶさの剣 | `a.boost`1, `c.physical-defense-multiplier_x1.1`  |
| 5 | C | none | `i.sword`C | 錆鉄の短剣 |
| 5 | C | none | `i.gauntlet`C | 鉄環の手甲 |
| 5 | C | none | `i.shield`C | 鉄板の盾 |
| 5 | C | none | `i.armor`C | 錆鉄の鎧 |
| 5 | C | none | `i.robe`C | 炉灰の法衣 |
| 5 | C | none | `i.katana`C | 赤熱の打刀 |
| 5 | C | none | `i.wand`C | 鉄芯の杖 |
| 5 | C | none | `i.grimoire`C | 鍛炉の術書 |
| 5 | C | none | `i.catalyst`C | 鉄滓石 |
| 5 | C | none | `i.arrow`C | 鋼羽矢 |
| 5 | C | none | `i.bolt`C | 鉄針 |
| 5 | C | none | `i.archery`C | 鉄弦の弓 |
| 5 | U | none | `i.sword`U | 焔鋼の短剣 |
| 5 | U | none | `i.gauntlet`U | 火鱗の手甲 |
| 5 | U | none | `i.shield`U | 炎縁の盾 |
| 5 | U | none | `i.armor`U | 熱鍛の鎧 |
| 5 | U | none | `i.robe`U | 火紋の法衣 |
| 5 | U | none | `i.katana`U | 火走りの打刀 |
| 5 | U | none | `i.wand`U | 熔鉄の杖 |
| 5 | U | none | `i.grimoire`U | 炎嶺術式書 |
| 5 | U | none | `i.catalyst`U | 火晶の触媒 |
| 5 | U | none | `i.arrow`U | 炎尾矢 |
| 5 | U | none | `i.bolt`U | 火花ボルト |
| 5 | U | none | `i.archery`U | 灼熱の弓 |
| 5 | E | `Beast` | `i.grimoire`EA | 獣の秘本 |
| 5 | E | `Beast` | `i.robe`EA | 火鼠の皮衣 | `r.fire_x3/5` |
| 5 | E | `Beast` | `i.arrow`EA | 炎獣の狩矢 |
| 5 | E | `Beast` | `i.bolt`EA | 灰牙ボルト |
| 5 | E | `Beast` | `i.archery`EA | 炎獣の長弓 |
| 5 | E | `Beast` | `i.gauntlet`EA | 焔爪の手甲 |
| 5 | E | `Beast` | `i.catalyst`EA | 獣核の焔触媒 |
| 5 | E | `Dragon` | `i.sword`EB | ドラグスレイブ | `e.fire+30` |
| 5 | E | `Dragon` | `i.armor`EB | スケールメイル | `a.null-burn` |
| 5 | E | `Dragon` | `i.shield`EB | 竜稜の盾 |
| 5 | E | `Dragon` | `i.katana`EB | 破城槌 | `a.siege` |
| 5 | E | `Dragon` | `i.robe`EB | 竜火の法衣 |
| 5 | E | `Dragon` | `i.wand`EB | 竜脈の杖 |
| 5 | E | `Dragon` | `i.grimoire`EB | 竜炎秘儀書 |
| 5 | E | `Dragon` | `i.catalyst`EB | 竜脈の触媒 |
| 5 | E | `Ursan` | `i.armor`EC | 大熊の鎧 |
| 5 | E | `Ursan` | `i.gauntlet`EC | 大熊の手甲 |
| 5 | E | `Ursan` | `i.grimoire`EC | 大熊の秘本 |
| 5 | B | `Ursan` | `i.katana`BD | 焔断 | `a.fire-protect-breaker` |
| 5 | B | `Ursan` | `i.shield`BD | 灰色の石 | `a.slow` |
| 5 | B | `Ursan` | `i.gauntlet`BD | 重手甲 |
| 5 | B | `Ursan` | `i.sword`BD | 三連爪 |
| 5 | B | `Ursan` | `i.armor`BD | 熊厚鎧 |
| 5 | B | `Ursan` | `i.wand`BD | 軍配 |
| 5 | B | `Ursan` | `i.catalyst`BD | 溶触媒 |
| 6 | C | none | `i.sword`C | 合金短剣 |
| 6 | C | none | `i.gauntlet`C | 銅の手甲 |
| 6 | C | none | `i.shield`C | シールド |
| 6 | C | none | `i.armor`C | 機鋼外装 |
| 6 | C | none | `i.robe`C | 導線ローブ |
| 6 | C | none | `i.katana`C | 歯刃の打刀 |
| 6 | C | none | `i.wand`C | 制御ロッド |
| 6 | C | none | `i.grimoire`C | 回路術式書 |
| 6 | C | none | `i.catalyst`C | 駆動コア片 |
| 6 | C | none | `i.arrow`C | 鋼芯矢 |
| 6 | C | none | `i.bolt`C | 機鋼ボルト |
| 6 | C | none | `i.archery`C | 機弦弓 |
| 6 | U | none | `i.sword`U | 高周波刃 |
| 6 | U | none | `i.gauntlet`U | 銅甲 |
| 6 | U | none | `i.shield`U | 磁気盾 |
| 6 | U | none | `i.armor`U | 電導の鎧 |
| 6 | U | none | `i.robe`U | 波紋ローブ | 
| 6 | U | none | `i.katana`U | 迅打刀 |
| 6 | U | none | `i.wand`U | 銅杖 |
| 6 | U | none | `i.grimoire`U | 雷導術式書 |
| 6 | U | none | `i.catalyst`U | 電晶触媒 |
| 6 | U | none | `i.arrow`U | 銅礫 |
| 6 | U | none | `i.bolt`U | 銅片 |
| 6 | U | none | `i.archery`U | 轟雷の弓 |
| 6 | E | `Chimera` | `i.wand`EC | 継ぎ獣導杖 |
| 6 | E | `Chimera` | `i.grimoire`EC | 合成獣秘録 |
| 6 | E | `Chimera` | `i.catalyst`EC | 継核触媒 |
| 6 | E | `Golem` | `i.katana`EB | 岩核の太刀 |
| 6 | E | `Golem` | `i.arrow`EB | 岩芯矢 |
| 6 | E | `Golem` | `i.archery`EB | 岩核の弓 |
| 6 | E | `Golem` | `i.bolt`EB | 岩核のボルト |
| 6 | E | `Golem` | `i.grimoire`EB | 岩核の秘本 |
| 6 | E | `Golem` | `i.shield`EB | 岩核の盾 |
| 6 | E | `Golem` | `i.sword`EB | 岩核の剣 |
| 6 | E | `Mech` | `i.archery`EA | 鉄筒 |
| 6 | E | `Mech` | `i.arrow`EA | 鉄礫 |
| 6 | E | `Mech` | `i.bolt`EA | 鉄塊 |
| 6 | E | `Mech` | `i.shield`EA | シールド |
| 6 | E | `Mech` | `i.robe`EA | ケージ |
| 6 | E | `Mech` | `i.sword`EA | 光の剣 |
| 6 | E | `Mech` | `i.armor`EA | アーマー |
| 6 | E | `Mech` | `i.gauntlet`EA | グローブ |
| 6 | B | `Procyonian` | `i.bolt`BD | 葉の迅撃ボルト |
| 6 | B | `Procyonian` | `i.archery`BD | 葉の狩弓 |
| 6 | B | `Procyonian` | `i.armor`BD | 絶縁体 | `a.null-shock` |
| 6 | B | `Procyonian` | `i.catalyst`BD | 演式核 | `a.equation-breaker` |
| 6 | B | `Procyonian` | `i.grimoire`BD | 葉術本 |
| 6 | B | `Procyonian` | `i.shield`BD | 葉盾 |
| 6 | B | `Procyonian` | `i.katana`BD | 雷切 | `a.thunder-protect-breaker` |
| 6 | B | `Procyonian` | `i.arrow`BD | 葉剛矢 |
| 6 | B | `Procyonian` | `i.archery`BD | 葉曲弓 |
| 7 | C | none | `i.sword`C | 星銀の短剣 |
| 7 | C | none | `i.gauntlet`C | 月環の手甲 |
| 7 | C | none | `i.shield`C | 蒼月の盾 |
| 7 | C | none | `i.armor`C | 天穹の鎧 |
| 7 | C | none | `i.robe`C | 星辰の法衣 |
| 7 | C | none | `i.katana`C | 月影の打刀 |
| 7 | C | none | `i.wand`C | 月読の杖 |
| 7 | C | none | `i.grimoire`C | 天球術式書 |
| 7 | C | none | `i.catalyst`C | 星核の触媒 |
| 7 | C | none | `i.arrow`C | 星羽矢 |
| 7 | C | none | `i.bolt`C | 月閃ボルト |
| 7 | C | none | `i.archery`C | 蒼穹の弓 |
| 7 | U | none | `i.sword`U | 光暁の短剣 |
| 7 | U | none | `i.gauntlet`U | 巨光の手甲 |
| 7 | U | none | `i.shield`U | 光巨の盾 |
| 7 | U | none | `i.armor`U | 亡影の鎧 |
| 7 | U | none | `i.robe`U | 光霊の法衣 |
| 7 | U | none | `i.katana`U | 影亡の打刀 |
| 7 | U | none | `i.wand`U | 巨光の杖 |
| 7 | U | none | `i.grimoire`U | 亡影秘儀書 |
| 7 | U | none | `i.catalyst`U | 光墓の触媒 |
| 7 | U | none | `i.arrow`U | 光閃矢 |
| 7 | U | none | `i.bolt`U | 亡影ボルト |
| 7 | U | none | `i.archery`U | 光闇の弓 |
| 7 | E | `Aerial` | `i.gauntlet`EC | 飛翼の手甲 |
| 7 | E | `Aerial` | `i.grimoire`EC | 飛翼の秘本 |
| 7 | E | `Aerial` | `i.robe`EC | 飛翼の羽衣 |
| 7 | E | `Aerial` | `i.arrow`EC | 天翔の翼矢 |
| 7 | E | `Aerial` | `i.bolt`EC | 風裂ボルト |
| 7 | E | `Aerial` | `i.archery`EC | 翼騎の長弓 |
| 7 | E | `Titan` | `i.sword`EA | 巨人剣 |
| 7 | E | `Titan` | `i.shield`EA | 巨大盾 |
| 7 | E | `Titan` | `i.wand`EA | 巨神の導杖 |
| 7 | E | `Titan` | `i.grimoire`EA | ロゼッタストーン |
| 7 | E | `Titan` | `i.robe`EA | 巨神の法衣 |
| 7 | E | `Titan` | `i.bolt`EA | 巨神のボルト |
| 7 | E | `Titan` | `i.katana`EA | 巨太刀 |
| 7 | E | `Undead` | `i.armor`EB | 冥府の鎧 |
| 7 | E | `Undead` | `i.catalyst`EB | 冥核 |
| 7 | E | `Undead` | `i.gauntlet`EB | 冥爪の手甲 |
| 7 | E | `Undead` | `i.katana`EB | 大鎌 | `a.soul-reap`1, `r.fire_x1.3` |
| 7 | E | `Undead` | `i.archery`EB | 冥府の弓 |
| 7 | E | `Undead` | `i.arrow`EB | 冥府の矢 | `a.life-drain`1, `r.fire_x1.3` |
| 7 | E | `Undead` | `i.sword`EB | 冥府の剣 | `a.life-drain`1, `r.fire_x1.3` |
| 7 | B | `Leporian` | `i.sword`BD | ホーリーソード | `a.requiem` |
| 7 | B | `Leporian` | `i.wand`BD | 月兎の宝杖 |
| 7 | B | `Leporian` | `i.armor`BD | アミラの鎧 |
| 7 | B | `Leporian` | `i.katana`BD | 白妙 | `a.ice-protect-breaker` |
| 7 | B | `Leporian` | `i.shield`BD | 月兎の聖盾 |
| 7 | B | `Leporian` | `i.archery`BD | 月兎の銀弓 | 
| 7 | B | `Leporian` | `i.arrow`BD | ホーリーアロー | `a.requiem` |
| 7 | B | `Leporian` | `i.gauntlet`BD | 月兎のガントレット |
| 7 | B | `Leporian` | `i.grimoire`BD | 月兎の歴史書 |
| 8 | C | none | `i.sword`C | ミスリルの短剣 |
| 8 | C | none | `i.gauntlet`C | 聖鍛の手甲 |
| 8 | C | none | `i.shield`C | 竜印の盾 |
| 8 | C | none | `i.armor`C | 古聖域の鎧 |
| 8 | C | none | `i.robe`C | 神託の法衣 |
| 8 | C | none | `i.katana`C | ミスリルの打刀 |
| 8 | C | none | `i.wand`C | 聖樹の杖 |
| 8 | C | none | `i.grimoire`C | 古王の術典 |
| 8 | C | none | `i.catalyst`C | 神眼の触媒 |
| 8 | C | none | `i.arrow`C | 霊銀矢 |
| 8 | C | none | `i.bolt`C | 神紋ボルト |
| 8 | C | none | `i.archery`C | 聖奏の弓 |
| 8 | U | none | `i.sword`U | アリヴァの短剣 |
| 8 | U | none | `i.gauntlet`U | 英雄譚の手甲 |
| 8 | U | none | `i.shield`U | 守の盾 |
| 8 | U | none | `i.armor`U | 星史の鎧 |
| 8 | U | none | `i.robe`U | 聖譚の法衣 |
| 8 | U | none | `i.katana`U | 伝承刃の打刀 |
| 8 | U | none | `i.wand`U | 神話導の杖 |
| 8 | U | none | `i.grimoire`U | 英霊叙事詩 |
| 8 | U | none | `i.catalyst`U | 聖遺物の触媒 |
| 8 | U | none | `i.arrow`U | 伝承羽矢 |
| 8 | U | none | `i.bolt`U | 神話閃ボルト |
| 8 | U | none | `i.archery`U | 英雄の弓 |
| 8 | E | `Voidspawn` | `i.armor`EA | 虚痕の鎧 |
| 8 | E | `Voidspawn` | `i.catalyst`EA | 虚痕の触媒 |
| 8 | E | `Voidspawn` | `i.gauntlet`EA | 虚痕の手甲 |
| 8 | E | `Voidspawn` | `i.grimoire`EA | 忘却の書 | `a.oblivion`, `r.ice_x3.0, `r.ice_x2.0`, `r.thunder_x2.0` |
| 8 | E | `Voidspawn` | `i.robe`EA | 虚痕の法衣 |
| 8 | E | `Ghost` | `i.bolt`EB | 冥霊のボルト |
| 8 | E | `Ghost` | `i.katana`EB | 冥霊の太刀 |
| 8 | E | `Ghost` | `i.shield`EB | 冥霊の盾 |
| 8 | E | `Ghost` | `i.wand`EB | 冥霊の杖 |
| 8 | E | `Ghost` | `i.catalyst`EB | 冥霊核の触媒 |
| 8 | E | `Ghost` | `i.robe`EB | 冥霊の法衣 |
| 8 | E | `Ghost` | `i.archery`EB | 幽冥の長弓 |
| 8 | E | `Jinma` | `i.gauntlet`EC | 神魔の拳甲 |
| 8 | E | `Jinma` | `i.katana`EC | 神魔の太刀 |
| 8 | E | `Jinma` | `i.arrow`EC | 神魔の祀矢 |
| 8 | E | `Jinma` | `i.grimoire`EC | 神魔祭文書 |
| 8 | E | `Jinma` | `i.shield`EC | 神魔の盾 |
| 8 | E | `Jinma` | `i.robe`EC | 神魔の衣 |
| 8 | E | `Cervin` | `i.sword`ED | 勇鹿の剣 |
| 8 | E | `Cervin` | `i.armor`ED | セルヴィンの鎧 |
| 8 | E | `Cervin` | `i.wand`ED | 勇鹿の杖 |
| 8 | E | `Cervin` | `i.bolt`ED | 勇鹿の閃ボルト |
| 8 | B | `Cervin` | `i.katana`BD | 境断 | `a.domain-breaker` |
| 8 | B | `Cervin` | `i.bolt`BD | 千里眼の雷閃ボルト |
| 8 | B | `Cervin` | `i.grimoire`BD | 刻憶の書 | `a.unforgettable` |
| 8 | B | `Cervin` | `i.wand`BD | 祓詞 | `a.m-barrier-breaker` |
| 8 | B | `Cervin` | `i.catalyst`BD | 魔封晶 | `a.magic-seal` |
| 8 | B | `Cervin` | `i.robe`BD | 定めの聖衣 |
| 8 | B | `Cervin` | `i.arrow`BD | 神矢 |
| 8 | B | `Cervin` | `i.archery`BD | 鹿眼の弓 |
| 8 | B | `Cervin` | `i.sword`BD | アストラルブレイカー |



### 3.2.2 Mythic rare item from gods

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
