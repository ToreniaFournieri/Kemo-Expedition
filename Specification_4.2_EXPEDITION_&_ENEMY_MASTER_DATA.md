## 4. EXPEDITION_&_ENEMY

### 4.2 EXPEDITION_&_ENEMY_MASTER_DATA

### 4.2.2 Enemy

- Common item drop
  - Every value in an enemy's `x.item_ids` list must reference an existing numeric `x.item_id` in @Specification_3.2_ITEM_MASTER_DATA.md.
  - Common item drops are determined by the enemy's `x.class` and expedition tier.

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
- Once the Drop Set is determined, select the items in @Specification_3.2_ITEM_MASTER_DATA.md whose `x.item_tier` matches the enemy's expedition tier, whose `x.rarity` is `C`, and whose `x.item_type` matches the listed item types.
- Append the selected numeric `x.item_id` values to the enemy's `x.item_ids` list.
  
| Drop set | item types |
|----------|-------|
| Melee | `i.sword`, `i.katana`, `i.gauntlet` |
| Ranged | `i.arrow`, `i.bolt`, `i.archery` |
| Magic | `i.wand`, `i.grimoire`, `i.catalyst` |
| Defensive | `i.armor`, `i.robe`, `i.shield` |


- Rare items drop, Enemy
  - For rooms that specify a range (e.g., 1-2), enemies are selected from all entries matching the current expedition, floor, and room range.
  - Each room within the range must contain a different enemy.
  - Once an enemy has been selected for a room, it cannot be selected again for another room in the same range.

| `x.exp_id` | `x.floor` | `x.room` | `x.level` | `Enemy_ID` |
|---|---:|---|---:|---|
| 1 | 1 | 1-2 | 1 | 100 |
| 1 | 1 | 1-2 | 1 | 101 |
| 1 | 1 | 1-2 | 1 | 102 |
| 1 | 1 | 3 | 2 | 103 |
| 1 | 1 | 3 | 2 | 104 |
| 1 | 1 | 4 | 4 | 105 |
| 1 | 2 | 1-2 | 2 | 106 |
| 1 | 2 | 1-2 | 2 | 107 |
| 1 | 2 | 1-2 | 2 | 108 |
| 1 | 2 | 3 | 3 | 109 |
| 1 | 2 | 3 | 3 | 110 |
| 1 | 2 | 4 | 5 | 111 |
| 1 | 3 | 1-2 | 3 | 112 |
| 1 | 3 | 1-2 | 3 | 113 |
| 1 | 3 | 1-2 | 3 | 114 |
| 1 | 3 | 3 | 4 | 115 |
| 1 | 3 | 3 | 4 | 116 |
| 1 | 3 | 4 | 6 | 117 |
| 1 | 4 | 1-2 | 4 | 118 |
| 1 | 4 | 1-2 | 4 | 119 |
| 1 | 4 | 1-2 | 4 | 120 |
| 1 | 4 | 3 | 7 | 121 |
| 1 | 4 | 3 | 7 | 122 |
| 1 | 4 | 4 | 7 | 123 |
| 1 | 5 | 1-2 | 5 | 124 |
| 1 | 5 | 1-2 | 5 | 125 |
| 1 | 5 | 1-2 | 5 | 126 |
| 1 | 5 | 3 | 6 | 127 |
| 1 | 5 | 3 | 6 | 128 |
| 1 | 5 | 4 | 8 | 129 |
| 1 | 6 | 1-2 | 6 | 130 |
| 1 | 6 | 1-2 | 6 | 131 |
| 1 | 6 | 1-2 | 6 | 132 |
| 1 | 6 | 3 | 7 | 133 |
| 1 | 6 | 3 | 7 | 134 |
| 1 | 6 | 4 | 11 | 135 |
| 2 | 1 | 1-2 | 7 | 136 |
| 2 | 1 | 1-2 | 7 | 137 |
| 2 | 1 | 1-2 | 7 | 138 |
| 2 | 1 | 3 | 8 | 139 |
| 2 | 1 | 3 | 8 | 140 |
| 2 | 1 | 4 | 10 | 141 |
| 2 | 2 | 1-2 | 8 | 142 |
| 2 | 2 | 1-2 | 8 | 143 |
| 2 | 2 | 1-2 | 8 | 144 |
| 2 | 2 | 3 | 9 | 145 |
| 2 | 2 | 3 | 9 | 146 |
| 2 | 2 | 4 | 11 | 147 |
| 2 | 3 | 1-2 | 9 | 148 |
| 2 | 3 | 1-2 | 9 | 149 |
| 2 | 3 | 1-2 | 9 | 150 |
| 2 | 3 | 3 | 10 | 151 |
| 2 | 3 | 3 | 10 | 152 |
| 2 | 3 | 4 | 12 | 153 |
| 2 | 4 | 1-2 | 10 | 154 |
| 2 | 4 | 1-2 | 10 | 155 |
| 2 | 4 | 1-2 | 10 | 156 |
| 2 | 4 | 3 | 11 | 157 |
| 2 | 4 | 3 | 11 | 158 |
| 2 | 4 | 4 | 13 | 159 |
| 2 | 5 | 1-2 | 11 | 160 |
| 2 | 5 | 1-2 | 11 | 161 |
| 2 | 5 | 1-2 | 11 | 162 |
| 2 | 5 | 3 | 14 | 163 |
| 2 | 5 | 3 | 14 | 164 |
| 2 | 5 | 4 | 14 | 165 |
| 2 | 6 | 1-2 | 12 | 166 |
| 2 | 6 | 1-2 | 12 | 167 |
| 2 | 6 | 1-2 | 12 | 168 |
| 2 | 6 | 3 | 13 | 169 |
| 2 | 6 | 3 | 13 | 170 |
| 2 | 6 | 4 | 17 | 171 |
| 3 | 1 | 1-2 | 14 | 172 |
| 3 | 1 | 1-2 | 14 | 173 |
| 3 | 1 | 1-2 | 14 | 174 |
| 3 | 1 | 3 | 15 | 175 |
| 3 | 1 | 3 | 15 | 176 |
| 3 | 1 | 4 | 17 | 177 |
| 3 | 2 | 1-2 | 15 | 178 |
| 3 | 2 | 1-2 | 15 | 179 |
| 3 | 2 | 1-2 | 15 | 180 |
| 3 | 2 | 3 | 16 | 181 |
| 3 | 2 | 3 | 16 | 182 |
| 3 | 2 | 4 | 18 | 183 |
| 3 | 3 | 1-2 | 16 | 184 |
| 3 | 3 | 1-2 | 16 | 185 |
| 3 | 3 | 1-2 | 16 | 186 |
| 3 | 3 | 3 | 17 | 187 |
| 3 | 3 | 3 | 17 | 188 |
| 3 | 3 | 4 | 19 | 189 |
| 3 | 4 | 1-2 | 17 | 190 |
| 3 | 4 | 1-2 | 17 | 191 |
| 3 | 4 | 1-2 | 17 | 192 |
| 3 | 4 | 3 | 18 | 193 |
| 3 | 4 | 3 | 18 | 194 |
| 3 | 4 | 4 | 20 | 195 |
| 3 | 5 | 1-2 | 18 | 196 |
| 3 | 5 | 1-2 | 18 | 197 |
| 3 | 5 | 1-2 | 18 | 198 |
| 3 | 5 | 3 | 21 | 199 |
| 3 | 5 | 3 | 21 | 200 |
| 3 | 5 | 4 | 21 | 201 |
| 3 | 6 | 1-2 | 19 | 202 |
| 3 | 6 | 1-2 | 19 | 203 |
| 3 | 6 | 1-2 | 19 | 204 |
| 3 | 6 | 3 | 20 | 205 |
| 3 | 6 | 3 | 20 | 206 |
| 3 | 6 | 4 | 24 | 207 |
| 4 | 1 | 1-2 | 21 | 208 |
| 4 | 1 | 1-2 | 21 | 209 |
| 4 | 1 | 1-2 | 21 | 210 |
| 4 | 1 | 3 | 22 | 211 |
| 4 | 1 | 3 | 22 | 212 |
| 4 | 1 | 4 | 24 | 213 |
| 4 | 2 | 1-2 | 22 | 214 |
| 4 | 2 | 1-2 | 22 | 215 |
| 4 | 2 | 1-2 | 22 | 216 |
| 4 | 2 | 3 | 23 | 217 |
| 4 | 2 | 3 | 23 | 218 |
| 4 | 2 | 4 | 25 | 219 |
| 4 | 3 | 1-2 | 23 | 220 |
| 4 | 3 | 1-2 | 23 | 221 |
| 4 | 3 | 1-2 | 23 | 222 |
| 4 | 3 | 3 | 24 | 223 |
| 4 | 3 | 3 | 24 | 224 |
| 4 | 3 | 4 | 26 | 225 |
| 4 | 4 | 1-2 | 24 | 226 |
| 4 | 4 | 1-2 | 24 | 227 |
| 4 | 4 | 1-2 | 24 | 228 |
| 4 | 4 | 3 | 27 | 229 |
| 4 | 4 | 3 | 27 | 230 |
| 4 | 4 | 4 | 27 | 231 |
| 4 | 5 | 1-2 | 25 | 232 |
| 4 | 5 | 1-2 | 25 | 233 |
| 4 | 5 | 1-2 | 25 | 234 |
| 4 | 5 | 3 | 26 | 235 |
| 4 | 5 | 3 | 26 | 236 |
| 4 | 5 | 4 | 28 | 237 |
| 4 | 6 | 1-2 | 26 | 238 |
| 4 | 6 | 1-2 | 26 | 239 |
| 4 | 6 | 1-2 | 26 | 240 |
| 4 | 6 | 3 | 27 | 241 |
| 4 | 6 | 3 | 27 | 242 |
| 4 | 6 | 4 | 31 | 243 |
| 5 | 1 | 1-2 | 28 | 244 |
| 5 | 1 | 1-2 | 28 | 245 |
| 5 | 1 | 1-2 | 28 | 246 |
| 5 | 1 | 3 | 29 | 247 |
| 5 | 1 | 3 | 29 | 248 |
| 5 | 1 | 4 | 31 | 249 |
| 5 | 2 | 1-2 | 29 | 250 |
| 5 | 2 | 1-2 | 29 | 251 |
| 5 | 2 | 1-2 | 29 | 252 |
| 5 | 2 | 3 | 30 | 253 |
| 5 | 2 | 3 | 30 | 254 |
| 5 | 2 | 4 | 32 | 255 |
| 5 | 3 | 1-2 | 30 | 256 |
| 5 | 3 | 1-2 | 30 | 257 |
| 5 | 3 | 1-2 | 30 | 258 |
| 5 | 3 | 3 | 33 | 259 |
| 5 | 3 | 3 | 33 | 260 |
| 5 | 3 | 4 | 33 | 261 |
| 5 | 4 | 1-2 | 31 | 262 |
| 5 | 4 | 1-2 | 31 | 263 |
| 5 | 4 | 1-2 | 31 | 264 |
| 5 | 4 | 3 | 32 | 265 |
| 5 | 4 | 3 | 32 | 266 |
| 5 | 4 | 4 | 34 | 267 |
| 5 | 5 | 1-2 | 32 | 268 |
| 5 | 5 | 1-2 | 32 | 269 |
| 5 | 5 | 1-2 | 32 | 270 |
| 5 | 5 | 3 | 33 | 271 |
| 5 | 5 | 3 | 33 | 272 |
| 5 | 5 | 4 | 35 | 273 |
| 5 | 6 | 1-2 | 33 | 274 |
| 5 | 6 | 1-2 | 33 | 275 |
| 5 | 6 | 1-2 | 33 | 276 |
| 5 | 6 | 3 | 34 | 277 |
| 5 | 6 | 3 | 34 | 278 |
| 5 | 6 | 4 | 38 | 279 |
| 6 | 1 | 1-2 | 35 | 280 |
| 6 | 1 | 1-2 | 35 | 281 |
| 6 | 1 | 1-2 | 35 | 282 |
| 6 | 1 | 3 | 36 | 283 |
| 6 | 1 | 3 | 36 | 284 |
| 6 | 1 | 4 | 38 | 285 |
| 6 | 2 | 1-2 | 36 | 286 |
| 6 | 2 | 1-2 | 36 | 287 |
| 6 | 2 | 1-2 | 36 | 288 |
| 6 | 2 | 3 | 37 | 289 |
| 6 | 2 | 3 | 37 | 290 |
| 6 | 2 | 4 | 39 | 291 |
| 6 | 3 | 1-2 | 37 | 292 |
| 6 | 3 | 1-2 | 37 | 293 |
| 6 | 3 | 1-2 | 37 | 294 |
| 6 | 3 | 3 | 38 | 295 |
| 6 | 3 | 3 | 38 | 296 |
| 6 | 3 | 4 | 40 | 297 |
| 6 | 4 | 1-2 | 38 | 298 |
| 6 | 4 | 1-2 | 38 | 299 |
| 6 | 4 | 1-2 | 38 | 300 |
| 6 | 4 | 3 | 39 | 301 |
| 6 | 4 | 3 | 39 | 302 |
| 6 | 4 | 4 | 41 | 303 |
| 6 | 5 | 1-2 | 39 | 304 |
| 6 | 5 | 1-2 | 39 | 305 |
| 6 | 5 | 1-2 | 39 | 306 |
| 6 | 5 | 3 | 40 | 307 |
| 6 | 5 | 3 | 40 | 308 |
| 6 | 5 | 4 | 42 | 309 |
| 6 | 6 | 1-2 | 40 | 310 |
| 6 | 6 | 1-2 | 40 | 311 |
| 6 | 6 | 1-2 | 40 | 312 |
| 6 | 6 | 3 | 43 | 313 |
| 6 | 6 | 3 | 43 | 314 |
| 6 | 6 | 4 | 45 | 315 |
| 7 | 1 | 1-2 | 42 | 316 |
| 7 | 1 | 1-2 | 42 | 317 |
| 7 | 1 | 1-2 | 42 | 318 |
| 7 | 1 | 3 | 43 | 319 |
| 7 | 1 | 3 | 43 | 320 |
| 7 | 1 | 4 | 45 | 321 |
| 7 | 2 | 1-2 | 43 | 322 |
| 7 | 2 | 1-2 | 43 | 323 |
| 7 | 2 | 1-2 | 43 | 324 |
| 7 | 2 | 3 | 46 | 325 |
| 7 | 2 | 3 | 46 | 326 |
| 7 | 2 | 4 | 46 | 327 |
| 7 | 3 | 1-2 | 44 | 328 |
| 7 | 3 | 1-2 | 44 | 329 |
| 7 | 3 | 1-2 | 44 | 330 |
| 7 | 3 | 3 | 45 | 331 |
| 7 | 3 | 3 | 45 | 332 |
| 7 | 3 | 4 | 47 | 333 |
| 7 | 4 | 1-2 | 45 | 334 |
| 7 | 4 | 1-2 | 45 | 335 |
| 7 | 4 | 1-2 | 45 | 336 |
| 7 | 4 | 3 | 46 | 337 |
| 7 | 4 | 3 | 46 | 338 |
| 7 | 4 | 4 | 48 | 339 |
| 7 | 5 | 1-2 | 46 | 340 |
| 7 | 5 | 1-2 | 46 | 341 |
| 7 | 5 | 1-2 | 46 | 342 |
| 7 | 5 | 3 | 47 | 343 |
| 7 | 5 | 3 | 47 | 344 |
| 7 | 5 | 4 | 49 | 345 |
| 7 | 6 | 1-2 | 47 | 346 |
| 7 | 6 | 1-2 | 47 | 347 |
| 7 | 6 | 1-2 | 47 | 348 |
| 7 | 6 | 3 | 48 | 349 |
| 7 | 6 | 3 | 48 | 350 |
| 7 | 6 | 4 | 52 | 351 |
| 8 | 1 | 1-2 | 49 | 352 |
| 8 | 1 | 1-2 | 49 | 353 |
| 8 | 1 | 1-2 | 49 | 354 |
| 8 | 1 | 3 | 50 | 355 |
| 8 | 1 | 3 | 50 | 356 |
| 8 | 1 | 4 | 52 | 357 |
| 8 | 2 | 1-2 | 50 | 358 |
| 8 | 2 | 1-2 | 50 | 359 |
| 8 | 2 | 1-2 | 50 | 360 |
| 8 | 2 | 3 | 51 | 361 |
| 8 | 2 | 3 | 51 | 362 |
| 8 | 2 | 4 | 53 | 363 |
| 8 | 3 | 1-2 | 51 | 364 |
| 8 | 3 | 1-2 | 51 | 365 |
| 8 | 3 | 1-2 | 51 | 366 |
| 8 | 3 | 3 | 52 | 367 |
| 8 | 3 | 3 | 52 | 368 |
| 8 | 3 | 4 | 54 | 369 |
| 8 | 4 | 1-2 | 52 | 370 |
| 8 | 4 | 1-2 | 52 | 371 |
| 8 | 4 | 1-2 | 52 | 372 |
| 8 | 4 | 3 | 53 | 373 |
| 8 | 4 | 3 | 53 | 374 |
| 8 | 4 | 4 | 55 | 375 |
| 8 | 5 | 1-2 | 53 | 376 |
| 8 | 5 | 1-2 | 53 | 377 |
| 8 | 5 | 1-2 | 53 | 378 |
| 8 | 5 | 3 | 56 | 379 |
| 8 | 5 | 3 | 56 | 380 |
| 8 | 5 | 4 | 56 | 381 |
| 8 | 6 | 1-2 | 54 | 382 |
| 8 | 6 | 1-2 | 54 | 383 |
| 8 | 6 | 1-2 | 54 | 384 |
| 8 | 6 | 3 | 55 | 385 |
| 8 | 6 | 3 | 55 | 386 |
| 8 | 6 | 4 | 59 | 387 |


| `Enemy_ID` | `x.type` | `x.enemy_type` | `x.class` | `x.item_ids` | `x.name` (Japanese) | additional abilities or bonus |
|---|---|---|---|---|---|---|
| 1 | Divine | `Caninian` | class.pilgrim | 8501, 8502 | セイラン 再生の女神 | `a.resurrect`2 |
| 2 | Divine | `Lupinian` | class.samurai | 8503, 8504 | ガーヴ 消耗の神 | `a.rage`2, `a.re-counter`2 |
| 3 | Divine | `Vulpinian` | class.striker | 8505, 8506 | キョウエン 狡猾の神 | `a.momentum`2 |
| 4 | Divine | `Felidian` | class.sage | 8509, 8510 | ミオラ 豊穣の女神 | `a.firststrike`2 |
| 5 | Divine | `Ursan` | class.guardian | 8507, 8508 | ドルヴァ 防備の神 | `a.cyborgization`2 |
| 6 | Divine | `Procyonian` | class.duelist | 8519, 8520 | タヌエ 幻影の女神 | |
| 7 | Divine | `Leporian` | class.ranger | 8513, 8514 | リラ 精密の女神 | `a.composure`2 |
| 8 | Divine | `Cervin` | class.lord | 8515, 8516 | フォルネ 運命の神 | `a.focus`2 |
| 9 | Divine | `Murid` | class.ninja | 8517, 8518 | スクヴァ 黄昏の神 | `a.stealth`1 |
| 10 | Divine | `Mustelid` | class.wizard | 8511, 8512 | ロンデル 共鳴の神 | `a.resonance`4 |
| 11 | Divine | `-` | class.samurai | 8521, 8522 | ノクティラ 忘却されし神 | `a.rage`2, `a.firststrike`2 |
| 12 | Divine | `-` | class.pilgrim | 8523, 8524 | エリス 不和の神 | `a.momentum`2, `a.resonance`4, `a.stealth`1 |
| 13 | Normal | `Lupinian` | | | リップ | |
| 14 | Normal |`Vulpinian` | | | アマネ | |
| 15 | Normal |`Caninian` | | | ミズ | |
| 16 | Normal |`Procyonian` | | | 茶々 | |
| 17 | Normal |`Leporian` | | | ミリィ | |
| 18 | Normal |`Cervin` | | | ファニア | |
| 100 | Normal | `Beast` | class.ranger | 1213, 1217, 1107, 1108, 1109 | たんぽぽめ | |
| 101 | Normal | `Beast` | class.striker | 1215, 1213, 1107, 1108, 1109 | いしぽん | |
| 102 | Normal | `Beast` | class.wizard | 1219, 1203, 1110, 1111, 1112 | もす | `a.dryproof`1 |
| 103 | Normal | `Beast` | class.guardian | 1201, 1211, 1101, 1102, 1103 | くろーびっと | |
| 104 | Normal | `Beast` | class.lord | 1205, 1209, 1101, 1102, 1103 | くるくる | |
| 105 | Elite | `Beast` | class.duelist | 1302, 1301, 1104, 1105, 1106 | わおーん | `a.howl`1 |
| 106 | Normal | `Beast` | class.ninja | 1217, 1215, 1107, 1108, 1109 | りんりん | |
| 107 | Normal | `Beast` | class.sage | 1221, 1223, 1110, 1111, 1112 | こんた | |
| 108 | Normal | `Beast` | class.samurai | 1209, 1205, 1104, 1105, 1106 | きっつん | `a.coldproof`1 |
| 109 | Normal | `Aerial` | class.duelist | 1207, 1201, 1104, 1105, 1106 | シーガル | |
| 110 | Normal | `Aerial` | class.pilgrim | 1203, 1221, 1101, 1102, 1103 | スパロゥ | |
| 111 | Elite | `Beast` | class.samurai | 1304, 1313, 1104, 1105, 1106 | シンディパウ | `a.null-burn`1, `a.burn`1 |
| 112 | Normal | `Insect_Swarm` | class.alchemist | 1223, 1219, 1110, 1111, 1112 | 鳳蝶 | |
| 113 | Normal | `Insect_Swarm` | class.guardian.pilgrim | 1201, 1211, 1203, 1101, 1102, 1103 | レディバグ | |
| 114 | Normal | `Insect_Swarm` | class.sword-saint | 1211, 1207, 1104, 1105, 1106 | 花鎌娘 | `a.bind`1 |
| 115 | Normal | `Beast` | class.samurai.duelist | 1209, 1205, 1207, 1104, 1105, 1106 | ふわっと | |
| 116 | Normal | `Beast` | class.wizard.alchemist | 1219, 1203, 1223, 1110, 1111, 1112 | ひのこ | `a.null-burn`1 |
| 117 | Elite | `Insect_Swarm` | class.ranger.striker | 1305, 1308, 1306, 1107, 1108, 1109 | ビーズ | |
| 118 | Normal | `Aerial` | class.guardian.wizard | 1201, 1211, 1219, 1101, 1102, 1103 | メロウル | |
| 119 | Normal | `Aerial` | class.lord.striker | 1205, 1209, 1215, 1101, 1102, 1103 | ぱんころう | |
| 120 | Normal | `Aerial` | class.sage.samurai | 1221, 1223, 1209, 1110, 1111, 1112 | かわせみ | |
| 121 | Elite | `Caninian` | class.duelist.lord | 1406, 1404, 1104, 1105, 1106 | サクラ | `a.execution`1 |
| 122 | Elite | `Caninian` | class.lord.striker | 1407, 1402, 1101, 1102, 1103 | エメラ | `a.deflection`1 |
| 123 | Elite | `Aerial` | class.sage.lord | 1319, 1309, 1314, 1110, 1111, 1112 | ファルコ | `a.wind-rider`1 |
| 124 | Normal | `Insect_Swarm` | class.ninja.ranger | 1217, 1215, 1213, 1107, 1108, 1109 | ハルビー | |
| 125 | Normal | `Insect_Swarm` | class.samurai.sword-saint | 1209, 1205, 1211, 1104, 1105, 1106 | ドラコフライ | |
| 126 | Normal | `Insect_Swarm` | class.wizard.alchemist | 1219, 1203, 1223, 1110, 1111, 1112 | ホタル | |
| 127 | Normal | `Aerial` | class.sword-saint.guardian | 1211, 1207, 1201, 1104, 1105, 1106 | コーム | |
| 128 | Normal | `Aerial` | class.wizard.ninja | 1219, 1203, 1217, 1110, 1111, 1112 | セキレ | |
| 129 | Elite | `Aerial` | class.alchemist.wizard | 1309, 1318, 1312, 1110, 1111, 1112 | トリコ | `a.null-death-touch`1, `a.re-attack`1 |
| 130 | Normal | `Beast` | class.duelist.striker | 1207, 1201, 1215, 1104, 1105, 1106 | みずうさぎ | |
| 131 | Normal | `Beast` | class.pilgrim.sage | 1203, 1221, 1221, 1101, 1102, 1103 | もすらむ | |
| 132 | Normal | `Beast` | class.sword-saint.striker | 1211, 1207, 1215, 1104, 1105, 1106 | あなこ | |
| 133 | Normal | `Aerial` | class.ranger.duelist | 1213, 1217, 1207, 1107, 1108, 1109 | ペネトレーター | |
| 134 | Normal | `Aerial` | class.samurai.ranger | 1209, 1205, 1213, 1104, 1105, 1106 | ヨキジ | |
| 135 | BOSS | `Caninian` | class.guardian | 1401, 1402, 1406, 1101, 1102, 1103 | ヴェルグ | `a.ice-absorb`1, `a.true-sight`1, `c.growth_x1.2` |
| 136 | Normal | `Frost` | class.ranger | 2213, 2224, 2107, 2108, 2109 | シズク | |
| 137 | Normal | `Frost` | class.striker | 2215, 2213, 2107, 2108, 2109 | クリスティア | |
| 138 | Normal | `Frost` | class.wizard | 2219, 2221, 2110, 2111, 2112 | ヴィエル | |
| 139 | Normal | `Frost` | class.guardian | 2220, 2223, 2101, 2102, 2103 | ルルア | |
| 140 | Normal | `Frost` | class.lord | 2205, 2209, 2101, 2102, 2103 | リゼル | |
| 141 | Elite | `Frost` | class.lord.ranger | 2308, 2303, 2304, 2101, 2102, 2103 | アメル | `a.ice-protect-breaker`1 |
| 142 | Normal | `Frost` | class.ninja | 2224, 2215, 2107, 2108, 2109 | フィナ | `a.howl`3 |
| 143 | Normal | `Frost` | class.sage | 2225, 2226, 2110, 2111, 2112 | シエル | `a.first-aid`2 |
| 144 | Normal | `Frost` | class.samurai | 2209, 2205, 2104, 2105, 2106 | ネネ | `a.predator-sense`1 |
| 145 | Normal | `Golem` | class.duelist | 2222, 2220, 2104, 2105, 2106 | ドレープ | |
| 146 | Normal | `Golem` | class.pilgrim | 2221, 2225, 2101, 2102, 2103 | アルカパ | |
| 147 | Elite | `Frost` | class.samurai.guardian | 2303, 2308, 2305, 2104, 2105, 2106 | シェリ | `c.physical-defense-multiplier_x0.5` |
| 148 | Normal | `Plant_Fungal` | class.alchemist | 2226, 2219, 2110, 2111, 2112 | スポレラ | `a.requiem`1 |
| 149 | Normal | `Plant_Fungal` | class.guardian.pilgrim | 2220, 2223, 2221, 2101, 2102, 2103 | カプレット | |
| 150 | Normal | `Plant_Fungal` | class.sword-saint | 2223, 2222, 2104, 2105, 2106 | ルメモス | |
| 151 | Normal | `Frost` | class.samurai.duelist | 2209, 2205, 2222, 2104, 2105, 2106 | ルミ | |
| 152 | Normal | `Frost` | class.wizard.alchemist | 2219, 2221, 2226, 2110, 2111, 2112 | マーニー | |
| 153 | Elite | `Plant_Fungal` | class.striker.pilgrim | 2313, 2312, 2307, 2107, 2108, 2109 | アマニバン | `a.boost`2 |
| 154 | Normal | `Golem` | class.guardian.wizard | 2220, 2223, 2219, 2101, 2102, 2103 | ウールワード | `a.bulwark`1 |
| 155 | Normal | `Golem` | class.lord.striker | 2205, 2209, 2215, 2101, 2102, 2103 | パッチパウ | |
| 156 | Normal | `Golem` | class.sage.samurai | 2225, 2226, 2209, 2110, 2111, 2112 | メールホップ | |
| 157 | Normal | `Plant_Fungal` | class.duelist.lord | 2222, 2220, 2205, 2104, 2105, 2106 | パールスポア | |
| 158 | Normal | `Plant_Fungal` | class.lord.striker | 2205, 2209, 2215, 2101, 2102, 2103 | ウールミ | |
| 159 | Elite | `Golem` | class.sword-saint.alchemist | 2311, 2302, 2317, 2104, 2105, 2106 | スティッチリング | `a.ranged-reflect`1 |
| 160 | Normal | `Plant_Fungal` | class.ninja.ranger | 2224, 2215, 2213, 2107, 2108, 2109 | パフキャップ | `a.melee-confusion`1 |
| 161 | Normal | `Plant_Fungal` | class.samurai.sword-saint | 2209, 2205, 2223, 2104, 2105, 2106 | タリア | |
| 162 | Normal | `Plant_Fungal` | class.wizard.alchemist | 2219, 2221, 2226, 2110, 2111, 2112 | インクキャップ | |
| 163 | Elite | `Lupinian` | class.ninja.sword-saint | 2406, 2407, 2107, 2108, 2109 | ポルセラ | `c.physical-defense-multiplier_x0.4` |
| 164 | Elite | `Lupinian` | class.wizard.guardian | 2403, 2402, 2405, 2110, 2111, 2112 | ポルセル | `c.physical-defense-multiplier_x0.6`, `a.covering-fire`1 |
| 165 | Elite | `Golem` | class.wizard.sage | 2315, 2301, 2316, 2110, 2111, 2112 | カップマウス | `a.slow`1 |
| 166 | Normal | `Frost` | class.duelist.striker | 2222, 2220, 2215, 2104, 2105, 2106 | ニナ | |
| 167 | Normal | `Frost` | class.pilgrim.sage | 2221, 2225, 2225, 2101, 2102, 2103 | ピッパ | |
| 168 | Normal | `Frost` | class.sword-saint.striker | 2223, 2222, 2215, 2104, 2105, 2106 | ミミ | |
| 169 | Normal | `Golem` | class.ranger.duelist | 2213, 2224, 2222, 2107, 2108, 2109 | リボンバン | |
| 170 | Normal | `Golem` | class.samurai.ranger | 2209, 2205, 2213, 2104, 2105, 2106 | パックベア | |
| 171 | BOSS | `Lupinian` | class.striker.duelist | 2406, 2401, 2407, 2107, 2108, 2109 | ロザリア | `a.deflection`2, `a.life-drain`7, `a.null-life-drain`1, `c.growth_x2.0` |
| 172 | Normal | `Fruit` | class.ranger.ranger | 3213, 3217, 3213, 3107, 3108, 3109 | あぷりん | |
| 173 | Normal | `Fruit` | class.striker.striker | 3215, 3213, 3215, 3107, 3108, 3109 | ぐぁびー | |
| 174 | Normal | `Fruit` | class.wizard.wizard | 3219, 3203, 3219, 3110, 3111, 3112 | みむる | |
| 175 | Normal | `Fruit` | class.guardian.guardian | 3201, 3211, 3201, 3101, 3102, 3103 | ぷるみ | |
| 176 | Normal | `Fruit` | class.lord.lord | 3205, 3209, 3205, 3101, 3102, 3103 | まんぐー | |
| 177 | Elite | `Fruit` | class.pilgrim.wizard | 3303, 3317, 3315, 3101, 3102, 3103 | ぱや | `a.null-shock`1 |
| 178 | Normal | `Fruit` | class.ninja.ninja | 3217, 3215, 3217, 3107, 3108, 3109 | ぴな | |
| 179 | Normal | `Fruit` | class.sage.sage | 3221, 3223, 3221, 3110, 3111, 3112 | ちぇり | |
| 180 | Normal | `Fruit` | class.samurai.samurai | 3209, 3205, 3209, 3104, 3105, 3106 | ぱらーしゃ | |
| 181 | Normal | `Slime_Colony` | class.duelist.duelist | 3207, 3201, 3207, 3104, 3105, 3106 | らびめる | |
| 182 | Normal | `Slime_Colony` | class.pilgrim.pilgrim | 3203, 3221, 3203, 3101, 3102, 3103 | べとりーば | |
| 183 | Elite | `Fruit` | class.lord.samurai | 3305, 3307, 3307, 3101, 3102, 3103 | りっぴー | `a.unforgettable`1 |
| 184 | Normal | `Spirit` | class.alchemist.alchemist | 3223, 3219, 3223, 3110, 3111, 3112 | レイミ | |
| 185 | Normal | `Orcinian` | class.guardian.pilgrim | 3201, 3211, 3203, 3101, 3102, 3103 | クリセレ | |
| 186 | Normal | `Spirit` | class.sword-saint.sword-saint | 3211, 3207, 3211, 3104, 3105, 3106 | シロハ | |
| 187 | Normal | `Fruit` | class.samurai.duelist | 3209, 3205, 3207, 3104, 3105, 3106 | ぴたっぴ | |
| 188 | Normal | `Fruit` | class.wizard.alchemist | 3219, 3203, 3223, 3110, 3111, 3112 | からっぴ | |
| 189 | Elite | `Orcinian` | class.wizard.ninja | 3316, 3304, 3314, 3110, 3111, 3112 | レディ・ネリッサ | `a.re-attack`1 |
| 190 | Normal | `Slime_Colony` | class.guardian.wizard | 3201, 3211, 3219, 3101, 3102, 3103 | スミ | |
| 191 | Normal | `Slime_Colony` | class.lord.striker | 3205, 3209, 3215, 3101, 3102, 3103 | ルミネ | |
| 192 | Normal | `Slime_Colony` | class.sage.samurai | 3221, 3223, 3209, 3110, 3111, 3112 | ヴァルディ | |
| 193 | Normal | `Orcinian` | class.duelist.lord | 3207, 3201, 3205, 3104, 3105, 3106 | アリア | |
| 194 | Normal | `Orcinian` | class.lord.striker | 3205, 3209, 3215, 3101, 3102, 3103 | セレン | |
| 195 | Elite | `Slime_Colony` | class.ninja.guardian | 3313, 3312, 3302, 3107, 3108, 3109 | サルナ | `a.resurrect`1 |
| 196 | Normal | `Spirit` | class.ninja.ranger | 3217, 3215, 3213, 3107, 3108, 3109 | ミズキ | |
| 197 | Normal | `Orcinian` | class.samurai.sword-saint | 3209, 3205, 3211, 3104, 3105, 3106 | 鉄錨のマリナ | |
| 198 | Normal | `Orcinian` | class.wizard.alchemist | 3219, 3203, 3223, 3110, 3111, 3112 | ニメラ | |
| 199 | Elite | `Vulpinian` | class.sword-saint.guardian | 3407, 3406, 3104, 3105, 3106 | ヴェスパー | |
| 200 | Elite | `Vulpinian` | class.wizard.ninja | 3402, 3401, 3110, 3111, 3112 | セドリック | `a.cunning`1 |
| 201 | Elite | `Slime_Colony` | class.striker.sword-saint | 3312, 3311, 3310, 3107, 3108, 3109 | ネリア | `a.overwatch`1 |
| 202 | Normal | `Fruit` | class.duelist.striker | 3207, 3201, 3215, 3104, 3105, 3106 | なぴ | |
| 203 | Normal | `Fruit` | class.pilgrim.sage | 3203, 3221, 3221, 3101, 3102, 3103 | みき | |
| 204 | Normal | `Orcinian` | class.sword-saint.striker | 3211, 3207, 3215, 3104, 3105, 3106 | エヴェリナ | |
| 205 | Normal | `Slime_Colony` | class.ranger.duelist | 3213, 3217, 3207, 3107, 3108, 3109 | イリア | |
| 206 | Normal | `Slime_Colony` | class.samurai.ranger | 3209, 3205, 3213, 3104, 3105, 3106 | ヴェスペラ | |
| 207 | BOSS | `Vulpinian` | class.wizard.sage | 3408, 3405, 3404, 3110, 3111, 3112 | 宰相ゴールドテイル | `a.melee-confusion`1, `c.growth_x1.5`, `a.squander`1 |
| 208 | Normal | `Shadowfang` | class.ranger.ranger | 4213, 4217, 4213, 4107, 4108, 4109 | ポムキャット | |
| 209 | Normal | `Shadowfang` | class.striker.striker | 4215, 4213, 4215, 4107, 4108, 4109 | フワテイル | |
| 210 | Normal | `Shadowfang` | class.wizard.wizard | 4219, 4203, 4219, 4110, 4111, 4112 | コロッチュ | |
| 211 | Normal | `Shadowfang` | class.guardian.guardian | 4201, 4211, 4201, 4101, 4102, 4103 | フェネップ | |
| 212 | Normal | `Shadowfang` | class.lord.lord | 4205, 4209, 4205, 4101, 4102, 4103 | トロポン | |
| 213 | Elite | `Shadowfang` | class.pilgrim.guardian | 4303, 4318, 4301, 4101, 4102, 4103 | ワメ | `c.growth_x1.3` |
| 214 | Normal | `Shadowfang` | class.ninja.ninja | 4217, 4215, 4217, 4107, 4108, 4109 | マルカ | |
| 215 | Normal | `Shadowfang` | class.sage.sage | 4221, 4223, 4221, 4110, 4111, 4112 | タマ | |
| 216 | Normal | `Shadowfang` | class.samurai.samurai | 4209, 4205, 4209, 4104, 4105, 4106 | パフゥーク | |
| 217 | Normal | `Felidian` | class.duelist.duelist | 4207, 4201, 4207, 4104, 4105, 4106 | カラカル | |
| 218 | Normal | `Felidian` | class.pilgrim.pilgrim | 4203, 4221, 4203, 4101, 4102, 4103 | ゼファー | |
| 219 | Elite | `Shadowfang` | class.samurai.striker | 4308, 4305, 4312, 4104, 4105, 4106 | タミャ | `c.penet+40` |
| 220 | Normal | `Titan` | class.alchemist.alchemist | 4223, 4219, 4223, 4110, 4111, 4112 | K9-33 | |
| 221 | Normal | `Titan` | class.guardian.pilgrim | 4201, 4211, 4203, 4101, 4102, 4103 | K9-07 | |
| 222 | Normal | `Titan` | class.sword-saint.sword-saint | 4211, 4207, 4211, 4104, 4105, 4106 | K9-15 | |
| 223 | Normal | `Shadowfang` | class.samurai.duelist | 4209, 4205, 4207, 4104, 4105, 4106 | ミーケ | |
| 224 | Normal | `Shadowfang` | class.wizard.alchemist | 4219, 4203, 4223, 4110, 4111, 4112 | マレプ | |
| 225 | Elite | `Titan` | class.lord.wizard | 4306, 4309, 4317, 4101, 4102, 4103 | K9-01 | `a.re-attack`1 |
| 226 | Normal | `Murid` | class.guardian.wizard | 4201, 4211, 4219, 4101, 4102, 4103 | 怪力のロブ | |
| 227 | Normal | `Murid` | class.lord.striker | 4205, 4209, 4215, 4101, 4102, 4103 | 転尻のタンブル | |
| 228 | Normal | `Murid` | class.sage.samurai | 4221, 4223, 4209, 4110, 4111, 4112 | 砂足のキリ | |
| 229 | Elite | `Felidian` | class.ninja.duelist | 4405, 4406, 4107, 4108, 4109 | 神官ネメア | `a.reanimate`1 |
| 230 | Elite | `Felidian` | class.striker.sage | 4404, 4402, 4107, 4108, 4109 | 審問官ザーラ | `c.growth_x1.4` |
| 231 | Elite | `Murid` | class.ninja.duelist | 4315, 4313, 4307, 4107, 4108, 4109 | 赤牙のリゾ | `a.rage`1 |
| 232 | Normal | `Titan` | class.ninja.ranger | 4217, 4215, 4213, 4107, 4108, 4109 | K9-21 | |
| 233 | Normal | `Titan` | class.samurai.sword-saint | 4209, 4205, 4211, 4104, 4105, 4106 | K9-05 | |
| 234 | Normal | `Titan` | class.wizard.alchemist | 4219, 4203, 4223, 4110, 4111, 4112 | K9-40 | |
| 235 | Normal | `Felidian` | class.sword-saint.guardian | 4211, 4207, 4201, 4104, 4105, 4106 | カラリナ | |
| 236 | Normal | `Murid` | class.wizard.ninja | 4219, 4203, 4217, 4110, 4111, 4112 | 鉤尾のヴェン | |
| 237 | Elite | `Felidian` | class.sage.alchemist | 4319, 4320, 4320, 4110, 4111, 4112 | ケマ | `d.evasion+30` |
| 238 | Normal | `Felidian` | class.duelist.striker | 4207, 4201, 4215, 4104, 4105, 4106 | ペシャ | |
| 239 | Normal | `Felidian` | class.pilgrim.sage | 4203, 4221, 4221, 4101, 4102, 4103 | ネメア | |
| 240 | Normal | `Felidian` | class.sword-saint.striker | 4211, 4207, 4215, 4104, 4105, 4106 | ラミル | |
| 241 | Normal | `Murid` | class.ranger.duelist | 4213, 4217, 4207, 4107, 4108, 4109 | 銀髭のヴァロ | |
| 242 | Normal | `Murid` | class.samurai.ranger | 4209, 4205, 4213, 4104, 4105, 4106 | 銭のマーン | |
| 243 | BOSS | `Felidian` | class.striker.ranger | 4403, 4402, 4402, 4107, 4108, 4109 | 大司祭マウラ | `c.fire-defense-multiplier_x4/5`, `c.growth_x1.5` |
| 244 | Normal | `Beast` | class.ranger.ranger | 5213, 5217, 5213, 5107, 5108, 5109 | ジスカ | |
| 245 | Normal | `Beast` | class.striker.striker | 5215, 5213, 5215, 5107, 5108, 5109 | スナ | |
| 246 | Normal | `Beast` | class.wizard.wizard | 5219, 5203, 5219, 5110, 5111, 5112 | ラテラ | |
| 247 | Normal | `Beast` | class.guardian.guardian | 5201, 5211, 5201, 5101, 5102, 5103 | プレシア | |
| 248 | Normal | `Beast` | class.lord.lord | 5205, 5209, 5205, 5101, 5102, 5103 | グアナ | |
| 249 | Elite | `Beast` | class.ninja.sword-saint | 5312, 5311, 5308, 5107, 5108, 5109 | カウダ | `a.re-attack`1 |
| 250 | Normal | `Beast` | class.ninja.ninja | 5217, 5215, 5217, 5107, 5108, 5109 | ストロフィア | |
| 251 | Normal | `Beast` | class.sage.sage | 5221, 5223, 5221, 5110, 5111, 5112 | トリボラ | |
| 252 | Normal | `Beast` | class.samurai.samurai | 5209, 5205, 5209, 5104, 5105, 5106 | コルシア | |
| 253 | Normal | `Dragon` | class.duelist.duelist | 5207, 5201, 5207, 5104, 5105, 5106 | プルミア | |
| 254 | Normal | `Dragon` | class.pilgrim.pilgrim | 5203, 5221, 5203, 5101, 5102, 5103 | オフィサ | |
| 255 | Elite | `Beast` | class.pilgrim.alchemist | 5303, 5314, 5317, 5101, 5102, 5103 | ランプロサ | `a.illusion`1 |
| 256 | Normal | `Beast` | class.alchemist.alchemist | 5223, 5219, 5223, 5110, 5111, 5112 | ウロプラ | |
| 257 | Normal | `Ursan` | class.guardian.pilgrim | 5201, 5211, 5203, 5101, 5102, 5103 | ウルシア | |
| 258 | Normal | `Ursan` | class.sword-saint.sword-saint | 5211, 5207, 5211, 5104, 5105, 5106 | アイルラ | |
| 259 | Elite | `Ursan` | class.samurai.duelist | 5403, 5401, 5104, 5105, 5106 | ベルネッタ | `a.rage`1 |
| 260 | Elite | `Ursan` | class.wizard.alchemist | 5407, 5402, 5110, 5111, 5112 | ボンベラ | `c.physical-defense-multiplier_x1/3` |
| 261 | Elite | `Ursan` | class.guardian.sage | 5302, 5309, 5316, 5101, 5102, 5103 | アークトン | `a.deflection`2 |
| 262 | Normal | `Dragon` | class.guardian.wizard | 5201, 5211, 5219, 5101, 5102, 5103 | ヘローラ | |
| 263 | Normal | `Dragon` | class.lord.striker | 5205, 5209, 5215, 5101, 5102, 5103 | クラミア | |
| 264 | Normal | `Dragon` | class.sage.samurai | 5221, 5223, 5209, 5110, 5111, 5112 | ヘロディア | |
| 265 | Normal | `Ursan` | class.duelist.lord | 5207, 5201, 5205, 5104, 5105, 5106 | マリティア | |
| 266 | Normal | `Ursan` | class.lord.striker | 5205, 5209, 5215, 5101, 5102, 5103 | アークティア | |
| 267 | Elite | `Dragon` | class.lord.duelist | 5305, 5307, 5306, 5101, 5102, 5103 | サルヴァタ | `a.magic-seal`1 |
| 268 | Normal | `Ursan` | class.ninja.ranger | 5217, 5215, 5213, 5107, 5108, 5109 | メルーラ | |
| 269 | Normal | `Ursan` | class.samurai.sword-saint | 5209, 5205, 5211, 5104, 5105, 5106 | モンタラ | |
| 270 | Normal | `Beast` | class.wizard.alchemist | 5219, 5203, 5223, 5110, 5111, 5112 | カメリア | `a.mimic`1 |
| 271 | Normal | `Dragon` | class.sword-saint.guardian | 5211, 5207, 5201, 5104, 5105, 5106 | ヴァラナ | |
| 272 | Normal | `Dragon` | class.wizard.ninja | 5219, 5203, 5217, 5110, 5111, 5112 | アガミア | |
| 273 | Elite | `Dragon` | class.alchemist.wizard | 5318, 5313, 5313, 5110, 5111, 5112 | フィコラ | `a.boost`1 |
| 274 | Normal | `Beast` | class.duelist.striker | 5207, 5201, 5215, 5104, 5105, 5106 | ティモニア | |
| 275 | Normal | `Beast` | class.pilgrim.sage | 5203, 5221, 5221, 5101, 5102, 5103 | フィシグナ | |
| 276 | Normal | `Beast` | class.sword-saint.striker | 5211, 5207, 5215, 5104, 5105, 5106 | ラティア | |
| 277 | Normal | `Dragon` | class.ranger.duelist | 5213, 5217, 5207, 5107, 5108, 5109 | モロキア | |
| 278 | Normal | `Dragon` | class.samurai.ranger | 5209, 5205, 5213, 5104, 5105, 5106 | ハイドロサ | |
| 279 | BOSS | `Ursan` | class.samurai.duelist | 5404, 5405, 5406, 5104, 5105, 5106 | ケルビナ | `a.fire-reflect`1, `c.growth_x1.3` |
| 280 | Normal | `Mech` | class.ranger.ranger | 6213, 6217, 6213, 6107, 6108, 6109 | リヴェッタ | |
| 281 | Normal | `Mech` | class.striker.striker | 6215, 6213, 6215, 6107, 6108, 6109 | ピペット | |
| 282 | Normal | `Mech` | class.wizard.wizard | 6219, 6203, 6219, 6110, 6111, 6112 | スプロクサ | |
| 283 | Normal | `Mech` | class.guardian.guardian | 6201, 6211, 6201, 6101, 6102, 6103 | タンブル | |
| 284 | Normal | `Mech` | class.lord.lord | 6205, 6209, 6205, 6101, 6102, 6103 | モクシー | |
| 285 | Elite | `Mech` | class.guardian.ninja | 6301, 6308, 6313, 6101, 6102, 6103 | パッチ | `c.growth_x1.3` |
| 286 | Normal | `Mech` | class.ninja.ninja | 6217, 6215, 6217, 6107, 6108, 6109 | ニブルズ | |
| 287 | Normal | `Mech` | class.sage.sage | 6221, 6223, 6221, 6110, 6111, 6112 | ティッカ | |
| 288 | Normal | `Mech` | class.samurai.samurai | 6209, 6205, 6209, 6104, 6105, 6106 | ジッピー | |
| 289 | Normal | `Chiropteran` | class.duelist.duelist | 6207, 6201, 6207, 6104, 6105, 6106 | ヴェスパー | |
| 290 | Normal | `Chiropteran` | class.pilgrim.pilgrim | 6203, 6221, 6203, 6101, 6102, 6103 | サーリ | |
| 291 | Elite | `Mech` | class.ranger.striker | 6309, 6313, 6311, 6107, 6108, 6109 | ラチェット | `c.penet+40` |
| 292 | Normal | `Chimera` | class.alchemist.alchemist | 6223, 6219, 6223, 6110, 6111, 6112 | ミスティ | |
| 293 | Normal | `Chimera` | class.guardian.pilgrim | 6201, 6211, 6203, 6101, 6102, 6103 | モロウ | |
| 294 | Normal | `Chimera` | class.sword-saint.sword-saint | 6211, 6207, 6211, 6104, 6105, 6106 | ルー | |
| 295 | Normal | `Mech` | class.samurai.duelist | 6209, 6205, 6207, 6104, 6105, 6106 | ヴェクサ | |
| 296 | Normal | `Mech` | class.wizard.alchemist | 6219, 6203, 6223, 6110, 6111, 6112 | ビクシー | |
| 297 | Elite | `Chimera` | class.alchemist.wizard | 6318, 6315, 6315, 6110, 6111, 6112 | ダスク | `c.magical-offense-multiplier_x1.4` |
| 298 | Normal | `Chiropteran` | class.guardian.wizard | 6201, 6211, 6219, 6101, 6102, 6103 | スカリー | |
| 299 | Normal | `Chiropteran` | class.lord.striker | 6205, 6209, 6215, 6101, 6102, 6103 | ヴェローラ | |
| 300 | Normal | `Chiropteran` | class.sage.samurai | 6221, 6223, 6209, 6110, 6111, 6112 | カーミラ | |
| 301 | Normal | `Chimera` | class.duelist.lord | 6207, 6201, 6205, 6104, 6105, 6106 | ラズリ | |
| 302 | Normal | `Chimera` | class.lord.striker | 6205, 6209, 6215, 6101, 6102, 6103 | マンブル | |
| 303 | Elite | `Chiropteran` | class.samurai.duelist | 6307, 6304, 6306, 6104, 6105, 6106 | ネーヴェ | `a.first-strike`1 |
| 304 | Normal | `Chimera` | class.ninja.ranger | 6217, 6215, 6213, 6107, 6108, 6109 | スヌーズ | |
| 305 | Normal | `Chimera` | class.samurai.sword-saint | 6209, 6205, 6211, 6104, 6105, 6106 | ヨーニー | |
| 306 | Normal | `Chimera` | class.wizard.alchemist | 6219, 6203, 6223, 6110, 6111, 6112 | ウィスプ | |
| 307 | Normal | `Chiropteran` | class.sword-saint.guardian | 6211, 6207, 6201, 6104, 6105, 6106 | ソラーラ | |
| 308 | Normal | `Chiropteran` | class.wizard.ninja | 6219, 6203, 6217, 6110, 6111, 6112 | フォリア | |
| 309 | Elite | `Chiropteran` | class.ninja.sage | 6314, 6312, 6317, 6107, 6108, 6109 | セラフィー | `a.ranged-confusion`1 |
| 310 | Normal | `Mech` | class.duelist.striker | 6207, 6201, 6215, 6104, 6105, 6106 | フィクシー | |
| 311 | Normal | `Mech` | class.pilgrim.sage | 6203, 6221, 6221, 6101, 6102, 6103 | キャリパー | |
| 312 | Normal | `Mech` | class.sword-saint.striker | 6211, 6207, 6215, 6104, 6105, 6106 | ミント | |
| 313 | Elite | `Procyonian` | class.ranger.duelist | 6403, 6401, 6107, 6108, 6109 | クインシー | `c.growth_x1.5` |
| 314 | Elite | `Procyonian` | class.samurai.ranger | 6408, 6407, 6104, 6105, 6106 | スキッパー | `c.growth_x1.5` |
| 315 | BOSS | `Procyonian` | class.sage.lord | 6406, 6405, 6408, 6110, 6111, 6112 | セレスティアルリーパー | `a.soul-reap`3, `c.growth_x1.5` |
| 316 | Normal | `Pony` | class.ranger.ranger | 7213, 7217, 7213, 7107, 7108, 7109 | リッカ | |
| 317 | Normal | `Pony` | class.striker.striker | 7215, 7213, 7215, 7107, 7108, 7109 | ナナラ | |
| 318 | Normal | `Pony` | class.wizard.wizard | 7219, 7203, 7219, 7110, 7111, 7112 | ノワ | |
| 319 | Normal | `Pony` | class.guardian.guardian | 7201, 7211, 7201, 7101, 7102, 7103 | ジータ | |
| 320 | Normal | `Pony` | class.lord.lord | 7205, 7209, 7205, 7101, 7102, 7103 | ベルタ | |
| 321 | Elite | `Pony` | class.lord.striker | 7304, 7307, 7314, 7101, 7102, 7103 | ソレナ | `a.m-barrier-breaker`1 |
| 322 | Normal | `Pony` | class.ninja.ninja | 7217, 7215, 7217, 7107, 7108, 7109 | ザフィール | |
| 323 | Normal | `Pony` | class.sage.sage | 7221, 7223, 7221, 7110, 7111, 7112 | フィナ | |
| 324 | Normal | `Pony` | class.samurai.samurai | 7209, 7205, 7209, 7104, 7105, 7106 | バルト | |
| 325 | Elite | `Leporian` | class.duelist.pilgrim | 7402, 7403, 7104, 7105, 7106 | ランスロット | `a.re-counter`1 |
| 326 | Elite | `Leporian` | class.wizard.striker | 7401, 7404, 7408, 7110, 7111 | ジョサン | `a.ranged-null`1 |
| 327 | Elite | `Pony` | class.wizard.sage | 7317, 7302, 7318, 7110, 7111, 7112 | ネイル | `a.melee-reflect`1 |
| 328 | Normal | `Origami` | class.alchemist.alchemist | 7223, 7219, 7223, 7110, 7111, 7112 | リーファ | |
| 329 | Normal | `Origami` | class.guardian.pilgrim | 7201, 7211, 7203, 7101, 7102, 7103 | ミカ | |
| 330 | Normal | `Origami` | class.sword-saint.sword-saint | 7211, 7207, 7211, 7104, 7105, 7106 | ポルカ | |
| 331 | Normal | `Pony` | class.samurai.duelist | 7209, 7205, 7207, 7104, 7105, 7106 | ヴィオラ | |
| 332 | Normal | `Pony` | class.wizard.alchemist | 7219, 7203, 7223, 7110, 7111, 7112 | クロウ | |
| 333 | Elite | `Origami` | class.pilgrim.sword-saint | 7303, 7319, 7309, 7101, 7102, 7103 | ネージュ | `a.melee-reflect`1 |
| 334 | Normal | `Undead` | class.guardian.wizard | 7201, 7211, 7219, 7101, 7102, 7103 | ムミア | |
| 335 | Normal | `Undead` | class.lord.striker | 7205, 7209, 7215, 7101, 7102, 7103 | ガルド | |
| 336 | Normal | `Undead` | class.sage.samurai | 7221, 7223, 7209, 7110, 7111, 7112 | シロネ | |
| 337 | Normal | `Origami` | class.duelist.lord | 7207, 7201, 7205, 7104, 7105, 7106 | クルミ | |
| 338 | Normal | `Origami` | class.lord.striker | 7205, 7209, 7215, 7101, 7102, 7103 | パッカ | |
| 339 | Elite | `Undead` | class.ranger.samurai | 7312, 7316, 7308, 7107, 7108, 7109 | ラグネ | `c.growth_x1.3` |
| 340 | Normal | `Origami` | class.ninja.ranger | 7217, 7215, 7213, 7107, 7108, 7109 | チュリ | |
| 341 | Normal | `Origami` | class.samurai.sword-saint | 7209, 7205, 7211, 7104, 7105, 7106 | コハル | |
| 342 | Normal | `Origami` | class.wizard.alchemist | 7219, 7203, 7223, 7110, 7111, 7112 | ミュラ | |
| 343 | Normal | `Undead` | class.sword-saint.guardian | 7211, 7207, 7201, 7104, 7105, 7106 | モルナ | |
| 344 | Normal | `Undead` | class.wizard.ninja | 7219, 7203, 7217, 7110, 7111, 7112 | ヴィネ | |
| 345 | Elite | `Undead` | class.duelist.alchemist | 7306, 7301, 7320, 7104, 7105, 7106 | バルグ | `c.physical-offense-multiplier_x1.4` |
| 346 | Normal | `Pony` | class.duelist.striker | 7207, 7201, 7215, 7104, 7105, 7106 | ルーノ | |
| 347 | Normal | `Pony` | class.pilgrim.sage | 7203, 7221, 7221, 7101, 7102, 7103 | エレノア | |
| 348 | Normal | `Pony` | class.sword-saint.striker | 7211, 7207, 7215, 7104, 7105, 7106 | ニーヴ | |
| 349 | Normal | `Undead` | class.ranger.duelist | 7213, 7217, 7207, 7107, 7108, 7109 | サージャ | |
| 350 | Normal | `Undead` | class.samurai.ranger | 7209, 7205, 7213, 7104, 7105, 7106 | メルナ | |
| 351 | BOSS | `Leporian` | class.lord.ninja | 7406, 7405, 7401, 7101, 7102, 7103 | 宰相ヴァルター | `a.melee-reflect`1, `c.growth_x1.4` |
| 352 | Normal | `Voidspawn` | class.ranger.ranger | 8213, 8217, 8213, 8107, 8108, 8109 | ヴェスパ | |
| 353 | Normal | `Voidspawn` | class.striker.striker | 8215, 8213, 8215, 8107, 8108, 8109 | キリカ | |
| 354 | Normal | `Voidspawn` | class.wizard.wizard | 8219, 8203, 8219, 8110, 8111, 8112 | ミレア | |
| 355 | Normal | `Voidspawn` | class.guardian.guardian | 8201, 8211, 8201, 8101, 8102, 8103 | グレタ | |
| 356 | Normal | `Voidspawn` | class.lord.lord | 8205, 8209, 8205, 8101, 8102, 8103 | ゼノア | |
| 357 | Elite | `Voidspawn` | class.guardian.pilgrim | 8301, 8311, 8303, 8101, 8102, 8103 | ルッカ | |
| 358 | Normal | `Voidspawn` | class.ninja.ninja | 8217, 8215, 8217, 8107, 8108, 8109 | ミュラ | |
| 359 | Normal | `Voidspawn` | class.sage.sage | 8221, 8223, 8221, 8110, 8111, 8112 | ラウラ | |
| 360 | Normal | `Voidspawn` | class.samurai.samurai | 8209, 8205, 8209, 8104, 8105, 8106 | シグナ | |
| 361 | Normal | `Ghost` | class.duelist.duelist | 8207, 8201, 8207, 8104, 8105, 8106 | エコア | |
| 362 | Normal | `Ghost` | class.pilgrim.pilgrim | 8203, 8221, 8203, 8101, 8102, 8103 | セフィラ | |
| 363 | Elite | `Voidspawn` | class.sage.alchemist | 8319, 8321, 8321, 8110, 8111, 8112 | レイヴァ | `m.gravity-well` |
| 364 | Normal | `Jinma` | class.alchemist.alchemist | 8223, 8219, 8223, 8110, 8111, 8112 | カイル | |
| 365 | Normal | `Jinma` | class.guardian.pilgrim | 8201, 8211, 8203, 8101, 8102, 8103 | ライラ | |
| 366 | Normal | `Jinma` | class.sword-saint.sword-saint | 8211, 8207, 8211, 8104, 8105, 8106 | レム | |
| 367 | Normal | `Voidspawn` | class.samurai.duelist | 8209, 8205, 8207, 8104, 8105, 8106 | ナージャ | |
| 368 | Normal | `Voidspawn` | class.wizard.alchemist | 8219, 8203, 8223, 8110, 8111, 8112 | メルナ | |
| 369 | Elite | `Jinma` | class.pilgrim.sword-saint | 8305, 8320, 8312, 8101, 8102, 8103 | マキナ | |
| 370 | Normal | `Ghost` | class.guardian.wizard | 8201, 8211, 8219, 8101, 8102, 8103 | リグレ | |
| 371 | Normal | `Ghost` | class.lord.striker | 8205, 8209, 8215, 8101, 8102, 8103 | ルクシア | |
| 372 | Normal | `Ghost` | class.sage.samurai | 8221, 8223, 8209, 8110, 8111, 8112 | フィーネ | |
| 373 | Normal | `Jinma` | class.duelist.lord | 8207, 8201, 8205, 8104, 8105, 8106 | ミネット | |
| 374 | Normal | `Jinma` | class.lord.striker | 8205, 8209, 8215, 8101, 8102, 8103 | ミント | |
| 375 | Elite | `Ghost` | class.samurai.striker | 8309, 8306, 8314, 8104, 8105, 8106 | ネイヴ | |
| 376 | Normal | `Jinma` | class.ninja.ranger | 8217, 8215, 8213, 8107, 8108, 8109 | ジーク | |
| 377 | Normal | `Jinma` | class.samurai.sword-saint | 8209, 8205, 8211, 8104, 8105, 8106 | レイト | |
| 378 | Normal | `Jinma` | class.wizard.alchemist | 8219, 8203, 8223, 8110, 8111, 8112 | ニトラ | |
| 379 | Elite | `Cervin` | class.sword-saint.ninja | 8404, 8408, 8104, 8105, 8106 | エルネ | |
| 380 | Elite | `Cervin` | class.wizard.guardian | 8402, 8407, 8110, 8111, 8112 | アルヴィン | |
| 381 | Elite | `Ghost` | class.wizard.samurai | 8317, 8304, 8309, 8110, 8111, 8112 | ヴィレア | |
| 382 | Normal | `Voidspawn` | class.duelist.striker | 8207, 8201, 8215, 8104, 8105, 8106 | ゼイン | |
| 383 | Normal | `Voidspawn` | class.pilgrim.sage | 8203, 8221, 8221, 8101, 8102, 8103 | ガルナ | |
| 384 | Normal | `Voidspawn` | class.sword-saint.striker | 8211, 8207, 8215, 8104, 8105, 8106 | コルヴァ | |
| 385 | Normal | `Ghost` | class.ranger.duelist | 8213, 8217, 8207, 8107, 8108, 8109 | レムリ | |
| 386 | Normal | `Ghost` | class.samurai.ranger | 8209, 8205, 8213, 8104, 8105, 8106 | モカ | |
| 387 | BOSS | `Cervin` | class.ninja.wizard | 8401, 8403, 8409, 8107, 8108, 8109 | セルヴァ・レム | `a.shock`1, `a.magic-seal`1 |



- prompt example:

```
Let’s make a character image

Deity 

| `x.exp_id` | `x.enemy_level` | Name | Title | Display Name | Class | Race Concept | Divine Philosophy | Visual Concept | Main Color | Sub Color | Accent Color | Sub Accent Color | Pose Direction |
|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 11 | 70 | Noctyra | God of Oblivion | ノクティラ 忘却されし神 | Samurai | Human | “To be forgotten is the final death.” | Destroyed samurai deity with erased face and eclipsed halo | Void Black | Dead Crimson | Faded Silver | Abyss Blue | Motionless downward-facing stance |

Halo as accent color 
Young, very small bust, Diagonal composition, with exposed midriff.

Simple kemono anime eyes with oversized rounded pupils, thick black feminine upper eyelids,  a large centered white oval catchlight inside each pupil, minimal iris rendering, mascot-like expression, flat-color eye style

Background is white and only the character. 
keeping the entire character comfortably inside the frame
No human-like hair, flat color, no outlines


```
