# PT1 Expedition 4 improvement — 2026/09/13

Applied through the official API to the active desktop dev save, v0.9.7 build 14. This was an existing-save improvement challenge, not a Regulation 12.1 scored evaluation.

Expedition 4, full depth, difficulty +22, Fertility deity, formation order and level 48 were held fixed. No actual sorties, purchases, source-code changes or game version changes were made. The committed configuration matched the forecast candidate in builds, equipment, combat values, HP, deity and expedition settings. Control release was confirmed by the server.

## Forecast evidence

Each forecast batch contained 1,000 independent trials. Percentages estimate full-departure-HP outcomes and do not guarantee the next actual sortie.

| Setup | Clear | Draw | Wounded retreat | Defeat |
|---|---:|---:|---:|---:|
| Original | 0.0% | 18.7% | 13.6% | 67.7% |
| Winning candidate | 52.6% | 6.3% | 5.0% | 36.1% |
| Independent confirmation | 51.7% | 7.6% | 4.1% | 36.6% |
| Committed live setup | 52.5% | 6.1% | 4.8% | 36.6% |

## Final builds

| Member | Race | Main / Sub class | Lineage / Predisposition |
|---|---|---|---|
| ケモ | kemoria | guardian / guardian | unascertained / none |
| ユイ | felidian | duelist / pilgrim | sandstorm / aggressive |
| ロップ | leporian | sage / alchemist | abyssal_sea / inquisitive |
| ソウタ | procyonian | striker / ninja | firmament / aggressive |
| らびめる | vulpinian | sage / alchemist | sandstorm / inquisitive |
| ライカ | caninian | sage / alchemist | pioneer / none |

Maximum party HP: 41,817 → 43,303.

ケモ gained Guardian mastery. ロップ became a Sage/Alchemist. ソウタ became a Striker/Ninja with Aggressive predisposition. らびめる retained the name but changed from Mimorian to Vulpinian, with Sandstorm lineage, Inquisitive predisposition and Sage/Alchemist classes. ユイ and ライカ retained their builds and equipment. Configured FULL Auto Equipment supplied compatible gear and Jewel allocation.

## Final equipment

Base item names below are the API raw names; enhancement, Super Rare ID and Jewel are shown separately to identify exact variants. All members remain in FULL automatic equipment mode. Future automatic equipment may change these items.

### ケモ

| Slot | Base ID | Item | Enhancement | Super Rare ID | Jewel |
|---|---:|---|---:|---:|---|
| 1 | 8101 | 古聖域の鎧 | 6 | 0 | fort:8 |
| 2 | 8310 | グラフェンブレード | 5 | 0 | focus:8 |
| 3 | 8407 | 定めの聖衣 | 1 | 81 | ward:8 |
| 4 | 8311 | 虚痕の手甲 | 2 | 55 | fort:5 |
| 5 | 8215 | 神話閃ボルト | 6 | 0 | might:6 |
| 6 | 7205 | 光巨の盾 | 6 | 0 | shade:8 |
| 7 | 8201 | 星史の鎧 | 5 | 0 | fort:7 |
| 8 | 8102 | 神託の法衣 | 6 | 0 | ward:7 |
| 9 | 7405 | 白妙 | 4 | 0 | focus:6 |
| 10 | 8307 | ライオットシールド | 2 | 62 | shade:7 |
| 11 | 7105 | 月影の打刀 | 6 | 0 | focus:5 |
| 12 | 6308 | グローブ | 5 | 0 | fort:4 |
| 13 | 8207 | アリヴァの短剣 | 6 | 0 | might:7 |
| 14 | 7402 | アミラの鎧 | 4 | 0 | fort:6 |
| 15 | 8203 | 聖譚の法衣 | 5 | 0 | ward:6 |

### ユイ

| Slot | Base ID | Item | Enhancement | Super Rare ID | Jewel |
|---|---:|---|---:|---:|---|
| 1 | 8311 | 虚痕の手甲 | 6 | 0 | fort:5 |
| 2 | 8101 | 古聖域の鎧 | 6 | 0 | fort:8 |
| 3 | 8211 | 英雄譚の手甲 | 6 | 0 | fort:4 |
| 4 | 8207 | アリヴァの短剣 | 6 | 0 | might:7 |
| 5 | 8102 | 神託の法衣 | 4 | 51 | ward:7 |
| 6 | 4201 | 砂旅の外衣 | 1 | 70 | fort:7 |
| 7 | 8201 | 星史の鎧 | 5 | 0 | fort:6 |
| 8 | 4307 | 曲剣 | 0 | 17 | might:6 |
| 9 | 8408 | アストラルブレイカー | 2 | 21 | might:5 |
| 10 | 7302 | 風駆の馬衣 | 0 | 49 | ward:6 |
| 11 | 7306 | 冥府の剣 | 5 | 0 | might:4 |
| 12 | 6308 | グローブ | 4 | 0 | fort:3 |

### ロップ

| Slot | Base ID | Item | Enhancement | Super Rare ID | Jewel |
|---|---:|---|---:|---:|---|
| 1 | 7221 | 亡影秘儀書 | 6 | 0 | arcana:8 |
| 2 | 8321 | 虚痕の触媒 | 0 | 30 | ward:5 |
| 3 | 6301 | アーマー | 2 | 10 | fort:7 |
| 4 | 3102 | 貝砂の法衣 | 1 | 76 | ward:7 |
| 5 | 8221 | 英霊叙事詩 | 5 | 0 | arcana:6 |
| 6 | 8319 | 忘却の書 | 3 | 0 | arcana:5 |
| 7 | 6223 | 電晶触媒 | 3 | 62 | ward:4 |
| 8 | 8301 | 虚痕の鎧 | 4 | 0 | fort:6 |
| 9 | 8203 | 聖譚の法衣 | 6 | 0 | ward:6 |
| 10 | 8320 | 反乱の手引 | 3 | 0 | arcana:4 |
| 11 | 7404 | 月兎の歴史書 | 3 | 0 | arcana:3 |

### ソウタ

| Slot | Base ID | Item | Enhancement | Super Rare ID | Jewel |
|---|---:|---|---:|---:|---|
| 1 | 6313 | 鉄筒 | 3 | 68 | focus:8 |
| 2 | 8101 | 古聖域の鎧 | 6 | 0 | fort:7 |
| 3 | 8102 | 神託の法衣 | 6 | 0 | ward:6 |
| 4 | 8315 | 勇鹿の閃ボルト | 6 | 0 | might:7 |
| 5 | 8217 | 英雄の弓 | 5 | 0 | focus:6 |
| 6 | 4402 | 迅矢 | 0 | 19 | shade:8 |
| 7 | 4312 | 影牙のボルト | 6 | 65 | might:6 |
| 8 | 8301 | 虚痕の鎧 | 4 | 0 | fort:6 |
| 9 | 8203 | 聖譚の法衣 | 5 | 0 | ward:5 |
| 10 | 7215 | 亡影ボルト | 6 | 0 | might:5 |
| 11 | 6217 | 轟雷の弓 | 5 | 0 | focus:5 |

### らびめる

| Slot | Base ID | Item | Enhancement | Super Rare ID | Jewel |
|---|---:|---|---:|---:|---|
| 1 | 4110 | 骨杖 | 3 | 3 | arcana:8 |
| 2 | 1309 | 軽羽石 | 6 | 0 | ward:4 |
| 3 | 3101 | 貝綴じの軽鎧 | 0 | 23 | fort:7 |
| 4 | 8102 | 神託の法衣 | 6 | 0 | ward:6 |
| 5 | 8111 | 古王の術典 | 6 | 0 | arcana:5 |
| 6 | 8321 | 虚痕の触媒 | 5 | 0 | ward:3 |
| 7 | 7318 | 万馬の秘典 | 5 | 0 | arcana:4 |
| 8 | 5407 | 軍配 | 0 | 71 | arcana:6 |
| 9 | 8319 | 忘却の書 | 3 | 0 | arcana:3 |
| 10 | 8203 | 聖譚の法衣 | 5 | 0 | ward:5 |
| 11 | 7223 | 光墓の触媒 | 6 | 0 | ward:2 |

### ライカ

| Slot | Base ID | Item | Enhancement | Super Rare ID | Jewel |
|---|---:|---|---:|---:|---|
| 1 | 8101 | 古聖域の鎧 | 6 | 0 | fort:7 |
| 2 | 8221 | 英霊叙事詩 | 6 | 0 | arcana:7 |
| 3 | 8321 | 虚痕の触媒 | 4 | 0 | ward:4 |
| 4 | 8320 | 反乱の手引 | 5 | 0 | arcana:6 |
| 5 | 7404 | 月兎の歴史書 | 0 | 59 | arcana:5 |
| 6 | 7221 | 亡影秘儀書 | 6 | 0 | arcana:4 |
| 7 | 8203 | 聖譚の法衣 | 5 | 0 | ward:6 |
| 8 | 8409 | 祓詞 | 1 | 78 | arcana:8 |
| 9 | 7223 | 光墓の触媒 | 6 | 0 | ward:3 |
| 10 | 7203 | 光霊の法衣 | 0 | 26 | ward:5 |
| 11 | 8223 | 聖遺物の触媒 | 1 | 15 | ward:2 |

## API operations

Observation, catalog, latest retained battle log and member build options were inspected through the API. Fifteen 1,000-trial forecast batches were run (baseline, twelve candidates, independent winner confirmation and committed-state verification). Only one gameplay mutation was committed: configure_party for PT1. The other candidates were hypothetical and did not change live progression.
