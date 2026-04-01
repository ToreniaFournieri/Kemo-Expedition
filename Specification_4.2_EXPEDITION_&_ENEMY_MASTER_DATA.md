## 4. EXPEDITION_&_ENEMY

### 4.2 EXPEDITION_&_ENEMY_MASTER_DATA

### 4.2.1 Expedition


### 4.1.5 Master_Data_Definitions

**Expedition Floor generation**
- This part is discribe process to make @Specification_4.2_EXPEDITION_&_ENEMY_MASTER_DATA.md

**Step**
1. Define `Expedition Enemy Types`
2. Define `Standard template` for the expedition
3. Allocate Special elite enemy, replaced by floor X, room 3.

**Expedition Enemy Types**

| `x.exp_id` | `x.enemy_type` A | `x.enemy_type` B | `x.enemy_type` C | `x.enemy_type` D |
|---:|---|---|---|---|
| 1 | `Beast` | `Aerial` | `Insect_Swarm` | `Caninian` |
| 2 | `Frost` | `Golem` | `Plant_Fungal` | `Lupinian` |
| 3 | `Marine` | `Slime_Colony` | `Spirit` | `Vulpinian` |
| 4 | `Shadowfang` | `Felidian` | `Titan` | `Felidian` |
| 5 | `Beast` | `Dragon` | `Ursan` | `Ursan` |
| 6 | `Mech` | `Golem` | `Chimera` | `Mustelid` |
| 7 | `Titan` | `Undead` | `Aerial` | `Leporian` |
| 8 | `Dragon` | `Ghost` | `Jinma` | `Cervin` |

**Drop template**
- `x.drop` is used for all rarity drops (Uncommon / Elite / Boss).
- Common drops are selected randomly from the assigned `Drop set`.

| `x.class` | `x.drop` | Common item drop set |
|---|---|---|
| class.duelist | `i.sword`, `i.armor` | Melee |
| class.samurai | `i.katana`, `i.shield` | Melee |
| class.sword-saint | `i.gauntlet`, `i.sword` | Melee |
| class.ranger | `i.arrow`, `i.archery` | Ranged |
| class.striker | `i.bolt`, `i.arrow` | Ranged |
| class.ninja | `i.archery`, `i.bolt` | Ranged |
| class.wizard | `i.wand`, `i.robe` | Magic |
| class.sage | `i.grimoire`, `i.catalyst` | Magic |
| class.alchemist | `i.catalyst`, `i.wand` | Magic |
| class.guardian | `i.armor`, `i.gauntlet` | Defensive |
| class.pilgrim | `i.robe`, `i.grimoire` | Defensive |
| class.lord | `i.shield`, `i.katana` | Defensive |

**Common item table**

| Drop set | items |
|---|---|
| Melee | `i.sword`, `i.katana`, `i.gauntlet` |
| Ranged | `i.arrow`, `i.bolt`, `i.archery` |
| Magic | `i.wand`, `i.grimoire`, `i.catalyst` |
| Defensive | `i.armor`, `i.robe`, `i.shield` |

| `x.type` | has subClass | drops |
|---|---|---|
| Normal | No | 2 Uncommon items (mainClass), 3 Common items |
| Elite | No | 2 Elite rare items (mainClass), 3 Common items |
| Boss | No | 2 Boss rare items (mainClass), 3 Common items |
| Normal | Yes | 2 Uncommon items (mainClass), 1 Uncommon item (subClass: first `x.drop`), 3 Common items |
| Elite | Yes | 2 Elite rare items (mainClass), 1 Elite rare item (subClass: first `x.drop`), 3 Common items |
| Boss | Yes | 2 Boss rare items (mainClass), 1 Boss rare item (subClass: first `x.drop`), 3 Common items |

**Standard template**
- `x.class`: class.mainClass.subClass
- single-class enemies above level 30 are promoted to master-class.

| `x.floor` | `x.room` | `x.level_offset` | `x.type` | `x.enemy_type` | `x.class` |
|---:|---|---|---|---|---|
| 1 | 1-2 | +0 | Normal | A | class.striker |
| 1 | 1-2 | +0 | Normal | A | class.wizard |
| 1 | 1-2 | +0 | Normal | A | class.ranger |
| 1 | 3 | +1 | Normal | A | class.guardian |
| 1 | 3 | +1 | Normal | A | class.lord |
| 1 | 4 | +3 | Elite | A | ELITE1.class |
| 2 | 1-2 | +1 | Normal | A | class.ninja |
| 2 | 1-2 | +1 | Normal | A | class.samurai |
| 2 | 1-2 | +1 | Normal | A | class.sage |
| 2 | 3 | +2 | Normal | B | class.duelist |
| 2 | 3 | +2 | Normal | B | class.pilgrim |
| 2 | 4 | +4 | Elite | A | ELITE2.class |
| 3 | 1-2 | +2 | Normal | C | class.sword-saint |
| 3 | 1-2 | +2 | Normal | C | class.alchemist |
| 3 | 1-2 | +2 | Normal | C | class.guardian.pilgrim |
| 3 | 3 | +3 | Normal | A | class.samurai.duelist |
| 3 | 3 | +3 | Normal | A | class.wizard.alchemist |
| 3 | 4 | +5 | Elite | C | ELITE3.class |
| 4 | 1-2 | +3 | Normal | B | class.lord.striker |
| 4 | 1-2 | +3 | Normal | B | class.sage.samurai |
| 4 | 1-2 | +3 | Normal | B | class.guardian.wizard |
| 4 | 3 | +4 | Normal | C | class.duelist.lord |
| 4 | 3 | +4 | Normal | C | class.lord.striker |
| 4 | 4 | +6 | Elite | B | ELITE4.class |
| 5 | 1-2 | +4 | Normal | C | class.ninja.ranger |
| 5 | 1-2 | +4 | Normal | C | class.samurai.sword-saint |
| 5 | 1-2 | +4 | Normal | C | class.wizard.alchemist |
| 5 | 3 | +5 | Normal | B | class.sword-saint.guardian |
| 5 | 3 | +5 | Normal | B | class.wizard.ninja |
| 5 | 4 | +7 | Elite | B | ELITE5.class |
| 6 | 1-2 | +5 | Normal | A | class.duelist.striker |
| 6 | 1-2 | +5 | Normal | A | class.pilgrim.sage |
| 6 | 1-2 | +5 | Normal | A | class.sword-saint.striker |
| 6 | 3 | +6 | Normal | B | class.samurai.ranger |
| 6 | 3 | +6 | Normal | B | class.ranger.duelist |
| 6 | 4 | +10 | BOSS | D | BOSS.class |

**Elite and boss enemy**

| `x.exp_id` | expedition unique | `x.class` |
|---:|---|---|
| 1 | ELITE1 | class.duelist |
| 1 | ELITE2 | class.samurai |
| 1 | ELITE3 | class.ranger.striker |
| 1 | ELITE4 | class.sage.sword-saint |
| 1 | ELITE5 | class.alchemist.wizard |
| 1 | BOSS | class.guardian.lord |
| 2 | ELITE1 | class.lord.ranger |
| 2 | ELITE2 | class.samurai.guardian |
| 2 | ELITE3 | class.striker.pilgrim |
| 2 | ELITE4 | class.sword-saint.alchemist |
| 2 | ELITE5 | class.wizard.sage |
| 2 | BOSS | class.striker.ninja |
| 3 | ELITE1 | class.pilgrim.wizard |
| 3 | ELITE2 | class.lord.samurai |
| 3 | ELITE3 | class.sage.duelist |
| 3 | ELITE4 | class.ninja.guardian |
| 3 | ELITE5 | class.striker.sword-saint |
| 3 | BOSS | class.wizard.sage |
| 4 | ELITE1 | class.pilgrim.guardian |
| 4 | ELITE2 | class.samurai.striker |
| 4 | ELITE3 | class.lord.wizard |
| 4 | ELITE4 | class.ninja.duelist |
| 4 | ELITE5 | class.sage.alchemist |
| 4 | BOSS | class.striker.ranger |
| 5 | ELITE1 | class.ninja.sword-saint |
| 5 | ELITE2 | class.pilgrim.alchemist |
| 5 | ELITE3 | class.guardian.sage |
| 5 | ELITE4 | class.lord.duelist |
| 5 | ELITE5 | class.alchemist.wizard |
| 5 | BOSS | class.samurai.duelist |
| 6 | ELITE1 | class.guardian.ninja |
| 6 | ELITE2 | class.ranger.striker |
| 6 | ELITE3 | class.alchemist.wizard |
| 6 | ELITE4 | class.samurai.duelist |
| 6 | ELITE5 | class.ninja.sage |
| 6 | BOSS | class.sage.lord |
| 7 | ELITE1 | class.lord.striker |
| 7 | ELITE2 | class.wizard.sage |
| 7 | ELITE3 | class.pilgrim.sword-saint |
| 7 | ELITE4 | class.ranger.samurai |
| 7 | ELITE5 | class.duelist.alchemist |
| 7 | BOSS | class.lord.ninja |
| 8 | ELITE1 | class.guardian.pilgrim |
| 8 | ELITE2 | class.sage.alchemist |
| 8 | ELITE3 | class.pilgrim.sword-saint |
| 8 | ELITE4 | class.samurai.striker |
| 8 | ELITE5 | class.wizard.samurai |
| 8 | BOSS | class.ninja.wizard |

**Special enemy of replacement**

| `x.exp_id` | replace target floor | `x.level_offset` | `x.type` | `x.enemy_type` | `x.class` | `x.drop` |
|---:|---:|---|---|---|---|---|
| 1 | 4 | +6 | Elite | Caninian | class.duelist.lord | `i.shield`BD, `i.robe`BD |
| 1 | 4 | +6 | Elite | Caninian | class.lord.striker | `i.katana`BD, `i.gauntlet`BD |
| 2 | 5 | +7 | Elite | Lupinian | class.wizard.guardian | `i.wand`BD, `i.catalyst`BD |
| 2 | 5 | +7 | Elite | Lupinian | class.ninja.sword-saint | `i.bolt`BD, `i.archery`BD |
| 3 | 5 | +7 | Elite | Vulpinian | class.sword-saint.guardian | `i.sword`BD, `i.shield`BD |
| 3 | 5 | +7 | Elite | Vulpinian | class.wizard.ninja | `i.catalyst`BD, `i.gauntlet`BD |
| 4 | 4 | +6 | Elite | Felidian | class.striker.sage | `i.grimoire`BD, `i.arrow`BD |
| 4 | 4 | +6 | Elite | Felidian | class.ninja.duelist | `i.robe`BD, `i.sword`BD |
| 5 | 3 | +5 | Elite | Ursan | class.samurai.duelist | `i.gauntlet`BD, `i.armor`BD |
| 5 | 3 | +5 | Elite | Ursan | class.wizard.alchemist | `i.wand`BD, `i.catalyst`BD |
| 6 | 6 | +8 | Elite | Procyonian | class.samurai.ranger | `i.shield`BD, `i.katana`BD |
| 6 | 6 | +8 | Elite | Procyonian | class.ranger.duelist | `i.arrow`BD, `i.archery`BD |
| 7 | 2 | +4 | Elite | Leporian | class.duelist.pilgrim | `i.armor`BD, `i.gauntlet`BD |
| 7 | 2 | +4 | Elite | Leporian | class.wizard.striker | `i.archery`BD, `i.grimoire`BD |
| 8 | 5 | +7 | Elite | Cervin | class.sword-saint.ninja | `i.catalyst`BD, `i.sword`BD |
| 8 | 5 | +7 | Elite | Cervin | class.wizard.guardian | `i.arrow`BD, `i.robe`BD |

- Drop code format: `i.item_type`<Rarity><EnemyTypeSource>

<Rarity>
- `U`: Uncommon (No enemy type specific)
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

### 4.2.2 Enemy

| `x.exp_id` | `x.floor` | `x.room` | `x.level` | `x.type` | `x.enemy_type` | `x.class` | `x.drop` | `x.name` (Japanese) |
|---|---:|---|---:|---|---|---|---|---|
| 1 | 1 | 1-2 | 1 | Normal | `Beast` | class.ranger | `i.arrow`U, `i.archery`U | 敵1-1-1-2-ranger |
| 1 | 1 | 1-2 | 1 | Normal | `Beast` | class.striker | `i.bolt`U, `i.arrow`U | 敵1-1-1-2-striker |
| 1 | 1 | 1-2 | 1 | Normal | `Beast` | class.wizard | `i.wand`U, `i.robe`U | 敵1-1-1-2-wizard |
| 1 | 1 | 3 | 2 | Normal | `Beast` | class.guardian | `i.armor`U, `i.gauntlet`U | 敵1-1-3-guardian |
| 1 | 1 | 3 | 2 | Normal | `Beast` | class.lord | `i.shield`U, `i.katana`U | 敵1-1-3-lord |
| 1 | 1 | 4 | 4 | Elite | `Beast` | class.duelist | `i.sword`EA, `i.armor`EA | 敵1-1-4-duelist |
| 1 | 2 | 1-2 | 2 | Normal | `Beast` | class.ninja | `i.archery`U, `i.bolt`U | 敵1-2-1-2-ninja |
| 1 | 2 | 1-2 | 2 | Normal | `Beast` | class.sage | `i.grimoire`U, `i.catalyst`U | 敵1-2-1-2-sage |
| 1 | 2 | 1-2 | 2 | Normal | `Beast` | class.samurai | `i.katana`U, `i.shield`U | 敵1-2-1-2-samurai |
| 1 | 2 | 3 | 3 | Normal | `Aerial` | class.duelist | `i.sword`U, `i.armor`U | 敵1-2-3-duelist |
| 1 | 2 | 3 | 3 | Normal | `Aerial` | class.pilgrim | `i.robe`U, `i.grimoire`U | 敵1-2-3-pilgrim |
| 1 | 2 | 4 | 5 | Elite | `Beast` | class.samurai | `i.katana`EA, `i.shield`EA | 敵1-2-4-samurai |
| 1 | 3 | 1-2 | 3 | Normal | `Insect_Swarm` | class.alchemist | `i.catalyst`U, `i.wand`U | 敵1-3-1-2-alchemist |
| 1 | 3 | 1-2 | 3 | Normal | `Insect_Swarm` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U | 敵1-3-1-2-guardian/pilgrim |
| 1 | 3 | 1-2 | 3 | Normal | `Insect_Swarm` | class.sword-saint | `i.gauntlet`U, `i.sword`U | 敵1-3-1-2-sword-saint |
| 1 | 3 | 3 | 4 | Normal | `Beast` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U | 敵1-3-3-samurai/duelist |
| 1 | 3 | 3 | 4 | Normal | `Beast` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U | 敵1-3-3-wizard/alchemist |
| 1 | 3 | 4 | 6 | Elite | `Insect_Swarm` | class.ranger.striker | `i.arrow`EC, `i.archery`EC, `i.bolt`EC | 敵1-3-4-ranger/striker |
| 1 | 4 | 1-2 | 4 | Normal | `Aerial` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U | 敵1-4-1-2-guardian/wizard |
| 1 | 4 | 1-2 | 4 | Normal | `Aerial` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U | 敵1-4-1-2-lord/striker |
| 1 | 4 | 1-2 | 4 | Normal | `Aerial` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U | 敵1-4-1-2-sage/samurai |
| 1 | 4 | 3 | 7 | Elite | `Caninian` | class.duelist.lord | `i.shield`BD, `i.robe`BD | 特別敵1-4-duelist/lord |
| 1 | 4 | 3 | 7 | Elite | `Caninian` | class.lord.striker | `i.katana`BD, `i.gauntlet`BD | 特別敵1-4-lord/striker |
| 1 | 4 | 4 | 7 | Elite | `Aerial` | class.sage.sword-saint | `i.grimoire`EB, `i.catalyst`EB, `i.gauntlet`EB | 敵1-4-4-sage/sword-saint |
| 1 | 5 | 1-2 | 5 | Normal | `Insect_Swarm` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U | 敵1-5-1-2-ninja/ranger |
| 1 | 5 | 1-2 | 5 | Normal | `Insect_Swarm` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U | 敵1-5-1-2-samurai/sword-saint |
| 1 | 5 | 1-2 | 5 | Normal | `Insect_Swarm` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U | 敵1-5-1-2-wizard/alchemist |
| 1 | 5 | 3 | 6 | Normal | `Aerial` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U | 敵1-5-3-sword-saint/guardian |
| 1 | 5 | 3 | 6 | Normal | `Aerial` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U | 敵1-5-3-wizard/ninja |
| 1 | 5 | 4 | 8 | Elite | `Aerial` | class.alchemist.wizard | `i.catalyst`EB, `i.wand`EB, `i.wand`EB | 敵1-5-4-alchemist/wizard |
| 1 | 6 | 1-2 | 6 | Normal | `Beast` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U | 敵1-6-1-2-duelist/striker |
| 1 | 6 | 1-2 | 6 | Normal | `Beast` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U | 敵1-6-1-2-pilgrim/sage |
| 1 | 6 | 1-2 | 6 | Normal | `Beast` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U | 敵1-6-1-2-sword-saint/striker |
| 1 | 6 | 3 | 7 | Normal | `Aerial` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U | 敵1-6-3-ranger/duelist |
| 1 | 6 | 3 | 7 | Normal | `Aerial` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U | 敵1-6-3-samurai/ranger |
| 1 | 6 | 4 | 11 | BOSS | `Caninian` | class.guardian.lord | `i.armor`BD, `i.gauntlet`BD, `i.shield`BD | 敵1-6-4-guardian/lord |
| 2 | 1 | 1-2 | 7 | Normal | `Frost` | class.ranger | `i.arrow`U, `i.archery`U | 敵2-1-1-2-ranger |
| 2 | 1 | 1-2 | 7 | Normal | `Frost` | class.striker | `i.bolt`U, `i.arrow`U | 敵2-1-1-2-striker |
| 2 | 1 | 1-2 | 7 | Normal | `Frost` | class.wizard | `i.wand`U, `i.robe`U | 敵2-1-1-2-wizard |
| 2 | 1 | 3 | 8 | Normal | `Frost` | class.guardian | `i.armor`U, `i.gauntlet`U | 敵2-1-3-guardian |
| 2 | 1 | 3 | 8 | Normal | `Frost` | class.lord | `i.shield`U, `i.katana`U | 敵2-1-3-lord |
| 2 | 1 | 4 | 10 | Elite | `Frost` | class.lord.ranger | `i.shield`EA, `i.katana`EA, `i.arrow`EA | 敵2-1-4-lord/ranger |
| 2 | 2 | 1-2 | 8 | Normal | `Frost` | class.ninja | `i.archery`U, `i.bolt`U | 敵2-2-1-2-ninja |
| 2 | 2 | 1-2 | 8 | Normal | `Frost` | class.sage | `i.grimoire`U, `i.catalyst`U | 敵2-2-1-2-sage |
| 2 | 2 | 1-2 | 8 | Normal | `Frost` | class.samurai | `i.katana`U, `i.shield`U | 敵2-2-1-2-samurai |
| 2 | 2 | 3 | 9 | Normal | `Golem` | class.duelist | `i.sword`U, `i.armor`U | 敵2-2-3-duelist |
| 2 | 2 | 3 | 9 | Normal | `Golem` | class.pilgrim | `i.robe`U, `i.grimoire`U | 敵2-2-3-pilgrim |
| 2 | 2 | 4 | 11 | Elite | `Frost` | class.samurai.guardian | `i.katana`EA, `i.shield`EA, `i.armor`EA | 敵2-2-4-samurai/guardian |
| 2 | 3 | 1-2 | 9 | Normal | `Plant_Fungal` | class.alchemist | `i.catalyst`U, `i.wand`U | 敵2-3-1-2-alchemist |
| 2 | 3 | 1-2 | 9 | Normal | `Plant_Fungal` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U | 敵2-3-1-2-guardian/pilgrim |
| 2 | 3 | 1-2 | 9 | Normal | `Plant_Fungal` | class.sword-saint | `i.gauntlet`U, `i.sword`U | 敵2-3-1-2-sword-saint |
| 2 | 3 | 3 | 10 | Normal | `Frost` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U | 敵2-3-3-samurai/duelist |
| 2 | 3 | 3 | 10 | Normal | `Frost` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U | 敵2-3-3-wizard/alchemist |
| 2 | 3 | 4 | 12 | Elite | `Plant_Fungal` | class.striker.pilgrim | `i.bolt`EC, `i.arrow`EC, `i.robe`EC | 敵2-3-4-striker/pilgrim |
| 2 | 4 | 1-2 | 10 | Normal | `Golem` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U | 敵2-4-1-2-guardian/wizard |
| 2 | 4 | 1-2 | 10 | Normal | `Golem` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U | 敵2-4-1-2-lord/striker |
| 2 | 4 | 1-2 | 10 | Normal | `Golem` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U | 敵2-4-1-2-sage/samurai |
| 2 | 4 | 3 | 11 | Normal | `Plant_Fungal` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U | 敵2-4-3-duelist/lord |
| 2 | 4 | 3 | 11 | Normal | `Plant_Fungal` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U | 敵2-4-3-lord/striker |
| 2 | 4 | 4 | 13 | Elite | `Golem` | class.sword-saint.alchemist | `i.gauntlet`EB, `i.sword`EB, `i.catalyst`EB | 敵2-4-4-sword-saint/alchemist |
| 2 | 5 | 1-2 | 11 | Normal | `Plant_Fungal` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U | 敵2-5-1-2-ninja/ranger |
| 2 | 5 | 1-2 | 11 | Normal | `Plant_Fungal` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U | 敵2-5-1-2-samurai/sword-saint |
| 2 | 5 | 1-2 | 11 | Normal | `Plant_Fungal` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U | 敵2-5-1-2-wizard/alchemist |
| 2 | 5 | 3 | 14 | Elite | `Lupinian` | class.ninja.sword-saint | `i.bolt`BD, `i.archery`BD | 特別敵2-5-ninja/sword-saint |
| 2 | 5 | 3 | 14 | Elite | `Lupinian` | class.wizard.guardian | `i.wand`BD, `i.catalyst`BD | 特別敵2-5-wizard/guardian |
| 2 | 5 | 4 | 14 | Elite | `Golem` | class.wizard.sage | `i.wand`EB, `i.robe`EB, `i.grimoire`EB | 敵2-5-4-wizard/sage |
| 2 | 6 | 1-2 | 12 | Normal | `Frost` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U | 敵2-6-1-2-duelist/striker |
| 2 | 6 | 1-2 | 12 | Normal | `Frost` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U | 敵2-6-1-2-pilgrim/sage |
| 2 | 6 | 1-2 | 12 | Normal | `Frost` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U | 敵2-6-1-2-sword-saint/striker |
| 2 | 6 | 3 | 13 | Normal | `Golem` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U | 敵2-6-3-ranger/duelist |
| 2 | 6 | 3 | 13 | Normal | `Golem` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U | 敵2-6-3-samurai/ranger |
| 2 | 6 | 4 | 17 | BOSS | `Lupinian` | class.striker.ninja | `i.bolt`BD, `i.arrow`BD, `i.archery`BD | 敵2-6-4-striker/ninja |
| 3 | 1 | 1-2 | 14 | Normal | `Marine` | class.ranger | `i.arrow`U, `i.archery`U | 敵3-1-1-2-ranger |
| 3 | 1 | 1-2 | 14 | Normal | `Marine` | class.striker | `i.bolt`U, `i.arrow`U | 敵3-1-1-2-striker |
| 3 | 1 | 1-2 | 14 | Normal | `Marine` | class.wizard | `i.wand`U, `i.robe`U | 敵3-1-1-2-wizard |
| 3 | 1 | 3 | 15 | Normal | `Marine` | class.guardian | `i.armor`U, `i.gauntlet`U | 敵3-1-3-guardian |
| 3 | 1 | 3 | 15 | Normal | `Marine` | class.lord | `i.shield`U, `i.katana`U | 敵3-1-3-lord |
| 3 | 1 | 4 | 17 | Elite | `Marine` | class.pilgrim.wizard | `i.robe`EA, `i.grimoire`EA, `i.wand`EA | 敵3-1-4-pilgrim/wizard |
| 3 | 2 | 1-2 | 15 | Normal | `Marine` | class.ninja | `i.archery`U, `i.bolt`U | 敵3-2-1-2-ninja |
| 3 | 2 | 1-2 | 15 | Normal | `Marine` | class.sage | `i.grimoire`U, `i.catalyst`U | 敵3-2-1-2-sage |
| 3 | 2 | 1-2 | 15 | Normal | `Marine` | class.samurai | `i.katana`U, `i.shield`U | 敵3-2-1-2-samurai |
| 3 | 2 | 3 | 16 | Normal | `Slime_Colony` | class.duelist | `i.sword`U, `i.armor`U | 敵3-2-3-duelist |
| 3 | 2 | 3 | 16 | Normal | `Slime_Colony` | class.pilgrim | `i.robe`U, `i.grimoire`U | 敵3-2-3-pilgrim |
| 3 | 2 | 4 | 18 | Elite | `Marine` | class.lord.samurai | `i.shield`EA, `i.katana`EA, `i.katana`EA | 敵3-2-4-lord/samurai |
| 3 | 3 | 1-2 | 16 | Normal | `Spirit` | class.alchemist | `i.catalyst`U, `i.wand`U | 敵3-3-1-2-alchemist |
| 3 | 3 | 1-2 | 16 | Normal | `Spirit` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U | 敵3-3-1-2-guardian/pilgrim |
| 3 | 3 | 1-2 | 16 | Normal | `Spirit` | class.sword-saint | `i.gauntlet`U, `i.sword`U | 敵3-3-1-2-sword-saint |
| 3 | 3 | 3 | 17 | Normal | `Marine` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U | 敵3-3-3-samurai/duelist |
| 3 | 3 | 3 | 17 | Normal | `Marine` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U | 敵3-3-3-wizard/alchemist |
| 3 | 3 | 4 | 19 | Elite | `Spirit` | class.sage.duelist | `i.grimoire`EC, `i.catalyst`EC, `i.sword`EC | 敵3-3-4-sage/duelist |
| 3 | 4 | 1-2 | 17 | Normal | `Slime_Colony` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U | 敵3-4-1-2-guardian/wizard |
| 3 | 4 | 1-2 | 17 | Normal | `Slime_Colony` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U | 敵3-4-1-2-lord/striker |
| 3 | 4 | 1-2 | 17 | Normal | `Slime_Colony` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U | 敵3-4-1-2-sage/samurai |
| 3 | 4 | 3 | 18 | Normal | `Spirit` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U | 敵3-4-3-duelist/lord |
| 3 | 4 | 3 | 18 | Normal | `Spirit` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U | 敵3-4-3-lord/striker |
| 3 | 4 | 4 | 20 | Elite | `Slime_Colony` | class.ninja.guardian | `i.archery`EB, `i.bolt`EB, `i.armor`EB | 敵3-4-4-ninja/guardian |
| 3 | 5 | 1-2 | 18 | Normal | `Spirit` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U | 敵3-5-1-2-ninja/ranger |
| 3 | 5 | 1-2 | 18 | Normal | `Spirit` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U | 敵3-5-1-2-samurai/sword-saint |
| 3 | 5 | 1-2 | 18 | Normal | `Spirit` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U | 敵3-5-1-2-wizard/alchemist |
| 3 | 5 | 3 | 21 | Elite | `Vulpinian` | class.sword-saint.guardian | `i.sword`BD, `i.shield`BD | 特別敵3-5-sword-saint/guardian |
| 3 | 5 | 3 | 21 | Elite | `Vulpinian` | class.wizard.ninja | `i.catalyst`BD, `i.gauntlet`BD | 特別敵3-5-wizard/ninja |
| 3 | 5 | 4 | 21 | Elite | `Slime_Colony` | class.striker.sword-saint | `i.bolt`EB, `i.arrow`EB, `i.gauntlet`EB | 敵3-5-4-striker/sword-saint |
| 3 | 6 | 1-2 | 19 | Normal | `Marine` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U | 敵3-6-1-2-duelist/striker |
| 3 | 6 | 1-2 | 19 | Normal | `Marine` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U | 敵3-6-1-2-pilgrim/sage |
| 3 | 6 | 1-2 | 19 | Normal | `Marine` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U | 敵3-6-1-2-sword-saint/striker |
| 3 | 6 | 3 | 20 | Normal | `Slime_Colony` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U | 敵3-6-3-ranger/duelist |
| 3 | 6 | 3 | 20 | Normal | `Slime_Colony` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U | 敵3-6-3-samurai/ranger |
| 3 | 6 | 4 | 24 | BOSS | `Vulpinian` | class.wizard.sage | `i.wand`BD, `i.robe`BD, `i.grimoire`BD | 敵3-6-4-wizard/sage |
| 4 | 1 | 1-2 | 21 | Normal | `Shadowfang` | class.ranger | `i.arrow`U, `i.archery`U | 敵4-1-1-2-ranger |
| 4 | 1 | 1-2 | 21 | Normal | `Shadowfang` | class.striker | `i.bolt`U, `i.arrow`U | 敵4-1-1-2-striker |
| 4 | 1 | 1-2 | 21 | Normal | `Shadowfang` | class.wizard | `i.wand`U, `i.robe`U | 敵4-1-1-2-wizard |
| 4 | 1 | 3 | 22 | Normal | `Shadowfang` | class.guardian | `i.armor`U, `i.gauntlet`U | 敵4-1-3-guardian |
| 4 | 1 | 3 | 22 | Normal | `Shadowfang` | class.lord | `i.shield`U, `i.katana`U | 敵4-1-3-lord |
| 4 | 1 | 4 | 24 | Elite | `Shadowfang` | class.pilgrim.guardian | `i.robe`EA, `i.grimoire`EA, `i.armor`EA | 敵4-1-4-pilgrim/guardian |
| 4 | 2 | 1-2 | 22 | Normal | `Shadowfang` | class.ninja | `i.archery`U, `i.bolt`U | 敵4-2-1-2-ninja |
| 4 | 2 | 1-2 | 22 | Normal | `Shadowfang` | class.sage | `i.grimoire`U, `i.catalyst`U | 敵4-2-1-2-sage |
| 4 | 2 | 1-2 | 22 | Normal | `Shadowfang` | class.samurai | `i.katana`U, `i.shield`U | 敵4-2-1-2-samurai |
| 4 | 2 | 3 | 23 | Normal | `Felidian` | class.duelist | `i.sword`U, `i.armor`U | 敵4-2-3-duelist |
| 4 | 2 | 3 | 23 | Normal | `Felidian` | class.pilgrim | `i.robe`U, `i.grimoire`U | 敵4-2-3-pilgrim |
| 4 | 2 | 4 | 25 | Elite | `Shadowfang` | class.samurai.striker | `i.katana`EA, `i.shield`EA, `i.bolt`EA | 敵4-2-4-samurai/striker |
| 4 | 3 | 1-2 | 23 | Normal | `Titan` | class.alchemist | `i.catalyst`U, `i.wand`U | 敵4-3-1-2-alchemist |
| 4 | 3 | 1-2 | 23 | Normal | `Titan` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U | 敵4-3-1-2-guardian/pilgrim |
| 4 | 3 | 1-2 | 23 | Normal | `Titan` | class.sword-saint | `i.gauntlet`U, `i.sword`U | 敵4-3-1-2-sword-saint |
| 4 | 3 | 3 | 24 | Normal | `Shadowfang` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U | 敵4-3-3-samurai/duelist |
| 4 | 3 | 3 | 24 | Normal | `Shadowfang` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U | 敵4-3-3-wizard/alchemist |
| 4 | 3 | 4 | 26 | Elite | `Titan` | class.lord.wizard | `i.shield`EC, `i.katana`EC, `i.wand`EC | 敵4-3-4-lord/wizard |
| 4 | 4 | 1-2 | 24 | Normal | `Felidian` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U | 敵4-4-1-2-guardian/wizard |
| 4 | 4 | 1-2 | 24 | Normal | `Felidian` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U | 敵4-4-1-2-lord/striker |
| 4 | 4 | 1-2 | 24 | Normal | `Felidian` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U | 敵4-4-1-2-sage/samurai |
| 4 | 4 | 3 | 27 | Elite | `Felidian` | class.ninja.duelist | `i.robe`BD, `i.sword`BD | 特別敵4-4-ninja/duelist |
| 4 | 4 | 3 | 27 | Elite | `Felidian` | class.striker.sage | `i.grimoire`BD, `i.arrow`BD | 特別敵4-4-striker/sage |
| 4 | 4 | 4 | 27 | Elite | `Felidian` | class.ninja.duelist | `i.archery`EB, `i.bolt`EB, `i.sword`EB | 敵4-4-4-ninja/duelist |
| 4 | 5 | 1-2 | 25 | Normal | `Titan` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U | 敵4-5-1-2-ninja/ranger |
| 4 | 5 | 1-2 | 25 | Normal | `Titan` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U | 敵4-5-1-2-samurai/sword-saint |
| 4 | 5 | 1-2 | 25 | Normal | `Titan` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U | 敵4-5-1-2-wizard/alchemist |
| 4 | 5 | 3 | 26 | Normal | `Felidian` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U | 敵4-5-3-sword-saint/guardian |
| 4 | 5 | 3 | 26 | Normal | `Felidian` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U | 敵4-5-3-wizard/ninja |
| 4 | 5 | 4 | 28 | Elite | `Felidian` | class.sage.alchemist | `i.grimoire`EB, `i.catalyst`EB, `i.catalyst`EB | 敵4-5-4-sage/alchemist |
| 4 | 6 | 1-2 | 26 | Normal | `Shadowfang` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U | 敵4-6-1-2-duelist/striker |
| 4 | 6 | 1-2 | 26 | Normal | `Shadowfang` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U | 敵4-6-1-2-pilgrim/sage |
| 4 | 6 | 1-2 | 26 | Normal | `Shadowfang` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U | 敵4-6-1-2-sword-saint/striker |
| 4 | 6 | 3 | 27 | Normal | `Felidian` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U | 敵4-6-3-ranger/duelist |
| 4 | 6 | 3 | 27 | Normal | `Felidian` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U | 敵4-6-3-samurai/ranger |
| 4 | 6 | 4 | 31 | BOSS | `Felidian` | class.striker.ranger | `i.bolt`BD, `i.arrow`BD, `i.arrow`BD | 敵4-6-4-striker/ranger |
| 5 | 1 | 1-2 | 28 | Normal | `Beast` | class.ranger | `i.arrow`U, `i.archery`U | 敵5-1-1-2-ranger |
| 5 | 1 | 1-2 | 28 | Normal | `Beast` | class.striker | `i.bolt`U, `i.arrow`U | 敵5-1-1-2-striker |
| 5 | 1 | 1-2 | 28 | Normal | `Beast` | class.wizard | `i.wand`U, `i.robe`U | 敵5-1-1-2-wizard |
| 5 | 1 | 3 | 29 | Normal | `Beast` | class.guardian | `i.armor`U, `i.gauntlet`U | 敵5-1-3-guardian |
| 5 | 1 | 3 | 29 | Normal | `Beast` | class.lord | `i.shield`U, `i.katana`U | 敵5-1-3-lord |
| 5 | 1 | 4 | 31 | Elite | `Beast` | class.ninja.sword-saint | `i.archery`EA, `i.bolt`EA, `i.gauntlet`EA | 敵5-1-4-ninja/sword-saint |
| 5 | 2 | 1-2 | 29 | Normal | `Beast` | class.ninja | `i.archery`U, `i.bolt`U | 敵5-2-1-2-ninja |
| 5 | 2 | 1-2 | 29 | Normal | `Beast` | class.sage | `i.grimoire`U, `i.catalyst`U | 敵5-2-1-2-sage |
| 5 | 2 | 1-2 | 29 | Normal | `Beast` | class.samurai | `i.katana`U, `i.shield`U | 敵5-2-1-2-samurai |
| 5 | 2 | 3 | 30 | Normal | `Dragon` | class.duelist | `i.sword`U, `i.armor`U | 敵5-2-3-duelist |
| 5 | 2 | 3 | 30 | Normal | `Dragon` | class.pilgrim | `i.robe`U, `i.grimoire`U | 敵5-2-3-pilgrim |
| 5 | 2 | 4 | 32 | Elite | `Beast` | class.pilgrim.alchemist | `i.robe`EA, `i.grimoire`EA, `i.catalyst`EA | 敵5-2-4-pilgrim/alchemist |
| 5 | 3 | 1-2 | 30 | Normal | `Ursan` | class.alchemist | `i.catalyst`U, `i.wand`U | 敵5-3-1-2-alchemist |
| 5 | 3 | 1-2 | 30 | Normal | `Ursan` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U | 敵5-3-1-2-guardian/pilgrim |
| 5 | 3 | 1-2 | 30 | Normal | `Ursan` | class.sword-saint | `i.gauntlet`U, `i.sword`U | 敵5-3-1-2-sword-saint |
| 5 | 3 | 3 | 33 | Elite | `Ursan` | class.samurai.duelist | `i.gauntlet`BD, `i.armor`BD | 特別敵5-3-samurai/duelist |
| 5 | 3 | 3 | 33 | Elite | `Ursan` | class.wizard.alchemist | `i.wand`BD, `i.catalyst`BD | 特別敵5-3-wizard/alchemist |
| 5 | 3 | 4 | 33 | Elite | `Ursan` | class.guardian.sage | `i.armor`EC, `i.gauntlet`EC, `i.grimoire`EC | 敵5-3-4-guardian/sage |
| 5 | 4 | 1-2 | 31 | Normal | `Dragon` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U | 敵5-4-1-2-guardian/wizard |
| 5 | 4 | 1-2 | 31 | Normal | `Dragon` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U | 敵5-4-1-2-lord/striker |
| 5 | 4 | 1-2 | 31 | Normal | `Dragon` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U | 敵5-4-1-2-sage/samurai |
| 5 | 4 | 3 | 32 | Normal | `Ursan` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U | 敵5-4-3-duelist/lord |
| 5 | 4 | 3 | 32 | Normal | `Ursan` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U | 敵5-4-3-lord/striker |
| 5 | 4 | 4 | 34 | Elite | `Dragon` | class.lord.duelist | `i.shield`EB, `i.katana`EB, `i.sword`EB | 敵5-4-4-lord/duelist |
| 5 | 5 | 1-2 | 32 | Normal | `Ursan` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U | 敵5-5-1-2-ninja/ranger |
| 5 | 5 | 1-2 | 32 | Normal | `Ursan` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U | 敵5-5-1-2-samurai/sword-saint |
| 5 | 5 | 1-2 | 32 | Normal | `Ursan` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U | 敵5-5-1-2-wizard/alchemist |
| 5 | 5 | 3 | 33 | Normal | `Dragon` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U | 敵5-5-3-sword-saint/guardian |
| 5 | 5 | 3 | 33 | Normal | `Dragon` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U | 敵5-5-3-wizard/ninja |
| 5 | 5 | 4 | 35 | Elite | `Dragon` | class.alchemist.wizard | `i.catalyst`EB, `i.wand`EB, `i.wand`EB | 敵5-5-4-alchemist/wizard |
| 5 | 6 | 1-2 | 33 | Normal | `Beast` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U | 敵5-6-1-2-duelist/striker |
| 5 | 6 | 1-2 | 33 | Normal | `Beast` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U | 敵5-6-1-2-pilgrim/sage |
| 5 | 6 | 1-2 | 33 | Normal | `Beast` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U | 敵5-6-1-2-sword-saint/striker |
| 5 | 6 | 3 | 34 | Normal | `Dragon` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U | 敵5-6-3-ranger/duelist |
| 5 | 6 | 3 | 34 | Normal | `Dragon` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U | 敵5-6-3-samurai/ranger |
| 5 | 6 | 4 | 38 | BOSS | `Ursan` | class.samurai.duelist | `i.katana`BD, `i.shield`BD, `i.sword`BD | 敵5-6-4-samurai/duelist |
| 6 | 1 | 1-2 | 35 | Normal | `Mech` | class.ranger | `i.arrow`U, `i.archery`U | 敵6-1-1-2-ranger |
| 6 | 1 | 1-2 | 35 | Normal | `Mech` | class.striker | `i.bolt`U, `i.arrow`U | 敵6-1-1-2-striker |
| 6 | 1 | 1-2 | 35 | Normal | `Mech` | class.wizard | `i.wand`U, `i.robe`U | 敵6-1-1-2-wizard |
| 6 | 1 | 3 | 36 | Normal | `Mech` | class.guardian | `i.armor`U, `i.gauntlet`U | 敵6-1-3-guardian |
| 6 | 1 | 3 | 36 | Normal | `Mech` | class.lord | `i.shield`U, `i.katana`U | 敵6-1-3-lord |
| 6 | 1 | 4 | 38 | Elite | `Mech` | class.guardian.ninja | `i.armor`EA, `i.gauntlet`EA, `i.archery`EA | 敵6-1-4-guardian/ninja |
| 6 | 2 | 1-2 | 36 | Normal | `Mech` | class.ninja | `i.archery`U, `i.bolt`U | 敵6-2-1-2-ninja |
| 6 | 2 | 1-2 | 36 | Normal | `Mech` | class.sage | `i.grimoire`U, `i.catalyst`U | 敵6-2-1-2-sage |
| 6 | 2 | 1-2 | 36 | Normal | `Mech` | class.samurai | `i.katana`U, `i.shield`U | 敵6-2-1-2-samurai |
| 6 | 2 | 3 | 37 | Normal | `Golem` | class.duelist | `i.sword`U, `i.armor`U | 敵6-2-3-duelist |
| 6 | 2 | 3 | 37 | Normal | `Golem` | class.pilgrim | `i.robe`U, `i.grimoire`U | 敵6-2-3-pilgrim |
| 6 | 2 | 4 | 39 | Elite | `Mech` | class.ranger.striker | `i.arrow`EA, `i.archery`EA, `i.bolt`EA | 敵6-2-4-ranger/striker |
| 6 | 3 | 1-2 | 37 | Normal | `Chimera` | class.alchemist | `i.catalyst`U, `i.wand`U | 敵6-3-1-2-alchemist |
| 6 | 3 | 1-2 | 37 | Normal | `Chimera` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U | 敵6-3-1-2-guardian/pilgrim |
| 6 | 3 | 1-2 | 37 | Normal | `Chimera` | class.sword-saint | `i.gauntlet`U, `i.sword`U | 敵6-3-1-2-sword-saint |
| 6 | 3 | 3 | 38 | Normal | `Mech` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U | 敵6-3-3-samurai/duelist |
| 6 | 3 | 3 | 38 | Normal | `Mech` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U | 敵6-3-3-wizard/alchemist |
| 6 | 3 | 4 | 40 | Elite | `Chimera` | class.alchemist.wizard | `i.catalyst`EC, `i.wand`EC, `i.wand`EC | 敵6-3-4-alchemist/wizard |
| 6 | 4 | 1-2 | 38 | Normal | `Golem` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U | 敵6-4-1-2-guardian/wizard |
| 6 | 4 | 1-2 | 38 | Normal | `Golem` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U | 敵6-4-1-2-lord/striker |
| 6 | 4 | 1-2 | 38 | Normal | `Golem` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U | 敵6-4-1-2-sage/samurai |
| 6 | 4 | 3 | 39 | Normal | `Chimera` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U | 敵6-4-3-duelist/lord |
| 6 | 4 | 3 | 39 | Normal | `Chimera` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U | 敵6-4-3-lord/striker |
| 6 | 4 | 4 | 41 | Elite | `Golem` | class.samurai.duelist | `i.katana`EB, `i.shield`EB, `i.sword`EB | 敵6-4-4-samurai/duelist |
| 6 | 5 | 1-2 | 39 | Normal | `Chimera` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U | 敵6-5-1-2-ninja/ranger |
| 6 | 5 | 1-2 | 39 | Normal | `Chimera` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U | 敵6-5-1-2-samurai/sword-saint |
| 6 | 5 | 1-2 | 39 | Normal | `Chimera` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U | 敵6-5-1-2-wizard/alchemist |
| 6 | 5 | 3 | 40 | Normal | `Golem` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U | 敵6-5-3-sword-saint/guardian |
| 6 | 5 | 3 | 40 | Normal | `Golem` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U | 敵6-5-3-wizard/ninja |
| 6 | 5 | 4 | 42 | Elite | `Golem` | class.ninja.sage | `i.archery`EB, `i.bolt`EB, `i.grimoire`EB | 敵6-5-4-ninja/sage |
| 6 | 6 | 1-2 | 40 | Normal | `Mech` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U | 敵6-6-1-2-duelist/striker |
| 6 | 6 | 1-2 | 40 | Normal | `Mech` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U | 敵6-6-1-2-pilgrim/sage |
| 6 | 6 | 1-2 | 40 | Normal | `Mech` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U | 敵6-6-1-2-sword-saint/striker |
| 6 | 6 | 3 | 43 | Elite | `Procyonian` | class.ranger.duelist | `i.arrow`BD, `i.archery`BD | 特別敵6-6-ranger/duelist |
| 6 | 6 | 3 | 43 | Elite | `Procyonian` | class.samurai.ranger | `i.shield`BD, `i.katana`BD | 特別敵6-6-samurai/ranger |
| 6 | 6 | 4 | 45 | BOSS | `Mustelid` | class.sage.lord | `i.grimoire`BD, `i.catalyst`BD, `i.shield`BD | 敵6-6-4-sage/lord |
| 7 | 1 | 1-2 | 42 | Normal | `Titan` | class.ranger | `i.arrow`U, `i.archery`U | 敵7-1-1-2-ranger |
| 7 | 1 | 1-2 | 42 | Normal | `Titan` | class.striker | `i.bolt`U, `i.arrow`U | 敵7-1-1-2-striker |
| 7 | 1 | 1-2 | 42 | Normal | `Titan` | class.wizard | `i.wand`U, `i.robe`U | 敵7-1-1-2-wizard |
| 7 | 1 | 3 | 43 | Normal | `Titan` | class.guardian | `i.armor`U, `i.gauntlet`U | 敵7-1-3-guardian |
| 7 | 1 | 3 | 43 | Normal | `Titan` | class.lord | `i.shield`U, `i.katana`U | 敵7-1-3-lord |
| 7 | 1 | 4 | 45 | Elite | `Titan` | class.lord.striker | `i.shield`EA, `i.katana`EA, `i.bolt`EA | 敵7-1-4-lord/striker |
| 7 | 2 | 1-2 | 43 | Normal | `Titan` | class.ninja | `i.archery`U, `i.bolt`U | 敵7-2-1-2-ninja |
| 7 | 2 | 1-2 | 43 | Normal | `Titan` | class.sage | `i.grimoire`U, `i.catalyst`U | 敵7-2-1-2-sage |
| 7 | 2 | 1-2 | 43 | Normal | `Titan` | class.samurai | `i.katana`U, `i.shield`U | 敵7-2-1-2-samurai |
| 7 | 2 | 3 | 46 | Elite | `Leporian` | class.duelist.pilgrim | `i.armor`BD, `i.gauntlet`BD | 特別敵7-2-duelist/pilgrim |
| 7 | 2 | 3 | 46 | Elite | `Leporian` | class.wizard.striker | `i.archery`BD, `i.grimoire`BD | 特別敵7-2-wizard/striker |
| 7 | 2 | 4 | 46 | Elite | `Titan` | class.wizard.sage | `i.wand`EA, `i.robe`EA, `i.grimoire`EA | 敵7-2-4-wizard/sage |
| 7 | 3 | 1-2 | 44 | Normal | `Aerial` | class.alchemist | `i.catalyst`U, `i.wand`U | 敵7-3-1-2-alchemist |
| 7 | 3 | 1-2 | 44 | Normal | `Aerial` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U | 敵7-3-1-2-guardian/pilgrim |
| 7 | 3 | 1-2 | 44 | Normal | `Aerial` | class.sword-saint | `i.gauntlet`U, `i.sword`U | 敵7-3-1-2-sword-saint |
| 7 | 3 | 3 | 45 | Normal | `Titan` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U | 敵7-3-3-samurai/duelist |
| 7 | 3 | 3 | 45 | Normal | `Titan` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U | 敵7-3-3-wizard/alchemist |
| 7 | 3 | 4 | 47 | Elite | `Aerial` | class.pilgrim.sword-saint | `i.robe`EC, `i.grimoire`EC, `i.gauntlet`EC | 敵7-3-4-pilgrim/sword-saint |
| 7 | 4 | 1-2 | 45 | Normal | `Undead` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U | 敵7-4-1-2-guardian/wizard |
| 7 | 4 | 1-2 | 45 | Normal | `Undead` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U | 敵7-4-1-2-lord/striker |
| 7 | 4 | 1-2 | 45 | Normal | `Undead` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U | 敵7-4-1-2-sage/samurai |
| 7 | 4 | 3 | 46 | Normal | `Aerial` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U | 敵7-4-3-duelist/lord |
| 7 | 4 | 3 | 46 | Normal | `Aerial` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U | 敵7-4-3-lord/striker |
| 7 | 4 | 4 | 48 | Elite | `Undead` | class.ranger.samurai | `i.arrow`EB, `i.archery`EB, `i.katana`EB | 敵7-4-4-ranger/samurai |
| 7 | 5 | 1-2 | 46 | Normal | `Aerial` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U | 敵7-5-1-2-ninja/ranger |
| 7 | 5 | 1-2 | 46 | Normal | `Aerial` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U | 敵7-5-1-2-samurai/sword-saint |
| 7 | 5 | 1-2 | 46 | Normal | `Aerial` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U | 敵7-5-1-2-wizard/alchemist |
| 7 | 5 | 3 | 47 | Normal | `Undead` | class.sword-saint.guardian | `i.gauntlet`U, `i.sword`U, `i.armor`U | 敵7-5-3-sword-saint/guardian |
| 7 | 5 | 3 | 47 | Normal | `Undead` | class.wizard.ninja | `i.wand`U, `i.robe`U, `i.archery`U | 敵7-5-3-wizard/ninja |
| 7 | 5 | 4 | 49 | Elite | `Undead` | class.duelist.alchemist | `i.sword`EB, `i.armor`EB, `i.catalyst`EB | 敵7-5-4-duelist/alchemist |
| 7 | 6 | 1-2 | 47 | Normal | `Titan` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U | 敵7-6-1-2-duelist/striker |
| 7 | 6 | 1-2 | 47 | Normal | `Titan` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U | 敵7-6-1-2-pilgrim/sage |
| 7 | 6 | 1-2 | 47 | Normal | `Titan` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U | 敵7-6-1-2-sword-saint/striker |
| 7 | 6 | 3 | 48 | Normal | `Undead` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U | 敵7-6-3-ranger/duelist |
| 7 | 6 | 3 | 48 | Normal | `Undead` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U | 敵7-6-3-samurai/ranger |
| 7 | 6 | 4 | 52 | BOSS | `Leporian` | class.lord.ninja | `i.shield`BD, `i.katana`BD, `i.archery`BD | 敵7-6-4-lord/ninja |
| 8 | 1 | 1-2 | 49 | Normal | `Dragon` | class.ranger | `i.arrow`U, `i.archery`U | 敵8-1-1-2-ranger |
| 8 | 1 | 1-2 | 49 | Normal | `Dragon` | class.striker | `i.bolt`U, `i.arrow`U | 敵8-1-1-2-striker |
| 8 | 1 | 1-2 | 49 | Normal | `Dragon` | class.wizard | `i.wand`U, `i.robe`U | 敵8-1-1-2-wizard |
| 8 | 1 | 3 | 50 | Normal | `Dragon` | class.guardian | `i.armor`U, `i.gauntlet`U | 敵8-1-3-guardian |
| 8 | 1 | 3 | 50 | Normal | `Dragon` | class.lord | `i.shield`U, `i.katana`U | 敵8-1-3-lord |
| 8 | 1 | 4 | 52 | Elite | `Dragon` | class.guardian.pilgrim | `i.armor`EA, `i.gauntlet`EA, `i.robe`EA | 敵8-1-4-guardian/pilgrim |
| 8 | 2 | 1-2 | 50 | Normal | `Dragon` | class.ninja | `i.archery`U, `i.bolt`U | 敵8-2-1-2-ninja |
| 8 | 2 | 1-2 | 50 | Normal | `Dragon` | class.sage | `i.grimoire`U, `i.catalyst`U | 敵8-2-1-2-sage |
| 8 | 2 | 1-2 | 50 | Normal | `Dragon` | class.samurai | `i.katana`U, `i.shield`U | 敵8-2-1-2-samurai |
| 8 | 2 | 3 | 51 | Normal | `Ghost` | class.duelist | `i.sword`U, `i.armor`U | 敵8-2-3-duelist |
| 8 | 2 | 3 | 51 | Normal | `Ghost` | class.pilgrim | `i.robe`U, `i.grimoire`U | 敵8-2-3-pilgrim |
| 8 | 2 | 4 | 53 | Elite | `Dragon` | class.sage.alchemist | `i.grimoire`EA, `i.catalyst`EA, `i.catalyst`EA | 敵8-2-4-sage/alchemist |
| 8 | 3 | 1-2 | 51 | Normal | `Jinma` | class.alchemist | `i.catalyst`U, `i.wand`U | 敵8-3-1-2-alchemist |
| 8 | 3 | 1-2 | 51 | Normal | `Jinma` | class.guardian.pilgrim | `i.armor`U, `i.gauntlet`U, `i.robe`U | 敵8-3-1-2-guardian/pilgrim |
| 8 | 3 | 1-2 | 51 | Normal | `Jinma` | class.sword-saint | `i.gauntlet`U, `i.sword`U | 敵8-3-1-2-sword-saint |
| 8 | 3 | 3 | 52 | Normal | `Dragon` | class.samurai.duelist | `i.katana`U, `i.shield`U, `i.sword`U | 敵8-3-3-samurai/duelist |
| 8 | 3 | 3 | 52 | Normal | `Dragon` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U | 敵8-3-3-wizard/alchemist |
| 8 | 3 | 4 | 54 | Elite | `Jinma` | class.pilgrim.sword-saint | `i.robe`EC, `i.grimoire`EC, `i.gauntlet`EC | 敵8-3-4-pilgrim/sword-saint |
| 8 | 4 | 1-2 | 52 | Normal | `Ghost` | class.guardian.wizard | `i.armor`U, `i.gauntlet`U, `i.wand`U | 敵8-4-1-2-guardian/wizard |
| 8 | 4 | 1-2 | 52 | Normal | `Ghost` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U | 敵8-4-1-2-lord/striker |
| 8 | 4 | 1-2 | 52 | Normal | `Ghost` | class.sage.samurai | `i.grimoire`U, `i.catalyst`U, `i.katana`U | 敵8-4-1-2-sage/samurai |
| 8 | 4 | 3 | 53 | Normal | `Jinma` | class.duelist.lord | `i.sword`U, `i.armor`U, `i.shield`U | 敵8-4-3-duelist/lord |
| 8 | 4 | 3 | 53 | Normal | `Jinma` | class.lord.striker | `i.shield`U, `i.katana`U, `i.bolt`U | 敵8-4-3-lord/striker |
| 8 | 4 | 4 | 55 | Elite | `Ghost` | class.samurai.striker | `i.katana`EB, `i.shield`EB, `i.bolt`EB | 敵8-4-4-samurai/striker |
| 8 | 5 | 1-2 | 53 | Normal | `Jinma` | class.ninja.ranger | `i.archery`U, `i.bolt`U, `i.arrow`U | 敵8-5-1-2-ninja/ranger |
| 8 | 5 | 1-2 | 53 | Normal | `Jinma` | class.samurai.sword-saint | `i.katana`U, `i.shield`U, `i.gauntlet`U | 敵8-5-1-2-samurai/sword-saint |
| 8 | 5 | 1-2 | 53 | Normal | `Jinma` | class.wizard.alchemist | `i.wand`U, `i.robe`U, `i.catalyst`U | 敵8-5-1-2-wizard/alchemist |
| 8 | 5 | 3 | 56 | Elite | `Cervin` | class.sword-saint.ninja | `i.catalyst`BD, `i.sword`BD | 特別敵8-5-sword-saint/ninja |
| 8 | 5 | 3 | 56 | Elite | `Cervin` | class.wizard.guardian | `i.arrow`BD, `i.robe`BD | 特別敵8-5-wizard/guardian |
| 8 | 5 | 4 | 56 | Elite | `Ghost` | class.wizard.samurai | `i.wand`EB, `i.robe`EB, `i.katana`EB | 敵8-5-4-wizard/samurai |
| 8 | 6 | 1-2 | 54 | Normal | `Dragon` | class.duelist.striker | `i.sword`U, `i.armor`U, `i.bolt`U | 敵8-6-1-2-duelist/striker |
| 8 | 6 | 1-2 | 54 | Normal | `Dragon` | class.pilgrim.sage | `i.robe`U, `i.grimoire`U, `i.grimoire`U | 敵8-6-1-2-pilgrim/sage |
| 8 | 6 | 1-2 | 54 | Normal | `Dragon` | class.sword-saint.striker | `i.gauntlet`U, `i.sword`U, `i.bolt`U | 敵8-6-1-2-sword-saint/striker |
| 8 | 6 | 3 | 55 | Normal | `Ghost` | class.ranger.duelist | `i.arrow`U, `i.archery`U, `i.sword`U | 敵8-6-3-ranger/duelist |
| 8 | 6 | 3 | 55 | Normal | `Ghost` | class.samurai.ranger | `i.katana`U, `i.shield`U, `i.arrow`U | 敵8-6-3-samurai/ranger |
| 8 | 6 | 4 | 59 | BOSS | `Cervin` | class.ninja.wizard | `i.archery`BD, `i.bolt`BD, `i.wand`BD | 敵8-6-4-ninja/wizard |
