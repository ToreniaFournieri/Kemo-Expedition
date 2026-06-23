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



| `Enemy_ID` | `x.exp_id` | `x.floor` | `x.room` | `x.level` | `x.type` | `x.enemy_type` | `x.class` | `x.drop` | `x.name` (Japanese) | additional abilities or bonus |
|---|---|---:|---|---:|---|---|---|---|---|---|
| 100 | 1 | 1 | 1-2 | 1 | Normal | `Beast` | class.ranger | `i.arrow`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | たんぽぽめ |
| 101 | 1 | 1 | 1-2 | 1 | Normal | `Beast` | class.striker | `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | いしぽん |
| 102 | 1 | 1 | 1-2 | 1 | Normal | `Beast` | class.wizard | `i.wand`U, `i.robe`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | もす |
| 103 | 1 | 1 | 3 | 2 | Normal | `Beast` | class.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`C, `i.robe`C, `i.shield`C | くろーびっと |
| 104 | 1 | 1 | 3 | 2 | Normal | `Beast` | class.lord | `i.shield`U, `i.katana`U, `i.armor`C, `i.robe`C, `i.shield`C | くるくる |
| 105 | 1 | 1 | 4 | 4 | Elite | `Beast` | class.duelist | `i.sword`EA, `i.armor`EA, `i.sword`C, `i.katana`C, `i.gauntlet`C | わおーん | `a.howl`1 |
| 106 | 1 | 2 | 1-2 | 2 | Normal | `Beast` | class.ninja | `i.archery`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | りんりん |
| 107 | 1 | 2 | 1-2 | 2 | Normal | `Beast` | class.sage | `i.grimoire`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | こんた |
| 108 | 1 | 2 | 1-2 | 2 | Normal | `Beast` | class.samurai | `i.katana`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | きっつん |
| 109 | 1 | 2 | 3 | 3 | Normal | `Aerial` | class.duelist | `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | シーガル |
| 110 | 1 | 2 | 3 | 3 | Normal | `Aerial` | class.pilgrim | `i.robe`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | スパロゥ |
| 111 | 1 | 2 | 4 | 5 | Elite | `Beast` | class.samurai | `i.katana`EA, `i.shield`EA, `i.sword`C, `i.katana`C, `i.gauntlet`C | シンディパウ | `a.null-burn`1, `a.burn`1 |
| 112 | 1 | 3 | 1-2 | 3 | Normal | `Insect_Swarm` | class.alchemist | `i.catalyst`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 鳳蝶 |
| 113 | 1 | 3 | 1-2 | 3 | Normal | `Insect_Swarm` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | レディバグ |
| 114 | 1 | 3 | 1-2 | 3 | Normal | `Insect_Swarm` | class.sword-saint | `i.gauntlet`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 花鎌娘 | `a.bind`1 |
| 115 | 1 | 3 | 3 | 4 | Normal | `Beast` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ふわっと |
| 116 | 1 | 3 | 3 | 4 | Normal | `Beast` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ひのこ | `a.null-burn`1 |
| 117 | 1 | 3 | 4 | 6 | Elite | `Insect_Swarm` | class.ranger.striker | `i.arrow`EC, `i.archery`EC, `i.bolt`EC, `i.arrow`C, `i.bolt`C, `i.archery`C | ビーズ |
| 118 | 1 | 4 | 1-2 | 4 | Normal | `Aerial` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | メロウル |
| 119 | 1 | 4 | 1-2 | 4 | Normal | `Aerial` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | ぱんころう |
| 120 | 1 | 4 | 1-2 | 4 | Normal | `Aerial` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | かわせみ |
| 121 | 1 | 4 | 3 | 7 | Elite | `Caninian` | class.duelist.lord | `i.shield`BD, `i.robe`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | サクラ | `a.execution`1 |
| 122 | 1 | 4 | 3 | 7 | Elite | `Caninian` | class.lord.striker | `i.katana`BD, `i.gauntlet`BD, `i.armor`C, `i.robe`C, `i.shield`C | エメラ | `a.deflection`1 |
| 123 | 1 | 4 | 4 | 7 | Elite | `Aerial` | class.sage.lord | `i.grimoire`EB, `i.catalyst`EB, `i.shield`EB, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ファルコ | `a.wind-rider`1 |
| 124 | 1 | 5 | 1-2 | 5 | Normal | `Insect_Swarm` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ハルビー |
| 125 | 1 | 5 | 1-2 | 5 | Normal | `Insect_Swarm` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ドラコフライ |
| 126 | 1 | 5 | 1-2 | 5 | Normal | `Insect_Swarm` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ホタル |
| 127 | 1 | 5 | 3 | 6 | Normal | `Aerial` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | コーム |
| 128 | 1 | 5 | 3 | 6 | Normal | `Aerial` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | セキレ |
| 129 | 1 | 5 | 4 | 8 | Elite | `Aerial` | class.alchemist.wizard | `i.catalyst`EB, `i.wand`EB, `i.robe`EB, `i.wand`C, `i.grimoire`C, `i.catalyst`C | トリコ | `a.null-death-touch`1, `a.re-attack`1 |
| 130 | 1 | 6 | 1-2 | 6 | Normal | `Beast` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | みずうさぎ |
| 131 | 1 | 6 | 1-2 | 6 | Normal | `Beast` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | もすらむ |
| 132 | 1 | 6 | 1-2 | 6 | Normal | `Beast` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | あなこ |
| 133 | 1 | 6 | 3 | 7 | Normal | `Aerial` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ペネトレーター |
| 134 | 1 | 6 | 3 | 7 | Normal | `Aerial` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ヨキジ |
| 135 | 1 | 6 | 4 | 11 | BOSS | `Caninian` | class.guardian | `i.armor`BD, `i.gauntlet`BD, `i.shield`BD, `i.armor`C, `i.robe`C, `i.shield`C | ヴェルグ  | `a.ice-absorb`1, `a.true-sight`1 |
| 136 | 2 | 1 | 1 | 1-2 | 7 | Normal | `Frost` | class.ranger | `i.arrow`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 霜ふくろう |
| 137 | 2 | 1 | 1-2 | 7 | Normal | `Frost` | class.striker | `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 凍鹿 |
| 138 | 2 | 1 | 1-2 | 7 | Normal | `Frost` | class.wizard | `i.wand`U, `i.robe`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 氷精 |
| 139 | 2 | 1 | 3 | 8 | Normal | `Frost` | class.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`C, `i.robe`C, `i.shield`C | 晶殻 |
| 140 | 2 | 1 | 3 | 8 | Normal | `Frost` | class.lord | `i.shield`U, `i.katana`U, `i.armor`C, `i.robe`C, `i.shield`C | 雪溶 |
| 141 | 2 | 1 | 4 | 10 | Elite | `Frost` | class.lord.ranger | `i.shield`EA, `i.katana`EA, `i.arrow`EA, `i.armor`C, `i.robe`C, `i.shield`C | 氷獣 | `a.ice-protect-breaker`1 |
| 142 | 2 | 2 | 1-2 | 8 | Normal | `Frost` | class.ninja | `i.archery`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 咆哮岩 | `a.howl`3 |
| 143 | 2 | 2 | 1-2 | 8 | Normal | `Frost` | class.sage | `i.grimoire`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | セツメ |
| 144 | 2 | 2 | 1-2 | 8 | Normal | `Frost` | class.samurai | `i.katana`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | オクトグレイサー | `a.predator-sense`1 |
| 145 | 2 | 2 | 3 | 9 | Normal | `Golem` | class.duelist | `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ドレープ |
| 146 | 2 | 2 | 3 | 9 | Normal | `Golem` | class.pilgrim | `i.robe`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | アルカパ |
| 147 | 2 | 2 | 4 | 11 | Elite | `Frost` | class.samurai.guardian | `i.katana`EA, `i.shield`EA, `i.armor`EA, `i.sword`C, `i.katana`C, `i.gauntlet`C | アイシクル | `c.physical-defense-multiplier_x0.5` |
| 148 | 2 | 3 | 1-2 | 9 | Normal | `Plant_Fungal` | class.alchemist | `i.catalyst`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | スポレラ |
| 149 | 2 | 3 | 1-2 | 9 | Normal | `Plant_Fungal` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | カプレット |
| 150 | 2 | 3 | 1-2 | 9 | Normal | `Plant_Fungal` | class.sword-saint | `i.gauntlet`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ルメモス |
| 151 | 2 | 3 | 3 | 10 | Normal | `Frost` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 霜刃豹 |
| 152 | 2 | 3 | 3 | 10 | Normal | `Frost` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | スノウフラッフィ |
| 153 | 2 | 3 | 4 | 12 | Elite | `Plant_Fungal` | class.striker.pilgrim | `i.bolt`EC, `i.arrow`EC, `i.robe`EC, `i.arrow`C, `i.bolt`C, `i.archery`C | アマニバン | `a.boost`2 |
| 154 | 2 | 4 | 1-2 | 10 | Normal | `Golem` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | ウールワード |
| 155 | 2 | 4 | 1-2 | 10 | Normal | `Golem` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | パッチパウ |
| 156 | 2 | 4 | 1-2 | 10 | Normal | `Golem` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | メールホップ |
| 157 | 2 | 4 | 3 | 11 | Normal | `Plant_Fungal` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | パールスポア |
| 158 | 2 | 4 | 3 | 11 | Normal | `Plant_Fungal` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | ウールミ |
| 159 | 2 | 4 | 4 | 13 | Elite | `Golem` | class.sword-saint.alchemist | `i.gauntlet`EB, `i.sword`EB, `i.catalyst`EB, `i.sword`C, `i.katana`C, `i.gauntlet`C | スティッチリング | `a.ranged-reflect`1 |
| 160 | 2 | 5 | 1-2 | 11 | Normal | `Plant_Fungal` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | パフキャップ |
| 161 | 2 | 5 | 1-2 | 11 | Normal | `Plant_Fungal` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | タリア |
| 162 | 2 | 5 | 1-2 | 11 | Normal | `Plant_Fungal` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | インクキャップ |
| 163 | 2 | 5 | 3 | 14 | Elite | `Lupinian` | class.ninja.sword-saint | `i.bolt`BD, `i.archery`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | ポルセラ |`c.physical-defense-multiplier_x0.4`|
| 164 | 2 | 5 | 3 | 14 | Elite | `Lupinian` | class.wizard.guardian | `i.wand`BD, `i.catalyst`BD, `i.robe`BD, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ポルセル | `c.physical-defense-multiplier_x0.6`, `a.covering-fire`1 |
| 165 | 2 | 5 | 4 | 14 | Elite | `Golem` | class.wizard.sage | `i.wand`EB, `i.robe`EB, `i.grimoire`EB, `i.wand`C, `i.grimoire`C, `i.catalyst`C | カップマウス | `a.slow`1  |
| 166 | 2 | 6 | 1-2 | 12 | Normal | `Frost` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | クリステイル |
| 167 | 2 | 6 | 1-2 | 12 | Normal | `Frost` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | フロストグレイブウィング |
| 168 | 2 | 6 | 1-2 | 12 | Normal | `Frost` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 氷角 |
| 169 | 2 | 6 | 3 | 13 | Normal | `Golem` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | リボンバン |
| 170 | 2 | 6 | 3 | 13 | Normal | `Golem` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | パックベア |
| 171 | 2 | 6 | 4 | 17 | BOSS | `Lupinian` | class.striker.sword-saint | `i.bolt`BD, `i.arrow`BD, `i.archery`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | ロザリア | `a.deflection`2, `a.life-drain`6, `a.null-life-drain`1 |
| 172 | 3 | 1 | 1-2 | 14 | Normal | `Fruit` | class.ranger.ranger | `i.arrow`U, `i.archery`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | あぷりん | 
| 173 | 3 | 1 | 1-2 | 14 | Normal | `Fruit` | class.striker.striker | `i.bolt`U, `i.arrow`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ぐぁびー |
| 174 | 3 | 1 | 1-2 | 14 | Normal | `Fruit` | class.wizard.wizard | `i.wand`U, `i.robe`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | みむる |
| 175 | 3 | 1 | 3 | 15 | Normal | `Fruit` | class.guardian.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`U, `i.armor`C, `i.robe`C, `i.shield`C | ぷるみ |
| 176 | 3 | 1 | 3 | 15 | Normal | `Fruit` | class.lord.lord | `i.shield`U, `i.katana`U, `i.shield`U, `i.armor`C, `i.robe`C, `i.shield`C | まんぐー |
| 177 | 3 | 1 | 4 | 17 | Elite | `Fruit` | class.pilgrim.wizard | `i.robe`EA, `i.grimoire`EA, `i.wand`EA, `i.armor`C, `i.robe`C, `i.shield`C | ぱや | `a.null-shock`1 |
| 178 | 3 | 2 | 1-2 | 15 | Normal | `Fruit` | class.ninja.ninja | `i.archery`U, `i.bolt`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ぴな |
| 179 | 3 | 2 | 1-2 | 15 | Normal | `Fruit` | class.sage.sage | `i.grimoire`U, `i.catalyst`U, `i.grimoire`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ちぇり |
| 180 | 3 | 2 | 1-2 | 15 | Normal | `Fruit` | class.samurai.samurai | `i.katana`U, `i.shield`U, `i.katana`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ぱらーしゃ |
| 181 | 3 | 2 | 3 | 16 | Normal | `Slime_Colony` | class.duelist.duelist | `i.sword`U, `i.armor`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | らびめる |
| 182 | 3 | 2 | 3 | 16 | Normal | `Slime_Colony` | class.pilgrim.pilgrim | `i.robe`U, `i.grimoire`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | べとりーば |
| 183 | 3 | 2 | 4 | 18 | Elite | `Fruit` | class.lord.samurai | `i.shield`EA, `i.katana`EA, `i.katana`EA, `i.armor`C, `i.robe`C, `i.shield`C | りっぴー | `a.unforgettable`1 |
| 184 | 3 | 3 | 1-2 | 16 | Normal | `Spirit` | class.alchemist.alchemist | `i.catalyst`U, `i.wand`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | レイミ |
| 185 | 3 | 3 | 1-2 | 16 | Normal | `Orcinian` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | クリセレ |
| 186 | 3 | 3 | 1-2 | 16 | Normal | `Spirit` | class.sword-saint.sword-saint | `i.gauntlet`U, `i.sword`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | シロハ |
| 187 | 3 | 3 | 3 | 17 | Normal | `Fruit` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ぴたっぴ |
| 188 | 3 | 3 | 3 | 17 | Normal | `Fruit` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | からっぴ |
| 189 | 3 | 3 | 4 | 19 | Elite | `Orcinian` | class.wizard.ninja | `i.wand`EC, `i.robe`EC, `i.archery`EC, `i.wand`C, `i.grimoire`C, `i.catalyst`C | レディ・ネリッサ | `a.re-attack`1 |
| 190 | 3 | 4 | 1-2 | 17 | Normal | `Slime_Colony` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | スミ |
| 191 | 3 | 4 | 1-2 | 17 | Normal | `Slime_Colony` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | ルミネ |
| 192 | 3 | 4 | 1-2 | 17 | Normal | `Slime_Colony` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ヴァルディ |
| 193 | 3 | 4 | 3 | 18 | Normal | `Orcinian` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | アリア |
| 194 | 3 | 4 | 3 | 18 | Normal | `Orcinian` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | セレン |
| 195 | 3 | 4 | 4 | 20 | Elite | `Slime_Colony` | class.ninja.guardian | `i.archery`EB, `i.bolt`EB, `i.armor`EB, `i.arrow`C, `i.bolt`C, `i.archery`C | サルナ | `a.resurrect`1 |
| 196 | 3 | 5 | 1-2 | 18 | Normal | `Spirit` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | ミズキ |
| 197 | 3 | 5 | 1-2 | 18 | Normal | `Orcinian` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 鉄錨のマリナ |
| 198 | 3 | 5 | 1-2 | 18 | Normal | `Orcinian` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ニメラ |
| 199 | 3 | 5 | 3 | 21 | Elite | `Vulpinian` | class.sword-saint.guardian | `i.sword`BD, `i.shield`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | 狐牙の護剣士 |
| 200 | 3 | 5 | 3 | 21 | Elite | `Vulpinian` | class.wizard.ninja | `i.catalyst`BD, `i.bolt`BD, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 狐尾の魔術師 |
| 201 | 3 | 5 | 4 | 21 | Elite | `Slime_Colony` | class.striker.sword-saint | `i.bolt`EB, `i.arrow`EB, `i.gauntlet`EB, `i.arrow`C, `i.bolt`C, `i.archery`C | ネリア | `a.overwatch`1 |
| 202 | 3 | 6 | 1-2 | 19 | Normal | `Fruit` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | なぴ |
| 203 | 3 | 6 | 1-2 | 19 | Normal | `Fruit` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | みき |
| 204 | 3 | 6 | 1-2 | 19 | Normal | `Fruit` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | たまる |
| 205 | 3 | 6 | 3 | 20 | Normal | `Slime_Colony` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | イリア |
| 206 | 3 | 6 | 3 | 20 | Normal | `Slime_Colony` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | ヴェスペラ |
| 207 | 3 | 6 | 4 | 24 | BOSS | `Vulpinian` | class.wizard.sage | `i.wand`BD, `i.robe`BD, `i.grimoire`BD, `i.wand`C, `i.grimoire`C, `i.catalyst`C | アズラーイール | `a.melee-confusion`1 | 
| 208 | 4 | 1 | 1-2 | 21 | Normal | `Shadowfang` | class.ranger.ranger | `i.arrow`U, `i.archery`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 砂夜の牙影 |
| 209 | 4 | 1 | 1-2 | 21 | Normal | `Shadowfang` | class.striker.striker | `i.bolt`U, `i.arrow`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 月砂の迅牙 |
| 210 | 4 | 1 | 1-2 | 21 | Normal | `Shadowfang` | class.wizard.wizard | `i.wand`U, `i.robe`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 砂丘の妖士 |
| 211 | 4 | 1 | 3 | 22 | Normal | `Shadowfang` | class.guardian.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`U, `i.armor`C, `i.robe`C, `i.shield`C | 乾砂の裂爪 |
| 212 | 4 | 1 | 3 | 22 | Normal | `Shadowfang` | class.lord.lord | `i.shield`U, `i.katana`U, `i.shield`U, `i.armor`C, `i.robe`C, `i.shield`C | 影群の頭目 |
| 213 | 4 | 1 | 4 | 24 | Elite | `Shadowfang` | class.pilgrim.guardian | `i.robe`EA, `i.grimoire`EA, `i.armor`EA, `i.armor`C, `i.robe`C, `i.shield`C | 夜襲の祈影 |
| 214 | 4 | 2 | 1-2 | 22 | Normal | `Shadowfang` | class.ninja.ninja | `i.archery`U, `i.bolt`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 砂潜り |
| 215 | 4 | 2 | 1-2 | 22 | Normal | `Shadowfang` | class.sage.sage | `i.grimoire`U, `i.catalyst`U, `i.grimoire`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 月詠の黒牙 |
| 216 | 4 | 2 | 1-2 | 22 | Normal | `Shadowfang` | class.samurai.samurai | `i.katana`U, `i.shield`U, `i.katana`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 砂識の武牙 |
| 217 | 4 | 2 | 3 | 23 | Normal | `Felidian` | class.duelist.duelist | `i.sword`U, `i.armor`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 砂猫の剣士 |
| 218 | 4 | 2 | 3 | 23 | Normal | `Felidian` | class.pilgrim.pilgrim | `i.robe`U, `i.grimoire`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 巡砂の猫民 |
| 219 | 4 | 2 | 4 | 25 | Elite | `Shadowfang` | class.samurai.striker | `i.katana`EA, `i.shield`EA, `i.bolt`EA, `i.sword`C, `i.katana`C, `i.gauntlet`C | 黒牙の侍 |
| 220 | 4 | 3 | 1-2 | 23 | Normal | `Titan` | class.alchemist.alchemist | `i.catalyst`U, `i.wand`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 巨術士 |
| 221 | 4 | 3 | 1-2 | 23 | Normal | `Titan` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 砂碑の護兵 |
| 222 | 4 | 3 | 1-2 | 23 | Normal | `Titan` | class.sword-saint.sword-saint | `i.gauntlet`U, `i.sword`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 乾岩の破砕兵 |
| 223 | 4 | 3 | 3 | 24 | Normal | `Shadowfang` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 影牙の刃兵 |
| 224 | 4 | 3 | 3 | 24 | Normal | `Shadowfang` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 砂塵の妖牙 |
| 225 | 4 | 3 | 4 | 26 | Elite | `Titan` | class.lord.wizard | `i.shield`EC, `i.katana`EC, `i.wand`EC, `i.armor`C, `i.robe`C, `i.shield`C | 巨躯の破城兵 |
| 226 | 4 | 4 | 1-2 | 24 | Normal | `Felidian` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | 砂猫のあらくれもの |
| 227 | 4 | 4 | 1-2 | 24 | Normal | `Felidian` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | あらくれ兄貴猫 |
| 228 | 4 | 4 | 1-2 | 24 | Normal | `Felidian` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 夜砂のぐれ猫 |
| 229 | 4 | 4 | 3 | 27 | Elite | `Felidian` | class.ninja.duelist | `i.robe`BD, `i.sword`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | 黄昏の野盗猫 |
| 230 | 4 | 4 | 3 | 27 | Elite | `Felidian` | class.striker.sage | `i.grimoire`BD, `i.arrow`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | 砂嵐の強盗猫 |
| 231 | 4 | 4 | 4 | 27 | Elite | `Felidian` | class.ninja.duelist | `i.archery`EB, `i.bolt`EB, `i.sword`EB, `i.arrow`C, `i.bolt`C, `i.archery`C | 忍猫ネロ |
| 232 | 4 | 5 | 1-2 | 25 | Normal | `Titan` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 砂岩の忍巨 |
| 233 | 4 | 5 | 1-2 | 25 | Normal | `Titan` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 断崖の刃巨 |
| 234 | 4 | 5 | 1-2 | 25 | Normal | `Titan` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 岩窟の古老巨 |
| 235 | 4 | 5 | 3 | 26 | Normal | `Felidian` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 猫刃の決闘士 |
| 236 | 4 | 5 | 3 | 26 | Normal | `Felidian` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 流砂の術忍猫 |
| 237 | 4 | 5 | 4 | 28 | Elite | `Felidian` | class.sage.alchemist | `i.grimoire`EB, `i.catalyst`EB, `i.catalyst`EB, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 秘儀の砂猫 |
| 238 | 4 | 6 | 1-2 | 26 | Normal | `Shadowfang` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 豊穣の門番 |
| 239 | 4 | 6 | 1-2 | 26 | Normal | `Shadowfang` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | 豊穣の祈祷師 |
| 240 | 4 | 6 | 1-2 | 26 | Normal | `Shadowfang` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 豊穣の護衛 |
| 241 | 4 | 6 | 3 | 27 | Normal | `Felidian` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 豊穣の親衛射手 |
| 242 | 4 | 6 | 3 | 27 | Normal | `Felidian` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 豊穣の親衛隊 |
| 243 | 4 | 6 | 4 | 31 | BOSS | `Felidian` | class.striker.ranger | `i.bolt`BD, `i.arrow`BD, `i.arrow`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | シルウェストリス | `c.fire-defense-multiplier_x4/5` |
| 244 | 5 | 1 | 1-2 | 28 | Normal | `Beast` | class.ranger.ranger | `i.arrow`U, `i.archery`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 火灰の狩獣 |
| 245 | 5 | 1 | 1-2 | 28 | Normal | `Beast` | class.striker.striker | `i.bolt`U, `i.arrow`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 熱霧の迅獣 |
| 246 | 5 | 1 | 1-2 | 28 | Normal | `Beast` | class.wizard.wizard | `i.wand`U, `i.robe`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 火口原の呪獣 |
| 247 | 5 | 1 | 3 | 29 | Normal | `Beast` | class.guardian.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`U, `i.armor`C, `i.robe`C, `i.shield`C | 炎峰の爪獣 |
| 248 | 5 | 1 | 3 | 29 | Normal | `Beast` | class.lord.lord | `i.shield`U, `i.katana`U, `i.shield`U, `i.armor`C, `i.robe`C, `i.shield`C | 灰毛の群核 |
| 249 | 5 | 1 | 4 | 31 | Elite | `Beast` | class.ninja.sword-saint | `i.archery`EA, `i.bolt`EA, `i.gauntlet`EA, `i.arrow`C, `i.bolt`C, `i.archery`C | 炎嶺の忍刃頭 |
| 250 | 5 | 2 | 1-2 | 29 | Normal | `Beast` | class.ninja.ninja | `i.archery`U, `i.bolt`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 灰走りの獣影 |
| 251 | 5 | 2 | 1-2 | 29 | Normal | `Beast` | class.sage.sage | `i.grimoire`U, `i.catalyst`U, `i.grimoire`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 焔智の獣兵 |
| 252 | 5 | 2 | 1-2 | 29 | Normal | `Beast` | class.samurai.samurai | `i.katana`U, `i.shield`U, `i.katana`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 焼土の古獣 |
| 253 | 5 | 2 | 3 | 30 | Normal | `Dragon` | class.duelist.duelist | `i.sword`U, `i.armor`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 溶鱗の竜 |
| 254 | 5 | 2 | 3 | 30 | Normal | `Dragon` | class.pilgrim.pilgrim | `i.robe`U, `i.grimoire`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 火道の竜 |
| 255 | 5 | 2 | 4 | 32 | Elite | `Beast` | class.pilgrim.alchemist | `i.robe`EA, `i.grimoire`EA, `i.catalyst`EA, `i.armor`C, `i.robe`C, `i.shield`C | 焔狩の導き手 |
| 256 | 5 | 3 | 1-2 | 30 | Normal | `Ursan` | class.alchemist.alchemist | `i.catalyst`U, `i.wand`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 炎砦の熊錬師 |
| 257 | 5 | 3 | 1-2 | 30 | Normal | `Ursan` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 火護りの熊守衛 |
| 258 | 5 | 3 | 1-2 | 30 | Normal | `Ursan` | class.sword-saint.sword-saint | `i.gauntlet`U, `i.sword`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 灼鋼の熊戦士 |
| 259 | 5 | 3 | 3 | 33 | Elite | `Ursan` | class.samurai.duelist | `i.gauntlet`BD, `i.armor`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | 焔営の武熊 |
| 260 | 5 | 3 | 3 | 33 | Elite | `Ursan` | class.wizard.alchemist | `i.wand`BD, `i.catalyst`BD, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 焔営の術熊 |
| 261 | 5 | 3 | 4 | 33 | Elite | `Ursan` | class.guardian.sage | `i.armor`EC, `i.gauntlet`EC, `i.grimoire`EC, `i.armor`C, `i.robe`C, `i.shield`C | 監視熊ボルク |
| 262 | 5 | 4 | 1-2 | 31 | Normal | `Dragon` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | 火嶺の守り竜 |
| 263 | 5 | 4 | 1-2 | 31 | Normal | `Dragon` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 焔脈の竜隊長 |
| 264 | 5 | 4 | 1-2 | 31 | Normal | `Dragon` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 火尾の賢竜 |
| 265 | 5 | 4 | 3 | 32 | Normal | `Ursan` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 炎稜の熊兵 |
| 266 | 5 | 4 | 3 | 32 | Normal | `Ursan` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 灰牙の熊長 |
| 267 | 5 | 4 | 4 | 34 | Elite | `Dragon` | class.lord.duelist | `i.shield`EB, `i.katana`EB, `i.sword`EB, `i.armor`C, `i.robe`C, `i.shield`C | 竜嶺の炎守 |
| 268 | 5 | 5 | 1-2 | 32 | Normal | `Ursan` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 火口影の熊忍 |
| 269 | 5 | 5 | 1-2 | 32 | Normal | `Ursan` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 熔刃の熊侍 |
| 270 | 5 | 5 | 1-2 | 32 | Normal | `Ursan` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 火山文の熊賢 |
| 271 | 5 | 5 | 3 | 33 | Normal | `Dragon` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 火口の決闘竜 |
| 272 | 5 | 5 | 3 | 33 | Normal | `Dragon` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 熱道の巡礼竜 |
| 273 | 5 | 5 | 4 | 35 | Elite | `Dragon` | class.alchemist.wizard | `i.catalyst`EB, `i.wand`EB, `i.wand`EB, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 火口の導術竜 |
| 274 | 5 | 6 | 1-2 | 33 | Normal | `Beast` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 炎砦の闘撃獣 |
| 275 | 5 | 6 | 1-2 | 33 | Normal | `Beast` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | 砦影の術獣 |
| 276 | 5 | 6 | 1-2 | 33 | Normal | `Beast` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 砦前の戦獣 |
| 277 | 5 | 6 | 3 | 34 | Normal | `Dragon` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 城嶺の狙尾竜 |
| 278 | 5 | 6 | 3 | 34 | Normal | `Dragon` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 城嶺の刃竜 |
| 279 | 5 | 6 | 4 | 38 | BOSS | `Ursan` | class.samurai.duelist | `i.katana`BD, `i.shield`BD, `i.sword`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | 炎嶺王グラズル | `a.fire-reflect`1 |
| 280 | 6 | 1 | 1-2 | 35 | Normal | `Mech` | class.ranger.ranger | `i.arrow`U, `i.archery`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 遺構斥候ユニット |
| 281 | 6 | 1 | 1-2 | 35 | Normal | `Mech` | class.striker.striker | `i.bolt`U, `i.arrow`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 遺構演算コア機 |
| 282 | 6 | 1 | 1-2 | 35 | Normal | `Mech` | class.wizard.wizard | `i.wand`U, `i.robe`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 遺構術式ドローン |
| 283 | 6 | 1 | 3 | 36 | Normal | `Mech` | class.guardian.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`U, `i.armor`C, `i.robe`C, `i.shield`C | オートマタ |
| 284 | 6 | 1 | 3 | 36 | Normal | `Mech` | class.lord.lord | `i.shield`U, `i.katana`U, `i.shield`U, `i.armor`C, `i.robe`C, `i.shield`C | 遺構制御機 |
| 285 | 6 | 1 | 4 | 38 | Elite | `Mech` | class.guardian.ninja | `i.armor`EA, `i.gauntlet`EA, `i.archery`EA, `i.armor`C, `i.robe`C, `i.shield`C | オートマタVer2.1 |
| 286 | 6 | 2 | 1-2 | 36 | Normal | `Mech` | class.ninja.ninja | `i.archery`U, `i.bolt`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 潜伏偵察オートマタ |
| 287 | 6 | 2 | 1-2 | 36 | Normal | `Mech` | class.sage.sage | `i.grimoire`U, `i.catalyst`U, `i.grimoire`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 遺構演算フレーム |
| 288 | 6 | 2 | 1-2 | 36 | Normal | `Mech` | class.samurai.samurai | `i.katana`U, `i.shield`U, `i.katana`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 遺構斬撃解析機 |
| 289 | 6 | 2 | 3 | 37 | Normal | `Golem` | class.duelist.duelist | `i.sword`U, `i.armor`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 鉱核デュエラ |
| 290 | 6 | 2 | 3 | 37 | Normal | `Golem` | class.pilgrim.pilgrim | `i.robe`U, `i.grimoire`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 岩核アーカイブ像 |
| 291 | 6 | 2 | 4 | 39 | Elite | `Mech` | class.ranger.striker | `i.arrow`EA, `i.archery`EA, `i.bolt`EA, `i.arrow`C, `i.bolt`C, `i.archery`C | 試作暗殺ユニット |
| 292 | 6 | 3 | 1-2 | 37 | Normal | `Chimera` | class.alchemist.alchemist | `i.catalyst`U, `i.wand`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | キメラ試作体α |
| 293 | 6 | 3 | 1-2 | 37 | Normal | `Chimera` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | キメラ試作体β |
| 294 | 6 | 3 | 1-2 | 37 | Normal | `Chimera` | class.sword-saint.sword-saint | `i.gauntlet`U, `i.sword`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | キメラ試作体γ |
| 295 | 6 | 3 | 3 | 38 | Normal | `Mech` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 遺構斬撃兵装 |
| 296 | 6 | 3 | 3 | 38 | Normal | `Mech` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 遺構術式兵装 |
| 297 | 6 | 3 | 4 | 40 | Elite | `Chimera` | class.alchemist.wizard | `i.catalyst`EC, `i.wand`EC, `i.wand`EC, `i.wand`C, `i.grimoire`C, `i.catalyst`C | ナイトメア |
| 298 | 6 | 4 | 1-2 | 38 | Normal | `Golem` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | 岩殻術衛像 |
| 299 | 6 | 4 | 1-2 | 38 | Normal | `Golem` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 鉱晶旗手像 |
| 300 | 6 | 4 | 1-2 | 38 | Normal | `Golem` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 岩壁賢刃像 |
| 301 | 6 | 4 | 3 | 39 | Normal | `Chimera` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | キメラ試作体δ |
| 302 | 6 | 4 | 3 | 39 | Normal | `Chimera` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | キメラ試作体ε |
| 303 | 6 | 4 | 4 | 41 | Elite | `Golem` | class.samurai.duelist | `i.katana`EB, `i.shield`EB, `i.sword`EB, `i.sword`C, `i.katana`C, `i.gauntlet`C | 断刃決闘像 |
| 304 | 6 | 5 | 1-2 | 39 | Normal | `Chimera` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | キメラ潜伏個体 |
| 305 | 6 | 5 | 1-2 | 39 | Normal | `Chimera` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | キメラ斬撃個体 |
| 306 | 6 | 5 | 1-2 | 39 | Normal | `Chimera` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | キメラ術式個体 |
| 307 | 6 | 5 | 3 | 40 | Normal | `Golem` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 鉱刃デュエラ像 |
| 308 | 6 | 5 | 3 | 40 | Normal | `Golem` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 鉱核祭像 |
| 309 | 6 | 5 | 4 | 42 | Elite | `Golem` | class.ninja.sage | `i.archery`EB, `i.bolt`EB, `i.grimoire`EB, `i.arrow`C, `i.bolt`C, `i.archery`C | 無主橋潜行ユニット |
| 310 | 6 | 6 | 1-2 | 40 | Normal | `Mech` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 共鳴祭壇闘撃機 |
| 311 | 6 | 6 | 1-2 | 40 | Normal | `Mech` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | 共鳴術式コア機 |
| 312 | 6 | 6 | 1-2 | 40 | Normal | `Mech` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 共鳴前衛オートマタ |
| 313 | 6 | 6 | 3 | 43 | Elite | `Procyonian` | class.ranger.duelist | `i.arrow`BD, `i.archery`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | プロキオニアン迅射兵 |
| 314 | 6 | 6 | 3 | 43 | Elite | `Procyonian` | class.samurai.ranger | `i.shield`BD, `i.katana`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | プロキオニアン護刃兵 |
| 315 | 6 | 6 | 4 | 45 | BOSS | `Procyonian` | class.sage.lord | `i.grimoire`BD, `i.catalyst`BD, `i.shield`BD, `i.wand`C, `i.grimoire`C, `i.catalyst`C | セレスティアルリーパー | `a.soul-reap`3 |
| 316 | 7 | 1 | 1-2 | 42 | Normal | `Titan` | class.ranger.ranger | `i.arrow`U, `i.archery`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 月輪の巨斥候 |
| 317 | 7 | 1 | 1-2 | 42 | Normal | `Titan` | class.striker.striker | `i.bolt`U, `i.arrow`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 光輪の巨斥候 |
| 318 | 7 | 1 | 1-2 | 42 | Normal | `Titan` | class.wizard.wizard | `i.wand`U, `i.robe`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 星屑の巨導師 |
| 319 | 7 | 1 | 3 | 43 | Normal | `Titan` | class.guardian.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`U, `i.armor`C, `i.robe`C, `i.shield`C | 月砕きの巨兵 |
| 320 | 7 | 1 | 3 | 43 | Normal | `Titan` | class.lord.lord | `i.shield`U, `i.katana`U, `i.shield`U, `i.armor`C, `i.robe`C, `i.shield`C | 光冠の巨長 |
| 321 | 7 | 1 | 4 | 45 | Elite | `Titan` | class.lord.striker | `i.shield`EA, `i.katana`EA, `i.bolt`EA, `i.armor`C, `i.robe`C, `i.shield`C | 天蓋の巨王兵 |
| 322 | 7 | 2 | 1-2 | 43 | Normal | `Titan` | class.ninja.ninja | `i.archery`U, `i.bolt`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 影月の巨忍 |
| 323 | 7 | 2 | 1-2 | 43 | Normal | `Titan` | class.sage.sage | `i.grimoire`U, `i.catalyst`U, `i.grimoire`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 月詠みの巨賢 |
| 324 | 7 | 2 | 1-2 | 43 | Normal | `Titan` | class.samurai.samurai | `i.katana`U, `i.shield`U, `i.katana`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 星詠みの巨侍 |
| 325 | 7 | 2 | 3 | 46 | Elite | `Leporian` | class.duelist.pilgrim | `i.armor`BD, `i.gauntlet`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | 白兎巡礼士 |
| 326 | 7 | 2 | 3 | 46 | Elite | `Leporian` | class.wizard.striker | `i.archery`BD, `i.grimoire`BD, `i.arrow`BD, `i.wand`C, `i.grimoire`C | 白兎術師 |
| 327 | 7 | 2 | 4 | 46 | Elite | `Titan` | class.wizard.sage | `i.wand`EA, `i.robe`EA, `i.grimoire`EA, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 天文の巨導賢 |
| 328 | 7 | 3 | 1-2 | 44 | Normal | `Aerial` | class.alchemist.alchemist | `i.catalyst`U, `i.wand`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 光翼の錬空将 |
| 329 | 7 | 3 | 1-2 | 44 | Normal | `Aerial` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 光翼の戦空兵 |
| 330 | 7 | 3 | 1-2 | 44 | Normal | `Aerial` | class.sword-saint.sword-saint | `i.gauntlet`U, `i.sword`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 蒼空の翼兵 |
| 331 | 7 | 3 | 3 | 45 | Normal | `Titan` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 月刀の巨侍兵 |
| 332 | 7 | 3 | 3 | 45 | Normal | `Titan` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 星術の巨導兵 |
| 333 | 7 | 3 | 4 | 47 | Elite | `Aerial` | class.pilgrim.sword-saint | `i.robe`EC, `i.grimoire`EC, `i.gauntlet`EC, `i.armor`C, `i.robe`C, `i.shield`C | 聖風の翼巡礼士 |
| 334 | 7 | 4 | 1-2 | 45 | Normal | `Undead` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | 影墓の亡者 |
| 335 | 7 | 4 | 1-2 | 45 | Normal | `Undead` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 闇刃の亡者 |
| 336 | 7 | 4 | 1-2 | 45 | Normal | `Undead` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 宵闇の亡者 |
| 337 | 7 | 4 | 3 | 46 | Normal | `Aerial` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 闇翔の翼兵 |
| 338 | 7 | 4 | 3 | 46 | Normal | `Aerial` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 闇天の翼将 |
| 339 | 7 | 4 | 4 | 48 | Elite | `Undead` | class.ranger.samurai | `i.arrow`EB, `i.archery`EB, `i.katana`EB, `i.arrow`C, `i.bolt`C, `i.archery`C | 冥月の亡者アドリアン |
| 340 | 7 | 5 | 1-2 | 46 | Normal | `Aerial` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 深淵の翼忍 |
| 341 | 7 | 5 | 1-2 | 46 | Normal | `Aerial` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 深淵の翼侍 |
| 342 | 7 | 5 | 1-2 | 46 | Normal | `Aerial` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 深淵の翼賢 |
| 343 | 7 | 5 | 3 | 47 | Normal | `Undead` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 墓園の亡護剣士 |
| 344 | 7 | 5 | 3 | 47 | Normal | `Undead` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 墓園の亡術忍士 |
| 345 | 7 | 5 | 4 | 49 | Elite | `Undead` | class.duelist.alchemist | `i.sword`EB, `i.armor`EB, `i.catalyst`EB, `i.sword`C, `i.katana`C, `i.gauntlet`C | 冥府の剣士ヴァレン |
| 346 | 7 | 6 | 1-2 | 47 | Normal | `Titan` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 月宮の戦士長 |
| 347 | 7 | 6 | 1-2 | 47 | Normal | `Titan` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | 月宮の導師 |
| 348 | 7 | 6 | 1-2 | 47 | Normal | `Titan` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 月宮の親衛隊 |
| 349 | 7 | 6 | 3 | 48 | Normal | `Undead` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 月王の寵臣ナヴィル |
| 350 | 7 | 6 | 3 | 48 | Normal | `Undead` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 月王の寵臣カリス |
| 351 | 7 | 6 | 4 | 52 | BOSS | `Leporian` | class.lord.ninja | `i.shield`BD, `i.katana`BD, `i.archery`BD, `i.armor`C, `i.robe`C, `i.shield`C | 月王ラピエル | `a.melee-reflect`2 |
| 352 | 8 | 1 | 1-2 | 49 | Normal | `Voidspawn` | class.ranger.ranger | `i.arrow`U, `i.archery`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 谷門の斥候 |
| 353 | 8 | 1 | 1-2 | 49 | Normal | `Voidspawn` | class.striker.striker | `i.bolt`U, `i.arrow`U, `i.bolt`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 谷門の弩手 |
| 354 | 8 | 1 | 1-2 | 49 | Normal | `Voidspawn` | class.wizard.wizard | `i.wand`U, `i.robe`U, `i.wand`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 谷門の術師 |
| 355 | 8 | 1 | 3 | 50 | Normal | `Voidspawn` | class.guardian.guardian | `i.armor`U, `i.gauntlet`U, `i.armor`U, `i.armor`C, `i.robe`C, `i.shield`C | 虚痕の守衛 |
| 356 | 8 | 1 | 3 | 50 | Normal | `Voidspawn` | class.lord.lord | `i.shield`U, `i.katana`U, `i.shield`U, `i.armor`C, `i.robe`C, `i.shield`C | 虚痕の監視長 |
| 357 | 8 | 1 | 4 | 52 | Elite | `Voidspawn` | class.guardian.pilgrim | `i.armor`EA, `i.gauntlet`EA, `i.robe`EA, `i.armor`C, `i.robe`C, `i.shield`C | 虚爪の古衛兵 |
| 358 | 8 | 2 | 1-2 | 50 | Normal | `Voidspawn` | class.ninja.ninja | `i.archery`U, `i.bolt`U, `i.archery`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 虚骨域の影刃 |
| 359 | 8 | 2 | 1-2 | 50 | Normal | `Voidspawn` | class.sage.sage | `i.grimoire`U, `i.catalyst`U, `i.grimoire`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 虚骨域の賢刀兵 |
| 360 | 8 | 2 | 1-2 | 50 | Normal | `Voidspawn` | class.samurai.samurai | `i.katana`U, `i.shield`U, `i.katana`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 虚骨域の碑文侍 |
| 361 | 8 | 2 | 3 | 51 | Normal | `Ghost` | class.duelist.duelist | `i.sword`U, `i.armor`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 霊域の決闘霊 |
| 362 | 8 | 2 | 3 | 51 | Normal | `Ghost` | class.pilgrim.pilgrim | `i.robe`U, `i.grimoire`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 霊域の巡礼霊 |
| 363 | 8 | 2 | 4 | 53 | Elite | `Voidspawn` | class.sage.alchemist | `i.grimoire`EA, `i.catalyst`EA, `i.catalyst`EA, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 虚智の語部 |
| 364 | 8 | 3 | 1-2 | 51 | Normal | `Jinma` | class.alchemist.alchemist | `i.catalyst`U, `i.wand`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 錬金術鬼 
| 365 | 8 | 3 | 1-2 | 51 | Normal | `Jinma` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U, `i.armor`C, `i.robe`C, `i.shield`C | 祭術鬼 |
| 366 | 8 | 3 | 1-2 | 51 | Normal | `Jinma` | class.sword-saint.sword-saint | `i.gauntlet`U, `i.sword`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 戦祀鬼 |
| 367 | 8 | 3 | 3 | 52 | Normal | `Voidspawn` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 虚紋の決刀士 |
| 368 | 8 | 3 | 3 | 52 | Normal | `Voidspawn` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 虚紋の導術士 |
| 369 | 8 | 3 | 4 | 54 | Elite | `Jinma` | class.pilgrim.sword-saint | `i.robe`EC, `i.grimoire`EC, `i.gauntlet`EC, `i.armor`C, `i.robe`C, `i.shield`C | 古祀の巡礼鬼 |
| 370 | 8 | 4 | 1-2 | 52 | Normal | `Ghost` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U, `i.armor`C, `i.robe`C, `i.shield`C | 地獄門の潜術霊 |
| 371 | 8 | 4 | 1-2 | 52 | Normal | `Ghost` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 地獄門の戦霊将 |
| 372 | 8 | 4 | 1-2 | 52 | Normal | `Ghost` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 地獄門の賢霊 |
| 373 | 8 | 4 | 3 | 53 | Normal | `Jinma` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 剣術鬼 |
| 374 | 8 | 4 | 3 | 53 | Normal | `Jinma` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U, `i.armor`C, `i.robe`C, `i.shield`C | 鬼隊長 |
| 375 | 8 | 4 | 4 | 55 | Elite | `Ghost` | class.samurai.striker | `i.katana`EB, `i.shield`EB, `i.bolt`EB, `i.sword`C, `i.katana`C, `i.gauntlet`C | 幽冥の太刀霊 |
| 376 | 8 | 5 | 1-2 | 53 | Normal | `Jinma` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 書庫影の忍鬼 |
| 377 | 8 | 5 | 1-2 | 53 | Normal | `Jinma` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 書庫護刀の鬼 |
| 378 | 8 | 5 | 1-2 | 53 | Normal | `Jinma` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 書庫識の呪鬼 |
| 379 | 8 | 5 | 3 | 56 | Elite | `Cervin` | class.sword-saint.ninja | `i.catalyst`BD, `i.sword`BD, `i.sword`C, `i.katana`C, `i.gauntlet`C | 若鹿の秘儀剣忍 |
| 380 | 8 | 5 | 3 | 56 | Elite | `Cervin` | class.wizard.guardian | `i.arrow`BD, `i.robe`BD, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 若鹿の影護術士 |
| 381 | 8 | 5 | 4 | 56 | Elite | `Ghost` | class.wizard.samurai | `i.wand`EB, `i.robe`EB, `i.katana`EB, `i.wand`C, `i.grimoire`C, `i.catalyst`C | 司書長セドリック |
| 382 | 8 | 6 | 1-2 | 54 | Normal | `Voidspawn` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 聖域の守り人 |
| 383 | 8 | 6 | 1-2 | 54 | Normal | `Voidspawn` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U, `i.armor`C, `i.robe`C, `i.shield`C | 聖域の巡礼者 |
| 384 | 8 | 6 | 1-2 | 54 | Normal | `Voidspawn` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 聖域のつわもの |
| 385 | 8 | 6 | 3 | 55 | Normal | `Ghost` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U, `i.arrow`C, `i.bolt`C, `i.archery`C | 聖域の弓霊 |
| 386 | 8 | 6 | 3 | 55 | Normal | `Ghost` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U, `i.sword`C, `i.katana`C, `i.gauntlet`C | 聖域の太刀霊 |
| 387 | 8 | 6 | 4 | 59 | BOSS | `Cervin` | class.ninja.wizard | `i.archery`BD, `i.bolt`BD, `i.wand`BD, `i.arrow`C, `i.bolt`C, `i.archery`C | セルヴァ・レム | `a.shock`1, `a.magic-seal`1 |


- Gods prompt

| `x.exp_id` | `x.enemy_level` | Name | Title | Display Name | Class | Race Concept | Divine Philosophy | Visual Concept | Main Color | Sub Color | Accent Color | Sub Accent Color | Pose Direction |
|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 18 | Seiran | Goddess of Restoration | セイラン 再生の女神 | Pilgrim | Caninian, white Golden retriever | “Everything broken deserves another journey.” | Pilgrim healer deity with flowing prayer cloth and floating water vessels | Mist Blue | Warm Ivory | Pale Aqua | Sunlight Gold | Walking forward with one hand extended toward the wounded |
| 2 | 25 | Garv | God of Attrition | ガーヴ 消耗の神 | Samurai | Lupinian | “Victory belongs to the one who remains.” | Scarred wolf warlord with damaged armor and broken katana | Iron Black | Dark Ash Red | Bone White | Rust Gold | Exhausted forward-leaning stance refusing to kneel |
| 3 | 32 | Kyōen | God of Cunning | キョウエン 狡猾の神 | class.striker | Vulpinian, Fox, with cunning smile  | “Truth is merely the most successful deception.” | Elegant foxfire strategist with masks and layered robes | Vermillion | Cream White | Indigo | Foxfire Cyan | Sideways posture while staring directly at the viewer |
| 4 | 39 | Miora | Goddess of Fertility | ミオラ 豊穣の女神 | Sage | Felidian, Tiger | “All life desires to multiply.” | Moon-eyed fertility goddess surrounded by flowers and fruits | Pearl White | Leaf Green | Rose Pink | Sunlight Gold | Open-armed welcoming posture |
| 5 | 46 | Dolvar | God of Fortification | ドルヴァ 防備の神 | class.guardian | Ursan, bear, a dignified expression | “A wall is compassion made stone.” | Fortress-like bear guardian with tower shield and chained armor | Granite Gray | Dark Bronze | Ember Orange | Ash Ivory | Immovable defensive stance with planted shield |
| 6 | 53 | Tanue | Goddess of Mirage | タヌエ 幻影の女神 | Duelist | Procyonian, tanuki with no stripe tail but tanuki pattern | “What you see is only what survived observation.” | Illusionary tanuki priestess with mirrors and smoke-like tails | Indigo Violet | Pearl White | Moon Gold | Mist Cyan | Twisting dance-like posture with unclear silhouette |
| 7 | 60 | Lira | Goddess of Precision | リラ 精密の女神 | Ranger | Leporian, white hare, droopy ears | “Perfection is mercy.” | Divine rabbit huntress with luminous targeting lines and crescent bow | Golden Wheat | Cream White | Amber Gold | Royal Purple | Perfectly aligned bow-drawing stance, looking at the target |
| 8 | 61 | Forne | God of Fate | フォルネ 運命の神 | Lord | Cervin, deer, no antler  | “All roads were already walked.” | Antlered celestial lord controlling threads of destiny | Midnight Blue | Pale Ivory | Starlight Silver | Celestial Cyan | Upright posture holding threads of fate |
| 9 | 62 | Skuva | God of Dusk | スクヴァ 黄昏の神 | Ninja | Murid , mouse | “Every civilization eventually becomes evening.” | Cloaked dusk deity carrying a fading lantern | Dust Gray | Twilight Purple | Faded Amber | Smoky Teal | Half-hidden profile pose |
| 10 | 63 | Rondel | God of Resonance | ロンデル 共鳴の神 | Wizard | Mustelid | “The universe remembers through vibration.” | Arcane conductor with crystal rings and harmonic magic circles | Moss Green | Moon White | Neon Mint | Dark Pine | Hands spread outward conducting invisible waves |
| 11 | 70 | Noctyra | God of Oblivion | ノクティラ 忘却されし神 | Samurai | Human | “To be forgotten is the final death.” | Destroyed samurai deity with erased face and eclipsed halo | Void Black | Dead Crimson | Faded Silver | Abyss Blue | Motionless downward-facing stance |
| 12 | 71 | Eris | Goddess of Discord | エリス 不和の神 | Pilgrim | Chihuahua, with a jealous expression, self-hug | “Conflict reveals true nature.” | Elegant chaos goddess with fractured halo and asymmetrical garments | Crimson | Black | White | Toxic Magenta | Open-arm invitation posture welcoming catastrophe |


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
