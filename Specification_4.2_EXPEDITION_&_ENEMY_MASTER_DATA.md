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


| `Enemy_ID` | `x.type` | `x.enemy_type` | `x.class` | `x.drop` | `x.name` (Japanese) | additional abilities or bonus |
|---|---|---|---|---|---|---|
| 1 | Divine | `Caninian` | class.pilgrim | `i.grimoire`M3, `i.robe`M3 | セイラン 再生の女神 | `a.resurrect`2 |
| 2 | Divine | `Lupinian` | class.samurai | `i.katana`M4, `i.shield`M4 | ガーヴ 消耗の神 | `a.rage`2, `a.re-counter`2 |
| 3 | Divine | `Vulpinian` | class.striker | `i.archery`M5, `i.bolt`M5 | キョウエン 狡猾の神 | `a.momentum`2 |
| 4 | Divine | `Felidian` | class.sage | `i.sword`M7, `i.catalyst`M7 | ミオラ 豊穣の女神 | `a.firststrike`2 |
| 5 | Divine | `Ursan` | class.guardian | `i.armor`M6, `i.gauntlet`M6 | ドルヴァ 防備の神 | `a.cyborgization`2 |
| 6 | Divine | `Procyonian` | class.duelist | `i.sword`M7, `i.gauntlet`M7 | タヌエ 幻影の女神 | |
| 7 | Divine | `Leporian` | class.ranger | `i.arrow`M8, `i.archery`M8 | リラ 精密の女神 | `a.composure`2 |
| 8 | Divine | `Cervin` | class.lord | `i.armor`M8, `i.robe`M8 | フォルネ 運命の神 | `a.focus`2 |
| 9 | Divine | `Murid` | class.ninja | `i.shield`M8, `i.catalyst`M8 | スクヴァ 黄昏の神 | `a.stealth`1 |
| 10 | Divine | `Mustelid` | class.wizard | `i.wand`M7, `i.arrow`M7 | ロンデル 共鳴の神 | `a.resonance`4 |
| 11 | Divine | `-` | class.samurai | `i.bolt`M8, `i.katana`M8 | ノクティラ 忘却されし神 | `a.rage`2, `a.firststrike`2 |
| 12 | Divine | `-` | class.pilgrim | `i.grimoire`M8, `i.wand`M8 | エリス 不和の神 | `a.momentum`2, `a.resonance`4, `a.stealth`1 |
| 13 | Normal | `Lupinian` | | | リップ | |
| 14 | Normal |`Vulpinian` | | | アマネ | |
| 15 | Normal |`Caninian` | | | ミズ | |
| 16 | Normal |`Procyonian` | | | 茶々 | |
| 17 | Normal |`Leporian` | | | ミリィ | |
| 18 | Normal |`Cervin` | | | ファニア | |
| 100 | Normal | `Beast` | class.ranger | `i.arrow`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | たんぽぽめ | |
| 101 | Normal | `Beast` | class.striker | `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | いしぽん | |
| 102 | Normal | `Beast` | class.wizard | `i.wand`U, `i.robe`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | もす | `a.dryproof`1 |
| 103 | Normal | `Beast` | class.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`C, `i.robe`C, `i.shield`C | くろーびっと | |
| 104 | Normal | `Beast` | class.lord | `i.shield`U, `i.katana`U, `i.armor`C, `i.robe`C, `i.shield`C | くるくる | |
| 105 | Elite | `Beast` | class.duelist | `i.sword`EA, `i.armor`EA, `i.sword`C, `i.katana`C, `i.gauntlet`C | わおーん | `a.howl`1 |
| 106 | Normal | `Beast` | class.ninja | `i.archery`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | りんりん | |
| 107 | Normal | `Beast` | class.sage | `i.grimoire`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | こんた | |
| 108 | Normal | `Beast` | class.samurai | `i.katana`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | きっつん | `a.coldproof`1 |
| 109 | Normal | `Aerial` | class.duelist | `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | シーガル | |
| 110 | Normal | `Aerial` | class.pilgrim | `i.robe`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | スパロゥ | |
| 111 | Elite | `Beast` | class.samurai | `i.katana`EA, `i.shield`EA, `i.sword`C, `i.katana`C, `i.gauntlet`C | シンディパウ | `a.null-burn`1, `a.burn`1 |
| 112 | Normal | `Insect_Swarm` | class.alchemist | `i.catalyst`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 鳳蝶 | |
| 113 | Normal | `Insect_Swarm` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | レディバグ | |
| 114 | Normal | `Insect_Swarm` | class.sword-saint | `i.gauntlet`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 花鎌娘 | `a.bind`1 |
| 115 | Normal | `Beast` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ふわっと | |
| 116 | Normal | `Beast` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ひのこ | `a.null-burn`1 |
| 117 | Elite | `Insect_Swarm` | class.ranger.striker | `i.arrow`EC, `i.archery`EC, `i.bolt`EC, `i.arrow`C, `i.bolt`C, `i.archery`C | ビーズ | |
| 118 | Normal | `Aerial` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | メロウル | |
| 119 | Normal | `Aerial` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | ぱんころう | |
| 120 | Normal | `Aerial` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | かわせみ | |
| 121 | Elite | `Caninian` | class.duelist.lord | `i.shield`BD, `i.robe`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | サクラ | `a.execution`1 |
| 122 | Elite | `Caninian` | class.lord.striker | `i.katana`BD, `i.gauntlet`BD, `i.armor`C, `i.robe`C, `i.shield`C | エメラ | `a.deflection`1 |
| 123 | Elite | `Aerial` | class.sage.lord | `i.grimoire`EB, `i.catalyst`EB, `i.shield`EB, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ファルコ | `a.wind-rider`1 |
| 124 | Normal | `Insect_Swarm` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ハルビー | |
| 125 | Normal | `Insect_Swarm` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ドラコフライ | |
| 126 | Normal | `Insect_Swarm` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ホタル | |
| 127 | Normal | `Aerial` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | コーム | |
| 128 | Normal | `Aerial` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | セキレ | |
| 129 | Elite | `Aerial` | class.alchemist.wizard | `i.catalyst`EB, `i.wand`EB, `i.robe`EB, `i.wand`C, `i.grimoire`C, `i.catalyst`C | トリコ | `a.null-death-touch`1, `a.re-attack`1 |
| 130 | Normal | `Beast` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | みずうさぎ | |
| 131 | Normal | `Beast` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | もすらむ | |
| 132 | Normal | `Beast` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | あなこ | |
| 133 | Normal | `Aerial` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ペネトレーター | |
| 134 | Normal | `Aerial` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ヨキジ | |
| 135 | BOSS | `Caninian` | class.guardian | `i.armor`BD, `i.gauntlet`BD, `i.shield`BD, `i.armor`C, `i.robe`C, `i.shield`C | ヴェルグ | `a.ice-absorb`1, `a.true-sight`1, `c.growth_x1.2` |
| 136 | Normal | `Frost` | class.ranger | `i.arrow`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | シズク | |
| 137 | Normal | `Frost` | class.striker | `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | クリスティア | |
| 138 | Normal | `Frost` | class.wizard | `i.wand`U, `i.robe`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ヴィエル | |
| 139 | Normal | `Frost` | class.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`C, `i.robe`C, `i.shield`C | ルルア | |
| 140 | Normal | `Frost` | class.lord | `i.shield`U, `i.katana`U, `i.armor`C, `i.robe`C, `i.shield`C | リゼル | |
| 141 | Elite | `Frost` | class.lord.ranger | `i.shield`EA, `i.katana`EA, `i.arrow`EA, `i.armor`C, `i.robe`C, `i.shield`C | アメル | `a.ice-protect-breaker`1 |
| 142 | Normal | `Frost` | class.ninja | `i.archery`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | フィナ | `a.howl`3 |
| 143 | Normal | `Frost` | class.sage | `i.grimoire`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | シエル | `a.first-aid`2 |
| 144 | Normal | `Frost` | class.samurai | `i.katana`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ネネ | `a.predator-sense`1 |
| 145 | Normal | `Golem` | class.duelist | `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ドレープ | |
| 146 | Normal | `Golem` | class.pilgrim | `i.robe`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | アルカパ | |
| 147 | Elite | `Frost` | class.samurai.guardian | `i.katana`EA, `i.shield`EA, `i.armor`EA, `i.sword`C, `i.katana`C, `i.gauntlet`C | シェリ | `c.physical-defense-multiplier_x0.5` |
| 148 | Normal | `Plant_Fungal` | class.alchemist | `i.catalyst`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | スポレラ | `a.requiem`1 |
| 149 | Normal | `Plant_Fungal` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | カプレット | |
| 150 | Normal | `Plant_Fungal` | class.sword-saint | `i.gauntlet`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ルメモス | |
| 151 | Normal | `Frost` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ルミ | |
| 152 | Normal | `Frost` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | マーニー | |
| 153 | Elite | `Plant_Fungal` | class.striker.pilgrim | `i.bolt`EC, `i.arrow`EC, `i.robe`EC, `i.arrow`C, `i.bolt`C, `i.archery`C | アマニバン | `a.boost`2 |
| 154 | Normal | `Golem` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | ウールワード | `a.bulwark`1 |
| 155 | Normal | `Golem` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | パッチパウ | |
| 156 | Normal | `Golem` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | メールホップ | |
| 157 | Normal | `Plant_Fungal` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | パールスポア | |
| 158 | Normal | `Plant_Fungal` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | ウールミ | |
| 159 | Elite | `Golem` | class.sword-saint.alchemist | `i.gauntlet`EB, `i.sword`EB, `i.catalyst`EB, `i.sword`C, `i.katana`C, `i.gauntlet`C | スティッチリング | `a.ranged-reflect`1 |
| 160 | Normal | `Plant_Fungal` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | パフキャップ | `a.melee-confusion`1 |
| 161 | Normal | `Plant_Fungal` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | タリア | |
| 162 | Normal | `Plant_Fungal` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | インクキャップ | |
| 163 | Elite | `Lupinian` | class.ninja.sword-saint | `i.bolt`BD, `i.archery`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | ポルセラ | `c.physical-defense-multiplier_x0.4` |
| 164 | Elite | `Lupinian` | class.wizard.guardian | `i.wand`BD, `i.catalyst`BD, `i.robe`BD, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ポルセル | `c.physical-defense-multiplier_x0.6`, `a.covering-fire`1 |
| 165 | Elite | `Golem` | class.wizard.sage | `i.wand`EB, `i.robe`EB, `i.grimoire`EB, `i.wand`C, `i.grimoire`C, `i.catalyst`C | カップマウス | `a.slow`1 |
| 166 | Normal | `Frost` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ニナ | |
| 167 | Normal | `Frost` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | ピッパ | |
| 168 | Normal | `Frost` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ミミ | |
| 169 | Normal | `Golem` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | リボンバン | |
| 170 | Normal | `Golem` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | パックベア | |
| 171 | BOSS | `Lupinian` | class.striker.duelist | `i.bolt`BD, `i.arrow`BD, `i.archery`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | ロザリア | `a.deflection`2, `a.life-drain`7, `a.null-life-drain`1, `c.growth_x2.0` |
| 172 | Normal | `Fruit` | class.ranger.ranger | `i.arrow`U, `i.archery`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | あぷりん | |
| 173 | Normal | `Fruit` | class.striker.striker | `i.bolt`U, `i.arrow`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ぐぁびー | |
| 174 | Normal | `Fruit` | class.wizard.wizard | `i.wand`U, `i.robe`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | みむる | |
| 175 | Normal | `Fruit` | class.guardian.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`U, `i.armor`C, `i.robe`C, `i.shield`C | ぷるみ | |
| 176 | Normal | `Fruit` | class.lord.lord | `i.shield`U, `i.katana`U, `i.shield`U, `i.armor`C, `i.robe`C, `i.shield`C | まんぐー | |
| 177 | Elite | `Fruit` | class.pilgrim.wizard | `i.robe`EA, `i.grimoire`EA, `i.wand`EA, `i.armor`C, `i.robe`C, `i.shield`C | ぱや | `a.null-shock`1 |
| 178 | Normal | `Fruit` | class.ninja.ninja | `i.archery`U, `i.bolt`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ぴな | |
| 179 | Normal | `Fruit` | class.sage.sage | `i.grimoire`U, `i.catalyst`U, `i.grimoire`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ちぇり | |
| 180 | Normal | `Fruit` | class.samurai.samurai | `i.katana`U, `i.shield`U, `i.katana`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ぱらーしゃ | |
| 181 | Normal | `Slime_Colony` | class.duelist.duelist | `i.sword`U, `i.armor`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | らびめる | |
| 182 | Normal | `Slime_Colony` | class.pilgrim.pilgrim | `i.robe`U, `i.grimoire`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | べとりーば | |
| 183 | Elite | `Fruit` | class.lord.samurai | `i.shield`EA, `i.katana`EA, `i.katana`EA, `i.armor`C, `i.robe`C, `i.shield`C | りっぴー | `a.unforgettable`1 |
| 184 | Normal | `Spirit` | class.alchemist.alchemist | `i.catalyst`U, `i.wand`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | レイミ | |
| 185 | Normal | `Orcinian` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | クリセレ | |
| 186 | Normal | `Spirit` | class.sword-saint.sword-saint | `i.gauntlet`U, `i.sword`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | シロハ | |
| 187 | Normal | `Fruit` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ぴたっぴ | |
| 188 | Normal | `Fruit` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | からっぴ | |
| 189 | Elite | `Orcinian` | class.wizard.ninja | `i.wand`ED, `i.robe`ED, `i.archery`ED, `i.wand`C, `i.grimoire`C, `i.catalyst`C | レディ・ネリッサ | `a.re-attack`1 |
| 190 | Normal | `Slime_Colony` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | スミ | |
| 191 | Normal | `Slime_Colony` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | ルミネ | |
| 192 | Normal | `Slime_Colony` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ヴァルディ | |
| 193 | Normal | `Orcinian` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | アリア | |
| 194 | Normal | `Orcinian` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | セレン | |
| 195 | Elite | `Slime_Colony` | class.ninja.guardian | `i.archery`EB, `i.bolt`EB, `i.armor`EB, `i.arrow`C, `i.bolt`C, `i.archery`C | サルナ | `a.resurrect`1 |
| 196 | Normal | `Spirit` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ミズキ | |
| 197 | Normal | `Orcinian` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 鉄錨のマリナ | |
| 198 | Normal | `Orcinian` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ニメラ | |
| 199 | Elite | `Vulpinian` | class.sword-saint.guardian | `i.sword`BD, `i.shield`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | ヴェスパー | |
| 200 | Elite | `Vulpinian` | class.wizard.ninja | `i.catalyst`BD, `i.bolt`BD, `i.wand`C, `i.grimoire`C, `i.catalyst`C | セドリック | `a.cunning`1 |
| 201 | Elite | `Slime_Colony` | class.striker.sword-saint | `i.bolt`EB, `i.arrow`EB, `i.gauntlet`EB, `i.arrow`C, `i.bolt`C, `i.archery`C | ネリア | `a.overwatch`1 |
| 202 | Normal | `Fruit` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | なぴ | |
| 203 | Normal | `Fruit` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | みき | |
| 204 | Normal | `Orcinian` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | エヴェリナ | |
| 205 | Normal | `Slime_Colony` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | イリア | |
| 206 | Normal | `Slime_Colony` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ヴェスペラ | |
| 207 | BOSS | `Vulpinian` | class.wizard.sage | `i.wand`BD, `i.robe`BD, `i.grimoire`BD, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 宰相ゴールドテイル | `a.melee-confusion`1, `c.growth_x1.5`, `a.squander`1 |
| 208 | Normal | `Shadowfang` | class.ranger.ranger | `i.arrow`U, `i.archery`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ポムキャット | |
| 209 | Normal | `Shadowfang` | class.striker.striker | `i.bolt`U, `i.arrow`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | フワテイル | |
| 210 | Normal | `Shadowfang` | class.wizard.wizard | `i.wand`U, `i.robe`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | コロッチュ | |
| 211 | Normal | `Shadowfang` | class.guardian.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`U, `i.armor`C, `i.robe`C, `i.shield`C | フェネップ | |
| 212 | Normal | `Shadowfang` | class.lord.lord | `i.shield`U, `i.katana`U, `i.shield`U, `i.armor`C, `i.robe`C, `i.shield`C | トロポン | |
| 213 | Elite | `Shadowfang` | class.pilgrim.guardian | `i.robe`EA, `i.grimoire`EA, `i.armor`EA, `i.armor`C, `i.robe`C, `i.shield`C | ワメ | `c.growth_x1.3` |
| 214 | Normal | `Shadowfang` | class.ninja.ninja | `i.archery`U, `i.bolt`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | マルカ | |
| 215 | Normal | `Shadowfang` | class.sage.sage | `i.grimoire`U, `i.catalyst`U, `i.grimoire`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | タマ | |
| 216 | Normal | `Shadowfang` | class.samurai.samurai | `i.katana`U, `i.shield`U, `i.katana`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | パフゥーク | |
| 217 | Normal | `Felidian` | class.duelist.duelist | `i.sword`U, `i.armor`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | カラカル | |
| 218 | Normal | `Felidian` | class.pilgrim.pilgrim | `i.robe`U, `i.grimoire`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | ゼファー | |
| 219 | Elite | `Shadowfang` | class.samurai.striker | `i.katana`EA, `i.shield`EA, `i.bolt`EA, `i.sword`C, `i.katana`C, `i.gauntlet`C | タミャ | `c.penet+40` |
| 220 | Normal | `Titan` | class.alchemist.alchemist | `i.catalyst`U, `i.wand`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | K9-33 | |
| 221 | Normal | `Titan` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | K9-07 | |
| 222 | Normal | `Titan` | class.sword-saint.sword-saint | `i.gauntlet`U, `i.sword`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | K9-15 | |
| 223 | Normal | `Shadowfang` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ミーケ | |
| 224 | Normal | `Shadowfang` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | マレプ | |
| 225 | Elite | `Titan` | class.lord.wizard | `i.shield`EC, `i.katana`EC, `i.wand`EC, `i.armor`C, `i.robe`C, `i.shield`C | K9-01 | `a.re-attack`1 |
| 226 | Normal | `Murid` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | 怪力のロブ | |
| 227 | Normal | `Murid` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 転尻のタンブル | |
| 228 | Normal | `Murid` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 砂足のキリ | |
| 229 | Elite | `Felidian` | class.ninja.duelist | `i.robe`BD, `i.sword`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | 神官ネメア | `a.reanimate`1 |
| 230 | Elite | `Felidian` | class.striker.sage | `i.grimoire`BD, `i.arrow`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | 審問官ザーラ | `c.growth_x1.4` |
| 231 | Elite | `Murid` | class.ninja.duelist | `i.archery`EB, `i.bolt`EB, `i.sword`EB, `i.arrow`C, `i.bolt`C, `i.archery`C | 赤牙のリゾ | `a.rage`1 |
| 232 | Normal | `Titan` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | K9-21 | |
| 233 | Normal | `Titan` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | K9-05 | |
| 234 | Normal | `Titan` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | K9-40 | |
| 235 | Normal | `Felidian` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | カラリナ | |
| 236 | Normal | `Murid` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 鉤尾のヴェン | |
| 237 | Elite | `Felidian` | class.sage.alchemist | `i.grimoire`EB, `i.catalyst`EB, `i.catalyst`EB, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ケマ | `d.evasion+30` |
| 238 | Normal | `Felidian` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ペシャ | |
| 239 | Normal | `Felidian` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | ネメア | |
| 240 | Normal | `Felidian` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ラミル | |
| 241 | Normal | `Murid` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 銀髭のヴァロ | |
| 242 | Normal | `Murid` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 銭のマーン | |
| 243 | BOSS | `Felidian` | class.striker.ranger | `i.bolt`BD, `i.arrow`BD, `i.arrow`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | 大司祭マウラ | `c.fire-defense-multiplier_x4/5`, `c.growth_x1.5` |
| 244 | Normal | `Beast` | class.ranger.ranger | `i.arrow`U, `i.archery`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ジスカ | |
| 245 | Normal | `Beast` | class.striker.striker | `i.bolt`U, `i.arrow`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | スナ | |
| 246 | Normal | `Beast` | class.wizard.wizard | `i.wand`U, `i.robe`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ラテラ | |
| 247 | Normal | `Beast` | class.guardian.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`U, `i.armor`C, `i.robe`C, `i.shield`C | プレシア | |
| 248 | Normal | `Beast` | class.lord.lord | `i.shield`U, `i.katana`U, `i.shield`U, `i.armor`C, `i.robe`C, `i.shield`C | グアナ | |
| 249 | Elite | `Beast` | class.ninja.sword-saint | `i.archery`EA, `i.bolt`EA, `i.gauntlet`EA, `i.arrow`C, `i.bolt`C, `i.archery`C | カウダ | `a.re-attack`1 |
| 250 | Normal | `Beast` | class.ninja.ninja | `i.archery`U, `i.bolt`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ストロフィア | |
| 251 | Normal | `Beast` | class.sage.sage | `i.grimoire`U, `i.catalyst`U, `i.grimoire`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | トリボラ | |
| 252 | Normal | `Beast` | class.samurai.samurai | `i.katana`U, `i.shield`U, `i.katana`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | コルシア | |
| 253 | Normal | `Dragon` | class.duelist.duelist | `i.sword`U, `i.armor`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | プルミア | |
| 254 | Normal | `Dragon` | class.pilgrim.pilgrim | `i.robe`U, `i.grimoire`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | オフィサ | |
| 255 | Elite | `Beast` | class.pilgrim.alchemist | `i.robe`EA, `i.grimoire`EA, `i.catalyst`EA, `i.armor`C, `i.robe`C, `i.shield`C | ランプロサ | `a.illusion`1 |
| 256 | Normal | `Beast` | class.alchemist.alchemist | `i.catalyst`U, `i.wand`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ウロプラ | |
| 257 | Normal | `Ursan` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | ウルシア | |
| 258 | Normal | `Ursan` | class.sword-saint.sword-saint | `i.gauntlet`U, `i.sword`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | アイルラ | |
| 259 | Elite | `Ursan` | class.samurai.duelist | `i.gauntlet`BD, `i.armor`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | ベルネッタ | `a.rage`1 |
| 260 | Elite | `Ursan` | class.wizard.alchemist | `i.wand`BD, `i.catalyst`BD, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ボンベラ | `c.physical-defense-multiplier_x1/3` |
| 261 | Elite | `Ursan` | class.guardian.sage | `i.armor`EC, `i.gauntlet`EC, `i.grimoire`EC, `i.armor`C, `i.robe`C, `i.shield`C | アークトン | `a.deflection`2 |
| 262 | Normal | `Dragon` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | ヘローラ | |
| 263 | Normal | `Dragon` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | クラミア | |
| 264 | Normal | `Dragon` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ヘロディア | |
| 265 | Normal | `Ursan` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | マリティア | |
| 266 | Normal | `Ursan` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | アークティア | |
| 267 | Elite | `Dragon` | class.lord.duelist | `i.shield`EB, `i.katana`EB, `i.sword`EB, `i.armor`C, `i.robe`C, `i.shield`C | サルヴァタ | `a.magic-seal`1 |
| 268 | Normal | `Ursan` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | メルーラ | |
| 269 | Normal | `Ursan` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | モンタラ | |
| 270 | Normal | `Beast` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | カメリア | `a.mimic`1 |
| 271 | Normal | `Dragon` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ヴァラナ | |
| 272 | Normal | `Dragon` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | アガミア | |
| 273 | Elite | `Dragon` | class.alchemist.wizard | `i.catalyst`EB, `i.wand`EB, `i.wand`EB, `i.wand`C, `i.grimoire`C, `i.catalyst`C | フィコラ | `a.boost`1 |
| 274 | Normal | `Beast` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ティモニア | |
| 275 | Normal | `Beast` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | フィシグナ | |
| 276 | Normal | `Beast` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ラティア | |
| 277 | Normal | `Dragon` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | モロキア | |
| 278 | Normal | `Dragon` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ハイドロサ | |
| 279 | BOSS | `Ursan` | class.samurai.duelist | `i.katana`BD, `i.shield`BD, `i.sword`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | ケルビナ | `a.fire-reflect`1, `c.growth_x1.3` |
| 280 | Normal | `Mech` | class.ranger.ranger | `i.arrow`U, `i.archery`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | リヴェッタ | |
| 281 | Normal | `Mech` | class.striker.striker | `i.bolt`U, `i.arrow`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ピペット | |
| 282 | Normal | `Mech` | class.wizard.wizard | `i.wand`U, `i.robe`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | スプロクサ | |
| 283 | Normal | `Mech` | class.guardian.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`U, `i.armor`C, `i.robe`C, `i.shield`C | タンブル | |
| 284 | Normal | `Mech` | class.lord.lord | `i.shield`U, `i.katana`U, `i.shield`U, `i.armor`C, `i.robe`C, `i.shield`C | モクシー | |
| 285 | Elite | `Mech` | class.guardian.ninja | `i.armor`EA, `i.gauntlet`EA, `i.archery`EA, `i.armor`C, `i.robe`C, `i.shield`C | パッチ | `c.growth_x1.3` |
| 286 | Normal | `Mech` | class.ninja.ninja | `i.archery`U, `i.bolt`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ニブルズ | |
| 287 | Normal | `Mech` | class.sage.sage | `i.grimoire`U, `i.catalyst`U, `i.grimoire`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ティッカ | |
| 288 | Normal | `Mech` | class.samurai.samurai | `i.katana`U, `i.shield`U, `i.katana`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ジッピー | |
| 289 | Normal | `Chiropteran` | class.duelist.duelist | `i.sword`U, `i.armor`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ヴェスパー | |
| 290 | Normal | `Chiropteran` | class.pilgrim.pilgrim | `i.robe`U, `i.grimoire`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | サーリ | |
| 291 | Elite | `Mech` | class.ranger.striker | `i.arrow`EA, `i.archery`EA, `i.bolt`EA, `i.arrow`C, `i.bolt`C, `i.archery`C | ラチェット | `c.penet+40` |
| 292 | Normal | `Chimera` | class.alchemist.alchemist | `i.catalyst`U, `i.wand`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ミスティ | |
| 293 | Normal | `Chimera` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | モロウ | |
| 294 | Normal | `Chimera` | class.sword-saint.sword-saint | `i.gauntlet`U, `i.sword`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ルー | |
| 295 | Normal | `Mech` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ヴェクサ | |
| 296 | Normal | `Mech` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ビクシー | |
| 297 | Elite | `Chimera` | class.alchemist.wizard | `i.catalyst`EC, `i.wand`EC, `i.wand`EC, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ダスク | `c.magical-offense-multiplier_x1.4` |
| 298 | Normal | `Chiropteran` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | スカリー | |
| 299 | Normal | `Chiropteran` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | ヴェローラ | |
| 300 | Normal | `Chiropteran` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | カーミラ | |
| 301 | Normal | `Chimera` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ラズリ | |
| 302 | Normal | `Chimera` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | マンブル | |
| 303 | Elite | `Chiropteran` | class.samurai.duelist | `i.katana`EB, `i.shield`EB, `i.sword`EB, `i.sword`C, `i.katana`C, `i.gauntlet`C | ネーヴェ | `a.first-strike`1 |
| 304 | Normal | `Chimera` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | スヌーズ | |
| 305 | Normal | `Chimera` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ヨーニー | |
| 306 | Normal | `Chimera` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ウィスプ | |
| 307 | Normal | `Chiropteran` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ソラーラ | |
| 308 | Normal | `Chiropteran` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | フォリア | |
| 309 | Elite | `Chiropteran` | class.ninja.sage | `i.archery`EB, `i.bolt`EB, `i.grimoire`EB, `i.arrow`C, `i.bolt`C, `i.archery`C | セラフィー | `a.ranged-confusion`1 |
| 310 | Normal | `Mech` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | フィクシー | |
| 311 | Normal | `Mech` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | キャリパー | |
| 312 | Normal | `Mech` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ミンティ | |
| 313 | Elite | `Procyonian` | class.ranger.duelist | `i.arrow`BD, `i.archery`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | クインシー | `c.growth_x1.5` |
| 314 | Elite | `Procyonian` | class.samurai.ranger | `i.shield`BD, `i.katana`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | スキッパー | `c.growth_x1.5` |
| 315 | BOSS | `Procyonian` | class.sage.lord | `i.grimoire`BD, `i.catalyst`BD, `i.shield`BD, `i.wand`C, `i.grimoire`C, `i.catalyst`C | セレスティアルリーパー | `a.soul-reap`3, `c.growth_x1.5` |
| 316 | Normal | `Pony` | class.ranger.ranger | `i.arrow`U, `i.archery`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | リッカ | |
| 317 | Normal | `Pony` | class.striker.striker | `i.bolt`U, `i.arrow`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ナナラ | |
| 318 | Normal | `Pony` | class.wizard.wizard | `i.wand`U, `i.robe`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ノワ | |
| 319 | Normal | `Pony` | class.guardian.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`U, `i.armor`C, `i.robe`C, `i.shield`C | ジータ | |
| 320 | Normal | `Pony` | class.lord.lord | `i.shield`U, `i.katana`U, `i.shield`U, `i.armor`C, `i.robe`C, `i.shield`C | ベルタ | |
| 321 | Elite | `Pony` | class.lord.striker | `i.shield`EA, `i.katana`EA, `i.bolt`EA, `i.armor`C, `i.robe`C, `i.shield`C | ソレナ | `a.m-barrier-breaker`1 |
| 322 | Normal | `Pony` | class.ninja.ninja | `i.archery`U, `i.bolt`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ザフィール | |
| 323 | Normal | `Pony` | class.sage.sage | `i.grimoire`U, `i.catalyst`U, `i.grimoire`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | フィナ | |
| 324 | Normal | `Pony` | class.samurai.samurai | `i.katana`U, `i.shield`U, `i.katana`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | バルト | |
| 325 | Elite | `Leporian` | class.duelist.pilgrim | `i.armor`BD, `i.gauntlet`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | ランスロット | `a.re-counter`1 |
| 326 | Elite | `Leporian` | class.wizard.striker | `i.archery`BD, `i.grimoire`BD, `i.arrow`BD, `i.wand`C, `i.grimoire`C | ジョサン | `a.ranged-null`1 |
| 327 | Elite | `Pony` | class.wizard.sage | `i.wand`EA, `i.robe`EA, `i.grimoire`EA, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ネイル | `a.melee-reflect`1 |
| 328 | Normal | `Origami` | class.alchemist.alchemist | `i.catalyst`U, `i.wand`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | リーファ | |
| 329 | Normal | `Origami` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | ミカ | |
| 330 | Normal | `Origami` | class.sword-saint.sword-saint | `i.gauntlet`U, `i.sword`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ポルカ | |
| 331 | Normal | `Pony` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ヴィオラ | |
| 332 | Normal | `Pony` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | クロウ | |
| 333 | Elite | `Origami` | class.pilgrim.sword-saint | `i.robe`EC, `i.grimoire`EC, `i.gauntlet`EC, `i.armor`C, `i.robe`C, `i.shield`C | ネージュ | `a.melee-reflect`1 |
| 334 | Normal | `Undead` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | ムミア | |
| 335 | Normal | `Undead` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | ガルド | |
| 336 | Normal | `Undead` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | シロネ | |
| 337 | Normal | `Origami` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | クルミ | |
| 338 | Normal | `Origami` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | パッカ | |
| 339 | Elite | `Undead` | class.ranger.samurai | `i.arrow`EB, `i.archery`EB, `i.katana`EB, `i.arrow`C, `i.bolt`C, `i.archery`C | ラグネ | `c.growth_x1.3` |
| 340 | Normal | `Origami` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | チュリ | |
| 341 | Normal | `Origami` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | コハル | |
| 342 | Normal | `Origami` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ミュラ | |
| 343 | Normal | `Undead` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | モルナ | |
| 344 | Normal | `Undead` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ヴィネ | |
| 345 | Elite | `Undead` | class.duelist.alchemist | `i.sword`EB, `i.armor`EB, `i.catalyst`EB, `i.sword`C, `i.katana`C, `i.gauntlet`C | バルグ | `c.physical-offense-multiplier_x1.4` |
| 346 | Normal | `Pony` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ルーノ | |
| 347 | Normal | `Pony` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | エレノア | |
| 348 | Normal | `Pony` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ニーヴ | |
| 349 | Normal | `Undead` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | サージャ | |
| 350 | Normal | `Undead` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | メルナ | |
| 351 | BOSS | `Leporian` | class.lord.ninja | `i.shield`BD, `i.katana`BD, `i.archery`BD, `i.armor`C, `i.robe`C, `i.shield`C | 宰相ヴァルター | `a.melee-reflect`1, `c.growth_x1.4` |
| 352 | Normal | `Voidspawn` | class.ranger.ranger | `i.arrow`U, `i.archery`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ヴェスパ | |
| 353 | Normal | `Voidspawn` | class.striker.striker | `i.bolt`U, `i.arrow`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | キリカ | |
| 354 | Normal | `Voidspawn` | class.wizard.wizard | `i.wand`U, `i.robe`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ミレア | |
| 355 | Normal | `Voidspawn` | class.guardian.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`U, `i.armor`C, `i.robe`C, `i.shield`C | グレタ | |
| 356 | Normal | `Voidspawn` | class.lord.lord | `i.shield`U, `i.katana`U, `i.shield`U, `i.armor`C, `i.robe`C, `i.shield`C | ゼノア | |
| 357 | Elite | `Voidspawn` | class.guardian.pilgrim | `i.armor`EA, `i.gauntlet`EA, `i.robe`EA, `i.armor`C, `i.robe`C, `i.shield`C | ルッカ | |
| 358 | Normal | `Voidspawn` | class.ninja.ninja | `i.archery`U, `i.bolt`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ミュウラ | |
| 359 | Normal | `Voidspawn` | class.sage.sage | `i.grimoire`U, `i.catalyst`U, `i.grimoire`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ラウラ | |
| 360 | Normal | `Voidspawn` | class.samurai.samurai | `i.katana`U, `i.shield`U, `i.katana`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | シグナ | |
| 361 | Normal | `Ghost` | class.duelist.duelist | `i.sword`U, `i.armor`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | エコア | |
| 362 | Normal | `Ghost` | class.pilgrim.pilgrim | `i.robe`U, `i.grimoire`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | セフィラ | |
| 363 | Elite | `Voidspawn` | class.sage.alchemist | `i.grimoire`EA, `i.catalyst`EA, `i.catalyst`EA, `i.wand`C, `i.grimoire`C, `i.catalyst`C | レイヴァ | |
| 364 | Normal | `Jinma` | class.alchemist.alchemist | `i.catalyst`U, `i.wand`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | カイル | |
| 365 | Normal | `Jinma` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | ライラ | |
| 366 | Normal | `Jinma` | class.sword-saint.sword-saint | `i.gauntlet`U, `i.sword`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | レム | |
| 367 | Normal | `Voidspawn` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ナージャ | |
| 368 | Normal | `Voidspawn` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | メルナ | |
| 369 | Elite | `Jinma` | class.pilgrim.sword-saint | `i.robe`EC, `i.grimoire`EC, `i.gauntlet`EC, `i.armor`C, `i.robe`C, `i.shield`C | マキナ | |
| 370 | Normal | `Ghost` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | リグレ | |
| 371 | Normal | `Ghost` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | ルクシア | |
| 372 | Normal | `Ghost` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | フィーネ | |
| 373 | Normal | `Jinma` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ミネット | |
| 374 | Normal | `Jinma` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | ミント | |
| 375 | Elite | `Ghost` | class.samurai.striker | `i.katana`EB, `i.shield`EB, `i.bolt`EB, `i.sword`C, `i.katana`C, `i.gauntlet`C | ネイヴ | |
| 376 | Normal | `Jinma` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ジーク | |
| 377 | Normal | `Jinma` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | レイト | |
| 378 | Normal | `Jinma` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ニトラ | |
| 379 | Elite | `Cervin` | class.sword-saint.ninja | `i.catalyst`BD, `i.sword`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | エルネ | |
| 380 | Elite | `Cervin` | class.wizard.guardian | `i.arrow`BD, `i.robe`BD, `i.wand`C, `i.grimoire`C, `i.catalyst`C | アルヴィン | |
| 381 | Elite | `Ghost` | class.wizard.samurai | `i.wand`EB, `i.robe`EB, `i.katana`EB, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ヴィレア | |
| 382 | Normal | `Voidspawn` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ゼイン | |
| 383 | Normal | `Voidspawn` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | ガルナ | |
| 384 | Normal | `Voidspawn` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | コルヴァ | |
| 385 | Normal | `Ghost` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | レムリ | |
| 386 | Normal | `Ghost` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | モカ | |
| 387 | BOSS | `Cervin` | class.ninja.wizard | `i.archery`BD, `i.bolt`BD, `i.wand`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | セルヴァ・レム | `a.shock`1, `a.magic-seal`1 |



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
